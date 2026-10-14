<script setup>
defineProps({
  valor: { type: [Number, String], default: '–' },
  etiqueta: { type: String, required: true },
  tono: { type: String, default: '' }, // '' | curso | ok | err
});
</script>

<template>
  <div class="stat" :class="tono && `s-${tono}`">
    <span class="stat-n">{{ valor }}</span>
    <span class="stat-l">{{ etiqueta }}</span>
  </div>
</template>
