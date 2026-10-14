export const ETIQUETA = { PENDIENTE: 'Pendiente', EN_COLA: 'En cola', PROCESANDO: 'Procesando', RESPONDIDA: 'Respondida', ERROR: 'Error' };
export const ETAPAS = ['PENDIENTE', 'EN_COLA', 'PROCESANDO', 'RESPONDIDA'];
export const FINALES = ['RESPONDIDA', 'ERROR'];
export const CATEGORIAS = ['Información', 'Soporte', 'Documento', 'Consulta', 'Actualización'];
export const PRIORIDADES = ['Baja', 'Media', 'Alta'];

export const fecha = (f) => (f ? new Date(f).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const enCurso = (s) => !FINALES.includes(s.estado);
