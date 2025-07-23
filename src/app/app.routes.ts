import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AlunosComponent } from './pages/alunos/alunos.component';
import { SetorComponent } from './pages/setor/setor.component';
import { IgrejasComponent } from './pages/igrejas/igrejas.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import { LoginComponent } from './pages/login/login.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: HomeComponent , canActivate: [AuthGuard] },
  { path: 'setor', component: SetorComponent, canActivate: [AuthGuard]  },
  { path: 'igrejas', component: IgrejasComponent, canActivate: [AuthGuard]  },
  { path: 'usuarios', component: UsuariosComponent, canActivate: [AuthGuard]  },
  { path: 'alunos', component: AlunosComponent, canActivate: [AuthGuard]  },
  { path: '**', redirectTo: '' },
];
