import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AlunosComponent } from './pages/alunos/alunos.component';
import { SetorComponent } from './pages/configuracoes/setor/setor.component';
import { IgrejasComponent } from './pages/configuracoes/igrejas/igrejas.component';
import { UsuariosComponent } from './pages/configuracoes/usuarios/usuarios.component';
import { AuthGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';
import { PerfilGuard } from './guards/perfil.guard';
import { LoginComponent } from './pages/login/login.component';
import { PermissaoGuard } from './guards/permissao.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [loginGuard] },
  { path: '', component: HomeComponent, canActivate: [AuthGuard] },
  {
    path: 'setor',
    component: SetorComponent,
    canActivate: [AuthGuard, PermissaoGuard],
    data: { tabela: 'setores', tipo: 'read' },
  },
  {
    path: 'igrejas',
    component: IgrejasComponent,
    canActivate: [AuthGuard, PermissaoGuard],
    data: { tabela: 'setores', tipo: 'read' },
  },
  {
    path: 'usuarios',
    component: UsuariosComponent,
    canActivate: [AuthGuard, PermissaoGuard],
    data: { tabela: 'setores', tipo: 'read' },
  },
  {
    path: 'alunos',
    component: AlunosComponent,
    canActivate: [AuthGuard, PermissaoGuard],
    data: { tabela: 'setores', tipo: 'read' },
  },
  {
    path: 'as',
    loadComponent: () =>
      import('./pages/configuracoes/alterar-senha/alterar-senha.component').then(
        (m) => m.AlterarSenhaComponent,
      ),
    canActivate: [AuthGuard], // Apenas usuários logados
  },
  { path: '**', redirectTo: '' },
];
