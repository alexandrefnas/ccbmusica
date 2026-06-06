import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { combineLatest } from 'rxjs';
import { ModalComponent } from '../../../modal/modal/modal.component';
import { ButtonComponent } from '../../../component/button/button.component';
import { TextComponent } from '../../../component/inputs/text/text.component';
import { SelectComponent } from '../../../component/inputs/select/select.component';
import { DataComponent } from '../../../component/inputs/data/data.component';
import {
  converterISOParaBR,
  formatarDataString,
} from '../../../../shared/shared.service';
import { TableComponent } from '../../../component/table/table.component';
import {
  Candidatos,
  FirestoreService,
  Igrejas,
  Instrumentos,
} from '../../../services/firestore.service';
import {
  listaPeriodo,
  listaPeriodoPratico,
  listaTipoExame,
  upper,
} from '../../../services/select.service';
import { AuthService, PermissoesCRUD } from '../../../services/auth.service';
import { AlertService } from '../../../services/alert.service';

@Component({
  selector: 'tcx-alunos',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ModalComponent,
    ButtonComponent,
    TextComponent,
    SelectComponent,
    DataComponent,
    TableComponent,
  ],
  templateUrl: './alunos.component.html',
  styleUrl: './alunos.component.css',
})
export class AlunosComponent implements OnInit {
  constructor(
    private fb: FormBuilder,
    private firestoreService: FirestoreService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
    private alertService: AlertService,
  ) {
    this.dadosForms = this.fb.group({
      nomeAluno: ['', Validators.required],
      dataNascimento: ['', Validators.required],
      idSetor: [''],
      idComum: ['', Validators.required],
      idInstrumento: [''],
      afinacao: [''],
    });
    // this.carregarDados();
    // this.liberaEditar = this.permissao('update');
    // this.liberaCriar = this.permissao('create');
    // this.liberaDeletar = this.permissao('delete');
  }

  isMobile = window.innerWidth <= 576;

  liberaEditar: boolean = false;
  liberaCriar: boolean = false;
  liberaDeletar: boolean = false;
  title = '';
  mostrarModal = false;

  filtro = false;
  filtroStatus = false;

  modoHistorico = false;
  alunoHistoricoSelecionado: Candidatos | null = null;
  historicoAluno: any[] = [];
  liberaHistorico = false;

  listaIgreja: { value: string; label: string; idSetor: string }[] = [];
  listaSetor: { value: string; label: string }[] = [];
  listaIgrejaTodas: { value: string; label: string; idSetor: string }[] = [];
  listaInstrumento: { value: string; label: string }[] = [];
  listaComunsFiltro: { value: string; label: string }[] = [];
  filtroComum = '';

  listaAfinacao = [
    { value: 'DÓ', label: 'DÓ' },
    { value: 'FÁ', label: 'FÁ' },
    { value: 'FÁ/SIB', label: 'FÁ/SIB' },
    { value: 'LÁ', label: 'LÁ' },
    { value: 'MIB', label: 'MIB' },
    { value: 'SIB', label: 'SIB' },
  ];

  //#region DADOS TABELA

  camposColunasBase = [
    'nomeAluno',
    'idade',
    'nomeComum',
    'nomeInstrumento',
    'afinacao',
  ];
  camposColunas: string[] = [];

  tituloColunas = {
    nomeAluno: 'Aluno',
    idade: 'Idade',
    nomeComum: 'Comum',
    nomeInstrumento: 'Instrumento',
    afinacao: 'Afinação',
  };

  dados: any[] = [];
  dadosParaEditar: any | null = null;

  alinhamentoColunaTitulo: { [coluna: string]: 'left' | 'center' | 'right' } = {
    nomeAluno: 'center',
    idade: 'center',
    nomeComum: 'center',
    nomeInstrumento: 'center',
    afinacao: 'center',
  };

  alinhamentoColuna: { [coluna: string]: 'left' | 'center' | 'right' } = {
    nomeAluno: 'left',
    idade: 'center',
    nomeComum: 'left',
    nomeInstrumento: 'left',
    afinacao: 'center',
  };

