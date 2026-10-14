# Flujo de trabajo en GitHub

## Ramas
```
main      ← versión estable y entregable (protegida)
 └─ develop   ← integración del trabajo en curso (protegida)
     ├─ feature/HU-05-worker-cola
     ├─ fix/cache-no-invalida
     └─ docs/arquitectura
```
- Toda rama de trabajo sale de `develop` y vuelve a `develop` mediante **Pull Request**.
- `develop` pasa a `main` con un PR al cerrar cada entrega.
- Nombre: `feature/HU-XX-descripcion-corta`, `fix/...`, `docs/...`, `test/...`.

## Commits
Formato: `tipo: qué cambia, en presente` (opcional `(alcance)`).

| Tipo | Uso | Ejemplo |
|---|---|---|
| `feat` | funcionalidad nueva | `feat(worker): reencola solicitudes pendientes al reconectar Redis` |
| `fix` | corrección | `fix(cache): invalida el listado al crear una solicitud` |
| `test` | pruebas | `test: cubre la caída de Redis` |
| `docs` | documentación | `docs: agrega diagrama de arquitectura` |
| `refactor` | cambio interno sin cambiar el comportamiento | `refactor: separa reglas.service del worker` |
| `chore` | tareas de mantenimiento | `chore: actualiza dependencias del frontend` |

Commits pequeños y con un solo propósito. Referencia la Issue en el cuerpo o en el PR (`Cierra #12`).

## Issues y Projects
1. Crea las 13 historias de usuario con `./scripts/crear-issues.sh` (requiere la CLI `gh`) o a mano con la plantilla *Historia de usuario*.
2. En **Projects → New project → Board**, columnas: `Backlog` · `Por hacer` · `En curso` · `En revisión` · `Hecho`.
3. Agrega las Issues al tablero. Al abrir el PR pasa la tarjeta a *En revisión*; al fusionar, GitHub la cierra y pasa a *Hecho* si activas la automatización "Item closed".
4. Etiquetas: `historia`, `bug`, y una por área (`frontend`, `backend`, `worker`, `redis`, `mongo`, `docker`, `docs`, `pruebas`, `github`).

## Pull Requests y Code Review
- Usa la plantilla (`.github/PULL_REQUEST_TEMPLATE.md`): describe el cambio, cómo se probó y enlaza la Issue.
- Mínimo **1 aprobación** de otra persona antes de fusionar. Quien revisa usa la lista del PR (criterios de aceptación, manejo de errores, pruebas, caché).
- Comentarios claros y accionables: señala el problema y, si puedes, propón la alternativa. Resuelve cada conversación antes de fusionar.
- Fusiona con **Squash and merge** para mantener un historial limpio, y borra la rama.

## Protección de ramas (Settings → Branches → Add rule, para `main` y `develop`)
- [x] Require a pull request before merging (1 aprobación)
- [x] Require status checks to pass: `Backend`, `Frontend`, `Integración`
- [x] Require conversation resolution before merging
- [x] Do not allow bypassing the above settings

## Ciclo completo de una historia
1. Mover la tarjeta a *En curso* y crear la rama desde `develop`.
2. Programar con commits pequeños y escribir las pruebas.
3. Ejecutar `npm run test:backend`, `npm run test:frontend` y, con `npm run up`, `npm run test:integracion`.
4. Abrir el PR (`Cierra #N`) y esperar a que pase el CI.
5. Code Review → ajustes → aprobación → *Squash and merge*.
