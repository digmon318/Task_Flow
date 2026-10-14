import { onMounted, onBeforeUnmount } from 'vue';

// Ejecuta `tarea` ahora y luego cada `ms`. Se detiene si la tarea devuelve `false` o al salir de la vista.
export function usePolling(tarea, ms) {
  let temporizador = null;
  let activo = true;

  async function ciclo() {
    clearTimeout(temporizador);
    if (!activo) return;
    let seguir = true;
    try { seguir = (await tarea()) !== false; } catch { /* el error ya lo muestra la vista */ }
    if (activo && seguir) temporizador = setTimeout(ciclo, ms);
  }

  onMounted(ciclo);
  onBeforeUnmount(() => { activo = false; clearTimeout(temporizador); });
  return { refrescar: ciclo };
}
