const { obtenerRedis, redisListo } = require('../config/redis');

// Listas de Redis. Una solicitud entra por COLA y el worker la mueve a EN_PROCESO mientras la atiende.
// Si el worker se cae a mitad de camino, el id sigue en EN_PROCESO y se recupera al reiniciar.
const COLA = 'taskflow:cola';
const EN_PROCESO = 'taskflow:en_proceso';
const LATIDO_WORKER = 'taskflow:worker:latido';

async function encolar(id) {
  // Sin esta guarda, ioredis dejaría el comando esperando indefinidamente si Redis está caído.
  if (!redisListo()) throw new Error('Redis no disponible');
  await obtenerRedis().lpush(COLA, String(id));
}

async function longitudes() {
  if (!redisListo()) return { cola: null, enProceso: null };
  const r = obtenerRedis();
  const [cola, enProceso] = await Promise.all([r.llen(COLA), r.llen(EN_PROCESO)]);
  return { cola, enProceso };
}

// El worker marca "sigo vivo" cada pocos segundos; la clave expira sola si el worker se detiene.
async function registrarLatido() {
  if (!redisListo()) return;
  await obtenerRedis().set(LATIDO_WORKER, String(Date.now()), 'EX', 30);
}

async function workerActivo() {
  if (!redisListo()) return false;
  return (await obtenerRedis().exists(LATIDO_WORKER)) === 1;
}

module.exports = { COLA, EN_PROCESO, LATIDO_WORKER, encolar, longitudes, registrarLatido, workerActivo };
