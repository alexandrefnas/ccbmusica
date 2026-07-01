import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { combineLatest } from 'rxjs';

import {
  Candidatos,
  Exames,
  FirestoreService,
  GrupoExames,
  Igrejas,
} from '../../../services/firestore.service';

import { SelectComponent } from '../../../component/inputs/select/select.component';
import { TableComponent } from '../../../component/table/table.component';
import {
  listaPeriodo,
  listaPeriodoPratico,
} from '../../../services/select.service';
import { AuthService } from '../../../services/auth.service';

type LinhaRelatorioNotas = {
  nomeAluno: string;
  nomeComum: string;
  categoriaExameLabel: string;
  statusLabel: string;
  [key: string]: any;
};

@Component({
  selector: 'tcx-relatorio-notas-grupo-exame',
  imports: [CommonModule, FormsModule, SelectComponent, TableComponent],
  templateUrl: './relatorio-notas-grupo-exame.component.html',
  styleUrl: './relatorio-notas-grupo-exame.component.css',
})
export class RelatorioNotasGrupoExameComponent implements OnInit {
  constructor(
    private firestoreService: FirestoreService,
    private auth: AuthService,
  ) {}

  filtroStatus = true;

  listaGrupos: { value: string; label: string }[] = [];
  grupos: GrupoExames[] = [];

  idGrupoSelecionado = '';
  grupoSelecionado: GrupoExames | null = null;

  dados: LinhaRelatorioNotas[] = [];

  colunas: string[] = [];
  labels: { [key: string]: string } = {};

  tamanhosColunas: { [key: string]: any } = {};
  alinhamentoTitulo: { [key: string]: 'left' | 'center' | 'right' } = {};
  alinhamentoColuna: { [key: string]: 'left' | 'center' | 'right' } = {};

  ngOnInit(): void {
    this.carregarGrupos();
  }

  get filtroStatusOp(): boolean {
    return (this.filtroStatus = !this.filtroStatus);
  }

