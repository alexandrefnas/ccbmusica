import { Component, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DataComponent } from '../../../component/inputs/data/data.component';
import { ButtonComponent } from '../../../component/button/button.component';
import { ModalComponent } from '../../../modal/modal/modal.component';
import { SelectComponent } from '../../../component/inputs/select/select.component';
import { TableComponent } from '../../../component/table/table.component';
import {
  Candidatos,
  Exames,
  FirestoreService,
} from '../../../services/firestore.service';
import { AuthService, PermissoesCRUD } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import {
  confirmarAcao,
  converterISOParaBR,
  formatarDataString,
} from '../../../../shared/shared.service';
import {
  listaPeriodo,
  listaPeriodoPratico,
  listaStatusFiltro,
  listaTipoExame,
  upper,
} from '../../../services/select.service';
import { combineLatest } from 'rxjs';
import { TextComponent } from '../../../component/inputs/text/text.component';

@Component({
  selector: 'tcx-solicitacao',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonComponent,
    ModalComponent,
    SelectComponent,
    TextComponent,
    TableComponent,
  ],
  templateUrl: './solicitacao.component.html',
  styleUrl: './solicitacao.component.css',
})
export class SolicitacaoComponent {
  constructor(
    private fb: FormBuilder,
    private firestoreService: FirestoreService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {
    this.dadosForms = this.fb.group({
      idAluno: ['', Validators.required],
      tipoExame: ['', Validators.required],
      categoriaExame: ['', Validators.required],
      observacao: [''],
    });

    // this.notaForm = this.fb.group({
    //   nota: [''],
    //   professorLancamento: ['', Validators.required],
    // });

    // this.cancelamentoForm = this.fb.group({
    //   motivoCancelamento: ['', Validators.required],
    // });

    // this.agendamentoEtapaForm = this.fb.group({
    //   dataAgendada: ['', Validators.required],
    // });

    // this.liberaEditar = this.permissao('update');
    // this.liberaCriar = this.permissao('create');
    // this.liberaDeletar = this.permissao('delete');
  }

  isMobile = window.innerWidth <= 576;
  converterISOParaBR = converterISOParaBR;

  paginaAtual = 1;
  itensPorPagina = 20;
  filtroStatus = false;


  dadosForms: FormGroup;
  dadosParaEditar: Exames | null = null;

  liberaCriar = false;
  liberaEditar = false;
  liberaDeletar = false;

  title: string = '';
  mostrarModal = false;

  listaAlunos: { value: string; label: string }[] = [];

  listaTipoExame = listaTipoExame;
  listaPeriodo = listaPeriodo;
  listaPratico = listaPeriodoPratico;
 listaStatusFiltro = listaStatusFiltro;

  statusFiltro = 'TODOS';
  dadosTodos: any[] = [];


  camposColunas = [
    'nomeAluno',
    'tipoExameLabel',
    'categoriaExameLabel',
    'dataSolicitacao',
    'dataAgendada',
    'statusLabel',
    'etapaAtualLabel',
  ];

  tituloColunas = {
    nomeAluno: 'Aluno',
    tipoExameLabel: 'Exame',
    categoriaExameLabel: 'Categoria',
    dataSolicitacao: 'Solicitação',
    dataAgendada: 'Agendamento',
    statusLabel: 'Status',
    etapaAtualLabel: 'Etapa Atual',
  };

  alinhamentoColunaTitulo: { [coluna: string]: 'left' | 'center' | 'right' } = {
    nomeAluno: 'center',
    tipoExameLabel: 'center',
    categoriaExameLabel: 'center',
    dataSolicitacao: 'center',
    dataAgendada: 'center',
    statusLabel: 'center',
    etapaAtualLabel: 'center',
  };

  alinhamentoColuna: { [coluna: string]: 'left' | 'center' | 'right' } = {
    nomeAluno: 'left',
    tipoExameLabel: 'center',
    categoriaExameLabel: 'center',
    dataSolicitacao: 'center',
    dataAgendada: 'center',
    statusLabel: 'center',
    etapaAtualLabel: 'center',
  };

  tamanhoColunas = {
    nomeAluno: { width: '24%', minWidth: '160px' },
    tipoExameLabel: { width: '14%' },
    categoriaExameLabel: { width: '18%' },
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
  ];

  dados: any[] = [];

  acoes = [
    {
      label: '✏️',
      descricao: 'Editar',
      classe: 'acao-editar',
      visivel: (item: Exames) =>
        this.liberaEditar && item.status === 'solicitado',
      callback: (item: Exames) => this.editar(item),
    },
    {
      label: '🗑️',
      descricao: 'Excluir',
      classe: 'acao-excluir',
      visivel: (item: Exames) =>
        this.liberaDeletar && item.status === 'solicitado',
      callback: (item: Exames) => this.excluir(item),
    },
  ];

  permissao(tipo: keyof PermissoesCRUD): boolean {
    return this.auth.temPermissao('solicitacoes', tipo);
  }

  primeiraMaiuscula(texto: string): string {
    if (!texto) return '';

    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
  }

  proximaPagina(): void {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual++;
      // this.limparSelecaoExames();
    }
  }

