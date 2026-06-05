import { Component } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FirestoreService,
  GrupoExames,
  Igrejas,
} from '../../../services/firestore.service';
import { AuthService, PermissoesCRUD } from '../../../services/auth.service';
import {
  confirmarAcao,
  converterISOParaBR,
  formatarDataString,
} from '../../../../shared/shared.service';
import {
  listaPeriodo,
  listaPeriodoPratico,
  listaTipoExame,
  upper,
} from '../../../services/select.service';
import { ModalComponent } from '../../../modal/modal/modal.component';
import { SelectComponent } from '../../../component/inputs/select/select.component';
import { TextComponent } from '../../../component/inputs/text/text.component';
import { ButtonComponent } from '../../../component/button/button.component';
import { CommonModule } from '@angular/common';
import { DataComponent } from '../../../component/inputs/data/data.component';
import { TableComponent } from '../../../component/table/table.component';
import { AlertService } from '../../../services/alert.service';

@Component({
  selector: 'tcx-semestres',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ModalComponent,
    SelectComponent,
    TextComponent,
    ButtonComponent,
    DataComponent,
    TableComponent,
  ],
  templateUrl: './semestres.component.html',
  styleUrl: './semestres.component.css',
})
export class SemestresComponent {
  constructor(
    private fb: FormBuilder,
    private firestoreService: FirestoreService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
    private alertService: AlertService,
  ) {
    this.dadosForms = this.fb.group({
      grupoExame: ['', Validators.required],
      descricao: ['', Validators.required],
      idSetor: [''],
      idComum: ['', Validators.required],
      dataTeorica: [''],
      dataPratica: [''],
      tipoExame: ['', Validators.required],
      avaliacoes: this.fb.array([]),
      concluido: [false],
    });
  }

  dadosForms: FormGroup;
  dadosParaEditar: GrupoExames | null = null;
  mostrarModal: boolean = false;
  title: string = '';
  liberaCriar: boolean = false;
  liberaEditar: boolean = false;
  liberaDeletar: boolean = false;

  listaTipoExame = listaTipoExame;
  listaPeriodo = listaPeriodo;
  listaPratico = listaPeriodoPratico;

  listaIgreja: { value: string; label: string; idSetor: string }[] = [];
  listaSetor: { value: string; label: string }[] = [];
  listaIgrejaTodas: { value: string; label: string; idSetor: string }[] = [];

  // TABELA
  dados: any[] = [];

  camposColunas = [
    'grupoExame',
    'descricao',
    'tipoExameLabel',
    'datasLabel',
    'comumLabel',
    // 'qtdPeriodos',
    'concluidoLabel',
  ];

  tituloColunas = {
    grupoExame: 'Grupo',
    descricao: 'Descrição',
    tipoExameLabel: 'Tipo',
    datasLabel: 'Datas',
    comumLabel: 'Comum',
    // qtdPeriodos: 'Períodos',
    concluidoLabel: 'Status',
  };

  alinhamentoColunaTitulo: { [coluna: string]: 'left' | 'center' | 'right' } = {
    grupoExame: 'center',
    descricao: 'center',
    tipoExameLabel: 'center',
    datasLabel: 'center',
    comumLabel: 'center',
    // qtdPeriodos: 'center',
    concluidoLabel: 'center',
  };

  alinhamentoColuna: { [coluna: string]: 'left' | 'center' | 'right' } = {
    grupoExame: 'center',
    descricao: 'left',
    tipoExameLabel: 'center',
    datasLabel: 'center',
    comumLabel: 'left',
    // qtdPeriodos: 'center',
    concluidoLabel: 'center',
  };

  tamanhoColunas = {
    grupoExame: { width: '15%' },
    descricao: { width: '25%' },
    tipoExameLabel: { width: '10%' },
    datasLabel: { width: '25%' },
    comumLabel: { width: '20%' },
    // qtdPeriodos: { width: '5%' },
    concluidoLabel: { width: '5%' },
  };

