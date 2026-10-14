# TaskFlow

Sistema distribuido para registrar solicitudes y responderlas automáticamente. Una interfaz Vue envía la solicitud a una API Express; la API la guarda en MongoDB y la deja en una cola de Redis; un Worker independiente la toma, aplica reglas por categoría y prioridad, y guarda la respuesta.

```
Navegador ─► frontend (Vue + nginx) ─► backend (Express) ─► MongoDB
                                            │ ▲                ▲
                                            ▼ │ caché          │ respuesta
                                          Redis ◄──── worker ──┘
                                       (cola + caché)
```

## Inicio rápido

Solo necesitas [Docker](https://docs.docker.com/get-docker/) con Compose v2.

```bash
docker compose up --build
```

No hace falta configurar nada: MongoDB y Redis corren en contenedores con volúmenes.

| Qué | Dónde |
|---|---|
| Aplicación | http://localhost:8080 |
| Monitor del sistema | http://localhost:8080/monitor |
| API | http://localhost:3000 (`/health`, `/metricas`, `/solicitudes`) |

Para detener: `docker compose down` (los datos se conservan). Para borrar también los datos: `docker compose down -v`.

## Qué puedes hacer

- **Inicio:** resumen de solicitudes y las más recientes.
- **Solicitudes:** lista con búsqueda y filtro por estado (los filtros viven en la URL).
- **Nueva solicitud:** formulario validado; al enviarla vas directo al detalle.
- **Detalle:** progreso en vivo, respuesta automática, área responsable, tiempo estimado y regla aplicada.
- **Monitor:** estado de cada servicio, tamaño de la cola, solicitudes por estado y aciertos de caché.

## Cómo se genera la respuesta

El Worker aplica reglas (`backend/src/services/reglas.service.js`):

| Entrada | Decide |
|---|---|
| Categoría (Información, Soporte, Documento, Consulta, Actualización) | Área responsable y pasos a seguir |
| Prioridad (Alta 4 h, Media 24 h, Baja 72 h) | Tiempo estimado de atención |
| Palabras clave en el texto (urgente, acceso, factura, fecha límite…) | Observaciones y, si hay urgencia, reduce el tiempo a la mitad |

Para cambiar una regla edita las tablas al inicio de ese archivo.

## API

| Método y ruta | Descripción |
|---|---|
| `POST /solicitudes` | Crea una solicitud (`titulo`, `descripcion`, `categoria`, `prioridad`) → `201` |
| `GET /solicitudes?busqueda=&estado=` | Lista con filtros |
| `GET /solicitudes/:id` | Detalle |
| `GET /solicitudes/:id/respuesta` | Solo la respuesta (o el estado si aún no existe) |
| `GET /health` | Estado de Mongo, Redis y Worker |
| `GET /metricas` | Cola, solicitudes por estado y caché |

Las lecturas incluyen la cabecera `X-Cache: HIT | MISS | BYPASS`.

## Pruebas

```bash
npm --prefix backend ci && npm run test:backend          # 15 unitarias
npm --prefix frontend ci && npm run test:frontend        # componentes (+ interfaz completa si hay backend)
docker compose up -d --build --wait && npm run test:integracion   # 14 de integración
```

Detalle en [`docs/PRUEBAS.md`](docs/PRUEBAS.md).

## Usar MongoDB Atlas o Redis en la nube (opcional)

Copia `.env.example` como `.env` y define `MONGO_URI` y/o `REDIS_URL`. Los servicios locales siguen levantándose, pero el backend y el Worker usarán los externos.

- **Atlas:** `mongodb+srv://usuario:clave@cluster0.xxxxx.mongodb.net/taskflow?retryWrites=true&w=majority` (si la clave tiene `@ : / ?`, codifícalos: `%40 %3A %2F %3F`; permite tu IP en *Network Access*).
- **Redis:** `rediss://default:CLAVE@host:6379`. Usa `rediss://` (doble s) si el proveedor exige TLS. Debe ser Redis ≥ 6.2.

Tras cambiar `.env`: `docker compose up -d --force-recreate`.

## Desarrollo sin Docker

```bash
# Necesitas MongoDB y Redis corriendo en localhost
cd backend  && npm ci && npm run dev        # API en :3000
cd backend  && npm run worker               # en otra terminal
cd frontend && npm ci && npm run dev        # http://localhost:5173 (proxy /api → :3000)
```

## Estructura

```
backend/            API REST + Worker (misma imagen)
  src/services/     cola, caché, reglas, solicitudes, métricas
  tests/            pruebas unitarias
frontend/           Vue 3 + Vue Router + Vite
  src/views/        Inicio, Solicitudes, Nueva, Detalle, Monitor
  src/components/   Badge, formulario, filtros, progreso, etc.
pruebas/            pruebas de integración del sistema
docs/               arquitectura, pruebas, objetivos, flujo de GitHub
.github/            plantillas de Issues/PR y CI (GitHub Actions)
docker-compose.yml  los 5 servicios
```

## Documentación

- [Arquitectura](docs/ARQUITECTURA.md) · [Pruebas](docs/PRUEBAS.md) · [Objetivos específicos](docs/OBJETIVOS.md) · [Flujo de GitHub](docs/GITHUB.md)

## Solución de problemas

| Síntoma | Qué revisar |
|---|---|
| `/health` muestra `redis: no disponible` | `docker compose logs redis backend`; con Redis externo, que la URL use `rediss://` |
| `/health` muestra `worker: no disponible` | `docker compose logs worker`; el latido tarda hasta 10 s en aparecer tras arrancar |
| Puerto ocupado | Cambia `FRONTEND_PORT`, `BACKEND_PORT`, `MONGO_PORT` o `REDIS_PORT` en `.env` |
| La interfaz no carga datos | `docker compose ps`: el backend debe estar `healthy` |
