const { obtenerRedis, redisListo } = require('../config/redis');

// Caché de lecturas en Redis (patrón cache-aside):
//   1. Se busca la clave en Redis. Si está -> HIT.
//   2. Si no está -> MISS: se consulta MongoDB, se guarda en Redis con TTL y se responde.
//   3. Cada vez que una solicitud cambia (backend o worker) se invalida su clave y la versión de los listados.
// Si Redis falla, la caché se ignora (BYPASS) y la aplicación sigue funcionando con MongoDB.
const PREFIJO = 'taskflow:cache:';
const ESTADISTICAS = 'taskflow:cache:estadisticas';
const CLAVE_VERSION_LISTAS = `${PREFIJO}version:listas`;

const TTL_FINAL = Number(process.env.CACHE_TTL_SECONDS || 60);          // RESPONDIDA / ERROR: ya no cambian
const TTL_EN_CURSO = Number(process.env.CACHE_TTL_ENCURSO_SECONDS || 5); // aún pueden cambiar: TTL corto

const TTL_LISTAS = TTL_EN_CURSO;
const ttlPorEstado = (estado) => (['RESPONDIDA', 'ERROR'].includes(estado) ? TTL_FINAL : TTL_EN_CURSO);

async function seguro(fn, porDefecto = null) {
  try {
    if (!redisListo()) return porDefecto;
    return await fn(obtenerRedis());
  } catch (error) {
    console.warn('[cache] Operación omitida:', error.message);
    return porDefecto;
  }
}

const contar = (campo) => seguro((r) => r.hincrby(ESTADISTICAS, campo, 1));

async function leer(clave) {
  const crudo = await seguro((r) => r.get(PREFIJO + clave));
  return crudo ? JSON.parse(crudo) : null;
}

const guardar = (clave, valor, ttl) =>
  seguro((r) => r.set(PREFIJO + clave, JSON.stringify(valor), 'EX', Math.max(1, ttl)));

/**
 * Devuelve { valor, origen } con origen = HIT | MISS | BYPASS.
 * `calcular` consulta la fuente real (MongoDB). `ttl` puede ser un número o una función (valor) => segundos.
 */
async function obtenerOCalcular(clave, calcular, ttl = TTL_FINAL) {
  if (!redisListo()) return { valor: await calcular(), origen: 'BYPASS' };

  const guardado = await leer(clave);
  if (guardado !== null) {
    await contar('aciertos');
    return { valor: guardado, origen: 'HIT' };
  }

  const valor = await calcular();
  if (valor !== null && valor !== undefined) {
    await guardar(clave, valor, typeof ttl === 'function' ? ttl(valor) : ttl);
  }
  await contar('fallos');
  return { valor, origen: 'MISS' };
}

// Los listados dependen de la versión: al subirla, todas las claves de listados quedan huérfanas y expiran solas.
async function versionListas() {
  return (await seguro((r) => r.get(CLAVE_VERSION_LISTAS))) || '0';
}

async function invalidarSolicitud(id) {
  await seguro(async (r) => {
    await r.del(`${PREFIJO}solicitud:${id}`);
    await r.incr(CLAVE_VERSION_LISTAS);
  });
}

async function invalidarListas() {
  await seguro((r) => r.incr(CLAVE_VERSION_LISTAS));
}

async function estadisticas() {
  const datos = (await seguro((r) => r.hgetall(ESTADISTICAS), {})) || {};
  const aciertos = Number(datos.aciertos || 0);
  const fallos = Number(datos.fallos || 0);
  const total = aciertos + fallos;
  return {
    aciertos,
    fallos,
    tasaAciertos: total ? Number((aciertos / total).toFixed(2)) : null,
    ttlSegundos: TTL_FINAL,
    ttlEnCursoSegundos: TTL_EN_CURSO,
  };
}

module.exports = {
  obtenerOCalcular, versionListas, invalidarSolicitud, invalidarListas, estadisticas, ttlPorEstado, TTL_LISTAS,
};
