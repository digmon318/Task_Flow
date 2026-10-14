const Solicitud = require('../models/Solicitud');
const { longitudes, workerActivo } = require('./cola.service');
const cache = require('./cache.service');
const { dbListo } = require('../config/db');
const { redisListo } = require('../config/redis');

// Foto del sistema para el panel de monitoreo y para las pruebas de integración.
async function obtenerMetricas() {
  const porEstado = Object.fromEntries(Solicitud.ESTADOS.map((e) => [e, 0]));
  if (dbListo()) {
    const filas = await Solicitud.aggregate([{ $group: { _id: '$estado', total: { $sum: 1 } } }]);
    for (const f of filas) porEstado[f._id] = f.total;
  }
  return {
    servicios: {
      mongo: dbListo() ? 'ok' : 'no disponible',
      redis: redisListo() ? 'ok' : 'no disponible',
      worker: (await workerActivo()) ? 'ok' : 'no disponible',
    },
    cola: await longitudes(),
    solicitudesPorEstado: porEstado,
    cache: await cache.estadisticas(),
  };
}

module.exports = { obtenerMetricas };
