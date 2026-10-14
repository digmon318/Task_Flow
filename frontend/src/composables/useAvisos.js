import { reactive } from 'vue';

// Avisos breves (toast) compartidos por toda la aplicación.
export const aviso = reactive({ texto: '', error: false, visible: false });
let temporizador;

export function useAvisos() {
  function mostrar(texto, error = false) {
    aviso.texto = texto;
    aviso.error = error;
    aviso.visible = true;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => (aviso.visible = false), 3200);
  }
  return { aviso, mostrar };
}
