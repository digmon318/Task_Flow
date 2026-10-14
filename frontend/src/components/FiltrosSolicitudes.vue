<script setup>
import { ETIQUETA } from '../composables/formato';
const busqueda = defineModel('busqueda', { type: String, default: '' });
const estado = defineModel('estado', { type: String, default: '' });
</script>

<template>
  <div class="filters">
    <input v-model="busqueda" type="search" placeholder="Buscar por título o descripción" aria-label="Buscar solicitudes">
    <select v-model="estado" aria-label="Filtrar por estado">
      <option value="">Todos los estados</option>
      <option v-for="(texto, valor) in ETIQUETA" :key="valor" :value="valor">{{ texto }}</option>
    </select>
  </div>
</template>
