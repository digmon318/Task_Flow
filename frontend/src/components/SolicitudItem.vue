<script setup>
import EstadoBadge from './EstadoBadge.vue';
import { fecha } from '../composables/formato';
defineProps({ solicitud: { type: Object, required: true } });
</script>

<template>
  <RouterLink :to="{ name: 'detalle', params: { id: solicitud._id } }" class="item" :class="`st-${solicitud.estado}`">
    <div class="item-top">
      <span class="item-title">{{ solicitud.titulo }}</span>
      <EstadoBadge :estado="solicitud.estado" />
    </div>
    <span class="item-desc">{{ solicitud.descripcion }}</span>
    <div class="item-meta">
      <span>{{ solicitud.categoria }}</span>
      <span>Prioridad: <span :class="`prio-${solicitud.prioridad}`">{{ solicitud.prioridad }}</span></span>
      <span>{{ fecha(solicitud.fechaCreacion) }}</span>
    </div>
  </RouterLink>
</template>
