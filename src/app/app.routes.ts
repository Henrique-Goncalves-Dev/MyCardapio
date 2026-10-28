import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'estabelecimento/:slug',
    loadComponent: () => import('./establishment-detail/establishment-detail.page').then((m) => m.EstablishmentDetailPage),
  },
  {
    path: 'gestao/entrar',
    loadComponent: () => import('./restaurant-admin/restaurant-login.page').then((m) => m.RestaurantLoginPage),
  },
  {
    path: 'gestao/cadastro',
    loadComponent: () => import('./restaurant-admin/restaurant-signup.page').then((m) => m.RestaurantSignupPage),
  },
  {
    path: 'gestao',
    loadComponent: () => import('./restaurant-admin/restaurant-dashboard.page').then((m) => m.RestaurantDashboardPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
