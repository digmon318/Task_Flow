#!/usr/bin/env bash
# Crea las etiquetas, el hito y las Issues del proyecto con la CLI de GitHub (https://cli.github.com).
#   gh auth login
#   ./scripts/crear-issues.sh
# Después, agrega las Issues a tu GitHub Project (tablero) desde la pestaña "Projects".
set -euo pipefail

gh label create historia --color 3b5bdb --description "Historia de usuario" 2>/dev/null || true
gh label create bug --color c93c4b --description "Error" 2>/dev/null || true
for area in frontend backend worker redis mongo docker docs pruebas github; do
  gh label create "$area" --color 8a93ad 2>/dev/null || true
done
gh api repos/:owner/:repo/milestones -f title="Entrega final" >/dev/null 2>&1 || true

crear() { # título | etiquetas | cuerpo
  gh issue create --title "$1" --label "historia,$2" --milestone "Entrega final" --body "$3"
}

crear "HU-01: Registrar solicitudes (POST /solicitudes)" backend,mongo \
  "Como usuario quiero enviar una solicitud con título, descripción, categoría y prioridad para que quede registrada.
- [ ] Valida campos obligatorios y rechaza datos inválidos (400)
- [ ] Guarda en MongoDB con estado inicial
- [ ] Responde 201 con la solicitud creada"
crear "HU-02: Listar, buscar y filtrar solicitudes" backend,mongo \
  "- [ ] GET /solicitudes con búsqueda por texto y filtro por estado
- [ ] Los caracteres especiales no rompen la búsqueda"
crear "HU-03: Consultar detalle y respuesta de una solicitud" backend \
  "- [ ] GET /solicitudes/:id y /solicitudes/:id/respuesta
- [ ] 404 si no existe o el id es inválido"
crear "HU-04: Encolar solicitudes en Redis" backend,redis \
  "- [ ] Al crear, la solicitud pasa a EN_COLA y su id entra a la cola
- [ ] Si Redis falla, queda PENDIENTE y se atiende después"
crear "HU-05: Worker independiente que procesa la cola" worker,redis \
  "- [ ] Servicio aparte en Docker Compose
- [ ] Estados PROCESANDO -> RESPONDIDA/ERROR
- [ ] Cierre ordenado (SIGTERM)"
crear "HU-06: Respuestas automáticas por categoría y reglas" worker \
  "- [ ] Una regla por categoría (área responsable y pasos)
- [ ] Tiempo estimado por prioridad
- [ ] Observaciones por palabras clave (urgencia, acceso, pago, plazo)
- [ ] Pruebas unitarias del motor de reglas"
crear "HU-07: Caché de lecturas en Redis" backend,redis \
  "- [ ] Detalle y listados se sirven desde Redis (X-Cache: HIT/MISS)
- [ ] La caché se invalida cuando la solicitud cambia
- [ ] Si Redis cae, la API sigue funcionando (BYPASS)"
crear "HU-08: Recuperación ante caídas" worker,redis,mongo \
  "- [ ] Tareas a medias vuelven a la cola al reiniciar el Worker
- [ ] Solicitudes PENDIENTE se reencolan cuando Redis vuelve
- [ ] La cola y los datos sobreviven al reinicio de Redis y Mongo (volúmenes)"
crear "HU-09: Interfaz web con Vue (componentes y vistas)" frontend \
  "- [ ] Vistas: inicio, solicitudes, nueva solicitud, detalle y monitor
- [ ] Componentes reutilizables y Vue Router
- [ ] Actualización automática mientras haya solicitudes en curso"
crear "HU-10: Monitor del sistema" frontend,backend \
  "- [ ] GET /metricas (servicios, cola, solicitudes por estado, caché)
- [ ] Vista Monitor con estado de cada servicio"
crear "HU-11: Contenerizar y orquestar con Docker Compose" docker \
  "- [ ] Dockerfile de frontend, backend/worker
- [ ] Compose con mongo, redis, backend, worker y frontend
- [ ] Healthchecks, volúmenes y dependencias"
crear "HU-12: Pruebas de integración" pruebas \
  "- [ ] Persistencia, caché, cola, recuperación y respuesta
- [ ] Ejecutadas automáticamente en GitHub Actions"
crear "HU-13: Flujo de trabajo en GitHub" github,docs \
  "- [ ] Ramas, convención de commits, plantillas de Issue y PR
- [ ] Protección de la rama main y Code Review obligatorio"
echo "Listo: revisa las Issues en tu repositorio."
