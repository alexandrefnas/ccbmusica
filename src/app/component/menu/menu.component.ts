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
  mostrarGrupo1 = false;
  mostrarGrupo2 = true;

  cadastros = [
    { label: 'Usuários', rota: '/usuarios', nivelLiberacao: '' },
    { label: 'Alunos', rota: '/alunos', nivelLiberacao: '' },
    { label: 'Igrejas', rota: '/igrejas', nivelLiberacao: '' },
    { label: 'Setores', rota: '/setor', nivelLiberacao: '' },
    // { label: 'Painel de Controle', rota: '/', nivelLiberacao: '' },
    // { label: '', rota: '', nivelLiberacao: '' },
  ];

  avaliacoes = [
    { label: 'Solicitação', rota: '/setores' },
    { label: 'Testes', rota: '/usuarios' },
    { label: 'Notas', rota: '/igrejas' },
  ];

  constructor(private router: Router) {}

  menuHome(): void {
    this.mostrarGrupo1 = false;
    this.mostrarGrupo2 = false;
    this.abrirRota('/');
  }

  menuCadastro(): void {
    this.mostrarGrupo1 = !this.mostrarGrupo1;
    this.mostrarGrupo2 = false;
  }

  menuTestes(): void {
    this.mostrarGrupo2 = !this.mostrarGrupo2;
    this.mostrarGrupo1 = false;
  }

  abrirRota(rota: string): void {
    this.router.navigateByUrl(rota);
  }
}
