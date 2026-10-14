const mongoose = require('mongoose');
const crypto = require('crypto');
const Solicitud = require('../models/Solicitud');
const { encolar } = require('./cola.service');
const cache = require('./cache.service');

/**
 * Crea una solicitud y la envía a la cola de Redis.
 * Flujo: PENDIENTE -> EN_COLA (aquí) -> PROCESANDO -> RESPONDIDA/ERROR (worker).
 */
async function crearSolicitud(datos) {
  const solicitud = await new Solicitud({
    titulo: datos.titulo,
    descripcion: datos.descripcion,
    categoria: datos.categoria,
    prioridad: datos.prioridad,
    estado: 'PENDIENTE',
  }).save();

  // Se marca EN_COLA ANTES de encolar para que el worker no pise el estado.
  await Solicitud.updateOne({ _id: solicitud._id }, { estado: 'EN_COLA' });
  try {
    await encolar(solicitud._id);
    solicitud.estado = 'EN_COLA';
  } catch (error) {
    // Redis no disponible: queda PENDIENTE y el worker la recoge cuando Redis vuelva.
    await Solicitud.updateOne({ _id: solicitud._id }, { estado: 'PENDIENTE' });
    console.error('[solicitudes.service] No se pudo encolar, queda PENDIENTE:', error.message);
  }

  await cache.invalidarListas();
  return solicitud;
}

/**
 * Lista solicitudes con filtro opcional de búsqueda y estado. Devuelve { solicitudes, origen }.
 */
async function listarSolicitudes({ busqueda, estado } = {}) {
  const filtro = {};
  if (estado) filtro.estado = estado;
  if (busqueda) {
    // Se escapan los caracteres especiales: una búsqueda como "(" no debe romper la consulta
    const texto = String(busqueda).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filtro.$or = [
      { titulo: { $regex: texto, $options: 'i' } },
      { descripcion: { $regex: texto, $options: 'i' } },
    ];
  }

  const version = await cache.versionListas();
  const huella = crypto.createHash('sha1').update(JSON.stringify({ estado: estado || '', busqueda: busqueda || '' })).digest('hex');
  const clave = `listas:v${version}:${huella}`;

  const { valor, origen } = await cache.obtenerOCalcular(
    clave,
    () => Solicitud.find(filtro).sort({ fechaCreacion: -1 }).lean(),
    cache.TTL_LISTAS // se invalidan por versión; el TTL corto acota cualquier lectura rezagada
  );
  return { solicitudes: valor, origen };
}

/**
 * Obtiene una solicitud por ID. Devuelve { solicitud, origen }; solicitud es null si no existe o el id es inválido.
 */
async function obtenerSolicitudPorId(id) {
  if (!mongoose.isValidObjectId(id)) return { solicitud: null, origen: 'BYPASS' };
  const { valor, origen } = await cache.obtenerOCalcular(
    `solicitud:${id}`,
    () => Solicitud.findById(id).lean(),
    (s) => cache.ttlPorEstado(s.estado)
  );
  return { solicitud: valor, origen };
}

module.exports = { crearSolicitud, listarSolicitudes, obtenerSolicitudPorId };
