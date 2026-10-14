<script setup>
import AppHeader from './components/AppHeader.vue';
import ToastHost from './components/ToastHost.vue';
</script>

<template>
  <AppHeader />
  <main class="page">
    <RouterView />
  </main>
  <ToastHost />
</template>
