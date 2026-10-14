<script setup>
defineProps({
  nombre: { type: String, required: true },
  rol: { type: String, required: true },
  estado: { type: String, default: '' }, // ok | no disponible | ''
});
</script>

<template>
  <div class="servicio" :class="estado === 'ok' ? 'ok' : estado ? 'down' : ''">
    <span class="dot"></span>
    <div>
      <strong>{{ nombre }}</strong>
      <span class="servicio-rol">{{ rol }}</span>
    </div>
    <span class="servicio-estado">{{ estado === 'ok' ? 'En línea' : estado ? 'Caído' : '…' }}</span>
  </div>
</template>
