// Prueba de la interfaz completa (Vue + Router + API real). Solo corre si hay un backend disponible:
//   VITE_API_URL=http://localhost:3000 npm test
import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import App from '../App.vue';
import router from '../router';

const hayBackend = Boolean(import.meta.env.VITE_API_URL);

async function esperar(condicion, ms = 20000) {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    await flushPromises();
    if (condicion()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Tiempo agotado esperando la interfaz');
}

describe.skipIf(!hayBackend)('Interfaz contra el backend real', () => {
  it('muestra el monitor con todos los servicios en línea', async () => {
    router.push('/monitor');
    await router.isReady();
    const w = mount(App, { global: { plugins: [router] } });
    await esperar(() => w.findAll('.servicio.ok').length === 4);
    expect(w.text()).toContain('Solicitudes por estado');
    w.unmount();
  });

  it('crea una solicitud desde el formulario y ve su respuesta automática', async () => {
    router.push('/solicitudes/nueva');
    await router.isReady();
    const w = mount(App, { global: { plugins: [router] } });
    await flushPromises();

    await w.find('#titulo').setValue('Prueba desde la interfaz');
    await w.find('#descripcion').setValue('Es urgente, no puedo iniciar sesión');
    await w.find('#categoria').setValue('Soporte');
    await w.find('#prioridad').setValue('Alta');
    await w.find('form').trigger('submit');

    // Redirige al detalle y, al terminar el Worker, muestra la respuesta
    await esperar(() => router.currentRoute.value.name === 'detalle');
    await esperar(() => w.find('.box.ok').exists());
    expect(w.find('.d-title').text()).toBe('Prueba desde la interfaz');
    expect(w.find('.box.ok').text()).toContain('Mesa de soporte técnico');
    expect(w.text()).toContain('Regla aplicada: SOPORTE+URGENCIA+ACCESO');
    w.unmount();
  });

  it('lista y filtra solicitudes desde la URL', async () => {
    router.push('/solicitudes?estado=RESPONDIDA');
    await router.isReady();
    const w = mount(App, { global: { plugins: [router] } });
    await esperar(() => w.findAll('.item').length > 0);
    expect(w.findAll('.item').every((i) => i.classes().includes('st-RESPONDIDA'))).toBe(true);
    w.unmount();
  });

  it('una solicitud inexistente muestra un mensaje claro', async () => {
    router.push('/solicitudes/000000000000000000000000');
    await router.isReady();
    const w = mount(App, { global: { plugins: [router] } });
    await esperar(() => w.text().includes('Esta solicitud no existe'));
    w.unmount();
  });
});
