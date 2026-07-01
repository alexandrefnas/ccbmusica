import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { combineLatest } from 'rxjs';
import {
  Candidatos,
  Exames,
  FirestoreService,
  GrupoExames,
  Igrejas,
} from '../../../services/firestore.service';
import {
  listaPeriodo,
  listaPeriodoPratico,
} from '../../../services/select.service';
import { SelectComponent } from '../../../component/inputs/select/select.component';
import { TableComponent } from '../../../component/table/table.component';
import { AuthService } from '../../../services/auth.service';

type Resumo = {
  total: number;
  aprovado: number;
  reprovado: number;
  cancelado: number;
};

type ResumoNivel = Resumo & {
  categoriaExame: string;
  categoriaExameLabel: string;
};

type ResumoIgreja = Resumo & {
  idComum: string;
  nomeComum: string;
  niveis: ResumoNivel[];
};

@Component({
  selector: 'tcx-relatorio-grupo-exame',
  imports: [CommonModule, FormsModule, SelectComponent, TableComponent],
  templateUrl: './relatorio-grupo-exame.component.html',
  styleUrl: './relatorio-grupo-exame.component.css',
})
export class RelatorioGrupoExameComponent implements OnInit {
  constructor(
    private firestoreService: FirestoreService,
    private auth: AuthService,
  ) {}
  filtroStatus = true;
  listaGrupos: { value: string; label: string }[] = [];
  grupos: GrupoExames[] = [];

  idGrupoSelecionado = '';
  grupoSelecionado: GrupoExames | null = null;

  resumoGeral: Resumo = {
    total: 0,
    aprovado: 0,
    reprovado: 0,
    cancelado: 0,
  };

  resumoPorNivel: ResumoNivel[] = [];
  resumoPorIgreja: ResumoIgreja[] = [];

  igrejaExpandida = '';

  colunasNivel = [
    'categoriaExameLabel',
    'total',
    'aprovado',
    'reprovado',
    'cancelado',
  ];

  colunasIgreja = ['nomeComum', 'total', 'aprovado', 'reprovado', 'cancelado'];

  labels = {
    categoriaExameLabel: 'Nível',
    nomeComum: 'Comum',
    total: 'Total',
    aprovado: 'Apro.',
    reprovado: 'Repr.',
    cancelado: 'Canc.',
  };

  tamanhosNivel = {
    categoriaExameLabel: { width: '40%', minWidth: '120px' },
    total: { width: '15%' },
    aprovado: { width: '15%' },
    reprovado: { width: '15%' },
    cancelado: { width: '15%' },
  };

  tamanhosIgreja = {
    nomeComum: { width: '40%', minWidth: '120px' },
    total: { width: '15%' },
    aprovado: { width: '15%' },
    reprovado: { width: '15%' },
    cancelado: { width: '15%' },
  };

  alinhamentoTitulo: { [coluna: string]: 'left' | 'center' | 'right' } = {
    categoriaExameLabel: 'center',
    nomeComum: 'center',
    total: 'center',
    aprovado: 'center',
    reprovado: 'center',
    cancelado: 'center',
  };

  alinhamentoColuna: { [coluna: string]: 'left' | 'center' | 'right' } = {
    categoriaExameLabel: 'left',
    nomeComum: 'left',
    total: 'center',
    aprovado: 'center',
    reprovado: 'center',
    cancelado: 'center',
  };

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

    this.igrejaExpandida = '';

