import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AppComponent } from '../../app.component';

@Component({
  selector: 'tcx-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
  mostrarGrupo2 = false;
  mostrarGrupo3 = false;
  mostrarGrupo4 = false; // relatorios

  cadastros = [
    {
      label: 'Alunos',
      rota: '/alunos',
      tabela: 'candidatos',
      icon: 'bi bi-person-vcard',
    },
    {
      label: 'Grupo Avaliações',
      rota: '/semestres',
      tabela: 'grupoExames',
      icon: 'bi bi-calendar3',
    },
  ];

  manutencao = [
    {
      label: 'Instrumentos',
      rota: '/instrumento',
      tabela: 'instrumentos',
      icon: 'bi bi-music-note-beamed',
    },
    {
      label: 'Igrejas',
      rota: '/igrejas',
      tabela: 'igrejas',
      icon: 'bi bi-building',
    },
    {
      label: 'Setores',
      rota: '/setor',
      tabela: 'setores',
      icon: 'bi bi-diagram-3',
    },
    {
      label: 'Usuários',
      rota: '/usuarios',
      tabela: 'usuarios',
      icon: 'bi bi-people',
    },
    {
      label: 'Logs',
      rota: '/logs-sistema',
      tabela: 'logs',
      icon: 'bi bi-key',
    },
  ];

  outros = [
    {
      label: 'Alterar Senha',
      rota: '/as',
      tabela: '',
      icon: 'bi bi-key',
    },
  ];

  relatorios = [
    {
      label: 'Grupo Exames',
      rota: '/relatorio-grupo-exame',
      tabela: 'exames',
      icon: 'bi bi-clipboard-data',
    },
    {
      label: 'Notas Exames',
      rota: '/relatorio-notas-grupo-exame',
      tabela: 'exames',
      icon: 'bi bi-clipboard-data',
    },
  ];

  avaliacoes = [
    {
      label: 'Solicitações',
      rota: '/solicitacao',
      tabela: 'solicitacoes',
      icon: 'bi bi-clipboard-check',
    },
    {
      label: 'Exames',
      rota: '/exames',
      tabela: 'exames',
      icon: 'bi bi-journal-text',
    },
  ];

  constructor(
    private router: Router,
    private auth: AuthService,
    private appcomp: AppComponent,
  ) {}

 public menuHome(): void {
    this.mostrarGrupo = false;
    this.mostrarGrupo1 = false;
    this.mostrarGrupo2 = false;
    this.mostrarGrupo3 = false;
    this.mostrarGrupo4 = false;
    this.abrirRota('/home');
  }

  menuCadastro(): void {
    this.mostrarGrupo = !this.mostrarGrupo;
    this.mostrarGrupo1 = false;
    this.mostrarGrupo2 = false;
    this.mostrarGrupo3 = false;
    this.mostrarGrupo4 = false;
  }

  menuManutencao(): void {
    this.mostrarGrupo = false;
    this.mostrarGrupo1 = !this.mostrarGrupo1;
    this.mostrarGrupo2 = false;
    this.mostrarGrupo3 = false;
    this.mostrarGrupo4 = false;
  }

  menuOutros(): void {
    this.mostrarGrupo = false;
    this.mostrarGrupo1 = false;
    this.mostrarGrupo2 = false;
    this.mostrarGrupo3 = !this.mostrarGrupo3;
    this.mostrarGrupo4 = false;
  }

  menuRelatorios(): void {
    this.mostrarGrupo = false;
    this.mostrarGrupo1 = false;
    this.mostrarGrupo2 = false;
    this.mostrarGrupo3 = false;
    this.mostrarGrupo4 = !this.mostrarGrupo4;
  }

  menuTestes(): void {
    this.mostrarGrupo = false;
    this.mostrarGrupo1 = false;
    this.mostrarGrupo2 = !this.mostrarGrupo2;
    this.mostrarGrupo3 = false;
    this.mostrarGrupo4 = false;
  }

  abrirRota(rota: string): void {
    this.router.navigateByUrl(rota);
    this.fecharMenuMobile();

    // this.appcomp.alternarMenu = !this.appcomp.menuOculto;
  }

  fecharMenuMobile(): void {
    this.appcomp.fecharMenu();
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

  get relatorioFiltrados() {
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

  get outrosGrupos() {
    if (!this.auth.usuario) return [];

    return this.outros.filter((p) =>
      this.auth.temPermissao(p.tabela as any, 'read'),
    );
  }
}
