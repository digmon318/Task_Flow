// Pruebas de integración de TaskFlow: ejercitan el sistema completo ya levantado con Docker Compose.
//
//   docker compose up -d --build --wait
//   node --test pruebas/integracion.test.mjs
//
// Variables:
//   API_URL     URL del backend (por defecto http://localhost:3000)
//   SIN_DOCKER  =1 omite las pruebas que detienen/reinician contenedores (caídas de Redis, Mongo o Worker)
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const API = process.env.API_URL || 'http://localhost:3000';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIN_DOCKER = process.env.SIN_DOCKER === '1';
const requiereDocker = SIN_DOCKER ? { skip: 'SIN_DOCKER=1' } : {};

// ---------- utilidades ----------
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function http(ruta, opciones = {}) {
  const res = await fetch(API + ruta, { headers: { 'Content-Type': 'application/json' }, ...opciones });
  const texto = await res.text();
  let cuerpo; try { cuerpo = JSON.parse(texto); } catch { cuerpo = texto; }
  return { status: res.status, cuerpo, cache: res.headers.get('x-cache') };
}
const crear = (extra = {}) => http('/solicitudes', {
  method: 'POST',
  body: JSON.stringify({ titulo: 'Prueba de integración', descripcion: 'Solicitud creada por las pruebas', categoria: 'Consulta', prioridad: 'Media', ...extra }),
});
const detalle = async (id) => (await http(`/solicitudes/${id}`)).cuerpo.solicitud;

async function esperarHasta(condicion, { ms = 60000, cada = 300, mensaje = 'condición' } = {}) {
  const limite = Date.now() + ms;
  let ultimo;
  while (Date.now() < limite) {
    try { ultimo = await condicion(); if (ultimo) return ultimo; } catch { /* backend reiniciando */ }
    await dormir(cada);
  }
  assert.fail(`Tiempo agotado esperando: ${mensaje}`);
}
const esperarEstado = (id, estado, ms = 60000) =>
  esperarHasta(async () => { const s = await detalle(id); return s?.estado === estado ? s : null; }, { ms, mensaje: `${id} -> ${estado}` });
const esperarSalud = (campos = ['mongo', 'redis', 'worker']) =>
  esperarHasta(async () => { const { cuerpo } = await http('/health'); return campos.every((c) => cuerpo[c] === 'ok') ? cuerpo : null; }, { ms: 90000, mensaje: `salud ${campos.join(', ')}` });

const compose = (...args) => execFileSync('docker', ['compose', ...args], { cwd: RAIZ, stdio: 'pipe' }).toString();
const servicios = () => { try { return compose('ps', '--services', '--all').split(/\s+/).filter(Boolean); } catch { return []; } };
const metricas = async () => (await http('/metricas')).cuerpo;

// Antes de empezar, el sistema debe estar completo
test.before(async () => { await esperarSalud(); });

// ---------- 1. Arquitectura y salud ----------
test('Salud: backend, MongoDB, Redis y Worker responden', async () => {
  const { status, cuerpo } = await http('/health');
  assert.equal(status, 200);
  assert.deepEqual([cuerpo.mongo, cuerpo.redis, cuerpo.worker], ['ok', 'ok', 'ok']);
});

// ---------- 2. API REST y validaciones ----------
test('API: rechaza datos incompletos, inválidos y mal formados', async () => {
  assert.equal((await crear({ titulo: '' })).status, 400);
  assert.equal((await crear({ categoria: 'Inventada' })).status, 400);
  assert.equal((await crear({ prioridad: 'Urgentísima' })).status, 400);
  assert.equal((await crear({ titulo: { $ne: '' } })).status, 400, 'no acepta objetos (inyección NoSQL)');
  assert.equal((await http('/solicitudes', { method: 'POST', body: '{roto' })).status, 400);
  assert.equal((await http('/solicitudes?estado=NOEXISTE')).status, 400);
});

test('API: ids inexistentes o inválidos devuelven 404', async () => {
  assert.equal((await http('/solicitudes/no-es-un-id')).status, 404);
  assert.equal((await http('/solicitudes/000000000000000000000000')).status, 404);
  assert.equal((await http('/solicitudes/000000000000000000000000/respuesta')).status, 404);
});