    if (!this.grupoSelecionado) {
      this.limparRelatorio();
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

      this.resumoGeral = this.contarResumo(examesGrupo);
      this.resumoPorNivel = this.montarResumoPorNivel(examesGrupo);
      this.resumoPorIgreja = this.montarResumoPorIgreja(
        examesGrupo,
        alunosPermitidos,
        igrejas,
      );
    });
  }

  contarResumo(exames: Exames[]): Resumo {
    return {
      total: exames.length,
      aprovado: exames.filter((e) => e.status === 'aprovado').length,
      reprovado: exames.filter((e) => e.status === 'reprovado').length,
      cancelado: exames.filter((e) => e.status === 'cancelado').length,
    };
  }

  montarResumoPorNivel(exames: Exames[]): ResumoNivel[] {
    const mapa = new Map<string, ResumoNivel>();

    exames.forEach((exame) => {
      const chave = exame.categoriaExame || 'SEM_NIVEL';

      if (!mapa.has(chave)) {
        mapa.set(chave, {
          categoriaExame: chave,
          categoriaExameLabel: this.buscarCategoriaExame(chave),
          total: 0,
          aprovado: 0,
          reprovado: 0,
          cancelado: 0,
        });
      }

      this.incrementarResumo(mapa.get(chave)!, exame);
    });

    return Array.from(mapa.values()).sort((a, b) =>
      a.categoriaExameLabel.localeCompare(b.categoriaExameLabel),
    );
  }

  montarResumoPorIgreja(
    exames: Exames[],
    alunos: Candidatos[],
    igrejas: Igrejas[],
  ): ResumoIgreja[] {
    const mapa = new Map<string, ResumoIgreja>();

    exames.forEach((exame) => {
      const aluno = alunos.find((a) => a.id === exame.idAluno);
      const idComum = aluno?.idComum || 'SEM_COMUM';

      const igreja = igrejas.find((i) => i.id === idComum);
      const nomeComum =
        igreja?.nomeCongregacao?.toLocaleUpperCase('pt-BR') ||
        'COMUM NÃO CADASTRADA';

      if (!mapa.has(idComum)) {
        mapa.set(idComum, {
          idComum,
          nomeComum,
          total: 0,
          aprovado: 0,
          reprovado: 0,
          cancelado: 0,
          niveis: [],
        });
      }

      const resumoIgreja = mapa.get(idComum)!;
      this.incrementarResumo(resumoIgreja, exame);

      this.incrementarNivelDaIgreja(resumoIgreja, exame);
    });

    return Array.from(mapa.values()).sort((a, b) =>
      a.nomeComum.localeCompare(b.nomeComum),
    );
  }

  incrementarNivelDaIgreja(resumoIgreja: ResumoIgreja, exame: Exames): void {
    const categoria = exame.categoriaExame || 'SEM_NIVEL';

    let nivel = resumoIgreja.niveis.find((n) => n.categoriaExame === categoria);

    if (!nivel) {
      nivel = {
        categoriaExame: categoria,
        categoriaExameLabel: this.buscarCategoriaExame(categoria),
        total: 0,
        aprovado: 0,
        reprovado: 0,
        cancelado: 0,
      };

      resumoIgreja.niveis.push(nivel);
    }

    this.incrementarResumo(nivel, exame);

    resumoIgreja.niveis.sort((a, b) =>
      a.categoriaExameLabel.localeCompare(b.categoriaExameLabel),
    );
  }

  incrementarResumo(resumo: Resumo, exame: Exames): void {
    resumo.total++;

    if (exame.status === 'aprovado') resumo.aprovado++;
    if (exame.status === 'reprovado') resumo.reprovado++;
    if (exame.status === 'cancelado') resumo.cancelado++;
  }

  alternarIgreja(item: ResumoIgreja): void {
    this.igrejaExpandida =
      this.igrejaExpandida === item.idComum ? '' : item.idComum;
  }

  buscarCategoriaExame(value: string): string {
    return (
      listaPeriodo.find((x) => x.value === value)?.label ||
      listaPeriodoPratico.find((x) => x.value === value)?.label ||
      value
    );
  }

  percentualAprovacao(): string {
    if (!this.resumoGeral.total) return '0%';

    const percentual =
      (this.resumoGeral.aprovado / this.resumoGeral.total) * 100;

    return `${percentual.toFixed(1)}%`;
  }

  limparRelatorio(): void {
    this.resumoGeral = {
      total: 0,
      aprovado: 0,
      reprovado: 0,
      cancelado: 0,
    };

    this.resumoPorNivel = [];
    this.resumoPorIgreja = [];
  }

  async gerarPdf(): Promise<void> {
    if (!this.grupoSelecionado) return;

    const { default: jsPDF } = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    const autoTable = autoTableModule.default;

    const doc = new jsPDF('p', 'mm', 'a4');
    if (!this.grupoSelecionado) return;

    const margem = 12;
    let y = 14;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('RELATÓRIO GRUPO EXAME', margem, y);

    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Grupo: ${this.grupoSelecionado.grupoExame}`, margem, y);

    y += 5;
    doc.text(`Descrição: ${this.grupoSelecionado.descricao}`, margem, y);

    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Total', 'Aprovados', 'Reprovados', 'Cancelados', '% Aprovação']],
      body: [
        [
          this.resumoGeral.total,
          this.resumoGeral.aprovado,
          this.resumoGeral.reprovado,
          this.resumoGeral.cancelado,
          this.percentualAprovacao(),
        ],
      ],
      theme: 'grid',
      styles: {
        fontSize: 9,
        halign: 'center',
      },
      headStyles: {
        fillColor: [244, 246, 249],
        textColor: [40, 40, 40],
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    autoTable(doc, {
      startY: y,
      head: [
        [
          'Resultado por nível',
          'Total',
          'Aprovados',
          'Reprovados',
          'Cancelados',
        ],
      ],
      body: this.resumoPorNivel.map((item) => [
        item.categoriaExameLabel,
        item.total,
        item.aprovado,
        item.reprovado,
        item.cancelado,
      ]),
      theme: 'grid',
      styles: {
        fontSize: 8,
      },
      headStyles: {
        fillColor: [244, 246, 249],
        textColor: [40, 40, 40],
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    autoTable(doc, {
      startY: y,
      head: [
        [
          'Resultado por comum',
          'Total',
          'Aprovados',
          'Reprovados',
          'Cancelados',
        ],
      ],
      body: this.resumoPorIgreja.map((item) => [
        item.nomeComum,
        item.total,
        item.aprovado,
        item.reprovado,
        item.cancelado,
      ]),
      theme: 'grid',
      styles: {
        fontSize: 8,
      },
      headStyles: {
        fillColor: [244, 246, 249],
        textColor: [40, 40, 40],
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
      },
    });

    this.resumoPorIgreja.forEach((igreja) => {
      doc.addPage();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Detalhamento - ${igreja.nomeComum}`, margem, 14);

      autoTable(doc, {
        startY: 22,
        head: [['Nível', 'Total', 'Aprovados', 'Reprovados', 'Cancelados']],
        body: igreja.niveis.map((nivel) => [
          nivel.categoriaExameLabel,
          nivel.total,
          nivel.aprovado,
          nivel.reprovado,
          nivel.cancelado,
        ]),
        theme: 'grid',
        styles: {
          fontSize: 8,
        },
        headStyles: {
          fillColor: [244, 246, 249],
          textColor: [40, 40, 40],
        },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' },
        },
      });
    });

    const nomeArquivo =
      `relatorio-grupo-exame-${this.grupoSelecionado.grupoExame}`
        .toLowerCase()
        .replaceAll('/', '-')
        .replaceAll(' ', '-');

    doc.save(`${nomeArquivo}.pdf`);
  }
}