  tamanhoColunas = {
    nomeAluno: { width: '45%', minWidth: '220px' },
    idade: { width: '15%', minWidth: '50px' },
    nomeComum: { width: '20%', minWidth: '220px' },
    nomeInstrumento: { width: '20%' },
    afinacao: { width: '20%', minWidth: '80px' },
  };

  // Buttons
  acoes = [
    {
      label: '✏️',
      descricao: 'Editar',
      classe: 'acao-editar',
      visivel: (item: any) => this.liberaEditar && !item.desativado,
      callback: (item: any) => this.editar(item),
    },
    {
      label: (item: Candidatos) => (item.desativado ? '✅' : '⛔'),
      descricao: (item: Candidatos) =>
        item.desativado ? 'Ativar Candidado.' : 'Desativar Candidato.',
      classe: 'acao-editar',
      visivel: (item: Candidatos) => !this.isMobile && this.liberaEditar,
      callback: (item: Candidatos) => this.statusCandidato(item),
    },
    {
      label: '📜',
      descricao: 'Histórico',
      classe: 'acao-editar',
      visivel: (item: Candidatos) => this.liberaHistorico && !item.desativado,
      callback: (item: Candidatos) => this.abrirHistoricoAluno(item),
    },
    {
      label: '🗑️',
      descricao: 'Excluir',
      classe: 'acao-excluir',
      visivel: (item: any) => !this.isMobile && this.liberaDeletar,
      callback: (item: any) => this.excluir(item),
    },
  ];
  //#endregion

  //#region TABELA HISTORICO
  camposColunasHistorico = [
    'grupoExameLabel',
    'tipoExameLabel',
    'categoriaExameLabel',
    'etapaLabel',
    'dataTesteLabel',
    'notaLabel',
    'professorLabel',
    'resultadoLabel',
  ];

  tituloColunasHistoricos = {
    grupoExameLabel: 'Grupo',
    tipoExameLabel: 'Exame',
    categoriaExameLabel: 'Categoria',
    etapaLabel: 'Etapa',
    dataTesteLabel: 'Data Teste',
    notaLabel: 'Nota',
    professorLabel: 'Professor',
    resultadoLabel: 'Resultado',
  };

  alinhamentoColunaTituloHistorico: {
    [coluna: string]: 'left' | 'center' | 'right';
  } = {
    grupoExameLabel: 'center',
    tipoExameLabel: 'center',
    categoriaExameLabel: 'center',
    etapaLabel: 'center',
    dataTesteLabel: 'center',
    notaLabel: 'center',
    professorLabel: 'center',
    resultadoLabel: 'center',
  };

  alinhamentoColunaHistorico: {
    [coluna: string]: 'left' | 'center' | 'right';
  } = {
    grupoExameLabel: 'left',
    tipoExameLabel: 'center',
    categoriaExameLabel: 'center',
    etapaLabel: 'center',
    dataTesteLabel: 'center',
    notaLabel: 'center',
    professorLabel: 'center',
    resultadoLabel: 'center',
  };

  tamanhoColunasHistorico = {
    grupoExameLabel: { width: '12%', minWidth: '120px' },
    tipoExameLabel: { width: '10%', minWidth: '120px' },
    categoriaExameLabel: { width: '16%', minWidth: '220px' },
    etapaLabel: { width: '12%', minWidth: '140px' },
    dataTesteLabel: { width: '10%', minWidth: '102px' },
    notaLabel: { width: '6%', minWidth: '65px' },
    professorLabel: { width: '24%', minWidth: '200px' },
    resultadoLabel: { width: '10%', minWidth: '100px' },
  };
  //#endregion

  async statusCandidato(item: Candidatos): Promise<void> {
    if (!item.id) return;

    let mensagem = `Deseja realmente desativar ${item.nomeAluno}?`;
    let aviso = `${item.nomeAluno} desativado com sucesso!`;
    let status = true;
    if (item.desativado) {
      mensagem = `Deseja realmente ativar ${item.nomeAluno}?`;
      aviso = `${item.nomeAluno} ativado com sucesso!`;
      status = false;
    }
    // if (!confirmarAcao(mensagem)) return;
    if (!(await this.alertService.confirmar(mensagem))) return;

    await this.firestoreService.updateCandidato(item.id, {
      desativado: status,
    });

    this.snackBar.open(aviso, 'Fechar', {
      duration: 4000,
    });
  }
  //Fim

