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
import { CommonModule } from '@angular/common';
import {
  Criterio,
  FirestoreService,
  GrupoExames,
  Igrejas,
} from '../../../services/firestore.service';
import { AuthService, PermissoesCRUD } from '../../../services/auth.service';
import {
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
import { DataComponent } from '../../../component/inputs/data/data.component';
import { TableComponent } from '../../../component/table/table.component';
import { AlertService } from '../../../services/alert.service';
import { Subscription } from 'rxjs';

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
      dataRecuperacao: [''],
      criteriosSelecionados: [[] as string[]],
      tipoExame: ['', Validators.required],
      avaliacoes: this.fb.array([]),
      concluido: [false],
    });
  }

  //#region Variaveis
  dadosForms: FormGroup;
  dadosParaEditar: GrupoExames | null = null;
  mostrarModal: boolean = false;
  title: string = '';
  liberaCriar: boolean = false;
  liberaEditar: boolean = false;
  liberaDeletar: boolean = false;
  tabelaVisivel: boolean = true;

  listaTipoExame = listaTipoExame;
  listaPeriodo = listaPeriodo;
  listaPratico = listaPeriodoPratico;

  listaIgreja: { value: string; label: string; idSetor: string }[] = [];
  listaSetor: { value: string; label: string }[] = [];
  listaIgrejaTodas: { value: string; label: string; idSetor: string }[] = [];

  listaCriteriosTodos: Criterio[] = [];
  criteriosSelecionados: string[] = [];
  listaSelect: { value: string; label: string }[] = [];

  // Estado da nova interface do grupo (nao gravado no Firestore).
  pesquisaCriterios = '';
  cadastroRapidoAberto = false;
  nomeNovoCriterio = '';
  erroCadastroRapido = '';
  salvandoCriterio = false;
  salvandoGrupo = false;
  mostrarResumo = false;
  private criteriosSubscription?: Subscription;
  private versaoCriterios = 0;
  private historicosConsultados = new Set<string>();

  dados: any[] = [];

  selectRecuperacao: boolean = true;
  //#endregion

  //#region TABELA

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
    grupoExame: { width: '15%', minWidth: '150px' },
    descricao: { width: '25%', minWidth: '200px' },
    tipoExameLabel: { width: '10%', minWidth: '120px' },
    datasLabel: { width: '25%', minWidth: '300px' },
    comumLabel: { width: '20%', minWidth: '200px' },
    // qtdPeriodos: { width: '5%' },
    concluidoLabel: { width: '5%', minWidth: '80px' },
  };

  acoes = [
    {
      label: '',
      descricao: 'Editar',
      classe: 'acao-editar bi bi-pencil',
      visivel: (item: GrupoExames) => this.liberaEditar && !item.concluido,
      callback: (item: GrupoExames) => this.editar(item),
    },
    {
      label: '',
      descricao: 'Concluir grupo',
      classe: 'acao-editar bi bi-check-square',
      visivel: (item: GrupoExames) => this.liberaEditar && !item.concluido,
      callback: (item: GrupoExames) => this.concluirGrupoExame(item),
    },
    {
      label: '',
      descricao: 'Reabrir grupo de avaliação',
      classe: 'acao-editar bi bi-arrow-counterclockwise',
      visivel: (item: GrupoExames) => item.concluido,
      callback: (item: GrupoExames) => this.reabrirGrupoExame(item),
    },
    {
      label: '',
      descricao: 'Excluir',
      classe: 'acao-excluir bi bi-trash3',
      visivel: (item: GrupoExames) => this.liberaDeletar && !item.concluido,
      callback: (item: GrupoExames) => this.excluir(item),
    },
  ];
  //#endregion FIM TABELA

  usuarioEhAdmin(): boolean {
    return this.auth.usuario?.perfil === 'admin';
  }

  permissao(tipo: keyof PermissoesCRUD): boolean {
    return this.auth.temPermissao('grupoExames', tipo);
  }

  ngOnInit(): void {
    const usuario = this.auth.usuario;
    this.carregarCriterios();

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

  aoSelecionarFiltro(criterios: string[]): void {
    const criteriosIds = criterios ?? [];
    this.criteriosSelecionados = criteriosIds;
    this.getControl('criteriosSelecionados').setValue(criteriosIds, {
      emitEvent: false,
    });
  }

  get podeCriarCriterios(): boolean {
    return this.auth.temPermissao('criterios', 'create');
  }

  get criteriosFiltrados(): { value: string; label: string }[] {
    const busca = this.normalizarNomeCriterio(this.pesquisaCriterios);
    if (!busca) return this.listaSelect;
    return this.listaSelect.filter((item) =>
      this.normalizarNomeCriterio(item.label).includes(busca),
    );
  }

  get criteriosMarcados(): { value: string; label: string }[] {
    const ids = this.getControl('criteriosSelecionados').value;
    if (!Array.isArray(ids)) return [];
    return ids.map(
      (id: string) =>
        this.listaSelect.find((c) => c.value === id) ?? {
          value: id,
          label: 'CRITERIO HISTORICO (ID: ' + id + ')',
        },
    );
  }

  get nomesCriteriosResumo(): string {
    return (
      this.criteriosMarcados.map((c) => c.label).join(', ') ||
      'Nenhum selecionado'
    );
  }

  get nomeSetorSelecionado(): string {
    const id = this.setorAtualGrupo;
    return (
      this.listaSetor.find((s) => s.value === id)?.label ||
      id ||
      'Nao selecionado'
    );
  }

  rastrearCriterio(_index: number, item: { value: string }): string {
    return item.value;
  }

  criterioMarcado(id: string): boolean {
    const valores = this.getControl('criteriosSelecionados').value;
    return Array.isArray(valores) && valores.includes(id);
  }

  alternarCriterio(id: string, evento: Event): void {
    const marcado = (evento.target as HTMLInputElement).checked;
    const atual = this.getControl('criteriosSelecionados').value;
    const ids: string[] = Array.isArray(atual) ? atual : [];
    this.aoSelecionarFiltro(
      marcado ? [...new Set([...ids, id])] : ids.filter((item) => item !== id),
    );
  }

  removerCriterio(id: string): void {
    const atual = this.getControl('criteriosSelecionados').value;
    this.aoSelecionarFiltro(
      (Array.isArray(atual) ? atual : []).filter((item: string) => item !== id),
    );
  }

  atualizarPesquisaCriterios(evento: Event): void {
    this.pesquisaCriterios = (evento.target as HTMLInputElement).value;
  }

  selecionarTipoExame(tipo: string): void {
    if (this.getControl('tipoExame').value === tipo) return;
    if (this.salvandoCriterio || this.salvandoGrupo) return;
    this.getControl('tipoExame').setValue(tipo);
    this.onTipoExameChange();
    this.cadastroRapidoAberto = false;
    this.erroCadastroRapido = '';
    this.pesquisaCriterios = '';
    this.mostrarResumo = false;
  }

  alternarCadastroRapido(): void {
    if (this.salvandoCriterio || !this.podeCriarCriterios) return;
    if (!this.setorAtualGrupo || !this.getControl('tipoExame').value) {
      this.alertService.aviso(
        'Selecione o setor e o tipo de exame antes de criar um criterio.',
      );
      return;
    }
    this.cadastroRapidoAberto = !this.cadastroRapidoAberto;
    this.nomeNovoCriterio = '';
    this.erroCadastroRapido = '';
  }

  atualizarNovoCriterio(evento: Event): void {
    this.nomeNovoCriterio = (evento.target as HTMLInputElement).value;
    this.erroCadastroRapido = '';
  }

  private normalizarNomeCriterio(nome: string): string {
    return String(nome || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLocaleUpperCase('pt-BR');
  }

  async criarCriterioRapido(): Promise<void> {
    if (
      this.salvandoCriterio ||
      !this.cadastroRapidoAberto ||
      !this.podeCriarCriterios
    )
      return;
    const setor = this.setorAtualGrupo;
    const tipo = String(this.getControl('tipoExame').value || '');
    const nome = upper(this.nomeNovoCriterio.trim().replace(/\s+/g, ' '));
    if (!setor || !['001', '002'].includes(tipo)) {
      this.erroCadastroRapido = 'Informe um setor e tipo de exame validos.';
      return;
    }
    if (!nome || nome.length > 120) {
      this.erroCadastroRapido = 'O nome deve ter entre 1 e 120 caracteres.';
      return;
    }
    if (
      this.listaCriteriosTodos.some(
        (c) =>
          c.idSetor === setor &&
          c.tipoExame === tipo &&
          this.normalizarNomeCriterio(c.nomeCriterio) ===
            this.normalizarNomeCriterio(nome),
      )
    ) {
      this.erroCadastroRapido =
        'Este criterio ja esta cadastrado para este setor e tipo de exame.';
      return;
    }

    this.salvandoCriterio = true;
    this.erroCadastroRapido = '';
    try {
      const referencia = await this.firestoreService.addCriterio({
        idSetor: setor,
        tipoExame: tipo,
        nomeCriterio: nome,
      });
      if (
        setor !== this.setorAtualGrupo ||
        tipo !== this.getControl('tipoExame').value
      ) {
        this.alertService.aviso(
          'Criterio criado. O setor ou tipo mudou; consulte a lista correspondente.',
        );
        return;
      }
      const novo: Criterio = {
        id: referencia.id,
        idSetor: setor,
        tipoExame: tipo,
        nomeCriterio: nome,
      };
      if (!this.listaCriteriosTodos.some((c) => c.id === novo.id)) {
        this.listaCriteriosTodos = [...this.listaCriteriosTodos, novo];
      }
      this.filtrarCriteriosPorTipoExame();
      const atuais = this.getControl('criteriosSelecionados').value;
      const ids: string[] = Array.isArray(atuais) ? atuais : [];
      this.aoSelecionarFiltro([...new Set([...ids, referencia.id])]);
      this.cadastroRapidoAberto = false;
      this.nomeNovoCriterio = '';
      this.pesquisaCriterios = '';
      this.snackBar.open('Criterio criado e selecionado!', 'Fechar', {
        duration: 3200,
      });
    } catch (erro) {
      console.error('Erro ao criar criterio rapido:', erro);
      this.erroCadastroRapido =
        'Nao foi possivel concluir o cadastro. Confira as permissoes e recarregue os criterios antes de tentar novamente.';
    } finally {
      this.salvandoCriterio = false;
    }
  }

  carregarDados(): void {
    this.firestoreService.getSemestres().subscribe((lista: GrupoExames[]) => {
      const usuario = this.auth.usuario;

      const listaPermitida =
        usuario?.perfil === 'admin'
          ? lista
          : lista.filter((item) => item.idSetor === usuario?.idSetor);

      this.dados = listaPermitida.map((item) => {
        const comum =
          this.listaIgrejaTodas.find((i) => i.value === item.idComum) ||
          this.listaIgreja.find((i) => i.value === item.idComum);

        const tipoExame = this.listaTipoExame.find(
          (t) => t.value === (item as any).tipoExame,
        );

        const primeiraEtapa = item.periodos?.[0]?.etapas?.[0];

        const dataTeorica =
          primeiraEtapa?.avaliacao?.find((a: any) => a.nome === 'PARTE TEÓRICA')
            ?.dataAvaliacao || '';

        const dataPratica =
          primeiraEtapa?.avaliacao?.find((a: any) => a.nome === 'PARTE PRÁTICA')
            ?.dataAvaliacao || '';

        const dataRecuperacao =
          primeiraEtapa?.avaliacao?.find((a: any) => a.nome === 'PARTE TEÓRICA')
            ?.dataRecuperacao || '';

        const datas: string[] = [];

        // if (dataTeorica) datas.push(converterISOParaBR(dataTeorica));
        // if (dataPratica) datas.push(converterISOParaBR(dataPratica));

        if (dataTeorica) {
          datas.push(`Teórica: ${converterISOParaBR(dataTeorica)}`);
        }

        if (dataPratica) {
          datas.push(`Prática: ${converterISOParaBR(dataPratica)}`);
        }

        if (dataRecuperacao) {
          datas.push(`Recuperação: ${converterISOParaBR(dataRecuperacao)}`);
        }

        return {
          ...item,
          tipoExameLabel: tipoExame?.label || item.tipoExame || '',
          comumLabel: comum?.label || '',
          datasLabel: datas.join(' | '),
          concluidoLabel: item.concluido ? 'CONCLUÍDO' : 'ABERTO',
        };
      });
    });
  }

  // Cada consulta do grupo usa o setor ativo. Nunca consultar a colecao inteira
  // para depois filtrar no navegador: as regras do Firestore nao sao filtros.
  private get setorAtualGrupo(): string {
    const usuario = this.auth.usuario;
    return usuario?.perfil === 'admin'
      ? String(this.getControl('idSetor').value || '')
      : String(usuario?.idSetor || '');
  }

  carregarCriterios(): void {
    this.criteriosSubscription?.unsubscribe();
    const versao = ++this.versaoCriterios;
    const setor = this.setorAtualGrupo;
    this.listaCriteriosTodos = [];
    this.listaSelect = [];
    this.historicosConsultados.clear();
    if (!setor) return;

    this.criteriosSubscription = this.firestoreService
      .getCriterios(setor)
      .subscribe({
        next: (criterios: Criterio[]) => {
          if (versao !== this.versaoCriterios) return;
          const historicos = this.listaCriteriosTodos.filter(
            (criterio) =>
              !criterio.idSetor &&
              (this.dadosParaEditar?.criteriosSelecionados ?? []).includes(
                criterio.id ?? '',
              ),
          );
          this.listaCriteriosTodos = [...criterios, ...historicos];
          this.filtrarCriteriosPorTipoExame();
          void this.carregarHistoricosDoGrupo(versao, setor);
        },
        error: (erro) => {
          if (versao !== this.versaoCriterios) return;
          console.error('Erro ao carregar criterios por setor:', erro);
          this.listaCriteriosTodos = [];
          this.listaSelect = [];
          this.alertService.erro(
            'Nao foi possivel consultar os criterios do setor. Confira as regras do Firestore.',
          );
        },
      });
  }

  private async carregarHistoricosDoGrupo(
    versao: number,
    setor: string,
  ): Promise<void> {
    const grupo = this.dadosParaEditar;
    if (!grupo || grupo.idSetor !== setor) return;
    for (const id of grupo.criteriosSelecionados ?? []) {
      if (versao !== this.versaoCriterios) return;
      if (
        this.listaCriteriosTodos.some((c) => c.id === id) ||
        this.historicosConsultados.has(id)
      )
        continue;
      this.historicosConsultados.add(id);
      try {
        const criterio = await this.firestoreService.getCriterioPorId(id);
        if (
          versao !== this.versaoCriterios ||
          this.dadosParaEditar?.id !== grupo.id
        )
          return;
        if (
          !criterio ||
          criterio.idSetor ||
          criterio.tipoExame !== grupo.tipoExame
        )
          continue;
        if (!this.listaCriteriosTodos.some((c) => c.id === id)) {
          this.listaCriteriosTodos = [...this.listaCriteriosTodos, criterio];
          this.filtrarCriteriosPorTipoExame();
        }
      } catch (erro) {
        // O grupo existente conserva os IDs antigos mesmo quando uma regra
        // impede a consulta individual. Nunca recriar nem migrar esse criterio.
        console.warn('Nao foi possivel ler criterio historico', id, erro);
        if (
          versao !== this.versaoCriterios ||
          this.dadosParaEditar?.id !== grupo.id
        )
          return;
        const historico: Criterio = {
          id,
          tipoExame: grupo.tipoExame,
          nomeCriterio: 'CRITERIO HISTORICO - CONSULTA INDISPONIVEL',
        };
        if (!this.listaCriteriosTodos.some((c) => c.id === id)) {
          this.listaCriteriosTodos = [...this.listaCriteriosTodos, historico];
          this.filtrarCriteriosPorTipoExame();
        }
      }
    }
  }

  filtrarCriteriosPorTipoExame(): void {
    const tipoExame = String(this.getControl('tipoExame').value || '');
    const idSetor = this.setorAtualGrupo;
    const idsAntigos =
      this.dadosParaEditar?.idSetor === idSetor
        ? new Set(this.dadosParaEditar.criteriosSelecionados ?? [])
        : new Set<string>();

    if (!tipoExame || !idSetor) {
      this.listaSelect = [];
      return;
    }

    this.listaSelect = this.listaCriteriosTodos
      .filter(
        (criterio) =>
          criterio.tipoExame === tipoExame &&
          (criterio.idSetor === idSetor ||
            (!criterio.idSetor &&
              !!criterio.id &&
              idsAntigos.has(criterio.id))),
      )
      .map((criterio) => ({
        value: criterio.id!,
        label:
          criterio.nomeCriterio.toLocaleUpperCase('pt-BR') +
          (!criterio.idSetor ? ' (HISTORICO)' : ''),
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }),
      );
  }

  ngOnDestroy(): void {
    this.criteriosSubscription?.unsubscribe();
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
          criteriosSelecionados: [],
        },
        { emitEvent: false },
      );
      this.criteriosSelecionados = [];
      this.pesquisaCriterios = '';
      this.cadastroRapidoAberto = false;
      this.carregarCriterios();
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
        const setorAnterior = String(this.getControl('idSetor').value || '');
        this.dadosForms.patchValue(
          { idSetor: igrejaSelecionada.idSetor },
          { emitEvent: false },
        );
        if (setorAnterior !== igrejaSelecionada.idSetor) {
          this.aoSelecionarFiltro([]);
          this.cadastroRapidoAberto = false;
          this.carregarCriterios();
        }
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

  mostrarExameBasico(): boolean {
    const tipo = this.getControl('tipoExame').value;
    // console.log('tipo:',tipo);
    return tipo === '001' || tipo === '002';
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

    const dataRecuperacao = this.formatarDataFormulario(
      this.dadosForms.value.dataRecuperacao,
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
                dataRecuperacao:
                  item.teoricaRecuperacao !== null &&
                  item.teoricaRecuperacao !== undefined &&
                  item.teoricaRecuperacao !== ''
                    ? dataRecuperacao
                    : '',
                ordem: 1,
                // notaMinRecuperacao: Number(item.teoricaRecuperacao),
                notaMinRecuperacao:
                  item.teoricaRecuperacao !== null &&
                  item.teoricaRecuperacao !== undefined &&
                  item.teoricaRecuperacao !== ''
                    ? Number(item.teoricaRecuperacao)
                    : null,
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

  // onTipoExameChange(): void {
  //   this.avaliacoesArray.clear();
  //   this.dadosForms.patchValue(
  //     {
  //       dataTeorica: '',
  //       dataPratica: '',
  //       dataRecuperacao: '',
  //     },
  //     {
  //       emitEvent: false,
  //     },
  //   );
  //   const tipoExame = this.dadosForms.get('tipoExame')?.value;

  //   if (tipoExame === '001') {
  //     this.listaPeriodo.forEach((periodo) => {
  //       this.avaliacoesArray.push(
  //         this.fb.group({
  //           tipo: [periodo.value],
  //           label: [periodo.label],
  //           dataTeorica: [''],

  //           teoricaRecuperacao: [null],
  //           teoricaNotaMinima: [null, Validators.required],
  //           teoricaNotaMaxima: [null, Validators.required],

  //           dataPratica: [''],
  //           praticaNotaMinima: [null, Validators.required],
  //           praticaNotaMaxima: [null, Validators.required],
  //         }),
  //       );
  //     });
  //   }

  //   if (tipoExame === '002') {
  //     this.listaPratico.forEach((periodo) => {
  //       this.avaliacoesArray.push(
  //         this.fb.group({
  //           tipo: [periodo.value],
  //           label: [periodo.label],
  //           dataPratica: [''],
  //           praticaNotaMinima: [null, Validators.required],
  //           praticaNotaMaxima: [null, Validators.required],
  //         }),
  //       );
  //     });
  //   }
  // }

  onTipoExameChange(): void {
    this.criteriosSelecionados = [];

    this.getControl('criteriosSelecionados')?.setValue([], {
      emitEvent: false,
    });

    this.filtrarCriteriosPorTipoExame();

    this.avaliacoesArray.clear();

    this.dadosForms.patchValue(
      {
        dataTeorica: '',
        dataPratica: '',
        dataRecuperacao: '',
      },
      {
        emitEvent: false,
      },
    );

    const tipoExame = this.dadosForms.get('tipoExame')?.value;

    if (tipoExame === '001') {
      this.listaPeriodo.forEach((periodo) => {
        this.avaliacoesArray.push(
          this.fb.group({
            tipo: [periodo.value],
            label: [periodo.label],
            dataTeorica: [''],

            teoricaRecuperacao: [null],
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
    this.tabelaVisivel = false;
    this.dadosParaEditar = null;
    this.dadosForms.reset();
    // Habilita o setor ao cadastrar um novo grupo.
    this.getControl('idSetor').enable({ emitEvent: false });
    this.avaliacoesArray.clear();
    this.getControl('criteriosSelecionados').setValue([], { emitEvent: false });
    if (!this.usuarioEhAdmin()) {
      this.getControl('idSetor').setValue(this.auth.usuario?.idSetor || '', {
        emitEvent: false,
      });
    }
    this.criteriosSelecionados = [];
    this.pesquisaCriterios = '';
    this.cadastroRapidoAberto = false;
    this.nomeNovoCriterio = '';
    this.erroCadastroRapido = '';
    this.mostrarResumo = false;
    this.carregarCriterios();
  }

  async onSalvar(): Promise<void> {
    if (this.salvandoGrupo || this.salvandoCriterio) return;
    if (!this.permissao(this.dadosParaEditar ? 'update' : 'create')) {
      this.alertService.erro('Sem permissao para salvar grupo de avaliacoes.');
      return;
    }
    if (!this.dadosForms.valid) {
      this.dadosForms.markAllAsTouched();
      this.alertService.aviso(
        'Preencha os campos obrigatorios e confira as notas.',
      );
      return;
    }

    const usuarioLogado = this.auth.usuario;
    const idSetorPermitido = this.setorAtualGrupo;
    if (!idSetorPermitido) {
      this.alertService.aviso('Selecione um setor antes de salvar o grupo.');
      return;
    }
    if (
      this.dadosParaEditar?.id &&
      this.dadosParaEditar.idSetor !== idSetorPermitido
    ) {
      this.alertService.aviso(
        'Nao e permitido transferir um grupo existente para outro setor.',
      );
      return;
    }

    const tipoExame = String(this.dadosForms.value.tipoExame || '');
    const selecionados = this.getControl('criteriosSelecionados').value;
    const criteriosValidos =
      Array.isArray(selecionados) &&
      selecionados.every((id: string) =>
        this.listaCriteriosTodos.some(
          (criterio) =>
            criterio.id === id &&
            criterio.tipoExame === tipoExame &&
            (criterio.idSetor === idSetorPermitido ||
              (!criterio.idSetor &&
                this.dadosParaEditar?.idSetor === idSetorPermitido &&
                (this.dadosParaEditar.criteriosSelecionados ?? []).includes(
                  id,
                ))),
        ),
      );
    if (!criteriosValidos) {
      this.alertService.aviso(
        'Os criterios precisam pertencer ao setor e ao tipo de exame. Criterios historicos so podem ser preservados no grupo original.',
      );
      return;
    }

    const notasValidas = this.avaliacoesArray.controls.every((controle) => {
      const praticaMin = Number(controle.get('praticaNotaMinima')?.value);
      const praticaMax = Number(controle.get('praticaNotaMaxima')?.value);
      if (
        !Number.isFinite(praticaMin) ||
        !Number.isFinite(praticaMax) ||
        praticaMin < 0 ||
        praticaMax < praticaMin
      )
        return false;
      if (tipoExame === '001') {
        const teoricaMin = Number(controle.get('teoricaNotaMinima')?.value);
        const teoricaMax = Number(controle.get('teoricaNotaMaxima')?.value);
        if (
          !Number.isFinite(teoricaMin) ||
          !Number.isFinite(teoricaMax) ||
          teoricaMin < 0 ||
          teoricaMax < teoricaMin
        )
          return false;
        const recuperacao = controle.get('teoricaRecuperacao')?.value;
        if (
          recuperacao !== null &&
          recuperacao !== undefined &&
          recuperacao !== '' &&
          (!Number.isFinite(Number(recuperacao)) ||
            Number(recuperacao) < 0 ||
            Number(recuperacao) > teoricaMax)
        )
          return false;
      }
      return true;
    });
    if (!notasValidas) {
      this.alertService.aviso(
        'Confira as notas: o minimo nao pode superar o maximo.',
      );
      return;
    }

    const nomeUsuario = usuarioLogado?.nome ?? 'Nao identificado';
    const data = {
      grupoExame: upper(this.dadosForms.value.grupoExame),
      descricao: upper(this.dadosForms.value.descricao),
      idSetor: idSetorPermitido,
      idComum: this.dadosForms.value.idComum || '',
      tipoExame,
      criteriosSelecionados: selecionados as string[],
      concluido: this.dadosForms.value.concluido || false,
      criadoEm:
        this.dadosParaEditar?.criadoEm || formatarDataString(new Date()),
      usuarioCriador: nomeUsuario,
      periodos: this.criarPeriodos(),
    };

    this.salvandoGrupo = true;
    try {
      if (this.dadosParaEditar?.id) {
        if (
          !(await this.alertService.confirmar(
            'Deseja realmente alterar ' + this.dadosParaEditar.grupoExame + '?',
          ))
        )
          return;
        await this.firestoreService.updateSemestres(
          this.dadosParaEditar.id,
          data,
        );
        this.snackBar.open('Grupo de avaliacao atualizado!', 'Fechar', {
          duration: 4000,
        });
      } else {
        await this.firestoreService.addSemestres(data);
        this.snackBar.open('Grupo de avaliacao cadastrado!', 'Fechar', {
          duration: 4000,
        });
      }
      this.fecharModal();
    } catch (erro) {
      console.error('Erro ao salvar grupo de avaliacoes:', erro);
      this.alertService.erro(
        'Nao foi possivel salvar o grupo. Confira a conexao e as permissoes.',
      );
    } finally {
      this.salvandoGrupo = false;
    }
  }

  // editar(select: Semestres): void {
  //   this.title = 'Editar Instrumentos';
  //   this.mostrarModal = true;
  //   this.dadosParaEditar = { ...select };
  // }

  editar(item: GrupoExames): void {
    // this.title = 'Editar Grupo de Avaliações';
    // this.mostrarModal = true;
    this.tabelaVisivel = false;
    this.dadosParaEditar = { ...item };
    const criterios = item.criteriosSelecionados ?? [];

    this.criteriosSelecionados = criterios;

    this.dadosForms.patchValue(
      {
        grupoExame: item.grupoExame || '',
        descricao: item.descricao || '',
        idSetor: item.idSetor || '',
        idComum: item.idComum || '',
        tipoExame: item.tipoExame || '',
        criteriosSelecionados: criterios,
        concluido: item.concluido || false,
      },
      { emitEvent: false },
    );
    // Impede a mudança de setor em grupos existentes.
    this.getControl('idSetor').disable({ emitEvent: false });
    if (this.usuarioEhAdmin()) {
      this.listaIgreja = this.listaIgrejaTodas
        .filter((comum) => comum.idSetor === item.idSetor)
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    }
    this.cadastroRapidoAberto = false;
    this.nomeNovoCriterio = '';
    this.pesquisaCriterios = '';
    this.erroCadastroRapido = '';
    this.mostrarResumo = false;
    this.montarAvaliacoesEdicao(item);
    this.carregarCriterios();
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

            teoricaRecuperacao: [teorica?.notaMinRecuperacao ?? null],
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
          dataRecuperacao: teorica?.dataRecuperacao || '',
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

  async reabrirGrupoExame(item: GrupoExames): Promise<void> {
    if (!item.id) return;

    const mensagem = `Deseja realmente reabrir ${item.grupoExame}?`;

    if (!(await this.alertService.confirmar(mensagem))) return;

    await this.firestoreService.updateSemestres(item.id, {
      concluido: false,
    });

    this.snackBar.open('Grupo de avaliação reaberto com sucesso!', 'Fechar', {
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
    // this.mostrarModal = false;
    this.tabelaVisivel = true;
    this.dadosForms.reset();
    this.avaliacoesArray.clear();
    this.cadastroRapidoAberto = false;
    this.nomeNovoCriterio = '';
    this.erroCadastroRapido = '';
    this.pesquisaCriterios = '';
    this.mostrarResumo = false;
  }
}
