<script setup>
import { computed } from 'vue';
import { ETAPAS, ETIQUETA } from '../composables/formato';

const props = defineProps({ estado: { type: String, required: true } });
const falla = computed(() => props.estado === 'ERROR');
const indice = computed(() => ETAPAS.indexOf(props.estado));

function clase(i) {
  if (falla.value) return i === 0 ? 'now' : '';
  return i < indice.value ? 'done' : i === indice.value ? 'now' : '';
}
</script>

<template>
  <ol class="steps" :class="{ failed: falla }" aria-label="Progreso de la solicitud">
    <li v-for="(e, i) in ETAPAS" :key="e" :class="clase(i)">{{ ETIQUETA[e] }}</li>
  </ol>
</template>
