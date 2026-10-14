<script setup>
import { ref } from 'vue';
import { api } from '../api/client';
import { usePolling } from '../composables/usePolling';

const nivel = ref('espera'); // espera | ok | parcial | caido
const texto = ref('Comprobando…');

async function revisar() {
  try {
    const h = await api.salud();
    const caidos = ['mongo', 'redis', 'worker'].filter((s) => h[s] !== 'ok');
    if (!caidos.length) { nivel.value = 'ok'; texto.value = 'Todo en línea'; }
    else { nivel.value = 'parcial'; texto.value = `Con fallos: ${caidos.join(', ')}`; }
  } catch {
    nivel.value = 'caido';
    texto.value = 'Sin conexión';
  }
}
usePolling(revisar, 10000);
</script>

<template>
  <RouterLink to="/monitor" class="health" :class="nivel" role="status" :title="texto">
    <span class="dot"></span><span class="health-text">{{ texto }}</span>
  </RouterLink>
</template>
