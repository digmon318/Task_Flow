# Pruebas

Hay tres niveles. Todos corren en GitHub Actions (`.github/workflows/ci.yml`).

| Nivel | Dónde | Comando | Necesita Docker |
|---|---|---|---|
| Unitarias del backend | `backend/tests/` | `npm test` (en `backend/`) | No |
| Componentes e interfaz Vue | `frontend/src/__tests__/` | `npm test` (en `frontend/`) | No (las de la interfaz completa se activan con `VITE_API_URL`) |
| **Integración del sistema** | `pruebas/integracion.test.mjs` | `node --test pruebas/integracion.test.mjs` | Sí (para las de caídas) |

## Cómo ejecutar las de integración

```bash
docker compose up -d --build --wait
node --test pruebas/integracion.test.mjs

# Pruebas de la interfaz Vue contra el backend real
cd frontend && npm ci && VITE_API_URL=http://localhost:3000 npm test
```

Si no tienes Docker a mano (o usas MongoDB/Redis externos), `SIN_DOCKER=1 node --test pruebas/integracion.test.mjs` omite las pruebas que detienen contenedores.
Las pruebas crean solicitudes de prueba en la base de datos; para empezar limpio: `docker compose down -v`.

## Qué cubre cada prueba de integración

| Área | Prueba | Qué demuestra |
|---|---|---|
| Salud | Backend, MongoDB, Redis y Worker responden | Los servicios están conectados entre sí |
| API | Rechaza datos incompletos, inválidos y mal formados | Validación (400), incluye intento de inyección NoSQL y JSON roto |
| API | Ids inexistentes o inválidos | 404 correctos |
| **Persistencia** | Solicitud creada se consulta, aparece en el listado y en la búsqueda | MongoDB guarda y consulta |
| **Cola y Worker** | Avanza hasta RESPONDIDA y la respuesta queda guardada | Flujo asíncrono completo |
| **Respuesta** | Reglas por categoría, prioridad y palabras clave | Área, tiempo estimado y observaciones correctos |
| **Caché** | Segunda lectura es HIT; métricas lo reflejan | Redis como caché |
| **Caché** | Crear invalida el listado | No se muestran datos viejos |
| **Caché** | El estado no se atrasa más que el TTL | La caché no congela el progreso |
| **Cola** | Con el Worker detenido, las solicitudes esperan y luego se atienden | Desacople por cola |
| **Persistencia de la cola** | Reiniciar Redis no pierde solicitudes en espera | AOF + volumen |
| **Recuperación** | Redis caído → solicitud `PENDIENTE` → se atiende al volver | Tolerancia a fallos |
| **Recuperación** | El Worker muere con SIGKILL a mitad de tarea y la retoma | Cola confiable |
| **Persistencia** | Reiniciar el contenedor de MongoDB conserva los datos | Volumen `mongo-data` |

## Pruebas manuales sugeridas (para la demostración)

1. Abre http://localhost:8080/monitor: los 4 servicios en línea.
2. Crea una solicitud *Soporte / Alta* con la palabra "urgente": observa EN_COLA → PROCESANDO → RESPONDIDA y la regla aplicada (`SOPORTE+URGENCIA`).
3. `docker compose stop worker`, crea 3 solicitudes: en el Monitor, "En la cola" sube a 3. `docker compose start worker`: se vacía.
4. `docker compose stop redis`, crea una solicitud: queda *Pendiente*. `docker compose start redis`: se atiende sola.
5. Abre la misma solicitud varias veces: la etiqueta *caché HIT* aparece y el Monitor muestra la tasa de aciertos.
