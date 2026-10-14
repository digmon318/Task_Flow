<script setup>
import { ETIQUETA } from '../composables/formato';
defineProps({ estado: { type: String, required: true } });
</script>

<template>
  <span class="badge" :class="`st-${estado}`">{{ ETIQUETA[estado] || estado }}</span>
</template>
