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
  Candidatos,
  Exames,
  FirestoreService,
  GrupoExames,
  Instrumentos,
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
    //     {
    //       label: '📝',
    //       descricao: 'Lançar nota',
    //       classe: 'acao-editar',
    //       visivel: (item: Exames) => {
    //         const avaliacaoGrupo = this.buscarAvaliacaoDoGrupo(
    //           item,
    //           item.etapaAtual,
    //         );

    //         return (
    //           this.liberaEditar &&
    //           item.status !== 'solicitado' &&
    //           item.status !== 'aprovado' &&
    //           item.status !== 'reprovado' &&
    //           item.status !== 'cancelado' &&
    //           !!avaliacaoGrupo?.dataAvaliacao
    //         );
    //       },
    //       callback: (item: ExameTabela) => this.lancarNota(item),
    //     },
    // {
    //   label: '📄',
    //   descricao: 'Ficha de avaliação',
    //   classe: 'acao-editar',
    //   visivel: (item: ExameTabela) =>
    //     item.etapaAtualLabel === 'PARTE PRÁTICA',

    //   callback: (item: ExameTabela) => this.abrirFichaAvaliacao(item),
    // },
    // {
    //   label: '📅',
    //   descricao: 'Agendar etapa',
    //   classe: 'acao-editar',
    //   visivel: (item: Exames) => {
    //     const etapaAtual = item.etapas?.find(
    //       (e) => e.ordem === item.etapaAtual,
    //     );
    //     return (
    //       (!this.isMobile || !etapaAtual?.dataAgendada) &&
    //       this.liberaEditar &&
    //       item.status !== 'cancelado' &&
    //       item.status !== 'aprovado' &&
    //       item.status !== 'reprovado'
    //     );
    //   },
    //   callback: (item: Exames) => this.agendarEtapa(item),
    // },
    // {
    //   label: '✅',
    //   descricao: 'Aceitar solicitação',
    //   classe: 'acao-editar',
    //   visivel: (item: Exames) =>
    //     this.liberaEditar && item.status === 'solicitado',
    //   callback: (item: Exames) => this.abrirAceite(item),
    // },
    // {
    //   label: '🔄',
    //   descricao: 'Alterar nota',
    //   classe: 'acao-editar',
    //   visivel: (item: Exames) =>
    //     !this.isMobile &&
    //     this.liberaEditar &&
    //     item.status !== 'cancelado' &&
    //     item.status !== 'solicitado' &&
    //     item.etapas?.some((e) => e.nota !== null),

    //   callback: (item: Exames) => this.alterarNota(item),
    // },
    // {
    //   label: '✏️',
    //   descricao: 'Editar',
    //   classe: 'acao-editar',
    //   visivel: (item: Exames) =>
    //     !this.isMobile && this.liberaEditar && item.status !== 'cancelado',
    //   callback: (item: Exames) => this.editar(item),
    // },
    // {
    //   label: '🚫',
    //   descricao: 'Cancelar',
    //   classe: 'acao-cancelar',
    //   visivel: (item: Exames) =>
    //     !this.isMobile &&
    //     this.liberaEditar &&
    //     item.status !== 'cancelado' &&
    //     item.status !== 'aprovado' &&
    //     item.status !== 'reprovado',
    //   callback: (item: Exames) => this.cancelarExame(item),
    // },
    // {
    //   label: '🗑️',
    //   descricao: 'Excluir',
    //   classe: 'acao-excluir',
    //   visivel: (item: Exames) =>
    //     !this.isMobile && this.liberaDeletar && item.status === 'solicitado',
    //   callback: (item: Exames) => this.excluir(item),
    // },
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
  ]).subscribe(([exames, alunos, igrejas, grupos]) => {
    this.gruposExames = grupos;

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

        const comum = igrejas.find(
          (i) => i.id === alunoFiltro?.idComum,
        );

        const avaliacaoGrupo = this.buscarAvaliacaoDoGrupo(
          exame,
          exame.etapaAtual,
        );

        return {
          ...exame,

          idadeAluno: this.calcularIdade(
            alunoFiltro?.dataNascimento,
          ),

          instrumentoAluno: alunoFiltro?.idInstrumento || '',
          afinacaoAluno: alunoFiltro?.afinacao || '',

          idComum: alunoFiltro?.idComum || '',

          comum:
            comum?.nomeCongregacao?.toLocaleUpperCase('pt-BR') ||
            '',

          dataSolicitacao: converterISOParaBR(
            exame.dataSolicitacao || '',
          ),

          dataAgendada: converterISOParaBR(
            avaliacaoGrupo?.dataAvaliacao || '',
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
          lista.findIndex(
            (outro) => outro.value === item.value,
          ) === index,
      )
      .sort((a, b) =>
        a.label.localeCompare(b.label, 'pt-BR'),
      );

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

      const tipo = (a.tipoExame || '').localeCompare(
        b.tipoExame || '',
      );

      if (tipo !== 0) {
        return tipo;
      }

      const categoria = (
        a.categoriaExame || ''
      ).localeCompare(b.categoriaExame || '');

      if (categoria !== 0) {
        return categoria;
      }

      return (a.nomeAluno || '').localeCompare(
        b.nomeAluno || '',
      );
    });

    this.aplicarFiltroStatus();
  });
}

  buscarPesquisa(): void {
    this.aplicarFiltroStatus();
    this.limparSelecaoExames();
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

  abrirFichaAvaliacao(exame: ExameTabela): void {
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

    this.notaForm.reset();

    this.notaForm.patchValue({
      nota: etapa.nota ?? '',
      professorLancamento:
        etapa.professorLancamento || this.auth.usuario?.nome || '',
      observacaoLancamento: etapa.observacaoLancamento || '',
    });

    this.avaliacaoFicha = {
      pulsacao: null,
      leituraMusical: null,
      movimentoConducao: null,
    };

    this.somaPontosFicha = '';
    this.pontuacaoFinalFicha = '';
    this.resultadoFicha = '';

    this.tabelaVisivel = false;
  }

  voltarTabela(): void {
    this.tabelaVisivel = true;
    this.exameSelecionado = null;
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
  // aplicarFiltroStatus(): void {
  //   if (this.statusFiltro === 'TODOS') {
  //     this.dados = [...this.dadosTodos];
  //     return;
  //   }

  //   this.dados = this.dadosTodos.filter(
  //     (item) => item.status === this.statusFiltro,
  //   );
  //   this.paginaAtual = 1;
  // }

  // aplicarFiltroStatus(): void {
  //   let dadosFiltrados = [...this.dadosTodos];

  //   // Filtro por status
  //   if (this.statusFiltro !== 'TODOS') {
  //     dadosFiltrados = dadosFiltrados.filter(
  //       (item) => item.status === this.statusFiltro,
  //     );
  //   }

  //   // Filtro por pesquisa
  //   if (this.pesquisa.trim()) {
  //     const termo = this.pesquisa.trim().toLocaleUpperCase('pt-BR');

  //     dadosFiltrados = dadosFiltrados.filter(
  //       (item) =>
  //         item.nomeAluno?.includes(termo) ||
  //         item.idadeAluno?.includes(termo) ||
  //         item.tipoExameLabel?.toLocaleUpperCase('pt-BR').includes(termo) ||
  //         item.categoriaExameLabel
  //           ?.toLocaleUpperCase('pt-BR')
  //           .includes(termo) ||
  //         item.statusLabel?.toLocaleUpperCase('pt-BR').includes(termo) ||
  //         item.etapaAtualLabel?.toLocaleUpperCase('pt-BR').includes(termo) ||
  //         item.dataSolicitacao?.includes(termo) ||
  //         item.dataAgendada?.includes(termo),
  //     );
  //   }

  //   this.dados = dadosFiltrados;
  //   this.paginaAtual = 1;
  // }

  // aplicarFiltroStatus(): void {
  //   let dadosFiltrados = [...this.dadosTodos];

  //   // Filtro por status
  //   if (this.statusFiltro !== 'TODOS') {
  //     dadosFiltrados = dadosFiltrados.filter(
  //       (item) => item.status === this.statusFiltro,
  //     );
  //   }

  //   // Filtro por categoria
  //   if (this.statusCategorias !== 'TODOS') {
  //     dadosFiltrados = dadosFiltrados.filter(
  //       (item) => item.categoriaExame === this.statusCategorias,
  //     );
  //   }

  //   // Filtro por pesquisa
  //   if (this.pesquisa.trim()) {
  //     const termo = this.pesquisa.trim().toLocaleUpperCase('pt-BR');

  //     dadosFiltrados = dadosFiltrados.filter(
  //       (item) =>
  //         item.nomeAluno?.includes(termo) ||
  //         item.idadeAluno?.includes(termo) ||
  //         item.comum?.includes(termo) ||
  //         item.tipoExameLabel?.toLocaleUpperCase('pt-BR').includes(termo) ||
  //         item.categoriaExameLabel
  //           ?.toLocaleUpperCase('pt-BR')
  //           .includes(termo) ||
  //         item.statusLabel?.toLocaleUpperCase('pt-BR').includes(termo) ||
  //         item.etapaAtualLabel?.toLocaleUpperCase('pt-BR').includes(termo) ||
  //         item.dataSolicitacao?.includes(termo) ||
  //         item.dataAgendada?.includes(termo),
  //     );
  //   }

  //   this.dados = dadosFiltrados;
  //   this.paginaAtual = 1;
  // }

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
      aprovado: 'APROVADO',
      reprovado: 'REPROVADO',
      cancelado: 'CANCELADO',
    };

    return mapa[status] || status;
  }

  // criarEtapas(tipoExame: string) {
  //   if (tipoExame === 'TEÓRICO') {
  //     return [
  //       {
  //         nome: 'PARTE TEÓRICA',
  //         ordem: 1,
  //         nota: null,
  //         notaMinima: 7,
  //         resultado: 'pendente' as const,
  //         dataAgendada: '',
  //         professorLancamento: '',
  //         dataLancamento: '',
  //       },
  //     ];
  //   }

  //   if (tipoExame === 'PRÁTICO') {
  //     return [
  //       {
  //         nome: 'PARTE PRÁTICA',
  //         ordem: 1,
  //         nota: null,
  //         notaMinima: 7,
  //         resultado: 'pendente' as const,
  //         dataAgendada: '',
  //         professorLancamento: '',
  //         dataLancamento: '',
  //       },
  //     ];
  //   }

  //   return [
  //     {
  //       nome: 'PARTE TEÓRICA',
  //       ordem: 1,
  //       nota: null,
  //       notaMinima: 7,
  //       resultado: 'pendente' as const,
  //       dataAgendada: '',
  //       professorLancamento: '',
  //       dataLancamento: '',
  //     },
  //     {
  //       nome: 'PARTE PRÁTICA',
  //       ordem: 2,
  //       nota: null,
  //       notaMinima: 7,
  //       resultado: 'bloqueado' as const,
  //       dataAgendada: '',
  //       professorLancamento: '',
  //       dataLancamento: '',
  //     },
  //   ];
  // }

  // criarEtapasPorGrupo(grupo: GrupoExames, exame: Exames): any[] {
  //   const periodoGrupo = grupo.periodos?.find(
  //     (p: any) => p.categoriaExame === exame.tipoExame,
  //   );

  //   if (!periodoGrupo) return [];

  //   const etapaPeriodo = periodoGrupo.etapas?.find(
  //     (e: any) => e.tipo === exame.categoriaExame,
  //   );

  //   if (!etapaPeriodo) return [];

  //   return etapaPeriodo.avaliacao.map((a: any) => ({
  //     nome: a.nome,
  //     ordem: a.ordem,
  //     nota: null,
  //     notaMinima: a.notaMinima,
  //     notaMaxima: a.notaMaxima,
  //     resultado: a.bloqueadaInicialmente ? 'bloqueado' : 'pendente',
  //     dataAgendada: a.dataAvaliacao || '',
  //     professorLancamento: '',
  //     dataLancamento: '',
  //   }));
  // }

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

  async onSalvar(): Promise<void> {
    if (!this.dadosForms.valid) {
      this.dadosForms.markAllAsTouched();
      // alert('Formulário inválido. Preencha os campos obrigatórios.');
      this.alertService.erro(
        'Formulário inválido. Preencha os campos obrigatórios.',
      );
      return;
    }

    // const dataAgendada = this.dadosForms.value.dataAgendada
    //   ? formatarDataString(new Date(this.dadosForms.value.dataAgendada))
    //   : '';

    // const baseData: Exames = {
    //   idAluno: this.dadosForms.value.idAluno,
    //   tipoExame: upper(this.dadosForms.value.tipoExame),
    //   categoriaExame: upper(this.dadosForms.value.categoriaExame),
    //   observacao: upper(this.dadosForms.value.observacao),
    //   dataSolicitacao:
    //     this.dadosParaEditar?.dataSolicitacao || formatarDataString(new Date()),
    //   status: 'solicitado',
    //   etapaAtual: 1,
    //   etapas:
    //     this.dadosParaEditar?.etapas ||
    //     this.criarEtapas(upper(this.dadosForms.value.tipoExame)),
    // };

    // if (baseData.dataAgendada) {
    //   baseData.etapas = baseData.etapas.map((e) =>
    //     e.ordem === 1 ? { ...e, dataAgendada: baseData.dataAgendada } : e,
    //   );
    // }

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

    // this.dadosForms.patchValue({
    //   idAluno: exame.idAluno || '',
    //   tipoExameLabel: this.buscarLabel(this.listaTipoExame, exame.tipoExame),
    //   categoriaExameLabel: this.buscarCategoriaExame(
    //     exame.categoriaExame || '',
    //   ),
    //   // tipoExame: exame.tipoExame || '',
    //   // categoriaExame: exame.categoriaExame || '',
    //   // dataAgendada: exame.dataAgendada || '',
    //   // professorResponsavel: exame.professorResponsavel || '',
    //   observacao: exame.observacao || '',
    // });
  }

  // async lancarNota(exame: Exames): Promise<void> {
  //   const etapa = exame.etapas.find((e) => e.ordem === exame.etapaAtual);

  //   if (!etapa) {
  //     this.snackBar.open('Nenhuma etapa disponível.', 'Fechar', {
  //       duration: 3000,
  //     });
  //     return;
  //   }

  //   const notaTexto = prompt(`Informe a nota da etapa: ${etapa.nome}`);

  //   if (notaTexto === null) return;

  //   const nota = Number(notaTexto.replace(',', '.'));

  //   if (isNaN(nota)) {
  //     this.snackBar.open('Nota inválida.', 'Fechar', {
  //       duration: 3000,
  //     });
  //     return;
  //   }

  //   const etapasAtualizadas = exame.etapas.map((e) => {
  //     if (e.ordem !== etapa.ordem) return e;

  //     return {
  //       ...e,
  //       nota,
  //       resultado:
  //         nota >= e.notaMinima ? ('aprovado' as const) : ('reprovado' as const),
  //       dataLancamento: formatarDataString(new Date()),
  //     };
  //   });

  //   let novoStatus: Exames['status'] = 'emAndamento';
  //   let novaEtapaAtual = exame.etapaAtual;

  //   if (nota < etapa.notaMinima) {
  //     novoStatus = 'reprovado';
  //   } else {
  //     const proximaEtapa = etapasAtualizadas.find(
  //       (e) => e.ordem === exame.etapaAtual + 1,
  //     );

  //     if (proximaEtapa) {
  //       novaEtapaAtual = proximaEtapa.ordem;

  //       etapasAtualizadas.forEach((e) => {
  //         if (e.ordem === proximaEtapa.ordem) {
  //           e.resultado = 'pendente';
  //         }
  //       });

  //       novoStatus = 'emAndamento';
  //     } else {
  //       novoStatus = 'aprovado';
  //     }
  //   }

  //   await this.firestoreService.updateExame(exame.id!, {
  //     etapas: etapasAtualizadas,
  //     etapaAtual: novaEtapaAtual,
  //     status: novoStatus,
  //   });

  //   this.snackBar.open('Nota lançada com sucesso!', 'Fechar', {
  //     duration: 4000,
  //   });
  // }

  // lancarNota(exame: Exames): void {
  //   const etapa = exame.etapas.find((e) => e.ordem === exame.etapaAtual);

  //   if (!etapa) {
  //     this.snackBar.open('Nenhuma etapa disponível.', 'Fechar', {
  //       duration: 3000,
  //     });
  //     return;
  //   }
  //   console.log('exame:', exame);
  //   this.exameSelecionado = exame;
  //   this.etapaSelecionada = etapa;
  //   this.notaForm.reset();

  //   this.notaForm.patchValue({
  //     nota: etapa.nota ?? '',
  //     professorLancamento:
  //       etapa.professorLancamento || this.auth.usuario?.nome || '',
  //   });

  //   this.mostrarModalNota = true;
  // }

  // lancarNota(exame: ExameTabela): void {
  //   const etapa = exame.etapas.find((e) => e.ordem === exame.etapaAtual);
  //   if (!etapa) {
  //     this.snackBar.open('Nenhuma etapa disponível.', 'Fechar', {
  //       duration: 3000,
  //     });
  //     return;
  //   }

  //   this.exameSelecionado = exame;
  //   this.etapaSelecionada = etapa;

  //   const notaControl = this.notaForm.get('nota');

  //   const configEtapa = this.buscarAvaliacaoDoGrupo(exame, etapa.ordem);

  //   notaControl?.setValidators([
  //     Validators.required,
  //     Validators.min(0),
  //     Validators.max(configEtapa?.notaMaxima ?? 0),
  //   ]);
  //   // notaControl?.setValidators([
  //   //   Validators.required,
  //   //   Validators.min(0),
  //   //   // Validators.max(etapa.notaMaxima),
  //   // ]);

  //   notaControl?.updateValueAndValidity();

  //   this.notaForm.reset();

  //   this.notaForm.patchValue({
  //     nota: etapa.nota ?? '',
  //     professorLancamento:
  //       etapa.professorLancamento || this.auth.usuario?.nome || '',
  //   });

  //   this.mostrarModalNota = true;
  // }

  podeLancarNota(item: ExameTabela): boolean {
    const avaliacaoGrupo = this.buscarAvaliacaoDoGrupo(item, item.etapaAtual);

    return (
      this.liberaEditar &&
      item.status !== 'solicitado' &&
      item.status !== 'aprovado' &&
      item.status !== 'reprovado' &&
      item.status !== 'cancelado' &&
      !!avaliacaoGrupo?.dataAvaliacao
    );
  }

  lancarNota(exame: ExameTabela): void {
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

    const notaControl = this.notaForm.get('nota');

    notaControl?.setValidators([
      Validators.required,
      Validators.min(0),
      Validators.max(configEtapa.notaMaxima ?? 0),
    ]);

    notaControl?.updateValueAndValidity();

    this.notaForm.reset();

    this.notaForm.patchValue({
      nota: etapa.nota ?? '',
      professorLancamento:
        etapa.professorLancamento || this.auth.usuario?.nome || '',
      observacaoLancamento: etapa.observacaoLancamento || '',
    });

    this.mostrarModalNota = true;
  }

  avaliacaoFicha = {
    pulsacao: null as number | null,
    leituraMusical: null as number | null,
    movimentoConducao: null as number | null,
  };

  calcularNotaFicha(): void {
    const valores = [
      this.avaliacaoFicha.pulsacao,
      this.avaliacaoFicha.leituraMusical,
      this.avaliacaoFicha.movimentoConducao,
    ];

    if (valores.some((v) => v === null)) {
      this.somaPontosFicha = '';
      this.pontuacaoFinalFicha = '';
      this.resultadoFicha = '';
      this.notaForm.patchValue({ nota: '' });
      return;
    }

    const notas = valores as number[];

    const soma = notas.reduce((acc, valor) => acc + valor, 0);

    const notaMinima = Number(this.configEtapaSelecionada?.notaMinima ?? 0);
    const notaMaxima = Number(this.configEtapaSelecionada?.notaMaxima ?? 0);

    const maiorNotaPorCriterio = 10;
    const pontuacaoMaximaFicha = notas.length * maiorNotaPorCriterio;

    const notaFinal = (soma / pontuacaoMaximaFicha) * notaMaxima;

    this.somaPontosFicha = soma.toString();
    this.pontuacaoFinalFicha = notaFinal.toFixed(2).replace('.', ',');
    this.resultadoFicha = notaFinal >= notaMinima ? 'Aprovado' : 'Reprovado';

    this.notaForm.patchValue({
      nota: Number(notaFinal.toFixed(2)),
    });
  }

  // async salvarNota(): Promise<void> {
  //   // if (
  //   //   !this.notaForm.valid ||
  //   //   !this.exameSelecionado ||
  //   //   !this.etapaSelecionada
  //   // ) {
  //   //   this.notaForm.markAllAsTouched();
  //   //   return;
  //   // }

  //   if (!this.exameSelecionado || !this.etapaSelecionada) {
  //     return;
  //   }

  //   const notaDigitada = this.converterNotaParaNumero(this.notaForm.value.nota);
  //   // const notaMaxima = this.etapaSelecionada?.notaMaxima ?? 0;
  //   const configEtapa = this.buscarAvaliacaoDoGrupo(
  //     this.exameSelecionado,
  //     this.etapaSelecionada.ordem,
  //   );

  //   const notaMaxima = configEtapa?.notaMaxima ?? 0;
  //   const notaMinima = configEtapa?.notaMinima ?? 0;

  //   if (notaDigitada > notaMaxima) {
  //     this.snackBar.open(
  //       `A nota não pode ser maior que ${notaMaxima}.`,
  //       'Fechar',
  //       { duration: 3000 },
  //     );
  //     return;
  //   }

  //   if (notaDigitada < 0) {
  //     this.snackBar.open('A nota não pode ser menor que zero.', 'Fechar', {
  //       duration: 3000,
  //     });
  //     return;
  //   }

  //   if (this.notaForm.invalid) {
  //     this.notaForm.markAllAsTouched();
  //     return;
  //   }

  //   const notaVazia =
  //     this.notaForm.value.nota === null ||
  //     this.notaForm.value.nota === undefined ||
  //     this.notaForm.value.nota === '';

  //   if (this.etapaSelecionada.nota === null && notaVazia) {
  //     this.notaForm.markAllAsTouched();
  //     this.snackBar.open('Informe a nota.', 'Fechar', {
  //       duration: 3000,
  //     });
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
  //   const nota = Number(String(this.notaForm.value.nota).replace(',', '.'));

  //   if (isNaN(nota)) {
  //     this.snackBar.open('Nota inválida.', 'Fechar', {
  //       duration: 3000,
  //     });
  //     return;
  //   }

  //   const exame = this.exameSelecionado;
  //   const etapa = this.etapaSelecionada;

  //   const nomeAluno = this.getNomeAluno(exame.idAluno);
  //   const mensagem = `Deseja realmente salvar a nota ${nota} para ${nomeAluno}?`;

  //   // if (!confirmarAcao(mensagem)) return;
  //   if (!(await this.alertService.confirmar(mensagem))) return;

  //   const etapasAtualizadas = exame.etapas.map((e) => {
  //     if (e.ordem !== etapa.ordem) {
  //       /**
  //        * Se estou alterando uma etapa anterior,
  //        * as etapas seguintes precisam ser recalculadas.
  //        */
  //       if (e.ordem > etapa.ordem) {
  //         return {
  //           ...e,
  //           nota: null,
  //           resultado: 'bloqueado' as const,
  //           dataLancamento: '',
  //           professorLancamento: '',
  //         };
  //       }

  //       return e;
  //     }

  //     // return {
  //     //   ...e,
  //     //   nota,
  //     //   resultado: nota >= notaMinima ? 'aprovado' : 'reprovado',
  //     //   // nota >= e.notaMinima ? ('aprovado' as const) : ('reprovado' as const),
  //     //   dataLancamento: formatarDataString(new Date()),
  //     //   professorLancamento,
  //     // };
  //     return {
  //       ...e,
  //       nota,
  //       resultado:
  //         nota >= notaMinima ? ('aprovado' as const) : ('reprovado' as const),
  //       dataLancamento: formatarDataString(new Date()),
  //       professorLancamento,
  //     };
  //   });

  //   let novoStatus: Exames['status'] = 'emAndamento';
  //   let novaEtapaAtual = etapa.ordem;

  //   if (nota < etapa.notaMinima) {
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

  //   // await this.firestoreService.updateExame(exame.id!, {
  //   //   etapas: etapasAtualizadas,
  //   //   etapaAtual: novaEtapaAtual,
  //   //   status: novoStatus,
  //   // });

  //   // this.snackBar.open('Nota salva com sucesso!', 'Fechar', {
  //   //   duration: 4000,
  //   // });

  //   // this.fecharModalNota();
  //   await this.firestoreService.updateExame(exame.id!, {
  //     etapas: etapasAtualizadas,
  //     etapaAtual: novaEtapaAtual,
  //     status: novoStatus,
  //   });

  //   this.etapaSelecionada = etapasAtualizadas.find(
  //     (e) => e.ordem === etapa.ordem,
  //   );

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

    const nota = this.converterNotaParaNumero(this.notaForm.value.nota);
    const notaMinima = configEtapa.notaMinima ?? 0;
    const notaMaxima = configEtapa.notaMaxima ?? 0;

    if (
      this.notaForm.value.nota === null ||
      this.notaForm.value.nota === undefined ||
      this.notaForm.value.nota === ''
    ) {
      this.notaForm.markAllAsTouched();
      this.snackBar.open('Informe a nota.', 'Fechar', {
        duration: 3000,
      });
      return;
    }

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

    const nomeAluno = this.getNomeAluno(exame.idAluno);
    const mensagem = `Deseja realmente salvar a nota ${nota} para ${nomeAluno}?`;

    if (!(await this.alertService.confirmar(mensagem))) return;

    const etapasAtualizadas = exame.etapas.map((e) => {
      if (e.ordem < etapa.ordem) {
        return {
          ordem: e.ordem,
          nota: e.nota ?? null,
          resultado: e.resultado,
          dataLancamento: e.dataLancamento || '',
          professorLancamento: e.professorLancamento || '',
          observacaoLancamento: e.observacaoLancamento || '',
        };
      }

      if (e.ordem === etapa.ordem) {
        return {
          ordem: e.ordem,
          nota,
          resultado:
            nota >= notaMinima ? ('aprovado' as const) : ('reprovado' as const),
          dataLancamento: formatarDataString(new Date()),
          professorLancamento,
          observacaoLancamento: upper(
            this.notaForm.value.observacaoLancamento || '',
          ),
        };
      }

      return {
        ordem: e.ordem,
        nota: null,
        resultado: 'bloqueado' as const,
        dataLancamento: '',
        professorLancamento: '',
        observacaoLancamento: '',
      };
    });

    let novoStatus: Exames['status'] = 'emAndamento';
    let novaEtapaAtual = etapa.ordem;

    if (nota < notaMinima) {
      novoStatus = 'reprovado';
      novaEtapaAtual = etapa.ordem;
    } else {
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
    }

    await this.firestoreService.updateExame(exame.id!, {
      etapas: etapasAtualizadas,
      etapaAtual: novaEtapaAtual,
      status: novoStatus,
    });

    if (this.tabelaVisivel === false) this.tabelaVisivel = true;
    this.snackBar.open('Nota salva com sucesso!', 'Fechar', {
      duration: 4000,
    });

    this.fecharModalNota();
  }

  converterNotaParaNumero(valor: any): number {
    if (valor === null || valor === undefined || valor === '') {
      return 0;
    }

    return Number(String(valor).replace(',', '.'));
  }

  // agendarEtapa(exame: Exames): void {
  //   const etapa = exame.etapas.find((e) => e.ordem === exame.etapaAtual);

  //   if (!etapa) {
  //     this.snackBar.open('Nenhuma etapa atual encontrada.', 'Fechar', {
  //       duration: 3000,
  //     });
  //     return;
  //   }

  //   this.exameAgendamentoEtapa = exame;
  //   this.etapaAgendamento = etapa;

  //   this.agendamentoEtapaForm.patchValue({
  //     dataAgendada: etapa.dataAgendada || '',
  //   });

  //   this.mostrarModalAgendamentoEtapa = true;
  // }

  // agendarEtapa(exame: Exames): void {
  //   const etapa = exame.etapas.find(
  //     (e) => Number(e.ordem) === Number(exame.etapaAtual),
  //   );

  //   if (!etapa) {
  //     this.snackBar.open('Nenhuma etapa atual encontrada.', 'Fechar', {
  //       duration: 3000,
  //     });
  //     return;
  //   }

  //   // console.log('ETAPA ATUAL:', etapa);
  //   // console.log('DATA DA ETAPA:', etapa.dataAgendada);

  //   this.exameAgendamentoEtapa = exame;
  //   this.etapaAgendamento = etapa;

  //   this.agendamentoEtapaForm.reset();

  //   this.mostrarModalAgendamentoEtapa = true;

  //   setTimeout(() => {
  //     this.agendamentoEtapaForm.patchValue({
  //       dataAgendada: etapa.dataAgendada || '',
  //     });
  //   });
  // }

  // async salvarAgendamentoEtapa(): Promise<void> {
  //   if (
  //     // !this.agendamentoEtapaForm.valid ||
  //     !this.exameAgendamentoEtapa ||
  //     !this.etapaAgendamento
  //   ) {
  //     // this.agendamentoEtapaForm.markAllAsTouched();
  //     return;
  //   }

  //   const dataAgendada = formatarDataString(
  //     new Date(this.agendamentoEtapaForm.value.dataAgendada),
  //   );

  //   // const dataAgendada = this.agendamentoEtapaForm.value.dataAgendada;

  //   const exame = this.exameAgendamentoEtapa;
  //   const etapa = this.etapaAgendamento;

  //   const etapasAtualizadas = exame.etapas.map((e) =>
  //     e.ordem === etapa.ordem ? { ...e, dataAgendada } : e,
  //   );

  //   await this.firestoreService.updateExame(exame.id!, {
  //     etapas: etapasAtualizadas,
  //     status: 'agendado',
  //   });

  //   this.snackBar.open('Etapa agendada com sucesso!', 'Fechar', {
  //     duration: 4000,
  //   });

  //   this.fecharModalAgendamentoEtapa();
  // }

  // async cancelarExame(exame: Exames): Promise<void> {
  //   const confirmacao = confirm(
  //     `Deseja realmente cancelar o exame de "${(exame as any).nomeAluno}"?`,
  //   );

  //   if (!confirmacao) return;

  //   try {
  //     await this.firestoreService.updateExame(exame.id!, {
  //       status: 'cancelado',
  //     });

  //     this.snackBar.open('Exame cancelado com sucesso!', 'Fechar', {
  //       duration: 4000,
  //     });
  //   } catch (error) {
  //     console.error(error);

  //     this.snackBar.open('Erro ao cancelar exame.', 'Fechar', {
  //       duration: 4000,
  //     });
  //   }
  // }

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

  get podeAlterarNota(): boolean {
    const item = this.exameSelecionadoUnico;

    return !!(
      item &&
      !this.isMobile &&
      this.liberaEditar &&
      item.status !== 'cancelado' &&
      item.status !== 'solicitado' &&
      item.etapas?.some((e) => e.nota !== null)
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

  // abrirAceiteEmLote(): void {
  //   if (!this.podeAceitarSelecionados) {
  //     this.snackBar.open(
  //       'Selecione apenas solicitações com status SOLICITADO.',
  //       'Fechar',
  //       { duration: 3000 },
  //     );
  //     return;
  //   }

  //   this.aceiteForm.reset();
  //   this.mostrarModalAceiteLote = true;
  // }

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

  // async confirmarAceiteEmLote(): Promise<void> {
  //   if (!this.aceiteForm.valid) {
  //     this.aceiteForm.markAllAsTouched();
  //     return;
  //   }

  //   const grupoSelecionado = this.gruposExames.find(
  //     (g) => g.id === this.aceiteForm.value.idGrupoExame,
  //   );

  //   if (!grupoSelecionado) {
  //     this.snackBar.open('Grupo de avaliação não encontrado.', 'Fechar', {
  //       duration: 3000,
  //     });
  //     return;
  //   }

  //   const examesValidos: Exames[] = [];

  //   for (const exame of this.examesSelecionados) {
  //     const etapas = this.criarEtapasPorGrupo(grupoSelecionado, exame);

  //     if (etapas.length) {
  //       examesValidos.push({ ...exame, etapas });
  //     }
  //   }

  //   if (!examesValidos.length) {
  //     this.snackBar.open(
  //       'Nenhuma solicitação selecionada é compatível com esse grupo.',
  //       'Fechar',
  //       { duration: 4000 },
  //     );
  //     return;
  //   }

  //   const confirmacao = await this.alertService.confirmar(
  //     `Deseja realmente aceitar ${examesValidos.length} solicitação(ões)?`,
  //   );

  //   if (!confirmacao) return;

  //   await Promise.all(
  //     examesValidos.map((exame) =>
  //       this.firestoreService.updateExame(exame.id!, {
  //         idGrupoExame: grupoSelecionado.id!,
  //         etapas: exame.etapas,
  //         etapaAtual: 1,
  //         status: 'agendado',
  //       }),
  //     ),
  //   );

  //   this.snackBar.open('Solicitações aceitas com sucesso!', 'Fechar', {
  //     duration: 4000,
  //   });

  //   this.examesSelecionados = [];
  //   this.fecharModalAceiteLote();
  // }

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

  // alterarNota(exame: Exames): void {
  //   const etapasComNota = exame.etapas.filter((e) => e.nota !== null);

  //   if (!etapasComNota.length) {
  //     this.snackBar.open('Nenhuma nota lançada para alterar.', 'Fechar', {
  //       duration: 3000,
  //     });
  //     return;
  //   }

  //   const ultimaEtapaLancada = etapasComNota[etapasComNota.length - 1];

  //   this.exameSelecionado = exame;
  //   this.etapaSelecionada = ultimaEtapaLancada;

  //   this.notaForm.patchValue({
  //     nota: ultimaEtapaLancada.nota,
  //     professorLancamento:
  //       ultimaEtapaLancada.professorLancamento || this.auth.usuario?.nome || '',
  //   });

  //   this.mostrarModalNota = true;
  // }

  // async excluirNota(): Promise<void> {
  //   if (!this.exameSelecionado || !this.etapaSelecionada) return;

  //   const exame = this.exameSelecionado;
  //   const etapa = this.etapaSelecionada;

  //   const nomeAluno = this.getNomeAluno(exame.idAluno);
  //   const mensagem = `Deseja realmente excluir a nota de ${nomeAluno}?`;

  //   if (!(await this.alertService.confirmar(mensagem))) return;

  //   const etapasAtualizadas = exame.etapas.map((e) => {
  //     if (e.ordem < etapa.ordem) {
  //       return e;
  //     }

  //     if (e.ordem === etapa.ordem) {
  //       return {
  //         // ...e,
  //         nota: null,
  //         resultado: 'pendente' as const,
  //         dataLancamento: '',
  //         professorLancamento: '',
  //       };
  //     }

  //     return {
  //       // ...e,
  //       nota: null,
  //       resultado: 'bloqueado' as const,
  //       dataLancamento: '',
  //       professorLancamento: '',
  //     };
  //   });

  //   // await this.firestoreService.updateExame(exame.id!, {
  //   //   etapas: etapasAtualizadas,
  //   //   etapaAtual: etapa.ordem,
  //   //   status: 'emAndamento',
  //   // });

  //   let novoStatus: Exames['status'];

  //   const existeAlgumaNota = etapasAtualizadas.some((e) => e.nota !== null);

  //   if (!existeAlgumaNota) {
  //     const etapaAtualizada = etapasAtualizadas.find(
  //       (e) => e.ordem === etapa.ordem,
  //     );

  //     // novoStatus = etapaAtualizada?.dataAgendada ? 'agendado' : 'solicitado';
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

  async excluirNota(): Promise<void> {
    if (!this.exameSelecionado || !this.etapaSelecionada) return;

    const exame = this.exameSelecionado;
    const etapa = this.etapaSelecionada;

    const nomeAluno = this.getNomeAluno(exame.idAluno);
    const mensagem = `Deseja realmente excluir a nota de ${nomeAluno}?`;

    if (!(await this.alertService.confirmar(mensagem))) return;

    const etapasAtualizadas = exame.etapas.map((e) => {
      if (e.ordem < etapa.ordem) {
        return {
          ordem: e.ordem,
          nota: e.nota ?? null,
          resultado: e.resultado,
          dataLancamento: e.dataLancamento || '',
          professorLancamento: e.professorLancamento || '',
          observacaoLancamento: e.observacaoLancamento || '',
        };
      }

      if (e.ordem === etapa.ordem) {
        return {
          ordem: e.ordem,
          nota: null,
          resultado: 'pendente' as const,
          dataLancamento: '',
          professorLancamento: '',
          observacaoLancamento: '',
        };
      }

      return {
        ordem: e.ordem,
        nota: null,
        resultado: 'bloqueado' as const,
        dataLancamento: '',
        professorLancamento: '',
        observacaoLancamento: '',
      };
    });

    const existeAlgumaNota = etapasAtualizadas.some((e) => e.nota !== null);

    let novoStatus: Exames['status'];

    if (!existeAlgumaNota) {
      novoStatus = exame.idGrupoExame ? 'agendado' : 'solicitado';
    } else {
      novoStatus = 'emAndamento';
    }

    await this.firestoreService.updateExame(exame.id!, {
      etapas: etapasAtualizadas,
      etapaAtual: etapa.ordem,
      status: novoStatus,
    });

    this.snackBar.open('Nota excluída com sucesso!', 'Fechar', {
      duration: 4000,
    });

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

  // abrirAceite(exame: Exames): void {
  //   this.exameAceite = exame;
  //   this.aceiteForm.reset();
  //   this.mostrarModalAceite = true;
  // }

  // abrirAceite(exame: Exames): void {
  //   this.exameAceite = exame;
  //   this.aceiteForm.reset();

  //   this.listaGrupoExamesFiltrada = this.gruposExames
  //     .filter((grupo) => this.grupoCompativelComExame(grupo, exame))
  //     .map((g) => ({
  //       value: g.id!,
  //       label: `${g.grupoExame} - ${g.descricao}`,
  //     }));

  //   if (!this.listaGrupoExamesFiltrada.length) {
  //     this.snackBar.open(
  //       'Nenhum grupo de avaliação compatível com essa solicitação.',
  //       'Fechar',
  //       { duration: 4000 },
  //     );
  //     return;
  //   }

  //   this.mostrarModalAceite = true;
  // }

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
