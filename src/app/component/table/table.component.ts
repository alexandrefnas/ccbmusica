import { Component, Input } from '@angular/core';
import { converterISOParaBR } from '../../../shared/shared.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'tcx-table',
  imports: [CommonModule, RouterModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.css',
})
export class TableComponent {
  @Input() colunas: string[] = [];
  @Input() dados: any[] = [];
  @Input() tamanhosColunas: {
    [key: string]: {
      width?: string;
      minWidth?: string;
      maxWidth?: string;
    };
  } = {};
  @Input() numColuna: number = 0;
  @Input() alinhamentosColunas: { [key: string]: 'left' | 'center' | 'right' } =
    {};
  @Input() alinhamentosColunasTitulo: {
    [key: string]: 'left' | 'center' | 'right';
  } = {};
  @Input() formatoColunas: {
    [key: string]: 'texto' | 'moeda' | 'data' | 'cnpj';
  } = {};
  @Input() colunasLabels!: { [key: string]: string };
  @Input() linksDinamicos: { value: string; url: string }[] = [];
  @Input() destacarLinhas: {
    condicao: (item: any) => boolean;
    estiloClasse: string;
  }[] = [];
  @Input() acoesTabela: {
    label: string;
    descricao?: string;
    classe?: string;
    callback: (item: any) => void;
    visivel?: (item: any) => boolean;
  }[] = [];
  @Input() mostrarAcoes: boolean = false;

  usuario: any;
  // constructor(public auth: AuthService) {}

  // ngOnInit(): void {
  //   this.auth.getUsuarioAtualObservable().subscribe((user) => {
  //     this.usuario = user;
  //   });
  // }

  getEstiloColunaTitulo(coluna: string): any {
    return {
      ...(this.tamanhosColunas[coluna] || {}),
      'text-align': this.alinhamentosColunasTitulo[coluna] || 'left',
    };
  }

  getEstiloColuna(coluna: string): any {
    return {
      ...(this.tamanhosColunas[coluna] || {}),
      'text-align': this.alinhamentosColunas[coluna] || 'left',
    };
  }

  getClassesDestaque(item: any): string[] {
    return this.destacarLinhas
      .filter((d) => d.condicao(item))
      .map((d) => d.estiloClasse);
  }

  isLink(valor: string): { value: string; url: string } | null {
    return this.linksDinamicos.find((link) => link.value === valor) || null;
  }

  formatarValor(valor: any, formato: string): string {
    switch (formato) {
      case 'moeda':
        if (!valor || valor === 0) return '';
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(valor);

      case 'numero':
        if (valor === null || valor === undefined) return '';
        return new Intl.NumberFormat('pt-BR', {
          maximumFractionDigits: 0,
        }).format(valor);

      case 'decimal':
        if (valor === null || valor === undefined) return '';
        return new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(valor);

      case 'porcentagem':
        if (valor === null || valor === undefined) return '';
        return `${new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(valor)}%`;

      case 'cnpj':
        if (!valor) return '';
        const cnpj = valor.toString().replace(/\D/g, '');
        if (cnpj.length === 14) {
          return cnpj.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
            '$1.$2.$3/$4-$5'
          );
        }
        return valor;

      case 'cpf':
        if (!valor) return '';
        const cpf = valor.toString().replace(/\D/g, '');
        if (cpf.length === 11) {
          return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        return valor;

      case 'data':
        if (!valor) return '';
        if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
          return converterISOParaBR(valor);
        }
        if (valor instanceof Date) {
          return new Intl.DateTimeFormat('pt-BR').format(valor);
        }
        if (valor?.seconds) {
          return new Intl.DateTimeFormat('pt-BR').format(
            new Date(valor.seconds * 1000)
          );
        }
        return valor;

      case 'texto':
      default:
        return valor != null ? valor.toString() : '';
    }
  }

  abrirVisualizacao(item: any) {
    // opcional, pode emitir para o pai
  }
}