// ---------- 3. Persistencia en MongoDB ----------
test('Persistencia: la solicitud creada queda guardada, se consulta y aparece en el listado y la búsqueda', async () => {
  const marca = `persist-${Date.now()}`;
  const { status, cuerpo } = await crear({ titulo: marca, descripcion: 'Texto para buscar después' });
  assert.equal(status, 201);
  const id = cuerpo.solicitud._id;
  assert.ok(['EN_COLA', 'PROCESANDO', 'RESPONDIDA'].includes(cuerpo.solicitud.estado));

  const s = await detalle(id);
  assert.equal(s.titulo, marca);
  assert.equal(s.categoria, 'Consulta');

  const lista = await http('/solicitudes');
  assert.ok(lista.cuerpo.solicitudes.some((x) => x._id === id));
  const busqueda = await http(`/solicitudes?busqueda=${encodeURIComponent(marca)}`);
  assert.equal(busqueda.cuerpo.total, 1);
  const buscaRara = await http(`/solicitudes?busqueda=${encodeURIComponent('(*[')}`);
  assert.equal(buscaRara.status, 200, 'caracteres especiales no rompen la búsqueda');
});

// ---------- 4. Cola + Worker + respuesta ----------
test('Cola y Worker: la solicitud avanza hasta RESPONDIDA y la respuesta queda guardada', async () => {
  const { cuerpo } = await crear({ titulo: 'Flujo completo', categoria: 'Información', prioridad: 'Baja' });
  const id = cuerpo.solicitud._id;

  const antes = await http(`/solicitudes/${id}/respuesta`);
  if (antes.cuerpo.estado !== 'RESPONDIDA') assert.equal(antes.cuerpo.respuesta, null);

  const s = await esperarEstado(id, 'RESPONDIDA');
  assert.ok(s.respuesta.includes('Flujo completo'));
  assert.ok(s.fechaProcesamiento);

  const r = await http(`/solicitudes/${id}/respuesta`);
  assert.equal(r.cuerpo.estado, 'RESPONDIDA');
  assert.equal(r.cuerpo.areaResponsable, 'Atención al usuario');
});

// ---------- 5. Reglas por categoría, prioridad y palabras clave ----------
test('Reglas: la respuesta depende de la categoría, la prioridad y las palabras clave', async () => {
  const casos = [
    { datos: { titulo: 'Certificado', descripcion: 'Necesito un certificado', categoria: 'Documento', prioridad: 'Baja' }, area: 'Gestión documental', horas: 72 },
    { datos: { titulo: 'No entra', descripcion: 'Es urgente, no puedo iniciar sesión', categoria: 'Soporte', prioridad: 'Alta' }, area: 'Mesa de soporte técnico', horas: 2, regla: /URGENCIA.*ACCESO/ },
    { datos: { titulo: 'Cambio de dirección', descripcion: 'Quiero actualizar mi dirección', categoria: 'Actualización', prioridad: 'Media' }, area: 'Registro y datos', horas: 24 },
  ];
  const ids = [];
  for (const c of casos) ids.push((await crear(c.datos)).cuerpo.solicitud._id);
  for (const [i, c] of casos.entries()) {
    const s = await esperarEstado(ids[i], 'RESPONDIDA');
    assert.equal(s.areaResponsable, c.area);
    assert.equal(s.tiempoEstimadoHoras, c.horas);
    if (c.regla) assert.match(s.reglaAplicada, c.regla);
    assert.match(s.respuesta, /Qué sigue:/);
  }
});

// ---------- 6. Caché en Redis ----------
test('Caché: la segunda lectura sale de Redis (HIT) y las métricas lo reflejan', async () => {
  const { cuerpo } = await crear({ titulo: 'Para caché' });
  const id = cuerpo.solicitud._id;
  await esperarEstado(id, 'RESPONDIDA');

  const antes = (await metricas()).cache.aciertos;
  const a = await http(`/solicitudes/${id}`);
  const b = await http(`/solicitudes/${id}`);
  assert.ok(['HIT', 'MISS'].includes(a.cache));
  assert.equal(b.cache, 'HIT');
  assert.deepEqual(a.cuerpo, b.cuerpo, 'la caché devuelve los mismos datos que MongoDB');
  assert.ok((await metricas()).cache.aciertos >= antes + 1);
});

test('Caché: crear una solicitud invalida los listados (no se ven datos viejos)', async () => {
  await http('/solicitudes'); // calienta
  assert.equal((await http('/solicitudes')).cache, 'HIT');
  const { cuerpo } = await crear({ titulo: 'Invalida el listado' });
  const lista = await http('/solicitudes');
  assert.equal(lista.cache, 'MISS', 'el listado se recalcula tras crear');
  assert.ok(lista.cuerpo.solicitudes.some((s) => s._id === cuerpo.solicitud._id));
});

