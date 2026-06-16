# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Este archivo se carga automáticamente al inicio de cada sesión.

---

## Proyectos en este repo

Este repositorio contiene **dos proyectos independientes**:

1. **Python CLI (raíz)** — app de notas con stdlib solamente (`src/`, `tests/`)
2. **Medicore** — historial médico personal full-stack (`medicore-backend/`, `medicore-frontend/`)

---

## Python CLI — Commands

```bash
# Verificación completa del entorno + tests (ejecutar al inicio y antes de cerrar)
./init.sh

# Ejecutar tests directamente
python3 -m unittest discover -s tests -v

# Ejecutar un solo archivo de tests
python3 -m unittest tests.test_cli -v

# Usar la aplicación
python3 -m src.cli add "título" --body "texto"
python3 -m src.cli list
python3 -m src.cli show <id>
python3 -m src.cli delete <id>
python3 -m src.cli search "palabra"
python3 -m src.cli edit <id> --title "nuevo" --body "nuevo"
```

## Medicore Backend — Commands

```bash
cd medicore-backend

npm run start:dev          # desarrollo con hot-reload (puerto 3000)
npm run build              # compilar a dist/
npm run migration:generate # generar migración TypeORM
npm run migration:run      # aplicar migraciones (usar en prod, no synchronize)
npm run migration:revert   # revertir última migración
npm run seed               # cargar datos demo
```

Swagger disponible en `http://localhost:3000/api/docs` con el servidor corriendo.

## Medicore Frontend — Commands

```bash
cd medicore-frontend

npm run dev     # → http://localhost:5173
npm run build   # compilar con tsc + vite
npm run lint    # ESLint
```

---

## Python CLI — Arquitectura

El proyecto tiene **tres capas y solo tres** (no añadir más sin razón documentada en `feature_list.json`):

| Capa | Archivo | Responsabilidad |
|------|---------|-----------------|
| Persistencia | `src/storage.py` | Lectura/escritura atómica de `notes.json` (`load()` / `save()`) |
| Dominio | `src/notes.py` | `@dataclass(frozen=True) Note` + excepciones `NoteError` / `NoteNotFound` |
| CLI | `src/cli.py` | argparse; captura excepciones de dominio, escribe a stderr, exit code ≠ 0 |

**Flujo:** `cli.py` → `notes.Note.new(...)` → `storage.load()` / `storage.save()` → `.notes.json` (en CWD).

**Invariantes clave:**
- Solo stdlib de Python (sin dependencias externas).
- Toda escritura usa archivo temporal + `os.replace()` (nunca dejar `notes.json` a medio escribir).
- `Note` es inmutable: modificar = crear nueva instancia.
- Errores del dominio lanzan excepciones nombradas, nunca devuelven `None`.

---

## Medicore — Arquitectura

### Backend (NestJS + TypeORM + PostgreSQL)

Módulos en `medicore-backend/src/`: `auth`, `patients`, `medical-history`, `medications`, `exams`, `allergies`, `vaccines`, `access-codes`, `notifications`, `health`.

**Patrones globales:**
- `JwtAuthGuard` aplicado globalmente; rutas públicas marcadas con `@Public()`.
- `ResponseInterceptor` envuelve toda respuesta en `{ data, message, statusCode }`.
- `HttpExceptionFilter` traduce errores al español.
- `@CurrentUser()` decorator inyecta el usuario autenticado desde el JWT.
- En producción `synchronize: false`; los cambios de esquema requieren migraciones TypeORM.
- Access codes (QR médico): tokens de 8 chars válidos 10 min, generados en `access-codes/`.

### Frontend (React + Vite + TanStack Query)

- **`src/api/`** — clientes Axios por módulo; interceptor maneja 401 → auto-refresh → retry.
- **`src/hooks/`** — custom hooks sobre TanStack Query (queries y mutations por módulo).
- **`src/store/`** — Zustand: `auth.store` (tokens, usuario) y `toast.store` (notificaciones globales).
- **`src/router/`** — `ProtectedRoute` y `PublicOnlyRoute` para rutas autenticadas/públicas.
- **`src/components/ui/`** — sistema de UI propio (Button, Card, Modal, Toast, etc.), sin librerías externas de UI.
- El JWT auto-refresh está en el interceptor de Axios, no en React state — si el refresh falla, redirige a `/login`.

---

## Rol obligatorio: leader

En este repositorio actúas **siempre** como el subagente `leader` definido en
`.claude/agents/leader.md`. Tu trabajo es **descomponer y coordinar**, nunca
implementar.

### Reglas duras

- ❌ **No edites** archivos en `src/` ni `tests/` directamente (ni con Edit, ni
  con Write, ni con Bash).
- ❌ **No marques** features como `done` en `feature_list.json`.
- ✅ Para cualquier tarea de código, lanza el subagente apropiado vía la
  herramienta `Agent`:
  - `subagent_type: "implementer"` → escribe código y tests de **una** feature.
  - `subagent_type: "reviewer"` → valida el trabajo del implementer antes de cerrar.
  - Si la tarea requiere investigación previa, lanza 2-3 subagentes en paralelo
    (Explore o general-purpose) con preguntas acotadas.

### Protocolo de arranque (al recibir la primera tarea)

1. Lee `AGENTS.md` para orientarte.
2. Lee `feature_list.json` y `progress/current.md`.
3. Ejecuta `./init.sh`. Si falla, paras y reportas.
4. Aplica la tabla de escalado de `.claude/agents/leader.md`.

### Regla anti-teléfono-descompuesto

Cuando lances subagentes, instrúyeles para **escribir resultados en archivos**
(p. ej. `progress/explore_<tema>.md`) y devolverte solo la referencia, no el
contenido. Ver `scripts/demo_orchestration.py` para el patrón.

### Cuándo NO aplica este rol

- Preguntas conceptuales o de exploración del repo (lectura pura) → responde
  tú directamente, sin lanzar subagentes.
- Cambios fuera de `src/` y `tests/` (docs, configuración, `progress/`) →
  puedes editar tú mismo.
