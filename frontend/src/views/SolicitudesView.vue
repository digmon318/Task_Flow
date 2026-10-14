<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api/client';
import { usePolling } from '../composables/usePolling';
import { enCurso } from '../composables/formato';
import FiltrosSolicitudes from '../components/FiltrosSolicitudes.vue';
import SolicitudItem from '../components/SolicitudItem.vue';

const route = useRoute();
const router = useRouter();

// Los filtros viven en la URL (?estado=RESPONDIDA&busqueda=...) para poder compartir o recargar la vista
const busqueda = ref(String(route.query.busqueda || ''));
const estado = ref(String(route.query.estado || ''));
const solicitudes = ref([]);
const total = ref(0);
const cargando = ref(true);
const error = ref('');
const origen = ref('');

async function cargar() {
  try {
    const r = await api.listar({ busqueda: busqueda.value.trim(), estado: estado.value });
    solicitudes.value = r.solicitudes;
    total.value = r.total;
    origen.value = r.origenCache || '';
    error.value = '';
  } catch (e) {
    error.value = e.message;
  } finally {
    cargando.value = false;
  }
  return solicitudes.value.some(enCurso);
}
const { refrescar } = usePolling(cargar, 4000);

let debounce;
watch([busqueda, estado], () => {
  router.replace({ query: { ...(busqueda.value.trim() && { busqueda: busqueda.value.trim() }), ...(estado.value && { estado: estado.value }) } });
  clearTimeout(debounce);
  debounce = setTimeout(refrescar, 300);
});
</script>

<template>
  <section class="panel">
    <div class="list-head">
      <div>
        <h2>Solicitudes</h2>
        <p class="hint">
          <template v-if="cargando">Cargando…</template>
          <template v-else-if="error">No se pudo cargar</template>
          <template v-else>{{ total === 1 ? '1 solicitud' : `${total} solicitudes` }}</template>
          <span v-if="origen" class="cache-tag" :title="origen === 'HIT' ? 'Respuesta servida desde Redis' : 'Respuesta consultada en MongoDB'">caché {{ origen }}</span>
        </p>
      </div>
      <div class="acciones">
        <button class="btn ghost" type="button" @click="refrescar">Actualizar</button>
        <RouterLink to="/solicitudes/nueva" class="btn primary compacto">Nueva solicitud</RouterLink>
      </div>
    </div>

    <FiltrosSolicitudes v-model:busqueda="busqueda" v-model:estado="estado" />

    <ul class="items">
      <template v-if="cargando">
        <li class="skel"></li><li class="skel"></li><li class="skel"></li>
      </template>
      <li v-else-if="error" class="empty"><strong>No pudimos consultar las solicitudes</strong>{{ error }}. Revisa que el backend esté en marcha.</li>
      <li v-else-if="!solicitudes.length" class="empty"><strong>No hay solicitudes para mostrar</strong>Crea la primera o cambia los filtros.</li>
      <template v-else>
        <li v-for="s in solicitudes" :key="s._id"><SolicitudItem :solicitud="s" /></li>
      </template>
    </ul>
  </section>
</template>
