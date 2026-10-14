// Motor de respuestas automáticas: función pura (sin base de datos ni Redis), fácil de probar.
// La respuesta se arma con reglas declaradas como datos:
//   1. La CATEGORÍA decide el área responsable y los pasos a seguir.
//   2. La PRIORIDAD decide el tiempo estimado de atención.
//   3. Las PALABRAS CLAVE de la descripción añaden observaciones y pueden acortar el tiempo.
// Para agregar o cambiar una regla basta con editar estas tablas.

const CATEGORIAS = {
  'Información': {
    regla: 'INFO',
    area: 'Atención al usuario',
    resumen: 'Reuniremos la información que pides y te la compartiremos en esta misma pantalla.',
    pasos: [
      'Verificamos que la información solicitada esté disponible.',
      'Preparamos un resumen claro con los datos que necesitas.',
      'Publicamos la respuesta aquí y te avisamos del cambio de estado.',
    ],
  },
  'Soporte': {
    regla: 'SOPORTE',
    area: 'Mesa de soporte técnico',
    resumen: 'Un técnico revisará el problema que reportas.',
    pasos: [
      'Registramos el caso y reunimos los datos del problema.',
      'Un técnico reproduce el fallo y lo diagnostica.',
      'Aplicamos la solución y confirmamos contigo que quedó resuelto.',
    ],
  },
  'Documento': {
    regla: 'DOCUMENTO',
    area: 'Gestión documental',
    resumen: 'Prepararemos el documento que solicitas.',
    pasos: [
      'Validamos tus datos y el tipo de documento pedido.',
      'Generamos y revisamos el documento.',
      'Te lo entregamos por el medio acordado.',
    ],
  },
  'Consulta': {
    regla: 'CONSULTA',
    area: 'Asesoría general',
    resumen: 'Un asesor analizará tu consulta y te responderá con una recomendación.',
    pasos: [
      'Clasificamos la consulta según el tema.',
      'Un asesor la analiza y redacta la recomendación.',
      'Te enviamos la respuesta y quedamos atentos a dudas adicionales.',
    ],
  },
  'Actualización': {
    regla: 'ACTUALIZACION',
    area: 'Registro y datos',
    resumen: 'Actualizaremos la información que indicas.',
    pasos: [
      'Comprobamos qué datos actuales hay que cambiar.',
      'Aplicamos la actualización en nuestros registros.',
      'Te confirmamos que el cambio quedó registrado.',
    ],
  },
};

// Horas estimadas de atención según la prioridad.
const HORAS_POR_PRIORIDAD = { Alta: 4, Media: 24, Baja: 72 };

// Palabras clave: si la descripción coincide, se añade la nota y (opcional) se reduce el tiempo.
const PALABRAS_CLAVE = [
  {
    id: 'URGENCIA',
    patron: /(urgente|urgencia|inmediat|cr[ií]tic|cuanto antes)/i,
    nota: 'Detectamos que tu caso es urgente: lo marcamos para atención prioritaria.',
    factorTiempo: 0.5,
  },
  {
    id: 'ACCESO',
    patron: /(contrase[ñn]a|acceso|login|iniciar sesi[oó]n|bloquead)/i,
    nota: 'Si es un problema de acceso, no compartas tu contraseña con nadie: te enviaremos un enlace seguro para restablecerla.',
  },
  {
    id: 'PAGO',
    patron: /(factura|pago|cobro|reembolso)/i,
    nota: 'Ten a mano el comprobante o el número de factura: acelera la revisión.',
  },
  {
    id: 'PLAZO',
    patron: /(fecha l[ií]mite|vence|vencimiento|plazo)/i,
    nota: 'Mencionas una fecha límite: la tendremos en cuenta al programar la atención.',
  },
];

function formatearHoras(horas) {
  if (horas >= 24 && horas % 24 === 0) {
    const dias = horas / 24;
    return `${horas} horas (${dias} ${dias === 1 ? 'día' : 'días'})`;
  }
  return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
}

/**
 * Genera la respuesta automática de una solicitud.
 * Lanza un Error si la categoría o la prioridad no tienen regla (el worker la marcará como ERROR).
 * @returns {{ respuesta: string, areaResponsable: string, reglaAplicada: string, tiempoEstimadoHoras: number }}
 */
function generarRespuesta(solicitud) {
  const regla = CATEGORIAS[solicitud.categoria];
  if (!regla) throw new Error(`No existe una regla para la categoría "${solicitud.categoria}"`);

  const horasBase = HORAS_POR_PRIORIDAD[solicitud.prioridad];
  if (!horasBase) throw new Error(`No existe una regla para la prioridad "${solicitud.prioridad}"`);

  const coincidencias = PALABRAS_CLAVE.filter((p) => p.patron.test(`${solicitud.titulo} ${solicitud.descripcion}`));

  const factor = coincidencias.reduce((f, p) => f * (p.factorTiempo || 1), 1);
  const horas = Math.max(1, Math.ceil(horasBase * factor));

  const lineas = [
    `Recibimos tu solicitud «${solicitud.titulo}» (${solicitud.categoria}, prioridad ${solicitud.prioridad}).`,
    regla.resumen,
    '',
    `Área responsable: ${regla.area}`,
    `Tiempo estimado de atención: ${formatearHoras(horas)}`,
    '',
    'Qué sigue:',
    ...regla.pasos.map((p, i) => `${i + 1}. ${p}`),
  ];

  const notas = coincidencias.map((p) => `- ${p.nota}`);
  if (notas.length) lineas.push('', 'Observaciones:', ...notas);

  return {
    respuesta: lineas.join('\n'),
    areaResponsable: regla.area,
    reglaAplicada: [regla.regla, ...coincidencias.map((p) => p.id)].join('+'),
    tiempoEstimadoHoras: horas,
  };
}

module.exports = { generarRespuesta, CATEGORIAS, HORAS_POR_PRIORIDAD, PALABRAS_CLAVE };
