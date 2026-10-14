<script setup>
import { aviso } from '../composables/useAvisos';
</script>

<template>
  <div class="toast" :class="{ show: aviso.visible, error: aviso.error }" role="status" aria-live="polite">{{ aviso.texto }}</div>
</template>
