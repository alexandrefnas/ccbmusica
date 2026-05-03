import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AppComponent } from '../../app.component';

@Component({
  selector: 'tcx-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css',
  animations: [
    trigger('expandCollapse', [
      state('void', style({ height: '0px', opacity: 0 })),
      state('*', style({ height: '*', opacity: 1 })),
      transition(':enter', [
        style({ height: '0px', opacity: 0 }),
        animate('200ms ease-out'),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ height: '0px', opacity: 0 })),
      ]),
    ]),
  ],
})
export class MenuComponent {
  mostrarGrupo = false;
  mostrarGrupo1 = false;
  mostrarGrupo2 = true;

  cadastros = [{ label: 'Alunos', rota: '/alunos', tabela: 'candidatos' }];

  // avaliacoes = [
  //   { label: 'Solicitação', rota: '/setores' },
  //   { label: 'Testes', rota: '/usuarios' },
  //   { label: 'Notas', rota: '/igrejas' },
  // ];

  manutencao = [
    { label: 'Alterar Senha', rota: '/as', tabela: 'usuarios' },
    // { label: 'Alunos', rota: '/alunos', tabela: 'candidatos' },
    { label: 'Instrumentos', rota: '/instrumento', tabela: 'instrumentos' },
    { label: 'Igrejas', rota: '/igrejas', tabela: 'igrejas' },
    { label: 'Setores', rota: '/setor', tabela: 'setores' },
    { label: 'Usuários', rota: '/usuarios', tabela: 'usuarios' },
  ];

  avaliacoes = [
    { label: 'Solicitação', rota: '/setores', tabela: '' },
    { label: 'Testes', rota: '/usuarios', tabela: '' },
    { label: 'Notas', rota: '/igrejas', tabela: '' },
  ];

  constructor(
    private router: Router,
    private auth: AuthService,
    private appcomp: AppComponent
  ) {}

  menuHome(): void {
    this.mostrarGrupo = false;
    this.mostrarGrupo1 = false;
    this.mostrarGrupo2 = false;
    this.abrirRota('/');
  }

  menuCadastro(): void {
    this.mostrarGrupo = !this.mostrarGrupo;
    this.mostrarGrupo1 = false;
    this.mostrarGrupo2 = false;
  }

  menuManutencao(): void {
    this.mostrarGrupo = false;
    this.mostrarGrupo1 = !this.mostrarGrupo1;
    this.mostrarGrupo2 = false;
  }

  menuTestes(): void {
    this.mostrarGrupo = false;
    this.mostrarGrupo2 = !this.mostrarGrupo2;
    this.mostrarGrupo1 = false;
  }

  abrirRota(rota: string): void {
    this.router.navigateByUrl(rota);
    this.appcomp.fecharMenu();

    // this.appcomp.alternarMenu = !this.appcomp.menuOculto;
  }

  get cadastroFiltrados() {
    if (!this.auth.usuario) return [];

    return this.cadastros.filter((p) =>
      this.auth.temPermissao(p.tabela as any, 'read'),
    );
  }

  get manutencaoFiltrados() {
    if (!this.auth.usuario) return [];

    return this.manutencao.filter((p) =>
      this.auth.temPermissao(p.tabela as any, 'read'),
    );
  }

  get avaliacoesFiltradas() {
    if (!this.auth.usuario) return [];

    return this.avaliacoes.filter((p) =>
      this.auth.temPermissao(p.tabela as any, 'read'),
    );
  }
}
