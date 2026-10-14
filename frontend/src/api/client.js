// Cliente de la API. Todas las rutas pasan por /api (nginx en Docker, proxy de Vite en desarrollo).
const BASE = import.meta.env.VITE_API_URL || '/api';

async function pedir(ruta, opciones = {}) {
  let res;
  try {
    res = await fetch(BASE + ruta, { headers: { 'Content-Type': 'application/json' }, ...opciones });
  } catch {
    const err = new Error('No hay conexión con el servidor');
    err.status = 0;
    throw err;
  }
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(datos.detalle || datos.error || 'Error inesperado');
    err.status = res.status;
    throw err;
  }
  // `origenCache` informa si el backend respondió desde Redis (HIT) o desde MongoDB (MISS)
  return { ...datos, origenCache: res.headers.get('X-Cache') };
}

export const api = {
  salud: () => pedir('/health'),
  metricas: () => pedir('/metricas'),
  listar: ({ busqueda = '', estado = '' } = {}) => {
    const p = new URLSearchParams();
    if (busqueda) p.set('busqueda', busqueda);
    if (estado) p.set('estado', estado);
    const q = p.toString();
    return pedir('/solicitudes' + (q ? `?${q}` : ''));
  },
  detalle: (id) => pedir(`/solicitudes/${encodeURIComponent(id)}`),
  crear: (datos) => pedir('/solicitudes', { method: 'POST', body: JSON.stringify(datos) }),
};
