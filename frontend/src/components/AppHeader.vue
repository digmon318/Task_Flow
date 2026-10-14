<script setup>
import HealthIndicator from './HealthIndicator.vue';

const enlaces = [
  { a: '/', texto: 'Inicio' },
  { a: '/solicitudes', texto: 'Solicitudes' },
  { a: '/solicitudes/nueva', texto: 'Nueva solicitud' },
  { a: '/monitor', texto: 'Monitor' },
];
</script>

<template>
  <header class="topbar">
    <div class="topbar-in">
      <RouterLink to="/" class="brand" aria-label="TaskFlow, ir al inicio">
        <span class="logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10" /></svg>
        </span>
        <span>TaskFlow</span>
      </RouterLink>
      <nav class="nav" aria-label="Principal">
        <RouterLink v-for="e in enlaces" :key="e.a" :to="e.a" class="nav-link" exact-active-class="activo">{{ e.texto }}</RouterLink>
      </nav>
      <HealthIndicator />
    </div>
  </header>
</template>
