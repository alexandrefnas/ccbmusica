import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
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
import { DataComponent } from '../../../component/inputs/data/data.component';
import { TableComponent } from '../../../component/table/table.component';

import {
  Candidatos,
  Exames,
  FirestoreService,
} from '../../../services/firestore.service';

import { AuthService, PermissoesCRUD } from '../../../services/auth.service';
import {
  confirmarAcao,
  converterISOParaBR,
  formatarDataString,
} from '../../../../shared/shared.service';
import { upper } from '../../../services/select.service';
import { DecimalComponent } from '../../../component/inputs/decimal/decimal.component';

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
    DataComponent,
    TableComponent,
    DecimalComponent,
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
  ) {
    this.notaForm = this.fb.group({
      nota: [''],
      professorLancamento: ['', Validators.required],
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

    this.agendamentoEtapaForm = this.fb.group({
      dataAgendada: ['', Validators.required],
    });

    this.liberaEditar = this.permissao('update');
    this.liberaCriar = this.permissao('create');
    this.liberaDeletar = this.permissao('delete');
  }
  isMobile = window.innerWidth <= 576;
  converterISOParaBR = converterISOParaBR;

  title = 'EXAMES';
  mostrarModal = false;

  dadosForms: FormGroup;
  dadosParaEditar: Exames | null = null;

  liberaEditar = false;
  liberaCriar = false;
  liberaDeletar = false;

  mostrarModalNota = false;
  exameSelecionado: Exames | null = null;
  etapaSelecionada: any | null = null;
  notaForm: FormGroup;

  mostrarModalCancelamento = false;
  exameCancelamento: Exames | null = null;

  cancelamentoForm: FormGroup;

  mostrarModalAgendamentoEtapa = false;
  exameAgendamentoEtapa: Exames | null = null;
  etapaAgendamento: any | null = null;
  agendamentoEtapaForm: FormGroup;

  listaAlunos: { value: string; label: string }[] = [];

  listaTipoExame = [
    { value: 'TEÓRICO E PRÁTICO', label: 'TEÓRICO E PRÁTICO' },
    { value: 'TEÓRICO', label: 'TEÓRICO' },
    { value: 'PRÁTICO', label: 'PRÁTICO' },
  ];

  listaPeriodo = [
    { value: '1º PERÍODO', label: '1º PERÍODO' },
    { value: '2º PERÍODO', label: '2º PERÍODO' },
    { value: '3º PERÍODO', label: '3º PERÍODO' },
    { value: '4º PERÍODO', label: '4º PERÍODO' },
  ];

  listaPratico = [
    {
      value: 'REUNIÃO DE JOVENS E MENORES',
      label: 'REUNIÃO DE JOVENS E MENORES',
    },
    { value: 'CULTO OFICIAL', label: 'CULTO OFICIAL' },
    { value: 'OFICIALIZAÇÃO', label: 'OFICIALIZAÇÃO' },
  ];

  camposColunas = [
    'nomeAluno',
    'tipoExame',
    'categoriaExame',
    'dataSolicitacao',
    'dataAgendada',
    'statusLabel',
    'etapaAtualLabel',
  ];

  tituloColunas = {
    nomeAluno: 'Aluno',
    tipoExame: 'Exame',
    categoriaExame: 'Categoria',
    dataSolicitacao: 'Solicitação',
    dataAgendada: 'Agendamento',
    statusLabel: 'Status',
    etapaAtualLabel: 'Etapa Atual',
  };

  alinhamentoColunaTitulo: { [coluna: string]: 'left' | 'center' | 'right' } = {
    nomeAluno: 'center',
    tipoExame: 'center',
    categoriaExame: 'center',
    dataSolicitacao: 'center',
    dataAgendada: 'center',
    statusLabel: 'center',
    etapaAtualLabel: 'center',
  };

  alinhamentoColuna: { [coluna: string]: 'left' | 'center' | 'right' } = {
    nomeAluno: 'left',
    tipoExame: 'center',
    categoriaExame: 'center',
    dataSolicitacao: 'center',
    dataAgendada: 'center',
    statusLabel: 'center',
    etapaAtualLabel: 'center',
  };

  tamanhoColunas = {
    nomeAluno: { width: '24%' },
    tipoExame: { width: '14%' },
    categoriaExame: { width: '18%' },
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
      label: '📝',
      descricao: 'Lançar nota',
      classe: 'acao-editar',
      visivel: (item: Exames) => {
        const etapaAtual = item.etapas?.find(
          (e) => e.ordem === item.etapaAtual,
        );

        return (
          this.liberaEditar &&
          item.status !== 'solicitado' &&
          item.status !== 'aprovado' &&
          item.status !== 'reprovado' &&
          item.status !== 'cancelado' &&
          !!etapaAtual?.dataAgendada
        );
      },
      callback: (item: Exames) => this.lancarNota(item),
    },
    {
      label: '📅',
      descricao: 'Agendar etapa',
      classe: 'acao-editar',
      visivel: (item: Exames) => {
        const etapaAtual = item.etapas?.find(
          (e) => e.ordem === item.etapaAtual,
        );
        return (
          (!this.isMobile || !etapaAtual?.dataAgendada) &&
          this.liberaEditar &&
          item.status !== 'cancelado' &&
          item.status !== 'aprovado' &&
          item.status !== 'reprovado'
        );
      },
      callback: (item: Exames) => this.agendarEtapa(item),
    },
    {
      label: '🔄',
      descricao: 'Alterar nota',
      classe: 'acao-editar',
      visivel: (item: Exames) =>
        !this.isMobile &&
        this.liberaEditar &&
        item.status !== 'cancelado' &&
        item.status !== 'solicitado' &&
        item.etapas?.some((e) => e.nota !== null),

      callback: (item: Exames) => this.alterarNota(item),
    },
    {
      label: '✏️',
      descricao: 'Editar',
      classe: 'acao-editar',
      visivel: (item: Exames) =>
        !this.isMobile && this.liberaEditar && item.status !== 'cancelado',
      callback: (item: Exames) => this.editar(item),
    },
    {
      label: '🚫',
      descricao: 'Cancelar',
      classe: 'acao-cancelar',
      visivel: (item: Exames) =>
        !this.isMobile &&
        this.liberaEditar &&
        item.status !== 'cancelado' &&
        item.status !== 'aprovado' &&
        item.status !== 'reprovado',
      callback: (item: Exames) => this.cancelarExame(item),
    },
    {
      label: '🗑️',
      descricao: 'Excluir',
      classe: 'acao-excluir',
      visivel: (item: Exames) =>
        !this.isMobile && this.liberaDeletar && item.status === 'solicitado',
      callback: (item: Exames) => this.excluir(item),
    },
  ];

  ngOnInit(): void {
    this.carregarAlunos();
    this.carregarDados();
  }

  permissao(tipo: keyof PermissoesCRUD): boolean {
    return this.auth.temPermissao('exames', tipo);
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

  getListaCategoriaExame() {
    const tipo = this.dadosForms.get('tipoExame')?.value;

    if (tipo === 'TEÓRICO E PRÁTICO') {
      return this.listaPeriodo;
    }

    if (tipo === 'PRÁTICO') {
      return this.listaPratico;
    }

    return [];
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
            tipoExame: exame.tipoExame?.toLocaleUpperCase('pt-BR') || '',
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

      this.dados = [...dadosExames].sort((a, b) => {
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

  criarEtapas(tipoExame: string) {
    if (tipoExame === 'TEÓRICO') {
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
      ];
    }

    if (tipoExame === 'PRÁTICO') {
      return [
        {
          nome: 'PARTE PRÁTICA',
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
      etapaAtual: 1,
      etapas:
        this.dadosParaEditar?.etapas ||
        this.criarEtapas(upper(this.dadosForms.value.tipoExame)),
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
      // dataAgendada: exame.dataAgendada || '',
      // professorResponsavel: exame.professorResponsavel || '',
      observacao: exame.observacao || '',
    });
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

  lancarNota(exame: Exames): void {
    const etapa = exame.etapas.find((e) => e.ordem === exame.etapaAtual);

    if (!etapa) {
      this.snackBar.open('Nenhuma etapa disponível.', 'Fechar', {
        duration: 3000,
      });
      return;
    }

    this.exameSelecionado = exame;
    this.etapaSelecionada = etapa;
    this.notaForm.reset();

    this.notaForm.patchValue({
      nota: etapa.nota ?? '',
      professorLancamento:
        etapa.professorLancamento || this.auth.usuario?.nome || '',
    });

    this.mostrarModalNota = true;
  }

  async salvarNota(): Promise<void> {
    // if (
    //   !this.notaForm.valid ||
    //   !this.exameSelecionado ||
    //   !this.etapaSelecionada
    // ) {
    //   this.notaForm.markAllAsTouched();
    //   return;
    // }

    if (!this.exameSelecionado || !this.etapaSelecionada) {
      return;
    }

    const notaVazia =
      this.notaForm.value.nota === null ||
      this.notaForm.value.nota === undefined ||
      this.notaForm.value.nota === '';

    if (this.etapaSelecionada.nota === null && notaVazia) {
      this.notaForm.markAllAsTouched();
      this.snackBar.open('Informe a nota.', 'Fechar', {
        duration: 3000,
      });
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
    const nota = Number(String(this.notaForm.value.nota).replace(',', '.'));

    if (isNaN(nota)) {
      this.snackBar.open('Nota inválida.', 'Fechar', {
        duration: 3000,
      });
      return;
    }

    const exame = this.exameSelecionado;
    const etapa = this.etapaSelecionada;

    const nomeAluno = this.getNomeAluno(exame.idAluno);
    const mensagem = `Deseja realmente salvar a nota ${nota} para ${nomeAluno}?`;

    if (!confirmarAcao(mensagem)) return;

    const etapasAtualizadas = exame.etapas.map((e) => {
      if (e.ordem !== etapa.ordem) {
        /**
         * Se estou alterando uma etapa anterior,
         * as etapas seguintes precisam ser recalculadas.
         */
        if (e.ordem > etapa.ordem) {
          return {
            ...e,
            nota: null,
            resultado: 'bloqueado' as const,
            dataLancamento: '',
            professorLancamento: '',
          };
        }

        return e;
      }

      return {
        ...e,
        nota,
        resultado:
          nota >= e.notaMinima ? ('aprovado' as const) : ('reprovado' as const),
        dataLancamento: formatarDataString(new Date()),
        professorLancamento,
      };
    });

    let novoStatus: Exames['status'] = 'emAndamento';
    let novaEtapaAtual = etapa.ordem;

    if (nota < etapa.notaMinima) {
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

    // await this.firestoreService.updateExame(exame.id!, {
    //   etapas: etapasAtualizadas,
    //   etapaAtual: novaEtapaAtual,
    //   status: novoStatus,
    // });

    // this.snackBar.open('Nota salva com sucesso!', 'Fechar', {
    //   duration: 4000,
    // });

    // this.fecharModalNota();
    await this.firestoreService.updateExame(exame.id!, {
      etapas: etapasAtualizadas,
      etapaAtual: novaEtapaAtual,
      status: novoStatus,
    });

    this.etapaSelecionada = etapasAtualizadas.find(
      (e) => e.ordem === etapa.ordem,
    );

    this.snackBar.open('Nota salva com sucesso!', 'Fechar', {
      duration: 4000,
    });

    this.fecharModalNota();
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

  agendarEtapa(exame: Exames): void {
    const etapa = exame.etapas.find(
      (e) => Number(e.ordem) === Number(exame.etapaAtual),
    );

    if (!etapa) {
      this.snackBar.open('Nenhuma etapa atual encontrada.', 'Fechar', {
        duration: 3000,
      });
      return;
    }

    // console.log('ETAPA ATUAL:', etapa);
    // console.log('DATA DA ETAPA:', etapa.dataAgendada);

    this.exameAgendamentoEtapa = exame;
    this.etapaAgendamento = etapa;

    this.agendamentoEtapaForm.reset();

    this.mostrarModalAgendamentoEtapa = true;

    setTimeout(() => {
      this.agendamentoEtapaForm.patchValue({
        dataAgendada: etapa.dataAgendada || '',
      });
    });
  }

  async salvarAgendamentoEtapa(): Promise<void> {
    if (
      !this.agendamentoEtapaForm.valid ||
      !this.exameAgendamentoEtapa ||
      !this.etapaAgendamento
    ) {
      this.agendamentoEtapaForm.markAllAsTouched();
      return;
    }

    const dataAgendada = formatarDataString(
      new Date(this.agendamentoEtapaForm.value.dataAgendada),
    );

    // const dataAgendada = this.agendamentoEtapaForm.value.dataAgendada;

    const exame = this.exameAgendamentoEtapa;
    const etapa = this.etapaAgendamento;

    const etapasAtualizadas = exame.etapas.map((e) =>
      e.ordem === etapa.ordem ? { ...e, dataAgendada } : e,
    );

    await this.firestoreService.updateExame(exame.id!, {
      etapas: etapasAtualizadas,
      status: 'agendado',
    });

    this.snackBar.open('Etapa agendada com sucesso!', 'Fechar', {
      duration: 4000,
    });

    this.fecharModalAgendamentoEtapa();
  }

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
    console.log('CLICOU CANCELAR', exame);

    this.mostrarModal = false;
    this.mostrarModalNota = false;

    this.exameCancelamento = exame;
    this.cancelamentoForm.reset();

    setTimeout(() => {
      this.mostrarModalCancelamento = true;
    });
  }

  async confirmarCancelamento(): Promise<void> {
    if (!this.cancelamentoForm.valid || !this.exameCancelamento) {
      this.cancelamentoForm.markAllAsTouched();
      return;
    }

    const nomeAluno = this.getNomeAluno(this.exameCancelamento.idAluno);
    const mensagem = `Deseja realmente cancelar o exame de ${nomeAluno}?`;

    if (!confirmarAcao(mensagem)) return;

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

  alterarNota(exame: Exames): void {
    const etapasComNota = exame.etapas.filter((e) => e.nota !== null);

    if (!etapasComNota.length) {
      this.snackBar.open('Nenhuma nota lançada para alterar.', 'Fechar', {
        duration: 3000,
      });
      return;
    }

    const ultimaEtapaLancada = etapasComNota[etapasComNota.length - 1];

    this.exameSelecionado = exame;
    this.etapaSelecionada = ultimaEtapaLancada;

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

    if (!confirmarAcao(mensagem)) return;

    const etapasAtualizadas = exame.etapas.map((e) => {
      if (e.ordem < etapa.ordem) {
        return e;
      }

      if (e.ordem === etapa.ordem) {
        return {
          ...e,
          nota: null,
          resultado: 'pendente' as const,
          dataLancamento: '',
          professorLancamento: '',
        };
      }

      return {
        ...e,
        nota: null,
        resultado: 'bloqueado' as const,
        dataLancamento: '',
        professorLancamento: '',
      };
    });

    // await this.firestoreService.updateExame(exame.id!, {
    //   etapas: etapasAtualizadas,
    //   etapaAtual: etapa.ordem,
    //   status: 'emAndamento',
    // });

    let novoStatus: Exames['status'];

    const existeAlgumaNota = etapasAtualizadas.some((e) => e.nota !== null);

    if (!existeAlgumaNota) {
      const etapaAtualizada = etapasAtualizadas.find(
        (e) => e.ordem === etapa.ordem,
      );

      novoStatus = etapaAtualizada?.dataAgendada ? 'agendado' : 'solicitado';
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
    const confirmacao = confirm(
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

  fecharModal(): void {
    this.mostrarModal = false;
    this.dadosForms.reset();
    this.dadosParaEditar = null;
  }

  fecharModalNota(): void {
    this.mostrarModalNota = false;
    this.exameSelecionado = null;
    this.etapaSelecionada = null;
    this.notaForm.reset();
  }

  fecharModalCancelamento(): void {
    this.mostrarModalCancelamento = false;

    this.exameCancelamento = null;

    this.cancelamentoForm.reset();
  }

  fecharModalAgendamentoEtapa(): void {
    this.mostrarModalAgendamentoEtapa = false;
    this.exameAgendamentoEtapa = null;
    this.etapaAgendamento = null;
    this.agendamentoEtapaForm.reset();
  }
}