  acoes = [
    {
      label: '✏️',
      descricao: 'Editar',
      classe: 'acao-editar',
      visivel: (item: GrupoExames) => this.liberaEditar && !item.concluido,
      callback: (item: GrupoExames) => this.editar(item),
    },
    {
      label: '✅',
      descricao: 'Concluir grupo',
      classe: 'acao-editar',
      visivel: (item: GrupoExames) => this.liberaEditar && !item.concluido,
      callback: (item: GrupoExames) => this.concluirGrupoExame(item),
    },
    {
      label: '🗑️',
      descricao: 'Excluir',
      classe: 'acao-excluir',
      visivel: (item: GrupoExames) => this.liberaDeletar && !item.concluido,
      callback: (item: GrupoExames) => this.excluir(item),
    },
  ];
  // FIM TABELA
  usuarioEhAdmin(): boolean {
    return this.auth.usuario?.perfil === 'admin';
  }

  permissao(tipo: keyof PermissoesCRUD): boolean {
    return this.auth.temPermissao('grupoExames', tipo);
  }

  ngOnInit(): void {
    const usuario = this.auth.usuario;

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

    this.carregarDados();
    this.liberaCriar = this.permissao('create');
    this.liberaEditar = this.permissao('update');
    this.liberaDeletar = this.permissao('delete');

    this.escutarMudancaIgreja();
  }