  paginaAnterior(): void {
    if (this.paginaAtual > 1) {
      this.paginaAtual--;
      // this.limparSelecaoExames();
    }
  }

  get dadosPaginados(): any[] {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;

    return this.dados.slice(inicio, fim);
  }

  get totalPaginas(): number {
  return Math.max(1, Math.ceil(this.dados.length / this.itensPorPagina));
  }

  // @ViewChild(TableComponent) tableComponent!: TableComponent;
  // limparSelecaoExames(): void {
  //   // this.examesSelecionados = [];
  //   this.tableComponent?.limparSelecao();
  // }
  // ngOnInit(): void {
  //   this.carregarAlunos();
  //   this.carregarDados();
  // }

  ngOnInit(): void {
    this.auth.getUsuarioAtualObservable().subscribe((usuario) => {
      if (!usuario) return;

      this.liberaEditar = this.permissao('update');
      this.liberaCriar = this.permissao('create');
      this.liberaDeletar = this.permissao('delete');

      this.carregarAlunos();
      this.carregarDados();
    });
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

  carregarDados(): void {
    combineLatest([
      this.firestoreService.getExames(),
      this.firestoreService.getCandidato(),
    ]).subscribe(([exames, alunos]) => {
      const alunosPermitidos = alunos.filter((a) =>
        this.auth.podeVerRegistro(a, 'candidatos'),
      );

      const idsAlunosPermitidos = alunosPermitidos.map((a) => a.id);

      const dadosExames = exames
        .filter((exame) => idsAlunosPermitidos.includes(exame.idAluno))
        .map((exame) => {
          const alunoFiltro = alunosPermitidos.find(
            (a) => a.id === exame.idAluno,
          );

          const etapaAtual = exame.etapas?.find(
            (e) => e.ordem === exame.etapaAtual,
          );

          return {
            ...exame,
            dataAgendada: converterISOParaBR(etapaAtual?.dataAgendada || ''),
            nomeAluno:
              alunoFiltro?.nomeAluno?.toLocaleUpperCase('pt-BR') ||
              'ALUNO NÃO CADASTRADO',
            // tipoExame: exame.tipoExame?.toLocaleUpperCase('pt-BR') || '',
            // tipoExame: this.buscarLabel(this.listaTipoExame, exame.tipoExame),
            // categoriaExame: this.buscarCategoriaExame(
            //   exame.categoriaExame || '',
            // ),
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
                  : etapaAtual?.nome || 'AGUARDANDO',
          };
        });

      const ordemStatus: Record<string, number> = {
        solicitado: 1,
        agendado: 2,
        emAndamento: 3,
        aprovado: 4,
        reprovado: 5,
        cancelado: 6,
      };

      // this.dados = [...dadosExames].sort((a, b) => {
      this.dadosTodos = [...dadosExames].sort((a, b) => {
        const statusA = ordemStatus[a.status] || 999;
        const statusB = ordemStatus[b.status] || 999;

        if (statusA !== statusB) return statusA - statusB;

        const tipo = (a.tipoExame || '').localeCompare(b.tipoExame || '');
        if (tipo !== 0) return tipo;

        const categoria = (a.categoriaExame || '').localeCompare(
          b.categoriaExame || '',
        );
        if (categoria !== 0) return categoria;

        return (a.nomeAluno || '').localeCompare(b.nomeAluno || '');
      });
      this.aplicarFiltroStatus();
    });
  }

  buscarLabel(
    lista: { value: string; label: string }[],
    value: string,
  ): string {
    return lista.find((item) => item.value === value)?.label || value;
  }

  buscarCategoriaExame(value: string): string {
    return (
      this.listaPeriodo.find((x) => x.value === value)?.label ||
      this.listaPratico.find((x) => x.value === value)?.label ||
      value
    );
  }

  aoSelecionarStatusFiltro(status: string): void {
    this.statusFiltro = status || 'TODOS';
    this.aplicarFiltroStatus();
    // this.limparSelecaoExames();
    this.filtroStatusOp;
  }

  aplicarFiltroStatus(): void {
    if (this.statusFiltro === 'TODOS') {
      this.dados = [...this.dadosTodos];
      return;
    }

    this.dados = this.dadosTodos.filter(
      (item) => item.status === this.statusFiltro,
    );
    this.paginaAtual = 1;
  }

  onSalvar(): void {
    if (!this.dadosForms.valid) {
      this.dadosForms.markAllAsTouched();
      alert('Formulário inválido. Preencha os campos obrigatórios.');
      return;
    }

    // const dataAgendada = this.dadosForms.value.dataAgendada
    //   ? formatarDataString(new Date(this.dadosForms.value.dataAgendada))
    //   : '';

    const baseData: Exames = {
      idAluno: this.dadosForms.value.idAluno,
      tipoExame: upper(this.dadosForms.value.tipoExame),
      categoriaExame: upper(this.dadosForms.value.categoriaExame),
      observacao: upper(this.dadosForms.value.observacao),
      dataSolicitacao:
        this.dadosParaEditar?.dataSolicitacao || formatarDataString(new Date()),
      status: 'solicitado',
      etapaAtual: 0,
      etapas: [],
      // etapas:
      //   this.dadosParaEditar?.etapas ||
      //   this.criarEtapas(upper(this.dadosForms.value.tipoExame)),
    };

    // if (baseData.dataAgendada) {
    //   baseData.etapas = baseData.etapas.map((e) =>
    //     e.ordem === 1 ? { ...e, dataAgendada: baseData.dataAgendada } : e,
    //   );
    // }

    const nomeAluno =
      this.listaAlunos.find((a) => a.value === baseData.idAluno)?.label ||
      'ALUNO';

    const mensagem = this.dadosParaEditar
      ? `Deseja realmente alterar o exame de ${nomeAluno}?`
      : `Deseja realmente solicitar exame para ${nomeAluno}?`;

    if (!confirmarAcao(mensagem)) return;

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

  async excluir(exame: Exames): Promise<void> {
    const confirmacao = confirm(
      `Tem certeza que deseja excluir a solicitação de "${(exame as any).nomeAluno}"?`,
    );

    if (!confirmacao) return;

    if (exame.id) {
      await this.firestoreService.deleteExame(exame.id);
      this.snackBar.open('Solicitação excluída com sucesso!', 'Fechar', {
        duration: 4000,
      });
    }
  }

  fecharModal(): void {
    this.mostrarModal = false;
    this.dadosForms.reset();
    this.dadosParaEditar = null;
  }

  // geters

  get filtroStatusOp(): boolean {
    return (this.filtroStatus = !this.filtroStatus);
  }

  getControl(controlName: string): FormControl {
    const control = this.dadosForms.get(controlName);
    if (!control) {
      throw new Error(`FormControl '${controlName}' não existe no FormGroup`);
    }
    return control as FormControl;
  }

  // getListaCategoriaExame() {
  //   const tipo = this.dadosForms.get('tipoExame')?.value;

  //   if (tipo === '001') {
  //     return this.listaPeriodo;
  //   }

  //   if (tipo === '002') {
  //     return this.listaPratico;
  //   }

  //   return [];
  // }

  getListaCategoriaExame() {
    const tipo = this.dadosForms.get('tipoExame')?.value;

    if (tipo === this.listaTipoExame[0].value) {
      return this.listaPeriodo;
    }

    if (tipo === this.listaTipoExame[1].value) {
      return this.listaPratico;
    }

    return [];
  }

  get liberaAcoes(): boolean {
    const temPermissao = this.liberaEditar || this.liberaDeletar;

    const temItemSolicitado = this.dados.some(
      (item) => item.status === 'solicitado',
    );

    return temPermissao && temItemSolicitado;
  }
  // Fim geters

  criarEtapas(tipoExame: string) {
    // if (tipoExame === 'TEÓRICO') {
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
    //   ];
    // }

    if (tipoExame === this.listaTipoExame[1].value) {
      return [
        {
          nome: this.listaTipoExame[1].label,
          ordem: 1,
          nota: null,
          notaMinima: 7,
          resultado: 'pendente' as const,
          dataAgendada: '',
          professorLancamento: '',
          dataLancamento: '',
        },
      ];
    }

    return [
      {
        nome: 'PARTE TEÓRICA',
        ordem: 1,
        nota: null,
        notaMinima: 7,
        resultado: 'pendente' as const,
        dataAgendada: '',
        professorLancamento: '',
        dataLancamento: '',
      },
      {
        nome: 'PARTE PRÁTICA',
        ordem: 2,
        nota: null,
        notaMinima: 7,
        resultado: 'bloqueado' as const,
        dataAgendada: '',
        professorLancamento: '',
        dataLancamento: '',
      },
    ];
  }
}
/*
  listaTipoExame = [
    { value: '001', label: 'TEÓRICO E PRÁTICO' },
    { value: '002', label: 'TEÓRICO' },
    { value: '003', label: 'PRÁTICO' },
  ];

  listaPeriodo = [
    { value: '101', label: '1º PERÍODO' },
    { value: '102', label: '2º PERÍODO' },
    { value: '103', label: '3º PERÍODO' },
    { value: '104', label: '4º PERÍODO' },
  ];

  listaPratico = [
    {
      value: '1001',
      label: 'REUNIÃO DE JOVENS E MENORES',
    },
    { value: '1002', label: 'CULTO OFICIAL' },
    { value: '1003', label: 'OFICIALIZAÇÃO' },
  ];
*/

// listaTipoExame = [
//   { value: 'TEÓRICO E PRÁTICO', label: 'TEÓRICO E PRÁTICO' },
//   { value: 'TEÓRICO', label: 'TEÓRICO' },
//   { value: 'PRÁTICO', label: 'PRÁTICO' },
// ];

// listaPeriodo = [
//   { value: '1º PERÍODO', label: '1º PERÍODO' },
//   { value: '2º PERÍODO', label: '2º PERÍODO' },
//   { value: '3º PERÍODO', label: '3º PERÍODO' },
//   { value: '4º PERÍODO', label: '4º PERÍODO' },
// ];

// listaPratico = [
//   {
//     value: 'REUNIÃO DE JOVENS E MENORES',
//     label: 'REUNIÃO DE JOVENS E MENORES',
//   },
//   { value: 'CULTO OFICIAL', label: 'CULTO OFICIAL' },
//   { value: 'OFICIALIZAÇÃO', label: 'OFICIALIZAÇÃO' },
// ];

// listaTipoExame = [
//   { value: '001', label: 'TEÓRICO E PRÁTICO' },
//   { value: '002', label: 'PRÁTICO' },
//   // { value: '002', label: 'TEÓRICO' },
// ];

// listaPeriodo = [
//   { value: '101', label: '1º PERÍODO' },
//   { value: '102', label: '2º PERÍODO' },
//   { value: '103', label: '3º PERÍODO' },
//   { value: '104', label: '4º PERÍODO' },
// ];

// listaPratico = [
//   { value: '1001', label: 'REUNIÃO DE JOVENS E MENORES' },
//   { value: '1002', label: 'CULTO OFICIAL' },
//   { value: '1003', label: 'OFICIALIZAÇÃO' },
// ];