test('Caché: el estado visible no se queda atrasado más que el TTL de las solicitudes en curso', async () => {
  const { ttlEnCursoSegundos } = (await metricas()).cache;
  const { cuerpo } = await crear({ titulo: 'Estado fresco' });
  const id = cuerpo.solicitud._id;
  const inicio = Date.now();
  await detalle(id); // deja EN_COLA (o PROCESANDO) en caché
  await esperarHasta(async () => (await detalle(id)).estado !== 'EN_COLA', { ms: (ttlEnCursoSegundos + 3) * 1000, cada: 150, mensaje: 'salir de EN_COLA' });
  assert.ok(Date.now() - inicio < (ttlEnCursoSegundos + 3) * 1000);
  const final = await esperarEstado(id, 'RESPONDIDA');
  assert.equal(final.estado, 'RESPONDIDA');
});

// ---------- 7. Cola y recuperación (requieren controlar contenedores) ----------
test('Cola: con el Worker detenido las solicitudes esperan en Redis y se atienden al volver', requiereDocker, { timeout: 180000 }, async () => {
  compose('stop', 'worker');
  try {
    const ids = [];
    for (let i = 0; i < 3; i++) ids.push((await crear({ titulo: `En espera ${i}` })).cuerpo.solicitud._id);
    const m = await metricas();
    assert.ok(m.cola.cola >= 3, `cola esperada >= 3, actual ${m.cola.cola}`);
    for (const id of ids) assert.equal((await detalle(id)).estado, 'EN_COLA');
    compose('start', 'worker');
    for (const id of ids) await esperarEstado(id, 'RESPONDIDA', 90000);
    const fin = await metricas();
    assert.equal(fin.cola.cola, 0);
    assert.equal(fin.cola.enProceso, 0);
  } finally { compose('start', 'worker'); await esperarSalud(); }
});

test('Persistencia de la cola: reiniciar Redis no pierde las solicitudes en espera', requiereDocker, { timeout: 180000 }, async () => {
  compose('stop', 'worker');
  try {
    const ids = [(await crear({ titulo: 'Sobrevive a Redis 1' })).cuerpo.solicitud._id, (await crear({ titulo: 'Sobrevive a Redis 2' })).cuerpo.solicitud._id];
    await dormir(2000); // Redis escribe su AOF cada segundo
    compose('restart', 'redis');
    await esperarSalud(['mongo', 'redis']);
    assert.ok((await metricas()).cola.cola >= 2, 'la cola sigue en Redis tras el reinicio');
    compose('start', 'worker');
    for (const id of ids) await esperarEstado(id, 'RESPONDIDA', 90000);
  } finally { compose('start', 'worker'); await esperarSalud(); }
});

test('Recuperación: con Redis caído la solicitud se guarda PENDIENTE y se atiende cuando Redis vuelve', requiereDocker, { timeout: 240000 }, async () => {
  compose('stop', 'redis');
  try {
    await esperarHasta(async () => (await http('/health')).cuerpo.redis !== 'ok', { ms: 30000, mensaje: 'Redis marcado caído' });
    const r = await crear({ titulo: 'Creada sin Redis' });
    assert.equal(r.status, 201, 'el backend sigue aceptando solicitudes');
    assert.equal(r.cuerpo.solicitud.estado, 'PENDIENTE');
    const id = r.cuerpo.solicitud._id;
    assert.equal((await http(`/solicitudes/${id}`)).cache, 'BYPASS', 'sin Redis la lectura va directo a MongoDB');
    compose('start', 'redis');
    await esperarEstado(id, 'RESPONDIDA', 120000);
  } finally { compose('start', 'redis'); await esperarSalud(); }
});

test('Recuperación: si el Worker muere a mitad de una tarea, la retoma al reiniciar', requiereDocker, { timeout: 180000 }, async () => {
  const { cuerpo } = await crear({ titulo: 'Worker interrumpido' });
  const id = cuerpo.solicitud._id;
  await esperarEstado(id, 'PROCESANDO', 15000);
  compose('kill', 'worker'); // SIGKILL: no hay cierre ordenado
  try {
    assert.equal((await detalle(id)).estado, 'PROCESANDO');
    compose('start', 'worker');
    await esperarEstado(id, 'RESPONDIDA', 90000);
  } finally { compose('start', 'worker'); await esperarSalud(); }
});

test('Persistencia: los datos de MongoDB sobreviven al reinicio del contenedor', requiereDocker, { timeout: 180000 }, async () => {
  if (!servicios().includes('mongo')) return; // MongoDB externo (Atlas): no aplica
  const marca = `sobrevive-${Date.now()}`;
  const id = (await crear({ titulo: marca })).cuerpo.solicitud._id;
  await esperarEstado(id, 'RESPONDIDA');
  compose('restart', 'mongo');
  await esperarSalud(['mongo', 'redis']);
  const s = await esperarHasta(async () => detalle(id), { ms: 60000, mensaje: 'solicitud tras reiniciar Mongo' });
  assert.equal(s.titulo, marca);
  assert.equal(s.estado, 'RESPONDIDA');
});
