import { Routes } from '@angular/router';

import { Account } from './account';

export default <Routes>[
  {
    path: '',
    component: Account,
    title: 'Mon compte · Martigua',
  },
  {
    path: 'email',
    loadComponent: () => import('./account-email').then((module) => module.AccountEmail),
    title: 'Mes adresses email · Martigua',
  },
  {
    path: 'password',
    loadComponent: () => import('./account-password').then((module) => module.AccountPassword),
    title: 'Changer mon mot de passe · Martigua',
  },
];
