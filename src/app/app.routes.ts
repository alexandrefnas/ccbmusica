import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AlunosComponent } from './pages/alunos/alunos.component';
import { SetorComponent } from './pages/setor/setor.component';
import { IgrejasComponent } from './pages/igrejas/igrejas.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';

export const routes: Routes = [
 { path: '', component: HomeComponent },
 { path: 'setor', component: SetorComponent },
 { path: 'igrejas', component: IgrejasComponent },
 { path: 'usuarios', component: UsuariosComponent },
 { path: 'alunos', component: AlunosComponent },
  { path: '**', redirectTo: '' },
];
