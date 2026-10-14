const test = require('node:test');
const assert = require('node:assert/strict');

// Redis falso en memoria: permite probar la lógica de la caché sin levantar Redis.
const datos = new Map();
const hashes = {};
const llamadasSet = [];
const estado = { listo: true };
const falso = {
  get: async (k) => (datos.has(k) ? datos.get(k) : null),
  set: async (k, v, ...args) => { datos.set(k, v); llamadasSet.push({ k, args }); return 'OK'; },
  del: async (k) => (datos.delete(k) ? 1 : 0),
  incr: async (k) => { const n = Number(datos.get(k) || 0) + 1; datos.set(k, String(n)); return n; },
  hincrby: async (k, f, n) => { hashes[k] = hashes[k] || {}; hashes[k][f] = String(Number(hashes[k][f] || 0) + n); },
  hgetall: async (k) => hashes[k] || {},
};
const ruta = require.resolve('../src/config/redis');
require.cache[ruta] = { id: ruta, filename: ruta, loaded: true, exports: { obtenerRedis: () => falso, redisListo: () => estado.listo } };

const cache = require('../src/services/cache.service');

test('primera lectura es MISS y la segunda es HIT (sin consultar la fuente)', async () => {
  let consultas = 0;
  const calcular = async () => { consultas++; return { id: 1, estado: 'RESPONDIDA' }; };
  const a = await cache.obtenerOCalcular('solicitud:1', calcular, 60);
  const b = await cache.obtenerOCalcular('solicitud:1', calcular, 60);
  assert.equal(a.origen, 'MISS');
  assert.equal(b.origen, 'HIT');
  assert.deepEqual(b.valor, { id: 1, estado: 'RESPONDIDA' });
  assert.equal(consultas, 1);
});

test('el TTL se calcula según el estado: corto en curso, largo al terminar', async () => {
  llamadasSet.length = 0;
  await cache.obtenerOCalcular('solicitud:a', async () => ({ estado: 'EN_COLA' }), (s) => cache.ttlPorEstado(s.estado));
  await cache.obtenerOCalcular('solicitud:b', async () => ({ estado: 'RESPONDIDA' }), (s) => cache.ttlPorEstado(s.estado));
  const ttl = (clave) => llamadasSet.find((x) => x.k.endsWith(clave)).args[1];
  assert.ok(ttl('solicitud:a') < ttl('solicitud:b'));
});

test('invalidarSolicitud borra la clave y la siguiente lectura vuelve a MISS', async () => {
  const calcular = async () => ({ estado: 'EN_COLA' });
  await cache.obtenerOCalcular('solicitud:9', calcular, 60);
  await cache.invalidarSolicitud('9');
  const r = await cache.obtenerOCalcular('solicitud:9', calcular, 60);
  assert.equal(r.origen, 'MISS');
});

test('invalidar sube la versión de los listados', async () => {
  const antes = Number(await cache.versionListas());
  await cache.invalidarListas();
  assert.equal(Number(await cache.versionListas()), antes + 1);
});

test('no se guardan resultados nulos (ids inexistentes)', async () => {
  const r1 = await cache.obtenerOCalcular('solicitud:no', async () => null, 60);
  const r2 = await cache.obtenerOCalcular('solicitud:no', async () => null, 60);
  assert.equal(r1.valor, null);
  assert.equal(r2.origen, 'MISS');
});

test('si Redis no está listo, la caché se omite (BYPASS) y la consulta sigue funcionando', async () => {
  estado.listo = false;
  const r = await cache.obtenerOCalcular('solicitud:x', async () => ({ ok: true }), 60);
  estado.listo = true;
  assert.equal(r.origen, 'BYPASS');
  assert.deepEqual(r.valor, { ok: true });
});

test('las estadísticas cuentan aciertos y fallos', async () => {
  const e = await cache.estadisticas();
  assert.ok(e.aciertos >= 1 && e.fallos >= 1);
  assert.ok(e.tasaAciertos > 0 && e.tasaAciertos < 1);
});
