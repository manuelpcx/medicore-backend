# Cifrado en reposo de datos sensibles — Diseño

**Fecha:** 2026-07-07
**Estado:** Aprobado para implementación

## Objetivo

Por obligación legal (datos sensibles de salud), toda la información personal/médica
que el usuario guarda debe quedar **cifrada en reposo** en la base de datos. El backend
cifra al escribir y descifra al leer para servir los datos al front.

Modelo de confianza elegido: **la llave vive en el backend** (cifrado en reposo a nivel
de aplicación). Cumple "datos cifrados en la BD"; **no** es zero-knowledge: el operador,
con acceso a la llave, técnicamente podría descifrar.

## Enfoque

**TypeORM column transformers + AES-256-GCM.** Cada columna sensible declara un
`ValueTransformer` (`to` = cifrar al escribir, `from` = descifrar al leer). El cifrado es
transparente para servicios, scheduler de notificaciones, `/admin` y el snapshot por QR:
todos siguen trabajando con texto plano. La lógica queda centralizada en una única utilidad.

Enfoques descartados: cifrado manual por servicio (invasivo, propenso a fugas) y
pgcrypto/TDE (mete la llave en SQL / no disponible en el Postgres administrado de Railway).

## Componentes

### 1. Utilidad de cifrado — `src/common/crypto/encryption.ts`

Módulo plano (no un provider de Nest), porque los transformers se evalúan al cargar las
entidades, fuera del contenedor de DI.

- **Algoritmo:** AES-256-GCM. IV aleatorio de 12 bytes por valor, authTag de 16 bytes.
- **Llave:** 32 bytes desde `process.env.ENCRYPTION_KEY` (base64 o hex). Lectura lazy con
  caché; valida longitud y falla (throw) si es inválida.
- **Formato de salida:** `enc:v1:` + base64(`iv | authTag | ciphertext`).
- `encrypt(plain: string): string`
- `decrypt(value: string): string` — si NO empieza con `enc:v1:`, devuelve el valor tal
  cual (dato legado en claro). Habilita convivencia de filas cifradas y en claro.
- `encryptedColumn(): ValueTransformer` — factory del transformer:
  - `to(value)`: `null`/`undefined` pasan; `Date` → ISO string; resto → `String(value)`;
    luego `encrypt`.
  - `from(value)`: `null`/`undefined` pasan; resto → `decrypt`.
- `assertEncryptionKey()`: validación explícita invocada en `bootstrap` (fail-fast).

### 2. Campos cifrados por entidad

Se aplica `@Column({ type: 'text', ..., transformer: encryptedColumn() })`. Se conserva la
nulabilidad original de cada columna.

| Entidad | Campos cifrados | En claro (motivo) |
|---|---|---|
| User | `nombre`, `fecha_nacimiento`, `tipo_sangre` | `email` (login), `password` (hash), `role`, `activo`, consent/notif flags, fechas de sistema, `last_login_at` |
| Patient | `peso`, `altura`, `presion_arterial`, `frecuencia_cardiaca`, `temperatura`, `telefono`, `direccion`, `contacto_emergencia`, `telefono_emergencia` | `id`, `user_id`, `updated_at` |
| MedicalHistory | `especialidad`, `doctor`, `institucion`, `diagnostico`, `notas` | `fecha`, `proxima_cita`, `tipo_proxima_cita`, `recordatorio_activo`, `tipo` (scheduler/filtros) |
| Medication | `nombre`, `dosis`, `frecuencia`, `horario`, `medico_recetante` | `estado`, `fecha_inicio`, `fecha_fin`, `horario_notificacion`, `notificacion_activa` (scheduler) |
| Exam | `nombre`, `laboratorio`, `tipo`, `archivo_nombre` | `fecha`, `resultado_badge`, `archivo_path`, `archivo_mimetype` |
| Allergy | `nombre` | `severidad`, `tipo` (enums) |
| Vaccine | `nombre`, `lote`, `institucion` | `fecha`, `proxima_dosis` |
| AccessCode | — (ya es hash) | todo |

**Efecto de tipos:** columnas numéricas/date cifradas se sirven como **string**. Los
`decimal` (peso, altura, temperatura) ya se devolvían como string; el cambio real es
`frecuencia_cardiaca` (int→string) y `fecha_nacimiento` (date→string ISO). El front los
muestra igual.

### 3. Migración — `1700000000003-EncryptSensitiveColumns`

`ALTER TABLE ... ALTER COLUMN ... TYPE text USING "col"::text` para las columnas cifradas
que hoy son `varchar`/`numeric`/`int`/`date`. Las que ya son `text` (`diagnostico`, `notas`,
`direccion`) no cambian. En dev, `synchronize:true` lo aplica solo; en prod corre con
`migration:run:prod` (ya en el `startCommand`).

`down()`: revierte los tipos (best-effort). Documentado: si los datos ya están cifrados, el
revert de columnas numéricas fallará — es esperado, el cifrado es una operación de una vía.

### 4. Backfill — `src/scripts/encrypt-backfill.ts` (`npm run encrypt-backfill`)

Para cada tabla: `repo.find()` → `repo.save()`. El transformer cifra al guardar.
Idempotente: un valor ya cifrado se descifra al leer (por el marcador) y se re-cifra sin
cambiar el texto plano. Se ejecuta **una vez** tras desplegar, sobre los datos reales
existentes. Requiere la migración aplicada antes.

### 5. Configuración

- `ENCRYPTION_KEY` en Railway y en `.env`; documentado en `.env.example`.
- Generación: `openssl rand -base64 32`.
- **Advertencia crítica:** perder o cambiar `ENCRYPTION_KEY` vuelve **irrecuperables** los
  datos cifrados. Sin rotación de llave en v1 (el prefijo `v1:` la deja preparada).
- `bootstrap` llama `assertEncryptionKey()` → la app no arranca sin llave válida.

### 6. Ajustes en features existentes

- `admin.service.listUsers` usa `getRawMany` (los raw **saltan** el transformer):
  se descifra `nombre` a mano en el mapeo y se **elimina la búsqueda por nombre**
  (queda solo por email). Impacto asumido y aceptado.
- `/admin/stats`, scheduler de notificaciones y snapshot por QR: sin cambios; usan
  campos en claro o cargan entidades que se descifran solas. Verificado: ninguna query
  filtra por columnas cifradas.

## Fuera de alcance (Fase 2)

- **Contenido de archivos de exámenes en disco (`uploads/`)** no se cifra en esta fase;
  solo su nombre original en la BD (`archivo_nombre`). Cifrar los bytes en disco es un
  cambio mayor al flujo de subida/descarga y se aborda por separado.
- Rotación de llave.

## Verificación

El proyecto no tiene framework de tests. Verificación:
1. `npm run build` (type-check).
2. Round-trip real `encrypt`/`decrypt` ejecutado con node (incluye caso legado sin marcador).
3. Prueba manual de guardar y leer un registro (requiere BD; se indica al usuario).
