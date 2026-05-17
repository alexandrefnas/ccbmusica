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


  liberaEditar: boolean = false;
  liberaCriar: boolean = false;
  liberaDeletar: boolean = false;

  title = 'TITULO';
  mostrarModal = false;
  liberacoes = false;
  dadosParaEditar: any | null = null;
  modulos: Modulo[] = [
    'candidatos',
    'igrejas',
    'instrumentos',
    'setores',
    'solicitacoes',
    'exames',
    'usuarios',
  ];

  nome = '';
  email = '';
  senha = '';
  perfil: Perfil = 'instrutor';
  carregando = false;
  ignorarMudancaPerfil = false;

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
      label: '✏️',
      descricao: 'Editar',
      classe: 'acao-editar',
      visivel: (item: any) => this.liberaEditar,
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


  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private cd: ChangeDetectorRef,
    private snackBar: MatSnackBar,
  ) {
    this.dadosForms = this.fb.group({
      nome: ['', Validators.required],
      email: ['', Validators.required],
      senha: ['', Validators.required],
      perfil: ['', Validators.required],
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

  // ngOnInit(): void {
  //   this.escutarMudancaPerfil();
  //   this.carregarDados();
  // }

ngOnInit(): void {
  this.escutarMudancaPerfil();
  this.carregarDados();

  this.auth.currentUserData$.subscribe(() => {
    this.liberaEditar = this.permissao('update');
    this.liberaCriar = this.permissao('create');
    this.liberaDeletar = this.permissao('delete');

    this.cd.markForCheck();
  });
}

  private escutarMudancaPerfil() {
    this.getControl('perfil')?.valueChanges.subscribe((perfil: Perfil) => {
      if (this.ignorarMudancaPerfil) return;
      if (!perfil) return;

      const confirmar = confirm(
        'Deseja aplicar as permissões padrão deste perfil?',
      );

      if (!confirmar) return;

      const config = TIPO_PERFIL[perfil];

      this.dadosForms.patchValue({
        acessos: JSON.parse(JSON.stringify(config.acessos)),
      });
    });
  }

  buttonClick(): void {
    this.title = 'TESTE';
    this.mostrarModal = true;
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
        .map((u) => ({
          ...u,
          nome: (u.nome || '').toUpperCase(),
          // perfil: (u.perfil || ''),
          perfil2:(u.perfil || '').toUpperCase()
        }))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

      this.cd.markForCheck(); // força atualização
    });
  }

  prepararDados() {
    if (!this.dadosForms.valid) {
      this.dadosForms.markAllAsTouched();
      alert('Formulário inválido. Preencha os campos obrigatórios.');
      return;
    }
    this.nome = this.dadosForms.value.nome;
    this.email = this.dadosForms.value.email;
    this.senha = this.dadosForms.value.senha;
    this.perfil = this.dadosForms.value.perfil;

    this.onSalvar();
  }

  async onSalvar() {
    this.carregando = true;
    // console.log('USUARIO LOGADO:', this.auth.usuario);
    // console.log('UID:', this.auth.usuario?.uid);
    // console.log('PERFIL:', this.auth.usuario?.perfil);

    const usuarioLogado = this.auth.usuario;

    // só admin pode criar admin
    if (this.perfil === 'admin' && usuarioLogado?.perfil !== 'admin') {
      alert('Você não tem permissão para criar administradores.');
      return;
    }

    try {
      // const perfilConfig = this.tipoPerfil[this.perfil];
      const perfilConfig = TIPO_PERFIL[this.perfil];
      if (!perfilConfig) {
        alert('Perfil inválido');
        return;
      }
      await this.auth.cadastrar(this.email, this.senha, {
        nome: upper(this.nome),
        perfil: this.perfil,
        acessos: perfilConfig.acessos,
      });

      alert('Usuário cadastrado com sucesso!');

      this.nome = '';
      this.email = '';
      this.senha = '';
      this.perfil = 'instrutor';
      this.fecharModal();
    } catch (erro) {
      console.error(erro);
      alert('Erro ao cadastrar: ' + (erro as any).message);
    } finally {
      this.carregando = false;
    }
  }

  async salvar(): Promise<void> {
    if (!this.dadosParaEditar?.uid) return;

    const mensagem = `Deseja realmente alterar o acesso do usuário ${this.dadosParaEditar.nome}?`;
    if (!confirmarAcao(mensagem)) return;

    const dadosAtualizados = this.dadosForms.value;

    try {
      await this.auth.updateUsuario(this.dadosParaEditar.uid, dadosAtualizados);

      this.snackBar.open('Atualizado com sucesso!', 'Fechar', {
        duration: 3000,
      });

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
      acessos: this.fb.group({
        candidatos: this.fb.group({
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
      }),
    });

    this.escutarMudancaPerfil();

    this.dadosForms.patchValue(
      {
        perfil: select.perfil,
        acessos: select.acessos ?? TIPO_PERFIL[select.perfil as Perfil].acessos,
      },
      { emitEvent: false }, // 💥 ISSO resolve tudo
    );
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
  }

  cancel() {
    this.liberacoes = false;
  }
}
