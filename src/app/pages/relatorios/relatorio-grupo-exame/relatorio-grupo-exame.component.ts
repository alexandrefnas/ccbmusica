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
  emAndamento: number;
  aprovado: number;
  recuperacao: number;
  reprovado: number;
  cancelado: number;
  ausente: number;
};

type ResumoNivel = Resumo & {
  categoriaExame: string;
  categoriaExameLabel: string;
};

type EtapaDetalhe = {
  ordem?: number;
  nome?: string;
  nota?: number | null;
  resultado?: string;
  observacaoLancamento?: string;
};

type AlunoDetalhe = {
  idAluno: string;
  nomeAluno: string;
  categoriaExameLabel: string;
  notas: string;
  status: string;
  observacoes: string;
};

type ResumoFaixaEtaria = Resumo & {
  ordem: number;
  faixaEtariaLabel: string;
};

type ResumoIgreja = Resumo & {
  idComum: string;
  nomeComum: string;
  niveis: ResumoNivel[];
  alunos: AlunoDetalhe[];
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
    emAndamento: 0,
    aprovado: 0,
    recuperacao: 0,
    reprovado: 0,
    cancelado: 0,
    ausente: 0,
  };

  resumoPorNivel: ResumoNivel[] = [];
  resumoPorFaixaEtaria: ResumoFaixaEtaria[] = [];
  resumoPorIgreja: ResumoIgreja[] = [];

  igrejaExpandida = '';

  colunasNivel = [
    'categoriaExameLabel',
    'total',
    'emAndamento',
    'aprovado',
    'recuperacao',
    'reprovado',
    'cancelado',
  ];

  colunasFaixaEtaria = [
    'faixaEtariaLabel',
    'total',
    'emAndamento',
    'aprovado',
    'recuperacao',
    'reprovado',
    'cancelado',
  ];

  colunasIgreja = [
    'nomeComum',
    'total',
    'emAndamento',
    'aprovado',
    'recuperacao',
    'reprovado',
    'cancelado',
  ];

  colunasAlunos = [
    'nomeAluno',
    'categoriaExameLabel',
    'notas',
    'status',
    'observacoes',
  ];

  labels = {
    categoriaExameLabel: 'Nível',
    faixaEtariaLabel: 'Faixa de idade',
    nomeComum: 'Comum',
    total: 'Total',
    emAndamento: 'Andam.',
    aprovado: 'Apro.',
    recuperacao: 'Recup.',
    reprovado: 'Repr.',
    cancelado: 'Canc.',
    nomeAluno: 'Aluno',
    notas: 'Notas',
    status: 'Status',
    observacoes: 'Observações',
  };

  tamanhosNivel = {
    categoriaExameLabel: {
      width: '30%',
      minWidth: '140px',
    },
    total: { width: '11%' },
    emAndamento: { width: '12%' },
    aprovado: { width: '11%' },
    recuperacao: { width: '12%' },
    reprovado: { width: '11%' },
    cancelado: { width: '11%' },
  };

  tamanhosFaixaEtaria = {
    faixaEtariaLabel: {
      width: '30%',
      minWidth: '160px',
    },
    total: { width: '11%' },
    emAndamento: { width: '12%' },
    aprovado: { width: '11%' },
    recuperacao: { width: '12%' },
    reprovado: { width: '11%' },
    cancelado: { width: '11%' },
  };

  tamanhosIgreja = {
    nomeComum: {
      width: '30%',
      minWidth: '160px',
    },
    total: { width: '11%' },
    emAndamento: { width: '12%' },
    aprovado: { width: '11%' },
    recuperacao: { width: '12%' },
    reprovado: { width: '11%' },
    cancelado: { width: '11%' },
  };

  tamanhosAlunos = {
    nomeAluno: {
      width: '25%',
      minWidth: '180px',
    },
    categoriaExameLabel: {
      width: '18%',
      minWidth: '130px',
    },
    notas: {
      width: '18%',
      minWidth: '130px',
    },
    status: {
      width: '14%',
      minWidth: '110px',
    },
    observacoes: {
      width: '25%',
      minWidth: '200px',
    },
  };

  alinhamentoTitulo: { [coluna: string]: 'left' | 'center' | 'right' } = {
    categoriaExameLabel: 'center',
    faixaEtariaLabel: 'center',
    nomeComum: 'center',
    total: 'center',
    emAndamento: 'center',
    aprovado: 'center',
    recuperacao: 'center',
    reprovado: 'center',
    cancelado: 'center',
    nomeAluno: 'center',
    notas: 'center',
    status: 'center',
    observacoes: 'center',
  };

  alinhamentoColuna: { [coluna: string]: 'left' | 'center' | 'right' } = {
    categoriaExameLabel: 'left',
    faixaEtariaLabel: 'left',
    nomeComum: 'left',
    total: 'center',
    emAndamento: 'center',
    aprovado: 'center',
    recuperacao: 'center',
    reprovado: 'center',
    cancelado: 'center',
    nomeAluno: 'left',
    notas: 'left',
    status: 'center',
    observacoes: 'left',
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

      // this.resumoGeral = this.contarResumo(examesGrupo);
      // this.resumoPorNivel = this.montarResumoPorNivel(examesGrupo);
      // this.resumoPorIgreja = this.montarResumoPorIgreja(
      //   examesGrupo,
      //   alunosPermitidos,
      //   igrejas,
      // );
      this.resumoGeral = this.contarResumo(examesGrupo);

      this.resumoPorNivel = this.montarResumoPorNivel(examesGrupo);

      this.resumoPorFaixaEtaria = this.montarResumoPorFaixaEtaria(
        examesGrupo,
        alunosPermitidos,
      );

      this.resumoPorIgreja = this.montarResumoPorIgreja(
        examesGrupo,
        alunosPermitidos,
        igrejas,
      );
    });
  }

  // contarResumo(exames: Exames[]): Resumo {
  //   return {
  //     total: exames.length,

  //     ausente: exames.filter((exame) => this.exameEstaAusente(exame)).length,
  //     emAndamento: exames.filter((e) => e.status === 'emAndamento').length,

  //     aprovado: exames.filter((e) => e.status === 'aprovado').length,

  //     recuperacao: exames.filter((e) => e.status === 'recuperacao').length,

  //     reprovado: exames.filter((e) => e.status === 'reprovado').length,

  //     cancelado: exames.filter((e) => e.status === 'cancelado').length,
  //   };
  // }

