# Medicore Backend

API REST para **Medicore** — historial médico personal centralizado.

## Stack

- **Node.js + NestJS** (TypeScript)
- **PostgreSQL** con TypeORM
- **JWT** (access 15 min + refresh 7 días)
- **Multer** para archivos (preparado para S3)
- **Swagger** en `/api/docs`

---

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL

# 3. Crear la base de datos en PostgreSQL
createdb medicore

# 4. Iniciar en desarrollo
npm run start:dev

# 5. (Opcional) Cargar datos demo
npm run seed
```

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `DATABASE_URL` | URL de conexión PostgreSQL | `postgresql://user:pass@localhost:5432/medicore` |
| `JWT_SECRET` | Secreto para access tokens | `mi-secreto-jwt` |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens | `mi-secreto-refresh` |
| `UPLOAD_PATH` | Ruta de archivos subidos | `./uploads` |
| `MAX_FILE_SIZE` | Tamaño máximo en bytes | `20971520` (20 MB) |

---

## Documentación Swagger

Con el servidor corriendo, accede a:

```
http://localhost:3000/api/docs
```

---

## Endpoints principales

### Auth
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/auth/register` | Público | Registrar paciente |
| POST | `/auth/login` | Público | Iniciar sesión |
| POST | `/auth/refresh` | Público | Renovar access token |
| POST | `/auth/logout` | JWT | Cerrar sesión |

### Patients
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/patients/me` | JWT | Perfil completo + signos vitales |
| PATCH | `/patients/me` | JWT | Actualizar datos personales |

### Medical History
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/history` | JWT | Listar historial |
| POST | `/history` | JWT | Crear consulta |
| GET | `/history/:id` | JWT | Obtener consulta |
| PATCH | `/history/:id` | JWT | Actualizar consulta |
| DELETE | `/history/:id` | JWT | Eliminar consulta |

### Medications
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/medications` | Listar medicamentos |
| POST | `/medications` | Agregar medicamento |
| GET | `/medications/:id` | Obtener medicamento |
| PATCH | `/medications/:id` | Actualizar medicamento |
| DELETE | `/medications/:id` | Eliminar medicamento |

### Exams
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/exams` | Listar exámenes |
| POST | `/exams` | Subir examen (multipart/form-data, campo `archivo`) |
| GET | `/exams/:id` | Obtener examen |
| GET | `/exams/:id/file` | Descargar archivo |
| DELETE | `/exams/:id` | Eliminar examen |

### Allergies
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/allergies` | Listar alergias |
| POST | `/allergies` | Registrar alergia |
| DELETE | `/allergies/:id` | Eliminar alergia |

### Vaccines
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/vaccines` | Listar vacunas |
| POST | `/vaccines` | Registrar vacuna |
| DELETE | `/vaccines/:id` | Eliminar vacuna |

### Access Codes (QR médico)
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/access-codes/generate` | JWT | Generar código temporal (10 min) |
| POST | `/access-codes/verify` | Público | Verificar código → snapshot del paciente |
| DELETE | `/access-codes/revoke` | JWT | Revocar acceso |

---

## Respuesta estándar

Todas las respuestas siguen el formato:

```json
{
  "data": { ... },
  "message": "OK",
  "statusCode": 200
}
```

Los errores devuelven:

```json
{
  "data": null,
  "message": "Mensaje en español",
  "error": "Detalle técnico",
  "statusCode": 401
}
```

---

## Usuario demo (seed)

| Campo | Valor |
|---|---|
| Email | `jesus.mendez@demo.com` |
| Password | `Demo1234!` |
| Tipo de sangre | O+ |

Incluye: 3 consultas, 3 medicamentos (2 activos), 3 exámenes, 3 alergias, 3 vacunas.

---

## Deploy en producción

### Orden de deploy recomendado

```
1. Provisionar base de datos PostgreSQL (Railway Postgres o Supabase)
2. Configurar variables de entorno en Railway
3. Deploy del backend → obtener URL pública
4. Configurar VITE_API_URL y CORS_ORIGIN con esa URL
5. Deploy del frontend en Vercel
```

---

### Backend → Railway

#### 1. Crear proyecto en Railway

```bash
# Con Railway CLI
railway init
railway add --database postgres   # provisiona PostgreSQL automáticamente
railway up
```

O desde la UI: **New Project → Deploy from GitHub → seleccionar repo del backend**.

#### 2. Variables de entorno en Railway

En **Settings → Environment Variables** del servicio, agregar:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | (Railway la inyecta automáticamente al linkear Postgres) |
| `JWT_SECRET` | `openssl rand -hex 64` |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 64` |
| `CORS_ORIGIN` | `https://tu-app.vercel.app` |
| `UPLOAD_PATH` | `/data/uploads` |
| `MAX_FILE_SIZE` | `20971520` |
| `MAIL_HOST` | `smtp.gmail.com` |
| `MAIL_PORT` | `587` |
| `MAIL_USER` | tu email |
| `MAIL_PASS` | app password de Gmail |
| `MAIL_FROM` | `Medicore <no-reply@medicore.app>` |
| `APP_TIMEZONE` | `America/Santiago` |

#### 3. Volumen para archivos subidos

En Railway, crea un **Volume** montado en `/data` para persistir los archivos de exámenes:

```
Settings → Volumes → Add Volume → Mount Path: /data
```

#### 4. Correr migraciones en Railway

Opción A — Railway CLI:
```bash
railway run npm run migration:run
```

Opción B — desde la shell del servicio en la UI de Railway:
```bash
npm run migration:run
```

> **Importante**: En producción `synchronize: false`. Las migraciones son la única forma segura de alterar el esquema.

---

### Frontend → Vercel

#### 1. Importar repositorio en Vercel

Desde **vercel.com → New Project → Import Git Repository**.

Vercel detecta Vite automáticamente. Verificar:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

#### 2. Variable de entorno en Vercel

En **Settings → Environment Variables**:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://tu-backend.up.railway.app` |

> Las variables `VITE_*` se embeben en el build. Cambiarlas requiere re-deploy.

#### 3. Dominio personalizado (opcional)

En Vercel: **Settings → Domains → Add**.
Luego actualizar `CORS_ORIGIN` en Railway con el nuevo dominio.

---

### Healthcheck

Railway monitorea automáticamente `GET /health`:

```json
{
  "status": "ok",
  "timestamp": "2026-06-02T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "database": "connected"
}
```

---

## Migrar almacenamiento a S3

El servicio de exámenes guarda `archivo_path` en la entidad. Para migrar a S3:

1. Instalar `@aws-sdk/client-s3`
2. Reemplazar el `diskStorage` de Multer por `multer-s3`
3. Actualizar `ExamsService.getFile()` para devolver una URL firmada en lugar de un stream local
4. Los campos `archivo_path`, `archivo_nombre`, `archivo_mimetype` de la entidad no cambian

---

## Estructura del proyecto

```
src/
├── auth/              # Registro, login, JWT, refresh tokens
├── patients/          # Perfil y signos vitales
├── medical-history/   # Historial de consultas
├── medications/       # Medicamentos
├── exams/             # Exámenes con archivos adjuntos
├── allergies/         # Alergias
├── vaccines/          # Vacunas
├── access-codes/      # Códigos temporales para médicos
├── common/
│   ├── decorators/    # @Public, @CurrentUser
│   ├── filters/       # HttpExceptionFilter (errores en español)
│   ├── guards/        # JwtAuthGuard global
│   └── interceptors/  # ResponseInterceptor (wrapper estándar)
├── database/
│   └── seed.ts        # Datos demo
└── main.ts
```
