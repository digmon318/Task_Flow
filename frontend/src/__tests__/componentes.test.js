import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

vi.mock('../api/client', () => ({
  api: { crear: vi.fn(), listar: vi.fn(), detalle: vi.fn(), salud: vi.fn(), metricas: vi.fn() },
}));
import { api } from '../api/client';
import SolicitudForm from '../components/SolicitudForm.vue';
import ProgresoEstado from '../components/ProgresoEstado.vue';
import EstadoBadge from '../components/EstadoBadge.vue';
import StatCard from '../components/StatCard.vue';
import ServicioEstado from '../components/ServicioEstado.vue';

beforeEach(() => vi.clearAllMocks());

describe('SolicitudForm', () => {
  async function llenar(w, { titulo = 'Certificado', descripcion = 'Necesito un certificado', categoria = 'Documento', prioridad = 'Baja' } = {}) {
    await w.find('#titulo').setValue(titulo);
    await w.find('#descripcion').setValue(descripcion);
    if (categoria) await w.find('#categoria').setValue(categoria);
    if (prioridad) await w.find('#prioridad').setValue(prioridad);
  }

  it('valida los campos antes de llamar a la API', async () => {
    const w = mount(SolicitudForm);
    await llenar(w, { titulo: 'ab' });
    await w.find('form').trigger('submit');
    expect(w.find('.form-error').text()).toMatch(/título/i);
    const w2 = mount(SolicitudForm);
    await llenar(w2, { titulo: 'Título válido', categoria: '', prioridad: '' });
    await w2.find('form').trigger('submit');
    expect(w2.find('.form-error').text()).toMatch(/categoría y una prioridad/i);
    expect(api.crear).not.toHaveBeenCalled();
  });

  it('envía los datos limpios y emite "creada"', async () => {
    api.crear.mockResolvedValue({ solicitud: { _id: 'abc' } });
    const w = mount(SolicitudForm);
    await llenar(w, { titulo: '  Certificado  ' });
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(api.crear).toHaveBeenCalledWith({ titulo: 'Certificado', descripcion: 'Necesito un certificado', categoria: 'Documento', prioridad: 'Baja' });
    expect(w.emitted('creada')[0][0]._id).toBe('abc');
    expect(w.find('#titulo').element.value).toBe('');
  });

  it('muestra el error del servidor', async () => {
    api.crear.mockRejectedValue(new Error('Datos inválidos'));
    const w = mount(SolicitudForm);
    await llenar(w);
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(w.find('.form-error').text()).toBe('Datos inválidos');
  });
});

describe('ProgresoEstado', () => {
  const clases = (estado) => mount(ProgresoEstado, { props: { estado } }).findAll('li').map((li) => li.classes().join(''));

  it('marca como hechas las etapas previas y activa la actual', () => {
    expect(clases('PROCESANDO')).toEqual(['done', 'done', 'now', '']);
    expect(clases('RESPONDIDA')).toEqual(['done', 'done', 'done', 'now']);
  });
  it('en ERROR se marca como fallido', () => {
    const w = mount(ProgresoEstado, { props: { estado: 'ERROR' } });
    expect(w.find('ol').classes()).toContain('failed');
  });
});

describe('componentes de presentación', () => {
  it('EstadoBadge muestra la etiqueta en español y la clase del estado', () => {
    const w = mount(EstadoBadge, { props: { estado: 'EN_COLA' } });
    expect(w.text()).toBe('En cola');
    expect(w.classes()).toContain('st-EN_COLA');
  });
  it('StatCard muestra valor y etiqueta', () => {
    const w = mount(StatCard, { props: { valor: 7, etiqueta: 'Total' } });
    expect(w.text()).toContain('7');
    expect(w.text()).toContain('Total');
  });
  it('ServicioEstado distingue en línea y caído', () => {
    expect(mount(ServicioEstado, { props: { nombre: 'Redis', rol: 'Caché', estado: 'ok' } }).text()).toContain('En línea');
    const caido = mount(ServicioEstado, { props: { nombre: 'Redis', rol: 'Caché', estado: 'no disponible' } });
    expect(caido.text()).toContain('Caído');
    expect(caido.classes()).toContain('down');
  });
});
