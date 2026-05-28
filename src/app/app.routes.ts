import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';
import { PermissaoGuard } from './guards/permissao.guard';
import { AuthResolver } from './guards/auth.resolver';

export const routes: Routes = [
  {
    path: '',
    resolve: { authReady: AuthResolver }, // resolver na raiz
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/login/login.component').then((m) => m.LoginComponent),
        canActivate: [loginGuard],
      },
      {
        path: 'home',
        loadComponent: () =>
          import('./pages/home/home.component').then((m) => m.HomeComponent),
        canActivate: [AuthGuard],
      },
      {
        path: 'setor',
        loadComponent: () =>
          import('./pages/configuracoes/setor/setor.component').then(
            (m) => m.SetorComponent,
          ),
        canActivate: [PermissaoGuard],
        data: { tabela: 'setores', tipo: 'read' },
      },
      {
        path: 'instrumento',
        loadComponent: () =>
          import('./pages/configuracoes/instrumentos/instrumentos.component').then(
            (m) => m.InstrumentosComponent,
          ),
        canActivate: [PermissaoGuard],
        data: { tabela: 'instrumentos', tipo: 'read' },
      },
      {
        path: 'igrejas',
        loadComponent: () =>
          import('./pages/configuracoes/igrejas/igrejas.component').then(
            (m) => m.IgrejasComponent,
          ),
        canActivate: [PermissaoGuard],
        data: { tabela: 'igrejas', tipo: 'read' },
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/configuracoes/usuarios/usuarios.component').then(
            (m) => m.UsuariosComponent,
          ),
        canActivate: [PermissaoGuard],
        data: { tabela: 'usuarios', tipo: 'read' },
      },
      {
        path: 'alunos',
        loadComponent: () =>
          import('./pages/cadastros/alunos/alunos.component').then(
            (m) => m.AlunosComponent,
          ),
        canActivate: [PermissaoGuard],
        data: { tabela: 'candidatos', tipo: 'read' },
      },
      {
        path: 'exames',
        loadComponent: () =>
          import('./pages/exames/exames/exames.component').then(
            (m) => m.ExamesComponent,
          ),
        canActivate: [PermissaoGuard],
        data: { tabela: 'exames', tipo: 'read' },
      },
      {
        path: 'solicitacao',
        loadComponent: () =>
          import('./pages/exames/solicitacao/solicitacao.component').then(
            (m) => m.SolicitacaoComponent,
          ),
        canActivate: [PermissaoGuard],
        data: { tabela: 'solicitacoes', tipo: 'read' },
      },
      {
        path: 'as',
        loadComponent: () =>
          import('./pages/configuracoes/alterar-senha/alterar-senha.component').then(
            (m) => m.AlterarSenhaComponent,
          ),
        canActivate: [AuthGuard],
      },
      {
        path: 'sem-permissao',
        loadComponent: () =>
          import('./pages/sem-permissao/sem-permissao.component').then(
            (m) => m.SemPermissaoComponent,
          ),
      },
      { path: '**', redirectTo: 'login' },
    ],
  },
];


  // {
  //   path: '',
  //   redirectTo: 'home',
  //   pathMatch: 'full',
  // },
  // {
  //   path: 'login',
  //   loadComponent: () =>
  //     import('./pages/login/login.component').then((m) => m.LoginComponent),
  //   canActivate: [loginGuard], // bloqueia login se já estiver autenticado
  // },
  // {
  //   path: 'home',
  //   loadComponent: () =>
  //     import('./pages/home/home.component').then((m) => m.HomeComponent),
  //   canActivate: [AuthGuard], // exige login
  // },
  // {
  //   path: '**',
  //   redirectTo: 'home', // rota inválida leva para home
  // },


// import { Routes } from '@angular/router';
// import { AuthGuard } from './guards/auth.guard';
// import { loginGuard } from './guards/login.guard';
// import { PermissaoGuard } from './guards/permissao.guard';

// export const routes: Routes = [
//   // { path: '', redirectTo: 'login', pathMatch: 'full' },
//   {
//     path: '',
//     redirectTo: 'home',
//     pathMatch: 'full',
//   },
//   {
//     path: 'login',
//     loadComponent: () =>
//       import('./pages/login/login.component').then((m) => m.LoginComponent),
//     canActivate: [loginGuard],
//   },

//   {
//     path: 'home',
//     loadComponent: () =>
//       import('./pages/home/home.component').then((m) => m.HomeComponent),
//     canActivate: [AuthGuard],
//   },

//   {
//     path: 'setor',
//     loadComponent: () =>
//       import('./pages/configuracoes/setor/setor.component').then(
//         (m) => m.SetorComponent,
//       ),
//     canActivate: [PermissaoGuard],
//     data: { tabela: 'setores', tipo: 'read' },
//   },

//   {
//     path: 'instrumento',
//     loadComponent: () =>
//       import('./pages/configuracoes/instrumentos/instrumentos.component').then(
//         (m) => m.InstrumentosComponent,
//       ),
//     canActivate: [PermissaoGuard],
//     data: { tabela: 'instrumentos', tipo: 'read' },
//   },

//   {
//     path: 'igrejas',
//     loadComponent: () =>
//       import('./pages/configuracoes/igrejas/igrejas.component').then(
//         (m) => m.IgrejasComponent,
//       ),
//     canActivate: [PermissaoGuard],
//     data: { tabela: 'igrejas', tipo: 'read' },
//   },

//   {
//     path: 'usuarios',
//     loadComponent: () =>
//       import('./pages/configuracoes/usuarios/usuarios.component').then(
//         (m) => m.UsuariosComponent,
//       ),
//     canActivate: [PermissaoGuard],
//     data: { tabela: 'usuarios', tipo: 'read' },
//   },

//   {
//     path: 'alunos',
//     loadComponent: () =>
//       import('./pages/cadastros/alunos/alunos.component').then(
//         (m) => m.AlunosComponent,
//       ),
//     canActivate: [PermissaoGuard],
//     data: { tabela: 'candidatos', tipo: 'read' },
//   },

//   {
//     path: 'exames',
//     loadComponent: () =>
//       import('./pages/exames/exames/exames.component').then(
//         (m) => m.ExamesComponent,
//       ),
//     canActivate: [PermissaoGuard],
//     data: { tabela: 'exames', tipo: 'read' },
//   },

//   {
//     path: 'solicitacao',
//     loadComponent: () =>
//       import('./pages/exames/solicitacao/solicitacao.component').then(
//         (m) => m.SolicitacaoComponent,
//       ),
//     canActivate: [PermissaoGuard],
//     data: { tabela: 'exames', tipo: 'create' },
//   },

//   {
//     path: 'as',
//     loadComponent: () =>
//       import('./pages/configuracoes/alterar-senha/alterar-senha.component').then(
//         (m) => m.AlterarSenhaComponent,
//       ),
//     canActivate: [AuthGuard],
//   },

//   {
//     path: 'sem-permissao',
//     loadComponent: () =>
//       import('./pages/sem-permissao/sem-permissao.component').then(
//         (m) => m.SemPermissaoComponent,
//       ),
//   },
//   // { path: '**', redirectTo: 'login' },
// {
//   path: '**',
//   canActivate: [AuthGuard],
//   loadComponent: () =>
//     import('./pages/home/home.component').then((m) => m.HomeComponent),
// }

// ];
