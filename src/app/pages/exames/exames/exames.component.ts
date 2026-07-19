import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { combineLatest } from 'rxjs';

import { ModalComponent } from '../../../modal/modal/modal.component';
import { ButtonComponent } from '../../../component/button/button.component';
import { SelectComponent } from '../../../component/inputs/select/select.component';
import { TextComponent } from '../../../component/inputs/text/text.component';
// import { DataComponent } from '../../../component/inputs/data/data.component';
// import { TableComponent } from '../../../component/table/table.component';

import {
  AvaliacaoCriterio,
  Candidatos,
  Criterio,
  Exames,
  FirestoreService,
  GrupoExames,
  Instrumentos,
  LicaoAvaliada,
} from '../../../services/firestore.service';
import { AuthService, PermissoesCRUD } from '../../../services/auth.service';
import {
  converterISOParaBR,
  formatarDataString,
} from '../../../../shared/shared.service';
import {
  listaCategorias,
  listaPeriodo,
  listaPeriodoPratico,
  listaStatusFiltro,
  listaTipoExame,
  upper,
} from '../../../services/select.service';
// import { DecimalComponent } from '../../../component/inputs/decimal/decimal.component';
import { TableComponentSelect } from '../../../component/table-select/table.component';
import { AlertService } from '../../../services/alert.service';
import { MultiSelectComponent } from '../../../component/inputs/multi-select/multi-select';
import { RespostaLida, LeitorGabaritoComponent } from '../../../component/leitor-gabarito/leitor-gabarito.component';

// type ExameTabela = Exames & {
//   idadeAluno?: string;
//   instrumentoAluno?: string;
//   afinacaoAluno?: string;
// };

type ExameTabela = Exames & {
  nomeAluno?: string;
  comum?: string;
  idComum?: string;
  idadeAluno?: string;
  instrumentoAluno?: string;
  afinacaoAluno?: string;

  tipoExameLabel?: string;
  categoriaExameLabel?: string;
  statusLabel?: string;
  etapaAtualLabel?: string;

  dataSolicitacao?: string;
  dataAgendada?: string;
};

@Component({
  selector: 'tcx-exames',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ModalComponent,
    ButtonComponent,
    SelectComponent,
    TextComponent,
    // DataComponent,
    // TableComponent,
    // DecimalComponent,
    TableComponentSelect,
    MultiSelectComponent,
    LeitorGabaritoComponent
],
  templateUrl: './exames.component.html',
  styleUrl: './exames.component.css',
})
export class ExamesComponent implements OnInit {
  constructor(
    private fb: FormBuilder,
    private firestoreService: FirestoreService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
    private alertService: AlertService,
  ) {
    this.notaForm = this.fb.group({
      nota: [''],
      professorLancamento: ['', Validators.required],
      observacaoLancamento: [''],
    });

    this.dadosForms = this.fb.group({
      idAluno: ['', Validators.required],
      tipoExame: ['', Validators.required],
      categoriaExame: ['', Validators.required],
      observacao: [''],
    });

    this.cancelamentoForm = this.fb.group({
      motivoCancelamento: ['', Validators.required],
    });

    // this.agendamentoEtapaForm = this.fb.group({
    //   dataAgendada: ['', Validators.required],
    // });

    this.aceiteForm = this.fb.group({
      idGrupoExame: ['', Validators.required],
    });
  }

  //S9974cav2sz6Ne2M6UjB
  isMobile = window.innerWidth <= 576;
  converterISOParaBR = converterISOParaBR;

  title = 'EXAMES';
  mostrarModal = false;
  mostrarModalAceite = false;
  tabelaVisivel = true;

  somaPontosFicha = '';
  pontuacaoFinalFicha = '';
  resultadoFicha = '';

  examesSelecionados: Exames[] = [];
  mostrarModalAceiteLote = false;

  dadosForms: FormGroup;
  dadosParaEditar: Exames | null = null;
  exameAceite: Exames | null = null;
  filtroStatus = false;
  pesquisa = '';

  liberaCriar = false;
  liberaEditar = false;
  liberaDeletar = false;

  mostrarModalNota = false;
  exameSelecionado: ExameTabela | null = null;
  etapaSelecionada: any | null = null;
  configEtapaSelecionada: any | null = null;
  notaForm: FormGroup;

  mostrarModalCancelamento = false;
  exameCancelamento: Exames | null = null;

  cancelamentoForm: FormGroup;

  mostrarModalAgendamentoEtapa = false;
  exameAgendamentoEtapa: Exames | null = null;
  etapaAgendamento: any | null = null;
  aceiteForm: FormGroup;
  // agendamentoEtapaForm: FormGroup;

  listaAlunos: { value: string; label: string }[] = [];
  listaGrupoExames: { value: string; label: string }[] = [];
  listaGrupoExamesFiltrada: { value: string; label: string }[] = [];
  listaInstrumentos: Instrumentos[] = [];

  gruposExames: GrupoExames[] = [];

  paginaAtual = 1;
  itensPorPagina = 20;

  statusFiltro = 'TODOS';
  statusCategorias = 'TODOS';

  listaStatusFiltro = listaStatusFiltro;
  listaCategorias = listaCategorias;

  comunsSelecionadas: string[] = [];
  listaSelect: { value: string; label: string }[] = [];
  // dadosTodos: any[] = [];

  dadosTodos: ExameTabela[] = [];
  dados: ExameTabela[] = [];

  listaTipoExame = listaTipoExame;
  listaPeriodo = listaPeriodo;
  listaPratico = listaPeriodoPratico;

  abrirModalLeitor = false;
  criteriosCadastrados: Criterio[] = [];

  criteriosDaFicha: Criterio[] = [];

  licoesAvaliadas: LicaoAvaliada[] = [];

  respostas: RespostaLida[] = [];

  recebeuLeitura(respostas: RespostaLida[]) {

    this.respostas = respostas;

    console.log(respostas);

  }

  modoFichaAvaliacao = false;
  notasDisponiveis: number[] = [0, 5, 6, 7, 8, 9, 10];

  camposColunas = [
    'nomeAluno',
    'idadeAluno',
    'comum',
    'tipoExameLabel',
    'categoriaExameLabel',
    'dataSolicitacao',
    'dataAgendada',
    'statusLabel',
    'etapaAtualLabel',
  ];

  tituloColunas = {
    nomeAluno: 'Aluno',
    idadeAluno: 'Idade',
    comum: 'Comum',
    tipoExameLabel: 'Exame',
    categoriaExameLabel: 'Categoria',
    dataSolicitacao: 'Solicitação',
    dataAgendada: 'Agendamento',
    statusLabel: 'Status',
    etapaAtualLabel: 'Etapa Atual',
  };

  alinhamentoColunaTitulo: { [coluna: string]: 'left' | 'center' | 'right' } = {
    nomeAluno: 'center',
    idadeAluno: 'center',
    comum: 'center',
    tipoExameLabel: 'center',
    categoriaExameLabel: 'center',
    dataSolicitacao: 'center',
    dataAgendada: 'center',
    statusLabel: 'center',
    etapaAtualLabel: 'center',
  };

  alinhamentoColuna: { [coluna: string]: 'left' | 'center' | 'right' } = {
    nomeAluno: 'left',
    idadeAluno: 'center',
    comum: 'left',
    tipoExameLabel: 'center',
    categoriaExameLabel: 'center',
    dataSolicitacao: 'center',
    dataAgendada: 'center',
    statusLabel: 'center',
    etapaAtualLabel: 'center',
  };

  tamanhoColunas = {
    nomeAluno: { width: '24%', minWidth: '200px' },
    idadeAluno: { width: '6%', minWidth: '60px' },
    comum: { width: '18%', minWidth: '180px' },
    tipoExameLabel: { width: '14%' },
    categoriaExameLabel: { width: '18%', minWidth: '200px' },
    dataSolicitacao: { width: '11%' },
    dataAgendada: { width: '11%' },
    statusLabel: { width: '11%' },
    etapaAtualLabel: { width: '11%' },
  };

  // Regras de destaque linhas
  regrasDestaque = [
    {
      condicao: (item: any) => item.status === 'reprovado',
      estiloClasse: 'linha-vermelha',
    },
    {
      condicao: (item: any) => item.status === 'recuperacao',
      estiloClasse: 'linha-recuperacao',
    },
    {
      condicao: (item: any) => item.status === 'aprovado',
      estiloClasse: 'linha-sucesso',
    },
    {
      condicao: (item: any) => item.status === 'cancelado',
      estiloClasse: 'linha-vermelha',
    },
    {
      condicao: (item: any) => item.status === 'solicitado',
      estiloClasse: 'linha-aviso',
    },
    {
      condicao: (item: any) => item.status === 'emAndamento',
      estiloClasse: 'linha-andamento',
    },
  ];

  // dados: any[] = [];

  acoes = [
    {
      label: '📝',
      descricao: 'Lançar nota manual',
      classe: 'acao-editar',
      visivel: (item: ExameTabela) => this.podeLancarNota(item),
      callback: (item: ExameTabela) => this.lancarNota(item),
    },
    {
      label: '📄',
      descricao: 'Lançar nota pela ficha',
      classe: 'acao-editar',
      visivel: (item: ExameTabela) =>
        this.podeLancarNota(item) && item.etapaAtualLabel === 'PARTE PRÁTICA',
      callback: (item: ExameTabela) => this.abrirFichaAvaliacao(item),
    },
  ];

  // ngOnInit(): void {
  //   this.liberaEditar = this.permissao('update');
  //   this.liberaCriar = this.permissao('create');
  //   this.liberaDeletar = this.permissao('delete');

  //   this.carregarAlunos();
  //   this.carregarGrupoExames();
  //   this.carregarDados();
  // }

  ngOnInit(): void {
    this.firestoreService.getInstrumento().subscribe((lista) => {
      this.listaInstrumentos = lista;
    });

    this.auth.getUsuarioAtualObservable().subscribe((usuario) => {
      if (!usuario) return;

      this.liberaEditar = this.permissao('update');
      this.liberaCriar = this.permissao('create');
      this.liberaDeletar = this.permissao('delete');

      this.carregarAlunos();
      // this.carregarGrupoExames();
      this.carregarDados();
    });
  }

  permissao(tipo: keyof PermissoesCRUD): boolean {
    return this.auth.temPermissao('exames', tipo);
  }

  grupoCompativelComExame(grupo: GrupoExames, exame: Exames): boolean {
    const etapas = this.criarEtapasPorGrupo(grupo, exame);
    return etapas.length > 0;
  }

