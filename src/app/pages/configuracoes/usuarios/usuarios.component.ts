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
import { AuthService, Usuarios } from '../../../services/auth.service';
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
  title = 'TITULO';
  mostrarModal = false;
  liberacoes = false;
  dadosParaEditar: any | null = null;
  modulos: Modulo[] = [
    'candidatos',
    'igrejas',
    'instrumentos',
    'setores',
    'usuarios',
  ];

  nome = '';
  email = '';
  senha = '';
  perfil: Perfil = 'usuario';
  carregando = false;

  listaTipoUsuario = LISTA_TIPO_USUARIO;

  camposColunas = ['nome', 'email', 'perfil'];
  tituloColunas = {
    nome: 'Nome',
    email: 'Email',
    perfil: 'Perfil',
  };

  listaUsuarios: any[] = [];

  alinhamentoColunaTitulo: { [coluna: string]: 'left' | 'center' | 'right' } = {
    // mostrarAcoes: 'center',
    nome: 'center',
    perfil: 'center',
  };

  alinhamentoColuna: { [coluna: string]: 'left' | 'center' | 'right' } = {
    perfil: 'center',
    // valor: 'right',
  };

  tamanhoColunas = {
    nome: { width: '40%' },
    email: { width: '35%' },
    perfil: { width: '25%' },
    // mostrarAcoes: { width: '75px' },
  };

  // Buttons
  acoes = [
    {
      label: '✏️',
      descricao: 'Editar',
      classe: 'acao-editar',
      visivel: (item: any) => true,
      callback: (item: any) => this.editar(item),
    }
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

  // tipoPerfil: any = {
  //   admin: {
  //     acessos: {
  //       candidatos: { read: true, create: true, update: true, delete: true },
  //       igrejas: { read: true, create: true, update: true, delete: true },
  //       instrumentos: { read: true, create: true, update: true, delete: true },
  //       setores: { read: true, create: true, update: true, delete: true },
  //       usuarios: { read: true, create: true, update: true, delete: true },
  //     },
  //   },

  //   regional: {
  //     acessos: {
  //       candidatos: { read: true, create: true, update: true, delete: true },
  //       igrejas: { read: true, create: false, update: false, delete: false },
  //       instrumentos: {
  //         read: true,
  //         create: false,
  //         update: false,
  //         delete: false,
  //       },
  //       setores: { read: false, create: false, update: false, delete: false },
  //       usuarios: { read: true, create: true, update: true, delete: true },
  //     },
  //   },
  //   secretario: {
  //     acessos: {
  //       candidatos: { read: true, create: true, update: true, delete: true },
  //       igrejas: { read: true, create: false, update: false, delete: false },
  //       instrumentos: {
  //         read: true,
  //         create: false,
  //         update: false,
  //         delete: false,
  //       },
  //       setores: { read: false, create: false, update: false, delete: false },
  //       usuarios: { read: true, create: true, update: true, delete: true },
  //     },
  //   },

  //   encarregado: {
  //     acessos: {
  //       candidatos: { read: true, create: true, update: true, delete: true },
  //       igrejas: { read: false, create: false, update: false, delete: false },
  //       instrumentos: {
  //         read: false,
  //         create: false,
  //         update: false,
  //         delete: false,
  //       },
  //       setores: { read: false, create: false, update: false, delete: false },
  //       usuarios: { read: false, create: false, update: false, delete: false },
  //     },
  //   },

  //   usuario: {
  //     acessos: {
  //       candidatos: { read: true, create: true, update: true, delete: false },
  //       igrejas: { read: false, create: false, update: false, delete: false },
  //       instrumentos: {
  //         read: false,
  //         create: false,
  //         update: false,
  //         delete: false,
  //       },
  //       setores: { read: false, create: false, update: false, delete: false },
  //       usuarios: { read: false, create: false, update: false, delete: false },
  //     },
  //   },
  // };

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private cd: ChangeDetectorRef,
  ) {
    this.dadosForms = this.fb.group({
      nome: ['', Validators.required],
      email: ['', Validators.required],
      senha: ['', Validators.required],
      perfil: ['', Validators.required],
    });
  }

  get permissao() {
    return this.auth.temPermissao('usuarios', 'create');
  }

  ngOnInit(): void {
    this.carregarDados();
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

  carregarDados(): void {
    this.auth.getUsuario().subscribe((usuarios) => {
      this.listaUsuarios = [...usuarios].sort((a, b) =>
        (a.nome?.toLowerCase() || '').localeCompare(
          b.nome?.toLowerCase() || '',
        ),
      );
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
      this.perfil = 'usuario';
      this.fecharModal();
    } catch (erro) {
      console.error(erro);
      alert('Erro ao cadastrar: ' + (erro as any).message);
    } finally {
      this.carregando = false;
    }
  }

  editar(select: Usuarios): void {
    this.title = 'Editar Instrumentos';
    this.liberacoes = true;
    this.dadosParaEditar = { ...select };

    this.dadosForms.patchValue({
      perfil: select.perfil,
      acessos: select.acessos ?? TIPO_PERFIL[select.perfil as Perfil].acessos,
    });

    console.log(this.dadosParaEditar);
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
}
