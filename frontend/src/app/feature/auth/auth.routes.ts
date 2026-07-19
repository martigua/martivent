import { Routes } from '@angular/router';

export default <Routes>[
  {
    path: 'login',
    loadComponent: () => import('./login').then((module) => module.Login),
    title: 'Connexion · Martigua',
  },
  {
    path: 'signup',
    loadComponent: () => import('./signup').then((module) => module.Signup),
    title: 'Créer un compte · Martigua',
  },
  {
    path: 'password',
    loadComponent: () => import('./password-request').then((module) => module.PasswordRequest),
    title: 'Mot de passe oublié · Martigua',
  },
  {
    path: 'password/reset/:key',
    loadComponent: () => import('./password-reset').then((module) => module.PasswordReset),
    title: 'Nouveau mot de passe · Martigua',
  },
  {
    path: 'email/verify/:key',
    loadComponent: () => import('./verify-email').then((module) => module.VerifyEmail),
    title: "Confirmer l'adresse email · Martigua",
  },
  {
    path: 'provider/callback',
    loadComponent: () => import('./provider-callback').then((module) => module.ProviderCallback),
    title: 'Connexion · Martigua',
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
];