  dadosForms: FormGroup;

  permissao(tipo: keyof PermissoesCRUD): boolean {
    return this.auth.temPermissao('candidatos', tipo);
  }

  usuarioEhAdmin(): boolean {
    return this.auth.usuario?.perfil === 'admin';
  }

  // ngOnInit(): void {
  //   this.firestoreService.getSetor().subscribe((setores) => {
  //     this.listaSetor = setores
  //       .map((s) => ({
  //         value: s.id!,
  //         label: s.nomeSetor,
  //       }))
  //       .sort((a, b) => a.label.localeCompare(b.label));
  //   });
  //   this.escutarMudancaSetor();
  //   this.firestoreService.getIgrejas().subscribe((lista: Igrejas[]) => {
  //     const usuario = this.auth.usuario;

  //     // ADMIN
  //     if (usuario?.perfil === 'admin') {
  //       this.listaIgrejaTodas = lista.map((l) => ({
  //         value: l.id!,
  //         label: l.nomeCongregacao?.toUpperCase() || '',
  //         idSetor: l.idSetor,
  //       }));

  //       // começa vazio até selecionar setor
  //       this.listaIgreja = [];

  //       return;
  //     }

  //     // DEMAIS PERFIS
  //     const igrejasFiltradas = lista.filter((igreja) =>
  //       this.auth.temAcessoAoRegistro({
  //         idSetor: igreja.idSetor,
  //         idComum: igreja.id,
  //       }),
  //     );

  //     this.listaIgreja = igrejasFiltradas.map((l) => ({
  //       value: l.id!,
  //       label: l.nomeCongregacao?.toUpperCase() || '',
  //       idSetor: l.idSetor,
  //     }));
  //   });
  //   this.firestoreService
  //     .getInstrumento()
  //     .subscribe((lista: Instrumentos[]) => {
  //       // this.listaLinks = lista;
  //       this.listaInstrumento = lista.map((l) => ({
  //         value: l.id!,
  //         label: l.nomeInstrumento?.toUpperCase() || '',
  //       }));
  //     });

  //   this.carregarDados();
  // }

