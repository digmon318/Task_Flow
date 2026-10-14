const test = require('node:test');
const assert = require('node:assert/strict');
const { generarRespuesta, CATEGORIAS, HORAS_POR_PRIORIDAD } = require('../src/services/reglas.service');

const base = { titulo: 'Certificado de estudios', descripcion: 'Necesito mi certificado', categoria: 'Documento', prioridad: 'Baja' };

test('cada categoría válida tiene regla, área y pasos', () => {
  for (const categoria of Object.keys(CATEGORIAS)) {
    const r = generarRespuesta({ ...base, categoria });
    assert.ok(r.areaResponsable, `área para ${categoria}`);
    assert.match(r.respuesta, /Qué sigue:/);
    assert.match(r.respuesta, /1\. /);
    assert.ok(r.reglaAplicada.startsWith(CATEGORIAS[categoria].regla));
  }
});

test('la prioridad define el tiempo estimado', () => {
  for (const [prioridad, horas] of Object.entries(HORAS_POR_PRIORIDAD)) {
    assert.equal(generarRespuesta({ ...base, prioridad }).tiempoEstimadoHoras, horas);
  }
});

test('la respuesta incluye título, categoría y prioridad de la solicitud', () => {
  const { respuesta } = generarRespuesta(base);
  assert.ok(respuesta.includes('«Certificado de estudios»'));
  assert.ok(respuesta.includes('Documento'));
  assert.ok(respuesta.includes('prioridad Baja'));
  assert.ok(respuesta.includes('72 horas (3 días)'));
});

test('una palabra de urgencia reduce el tiempo a la mitad y agrega observación', () => {
  const r = generarRespuesta({ ...base, categoria: 'Soporte', prioridad: 'Alta', descripcion: 'Es URGENTE, no puedo trabajar' });
  assert.equal(r.tiempoEstimadoHoras, 2);
  assert.match(r.reglaAplicada, /^SOPORTE\+URGENCIA$/);
  assert.match(r.respuesta, /Observaciones:/);
  assert.match(r.respuesta, /urgente/i);
});

test('palabras clave de acceso y pago combinan observaciones', () => {
  const r = generarRespuesta({ ...base, categoria: 'Soporte', prioridad: 'Media', descripcion: 'Perdí el acceso y me cobraron una factura' });
  assert.match(r.reglaAplicada, /ACCESO/);
  assert.match(r.reglaAplicada, /PAGO/);
  assert.equal(r.tiempoEstimadoHoras, 24);
});

test('sin palabras clave no hay sección de observaciones', () => {
  assert.doesNotMatch(generarRespuesta(base).respuesta, /Observaciones:/);
});

test('categoría o prioridad sin regla lanzan error (el worker lo marca como ERROR)', () => {
  assert.throws(() => generarRespuesta({ ...base, categoria: 'Inventada' }), /categoría "Inventada"/);
  assert.throws(() => generarRespuesta({ ...base, prioridad: 'Crítica' }), /prioridad "Crítica"/);
});

test('es determinista: misma entrada, misma salida', () => {
  assert.deepEqual(generarRespuesta(base), generarRespuesta(base));
});
