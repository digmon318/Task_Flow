<script setup>
import { reactive, ref } from 'vue';
import { api } from '../api/client';
import { CATEGORIAS, PRIORIDADES } from '../composables/formato';

const emit = defineEmits(['creada']);
const datos = reactive({ titulo: '', descripcion: '', categoria: '', prioridad: '' });
const error = ref('');
const enviando = ref(false);

function validar() {
  if (datos.titulo.trim().length < 3) return 'El título debe tener al menos 3 caracteres.';
  if (datos.descripcion.trim().length < 5) return 'La descripción debe tener al menos 5 caracteres.';
  if (!datos.categoria || !datos.prioridad) return 'Selecciona una categoría y una prioridad.';
  return '';
}

async function enviar() {
  error.value = validar();
  if (error.value) return;
  enviando.value = true;
  try {
    const r = await api.crear({ ...datos, titulo: datos.titulo.trim(), descripcion: datos.descripcion.trim() });
    Object.assign(datos, { titulo: '', descripcion: '', categoria: '', prioridad: '' });
    emit('creada', r.solicitud);
  } catch (e) {
    error.value = e.message;
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <form novalidate @submit.prevent="enviar">
    <div class="field">
      <label for="titulo">Título</label>
      <input id="titulo" v-model="datos.titulo" maxlength="120" placeholder="Ej. Certificado de estudios" autocomplete="off" required>
    </div>
    <div class="field">
      <label for="descripcion">Descripción</label>
      <textarea id="descripcion" v-model="datos.descripcion" rows="5" maxlength="2000" placeholder="Describe tu solicitud con el mayor detalle posible" required></textarea>
      <span class="counter">{{ datos.descripcion.length }} / 2000</span>
    </div>
    <div class="row">
      <div class="field">
        <label for="categoria">Categoría</label>
        <select id="categoria" v-model="datos.categoria" required>
          <option value="" disabled>Selecciona…</option>
          <option v-for="c in CATEGORIAS" :key="c">{{ c }}</option>
        </select>
      </div>
      <div class="field">
        <label for="prioridad">Prioridad</label>
        <select id="prioridad" v-model="datos.prioridad" required>
          <option value="" disabled>Selecciona…</option>
          <option v-for="p in PRIORIDADES" :key="p">{{ p }}</option>
        </select>
      </div>
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <button class="btn primary" type="submit" :disabled="enviando">{{ enviando ? 'Enviando…' : 'Enviar solicitud' }}</button>
  </form>
</template>
