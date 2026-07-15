import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ModalComponent } from '../../../modal/modal/modal.component';
import { ButtonComponent } from '../../../component/button/button.component';
import {
  AuthService,
  PermissoesCRUD,
  Usuarios,
} from '../../../services/auth.service';
import { TextComponent } from '../../../component/inputs/text/text.component';
import { SelectComponent } from '../../../component/inputs/select/select.component';
import { TableComponent } from '../../../component/table/table.component';
import {
  LISTA_TIPO_USUARIO,
  Modulo,
  Perfil,
  TIPO_PERFIL,
  upper,
} from '../../../services/select.service';
import { confirmarAcao } from '../../../../shared/shared.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FirestoreService,
  Igrejas,
  Setor,
} from '../../../services/firestore.service';
import { AlertService } from '../../../services/alert.service';

@Component({
  selector: 'tcx-usuarios',
  imports: [
    CommonModule,
    ModalComponent,
    ButtonComponent,
    FormsModule,
    ReactiveFormsModule,
    TextComponent,
    SelectComponent,
    TableComponent,
  ],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css',
})
export class UsuariosComponent implements OnInit {
  // #region Variaveis
  liberaEditar: boolean = false;
  liberaCriar: boolean = false;
  liberaDeletar: boolean = false;

  title = 'TITULO';
  mostrarModal = false;
  liberacoes = false;
  dadosParaEditar: any | null = null;

  listaSetores: Setor[] = [];
  listaComuns: Igrejas[] = [];

  listaSetoresSelect: { value: string; label: string }[] = [];
  listaComunsSelect: { value: string; label: string }[] = [];
  listaTipoUsuarioPermitida: any[] = [];
  // modulos: Modulo[] = [
  //   'candidatos',
  //   'igrejas',
  //   'instrumentos',
  //   'setores',
  //   'solicitacoes',
  //   'exames',
  //   'usuarios',
  // ];

  todosModulos: Modulo[] = [
    'candidatos',
    'grupoExames',
    'solicitacoes',
    'exames',
    'igrejas',
    'instrumentos',
    'setores',
    'usuarios',
    'logs',
  ];

  modulos: Modulo[] = [];

  nome = '';
  email = '';
  senha = '';
  perfil: Perfil = 'instrutor';
  carregando = false;
  ignorarMudancaPerfil = false;
  houveAlteracao = false;
  private valorOriginalFormulario = '';

  listaTipoUsuario = LISTA_TIPO_USUARIO;

  camposColunas = ['nome', 'email', 'perfil2'];
  tituloColunas = {
    nome: 'Nome',
    email: 'Email',
    perfil2: 'Perfil',
  };

  listaUsuarios: any[] = [];

  alinhamentoColunaTitulo: { [coluna: string]: 'left' | 'center' | 'right' } = {
    // mostrarAcoes: 'center',
    nome: 'center',
    perfil2: 'center',
  };

  alinhamentoColuna: { [coluna: string]: 'left' | 'center' | 'right' } = {
    perfil2: 'center',
    mostrarAcoes: 'center',
    // valor: 'right',
  };

  tamanhoColunas = {
    nome: { width: '40%' },
    email: { width: '35%' },
    perfil2: { width: '25%' },
    // mostrarAcoes: { width: '75px' },
  };

  // Buttons
  acoes = [
    {
      label: '',
      descricao: 'Editar',
      classe: 'acao-editar bi bi-pencil',
      visivel: (item: any) => this.podeEditarUsuario(item),
      callback: (item: any) => this.editar(item),
    },
    // {
    //   label: '🗑️',
    //   descricao: 'Excluir',
    //   classe: 'acao-excluir',
    //   visivel: (item: any) => true,
    //   callback: (item: any) => this.excluir(item),
    // },
  ];
  ////Fim

