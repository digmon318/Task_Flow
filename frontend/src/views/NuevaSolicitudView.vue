<script setup>
import { useRouter } from 'vue-router';
import { useAvisos } from '../composables/useAvisos';
import SolicitudForm from '../components/SolicitudForm.vue';

const router = useRouter();
const { mostrar } = useAvisos();

function alCrear(solicitud) {
  mostrar('Solicitud registrada correctamente');
  router.push({ name: 'detalle', params: { id: solicitud._id } });
}
</script>

<template>
  <section class="panel estrecho">
    <h2>Nueva solicitud</h2>
    <p class="hint">Cuéntanos qué necesitas: la procesaremos en segundo plano y verás la respuesta en el detalle.</p>
    <SolicitudForm @creada="alCrear" />
  </section>
</template>