  carregarGrupos(): void {
    this.firestoreService.getSemestres().subscribe((grupos) => {
      this.grupos =
        this.auth.usuario?.perfil === 'admin'
          ? grupos
          : grupos.filter((grupo) =>
              this.auth.temAcessoAoRegistro({
                idSetor: grupo.idSetor,
                idComum: grupo.idComum,
              }),
            );

      this.listaGrupos = this.grupos
        .map((g) => ({
          value: g.id!,
          label: `${g.grupoExame} - ${g.descricao}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    });
  }

  aoSelecionarGrupo(idGrupo: string): void {
    this.idGrupoSelecionado = idGrupo;
    this.grupoSelecionado =
      this.grupos.find((g) => g.id === this.idGrupoSelecionado) || null;

    if (!this.grupoSelecionado) {
      this.dados = [];
      return;
    }

    this.montarRelatorio();
    this.filtroStatusOp;
  }

  montarRelatorio(): void {
    combineLatest([
      this.firestoreService.getExames(),
      this.firestoreService.getCandidato(),
      this.firestoreService.getIgrejas(),
    ]).subscribe(([exames, alunos, igrejas]) => {
      const alunosPermitidos =
        this.auth.usuario?.perfil === 'admin'
          ? alunos
          : alunos.filter((aluno) => this.auth.temAcessoAoRegistro(aluno));

      const idsAlunosPermitidos = alunosPermitidos.map((a) => a.id);

      const examesGrupo = exames.filter(
        (e) =>
          e.idGrupoExame === this.idGrupoSelecionado &&
          idsAlunosPermitidos.includes(e.idAluno),
      );

      this.montarColunas(examesGrupo);
      this.dados = this.montarLinhas(examesGrupo, alunosPermitidos, igrejas);
    });
  }

  montarColunas(exames: Exames[]): void {
    const maiorQtdEtapas = Math.max(
      0,
      ...exames.map((e) => e.etapas?.length || 0),
    );

    this.colunas = [
      'nomeAluno',
      'nomeComum',
      'categoriaExameLabel',
      'statusLabel',
    ];

    this.labels = {
      nomeAluno: 'Aluno',
      nomeComum: 'Comum',
      categoriaExameLabel: 'Nível',
      statusLabel: 'Status',
    };

    this.tamanhosColunas = {
      nomeAluno: { width: '26%', minWidth: '220px' },
      nomeComum: { width: '22%', minWidth: '180px' },
      categoriaExameLabel: { width: '16%', minWidth: '140px' },
      statusLabel: { width: '12%', minWidth: '120px' },
    };

    this.alinhamentoTitulo = {
      nomeAluno: 'center',
      nomeComum: 'center',
      categoriaExameLabel: 'center',
      statusLabel: 'center',
    };

    this.alinhamentoColuna = {
      nomeAluno: 'left',
      nomeComum: 'left',
      categoriaExameLabel: 'center',
      statusLabel: 'center',
    };

    for (let i = 1; i <= maiorQtdEtapas; i++) {
      const campo = `etapa${i}`;

      this.colunas.push(campo);
      this.labels[campo] = `Etapa ${i}`;
      this.tamanhosColunas[campo] = { width: '10%', minWidth: '90px' };
      this.alinhamentoTitulo[campo] = 'center';
      this.alinhamentoColuna[campo] = 'center';
    }
  }

  montarLinhas(
    exames: Exames[],
    alunos: Candidatos[],
    igrejas: Igrejas[],
  ): LinhaRelatorioNotas[] {
    return exames
      .map((exame) => {
        const aluno = alunos.find((a) => a.id === exame.idAluno);
        const igreja = igrejas.find((i) => i.id === aluno?.idComum);

        const linha: LinhaRelatorioNotas = {
          nomeAluno:
            aluno?.nomeAluno?.toLocaleUpperCase('pt-BR') ||
            'ALUNO NÃO CADASTRADO',
          nomeComum:
            igreja?.nomeCongregacao?.toLocaleUpperCase('pt-BR') ||
            'COMUM NÃO CADASTRADA',
          categoriaExameLabel: this.buscarCategoriaExame(
            exame.categoriaExame || '',
          ),
          statusLabel: this.formatarStatus(exame.status),
        };

        exame.etapas?.forEach((etapa) => {
          const configEtapa = this.buscarConfigEtapa(exame, etapa.ordem);

          const campo = `etapa${etapa.ordem}`;

          if (
            etapa.nota === null ||
            etapa.nota === undefined ||
            !configEtapa?.notaMaxima
          ) {
            linha[campo] = '-';
            return;
          }

          const percentual =
            (Number(etapa.nota) / Number(configEtapa.notaMaxima)) * 100;

          linha[campo] = `${percentual.toFixed(1)}%`;
        });

        return linha;
      })
      .sort((a, b) => {
        const comum = a.nomeComum.localeCompare(b.nomeComum);
        if (comum !== 0) return comum;

        return a.nomeAluno.localeCompare(b.nomeAluno);
      });
  }

  buscarConfigEtapa(exame: Exames, ordem: number): any | null {
    const grupo = this.grupoSelecionado;

    if (!grupo) return null;

    const periodo = grupo.periodos?.find(
      (p: any) => p.categoriaExame === exame.tipoExame,
    );

    const etapa = periodo?.etapas?.find(
      (e: any) => e.tipo === exame.categoriaExame,
    );

    return etapa?.avaliacao?.find((a: any) => a.ordem === ordem) || null;
  }

  buscarCategoriaExame(value: string): string {
    return (
      listaPeriodo.find((x) => x.value === value)?.label ||
      listaPeriodoPratico.find((x) => x.value === value)?.label ||
      value
    );
  }

  formatarStatus(status: string): string {
    const mapa: any = {
      solicitado: 'SOLICITADO',
      agendado: 'AGENDADO',
      emAndamento: 'EM ANDAMENTO',
      aprovado: 'APROVADO',
      reprovado: 'REPROVADO',
      cancelado: 'CANCELADO',
    };

    return mapa[status] || status;
  }

  async gerarPdf(): Promise<void> {
    if (!this.grupoSelecionado || !this.dados.length) return;

    const { default: jsPDF } = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    const autoTable = autoTableModule.default;

    const doc = new jsPDF('l', 'mm', 'a4');

    const margem = 12;
    let y = 14;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('RELATÓRIO DE NOTAS POR GRUPO DE EXAME', margem, y);

    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Grupo: ${this.grupoSelecionado.grupoExame}`, margem, y);

    y += 5;
    doc.text(`Descrição: ${this.grupoSelecionado.descricao}`, margem, y);

    y += 8;

    autoTable(doc, {
      startY: y,
      head: [this.colunas.map((c) => this.labels[c])],
      body: this.dados.map((item) => this.colunas.map((c) => item[c] || '-')),
      theme: 'grid',
      styles: {
        fontSize: 7,
        halign: 'center',
      },
      headStyles: {
        fillColor: [244, 246, 249],
        textColor: [40, 40, 40],
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'left' },
      },
    });

    const nomeArquivo =
      `relatorio-notas-grupo-exame-${this.grupoSelecionado.grupoExame}`
        .toLowerCase()
        .replaceAll('/', '-')
        .replaceAll(' ', '-');

    doc.save(`${nomeArquivo}.pdf`);
  }
}
