<script setup>
import { ref, computed } from 'vue';
import { api } from '../api/client';
import { usePolling } from '../composables/usePolling';
import { fecha, enCurso } from '../composables/formato';
import EstadoBadge from '../components/EstadoBadge.vue';
import ProgresoEstado from '../components/ProgresoEstado.vue';

const props = defineProps({ id: { type: String, required: true } });

const solicitud = ref(null);
const cargando = ref(true);
const error = ref('');
const noExiste = ref(false);
const origen = ref('');

const falla = computed(() => solicitud.value?.estado === 'ERROR');

async function cargar() {
  try {
    const r = await api.detalle(props.id);
    solicitud.value = r.solicitud;
    origen.value = r.origenCache || '';
    error.value = '';
  } catch (e) {
    if (e.status === 404) noExiste.value = true;
    else error.value = e.message;
  } finally {
    cargando.value = false;
  }
  if (noExiste.value) return false;
  return solicitud.value ? enCurso(solicitud.value) : true; // reintenta si falló; para al terminar
}
usePolling(cargar, 3000);
</script>

<template>
  <RouterLink to="/solicitudes" class="volver">← Volver a las solicitudes</RouterLink>

  <section v-if="cargando" class="panel"><div class="skel alto"></div></section>

  <section v-else-if="noExiste" class="panel empty">
    <strong>Esta solicitud no existe</strong>
    Puede que el enlace esté mal escrito. <RouterLink to="/solicitudes">Ver todas las solicitudes</RouterLink>
  </section>

  <section v-else-if="!solicitud" class="panel empty">
    <strong>No pudimos cargar la solicitud</strong>{{ error }}
  </section>

  <article v-else class="panel detalle">
    <div class="d-cabecera">
      <EstadoBadge :estado="solicitud.estado" />
      <span v-if="origen" class="cache-tag" :title="origen === 'HIT' ? 'Respuesta servida desde Redis' : 'Respuesta consultada en MongoDB'">caché {{ origen }}</span>
    </div>
    <h1 class="d-title">{{ solicitud.titulo }}</h1>
    <div class="d-id">ID: {{ solicitud._id }}</div>
    <p class="d-desc">{{ solicitud.descripcion }}</p>

    <dl class="d-grid">
      <div><dt>Categoría</dt><dd>{{ solicitud.categoria }}</dd></div>
      <div><dt>Prioridad</dt><dd :class="`prio-${solicitud.prioridad}`">{{ solicitud.prioridad }}</dd></div>
      <div><dt>Creada</dt><dd>{{ fecha(solicitud.fechaCreacion) }}</dd></div>
      <div><dt>Procesada</dt><dd>{{ fecha(solicitud.fechaProcesamiento) }}</dd></div>
      <template v-if="solicitud.estado === 'RESPONDIDA'">
        <div><dt>Área responsable</dt><dd>{{ solicitud.areaResponsable }}</dd></div>
        <div><dt>Tiempo estimado</dt><dd>{{ solicitud.tiempoEstimadoHoras }} h</dd></div>
      </template>
    </dl>

    <h2 class="d-h">Progreso</h2>
    <ProgresoEstado :estado="solicitud.estado" />

    <h2 class="d-h">{{ falla ? 'Motivo del error' : 'Respuesta' }}</h2>
    <div v-if="solicitud.estado === 'RESPONDIDA'" class="box ok">{{ solicitud.respuesta }}</div>
    <div v-else-if="falla" class="box err">{{ solicitud.mensajeError || 'No se pudo procesar la solicitud.' }}</div>
    <div v-else class="box wait">Estamos procesando tu solicitud. Esta vista se actualiza sola.</div>

    <p v-if="solicitud.estado === 'RESPONDIDA' && solicitud.reglaAplicada" class="regla">Regla aplicada: {{ solicitud.reglaAplicada }}</p>
  </article>
</template>
