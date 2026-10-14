<script setup>
import { ref, computed } from 'vue';
import { api } from '../api/client';
import { usePolling } from '../composables/usePolling';
import { ETIQUETA } from '../composables/formato';
import ServicioEstado from '../components/ServicioEstado.vue';
import StatCard from '../components/StatCard.vue';

const m = ref(null);
const error = ref('');

async function cargar() {
  try {
    m.value = await api.metricas();
    error.value = '';
  } catch (e) {
    m.value = null;
    error.value = e.message;
  }
}
usePolling(cargar, 3000);

const maximo = computed(() => Math.max(1, ...Object.values(m.value?.solicitudesPorEstado || {})));
const aciertos = computed(() => (m.value?.cache.tasaAciertos == null ? '–' : `${Math.round(m.value.cache.tasaAciertos * 100)}%`));
</script>

<template>
  <section class="intro">
    <h1>Monitor del sistema</h1>
    <p>Estado de cada servicio, la cola de Redis y la caché. Se actualiza cada 3 segundos.</p>
  </section>

  <div v-if="error" class="panel empty"><strong>No hay conexión con el backend</strong>{{ error }}</div>

  <template v-else>
    <section class="panel">
      <h2>Servicios</h2>
      <div class="servicios">
        <ServicioEstado nombre="Backend (API)" rol="Express" estado="ok" />
        <ServicioEstado nombre="MongoDB" rol="Solicitudes y respuestas" :estado="m?.servicios.mongo" />
        <ServicioEstado nombre="Redis" rol="Caché y cola" :estado="m?.servicios.redis" />
        <ServicioEstado nombre="Worker" rol="Procesa la cola" :estado="m?.servicios.worker" />
      </div>
    </section>

    <section class="stats stats-3" aria-label="Cola y caché">
      <StatCard :valor="m?.cola.cola ?? '–'" etiqueta="En la cola" tono="curso" />
      <StatCard :valor="m?.cola.enProceso ?? '–'" etiqueta="Procesándose ahora" />
      <StatCard :valor="aciertos" etiqueta="Aciertos de caché" tono="ok" />
    </section>

    <div class="dos-col">
      <section class="panel">
        <h2>Solicitudes por estado</h2>
        <ul class="barras">
          <li v-for="(texto, estado) in ETIQUETA" :key="estado" :class="`st-${estado}`">
            <span class="barra-et">{{ texto }}</span>
            <span class="barra"><span class="barra-in" :style="{ width: `${((m?.solicitudesPorEstado[estado] || 0) / maximo) * 100}%` }"></span></span>
            <span class="barra-n">{{ m?.solicitudesPorEstado[estado] ?? 0 }}</span>
          </li>
        </ul>
      </section>

      <section class="panel">
        <h2>Caché de lecturas</h2>
        <dl class="d-grid una-col">
          <div><dt>Aciertos (HIT)</dt><dd>{{ m?.cache.aciertos ?? 0 }}</dd></div>
          <div><dt>Fallos (MISS)</dt><dd>{{ m?.cache.fallos ?? 0 }}</dd></div>
          <div><dt>Duración al terminar</dt><dd>{{ m?.cache.ttlSegundos }} s</dd></div>
          <div><dt>Duración en curso</dt><dd>{{ m?.cache.ttlEnCursoSegundos }} s</dd></div>
        </dl>
        <p class="hint">Cada lectura que ya está en Redis se responde sin consultar MongoDB. Cuando el Worker cambia una solicitud, su caché se invalida.</p>
      </section>
    </div>
  </template>
</template>
