import { createRouter, createWebHistory } from 'vue-router';
import InicioView from '../views/InicioView.vue';
import SolicitudesView from '../views/SolicitudesView.vue';
import NuevaSolicitudView from '../views/NuevaSolicitudView.vue';
import DetalleSolicitudView from '../views/DetalleSolicitudView.vue';
import MonitorView from '../views/MonitorView.vue';
import NoEncontradoView from '../views/NoEncontradoView.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'inicio', component: InicioView },
    { path: '/solicitudes', name: 'solicitudes', component: SolicitudesView },
    { path: '/solicitudes/nueva', name: 'nueva', component: NuevaSolicitudView },
    { path: '/solicitudes/:id', name: 'detalle', component: DetalleSolicitudView, props: true },
    { path: '/monitor', name: 'monitor', component: MonitorView },
    { path: '/:resto(.*)*', name: 'no-encontrado', component: NoEncontradoView },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
