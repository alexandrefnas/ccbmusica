import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'tcx-table',
  imports: [CommonModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.css',
})
export class TableComponent implements OnInit, OnChanges {
  @Input() dados: any[] | null = [];
  usuario: any;
  @Input() filtros!: Observable<any[]>;
  @Input() mensagemVazio: string = '';
  @Input() mostrarAcoes: boolean = false;

  // linhaSelecionadaId: string | null = null;

  @Input() destacarLinhas: {
    condicao: (item: any) => boolean;
    estiloClasse: string;
  }[] = [];

  @Input() transformacoesColunas: {
    [key: string]: 'uppercase' | 'lowercase' | 'capitalize';
  } = {};

  colunaOrdenada: string | null = null;
  direcaoOrdenacao: 'asc' | 'desc' = 'asc';
  @Input() colunas: string[] = [];
  @Input() colunasLabels!: { [key: string]: string };
  @Input() colunasOrdenaveis: string[] = [];
  @Input() alinhamentosColunasTitulo: {
    [key: string]: 'left' | 'center' | 'right';
  } = {};
  @Input() alinhamentosColunas: { [key: string]: 'left' | 'center' | 'right' } =
    {};
  @Input() tamanhosColunas: {
    [key: string]: {
      width?: string;
      minWidth?: string;
      maxWidth?: string;
    };
  } = {};

  // @Input() acoesTabela: {
  //   label: string;
  //   descricao?: string;
  //   classe?: string;
  //   callback: (item: any) => void;
  //   visivel?: (item: any) => boolean;
  // }[] = [];

@Input() acoesTabela: {
  label: string | ((item: any) => string);
  descricao?: string | ((item: any) => string);
  classe?: string;
  callback: (item: any) => void | Promise<void>;
  visivel?: (item: any) => boolean;
}[] = [];

isFuncao(valor: any): valor is Function {
  return typeof valor === 'function';
}

  constructor(public auth: AuthService) {}

  ngOnInit(): void {
    this.auth.getUsuarioAtualObservable().subscribe((user) => {
      this.usuario = user;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dados'] && this.colunaOrdenada) {
      this.aplicarOrdenacao();
    }
  }

  getEstiloColunaTitulo(coluna: string): any {
    const estilo = this.tamanhosColunas[coluna] || {};
    return {
      width: estilo.width || 'auto',
      'min-width': estilo.minWidth || 'auto',
      'max-width': estilo.maxWidth || 'none',
      'text-align': this.alinhamentosColunasTitulo[coluna] || 'left',
    };
  }

  getEstiloColuna(coluna: string): any {
    const estilo = this.tamanhosColunas[coluna] || {};
    return {
      width: estilo.width || 'auto',
      'min-width': estilo.minWidth || 'auto',
      'max-width': estilo.maxWidth || 'none',
      'text-align': this.alinhamentosColunas[coluna] || 'left',
      'text-transform': this.transformacoesColunas[coluna] || 'none',
    };
  }

  ordenarPor(coluna: string) {
    if (!this.podeOrdenar(coluna)) return;

    if (this.colunaOrdenada === coluna) {
      this.direcaoOrdenacao = this.direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
    } else {
      this.colunaOrdenada = coluna;
      this.direcaoOrdenacao = 'asc';
    }

    this.aplicarOrdenacao();
  }

  podeOrdenar(coluna: string): boolean {
    return (
      this.colunasOrdenaveis.length === 0 ||
      this.colunasOrdenaveis.includes(coluna)
    );
  }

  private aplicarOrdenacao() {
    if (!this.colunaOrdenada) return;

    const coluna = this.colunaOrdenada;
    const direcao = this.direcaoOrdenacao;

    this.dados = [...(this.dados ?? [])].sort((a, b) => {
      let valorA = a[coluna];
      let valorB = b[coluna];

      if (valorA == null) return 1;
      if (valorB == null) return -1;

      valorA = valorA.toString().toLowerCase();
      valorB = valorB.toString().toLowerCase();

      if (valorA < valorB) return direcao === 'asc' ? -1 : 1;
      if (valorA > valorB) return direcao === 'asc' ? 1 : -1;
      return 0;
    });
  }

  getClassesDestaque(item: any): string[] {
    return this.destacarLinhas
      .filter((d) => d.condicao(item))
      .map((d) => d.estiloClasse);
  }
}

// export type AcaoTabela = {
//   label: string | ((item: any) => string);
//   descricao?: string | ((item: any) => string);
//   classe?: string;
//   callback: (item: any) => void | Promise<void>;
//   visivel?: (item: any) => boolean;
// };