# Objetivos específicos y dónde se cumplen

| # | Objetivo | Dónde se cumple | Cómo se comprueba |
|---|---|---|---|
| 1 | Comprender los principios básicos de una arquitectura distribuida | [`docs/ARQUITECTURA.md`](ARQUITECTURA.md): servicios, asincronía, cola, servicios sin estado, tolerancia a fallos, consistencia eventual | Diagrama y flujo documentados; vista **Monitor** |
| 2 | Diseñar una interfaz web con Vue.js usando componentes y vistas | `frontend/src/`: 5 vistas (`views/`), 10 componentes (`components/`), Vue Router, composables | `npm test` en `frontend/` (componentes e interfaz completa) |
| 3 | Construir una API REST con Node.js y Express.js | `backend/src/`: rutas → controlador → servicio → modelo; `/health` y `/metricas` | Pruebas de integración "API" |
| 4 | Almacenar y consultar solicitudes y respuestas en MongoDB | `models/Solicitud.js`, `solicitudes.service.js`; la respuesta, el área, la regla y el tiempo se guardan en el documento | Integración: "Persistencia" |
| 5 | Implementar caché y cola con Redis | Cola: `cola.service.js` + `worker.js`. Caché: `cache.service.js` (cache-aside, TTL, invalidación, cabecera `X-Cache`) | Integración: "Caché" y "Cola"; pruebas unitarias de la caché |
| 6 | Comprender el funcionamiento de un Worker independiente | `backend/src/worker.js`, servicio `worker` en `docker-compose.yml` | Integración: "Cola y Worker" |
| 7 | Diseñar un flujo de procesamiento asíncrono | PENDIENTE → EN_COLA → PROCESANDO → RESPONDIDA/ERROR; la API responde al instante y el Worker trabaja aparte | Integración: "Cola con el Worker detenido" |
| 8 | Generar respuestas automáticas a partir de categorías y reglas | `reglas.service.js`: categoría → área y pasos; prioridad → tiempo; palabras clave → observaciones | 8 pruebas unitarias + integración "Reglas" |
| 9 | Contenerizar frontend, backend, Worker, MongoDB y Redis | `backend/Dockerfile` (backend y worker), `frontend/Dockerfile` (multi-etapa), imágenes oficiales de `mongo` y `redis` | `docker compose up --build` |
| 10 | Usar Docker Compose para orquestar | `docker-compose.yml`: 5 servicios, healthchecks, `depends_on` con `service_healthy`, volúmenes, variables | `docker compose ps` |
| 11 | Ramas, commits, Issues, Projects, Pull Requests y Code Review | `.github/` (plantillas, CI), [`docs/GITHUB.md`](GITHUB.md), `scripts/crear-issues.sh` | Repositorio en GitHub |
| 12 | Pruebas de integración: persistencia, caché, cola, recuperación y respuesta | `pruebas/integracion.test.mjs` (14 pruebas), [`docs/PRUEBAS.md`](PRUEBAS.md) | `node --test pruebas/integracion.test.mjs` |