  dadosForms: FormGroup;
  // #endregion

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private cd: ChangeDetectorRef,
    private snackBar: MatSnackBar,
    private firestoreService: FirestoreService,
    private alertService: AlertService,
  ) {
    this.dadosForms = this.fb.group({
      nome: ['', Validators.required],
      email: ['', Validators.required],
      senha: ['', Validators.required],
      perfil: ['', Validators.required],
      idSetor: [''],
      idComum: [''],
    });
    // this.liberaEditar = this.permissao('update');
    // this.liberaCriar = this.permissao('create');
    // this.liberaDeletar = this.permissao('delete');
  }
  // get permissao() {
  //   return this.auth.temPermissao('usuarios', 'create');
  // }

  permissao(tipo: keyof PermissoesCRUD): boolean {
    return this.auth.temPermissao('usuarios', tipo);
  }

  private atualizarStatusAlteracao(): void {
    const valorAtual = JSON.stringify(this.dadosForms.getRawValue());
    this.houveAlteracao = valorAtual !== this.valorOriginalFormulario;
  }

  private getAcessosLogado(): any {
    return this.auth.usuario?.acessos || {};
  }

  private limitarAcessosPeloUsuarioLogado(acessos: any): any {
    const logado = this.auth.usuario;

    if (!logado) return acessos;

    // Admin pode liberar tudo
    if (logado.perfil === 'admin') {
      return acessos;
    }

    const acessosLogado = this.getAcessosLogado();
    const acessosLimitados = JSON.parse(JSON.stringify(acessos));

    this.todosModulos.forEach((modulo) => {
      const permissoesLogado = acessosLogado?.[modulo];

      if (!acessosLimitados[modulo]) return;

      ['read', 'create', 'update', 'delete'].forEach((permissao) => {
        if (permissoesLogado?.[permissao] !== true) {
          acessosLimitados[modulo][permissao] = false;
        }
      });

      // Se read for false, todo o resto também fica false
      if (acessosLimitados[modulo].read !== true) {
        acessosLimitados[modulo].create = false;
        acessosLimitados[modulo].update = false;
        acessosLimitados[modulo].delete = false;
      }
    });

    return acessosLimitados;
  }

  private aplicarRegraReadFalse(): void {
    const acessosGroup = this.dadosForms.get('acessos') as FormGroup;
    if (!acessosGroup) return;

    this.todosModulos.forEach((modulo) => {
      const grupo = acessosGroup.get(modulo) as FormGroup;
      if (!grupo) return;

      grupo.get('read')?.valueChanges.subscribe((read: boolean) => {
        if (read === false) {
          grupo.patchValue(
            {
              create: false,
              update: false,
              delete: false,
            },
            { emitEvent: false },
          );
        }
      });
    });
  }

  private bloquearPermissoesNaoPermitidas(): void {
    const logado = this.auth.usuario;
    const acessosGroup = this.dadosForms.get('acessos') as FormGroup;

    if (!logado || !acessosGroup) return;

    // Admin pode alterar tudo
    if (logado.perfil === 'admin') return;

    const acessosLogado = this.getAcessosLogado();

    this.todosModulos.forEach((modulo) => {
      const grupo = acessosGroup.get(modulo) as FormGroup;
      if (!grupo) return;

      ['read', 'create', 'update', 'delete'].forEach((permissao) => {
        const podeLiberar = acessosLogado?.[modulo]?.[permissao] === true;
        const control = grupo.get(permissao);

        if (!podeLiberar) {
          // control?.setValue(false, { emitEvent: false });
          control?.disable({ emitEvent: false });
        } else {
          control?.enable({ emitEvent: false });
        }
      });
    });
  }

  // ngOnInit(): void {
  //   this.escutarMudancaPerfil();
  //   this.carregarDados();
  // }

  ngOnInit(): void {
    this.escutarMudancaPerfil();
    this.carregarDados();
    this.escutarMudancaSetor();
    this.carregarSetoresEComuns();

    this.auth.currentUserData$.subscribe(() => {
      this.liberaEditar = this.permissao('update');
      this.liberaCriar = this.permissao('create');
      this.liberaDeletar = this.permissao('delete');
      this.carregarPerfisPermitidos();
      this.cd.markForCheck();
    });
  }

  private nivelPerfil(perfil: Perfil | string): number {
    const niveis: Record<string, number> = {
      admin: 5,
      regional: 4,
      secretario: 3,
      encarregado: 2,
      instrutor: 1,
    };

    return niveis[perfil] ?? 0;
  }

  private podeGerenciarPerfil(perfilAlvo: Perfil | string): boolean {
    const logado = this.auth.usuario;
    if (!logado) return false;

    if (logado.perfil === 'admin') return true;

    return this.nivelPerfil(perfilAlvo) <= this.nivelPerfil(logado.perfil);
  }

  private escutarMudancaPerfil() {
    this.getControl('perfil')?.valueChanges.subscribe(
      async (perfil: Perfil) => {
        if (this.ignorarMudancaPerfil) return;
        if (!perfil) return;

        const mensagem = 'Deseja aplicar as permissões padrão deste perfil?';

        // if (!confirmar) retur;
        if (!(await this.alertService.confirmar(mensagem))) return;

        const config = TIPO_PERFIL[perfil];

        // this.dadosForms.patchValue({
        //   acessos: JSON.parse(JSON.stringify(config.acessos)),
        // });
        const acessosLimitados = this.limitarAcessosPeloUsuarioLogado(
          config.acessos,
        );

        this.dadosForms.patchValue({
          acessos: acessosLimitados,
        });

        this.bloquearPermissoesNaoPermitidas();
      },
    );
  }

  escutarMudancaSetor(): void {
    this.getControl('idSetor').valueChanges.subscribe((idSetor) => {
      this.listaComunsSelect = this.listaComuns
        .filter((c) => c.idSetor === idSetor)
        .map((c) => ({
          value: c.id!,
          label: c.nomeCongregacao,
        }));

      this.dadosForms.patchValue({ idComum: '' }, { emitEvent: false });
      this.cd.markForCheck();
    });
  }

  usuarioEhAdmin(): boolean {
    return this.auth.usuario?.perfil === 'admin';
  }

  buttonClick(): void {
    this.title = 'Cadastrar Usuário';
    this.mostrarModal = true;

    const usuario = this.auth.usuario;

    if (!usuario) return;

    if (usuario.perfil !== 'admin') {
      this.dadosForms.patchValue({
        idSetor: usuario.idSetor || '',
      });

      this.listaComunsSelect = this.listaComuns
        .filter((c) =>
          this.auth.temAcessoAoRegistro({
            idSetor: c.idSetor,
            idComum: c.id,
          }),
        )
        .map((c) => ({
          value: c.id!,
          label: c.nomeCongregacao,
        }));

      if (usuario.perfil === 'encarregado' || usuario.perfil === 'instrutor') {
        this.dadosForms.patchValue({
          idComum: usuario.idComum || '',
        });
      }
    }
  }

  // carregarDados(): void {
  //   const ref = this.auth;
  //   const collectionRef = ref && ref['firestore'] ? ref['firestore'] : null;

  //   if (!collectionRef) {
  //     console.error('Firestore não está inicializado.');
  //     return;
  //   }

  //   this.auth.getUsuario().subscribe((u) => {
  //     this.listaUsuarios = u.sort((a, b) => {
  //       const nomeA = a.nome?.toLowerCase() || '';
  //       const nomeB = b.nome?.toLowerCase() || '';
  //       return nomeA.localeCompare(nomeB);
  //     });
  //     console.log(this.listaUsuarios);
  //   });
  // }

  // carregarDados(): void {
  //   this.auth.getUsuario().subscribe((usuarios) => {
  //     this.listaUsuarios = [...usuarios].sort((a, b) =>
  //       (a.nome?.toLowerCase() || '').localeCompare(
  //         b.nome?.toLowerCase() || '',
  //       ),
  //     );
  //     this.cd.markForCheck(); // força atualização
  //   });
  // }

  carregarDados(): void {
    this.auth.getUsuario().subscribe((usuarios) => {
      this.listaUsuarios = usuarios
        .filter((usuario) => this.podeVerUsuario(usuario))
        .map((u) => ({
          ...u,
          nome: (u.nome || '').toUpperCase(),
          perfil2: (u.perfil || '').toUpperCase(),
          // email: 'xxxxxxxxxx@xxxxxx.xxx',
        }))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

      this.cd.markForCheck();
    });
  }

  carregarSetoresEComuns(): void {
    this.firestoreService.getSetor().subscribe((setores) => {
      this.listaSetores = setores;

      this.listaSetoresSelect = setores.map((s) => ({
        value: s.id!,
        label: s.nomeSetor,
      }));
    });

    this.firestoreService.getIgrejas().subscribe((igrejas) => {
      this.listaComuns = igrejas;
    });
  }

  // carregarPerfisPermitidos(): void {
  //   const logado = this.auth.usuario;

  //   if (!logado) {
  //     this.listaTipoUsuarioPermitida = [];
  //     return;
  //   }

  //   if (logado.perfil === 'admin') {
  //     this.listaTipoUsuarioPermitida = this.listaTipoUsuario;
  //     return;
  //   }

  //   this.listaTipoUsuarioPermitida = this.listaTipoUsuario.filter(
  //     (perfil) =>
  //       perfil.value !== 'admin' &&
  //       perfil.value !== 'regional' &&
  //       perfil.value !== 'secretario',
  //   );
  // }

  carregarPerfisPermitidos(): void {
    const logado = this.auth.usuario;

    if (!logado) {
      this.listaTipoUsuarioPermitida = [];
      return;
    }

    if (logado.perfil === 'admin') {
      this.listaTipoUsuarioPermitida = this.listaTipoUsuario;
      return;
    }

    this.listaTipoUsuarioPermitida = this.listaTipoUsuario.filter((perfil) =>
      this.podeGerenciarPerfil(perfil.value),
    );
  }

  carregarModulosPermitidosParaEdicao(perfilEditado: Perfil): void {
    const logado = this.auth.usuario;

    if (!logado) {
      this.modulos = [];
      return;
    }

    // Admin pode ver/alterar todos os módulos
    if (logado.perfil === 'admin') {
      this.modulos = [...this.todosModulos];
      return;
    }

    const acessosPadrao = TIPO_PERFIL[perfilEditado]?.acessos;

    // Regional/secretário só veem módulos onde o perfil editado tem read: true
    this.modulos = this.todosModulos.filter((modulo) => {
      return acessosPadrao?.[modulo]?.read === true;
    });
  }

  private mesclarAcessosPermitidos(
    acessosOriginais: any,
    acessosNovos: any,
  ): any {
    const logado = this.auth.usuario;

    if (!logado || logado.perfil === 'admin') {
      return acessosNovos;
    }

    const acessosLogado = this.getAcessosLogado();
    const resultado = JSON.parse(JSON.stringify(acessosOriginais || {}));

    this.todosModulos.forEach((modulo) => {
      if (!resultado[modulo]) {
        resultado[modulo] = {};
      }

      ['read', 'create', 'update', 'delete'].forEach((permissao) => {
        const podeAlterar = acessosLogado?.[modulo]?.[permissao] === true;

        resultado[modulo][permissao] = podeAlterar
          ? acessosNovos?.[modulo]?.[permissao] === true
          : acessosOriginais?.[modulo]?.[permissao] === true;
      });
    });

    return resultado;
  }

  prepararDados() {
    if (!this.dadosForms.valid) {
      this.dadosForms.markAllAsTouched();
      this.alertService.aviso(
        'Formulário inválido. Preencha os campos obrigatórios.',
      );
      return;
    }
    this.nome = this.dadosForms.value.nome;
    // this.email = this.dadosForms.value.email;
    this.email = (this.dadosForms.value.email || '').toLowerCase().trim();
    this.senha = this.dadosForms.value.senha;
    this.perfil = this.dadosForms.value.perfil;
    const idSetor = this.dadosForms.value.idSetor;
    const idComum = this.dadosForms.value.idComum;
    this.onSalvar();
  }

  podeVerUsuario(usuario: any): boolean {
    const logado = this.auth.usuario;

    if (!logado) return false;

    // Admin vê todos
    if (logado.perfil === 'admin') return true;

    // Só admin vê usuários admin
    if (usuario.perfil === 'admin') return false;

    // Demais veem usuários do próprio setor
    return usuario.idSetor === logado.idSetor;
  }

  // podeEditarUsuario(usuario: any): boolean {
  //   const logado = this.auth.usuario;

  //   if (!logado) return false;

  //   if (!this.liberaEditar) return false;

  //   // Só admin edita admin, regional e secretário
  //   if (
  //     usuario.perfil === 'admin' ||
  //     usuario.perfil === 'regional' ||
  //     usuario.perfil === 'secretario'
  //   ) {
  //     return logado.perfil === 'admin';
  //   }

  //   // Demais usuários seguem acesso por setor/comum
  //   return this.auth.temAcessoAoRegistro(usuario);
  // }

  podeEditarUsuario(usuario: any): boolean {
    const logado = this.auth.usuario;

    if (!logado) return false;
    if (!this.liberaEditar) return false;

    if (logado.perfil === 'admin') return true;

    if (!this.podeGerenciarPerfil(usuario.perfil)) return false;

    return this.auth.temAcessoAoRegistro(usuario);
  }

  async onSalvar() {
    this.carregando = true;
    // console.log('USUARIO LOGADO:', this.auth.usuario);
    // console.log('UID:', this.auth.usuario?.uid);
    // console.log('PERFIL:', this.auth.usuario?.perfil);

    const usuarioLogado = this.auth.usuario;

    let idSetorFinal = this.dadosForms.value.idSetor || '';
    let idComumFinal = this.dadosForms.value.idComum || '';

    if (usuarioLogado?.perfil !== 'admin') {
      idSetorFinal = usuarioLogado?.idSetor || '';

      if (
        usuarioLogado?.perfil === 'encarregado' ||
        usuarioLogado?.perfil === 'instrutor'
      ) {
        idComumFinal = usuarioLogado?.idComum || '';
      }
    }
    // só admin pode criar admin
    // if (this.perfil === 'admin' && usuarioLogado?.perfil !== 'admin') {
    //   this.alertService.aviso(
    //     'Você não tem permissão para criar administradores.',
    //   );
    //   return;
    // }

    if (!this.podeGerenciarPerfil(this.perfil)) {
      this.alertService.aviso(
        'Você não tem permissão para criar usuário com este perfil.',
      );
      this.carregando = false;
      return;
    }
    try {
      // const perfilConfig = this.tipoPerfil[this.perfil];
      const perfilConfig = TIPO_PERFIL[this.perfil];
      if (!perfilConfig) {
        this.alertService.aviso('Perfil inválido');
        return;
      }
      await this.auth.cadastrar(this.email, this.senha, {
        nome: upper(this.nome),
        perfil: this.perfil,
        idSetor: idSetorFinal,
        idComum: idComumFinal,
        // acessos: perfilConfig.acessos,
        acessos: this.limitarAcessosPeloUsuarioLogado(perfilConfig.acessos),
      });

      this.alertService.sucesso('Usuário cadastrado com sucesso!');

      this.nome = '';
      this.email = '';
      this.senha = '';
      this.perfil = 'instrutor';
      this.fecharModal();
    } catch (erro) {
      // console.error(erro);
      this.alertService.erro('Erro ao cadastrar: ' + (erro as any).message);
    } finally {
      this.carregando = false;
    }
  }

  async salvar(): Promise<void> {
    if (!this.dadosParaEditar?.uid) return;

    const mensagem = `Deseja realmente alterar o acesso do usuários ${this.dadosParaEditar.nome}?`;
    // if (!confirmarAcao(mensagem)) return;
    if (!(await this.alertService.confirmar(mensagem))) return;

    // const dadosAtualizados = this.dadosForms.value;
    const dadosAtualizados = this.dadosForms.getRawValue();

    // dadosAtualizados.acessos = this.limitarAcessosPeloUsuarioLogado(
    //   dadosAtualizados.acessos,
    // );
    dadosAtualizados.acessos = this.mesclarAcessosPermitidos(
      this.dadosParaEditar.acessos,
      dadosAtualizados.acessos,
    );
    try {
      await this.auth.updateUsuario(this.dadosParaEditar.uid, dadosAtualizados);

      this.snackBar.open('Atualizado com sucesso!', 'Fechar', {
        duration: 3000,
      });
      this.valorOriginalFormulario = JSON.stringify(
        this.dadosForms.getRawValue(),
      );
      this.dadosForms.markAsPristine();
      this.houveAlteracao = false;

      this.liberacoes = false;
    } catch (error) {
      this.snackBar.open('Erro ao atualizar usuário', 'Fechar', {
        duration: 3000,
      });
    }
  }

  usuarioSelecionado: string = '';
  // editar(select: Usuarios): void {
  //   this.title = 'Editar Instrumentos';
  //   this.liberacoes = true;
  //   this.usuarioSelecionado =
  //     select.nome.toUpperCase() + ' - ' + select.perfil.toUpperCase();
  //   this.dadosForms = this.fb.group({
  //     perfil: [''],
  //     acessos: this.fb.group({
  //       candidatos: this.fb.group({
  //         read: [false],
  //         create: [false],
  //         update: [false],
  //         delete: [false],
  //       }),
  //       igrejas: this.fb.group({
  //         read: [false],
  //         create: [false],
  //         update: [false],
  //         delete: [false],
  //       }),
  //       instrumentos: this.fb.group({
  //         read: [false],
  //         create: [false],
  //         update: [false],
  //         delete: [false],
  //       }),
  //       setores: this.fb.group({
  //         read: [false],
  //         create: [false],
  //         update: [false],
  //         delete: [false],
  //       }),
  //       usuarios: this.fb.group({
  //         read: [false],
  //         create: [false],
  //         update: [false],
  //         delete: [false],
  //       }),
  //     }),
  //   });
  //   this.escutarMudancaPerfil();
  //   this.dadosParaEditar = { ...select };

  //   this.dadosForms.patchValue({
  //     perfil: select.perfil,
  //     acessos: select.acessos ?? TIPO_PERFIL[select.perfil as Perfil].acessos,
  //   });

  //   // console.log(this.dadosParaEditar);
  // }

  editar(select: Usuarios): void {
    this.ignorarMudancaPerfil = true;
    this.title = 'Editar Instrumentos';
    this.liberacoes = true;
    this.usuarioSelecionado =
      select.nome.toUpperCase() + ' - ' + select.perfil.toUpperCase();
    this.dadosParaEditar = { ...select };
    this.dadosForms = this.fb.group({
      perfil: [''],
      idSetor: [''],
      idComum: [''],
      acessos: this.fb.group({
        candidatos: this.fb.group({
          read: [false],
          create: [false],
          update: [false],
          delete: [false],
        }),
        grupoExames: this.fb.group({
          read: [false],
          create: [false],
          update: [false],
          delete: [false],
        }),
        igrejas: this.fb.group({
          read: [false],
          create: [false],
          update: [false],
          delete: [false],
        }),
        instrumentos: this.fb.group({
          read: [false],
          create: [false],
          update: [false],
          delete: [false],
        }),
        setores: this.fb.group({
          read: [false],
          create: [false],
          update: [false],
          delete: [false],
        }),
        solicitacoes: this.fb.group({
          read: [false],
          create: [false],
          update: [false],
          delete: [false],
        }),
        exames: this.fb.group({
          read: [false],
          create: [false],
          update: [false],
          delete: [false],
        }),
        usuarios: this.fb.group({
          read: [false],
          create: [false],
          update: [false],
          delete: [false],
        }),
        logs: this.fb.group({
          read: [false],
          create: [false],
          update: [false],
          delete: [false],
        }),
      }),
    });

    this.escutarMudancaPerfil();
    this.escutarMudancaSetor();
    this.carregarModulosPermitidosParaEdicao(select.perfil as Perfil);
    this.dadosForms.patchValue(
      {
        perfil: select.perfil,
        idSetor: select.idSetor || '',
        idComum: select.idComum || '',
        acessos: select.acessos ?? TIPO_PERFIL[select.perfil as Perfil].acessos,
      },
      { emitEvent: false }, // 💥 ISSO resolve tudo
    );
    // const acessosAtuais =
    //   select.acessos ?? TIPO_PERFIL[select.perfil as Perfil].acessos;

    // const acessosLimitados =
    //   this.limitarAcessosPeloUsuarioLogado(acessosAtuais);

    // this.dadosForms.patchValue(
    //   {
    //     acessos: acessosLimitados,
    //   },
    //   { emitEvent: false },
    // );

    this.aplicarRegraReadFalse();
    this.bloquearPermissoesNaoPermitidas();

    this.listaComunsSelect = this.listaComuns
      .filter((c) => c.idSetor === select.idSetor)
      .map((c) => ({
        value: c.id!,
        label: c.nomeCongregacao,
      }));

    this.valorOriginalFormulario = JSON.stringify(
      this.dadosForms.getRawValue(),
    );
    this.houveAlteracao = false;
    this.dadosForms.markAsPristine();

    this.dadosForms.valueChanges.subscribe(() => {
      this.atualizarStatusAlteracao();
    });

    // libera depois de carregar
    setTimeout(() => {
      this.ignorarMudancaPerfil = false;
    });
  }

  getControl(controlName: string): FormControl {
    const control = this.dadosForms.get(controlName);
    if (!control) {
      throw new Error(`FormControl '${controlName}' não existe no FormGroup`);
    }
    return control as FormControl;
  }

  fecharModal() {
    this.mostrarModal = false;
    this.dadosForms.reset();
  }

  cancel() {
    this.liberacoes = false;
  }
}
