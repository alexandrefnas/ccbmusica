import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AlunosComponent } from './pages/alunos/alunos.component';
import { SetorComponent } from './pages/setor/setor.component';
import { IgrejasComponent } from './pages/igrejas/igrejas.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import { LoginComponent } from './pages/login/login.component';
import { AuthGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';
import { PerfilGuard } from './guards/perfil.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [loginGuard] },
  { path: '', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'setor', component: SetorComponent, canActivate: [PerfilGuard] }, // 🔒 Só admins
  { path: 'igrejas', component: IgrejasComponent, canActivate: [AuthGuard] },
  { path: 'usuarios', component: UsuariosComponent, canActivate: [AuthGuard] },
  { path: 'alunos', component: AlunosComponent, canActivate: [AuthGuard] },
  {
    path: 'as',
    loadComponent: () =>
      import('./pages/alterar-senha/alterar-senha.component').then(
        (m) => m.AlterarSenhaComponent
      ),
    canActivate: [AuthGuard], // Apenas usuários logados
  },
  { path: '**', redirectTo: '' },
];