  ngOnInit(): void {
    const usuario = this.auth.usuario;
    this.liberaHistorico = this.auth.temPermissao('exames', 'read');
    // SOMENTE ADMIN
    if (usuario?.perfil === 'admin') {
      this.firestoreService.getSetor().subscribe((setores) => {
        this.listaSetor = setores
          .map((s) => ({
            value: s.id!,
            label: s.nomeSetor,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
      });

      this.escutarMudancaSetor();
    }

    this.firestoreService.getIgrejas().subscribe((lista: Igrejas[]) => {
      // ADMIN
      if (usuario?.perfil === 'admin') {
        this.listaIgrejaTodas = lista.map((l) => ({
          value: l.id!,
          label: l.nomeCongregacao?.toUpperCase() || '',
          idSetor: l.idSetor,
        }));
        this.listaIgreja = [];

        return;
      }

      // DEMAIS PERFIS
      const igrejasFiltradas = lista.filter((igreja) =>
        this.auth.temAcessoAoRegistro({
          idSetor: igreja.idSetor,
          idComum: igreja.id,
        }),
      );
      this.listaIgreja = igrejasFiltradas.map((l) => ({
        value: l.id!,
        label: l.nomeCongregacao?.toUpperCase() || '',
        idSetor: l.idSetor,
      }));
    });

    this.firestoreService
      .getInstrumento()
      .subscribe((lista: Instrumentos[]) => {
        this.listaInstrumento = lista
          .sort((a, b) =>
            (a.nomeInstrumento || '').localeCompare(
              b.nomeInstrumento || '',
              'pt-BR',
              { sensitivity: 'base' },
            ),
          )
          .map((l) => ({
            value: l.id!,
            label: l.nomeInstrumento?.toUpperCase() || '',
          }));
      });

    this.carregarDados();
    this.liberaEditar = this.permissao('update');
    this.liberaCriar = this.permissao('create');
    this.liberaDeletar = this.permissao('delete');

    this.escutarMudancaIgreja();
  }

  getControl(controlName: string): FormControl {
    const control = this.dadosForms.get(controlName);
    if (!control) {
      throw new Error(`FormControl '${controlName}' não existe no FormGroup`);
    }
    return control as FormControl;
  }

  get filtroStatusOp(): boolean {
    return (this.filtro = !this.filtro);
  }

  alterarFiltroStatus(): void {
    this.carregarDados();
  }

  escutarMudancaSetor(): void {
    this.getControl('idSetor').valueChanges.subscribe((idSetor) => {
      if (this.auth.usuario?.perfil !== 'admin') return;

      this.listaIgreja = this.listaIgrejaTodas
        .filter((i) => i.idSetor === idSetor)
        .sort((a, b) => a.label.localeCompare(b.label));

      this.dadosForms.patchValue(
        {
          idComum: '',
        },
        { emitEvent: false },
      );
    });
  }

  escutarMudancaIgreja(): void {
    this.getControl('idComum').valueChanges.subscribe((idIgreja) => {
      if (this.auth.usuario?.perfil === 'admin') return;

      const igrejaSelecionada = this.listaIgreja.find(
        (i) => i.value === idIgreja,
      );
      if (igrejaSelecionada) {
        // Vincula o idSetor da igreja diretamente no formulário do aluno
        this.dadosForms.patchValue({
          idSetor: igrejaSelecionada.idSetor,
        });
      }
    });
  }

  // carregarDadosOFF(): void {
  //   this.firestoreService.getCandidato().subscribe((date) => {
  //     const dateOrdenados = date.sort((a, b) => {
  //       const nomeA = a.nomeAluno?.toLowerCase() || '';
  //       const nomeB = b.nomeAluno?.toLowerCase() || '';
  //       return nomeA.localeCompare(nomeB);
  //     });

  //     this.dados = [...dateOrdenados]; // 🔁 Cria nova referência
  //     console.log('Dados carregados: ', this.dados);
  //   });
  // }

  carregarDados(): void {
    combineLatest([
      this.firestoreService.getCandidato(),
      this.firestoreService.getIgrejas(),
      this.firestoreService.getInstrumento(),
    ]).subscribe(([candidato, igrejas, instrumento]) => {
      const candidatosPermitidos = candidato.filter((c) =>
        this.auth.podeVerRegistro(c, 'candidatos'),
      );

      this.listaComunsFiltro = [
        { value: '', label: 'TODAS' },
        ...igrejas
          .filter((igreja) =>
            candidatosPermitidos.some((c) => c.idComum === igreja.id),
          )
          .map((igreja) => ({
            value: igreja.id!,
            label: igreja.nomeCongregacao?.toLocaleUpperCase('pt-BR') || '',
          }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      ];

      const usuarioTemMaisDeUmaComum = this.listaComunsFiltro.length > 2;
      // porque tem a opção TODAS + comuns reais

      this.camposColunas = usuarioTemMaisDeUmaComum
        ? [...this.camposColunasBase]
        : this.camposColunasBase.filter((c) => c !== 'nomeComum');

      let dadosBase = candidatosPermitidos;

      if (this.filtroComum) {
        dadosBase = dadosBase.filter((c) => c.idComum === this.filtroComum);
      }

      const dadosCandidatos = dadosBase.map((c) => {
        const igrejaFiltro = igrejas.find((s) => s.id === c.idComum);

        const InstrumentoFiltro = instrumento.find(
          (i) => i.id === c.idInstrumento,
        );

        return {
          ...c,
          nomeAluno: c.nomeAluno?.toLocaleUpperCase('pt-BR') || '',
          dataNascimento: c.dataNascimento || '',
          idade: `${this.calcularIdade(c.dataNascimento)}`,
          nomeComum:
            igrejaFiltro?.nomeCongregacao?.toLocaleUpperCase('pt-BR') ||
            'NÃO CADASTRADO',
          nomeInstrumento:
            InstrumentoFiltro?.nomeInstrumento?.toLocaleUpperCase('pt-BR') ||
            'SEM INSTRUMENTO',
        };
      });

      // Ordenar se necessário
      // this.dados = [...dadosCandidatos].sort((a, b) =>
      //   (a.nomeAluno || '').localeCompare(b.nomeAluno || ''),
      // );
      let dadosFiltrados = dadosCandidatos;

      if (this.filtroStatus) {
        // mostra apenas desativados
        dadosFiltrados = dadosCandidatos.filter((c) => c.desativado === true);
      } else {
        // mostra apenas ativos
        dadosFiltrados = dadosCandidatos.filter((c) => c.desativado !== true);
      }

      this.dados = [...dadosFiltrados].sort((a, b) =>
        (a.nomeAluno || '').localeCompare(b.nomeAluno || ''),
      );
    });
  }

  abrirHistoricoAluno(aluno: Candidatos): void {
    this.alunoHistoricoSelecionado = aluno;
    this.modoHistorico = true;

    combineLatest([
      this.firestoreService.getExames(),
      this.firestoreService.getSemestres(),
    ]).subscribe(([exames, grupos]) => {
      this.historicoAluno = exames
        .filter((e) => e.idAluno === aluno.id)
        .filter((e) =>
          ['aprovado', 'reprovado', 'cancelado'].includes(e.status),
        )
        .flatMap((exame) => {
          const grupo = grupos.find((g) => g.id === exame.idGrupoExame);

          const periodo = grupo?.periodos?.find(
            (p: any) =>
              p.tipo === exame.categoriaExame ||
              p.categoriaExame === exame.categoriaExame,
          );

          return (exame.etapas || [])
            .filter((etapa: any) =>
              ['aprovado', 'reprovado'].includes(etapa.resultado),
            )
            .map((etapa: any) => {
              const etapaGrupo = periodo?.avaliacao?.find(
                (a: any) => a.ordem === etapa.ordem,
              );

              return {
                idExame: exame.id,
                grupoExameLabel: grupo?.grupoExame || '-',
                tipoExameLabel: this.buscarLabel(
                  listaTipoExame,
                  exame.tipoExame,
                ),
                categoriaExameLabel: this.buscarCategoriaExame(
                  exame.categoriaExame || '',
                ),
                etapaLabel: etapa.nome || etapaGrupo?.nome || '-',
                dataTeste:
                  etapaGrupo?.dataAvaliacao || etapa.dataLancamento || '',
                dataTesteLabel: converterISOParaBR(
                  etapaGrupo?.dataAvaliacao || etapa.dataLancamento || '',
                ),
                notaLabel: etapa.nota ?? '-',
                notaMinimaLabel:
                  etapa.notaMinima ?? etapaGrupo?.notaMinima ?? '-',
                notaMaximaLabel:
                  etapa.notaMaxima ?? etapaGrupo?.notaMaxima ?? '-',
                professorLabel: etapa.professorLancamento || '-',
                resultadoLabel:
                  etapa.resultado === 'aprovado' ? 'APROVADO' : 'REPROVADO',
                statusLabel: this.formatarStatus(exame.status),
              };
            });
        })
        .sort((a, b) => (b.dataTeste || '').localeCompare(a.dataTeste || ''));
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

  async onSalvar(): Promise<void> {
    if (!this.dadosForms.valid) {
      this.dadosForms.markAllAsTouched();
      // alert('Formulário inválido. Preencha os campos obrigatórios.');
      this.alertService.erro(
        'Formulário inválido. Preencha os campos obrigatórios.',
      );
      return;
    }

    const igrejaSelecionada = this.listaIgreja.find(
      (i) => i.value === this.dadosForms.value.idComum,
    );

    if (!igrejaSelecionada) {
      // alert('Comum inválida.');
      this.alertService.erro('Comum inválida.');
      return;
    }

    const date = formatarDataString(
      new Date(this.dadosForms.value.dataNascimento),
    );

    const baseData = {
      ...this.dadosForms.value,
      nomeAluno: upper(this.dadosForms.value.nomeAluno),
      idSetor: igrejaSelecionada.idSetor,
      afinacao: upper(this.dadosForms.value.afinacao),
      vozAlternativa: upper(this.dadosForms.value.vozAlternativa),
      dataNascimento: date,
    };

    const mensagem = this.dadosParaEditar
      ? `Deseja realmente alterar ${this.dadosParaEditar.nomeAluno}?`
      : `Deseja realmente salvar ${baseData.nomeAluno}?`;
    // console.log(baseData);
    if (this.dadosParaEditar) {
      const alterado = Object.keys(baseData).some(
        (key) => baseData[key] !== this.dadosParaEditar[key],
      );

      if (!alterado) {
        this.snackBar.open('Nenhuma alteração detectada.', 'Fechar', {
          duration: 3000,
        });
        this.fecharModal();
        return;
      }

      // if (!confirmarAcao(mensagem)) return;
      if (!(await this.alertService.confirmar(mensagem))) return;

      this.firestoreService
        .updateCandidato(this.dadosParaEditar.id!, baseData)
        .then(() => {
          this.snackBar.open(
            `${baseData.nomeAluno} alterado com sucesso!`,
            'Fechar',
            {
              duration: 4000,
            },
          );
          this.fecharModal();
        });
    } else {
      // if (!confirmarAcao(mensagem)) return;
      if (!(await this.alertService.confirmar(mensagem))) return;

      this.firestoreService.addCandidato(baseData).then(() => {
        this.snackBar.open(
          `${baseData.nomeAluno} salvo com sucesso!`,
          'Fechar',
          {
            duration: 4000,
          },
        );
        this.fecharModal();
      });
    }
  }

  calcularIdade(data: string): number {
    if (!data) return 0;

    const hoje = new Date();
    const nascimento = new Date(data);

    let idade = hoje.getFullYear() - nascimento.getFullYear();

    const mes = hoje.getMonth() - nascimento.getMonth();

    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }

    return idade;
  }

  buttonClick(): void {
    this.title = 'Cadastro Alunos';
    this.mostrarModal = true;
  }

  editar(select: Candidatos): void {
    this.title = 'Editar Instrumentos';
    this.mostrarModal = true;
    this.dadosParaEditar = { ...select };
    this.dadosForms.patchValue({
      nomeAluno: select.nomeAluno || '',
      dataNascimento: select.dataNascimento || '',
      idSetor: select.idSetor || '',
      idComum: select.idComum || '',
      idInstrumento: select.idInstrumento || '',
      afinacao: select.afinacao || '',
    });
    if (this.auth.usuario?.perfil === 'admin') {
      this.listaIgreja = this.listaIgrejaTodas.filter(
        (i) => i.idSetor === select.idSetor,
      );
    }
    // console.log(this.dadosParaEditar);
  }

  async excluir(dados: Candidatos): Promise<void> {
    const mensagem = `Tems certeza que deseja excluir "${dados.nomeAluno}"?`;
    // if (!confirmacao) {
    //   return;
    // }

    if (!(await this.alertService.confirmar(mensagem))) return;

    if (dados.id) {
      try {
        await this.firestoreService.deleteCandidato(dados.id).then(() => {
          this.snackBar.open(
            `${dados.nomeAluno} deletado com sucesso!`,
            'Fechar',
            {
              duration: 4000,
            },
          );
        });
        // console.log('Cliente excluído:', dados);
        this.carregarDados();
      } catch (error) {
        console.error(`Erro ao excluir: "${dados.nomeAluno}" `, error);
      }
    }
  }

  fecharModal() {
    this.mostrarModal = false;
    this.dadosForms.reset();
  }

  fecharHistoricoAluno(): void {
    this.modoHistorico = false;
    this.alunoHistoricoSelecionado = null;
    this.historicoAluno = [];
  }
}