contarResumo(exames: Exames[]): Resumo {
  const resumo: Resumo = {
    total: 0,
    ausente: 0,
    emAndamento: 0,
    aprovado: 0,
    recuperacao: 0,
    reprovado: 0,
    cancelado: 0,
  };

  exames.forEach((exame) => {
    this.incrementarResumo(resumo, exame);
  });

  return resumo;
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
          ausente: 0,
          emAndamento: 0,
          aprovado: 0,
          recuperacao: 0,
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

  montarResumoPorFaixaEtaria(
    exames: Exames[],
    alunos: Candidatos[],
  ): ResumoFaixaEtaria[] {
    const faixas: ResumoFaixaEtaria[] = [
      {
        ordem: 1,
        faixaEtariaLabel: 'Até 12 anos',
        total: 0,
        ausente: 0,
        emAndamento: 0,
        aprovado: 0,
        recuperacao: 0,
        reprovado: 0,
        cancelado: 0,
      },
      {
        ordem: 2,
        faixaEtariaLabel: '13 a 18 anos',
        total: 0,
        ausente: 0,
        emAndamento: 0,
        aprovado: 0,
        recuperacao: 0,
        reprovado: 0,
        cancelado: 0,
      },
      {
        ordem: 3,
        faixaEtariaLabel: 'Acima de 18 anos',
        total: 0,
        ausente: 0,
        emAndamento: 0,
        aprovado: 0,
        recuperacao: 0,
        reprovado: 0,
        cancelado: 0,
      },
    ];

    exames.forEach((exame) => {
      const aluno = alunos.find((item) => item.id === exame.idAluno);

      if (!aluno?.dataNascimento) {
        return;
      }

      const idade = this.calcularIdade(aluno.dataNascimento);

      if (idade === null) {
        return;
      }

      let faixa: ResumoFaixaEtaria;

      if (idade <= 12) {
        faixa = faixas[0];
      } else if (idade <= 18) {
        faixa = faixas[1];
      } else {
        faixa = faixas[2];
      }

      this.incrementarResumo(faixa, exame);
    });

    return faixas.sort((a, b) => a.ordem - b.ordem);
  }

  calcularIdade(dataNascimento: string): number | null {
    if (!dataNascimento) {
      return null;
    }

    const partes = dataNascimento.split('-');

    if (partes.length !== 3) {
      return null;
    }

    const ano = Number(partes[0]);
    const mes = Number(partes[1]);
    const dia = Number(partes[2]);

    if (
      !Number.isInteger(ano) ||
      !Number.isInteger(mes) ||
      !Number.isInteger(dia)
    ) {
      return null;
    }

    const hoje = new Date();

    let idade = hoje.getFullYear() - ano;

    const aindaNaoFezAniversario =
      hoje.getMonth() + 1 < mes ||
      (hoje.getMonth() + 1 === mes && hoje.getDate() < dia);

    if (aindaNaoFezAniversario) {
      idade--;
    }

    return idade >= 0 ? idade : null;
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
          ausente: 0,
          emAndamento: 0,
          aprovado: 0,
          recuperacao: 0,
          reprovado: 0,
          cancelado: 0,
          niveis: [],
          alunos: [],
        });
      }

      const resumoIgreja = mapa.get(idComum)!;
      this.incrementarResumo(resumoIgreja, exame);

      this.incrementarNivelDaIgreja(resumoIgreja, exame);
      if (aluno) {
        resumoIgreja.alunos.push(this.montarDetalheAluno(aluno, exame));
      }
    });

    mapa.forEach((resumo) => {
      resumo.alunos.sort((a, b) =>
        a.nomeAluno.localeCompare(b.nomeAluno, 'pt-BR'),
      );
    });
    return Array.from(mapa.values()).sort((a, b) =>
      a.nomeComum.localeCompare(b.nomeComum),
    );
  }

  montarDetalheAluno(aluno: Candidatos, exame: Exames): AlunoDetalhe {
    const etapas = this.obterEtapasExame(exame);

    const notas = etapas
      .filter((etapa) => etapa.nota !== null && etapa.nota !== undefined)
      .map((etapa, indice) => {
        const nomeEtapa =
          etapa.nome?.trim() ||
          (etapa.ordem ? `Etapa ${etapa.ordem}` : `Etapa ${indice + 1}`);

        return `${nomeEtapa}: (${etapa.nota})`;
      })
      .join(' | ');

    const observacoes = etapas
      .filter((etapa) => etapa.observacaoLancamento?.trim())
      .map((etapa, indice) => {
        const nomeEtapa =
          etapa.nome?.trim() ||
          (etapa.ordem ? `Etapa ${etapa.ordem}` : `Etapa ${indice + 1}`);

        return `${nomeEtapa}: ${etapa.observacaoLancamento!.trim()}`;
      })
      .join(' | ');

    return {
      idAluno: exame.idAluno,
      nomeAluno:
        aluno.nomeAluno?.toLocaleUpperCase('pt-BR') || 'ALUNO NÃO CADASTRADO',

      categoriaExameLabel: this.buscarCategoriaExame(
        exame.categoriaExame || 'SEM_NIVEL',
      ),

      notas: notas || 'Sem nota lançada',

      // status: this.formatarStatusExame(exame.status),
      status: this.exameEstaAusente(exame)
        ? 'AUSENTE'
        : this.formatarStatusExame(exame.status),
      observacoes: observacoes || '',
    };
  }

  obterEtapasExame(exame: Exames): EtapaDetalhe[] {
    const dadosExame = exame as unknown as {
      etapas?: EtapaDetalhe[];

      periodos?: Array<{
        etapas?: Array<{
          nome?: string;
          ordem?: number;
          nota?: number | null;
          resultado?: string;
          observacaoLancamento?: string;

          avaliacao?: Array<{
            nome?: string;
            ordem?: number;
            nota?: number | null;
            resultado?: string;
            observacaoLancamento?: string;
          }>;
        }>;
      }>;
    };

    if (Array.isArray(dadosExame.etapas)) {
      return dadosExame.etapas;
    }

    if (!Array.isArray(dadosExame.periodos)) {
      return [];
    }

    return dadosExame.periodos.flatMap((periodo): EtapaDetalhe[] =>
      (periodo.etapas ?? []).flatMap((etapa, indiceEtapa): EtapaDetalhe[] => {
        const nomeEtapa = etapa.nome?.trim() || `Etapa ${indiceEtapa + 1}`;

        if (Array.isArray(etapa.avaliacao) && etapa.avaliacao.length > 0) {
          return etapa.avaliacao.map(
            (avaliacao, indiceAvaliacao): EtapaDetalhe => ({
              nome:
                avaliacao.nome?.trim() ||
                nomeEtapa ||
                `Avaliação ${indiceAvaliacao + 1}`,

              ordem: avaliacao.ordem ?? etapa.ordem,

              nota: avaliacao.nota ?? null,

              resultado: avaliacao.resultado ?? '',

              observacaoLancamento: avaliacao.observacaoLancamento ?? '',
            }),
          );
        }

        return [
          {
            nome: nomeEtapa,
            ordem: etapa.ordem,
            nota: etapa.nota ?? null,
            resultado: etapa.resultado ?? '',
            observacaoLancamento: etapa.observacaoLancamento ?? '',
          },
        ];
      }),
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
        ausente: 0,
        emAndamento: 0,
        aprovado: 0,
        recuperacao: 0,
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

    /*
     * Ausente substitui o status original no relatório.
     */
    if (this.exameEstaAusente(exame)) {
      resumo.ausente++;
      return;
    }

    if (exame.status === 'emAndamento') {
      resumo.emAndamento++;
      return;
    }

    if (exame.status === 'aprovado') {
      resumo.aprovado++;
      return;
    }

    if (exame.status === 'recuperacao') {
      resumo.recuperacao++;
      return;
    }

    if (exame.status === 'reprovado') {
      resumo.reprovado++;
      return;
    }

    if (exame.status === 'cancelado') {
      resumo.cancelado++;
    }
  }

  formatarStatusExame(status: string): string {
    const statusFormatado: Record<string, string> = {
      agendado: 'Agendado',
      emAndamento: 'Em andamento',
      aprovado: 'Aprovado',
      recuperacao: 'Recuperação',
      reprovado: 'Reprovado',
      cancelado: 'Cancelado',
    };

    return (
      statusFormatado[status] ||
      status ||
      'Não informado'
    ).toLocaleUpperCase('pt-BR');
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

  // percentualAprovacao(): string {
  //   if (!this.resumoGeral.total) return '0%';

  //   const percentual =
  //     (this.resumoGeral.aprovado / this.resumoGeral.total) * 100;

  //   return `${percentual.toFixed(1)}%`;
  // }

  percentualAprovacao(): string {
    const totalFinalizados =
      this.resumoGeral.aprovado + this.resumoGeral.reprovado;

    if (!totalFinalizados) {
      return '0%';
    }

    const percentual = (this.resumoGeral.aprovado / totalFinalizados) * 100;

    return `${percentual.toFixed(1)}%`;
  }

  calcularPercentual(valor: number, total: number): number {
    if (!total) {
      return 0;
    }

    return Number(((valor / total) * 100).toFixed(1));
  }

  formatarPercentual(valor: number, total: number): string {
    return `${this.calcularPercentual(valor, total).toFixed(1)}%`;
  }

  percentualGeralAprovado(): number {
    return this.calcularPercentual(
      this.resumoGeral.aprovado,
      this.resumoGeral.total,
    );
  }

  percentualGeralReprovado(): number {
    return this.calcularPercentual(
      this.resumoGeral.reprovado,
      this.resumoGeral.total,
    );
  }

  percentualGeralRecuperacao(): number {
    return this.calcularPercentual(
      this.resumoGeral.recuperacao,
      this.resumoGeral.total,
    );
  }

  percentualGeralEmAndamento(): number {
    return this.calcularPercentual(
      this.resumoGeral.emAndamento,
      this.resumoGeral.total,
    );
  }

  percentualGeralCancelado(): number {
    return this.calcularPercentual(
      this.resumoGeral.cancelado,
      this.resumoGeral.total,
    );
  }

  percentualGeralAusente(): number {
    return this.calcularPercentual(
      this.resumoGeral.ausente,
      this.resumoGeral.total,
    );
  }

 exameEstaAusente(exame: Exames): boolean {
  const statusQuePodemVirarAusente = [
    'agendado',
    'emAndamento',
    'recuperacao',
  ];

  if (!statusQuePodemVirarAusente.includes(exame.status)) {
    return false;
  }

  const dataLimite = this.obterDataFaseAtual(exame);

  if (!dataLimite) {
    return false;
  }

  const dataAvaliacao = this.converterDataISO(dataLimite);

  if (!dataAvaliacao) {
    return false;
  }

  const hoje = this.normalizarData(new Date());

  /*
   * Só vira ausente no dia seguinte à avaliação.
   */
  return dataAvaliacao.getTime() < hoje.getTime();
}

obterDataFaseAtual(exame: Exames): string | null {
  if (!this.grupoSelecionado) {
    return null;
  }

  const grupo = this.grupoSelecionado as unknown as {
    periodos?: Array<{
      categoriaExame?: string;
      tipoExame?: string;

      etapas?: Array<{
        tipo?: string;

        avaliacao?: Array<{
          ordem?: number;
          nome?: string;
          dataAvaliacao?: string;
          dataRecuperacao?: string;
          bloqueadaInicialmente?: boolean;
        }>;
      }>;
    }>;
  };

  if (!Array.isArray(grupo.periodos)) {
    return null;
  }

  /*
   * Exemplo:
   * periodo.categoriaExame = "001"
   * exame.tipoExame = "001"
   */
  const periodo = grupo.periodos.find(
    (item) =>
      String(item.categoriaExame ?? '').trim() ===
      String(exame.tipoExame ?? '').trim(),
  );

  if (!periodo) {
    return null;
  }

  /*
   * Exemplo:
   * etapa.tipo = "103"
   * exame.categoriaExame = "103"
   */
  const etapaDaCategoria = periodo.etapas?.find(
    (item) =>
      String(item.tipo ?? '').trim() ===
      String(exame.categoriaExame ?? '').trim(),
  );

  if (!etapaDaCategoria) {
    return null;
  }

  const avaliacoes = etapaDaCategoria.avaliacao ?? [];

  if (!avaliacoes.length) {
    return null;
  }

  /*
   * Exemplo:
   * exame.etapaAtual = 2
   * avaliacao.ordem = 2
   */
  const ordemAtual = Number(exame.etapaAtual || 1);

  const avaliacaoAtual = avaliacoes.find(
    (avaliacao) => Number(avaliacao.ordem) === ordemAtual,
  );

  if (!avaliacaoAtual) {
    return null;
  }

  /*
   * Quando estiver em recuperação, tenta usar a data de recuperação
   * da fase atual.
   *
   * Se ela estiver vazia, usa a data normal da avaliação.
   */
  if (exame.status === 'recuperacao') {
    const dataRecuperacao =
      avaliacaoAtual.dataRecuperacao?.trim();

    if (dataRecuperacao) {
      return dataRecuperacao;
    }
  }

  return avaliacaoAtual.dataAvaliacao?.trim() || null;
}

  converterDataISO(data: string): Date | null {
    if (!data) {
      return null;
    }

    const dataSomente = data.substring(0, 10);
    const partes = dataSomente.split('-');

    if (partes.length !== 3) {
      return null;
    }

    const ano = Number(partes[0]);
    const mes = Number(partes[1]);
    const dia = Number(partes[2]);

    if (
      !Number.isInteger(ano) ||
      !Number.isInteger(mes) ||
      !Number.isInteger(dia)
    ) {
      return null;
    }

    const dataConvertida = new Date(ano, mes - 1, dia);

    if (
      dataConvertida.getFullYear() !== ano ||
      dataConvertida.getMonth() !== mes - 1 ||
      dataConvertida.getDate() !== dia
    ) {
      return null;
    }

    return this.normalizarData(dataConvertida);
  }

  normalizarData(data: Date): Date {
    return new Date(data.getFullYear(), data.getMonth(), data.getDate());
  }

  limparRelatorio(): void {
    this.resumoGeral = {
      total: 0,
      ausente: 0,
      emAndamento: 0,
      aprovado: 0,
      recuperacao: 0,
      reprovado: 0,
      cancelado: 0,
    };

    this.resumoPorNivel = [];
    this.resumoPorFaixaEtaria = [];
    this.resumoPorIgreja = [];
  }

  // async gerarPdf(): Promise<void> {
  //   if (!this.grupoSelecionado) return;

  //   const { default: jsPDF } = await import('jspdf');
  //   const autoTableModule = await import('jspdf-autotable');
  //   const autoTable = autoTableModule.default;

  //   const doc = new jsPDF('p', 'mm', 'a4');
  //   if (!this.grupoSelecionado) return;

  //   const margem = 12;
  //   let y = 14;

  //   doc.setFont('helvetica', 'bold');
  //   doc.setFontSize(14);
  //   doc.text('RELATÓRIO GRUPO EXAME', margem, y);

  //   y += 8;

  //   doc.setFont('helvetica', 'normal');
  //   doc.setFontSize(10);
  //   doc.text(`Grupo: ${this.grupoSelecionado.grupoExame}`, margem, y);

  //   y += 5;
  //   doc.text(`Descrição: ${this.grupoSelecionado.descricao}`, margem, y);

  //   y += 8;

  //   autoTable(doc, {
  //     startY: y,
  //     head: [
  //       [
  //         'Total',
  //         'Aprovados',
  //         'Recuperação',
  //         'Reprovados',
  //         'Cancelados',
  //         '% Aprovação',
  //       ],
  //     ],
  //     body: [
  //       [
  //         this.resumoGeral.total,
  //         this.resumoGeral.aprovado,
  //         this.resumoGeral.recuperacao,
  //         this.resumoGeral.reprovado,
  //         this.resumoGeral.cancelado,
  //         this.percentualAprovacao(),
  //       ],
  //     ],
  //     theme: 'grid',
  //     styles: {
  //       fontSize: 9,
  //       halign: 'center',
  //     },
  //     headStyles: {
  //       fillColor: [244, 246, 249],
  //       textColor: [40, 40, 40],
  //     },
  //   });

  //   y = (doc as any).lastAutoTable.finalY + 10;

  //   autoTable(doc, {
  //     startY: y,
  //     head: [
  //       [
  //         'Resultado por nível',
  //         'Total',
  //         'Aprovados',
  //         'recuperacao',
  //         'Reprovados',
  //         'Cancelados',
  //       ],
  //     ],
  //     body: this.resumoPorNivel.map((item) => [
  //       item.categoriaExameLabel,
  //       item.total,
  //       item.aprovado,
  //       item.recuperacao,
  //       item.reprovado,
  //       item.cancelado,
  //     ]),
  //     theme: 'grid',
  //     styles: {
  //       fontSize: 8,
  //     },
  //     headStyles: {
  //       fillColor: [244, 246, 249],
  //       textColor: [40, 40, 40],
  //     },
  //     columnStyles: {
  //       0: { halign: 'left' },
  //       1: { halign: 'center' },
  //       2: { halign: 'center' },
  //       3: { halign: 'center' },
  //       4: { halign: 'center' },
  //       5: { halign: 'center' },
  //     },
  //   });

  //   y = (doc as any).lastAutoTable.finalY + 10;

  //   autoTable(doc, {
  //     startY: y,
  //     head: [
  //       [
  //         'Resultado por comum',
  //         'Total',
  //         'Aprovados',
  //         'recuperacao',
  //         'Reprovados',
  //         'Cancelados',
  //       ],
  //     ],
  //     body: this.resumoPorIgreja.map((item) => [
  //       item.nomeComum,
  //       item.total,
  //       item.aprovado,
  //       item.recuperacao,
  //       item.reprovado,
  //       item.cancelado,
  //     ]),
  //     theme: 'grid',
  //     styles: {
  //       fontSize: 8,
  //     },
  //     headStyles: {
  //       fillColor: [244, 246, 249],
  //       textColor: [40, 40, 40],
  //     },
  //     columnStyles: {
  //       0: { halign: 'left' },
  //       1: { halign: 'center' },
  //       2: { halign: 'center' },
  //       3: { halign: 'center' },
  //       4: { halign: 'center' },
  //       5: { halign: 'center' },
  //     },
  //   });

  //   this.resumoPorIgreja.forEach((igreja) => {
  //     doc.addPage();

  //     doc.setFont('helvetica', 'bold');
  //     doc.setFontSize(12);
  //     doc.text(`Detalhamento - ${igreja.nomeComum}`, margem, 14);

  //     autoTable(doc, {
  //       startY: 22,
  //       head: [
  //         [
  //           'Nível',
  //           'Total',
  //           'Aprovados',
  //           'Recuperação',
  //           'Reprovados',
  //           'Cancelados',
  //         ],
  //       ],
  //       body: igreja.niveis.map((nivel) => [
  //         nivel.categoriaExameLabel,
  //         nivel.total,
  //         nivel.aprovado,
  //         nivel.recuperacao,
  //         nivel.reprovado,
  //         nivel.cancelado,
  //       ]),
  //       theme: 'grid',
  //       styles: {
  //         fontSize: 8,
  //       },
  //       headStyles: {
  //         fillColor: [244, 246, 249],
  //         textColor: [40, 40, 40],
  //       },
  //       columnStyles: {
  //         0: { halign: 'left' },
  //         1: { halign: 'center' },
  //         2: { halign: 'center' },
  //         3: { halign: 'center' },
  //         4: { halign: 'center' },
  //       },
  //     });
  //   });

  //   const nomeArquivo =
  //     `relatorio-grupo-exame-${this.grupoSelecionado.grupoExame}`
  //       .toLowerCase()
  //       .replaceAll('/', '-')
  //       .replaceAll(' ', '-');

  //   doc.save(`${nomeArquivo}.pdf`);
  // }

  async gerarPdf(): Promise<void> {
    if (!this.grupoSelecionado) {
      return;
    }

    const { default: jsPDF } = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    const autoTable = autoTableModule.default;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const margem = 12;
    let y = 14;

    const corCabecalho: [number, number, number] = [244, 246, 249];
    const corTexto: [number, number, number] = [40, 40, 40];

    const obterFinalTabela = (): number => {
      return (doc as any).lastAutoTable?.finalY ?? y;
    };

    const adicionarTituloSecao = (titulo: string, posicaoY: number): number => {
      let novaPosicaoY = posicaoY;

      if (novaPosicaoY > 275) {
        doc.addPage();
        novaPosicaoY = 14;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(titulo, margem, novaPosicaoY);

      return novaPosicaoY + 4;
    };

    /*
     * Cabeçalho
     */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('RELATÓRIO GRUPO EXAME', margem, y);

    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    doc.text(`Grupo: ${this.grupoSelecionado.grupoExame}`, margem, y);

    y += 5;

    const descricao = `Descrição: ${
      this.grupoSelecionado.descricao || 'Não informada'
    }`;

    const descricaoQuebrada = doc.splitTextToSize(descricao, 185);

    doc.text(descricaoQuebrada, margem, y);

    y += descricaoQuebrada.length * 5 + 4;

    /*
     * Resumo geral
     */
    y = adicionarTituloSecao('Resumo geral', y);

    autoTable(doc, {
      startY: y,

      head: [
        [
          'Total',
          'Em andamento',
          'Aprovados',
          'Recuperação',
          'Reprovados',
          'Cancelados',
          '% Aprovação',
        ],
      ],

      body: [
        [
          this.resumoGeral.total,
          this.resumoGeral.emAndamento,
          this.resumoGeral.aprovado,
          this.resumoGeral.recuperacao,
          this.resumoGeral.reprovado,
          this.resumoGeral.cancelado,
          this.percentualAprovacao(),
        ],
      ],

      theme: 'grid',

      styles: {
        fontSize: 8,
        halign: 'center',
        valign: 'middle',
        cellPadding: 2,
      },

      headStyles: {
        fillColor: corCabecalho,
        textColor: corTexto,
        fontStyle: 'bold',
        halign: 'center',
      },
    });

    /*
     * Resultado por nível
     */
    y = obterFinalTabela() + 9;
    y = adicionarTituloSecao('Resultado por nível', y);

    autoTable(doc, {
      startY: y,

      head: [
        [
          'Nível',
          'Total',
          'Em andamento',
          'Aprovados',
          'Recuperação',
          'Reprovados',
          'Cancelados',
        ],
      ],

      body: this.resumoPorNivel.map((item) => [
        item.categoriaExameLabel,
        item.total,
        item.emAndamento,
        item.aprovado,
        item.recuperacao,
        item.reprovado,
        item.cancelado,
      ]),

      theme: 'grid',

      styles: {
        fontSize: 8,
        valign: 'middle',
        cellPadding: 2,
      },

      headStyles: {
        fillColor: corCabecalho,
        textColor: corTexto,
        fontStyle: 'bold',
        halign: 'center',
      },

      columnStyles: {
        0: {
          halign: 'left',
          cellWidth: 52,
        },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
      },
    });

    /*
     * Resultado por faixa etária
     */
    y = obterFinalTabela() + 9;
    y = adicionarTituloSecao('Resultado por faixa de idade', y);

    autoTable(doc, {
      startY: y,

      head: [
        [
          'Faixa de idade',
          'Total',
          'Em andamento',
          'Aprovados',
          'Recuperação',
          'Reprovados',
          'Cancelados',
        ],
      ],

      body: this.resumoPorFaixaEtaria.map((item) => [
        item.faixaEtariaLabel,
        item.total,
        item.emAndamento,
        item.aprovado,
        item.recuperacao,
        item.reprovado,
        item.cancelado,
      ]),

      theme: 'grid',

      styles: {
        fontSize: 8,
        valign: 'middle',
        cellPadding: 2,
      },

      headStyles: {
        fillColor: corCabecalho,
        textColor: corTexto,
        fontStyle: 'bold',
        halign: 'center',
      },

      columnStyles: {
        0: {
          halign: 'left',
          cellWidth: 52,
        },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
      },
    });

    /*
     * Resultado por comum
     */
    y = obterFinalTabela() + 9;
    y = adicionarTituloSecao('Resultado por comum', y);

    autoTable(doc, {
      startY: y,

      head: [
        [
          'Comum',
          'Total',
          'Em andamento',
          'Aprovados',
          'Recuperação',
          'Reprovados',
          'Cancelados',
        ],
      ],

      body: this.resumoPorIgreja.map((item) => [
        item.nomeComum,
        item.total,
        item.emAndamento,
        item.aprovado,
        item.recuperacao,
        item.reprovado,
        item.cancelado,
      ]),

      theme: 'grid',

      styles: {
        fontSize: 8,
        valign: 'middle',
        cellPadding: 2,
      },

      headStyles: {
        fillColor: corCabecalho,
        textColor: corTexto,
        fontStyle: 'bold',
        halign: 'center',
      },

      columnStyles: {
        0: {
          halign: 'left',
          cellWidth: 52,
        },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
      },
    });

    /*
     * Detalhamento de cada comum
     */
    this.resumoPorIgreja.forEach((igreja) => {
      doc.addPage();

      let yComum = 14;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);

      const tituloComum = `DETALHAMENTO - ${igreja.nomeComum}`;
      const tituloQuebrado = doc.splitTextToSize(tituloComum, 185);

      doc.text(tituloQuebrado, margem, yComum);

      yComum += tituloQuebrado.length * 6 + 2;

      /*
       * Resumo da comum
       */
      autoTable(doc, {
        startY: yComum,

        head: [
          [
            'Total',
            'Em andamento',
            'Aprovados',
            'Recuperação',
            'Reprovados',
            'Cancelados',
          ],
        ],

        body: [
          [
            igreja.total,
            igreja.emAndamento,
            igreja.aprovado,
            igreja.recuperacao,
            igreja.reprovado,
            igreja.cancelado,
          ],
        ],

        theme: 'grid',

        styles: {
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
          cellPadding: 2,
        },

        headStyles: {
          fillColor: corCabecalho,
          textColor: corTexto,
          fontStyle: 'bold',
        },
      });

      yComum = obterFinalTabela() + 9;

      /*
       * Resultado por nível da comum
       */
      yComum = adicionarTituloSecao('Resultado por nível', yComum);

      autoTable(doc, {
        startY: yComum,

        head: [
          [
            'Nível',
            'Total',
            'Em andamento',
            'Aprovados',
            'Recuperação',
            'Reprovados',
            'Cancelados',
          ],
        ],

        body: igreja.niveis.map((nivel) => [
          nivel.categoriaExameLabel,
          nivel.total,
          nivel.emAndamento,
          nivel.aprovado,
          nivel.recuperacao,
          nivel.reprovado,
          nivel.cancelado,
        ]),

        theme: 'grid',

        styles: {
          fontSize: 8,
          valign: 'middle',
          cellPadding: 2,
        },

        headStyles: {
          fillColor: corCabecalho,
          textColor: corTexto,
          fontStyle: 'bold',
          halign: 'center',
        },

        columnStyles: {
          0: {
            halign: 'left',
            cellWidth: 52,
          },
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center' },
          6: { halign: 'center' },
        },
      });

      yComum = obterFinalTabela() + 9;

      /*
       * Alunos e avaliações
       */
      yComum = adicionarTituloSecao('Alunos e avaliações', yComum);

      const alunosTabela =
        igreja.alunos.length > 0
          ? igreja.alunos.map((aluno) => [
              aluno.nomeAluno,
              aluno.categoriaExameLabel,
              aluno.notas || 'Sem nota lançada',
              aluno.status,
              aluno.observacoes || '',
            ])
          : [['Nenhum aluno encontrado nesta comum.', '', '', '', '']];

      autoTable(doc, {
        startY: yComum,

        head: [['Aluno', 'Nível', 'Notas', 'Status', 'Observações']],

        body: alunosTabela,

        theme: 'grid',

        margin: {
          left: margem,
          right: margem,
        },

        styles: {
          fontSize: 7,
          valign: 'top',
          cellPadding: 2,
          overflow: 'linebreak',
        },

        headStyles: {
          fillColor: corCabecalho,
          textColor: corTexto,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
        },

        columnStyles: {
          0: {
            cellWidth: 43,
            halign: 'left',
          },

          1: {
            cellWidth: 31,
            halign: 'left',
          },

          2: {
            cellWidth: 42,
            halign: 'left',
          },

          3: {
            cellWidth: 25,
            halign: 'center',
          },

          4: {
            cellWidth: 45,
            halign: 'left',
          },
        },

        rowPageBreak: 'avoid',

        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            const status = String(data.cell.raw || '');

            if (status === 'APROVADO') {
              data.cell.styles.textColor = [46, 125, 50];
              data.cell.styles.fontStyle = 'bold';
            }

            if (status === 'REPROVADO') {
              data.cell.styles.textColor = [179, 58, 58];
              data.cell.styles.fontStyle = 'bold';
            }

            if (status === 'RECUPERAÇÃO') {
              data.cell.styles.textColor = [190, 120, 20];
              data.cell.styles.fontStyle = 'bold';
            }

            if (status === 'CANCELADO') {
              data.cell.styles.textColor = [110, 110, 110];
              data.cell.styles.fontStyle = 'bold';
            }

            if (status === 'EM ANDAMENTO') {
              data.cell.styles.textColor = [30, 100, 170];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
      });
    });

    /*
     * Numeração das páginas
     */
    const totalPaginas = doc.getNumberOfPages();

    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      doc.setPage(pagina);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100);

      doc.text(`Página ${pagina} de ${totalPaginas}`, 198, 290, {
        align: 'right',
      });
    }

    /*
     * Nome do arquivo
     */
    const nomeArquivo =
      `relatorio-grupo-exame-${this.grupoSelecionado.grupoExame}`
        .toLocaleLowerCase('pt-BR')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

    doc.save(`${nomeArquivo}.pdf`);
  }
}