  proximaPagina(): void {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual++;
      this.limparSelecaoExames();
    }
  }

  paginaAnterior(): void {
    if (this.paginaAtual > 1) {
      this.paginaAtual--;
      this.limparSelecaoExames();
    }
  }

  getNomeInstrumento(id: string): string {
    return (
      this.listaInstrumentos.find((i) => i.id === id)?.nomeInstrumento ||
      'Não informado'
    );
  }

  get dadosPaginados(): any[] {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;

    return this.dados.slice(inicio, fim);
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.dados.length / this.itensPorPagina));
  }

  getControl(controlName: string): FormControl {
    const control = this.dadosForms.get(controlName);
    if (!control) {
      throw new Error(`FormControl '${controlName}' não existe no FormGroup`);
    }
    return control as FormControl;
  }

  getNomeAluno(idAluno: string): string {
    return (
      this.listaAlunos.find((a) => a.value === idAluno)?.label ||
      'ALUNO NÃO ENCONTRADO'
    );
  }

  // getListaCategoriaExame() {
  //   const tipo = this.dadosForms.get('tipoExame')?.value;

  //   if (tipo === 'TEÓRICO E PRÁTICO') {
  //     return this.listaPeriodo;
  //   }

  //   if (tipo === 'PRÁTICO') {
  //     return this.listaPratico;
  //   }

  //   return [];
  // }

  getListaCategoriaExame() {
    const tipo = this.dadosForms.get('tipoExame')?.value;

    if (tipo === '001') {
      return this.listaPeriodo;
    }

    if (tipo === '002') {
      return this.listaPratico;
    }

    return [];
  }

  get aceiteGrupoExameControl(): FormControl {
    return this.aceiteForm.get('idGrupoExame') as FormControl;
  }

  get liberaAcoes(): boolean {
    const temPermissao = this.liberaEditar || this.liberaDeletar;

    // const temItemSolicitado = this.dados.some(
    //   (item) => item.status === 'solicitado',
    // );

    return temPermissao;
  }

  get filtroStatusOp(): boolean {
    return (this.filtroStatus = !this.filtroStatus);
  }

  carregarAlunos(): void {
    this.firestoreService.getCandidato().subscribe((lista: Candidatos[]) => {
      this.listaAlunos = lista
        .map((a) => ({
          value: a.id!,
          label: a.nomeAluno?.toLocaleUpperCase('pt-BR') || '',
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    });
  }

  // carregarDados(): void {
  //   combineLatest([
  //     this.firestoreService.getExames(),
  //     this.firestoreService.getCandidato(),
  //   ]).subscribe(([exames, alunos]) => {
  //     const dadosExames = exames.map((exame) => {
  //       const alunoFiltro = alunos.find((a) => a.id === exame.idAluno);

  //       const etapaAtual = exame.etapas?.find(
  //         (e) => e.ordem === exame.etapaAtual,
  //       );

  //       return {
  //         ...exame,
  //         dataAgendada: converterISOParaBR(etapaAtual?.dataAgendada || ''),
  //         nomeAluno:
  //           alunoFiltro?.nomeAluno?.toLocaleUpperCase('pt-BR') ||
  //           'ALUNO NÃO CADASTRADO',
  //         tipoExame: exame.tipoExame?.toLocaleUpperCase('pt-BR') || '',
  //         statusLabel: this.formatarStatus(exame.status),
  //         etapaAtualLabel:
  //           exame.status === 'aprovado'
  //             ? 'CONCLUÍDO'
  //             : exame.status === 'reprovado'
  //               ? 'REPROVADO'
  //               : etapaAtual?.nome || 'AGUARDANDO',
  //       };
  //     });

  //     // this.dados = [...dadosExames].sort((a, b) =>
  //     //   (a.nomeAluno || '').localeCompare(b.nomeAluno || ''),
  //     // );
  //     const ordemStatus: Record<string, number> = {
  //       solicitado: 1,
  //       agendado: 2,
  //       emAndamento: 3,
  //       aprovado: 4,
  //       reprovado: 5,
  //       cancelado: 6,
  //     };

  //     this.dados = [...dadosExames].sort((a, b) => {
  //       // STATUS
  //       const statusA = ordemStatus[a.status] || 999;
  //       const statusB = ordemStatus[b.status] || 999;

  //       if (statusA !== statusB) {
  //         return statusA - statusB;
  //       }

  //       // EXAME
  //       const tipo = (a.tipoExame || '').localeCompare(b.tipoExame || '');

  //       if (tipo !== 0) {
  //         return tipo;
  //       }

  //       // CATEGORIA
  //       const categoria = (a.categoriaExame || '').localeCompare(
  //         b.categoriaExame || '',
  //       );

  //       if (categoria !== 0) {
  //         return categoria;
  //       }

  //       // ALUNO
  //       return (a.nomeAluno || '').localeCompare(b.nomeAluno || '');
  //     });
  //     // console.log(this.dados);
  //   });
  // }
  // carregarDados(): void {
  //   combineLatest([
  //     this.firestoreService.getExames(),
  //     this.firestoreService.getCandidato(),
  //   ]).subscribe(([exames, alunos]) => {
  //     // const alunosPermitidos = alunos.filter((a) =>
  //     //   this.auth.podeVerRegistro(a, 'candidatos'),
  //     // );
  //     if (!this.auth.temPermissao('exames', 'read')) {
  //       this.dados = [];
  //       this.dadosTodos = [];
  //       return;
  //     }

  //     const alunosPermitidos = alunos.filter((a) =>
  //       this.auth.temAcessoAoRegistro(a),
  //     );

  //     const idsAlunosPermitidos = alunosPermitidos.map((a) => a.id);

  //     const dadosExames = exames
  //       .filter((exame) => idsAlunosPermitidos.includes(exame.idAluno))
  //       .map((exame) => {
  //         const alunoFiltro = alunosPermitidos.find(
  //           (a) => a.id === exame.idAluno,
  //         );

  //         const etapaAtual = exame.etapas?.find(
  //           (e) => e.ordem === exame.etapaAtual,
  //         );

  //         return {
  //           ...exame,
  //           idadeAluno: this.calcularIdade(alunoFiltro?.dataNascimento),
  //           instrumentoAluno: alunoFiltro?.idInstrumento || '',
  //           afinacaoAluno: alunoFiltro?.afinacao || '',
  //           dataSolicitacao: converterISOParaBR(exame.dataSolicitacao),
  //           dataAgendada: converterISOParaBR(etapaAtual?.dataAgendada || ''),
  //           nomeAluno:
  //             alunoFiltro?.nomeAluno?.toLocaleUpperCase('pt-BR') ||
  //             'ALUNO NÃO CADASTRADO',
  //           tipoExameLabel: this.buscarLabel(
  //             this.listaTipoExame,
  //             exame.tipoExame,
  //           ),
  //           categoriaExameLabel: this.buscarCategoriaExame(
  //             exame.categoriaExame || '',
  //           ),
  //           statusLabel: this.formatarStatus(exame.status),
  //           etapaAtualLabel:
  //             exame.status === 'aprovado'
  //               ? 'CONCLUÍDO'
  //               : exame.status === 'reprovado'
  //                 ? 'REPROVADO'
  //                 : etapaAtual?.nome || 'AGUARDANDO',
  //         };
  //       });

  //     const ordemStatus: Record<string, number> = {
  //       solicitado: 1,
  //       agendado: 2,
  //       emAndamento: 3,
  //       aprovado: 4,
  //       reprovado: 5,
  //       cancelado: 6,
  //     };

  //     // this.dados = [...dadosExames].sort((a, b) => {
  //     this.dadosTodos = [...dadosExames].sort((a, b) => {
  //       const statusA = ordemStatus[a.status] || 999;
  //       const statusB = ordemStatus[b.status] || 999;

  //       if (statusA !== statusB) return statusA - statusB;

  //       const tipo = (a.tipoExame || '').localeCompare(b.tipoExame || '');
  //       if (tipo !== 0) return tipo;

  //       const categoria = (a.categoriaExame || '').localeCompare(
  //         b.categoriaExame || '',
  //       );
  //       if (categoria !== 0) return categoria;

  //       return (a.nomeAluno || '').localeCompare(b.nomeAluno || '');
  //     });
  //     this.aplicarFiltroStatus();
  //   });
  // }

  // carregarDados(): void {
  //   combineLatest([
  //     this.firestoreService.getExames(),
  //     this.firestoreService.getCandidato(),
  //   ]).subscribe(([exames, alunos]) => {
  //     if (!this.auth.temPermissao('exames', 'read')) {
  //       this.dados = [];
  //       this.dadosTodos = [];
  //       return;
  //     }

  //     const alunosPermitidos = alunos.filter((a) =>
  //       this.auth.temAcessoAoRegistro(a),
  //     );

  //     const idsAlunosPermitidos = alunosPermitidos.map((a) => a.id);

  //     const dadosExames = exames
  //       .filter((exame) => idsAlunosPermitidos.includes(exame.idAluno))
  //       .map((exame) => {
  //         const alunoFiltro = alunosPermitidos.find(
  //           (a) => a.id === exame.idAluno,
  //         );

  //         const etapaAtual = exame.etapas?.find(
  //           (e) => e.ordem === exame.etapaAtual,
  //         );

  //         const avaliacaoGrupo = this.buscarAvaliacaoDoGrupo(
  //           exame,
  //           exame.etapaAtual,
  //         );

  //         return {
  //           ...exame,
  //           idadeAluno: this.calcularIdade(alunoFiltro?.dataNascimento),
  //           instrumentoAluno: alunoFiltro?.idInstrumento || '',
  //           afinacaoAluno: alunoFiltro?.afinacao || '',
  //           dataSolicitacao: converterISOParaBR(exame.dataSolicitacao),
  //           dataAgendada: converterISOParaBR(
  //             avaliacaoGrupo?.dataAvaliacao || '',
  //           ),
  //           nomeAluno:
  //             alunoFiltro?.nomeAluno?.toLocaleUpperCase('pt-BR') ||
  //             'ALUNO NÃO CADASTRADO',
  //           tipoExameLabel: this.buscarLabel(
  //             this.listaTipoExame,
  //             exame.tipoExame,
  //           ),
  //           categoriaExameLabel: this.buscarCategoriaExame(
  //             exame.categoriaExame || '',
  //           ),
  //           statusLabel: this.formatarStatus(exame.status),
  //           etapaAtualLabel:
  //             exame.status === 'aprovado'
  //               ? 'CONCLUÍDO'
  //               : exame.status === 'reprovado'
  //                 ? 'REPROVADO'
  //                 : avaliacaoGrupo?.nome || 'AGUARDANDO',
  //         };
  //       });

  //     const ordemStatus: Record<string, number> = {
  //       solicitado: 1,
  //       agendado: 2,
  //       emAndamento: 3,
  //       aprovado: 4,
  //       reprovado: 5,
  //       cancelado: 6,
  //     };

  //     this.dadosTodos = [...dadosExames].sort((a, b) => {
  //       const statusA = ordemStatus[a.status] || 999;
  //       const statusB = ordemStatus[b.status] || 999;

  //       if (statusA !== statusB) return statusA - statusB;

  //       const tipo = (a.tipoExame || '').localeCompare(b.tipoExame || '');
  //       if (tipo !== 0) return tipo;

  //       const categoria = (a.categoriaExame || '').localeCompare(
  //         b.categoriaExame || '',
  //       );
  //       if (categoria !== 0) return categoria;

  //       return (a.nomeAluno || '').localeCompare(b.nomeAluno || '');
  //     });

  //     this.aplicarFiltroStatus();
  //   });
  // }

  // carregarDados(): void {
  //   combineLatest([
  //     this.firestoreService.getExames(),
  //     this.firestoreService.getCandidato(),
  //     this.firestoreService.getIgrejas(),
  //     this.firestoreService.getSemestres(),
  //   ]).subscribe(([exames, alunos, igrejas, grupos]) => {
  //     this.gruposExames = grupos;

  //     if (!this.auth.temPermissao('exames', 'read')) {
  //       this.dados = [];
  //       this.dadosTodos = [];
  //       return;
  //     }

  //     const alunosPermitidos = alunos.filter((a) =>
  //       this.auth.temAcessoAoRegistro(a),
  //     );

  //     const idsAlunosPermitidos = alunosPermitidos.map((a) => a.id);

  //     // const dadosExames = exames
  //     //   .filter((exame) => idsAlunosPermitidos.includes(exame.idAluno))
  //     //   .map((exame) => {
  //     const dadosExames = exames
  //       .filter((exame) => {
  //         const grupo = grupos.find((g) => g.id === exame.idGrupoExame);

  //         return (
  //           idsAlunosPermitidos.includes(exame.idAluno) &&
  //           (exame.status === 'solicitado' ||
  //             (!!grupo && grupo.concluido !== true))
  //         );
  //       })
  //       .map((exame) => {
  //         const alunoFiltro = alunosPermitidos.find(
  //           (a) => a.id === exame.idAluno,
  //         );

  //         const comum = igrejas.find((i) => i.id === alunoFiltro?.idComum);
  //         const avaliacaoGrupo = this.buscarAvaliacaoDoGrupo(
  //           exame,
  //           exame.etapaAtual,
  //         );

  //         return {
  //           ...exame,
  //           idadeAluno: this.calcularIdade(alunoFiltro?.dataNascimento),
  //           instrumentoAluno: alunoFiltro?.idInstrumento || '',
  //           afinacaoAluno: alunoFiltro?.afinacao || '',
  //           dataSolicitacao: converterISOParaBR(exame.dataSolicitacao || ''),
  //           dataAgendada: converterISOParaBR(
  //             avaliacaoGrupo?.dataAvaliacao || '',
  //           ),
  //           nomeAluno:
  //             alunoFiltro?.nomeAluno?.toLocaleUpperCase('pt-BR') ||
  //             'ALUNO NÃO CADASTRADO',
  //           idComum: alunoFiltro?.idComum || '',
  //           comum: comum?.nomeCongregacao?.toLocaleUpperCase('pt-BR') || '',
  //           tipoExameLabel: this.buscarLabel(
  //             this.listaTipoExame,
  //             exame.tipoExame,
  //           ),
  //           categoriaExameLabel: this.buscarCategoriaExame(
  //             exame.categoriaExame || '',
  //           ),
  //           statusLabel: this.formatarStatus(exame.status),
  //           etapaAtualLabel:
  //             exame.status === 'aprovado'
  //               ? 'CONCLUÍDO'
  //               : exame.status === 'reprovado'
  //                 ? 'REPROVADO'
  //                 : avaliacaoGrupo?.nome || 'AGUARDANDO',
  //         };
  //       });

  //     const ordemStatus: Record<string, number> = {
  //       solicitado: 1,
  //       agendado: 2,
  //       emAndamento: 3,
  //       aprovado: 4,
  //       reprovado: 5,
  //       cancelado: 6,
  //     };

  //     this.dadosTodos = [...dadosExames].sort((a, b) => {
  //       const statusA = ordemStatus[a.status] || 999;
  //       const statusB = ordemStatus[b.status] || 999;

  //       if (statusA !== statusB) return statusA - statusB;

  //       const tipo = (a.tipoExame || '').localeCompare(b.tipoExame || '');
  //       if (tipo !== 0) return tipo;

  //       const categoria = (a.categoriaExame || '').localeCompare(
  //         b.categoriaExame || '',
  //       );
  //       if (categoria !== 0) return categoria;

  //       return (a.nomeAluno || '').localeCompare(b.nomeAluno || '');
  //     });

  //     this.aplicarFiltroStatus();
  //   });
  // }

  carregarDados(): void {
    combineLatest([
      this.firestoreService.getExames(),
      this.firestoreService.getCandidato(),
      this.firestoreService.getIgrejas(),
      this.firestoreService.getSemestres(),
      this.firestoreService.getCriterios(),
    ]).subscribe(([exames, alunos, igrejas, grupos, criterios]) => {
      this.gruposExames = grupos;
      this.criteriosCadastrados = criterios;

      if (!this.auth.temPermissao('exames', 'read')) {
        this.dados = [];
        this.dadosTodos = [];
        this.listaSelect = [];
        return;
      }

      const alunosPermitidos = alunos.filter((a) =>
        this.auth.temAcessoAoRegistro(a),
      );

      const idsAlunosPermitidos = alunosPermitidos.map((a) => a.id);

      const dadosExames: ExameTabela[] = exames
        .filter((exame) => {
          const grupo = grupos.find((g) => g.id === exame.idGrupoExame);

          return (
            idsAlunosPermitidos.includes(exame.idAluno) &&
            (exame.status === 'solicitado' ||
              (!!grupo && grupo.concluido !== true))
          );
        })
        .map((exame) => {
          const alunoFiltro = alunosPermitidos.find(
            (a) => a.id === exame.idAluno,
          );

          const comum = igrejas.find((i) => i.id === alunoFiltro?.idComum);

          const avaliacaoGrupo = this.buscarAvaliacaoDoGrupo(
            exame,
            exame.etapaAtual,
          );

          return {
            ...exame,

            idadeAluno: this.calcularIdade(alunoFiltro?.dataNascimento),

            instrumentoAluno: alunoFiltro?.idInstrumento || '',
            afinacaoAluno: alunoFiltro?.afinacao || '',

            idComum: alunoFiltro?.idComum || '',

            comum: comum?.nomeCongregacao?.toLocaleUpperCase('pt-BR') || '',

            dataSolicitacao: converterISOParaBR(exame.dataSolicitacao || ''),

            // dataAgendada: converterISOParaBR(
            //   avaliacaoGrupo?.dataAvaliacao || '',
            // ),
            dataAgendada: converterISOParaBR(
              exame.status === 'recuperacao'
                ? avaliacaoGrupo?.dataRecuperacao || ''
                : avaliacaoGrupo?.dataAvaliacao || '',
            ),

            nomeAluno:
              alunoFiltro?.nomeAluno?.toLocaleUpperCase('pt-BR') ||
              'ALUNO NÃO CADASTRADO',

            tipoExameLabel: this.buscarLabel(
              this.listaTipoExame,
              exame.tipoExame,
            ),

            categoriaExameLabel: this.buscarCategoriaExame(
              exame.categoriaExame || '',
            ),

            statusLabel: this.formatarStatus(exame.status),

            etapaAtualLabel:
              exame.status === 'aprovado'
                ? 'CONCLUÍDO'
                : exame.status === 'reprovado'
                  ? 'REPROVADO'
                  : avaliacaoGrupo?.nome || 'AGUARDANDO',
          };
        });

      // Somente comuns existentes nos exames disponíveis
      this.listaSelect = dadosExames
        .filter((item) => item.idComum && item.comum)
        .map((item) => ({
          value: item.idComum!,
          label: item.comum!,
        }))
        .filter(
          (item, index, lista) =>
            lista.findIndex((outro) => outro.value === item.value) === index,
        )
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

      const ordemStatus: Record<string, number> = {
        solicitado: 1,
        agendado: 2,
        emAndamento: 3,
        aprovado: 4,
        reprovado: 5,
        cancelado: 6,
      };

      this.dadosTodos = [...dadosExames].sort((a, b) => {
        const statusA = ordemStatus[a.status] || 999;
        const statusB = ordemStatus[b.status] || 999;

        if (statusA !== statusB) {
          return statusA - statusB;
        }

        const tipo = (a.tipoExame || '').localeCompare(b.tipoExame || '');

        if (tipo !== 0) {
          return tipo;
        }

        const categoria = (a.categoriaExame || '').localeCompare(
          b.categoriaExame || '',
        );

        if (categoria !== 0) {
          return categoria;
        }

        return (a.nomeAluno || '').localeCompare(b.nomeAluno || '');
      });

      this.aplicarFiltroStatus();
      this.atualizarSelecaoAposCarregar();
    });
  }

  buscarPesquisa(): void {
    this.aplicarFiltroStatus();
    this.limparSelecaoExames();
  }

  private carregarCriteriosDaFicha(exame: Exames): boolean {
    const grupo = this.gruposExames.find(
      (item) => item.id === exame.idGrupoExame,
    );

    if (!grupo) {
      this.snackBar.open('Grupo de avaliação não encontrado.', 'Fechar', {
        duration: 3000,
      });

      return false;
    }

    const idsSelecionados = grupo.criteriosSelecionados ?? [];

    this.criteriosDaFicha = idsSelecionados
      .map((idCriterio) =>
        this.criteriosCadastrados.find(
          (criterio) =>
            criterio.id === idCriterio &&
            criterio.tipoExame === exame.tipoExame,
        ),
      )
      .filter((criterio): criterio is Criterio => !!criterio);

    if (!this.criteriosDaFicha.length) {
      this.snackBar.open(
        'Nenhum critério compatível foi encontrado para este exame.',
        'Fechar',
        {
          duration: 4000,
        },
      );

      return false;
    }

    return true;
  }

  buscarAvaliacaoDoGrupo(exame: Exames, ordem: number): any | null {
    const grupo = this.gruposExames.find((g) => g.id === exame.idGrupoExame);

    if (!grupo) return null;

    const periodo = grupo.periodos?.find(
      (p: any) => p.categoriaExame === exame.tipoExame,
    );

    const etapa = periodo?.etapas?.find(
      (e: any) => e.tipo === exame.categoriaExame,
    );

    return etapa?.avaliacao?.find((a: any) => a.ordem === ordem) || null;
  }

  aoSelecionarComunsFiltro(comuns: string[]): void {
    this.comunsSelecionadas = comuns ?? [];

    this.aplicarFiltroStatus();
    this.limparSelecaoExames();
  }
  // abrirFichaAvaliacao(exame: ExameTabela): void {
  //   this.exameSelecionado = exame;

  //   this.somaPontosFicha = '';
  //   this.pontuacaoFinalFicha = '';
  //   this.resultadoFicha = '';

  //   this.tabelaVisivel = false;
  // }

  // abrirFichaAvaliacao(exame: ExameTabela): void {
  //   const etapa = exame.etapas.find((e) => e.ordem === exame.etapaAtual);

  //   if (!etapa) {
  //     this.snackBar.open('Nenhuma etapa disponível.', 'Fechar', {
  //       duration: 3000,
  //     });
  //     return;
  //   }

  //   const configEtapa = this.buscarAvaliacaoDoGrupo(exame, etapa.ordem);

  //   if (!configEtapa) {
  //     this.snackBar.open(
  //       'Configuração da etapa não encontrada no grupo.',
  //       'Fechar',
  //       {
  //         duration: 3000,
  //       },
  //     );
  //     return;
  //   }

  //   this.exameSelecionado = exame;
  //   this.etapaSelecionada = etapa;
  //   this.configEtapaSelecionada = configEtapa;

  //   this.notaForm.reset();

  //   this.notaForm.patchValue({
  //     nota: etapa.nota ?? '',
  //     professorLancamento:
  //       etapa.professorLancamento || this.auth.usuario?.nome || '',
  //     observacaoLancamento: etapa.observacaoLancamento || '',
  //   });

  //   this.avaliacaoFicha = {
  //     pulsacao: null,
  //     leituraMusical: null,
  //     movimentoConducao: null,
  //   };

  //   this.somaPontosFicha = '';
  //   this.pontuacaoFinalFicha = '';
  //   this.resultadoFicha = '';

  //   this.tabelaVisivel = false;
  // }

lancarNotaGabarito(): void{
  this.abrirModalLeitor = !this.abrirModalLeitor;
}

  abrirFichaAvaliacao(exame: ExameTabela): void {
    this.modoFichaAvaliacao = true;
    const etapa = exame.etapas.find((item) => item.ordem === exame.etapaAtual);

    if (!etapa) {
      this.snackBar.open('Nenhuma etapa disponível.', 'Fechar', {
        duration: 3000,
      });

      return;
    }

    const configEtapa = this.buscarAvaliacaoDoGrupo(exame, etapa.ordem);

    if (!configEtapa) {
      this.snackBar.open(
        'Configuração da etapa não encontrada no grupo.',
        'Fechar',
        {
          duration: 3000,
        },
      );

      return;
    }

    if (!this.carregarCriteriosDaFicha(exame)) {
      return;
    }

    this.exameSelecionado = exame;
    this.etapaSelecionada = etapa;
    this.configEtapaSelecionada = configEtapa;

    this.notaForm.reset();

    this.notaForm.patchValue({
      nota: etapa.nota ?? '',
      professorLancamento:
        etapa.professorLancamento || this.auth.usuario?.nome || '',
      observacaoLancamento: etapa.observacaoLancamento || '',
    });

    if (etapa.licoesAvaliadas?.length) {
      this.licoesAvaliadas = etapa.licoesAvaliadas.map((licao) => ({
        ...licao,
        criterios: licao.criterios.map((criterio) => ({
          ...criterio,
        })),
      }));
    } else {
      this.licoesAvaliadas = [
        {
          id: this.gerarIdLicao(),
          nomeLicao: '',
          criterios: this.criarCriteriosVazios(),
          somaPontos: 0,
          pontuacaoFinal: 0,
        },
      ];
    }

    this.calcularNotaFicha();

    this.tabelaVisivel = false;
  }

  private gerarIdLicao(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private criarCriteriosVazios(): AvaliacaoCriterio[] {
    return this.criteriosDaFicha.map((criterio) => ({
      idCriterio: criterio.id!,
      nomeCriterio: criterio.nomeCriterio,
      nota: null,
    }));
  }

  adicionarLicao(): void {
    this.licoesAvaliadas.push({
      id: this.gerarIdLicao(),
      nomeLicao: '',
      criterios: this.criarCriteriosVazios(),
      somaPontos: 0,
      pontuacaoFinal: 0,
    });

    this.calcularNotaFicha();
  }

  removerLicao(index: number): void {
    if (this.licoesAvaliadas.length === 1) {
      this.snackBar.open(
        'A ficha precisa possuir pelo menos uma lição.',
        'Fechar',
        {
          duration: 3000,
        },
      );

      return;
    }

    this.licoesAvaliadas.splice(index, 1);
    this.calcularNotaFicha();
  }

  // voltarTabela(): void {
  //   this.tabelaVisivel = true;
  //   this.exameSelecionado = null;
  // }

  voltarTabela(): void {
    this.tabelaVisivel = true;
    this.exameSelecionado = null;
    this.etapaSelecionada = null;
    this.configEtapaSelecionada = null;
    this.modoFichaAvaliacao = false;
    this.licoesAvaliadas = [];
  }

  aoSelecionarStatusFiltro(status: string): void {
    this.statusFiltro = status || 'TODOS';
    this.aplicarFiltroStatus();
    this.limparSelecaoExames();
    this.filtroStatusOp;
  }

  aoSelecionarCategoriaFiltro(categoria: string): void {
    this.statusCategorias = categoria || 'TODOS';
    this.aplicarFiltroStatus();
    this.limparSelecaoExames();
  }

  aplicarFiltroStatus(): void {
    let dadosFiltrados = [...this.dadosTodos];

    // Filtro por status
    if (this.statusFiltro !== 'TODOS') {
      dadosFiltrados = dadosFiltrados.filter(
        (item) => item.status === this.statusFiltro,
      );
    }

    // Filtro por categoria
    if (this.statusCategorias !== 'TODOS') {
      dadosFiltrados = dadosFiltrados.filter(
        (item) => item.categoriaExame === this.statusCategorias,
      );
    }

    // Filtro por comuns
    if (
      this.comunsSelecionadas.length > 0 &&
      !this.comunsSelecionadas.includes('TODOS')
    ) {
      dadosFiltrados = dadosFiltrados.filter((item) =>
        this.comunsSelecionadas.includes(item.idComum || ''),
      );
    }

    // Filtro por pesquisa
    if (this.pesquisa.trim()) {
      const termo = this.pesquisa.trim().toLocaleUpperCase('pt-BR');

      dadosFiltrados = dadosFiltrados.filter(
        (item) =>
          item.nomeAluno?.includes(termo) ||
          item.idadeAluno?.includes(termo) ||
          item.comum?.includes(termo) ||
          item.tipoExameLabel?.toLocaleUpperCase('pt-BR').includes(termo) ||
          item.categoriaExameLabel
            ?.toLocaleUpperCase('pt-BR')
            .includes(termo) ||
          item.statusLabel?.toLocaleUpperCase('pt-BR').includes(termo) ||
          item.etapaAtualLabel?.toLocaleUpperCase('pt-BR').includes(termo) ||
          item.dataSolicitacao?.includes(termo) ||
          item.dataAgendada?.includes(termo),
      );
    }

    this.dados = dadosFiltrados;
    this.paginaAtual = 1;
  }

  calcularIdade(dataNascimento?: string): string {
    if (!dataNascimento) return '';

    const hoje = new Date();
    const nascimento = new Date(dataNascimento);

    let idade = hoje.getFullYear() - nascimento.getFullYear();

    const mesAtual = hoje.getMonth();
    const mesNascimento = nascimento.getMonth();

    const aindaNaoFezAniversario =
      mesAtual < mesNascimento ||
      (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate());

    if (aindaNaoFezAniversario) {
      idade--;
    }

    return `${idade}`;
  }

  carregarGrupoExames(): void {
    this.firestoreService.getSemestres().subscribe((lista: GrupoExames[]) => {
      const listaPermitida =
        this.auth.usuario?.perfil === 'admin'
          ? lista
          : lista.filter((item) =>
              this.auth.temAcessoAoRegistro({
                idSetor: item.idSetor,
                idComum: item.idComum,
              }),
            );

      this.gruposExames = listaPermitida.filter((g) => !g.concluido);

      this.listaGrupoExames = this.gruposExames.map((g) => ({
        value: g.id!,
        label: `${g.grupoExame} - ${g.descricao}`,
      }));
    });
  }

  formatarStatus(status: string): string {
    const mapa: any = {
      solicitado: 'SOLICITADO',
      agendado: 'AGENDADO',
      emAndamento: 'EM ANDAMENTO',
      recuperacao: 'RECUPERAÇÃO',
      aprovado: 'APROVADO',
      reprovado: 'REPROVADO',
      cancelado: 'CANCELADO',
    };

    return mapa[status] || status;
  }

  criarEtapasPorGrupo(grupo: GrupoExames, exame: Exames): any[] {
    const periodoGrupo = grupo.periodos?.find(
      (p: any) => p.categoriaExame === exame.tipoExame,
    );

    if (!periodoGrupo) return [];

    const etapaPeriodo = periodoGrupo.etapas?.find(
      (e: any) => e.tipo === exame.categoriaExame,
    );

    if (!etapaPeriodo) return [];

    return etapaPeriodo.avaliacao.map((a: any) => ({
      ordem: a.ordem,
      nota: null,
      resultado: a.bloqueadaInicialmente ? 'bloqueado' : 'pendente',
      professorLancamento: '',
      dataLancamento: '',
      observacaoLancamento: '',

      notaRecuperacao: null,
      dataRecuperacao: '',
      professorRecuperacao: '',
      observacaoRecuperacao: '',
    }));
  }

  buscarLabel(
    lista: { value: string; label: string }[],
    value: string,
  ): string {
    return lista.find((item) => item.value === value)?.label || value;
  }

  primeiraMaiuscula(texto: string): string {
    if (!texto) return '';

    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
  }

  buscarCategoriaExame(value: string): string {
    return (
      this.listaPeriodo.find((x) => x.value === value)?.label ||
      this.listaPratico.find((x) => x.value === value)?.label ||
      value
    );
  }

  estaEmRecuperacao(exame: Exames, etapa: any): boolean {
    return (
      exame.status === 'recuperacao' &&
      etapa.resultado === 'recuperacao' &&
      exame.etapaAtual === etapa.ordem
    );
  }

  async onSalvar(): Promise<void> {
    if (!this.dadosForms.valid) {
      this.dadosForms.markAllAsTouched();
      // alert('Formulário inválido. Preencha os campos obrigatórios.');
      this.alertService.erro(
        'Formulário inválido. Preencha os campos obrigatórios.',
      );
      return;
    }

    const baseData: Exames = {
      idAluno: this.dadosForms.value.idAluno,
      tipoExame: this.dadosForms.value.tipoExame,
      categoriaExame: this.dadosForms.value.categoriaExame,
      observacao: upper(this.dadosForms.value.observacao),
      dataSolicitacao:
        this.dadosParaEditar?.dataSolicitacao || formatarDataString(new Date()),
      status: 'solicitado',
      etapaAtual: 0,
      etapas: [],
    };

    const nomeAluno =
      this.listaAlunos.find((a) => a.value === baseData.idAluno)?.label ||
      'ALUNO';

    const mensagem = this.dadosParaEditar
      ? `Deseja realmente alterar o exame de ${nomeAluno}?`
      : `Deseja realmente solicitar exame para ${nomeAluno}?`;

    // if (!confirmarAcao(mensagem)) return;
    // const confirmou = await this.alertService.confirmar(mensagem);

    // if (!confirmou) {
    //   return;
    // }
    if (!(await this.alertService.confirmar(mensagem))) return;

    if (this.dadosParaEditar?.id) {
      this.firestoreService
        .updateExame(this.dadosParaEditar.id, baseData)
        .then(() => {
          this.snackBar.open('Exame alterado com sucesso!', 'Fechar', {
            duration: 4000,
          });
          this.fecharModal();
        });
    } else {
      this.firestoreService.addExame(baseData).then(() => {
        this.snackBar.open('Exame solicitado com sucesso!', 'Fechar', {
          duration: 4000,
        });
        this.fecharModal();
      });
    }
  }

  onTipoExameChange(): void {
    this.dadosForms.patchValue({
      categoriaExame: '',
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth <= 576;
  }

  buttonClick(): void {
    this.title = 'Solicitar Exame';
    this.mostrarModal = true;
    this.dadosParaEditar = null;
    this.dadosForms.reset();
  }

  editar(exame: Exames): void {
    this.title = 'Editar Exame';
    this.mostrarModal = true;
    this.dadosParaEditar = { ...exame };

    this.dadosForms.patchValue({
      idAluno: exame.idAluno || '',
      tipoExame: exame.tipoExame || '',
      categoriaExame: exame.categoriaExame || '',
      observacao: exame.observacao || '',
    });
  }

  // podeLancarNota(item: ExameTabela): boolean {
  //   const avaliacaoGrupo = this.buscarAvaliacaoDoGrupo(item, item.etapaAtual);

  //   return (
  //     this.liberaEditar &&
  //     item.status !== 'solicitado' &&
  //     item.status !== 'aprovado' &&
  //     item.status !== 'reprovado' &&
  //     item.status !== 'cancelado' &&
  //     !!avaliacaoGrupo?.dataAvaliacao
  //   );
  // }

  podeLancarNota(item: ExameTabela): boolean {
    const avaliacaoGrupo = this.buscarAvaliacaoDoGrupo(item, item.etapaAtual);

    const dataLancamento =
      item.status === 'recuperacao'
        ? avaliacaoGrupo?.dataRecuperacao
        : avaliacaoGrupo?.dataAvaliacao;

    return (
      this.liberaEditar &&
      item.status !== 'solicitado' &&
      item.status !== 'aprovado' &&
      item.status !== 'reprovado' &&
      item.status !== 'cancelado' &&
      !!dataLancamento
    );
  }

  lancarNota(exame: ExameTabela): void {
    this.modoFichaAvaliacao = false;

    const etapa = exame.etapas.find((e) => e.ordem === exame.etapaAtual);

    if (!etapa) {
      this.snackBar.open('Nenhuma etapa disponível.', 'Fechar', {
        duration: 3000,
      });
      return;
    }

    const configEtapa = this.buscarAvaliacaoDoGrupo(exame, etapa.ordem);

    if (!configEtapa) {
      this.snackBar.open(
        'Configuração da etapa não encontrada no grupo.',
        'Fechar',
        {
          duration: 3000,
        },
      );
      return;
    }

    this.exameSelecionado = exame;
    this.etapaSelecionada = etapa;
    this.configEtapaSelecionada = configEtapa;

    const emRecuperacao = this.estaEmRecuperacao(exame, etapa);

    const notaControl = this.notaForm.get('nota');

    notaControl?.setValidators([
      Validators.required,
      Validators.min(0),
      Validators.max(configEtapa.notaMaxima ?? 0),
    ]);

    notaControl?.updateValueAndValidity();

    this.notaForm.reset();

    this.notaForm.patchValue({
      nota: emRecuperacao ? (etapa.notaRecuperacao ?? '') : (etapa.nota ?? ''),
      professorLancamento: emRecuperacao
        ? etapa.professorRecuperacao || this.auth.usuario?.nome || ''
        : etapa.professorLancamento || this.auth.usuario?.nome || '',

      observacaoLancamento: emRecuperacao
        ? etapa.observacaoRecuperacao || ''
        : etapa.observacaoLancamento || '',
    });

    this.mostrarModalNota = true;
  }

  // avaliacaoFicha = {
  //   pulsacao: null as number | null,
  //   leituraMusical: null as number | null,
  //   movimentoConducao: null as number | null,
  // };

  // calcularNotaFicha(): void {
  //   const valores = [
  //     this.avaliacaoFicha.pulsacao,
  //     this.avaliacaoFicha.leituraMusical,
  //     this.avaliacaoFicha.movimentoConducao,
  //   ];

  //   if (valores.some((v) => v === null)) {
  //     this.somaPontosFicha = '';
  //     this.pontuacaoFinalFicha = '';
  //     this.resultadoFicha = '';
  //     this.notaForm.patchValue({ nota: '' });
  //     return;
  //   }

  //   const notas = valores as number[];

  //   const soma = notas.reduce((acc, valor) => acc + valor, 0);

  //   const notaMinima = Number(this.configEtapaSelecionada?.notaMinima ?? 0);
  //   const notaMaxima = Number(this.configEtapaSelecionada?.notaMaxima ?? 0);

  //   const maiorNotaPorCriterio = 10;
  //   const pontuacaoMaximaFicha = notas.length * maiorNotaPorCriterio;

  //   const notaFinal = (soma / pontuacaoMaximaFicha) * notaMaxima;

  //   this.somaPontosFicha = soma.toString();
  //   this.pontuacaoFinalFicha = notaFinal.toFixed(2).replace('.', ',');
  //   this.resultadoFicha = notaFinal >= notaMinima ? 'Aprovado' : 'Reprovado';

  //   this.notaForm.patchValue({
  //     nota: Number(notaFinal.toFixed(2)),
  //   });
  // }

  // calcularNotaFicha(): void {
  //   let somaGeral = 0;
  //   let quantidadeNotas = 0;

  //   this.licoesAvaliadas.forEach((licao) => {
  //     const notasPreenchidas = licao.criterios
  //       .map((criterio) => criterio.nota)
  //       .filter((nota): nota is number => nota !== null);

  //     licao.somaPontos = notasPreenchidas.reduce(
  //       (total, nota) => total + nota,
  //       0,
  //     );

  //     licao.pontuacaoFinal = notasPreenchidas.length
  //       ? licao.somaPontos / notasPreenchidas.length
  //       : 0;

  //     somaGeral += licao.somaPontos;
  //     quantidadeNotas += notasPreenchidas.length;
  //   });

  //   const notaFinal = quantidadeNotas ? somaGeral / quantidadeNotas : 0;

  //   const notaMinima = this.configEtapaSelecionada?.notaMinima ?? 0;

  //   this.somaPontosFicha = somaGeral ? String(somaGeral) : '';

  //   this.pontuacaoFinalFicha = quantidadeNotas
  //     ? notaFinal.toFixed(2).replace('.', ',')
  //     : '';

  //   console.log('QuantidadeNotas',quantidadeNotas)
  //   console.log('notaFinal',notaFinal)
  //   console.log('notaMinima',notaMinima)

  //   this.resultadoFicha = quantidadeNotas
  //     ? notaFinal >= notaMinima
  //       ? 'Aprovado'
  //       : 'Reprovado'
  //     : '';

  //   this.notaForm.patchValue(
  //     {
  //       nota: quantidadeNotas ? Number(notaFinal.toFixed(2)) : '',
  //     },
  //     {
  //       emitEvent: false,
  //     },
  //   );
  // }

calcularNotaFicha(): void {
  let somaGeral = 0;
  let quantidadeNotas = 0;

  this.licoesAvaliadas.forEach((licao) => {
    const notasPreenchidas = licao.criterios
      .map((criterio) => criterio.nota)
      .filter(
        (nota): nota is number =>
          nota !== null &&
          nota !== undefined &&
          !isNaN(Number(nota)),
      );

    licao.somaPontos = notasPreenchidas.reduce(
      (total, nota) => total + Number(nota),
      0,
    );

    /*
     * Média da lição continua na escala de 0 a 10.
     */
    licao.pontuacaoFinal = notasPreenchidas.length
      ? licao.somaPontos / notasPreenchidas.length
      : 0;

    somaGeral += licao.somaPontos;
    quantidadeNotas += notasPreenchidas.length;
  });

  const notaMaxima = Number(
    this.configEtapaSelecionada?.notaMaxima ?? 0,
  );

  const notaMinima = Number(
    this.configEtapaSelecionada?.notaMinima ?? 0,
  );

  /*
   * Média bruta dos critérios na escala de 0 a 10.
   */
  const mediaCriterios = quantidadeNotas
    ? somaGeral / quantidadeNotas
    : 0;

  /*
   * Converte proporcionalmente a média de 0–10
   * para a escala configurada da etapa.
   *
   * Exemplo:
   * média 10 e nota máxima 25 = 25
   * média 8 e nota máxima 25 = 20
   */
  const notaFinal =
    quantidadeNotas && notaMaxima > 0
      ? (mediaCriterios / 10) * notaMaxima
      : 0;

  const notaFinalArredondada = Number(
    notaFinal.toFixed(2),
  );

  this.somaPontosFicha = quantidadeNotas
    ? String(somaGeral)
    : '';

  this.pontuacaoFinalFicha = quantidadeNotas
    ? notaFinalArredondada
        .toFixed(2)
        .replace('.', ',')
    : '';

  this.resultadoFicha = quantidadeNotas
    ? notaFinalArredondada >= notaMinima
      ? 'Aprovado'
      : 'Reprovado'
    : '';

  this.notaForm.patchValue(
    {
      nota: quantidadeNotas
        ? notaFinalArredondada
        : '',
    },
    {
      emitEvent: false,
    },
  );

  console.log('Quantidade de notas:', quantidadeNotas);
  console.log('Soma dos critérios:', somaGeral);
  console.log('Média dos critérios (0 a 10):', mediaCriterios);
  console.log('Nota máxima da etapa:', notaMaxima);
  console.log('Nota mínima da etapa:', notaMinima);
  console.log('Nota final convertida:', notaFinalArredondada);
}

  // async salvarNota(): Promise<void> {
  //   if (!this.exameSelecionado || !this.etapaSelecionada) {
  //     return;
  //   }

  //   const exame = this.exameSelecionado;
  //   const etapa = this.etapaSelecionada;

  //   const configEtapa = this.buscarAvaliacaoDoGrupo(exame, etapa.ordem);

  //   if (!configEtapa) {
  //     this.snackBar.open(
  //       'Configuração da etapa não encontrada no grupo.',
  //       'Fechar',
  //       {
  //         duration: 3000,
  //       },
  //     );
  //     return;
  //   }

  //   const nota = this.converterNotaParaNumero(this.notaForm.value.nota);
  //   const notaMinima = configEtapa.notaMinima ?? 0;
  //   const notaMaxima = configEtapa.notaMaxima ?? 0;

  //   if (
  //     this.notaForm.value.nota === null ||
  //     this.notaForm.value.nota === undefined ||
  //     this.notaForm.value.nota === ''
  //   ) {
  //     this.notaForm.markAllAsTouched();
  //     this.snackBar.open('Informe a nota.', 'Fechar', {
  //       duration: 3000,
  //     });
  //     return;
  //   }

  //   if (isNaN(nota)) {
  //     this.snackBar.open('Nota inválida.', 'Fechar', {
  //       duration: 3000,
  //     });
  //     return;
  //   }

  //   if (nota < 0) {
  //     this.snackBar.open('A nota não pode ser menor que zero.', 'Fechar', {
  //       duration: 3000,
  //     });
  //     return;
  //   }

  //   if (nota > notaMaxima) {
  //     this.snackBar.open(
  //       `A nota não pode ser maior que ${notaMaxima}.`,
  //       'Fechar',
  //       {
  //         duration: 3000,
  //       },
  //     );
  //     return;
  //   }

  //   const professorLancamento = upper(this.notaForm.value.professorLancamento);

  //   if (!professorLancamento) {
  //     this.notaForm.markAllAsTouched();
  //     this.snackBar.open('Informe o professor.', 'Fechar', {
  //       duration: 3000,
  //     });
  //     return;
  //   }

  //   const nomeAluno = this.getNomeAluno(exame.idAluno);
  //   const mensagem = `Deseja realmente salvar a nota ${nota} para ${nomeAluno}?`;

  //   if (!(await this.alertService.confirmar(mensagem))) return;

  //   const etapasAtualizadas = exame.etapas.map((e) => {
  //     if (e.ordem < etapa.ordem) {
  //       return {
  //         ordem: e.ordem,
  //         nota: e.nota ?? null,
  //         resultado: e.resultado,
  //         dataLancamento: e.dataLancamento || '',
  //         professorLancamento: e.professorLancamento || '',
  //         observacaoLancamento: e.observacaoLancamento || '',
  //       };
  //     }

  //     if (e.ordem === etapa.ordem) {
  //       return {
  //         ordem: e.ordem,
  //         nota,
  //         resultado:
  //           nota >= notaMinima ? ('aprovado' as const) : ('reprovado' as const),
  //         dataLancamento: formatarDataString(new Date()),
  //         professorLancamento,
  //         observacaoLancamento: upper(
  //           this.notaForm.value.observacaoLancamento || '',
  //         ),
  //       };
  //     }

  //     return {
  //       ordem: e.ordem,
  //       nota: null,
  //       resultado: 'bloqueado' as const,
  //       dataLancamento: '',
  //       professorLancamento: '',
  //       observacaoLancamento: '',
  //     };
  //   });

  //   let novoStatus: Exames['status'] = 'emAndamento';
  //   let novaEtapaAtual = etapa.ordem;

  //   if (nota < notaMinima) {
  //     novoStatus = 'reprovado';
  //     novaEtapaAtual = etapa.ordem;
  //   } else {
  //     const proximaEtapa = etapasAtualizadas.find(
  //       (e) => e.ordem === etapa.ordem + 1,
  //     );

  //     if (proximaEtapa) {
  //       proximaEtapa.resultado = 'pendente';
  //       novaEtapaAtual = proximaEtapa.ordem;
  //       novoStatus = 'emAndamento';
  //     } else {
  //       novaEtapaAtual = etapa.ordem;
  //       novoStatus = 'aprovado';
  //     }
  //   }

  //   await this.firestoreService.updateExame(exame.id!, {
  //     etapas: etapasAtualizadas,
  //     etapaAtual: novaEtapaAtual,
  //     status: novoStatus,
  //   });

  //   if (this.tabelaVisivel === false) this.tabelaVisivel = true;
  //   this.snackBar.open('Nota salva com sucesso!', 'Fechar', {
  //     duration: 4000,
  //   });

  //   this.fecharModalNota();
  // }

  async salvarNota(): Promise<void> {
    if (!this.exameSelecionado || !this.etapaSelecionada) {
      return;
    }

    const exame = this.exameSelecionado;
    const etapa = this.etapaSelecionada;

    const configEtapa = this.buscarAvaliacaoDoGrupo(exame, etapa.ordem);

    if (!configEtapa) {
      this.snackBar.open(
        'Configuração da etapa não encontrada no grupo.',
        'Fechar',
        {
          duration: 3000,
        },
      );

      return;
    }

    const valorNota = this.notaForm.value.nota;

    if (valorNota === null || valorNota === undefined || valorNota === '') {
      this.notaForm.markAllAsTouched();

      this.snackBar.open('Informe a nota.', 'Fechar', {
        duration: 3000,
      });

      return;
    }

    const nota = this.converterNotaParaNumero(valorNota);

    const notaMinima = Number(configEtapa.notaMinima ?? 0);

    const notaMaxima = Number(configEtapa.notaMaxima ?? 0);

    // const notaMinRecuperacao =
    //   configEtapa.notaMinRecuperacao !== null &&
    //   configEtapa.notaMinRecuperacao !== undefined
    //     ? Number(configEtapa.notaMinRecuperacao)
    //     : null;

    const possuiRecuperacao =
      configEtapa.notaMinRecuperacao !== null &&
      configEtapa.notaMinRecuperacao !== undefined &&
      configEtapa.notaMinRecuperacao !== '' &&
      !isNaN(Number(configEtapa.notaMinRecuperacao));

    const notaMinRecuperacao = possuiRecuperacao
      ? Number(configEtapa.notaMinRecuperacao)
      : null;

    if (isNaN(nota)) {
      this.snackBar.open('Nota inválida.', 'Fechar', {
        duration: 3000,
      });

      return;
    }

    if (nota < 0) {
      this.snackBar.open('A nota não pode ser menor que zero.', 'Fechar', {
        duration: 3000,
      });

      return;
    }

    if (nota > notaMaxima) {
      this.snackBar.open(
        `A nota não pode ser maior que ${notaMaxima}.`,
        'Fechar',
        {
          duration: 3000,
        },
      );

      return;
    }

    const professorLancamento = upper(this.notaForm.value.professorLancamento);

    if (!professorLancamento) {
      this.notaForm.markAllAsTouched();

      this.snackBar.open('Informe o professor.', 'Fechar', {
        duration: 3000,
      });

      return;
    }

    const observacao = upper(this.notaForm.value.observacaoLancamento || '');

    const emRecuperacao = this.estaEmRecuperacao(exame, etapa);

    const nomeAluno = this.getNomeAluno(exame.idAluno);

    const descricaoLancamento = emRecuperacao ? 'nota da recuperação' : 'nota';

    if (this.modoFichaAvaliacao && !this.validarLicoesAvaliadas()) {
      return;
    }

    const mensagem =
      `Deseja realmente salvar a ${descricaoLancamento} ` +
      `${nota} para ${nomeAluno}?`;

    if (!(await this.alertService.confirmar(mensagem))) {
      return;
    }

    let novoStatus: Exames['status'] = 'emAndamento';
    let novaEtapaAtual = etapa.ordem;

    /*
     * Variável específica para a mensagem.
     * Evita o erro de comparação de tipos do TypeScript.
     */
    let entrouEmRecuperacao = false;

    // const etapasAtualizadas = exame.etapas.map((e) => {
    //   /*
    //    * As outras etapas permanecem como estão.
    //    */
    //   if (e.ordem !== etapa.ordem) {
    //     return {
    //       ...e,
    //     };
    //   }

    //   /*
    //    * LANÇAMENTO DA NOTA DE RECUPERAÇÃO
    //    */
    //   if (emRecuperacao) {
    //     const aprovadoNaRecuperacao = nota >= notaMinima;

    //     novoStatus = aprovadoNaRecuperacao ? 'emAndamento' : 'reprovado';

    //     return {
    //       ...e,

    //       notaRecuperacao: nota,
    //       dataRecuperacao: formatarDataString(new Date()),
    //       professorRecuperacao: professorLancamento,
    //       observacaoRecuperacao: observacao,

    //       resultado: aprovadoNaRecuperacao
    //         ? ('aprovado' as const)
    //         : ('reprovado' as const),
    //     };
    //   }

    //   /*
    //    * APROVADO DIRETAMENTE
    //    */
    //   if (nota >= notaMinima) {
    //     novoStatus = 'emAndamento';

    //     return {
    //       ...e,

    //       nota,
    //       resultado: 'aprovado' as const,
    //       dataLancamento: formatarDataString(new Date()),
    //       professorLancamento,
    //       observacaoLancamento: observacao,

    //       notaRecuperacao: null,
    //       dataRecuperacao: '',
    //       professorRecuperacao: '',
    //       observacaoRecuperacao: '',
    //     };
    //   }

    //   /*
    //    * ENTROU EM RECUPERAÇÃO
    //    */
    //   // if (notaMinRecuperacao !== null && nota >= notaMinRecuperacao) {
    //   if (
    //     possuiRecuperacao &&
    //     notaMinRecuperacao !== null &&
    //     nota >= notaMinRecuperacao
    //   ) {
    //     novoStatus = 'recuperacao';
    //     entrouEmRecuperacao = true;

    //     return {
    //       ...e,

    //       nota,
    //       resultado: 'recuperacao' as const,
    //       dataLancamento: formatarDataString(new Date()),
    //       professorLancamento,
    //       observacaoLancamento: observacao,

    //       notaRecuperacao: null,
    //       dataRecuperacao: '',
    //       professorRecuperacao: '',
    //       observacaoRecuperacao: '',
    //     };
    //   }

    //   /*
    //    * REPROVADO DIRETAMENTE
    //    */
    //   novoStatus = 'reprovado';

    //   return {
    //     ...e,

    //     nota,
    //     resultado: 'reprovado' as const,
    //     dataLancamento: formatarDataString(new Date()),
    //     professorLancamento,
    //     observacaoLancamento: observacao,

    //     notaRecuperacao: null,
    //     dataRecuperacao: '',
    //     professorRecuperacao: '',
    //     observacaoRecuperacao: '',
    //   };
    // });

    const montarLicoesAvaliadas = (e: any): LicaoAvaliada[] => {
      if (!this.modoFichaAvaliacao) {
        return e.licoesAvaliadas ?? [];
      }

      return this.licoesAvaliadas.map((licao) => ({
        id: licao.id,
        nomeLicao: upper(licao.nomeLicao),
        somaPontos: licao.somaPontos,
        pontuacaoFinal: Number(licao.pontuacaoFinal.toFixed(2)),
        criterios: licao.criterios.map((criterio) => ({
          idCriterio: criterio.idCriterio,
          nomeCriterio: criterio.nomeCriterio,
          nota: criterio.nota,
        })),
      }));
    };

    const etapasAtualizadas = exame.etapas.map((e) => {
      /*
       * As outras etapas permanecem inalteradas.
       */
      if (e.ordem !== etapa.ordem) {
        return {
          ...e,
        };
      }

      /*
       * LANÇAMENTO DA NOTA DE RECUPERAÇÃO
       */
      if (emRecuperacao) {
        const aprovadoNaRecuperacao = nota >= notaMinima;

        novoStatus = aprovadoNaRecuperacao ? 'emAndamento' : 'reprovado';

        return {
          ...e,

          notaRecuperacao: nota,
          dataRecuperacao: formatarDataString(new Date()),
          professorRecuperacao: professorLancamento,
          observacaoRecuperacao: observacao,

          resultado: aprovadoNaRecuperacao
            ? ('aprovado' as const)
            : ('reprovado' as const),

          licoesAvaliadas: montarLicoesAvaliadas(e),
        };
      }

      /*
       * APROVADO DIRETAMENTE
       */
      if (nota >= notaMinima) {
        novoStatus = 'emAndamento';

        return {
          ...e,

          nota,
          resultado: 'aprovado' as const,
          dataLancamento: formatarDataString(new Date()),
          professorLancamento,
          observacaoLancamento: observacao,

          notaRecuperacao: null,
          dataRecuperacao: '',
          professorRecuperacao: '',
          observacaoRecuperacao: '',

          licoesAvaliadas: montarLicoesAvaliadas(e),
        };
      }

      /*
       * ENTROU EM RECUPERAÇÃO
       */
      if (
        possuiRecuperacao &&
        notaMinRecuperacao !== null &&
        nota >= notaMinRecuperacao
      ) {
        novoStatus = 'recuperacao';
        entrouEmRecuperacao = true;

        return {
          ...e,

          nota,
          resultado: 'recuperacao' as const,
          dataLancamento: formatarDataString(new Date()),
          professorLancamento,
          observacaoLancamento: observacao,

          notaRecuperacao: null,
          dataRecuperacao: '',
          professorRecuperacao: '',
          observacaoRecuperacao: '',

          licoesAvaliadas: montarLicoesAvaliadas(e),
        };
      }

      /*
       * REPROVADO DIRETAMENTE
       */
      novoStatus = 'reprovado';

      return {
        ...e,

        nota,
        resultado: 'reprovado' as const,
        dataLancamento: formatarDataString(new Date()),
        professorLancamento,
        observacaoLancamento: observacao,

        notaRecuperacao: null,
        dataRecuperacao: '',
        professorRecuperacao: '',
        observacaoRecuperacao: '',

        licoesAvaliadas: montarLicoesAvaliadas(e),
      };
    });

    const etapaAtualizada = etapasAtualizadas.find(
      (e) => e.ordem === etapa.ordem,
    );

    /*
     * Só avança quando a etapa foi aprovada.
     */
    if (etapaAtualizada?.resultado === 'aprovado') {
      const proximaEtapa = etapasAtualizadas.find(
        (e) => e.ordem === etapa.ordem + 1,
      );

      if (proximaEtapa) {
        proximaEtapa.resultado = 'pendente';

        novaEtapaAtual = proximaEtapa.ordem;
        novoStatus = 'emAndamento';
      } else {
        novaEtapaAtual = etapa.ordem;
        novoStatus = 'aprovado';
      }
    } else {
      /*
       * Em recuperação ou reprovado, permanece na mesma etapa.
       */
      novaEtapaAtual = etapa.ordem;
    }

    try {
      await this.firestoreService.updateExame(exame.id!, {
        etapas: etapasAtualizadas,
        etapaAtual: novaEtapaAtual,
        status: novoStatus,
      });

      if (!this.tabelaVisivel) {
        this.tabelaVisivel = true;
      }

      let mensagemSucesso = 'Nota salva com sucesso!';

      if (emRecuperacao) {
        mensagemSucesso =
          etapaAtualizada?.resultado === 'aprovado'
            ? 'Nota da recuperação salva. Candidato aprovado!'
            : 'Nota da recuperação salva. Candidato reprovado!';
      } else if (entrouEmRecuperacao) {
        mensagemSucesso = 'Nota salva. Candidato encaminhado para recuperação!';
      } else if (etapaAtualizada?.resultado === 'reprovado') {
        mensagemSucesso = 'Nota salva. Candidato reprovado!';
      } else if (
        etapaAtualizada?.resultado === 'aprovado' &&
        !etapasAtualizadas.some((e) => e.ordem > etapa.ordem)
      ) {
        mensagemSucesso = 'Nota salva. Exame concluído com aprovação!';
      }

      this.snackBar.open(mensagemSucesso, 'Fechar', {
        duration: 4000,
      });

      this.fecharModalNota();
    } catch (error) {
      console.error('Erro ao salvar a nota:', error);

      this.snackBar.open('Erro ao salvar a nota.', 'Fechar', {
        duration: 4000,
      });
    }
  }

  converterNotaParaNumero(valor: any): number {
    if (valor === null || valor === undefined || valor === '') {
      return 0;
    }

    return Number(String(valor).replace(',', '.'));
  }

  private validarLicoesAvaliadas(): boolean {
    if (!this.licoesAvaliadas.length) {
      this.snackBar.open('Adicione pelo menos uma lição.', 'Fechar', {
        duration: 3000,
      });

      return false;
    }

    const possuiLicaoSemNome = this.licoesAvaliadas.some(
      (licao) => !licao.nomeLicao?.trim(),
    );

    if (possuiLicaoSemNome) {
      this.snackBar.open(
        'Informe o nome de todas as lições avaliadas.',
        'Fechar',
        {
          duration: 4000,
        },
      );

      return false;
    }

    const possuiCriterioSemNota = this.licoesAvaliadas.some((licao) =>
      licao.criterios.some(
        (criterio) => criterio.nota === null || criterio.nota === undefined,
      ),
    );

    if (possuiCriterioSemNota) {
      this.snackBar.open(
        'Avalie todos os critérios de todas as lições.',
        'Fechar',
        {
          duration: 4000,
        },
      );

      return false;
    }

    return true;
  }

  cancelarExame(exame: Exames): void {
    // console.log('CLICOU CANCELAR', exame);

    this.mostrarModal = false;
    this.mostrarModalNota = false;

    this.exameCancelamento = exame;
    this.cancelamentoForm.reset();

    setTimeout(() => {
      this.mostrarModalCancelamento = true;
    });
  }

  // SELECIONAR
  aoSelecionarExamesOf(lista: ExameTabela[]): void {
    this.examesSelecionados = lista;
  }

  aoSelecionarExames(selecionados: Exames[]): void {
    this.examesSelecionados = selecionados;

    this.exameSelecionado =
      selecionados.length === 1 ? (selecionados[0] as ExameTabela) : null;
  }

  podeSelecionarExame = (item: Exames): boolean => {
    return this.liberaEditar && item.status === 'solicitado';
  };

  get podeAceitarSelecionados(): boolean {
    return (
      this.examesSelecionados.length > 0 &&
      this.examesSelecionados.every((item) => item.status === 'solicitado') &&
      this.liberaEditar
    );
  }

  get exameSelecionadoUnico(): ExameTabela | null {
    return this.examesSelecionados.length === 1
      ? this.examesSelecionados[0]
      : null;
  }

  get podeEditar(): boolean {
    const item = this.exameSelecionadoUnico;

    return !!(
      item &&
      !this.isMobile &&
      this.liberaEditar &&
      item.status !== 'cancelado'
    );
  }

  // get podeAlterarNota(): boolean {
  //   const item = this.exameSelecionadoUnico;

  //   return !!(
  //     item &&
  //     !this.isMobile &&
  //     this.liberaEditar &&
  //     item.status !== 'cancelado' &&
  //     item.status !== 'solicitado' &&
  //     item.etapas?.some((e) => e.nota !== null)
  //   );
  // }

  get podeAlterarNota(): boolean {
    const item = this.exameSelecionadoUnico;

    return !!(
      item &&
      !this.isMobile &&
      this.liberaEditar &&
      item.status !== 'cancelado' &&
      item.status !== 'solicitado' &&
      item.etapas?.some(
        (etapa) => etapa.nota !== null || etapa.notaRecuperacao !== null,
      )
    );
  }

  get podeCancelar(): boolean {
    const item = this.exameSelecionadoUnico;

    return !!(
      item &&
      !this.isMobile &&
      this.liberaEditar &&
      item.status !== 'cancelado' &&
      item.status !== 'aprovado' &&
      item.status !== 'reprovado'
    );
  }

  get podeExcluir(): boolean {
    const item = this.exameSelecionadoUnico;

    return !!(
      item &&
      !this.isMobile &&
      this.liberaDeletar &&
      item.status === 'solicitado'
    );
  }

  editarSelecionado(): void {
    if (this.exameSelecionadoUnico) {
      this.editar(this.exameSelecionadoUnico);
    }
  }

  alterarNotaSelecionado(): void {
    if (this.exameSelecionadoUnico) {
      this.alterarNota(this.exameSelecionadoUnico);
    }
  }

  cancelarSelecionado(): void {
    if (this.exameSelecionadoUnico) {
      this.cancelarExame(this.exameSelecionadoUnico);
    }
  }

  excluirSelecionado(): void {
    if (this.exameSelecionadoUnico) {
      this.excluir(this.exameSelecionadoUnico);
    }
  }

  abrirAceiteEmLote(): void {
    if (!this.podeAceitarSelecionados) {
      this.snackBar.open(
        'Selecione apenas solicitações com status SOLICITADO.',
        'Fechar',
        { duration: 3000 },
      );
      return;
    }

    this.aceiteForm.reset();

    this.listaGrupoExamesFiltrada = this.gruposExames
      .filter(
        (grupo) =>
          !grupo.concluido &&
          this.auth.temAcessoAoRegistro({
            idSetor: grupo.idSetor,
            idComum: grupo.idComum,
          }) &&
          this.examesSelecionados.every((exame) =>
            this.grupoCompativelComExame(grupo, exame),
          ),
      )
      .map((g) => ({
        value: g.id!,
        label: `${g.grupoExame} - ${g.descricao}`,
      }));

    if (!this.listaGrupoExamesFiltrada.length) {
      this.snackBar.open(
        'Nenhum grupo de avaliação é compatível com todas as solicitações selecionadas.',
        'Fechar',
        { duration: 4000 },
      );
      return;
    }

    this.mostrarModalAceiteLote = true;
  }

  fecharModalAceiteLote(): void {
    this.mostrarModalAceiteLote = false;
    this.listaGrupoExamesFiltrada = [];
    this.aceiteForm.reset();
    this.limparSelecaoExames();
  }

  async confirmarAceiteEmLote(): Promise<void> {
    if (!this.aceiteForm.valid) {
      this.aceiteForm.markAllAsTouched();
      return;
    }

    const grupoSelecionado = this.gruposExames.find(
      (g) => g.id === this.aceiteForm.value.idGrupoExame,
    );

    if (!grupoSelecionado) {
      this.snackBar.open('Grupo de avaliação não encontrado.', 'Fechar', {
        duration: 3000,
      });
      return;
    }

    const examesValidos = this.examesSelecionados.filter(
      (exame) => this.criarEtapasPorGrupo(grupoSelecionado, exame).length > 0,
    );

    if (!examesValidos.length) {
      this.snackBar.open(
        'Nenhuma solicitação selecionada é compatível com esse grupo.',
        'Fechar',
        { duration: 4000 },
      );
      return;
    }

    const confirmacao = await this.alertService.confirmar(
      `Deseja realmente aceitar ${examesValidos.length} solicitação(ões)?`,
    );

    if (!confirmacao) return;

    await Promise.all(
      examesValidos.map((exame) => {
        const etapasLimpas = this.criarEtapasPorGrupo(grupoSelecionado, exame);

        return this.firestoreService.updateExame(exame.id!, {
          idGrupoExame: grupoSelecionado.id!,
          etapas: etapasLimpas,
          etapaAtual: 1,
          status: 'agendado',
        });
      }),
    );

    this.snackBar.open('Solicitações aceitas com sucesso!', 'Fechar', {
      duration: 4000,
    });

    this.examesSelecionados = [];
    this.fecharModalAceiteLote();
  }

  private atualizarSelecaoAposCarregar(): void {
    if (!this.examesSelecionados.length) {
      this.exameSelecionado = null;
      return;
    }

    const idsSelecionados = this.examesSelecionados
      .map((item) => item.id)
      .filter((id): id is string => !!id);

    /*
     * Substitui os objetos antigos pelos objetos atualizados
     * que acabaram de chegar do Firestore.
     */
    this.examesSelecionados = this.dadosTodos.filter(
      (item) => item.id && idsSelecionados.includes(item.id),
    );

    this.exameSelecionado =
      this.examesSelecionados.length === 1
        ? (this.examesSelecionados[0] as ExameTabela)
        : null;
  }

  @ViewChild(TableComponentSelect) tableComponent!: TableComponentSelect;
  limparSelecaoExames(): void {
    this.examesSelecionados = [];
    this.tableComponent?.limparSelecao();
  }
  // FIM SELECIONAR

  async confirmarAceite(): Promise<void> {
    if (!this.aceiteForm.valid || !this.exameAceite) {
      this.aceiteForm.markAllAsTouched();
      return;
    }

    const grupoSelecionado = this.gruposExames.find(
      (g) => g.id === this.aceiteForm.value.idGrupoExame,
    );

    if (!grupoSelecionado) {
      this.snackBar.open('Grupo de avaliação não encontrado.', 'Fechar', {
        duration: 3000,
      });
      return;
    }

    const etapas = this.criarEtapasPorGrupo(grupoSelecionado, this.exameAceite);

    if (!etapas.length) {
      this.snackBar.open(
        'Esse grupo não possui configuração para o tipo/período solicitado.',
        'Fechar',
        { duration: 4000 },
      );
      return;
    }

    await this.firestoreService.updateExame(this.exameAceite.id!, {
      idGrupoExame: grupoSelecionado.id!,
      etapas,
      etapaAtual: 1,
      status: 'agendado',
    });

    this.snackBar.open('Solicitação aceita com sucesso!', 'Fechar', {
      duration: 4000,
    });

    this.fecharModalAceite();
  }

  async confirmarCancelamento(): Promise<void> {
    if (!this.cancelamentoForm.valid || !this.exameCancelamento) {
      this.cancelamentoForm.markAllAsTouched();
      return;
    }

    const nomeAluno = this.getNomeAluno(this.exameCancelamento.idAluno);
    const mensagem = `Deseja realmente cancelar o exame de ${nomeAluno}?`;

    if (!(await this.alertService.confirmar(mensagem))) return;

    const motivo = upper(this.cancelamentoForm.value.motivoCancelamento);

    try {
      await this.firestoreService.updateExame(this.exameCancelamento.id!, {
        status: 'cancelado',

        motivoCancelamento: motivo,

        dataCancelamento: formatarDataString(new Date()),

        usuarioCancelamento: this.auth.usuario?.nome || 'NÃO IDENTIFICADO',
      });

      this.snackBar.open('Exame cancelado com sucesso!', 'Fechar', {
        duration: 4000,
      });

      this.fecharModalCancelamento();
    } catch (error) {
      console.error(error);

      this.snackBar.open('Erro ao cancelar exame.', 'Fechar', {
        duration: 4000,
      });
    }
  }

  alterarNota(exame: ExameTabela): void {
    const etapasComNota = exame.etapas.filter((e) => e.nota !== null);

    if (!etapasComNota.length) {
      this.snackBar.open('Nenhuma nota lançada para alterar.', 'Fechar', {
        duration: 3000,
      });
      return;
    }

    const ultimaEtapaLancada = etapasComNota[etapasComNota.length - 1];

    const configEtapa = this.buscarAvaliacaoDoGrupo(
      exame,
      ultimaEtapaLancada.ordem,
    );

    if (!configEtapa) {
      this.snackBar.open(
        'Configuração da etapa não encontrada no grupo.',
        'Fechar',
        {
          duration: 3000,
        },
      );
      return;
    }

    this.exameSelecionado = exame;
    this.etapaSelecionada = ultimaEtapaLancada;
    this.configEtapaSelecionada = configEtapa;

    this.notaForm.patchValue({
      nota: ultimaEtapaLancada.nota,
      professorLancamento:
        ultimaEtapaLancada.professorLancamento || this.auth.usuario?.nome || '',
    });

    this.mostrarModalNota = true;
  }

  // async excluirNota(): Promise<void> {
  //   if (!this.exameSelecionado || !this.etapaSelecionada) return;

  //   const exame = this.exameSelecionado;
  //   const etapa = this.etapaSelecionada;

  //   const nomeAluno = this.getNomeAluno(exame.idAluno);
  //   const mensagem = `Deseja realmente excluir a nota de ${nomeAluno}?`;

  //   if (!(await this.alertService.confirmar(mensagem))) return;

  //   const etapasAtualizadas = exame.etapas.map((e) => {
  //     if (e.ordem < etapa.ordem) {
  //       return {
  //         ordem: e.ordem,
  //         nota: e.nota ?? null,
  //         resultado: e.resultado,
  //         dataLancamento: e.dataLancamento || '',
  //         professorLancamento: e.professorLancamento || '',
  //         observacaoLancamento: e.observacaoLancamento || '',
  //       };
  //     }

  //     if (e.ordem === etapa.ordem) {
  //       return {
  //         ordem: e.ordem,
  //         nota: null,
  //         resultado: 'pendente' as const,
  //         dataLancamento: '',
  //         professorLancamento: '',
  //         observacaoLancamento: '',
  //       };
  //     }

  //     return {
  //       ordem: e.ordem,
  //       nota: null,
  //       resultado: 'bloqueado' as const,
  //       dataLancamento: '',
  //       professorLancamento: '',
  //       observacaoLancamento: '',
  //     };
  //   });

  //   const existeAlgumaNota = etapasAtualizadas.some((e) => e.nota !== null);

  //   let novoStatus: Exames['status'];

  //   if (!existeAlgumaNota) {
  //     novoStatus = exame.idGrupoExame ? 'agendado' : 'solicitado';
  //   } else {
  //     novoStatus = 'emAndamento';
  //   }

  //   await this.firestoreService.updateExame(exame.id!, {
  //     etapas: etapasAtualizadas,
  //     etapaAtual: etapa.ordem,
  //     status: novoStatus,
  //   });

  //   this.snackBar.open('Nota excluída com sucesso!', 'Fechar', {
  //     duration: 4000,
  //   });

  //   this.fecharModalNota();
  // }

  async excluirNota(): Promise<void> {
    const exame = this.exameSelecionado;

    if (!exame?.id) return;

    const etapasOrdenadas = [...exame.etapas].sort((a, b) => b.ordem - a.ordem);

    const ultimaEtapa = etapasOrdenadas.find(
      (etapa) =>
        (etapa.notaRecuperacao !== null &&
          etapa.notaRecuperacao !== undefined) ||
        (etapa.nota !== null && etapa.nota !== undefined),
    );

    if (!ultimaEtapa) {
      this.snackBar.open('Não existe nenhuma nota para excluir.', 'Fechar', {
        duration: 3000,
      });
      return;
    }

    // const configUltimaEtapa = this.buscarAvaliacaoDoGrupo(
    //   exame,
    //   ultimaEtapa.ordem,
    // );

    // const etapaPratica =
    //   configUltimaEtapa?.nome
    //     ?.toLocaleUpperCase('pt-BR')
    //     .includes('PRÁTICA') === true;

    const temNotaRecuperacao =
      ultimaEtapa.notaRecuperacao !== null &&
      ultimaEtapa.notaRecuperacao !== undefined;

    const nomeAluno = this.getNomeAluno(exame.idAluno);

    const confirmou = await this.alertService.confirmar(
      temNotaRecuperacao
        ? `Deseja excluir a nota da recuperação de ${nomeAluno}?`
        : `Deseja excluir a nota da etapa ${ultimaEtapa.ordem} de ${nomeAluno}?`,
    );

    if (!confirmou) return;

    /*
     * Se existe nota de recuperação, exclui somente ela.
     * A nota original permanece e o aluno volta para recuperação.
     */
    if (temNotaRecuperacao) {
      const etapasAtualizadas = exame.etapas.map((etapa) =>
        etapa.ordem === ultimaEtapa.ordem
          ? {
              ...etapa,
              resultado: 'recuperacao' as const,
              notaRecuperacao: null,
              dataRecuperacao: '',
              professorRecuperacao: '',
              observacaoRecuperacao: '',
            }
          : { ...etapa },
      );

      await this.firestoreService.updateExame(exame.id, {
        etapas: etapasAtualizadas,
        etapaAtual: ultimaEtapa.ordem,
        status: 'recuperacao',
      });

      this.snackBar.open(
        'Nota da recuperação excluída com sucesso!',
        'Fechar',
        { duration: 4000 },
      );

      this.fecharModalNota();
      return;
    }

    /*
     * Procura a etapa anterior antes de limpar a última.
     */
    const etapaAnterior = etapasOrdenadas.find(
      (etapa) =>
        etapa.ordem < ultimaEtapa.ordem &&
        etapa.nota !== null &&
        etapa.nota !== undefined,
    );

    const novaEtapaAtual = ultimaEtapa.ordem;

    const etapasAtualizadas = exame.etapas.map((etapa) => {
      // A etapa cuja nota foi excluída fica pendente.
      if (etapa.ordem === ultimaEtapa.ordem) {
        return {
          ...etapa,

          nota: null,
          resultado: 'pendente' as const,
          dataLancamento: '',
          professorLancamento: '',
          observacaoLancamento: '',

          notaRecuperacao: null,
          dataRecuperacao: '',
          professorRecuperacao: '',
          observacaoRecuperacao: '',
    licoesAvaliadas: [],
        };
      }

      // Etapas posteriores ficam bloqueadas.
      if (etapa.ordem > novaEtapaAtual) {
        return {
          ...etapa,

          nota: null,
          resultado: 'bloqueado' as const,
          dataLancamento: '',
          professorLancamento: '',
          observacaoLancamento: '',

          notaRecuperacao: null,
          dataRecuperacao: '',
          professorRecuperacao: '',
          observacaoRecuperacao: '',
    licoesAvaliadas: [],

        };
      }

      return { ...etapa };
    });

    const statusAtualizado: Exames['status'] = etapaAnterior
      ? 'emAndamento'
      : exame.idGrupoExame
        ? 'agendado'
        : 'solicitado';

    await this.firestoreService.updateExame(exame.id, {
      etapas: etapasAtualizadas,
      etapaAtual: novaEtapaAtual,
      status: statusAtualizado,
    });

    const exameAtualizado: ExameTabela = {
      ...exame,
      etapas: etapasAtualizadas,
      etapaAtual: novaEtapaAtual,
      status: statusAtualizado,
    };

    this.exameSelecionado = exameAtualizado;

    this.examesSelecionados = this.examesSelecionados.map((item) =>
      item.id === exameAtualizado.id ? exameAtualizado : item,
    );

    this.snackBar.open(
      `Nota excluída. A etapa ${novaEtapaAtual} está disponível para novo lançamento.`,
      'Fechar',
      { duration: 4000 },
    );

    this.fecharModalNota();
  }

  async excluir(exame: Exames): Promise<void> {
    const confirmacao = await this.alertService.confirmar(
      `Tem certeza que deseja excluir o exame de "${(exame as any).nomeAluno}"?`,
    );

    if (!confirmacao) return;

    if (exame.id) {
      await this.firestoreService.deleteExame(exame.id);
      this.snackBar.open('Exame excluído com sucesso!', 'Fechar', {
        duration: 4000,
      });
    }
  }

  fecharModalAceite(): void {
    this.mostrarModalAceite = false;
    this.exameAceite = null;
    this.listaGrupoExamesFiltrada = [];
    this.aceiteForm.reset();
  }

  fecharModal(): void {
    this.mostrarModal = false;
    this.dadosForms.reset();
    this.dadosParaEditar = null;
  }

  // fecharModalNota(): void {
  //   this.mostrarModalNota = false;
  //   this.exameSelecionado = null;
  //   this.etapaSelecionada = null;
  //   this.notaForm.reset();
  // }

  fecharModalNota(): void {
    this.mostrarModalNota = false;
    this.notaForm.reset({
      professorLancamento: this.auth.usuario?.nome ?? '',
      nota: null,
      observacaoLancamento: '',
    });

    this.exameSelecionado = null;
    this.etapaSelecionada = null;
    this.configEtapaSelecionada = null;
    this.notaForm.reset();
  }

  fecharModalCancelamento(): void {
    this.mostrarModalCancelamento = false;

    this.exameCancelamento = null;

    this.cancelamentoForm.reset();
  }

  // fecharModalAgendamentoEtapa(): void {
  //   this.mostrarModalAgendamentoEtapa = false;
  //   this.exameAgendamentoEtapa = null;
  //   this.etapaAgendamento = null;
  //   this.agendamentoEtapaForm.reset();
  // }
}