  carregarDados(): void {
    this.firestoreService.getSemestres().subscribe((lista: GrupoExames[]) => {
      this.dados = lista.map((item) => {
        const comum =
          this.listaIgrejaTodas.find((i) => i.value === item.idComum) ||
          this.listaIgreja.find((i) => i.value === item.idComum);

        const tipoExame = this.listaTipoExame.find(
          (t) => t.value === (item as any).tipoExame,
        );

        const qtdPeriodos =
          item.periodos?.reduce((total: number, periodo: any) => {
            return total + (periodo.etapas?.length || 0);
          }, 0) || 0;

        const primeiraEtapa = item.periodos?.[0]?.etapas?.[0];

        const dataTeorica =
          primeiraEtapa?.avaliacao?.find((a: any) => a.nome === 'PARTE TEÓRICA')
            ?.dataAvaliacao || '';

        const dataPratica =
          primeiraEtapa?.avaliacao?.find((a: any) => a.nome === 'PARTE PRÁTICA')
            ?.dataAvaliacao || '';

        const datas: string[] = [];

        if (dataTeorica) {
          datas.push(`${converterISOParaBR(dataTeorica)}`);
        }

        if (dataPratica) {
          datas.push(`${converterISOParaBR(dataPratica)}`);
        }

        return {
          ...item,
          tipoExameLabel: tipoExame?.label || item.tipoExame || '',
          comumLabel: comum?.label || '',
          qtdPeriodos,
          datasLabel: datas.join(' | '),
          concluidoLabel: item.concluido ? 'CONCLUÍDO' : 'ABERTO',
        };
      });
    });
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

  getControl(controlName: string): FormControl {
    const control = this.dadosForms.get(controlName);
    if (!control) {
      throw new Error(`FormControl '${controlName}' não existe no FormGroup`);
    }
    return control as FormControl;
  }

  getLiberaData(): boolean {
    const result =
      this.getControl('tipoExame').value === '001' ||
      this.getControl('tipoExame').value === '002';

    // console.log('result',result);
    return result;
  }

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

  get avaliacoesArray(): FormArray {
    return this.dadosForms.get('avaliacoes') as FormArray;
  }

  formatarDataFormulario(data: any): string {
    if (!data) return '';

    if (data instanceof Date) {
      return formatarDataString(data);
    }

    if (data?._isAMomentObject) {
      return data.format('YYYY-MM-DD');
    }

    if (typeof data === 'string') {
      return data;
    }

    return '';
  }

  criarPeriodos(): any[] {
    const tipoExame = this.dadosForms.value.tipoExame;
    const avaliacoes = this.avaliacoesArray.value;

    const dataTeorica = this.formatarDataFormulario(
      this.dadosForms.value.dataTeorica,
    );

    const dataPratica = this.formatarDataFormulario(
      this.dadosForms.value.dataPratica,
    );

    if (tipoExame === '001') {
      return [
        {
          categoriaExame: '001',
          tipoExame: 'MSA',
          etapas: avaliacoes.map((item: any) => ({
            tipo: item.tipo,
            avaliacao: [
              {
                nome: 'PARTE TEÓRICA',
                dataAvaliacao: dataTeorica,
                ordem: 1,
                notaMinima: Number(item.teoricaNotaMinima),
                notaMaxima: Number(item.teoricaNotaMaxima),
                bloqueadaInicialmente: false,
              },
              {
                nome: 'PARTE PRÁTICA',
                dataAvaliacao: dataPratica,
                ordem: 2,
                notaMinima: Number(item.praticaNotaMinima),
                notaMaxima: Number(item.praticaNotaMaxima),
                bloqueadaInicialmente: true,
              },
            ],
          })),
        },
      ];
    }

    if (tipoExame === '002') {
      return [
        {
          categoriaExame: '002',
          tipoExame: 'PRÁTICO',
          etapas: avaliacoes.map((item: any) => ({
            tipo: item.tipo,
            avaliacao: [
              {
                nome: 'PARTE PRÁTICA',
                dataAvaliacao: dataPratica,
                ordem: 1,
                notaMinima: Number(item.praticaNotaMinima),
                notaMaxima: Number(item.praticaNotaMaxima),
                bloqueadaInicialmente: false,
              },
            ],
          })),
        },
      ];
    }

    return [];
  }

  onTipoExameChange(): void {
    this.avaliacoesArray.clear();

    const tipoExame = this.dadosForms.get('tipoExame')?.value;

    if (tipoExame === '001') {
      this.listaPeriodo.forEach((periodo) => {
        this.avaliacoesArray.push(
          this.fb.group({
            tipo: [periodo.value],
            label: [periodo.label],
            dataTeorica: [''],

            teoricaNotaMinima: [null, Validators.required],
            teoricaNotaMaxima: [null, Validators.required],

            dataPratica: [''],
            praticaNotaMinima: [null, Validators.required],
            praticaNotaMaxima: [null, Validators.required],
          }),
        );
      });
    }

    if (tipoExame === '002') {
      this.listaPratico.forEach((periodo) => {
        this.avaliacoesArray.push(
          this.fb.group({
            tipo: [periodo.value],
            label: [periodo.label],
            dataPratica: [''],
            praticaNotaMinima: [null, Validators.required],
            praticaNotaMaxima: [null, Validators.required],
          }),
        );
      });
    }
  }

  buttonClick(): void {
    this.title = 'Criar Grupo de Avaliações';
    this.mostrarModal = true;
    this.dadosParaEditar = null;
    this.dadosForms.reset();
  }

  async onSalvar(): Promise<void> {
    if (!this.dadosForms.valid) {
      this.dadosForms.markAllAsTouched();
      this.alertService.aviso(
        'Formulário inválido. Preencha os campos obrigatórios.',
      );
      return;
    }
    const usuarioLogado = this.auth.usuario;
    const nomeUsuario =
      typeof usuarioLogado === 'string'
        ? usuarioLogado
        : (usuarioLogado?.nome ?? 'Não identificado');

    const data = {
      grupoExame: upper(this.dadosForms.value.grupoExame),
      descricao: upper(this.dadosForms.value.descricao),
      idSetor: this.dadosForms.value.idSetor || '',
      idComum: this.dadosForms.value.idComum || '',
      tipoExame: this.dadosForms.value.tipoExame,
      // categoriaExame: this.dadosForms.value.categoriaExame,
      concluido: this.dadosForms.value.concluido || false,
      criadoEm:
        this.dadosParaEditar?.criadoEm || formatarDataString(new Date()),
      usuarioCriador: nomeUsuario,
      periodos: this.criarPeriodos(),
    };

    const mensagem = this.dadosParaEditar
      ? `Deseja realmente alterar ${this.dadosParaEditar.grupoExame}?`
      : `Deseja realmente salvar ${data.grupoExame}?`;

    if (this.dadosParaEditar?.id) {
      // const alterado = Object.keys(data).some(
      //   (key) => data[key] !== this.dadosParaEditar[key],
      // );

      // if (!alterado) {
      //   this.snackBar.open('Nenhuma alteração detectada.', 'Fechar', {
      //     duration: 3000,
      //   });
      //   this.fecharModal();
      //   return;
      // }

      // if (!confirmarAcao(mensagem)) return;
      if (!(await this.alertService.confirmar(mensagem))) return;

      this.firestoreService
        .updateSemestres(this.dadosParaEditar.id!, data)
        .then(() => {
          this.snackBar.open('Exame alterado com sucesso!', 'Fechar', {
            duration: 4000,
          });
          this.fecharModal();
        });
    } else {
      this.firestoreService.addSemestres(data).then(() => {
        this.snackBar.open('Exame cadastrado com sucesso!', 'Fechar', {
          duration: 4000,
        });
        this.fecharModal();
      });
    }
  }

  // editar(select: Semestres): void {
  //   this.title = 'Editar Instrumentos';
  //   this.mostrarModal = true;
  //   this.dadosParaEditar = { ...select };
  // }

  editar(item: GrupoExames): void {
    this.title = 'Editar Grupo de Avaliações';
    this.mostrarModal = true;
    this.dadosParaEditar = { ...item };

    this.dadosForms.patchValue({
      grupoExame: item.grupoExame || '',
      descricao: item.descricao || '',
      idSetor: item.idSetor || '',
      idComum: item.idComum || '',
      tipoExame: item.tipoExame || '',
      concluido: item.concluido || false,
    });

    this.montarAvaliacoesEdicao(item);
  }

  montarAvaliacoesEdicao(item: GrupoExames): void {
    this.avaliacoesArray.clear();

    const tipoExame = item.tipoExame;

    const grupo = item.periodos?.[0];

    if (!grupo) return;

    const etapas = grupo.etapas || [];

    if (tipoExame === '001') {
      etapas.forEach((periodo: any) => {
        const teorica = periodo.avaliacao?.find(
          (a: any) => a.nome === 'PARTE TEÓRICA',
        );

        const pratica = periodo.avaliacao?.find(
          (a: any) => a.nome === 'PARTE PRÁTICA',
        );

        const periodoLista = this.listaPeriodo.find(
          (p) => p.value === periodo.tipo,
        );

        this.avaliacoesArray.push(
          this.fb.group({
            tipo: [periodo.tipo],
            label: [periodoLista?.label || periodo.tipo],

            teoricaNotaMinima: [
              teorica?.notaMinima ?? null,
              Validators.required,
            ],
            teoricaNotaMaxima: [
              teorica?.notaMaxima ?? null,
              Validators.required,
            ],

            praticaNotaMinima: [
              pratica?.notaMinima ?? null,
              Validators.required,
            ],
            praticaNotaMaxima: [
              pratica?.notaMaxima ?? null,
              Validators.required,
            ],
          }),
        );

        this.dadosForms.patchValue({
          dataTeorica: teorica?.dataAvaliacao || '',
          dataPratica: pratica?.dataAvaliacao || '',
        });
      });
    }

    if (tipoExame === '002') {
      etapas.forEach((periodo: any) => {
        const pratica = periodo.avaliacao?.find(
          (a: any) => a.nome === 'PARTE PRÁTICA',
        );

        const periodoLista = this.listaPratico.find(
          (p) => p.value === periodo.tipo,
        );

        this.avaliacoesArray.push(
          this.fb.group({
            tipo: [periodo.tipo],
            label: [periodoLista?.label || periodo.tipo],

            praticaNotaMinima: [
              pratica?.notaMinima ?? null,
              Validators.required,
            ],
            praticaNotaMaxima: [
              pratica?.notaMaxima ?? null,
              Validators.required,
            ],
          }),
        );

        this.dadosForms.patchValue({
          dataPratica: pratica?.dataAvaliacao || '',
        });
      });
    }
  }

  async concluirGrupoExame(item: GrupoExames): Promise<void> {
    if (!item.id) return;

    const mensagem = `Deseja realmente concluir ${item.grupoExame}?`;

    // if (!confirmarAcao(mensagem)) return;
      if (!(await this.alertService.confirmar(mensagem))) return;

    await this.firestoreService.updateSemestres(item.id, {
      concluido: true,
    });

    this.snackBar.open('Grupo de avaliação concluído com sucesso!', 'Fechar', {
      duration: 4000,
    });
  }

  async excluir(item: GrupoExames): Promise<void> {
    if (!item.id) return;

    const mensagem = `Deseja realmente excluir ${item.grupoExame}?`;

    // if (!confirmarAcao(mensagem)) return;
      if (!(await this.alertService.confirmar(mensagem))) return;

    await this.firestoreService.deleteSemestres(item.id);

    this.snackBar.open('Exame excluído com sucesso!', 'Fechar', {
      duration: 4000,
    });
  }

  fecharModal() {
    this.mostrarModal = false;
    this.dadosForms.reset();
  }
}
