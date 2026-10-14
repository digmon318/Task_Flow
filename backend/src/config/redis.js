const Redis = require('ioredis');

let cliente = null;

const urlRedis = () => process.env.REDIS_URL || 'redis://localhost:6379';

// Crea una conexión nueva. ioredis reintenta solo si Redis aún no está disponible.
function crearRedis(etiqueta = 'Redis') {
  const url = urlRedis();
  if (!process.env.REDIS_URL) console.warn(`[${etiqueta}] REDIS_URL no está definida, se usa ${url}. ¿Falta el archivo .env?`);
  const c = new Redis(url, {
    maxRetriesPerRequest: null,
    retryStrategy: (intento) => Math.min(intento * 500, 5000),
  });
  c.on('ready', () => console.log(`[${etiqueta}] Conectado -> ${url.replace(/\/\/[^@/]*@/, '//***@')}`));
  c.on('error', (e) => {
    // Con varias direcciones (IPv4/IPv6) el error llega vacío: se muestra el código real
    const causa = e.message || e.code || (e.errors || []).map((x) => x.code || x.message).join(', ');
    console.error(`[${etiqueta}] Error: ${causa || 'no se pudo conectar'} (revisa REDIS_URL)`);
  });
  return c;
}

// Conexión compartida del backend (para encolar solicitudes)
function conectarRedis() {
  cliente = crearRedis('Redis');
  return cliente;
}

const obtenerRedis = () => {
  if (!cliente) throw new Error('Redis no está inicializado');
  return cliente;
};
const redisListo = () => cliente !== null && cliente.status === 'ready';

module.exports = { crearRedis, conectarRedis, obtenerRedis, redisListo };
