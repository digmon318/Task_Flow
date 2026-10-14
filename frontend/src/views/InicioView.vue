<script setup>
import { ref, computed } from 'vue';
import { api } from '../api/client';
import { usePolling } from '../composables/usePolling';
import { enCurso } from '../composables/formato';
import StatCard from '../components/StatCard.vue';
import SolicitudItem from '../components/SolicitudItem.vue';

const solicitudes = ref([]);
const cargando = ref(true);
const error = ref('');

const resumen = computed(() => ({
  total: solicitudes.value.length,
  curso: solicitudes.value.filter(enCurso).length,
  ok: solicitudes.value.filter((s) => s.estado === 'RESPONDIDA').length,
  err: solicitudes.value.filter((s) => s.estado === 'ERROR').length,
}));
const recientes = computed(() => solicitudes.value.slice(0, 5));

async function cargar() {
  try {
    solicitudes.value = (await api.listar()).solicitudes;
    error.value = '';
  } catch (e) {
    error.value = e.message;
  } finally {
    cargando.value = false;
  }
  return solicitudes.value.some(enCurso); // se refresca solo mientras haya algo en curso
}
usePolling(cargar, 4000);
</script>

<template>
  <section class="intro">
    <h1>Gestiona tus solicitudes</h1>
    <p>Envía una solicitud y sigue su avance hasta recibir la respuesta automática.</p>
    <RouterLink to="/solicitudes/nueva" class="btn primary intro-cta">Nueva solicitud</RouterLink>
  </section>

  <section class="stats" aria-label="Resumen">
    <StatCard :valor="cargando ? '–' : resumen.total" etiqueta="Total" />
    <StatCard :valor="cargando ? '–' : resumen.curso" etiqueta="En curso" tono="curso" />
    <StatCard :valor="cargando ? '–' : resumen.ok" etiqueta="Respondidas" tono="ok" />
    <StatCard :valor="cargando ? '–' : resumen.err" etiqueta="Con error" tono="err" />
  </section>

  <section class="panel">
    <div class="list-head">
      <div>
        <h2>Últimas solicitudes</h2>
        <p class="hint">Las cinco más recientes.</p>
      </div>
      <RouterLink to="/solicitudes" class="btn ghost">Ver todas</RouterLink>
    </div>

    <ul class="items">
      <template v-if="cargando">
        <li class="skel"></li><li class="skel"></li><li class="skel"></li>
      </template>
      <li v-else-if="error" class="empty"><strong>No pudimos consultar las solicitudes</strong>{{ error }}. Revisa que el backend esté en marcha.</li>
      <li v-else-if="!recientes.length" class="empty"><strong>Aún no hay solicitudes</strong>Crea la primera para ver cómo se procesa.</li>
      <template v-else>
        <li v-for="s in recientes" :key="s._id"><SolicitudItem :solicitud="s" /></li>
      </template>
    </ul>
  </section>
</template>
