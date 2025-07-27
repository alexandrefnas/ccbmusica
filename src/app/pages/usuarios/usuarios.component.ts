import { Component, OnInit } from '@angular/core';
import { ModalComponent } from '../../modal/modal/modal.component';
import { ButtonComponent } from '../../component/button/button.component';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { TextComponent } from '../../component/inputs/text/text.component';
import { SelectComponent } from '../../component/inputs/select/select.component';
import { TableComponent } from '../../component/table/table.component';

@Component({
  selector: 'tcx-usuarios',
  imports: [
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

  nome = '';
  email = '';
  senha = '';
  perfil = 'usuario';
  carregando = false;

  listaTipoUsuario = [
    { value: 'admin', label: 'Admin' },
    { value: 'regional', label: 'Regional' },
    { value: 'encarregado', label: 'Encarregado' },
    { value: 'usuario', label: 'Instrutor' },
  ];

  camposColunas = ['nome', 'email'];
  tituloColunas = {
    nome: 'Nome',
    email: 'Email',
  };

  listaUsuarios: any[] = [];

  alinhamentoColunaTitulo: { [coluna: string]: 'left' | 'center' | 'right' } = {
    // mostrarAcoes: 'center',
    nome: 'center',
  };

  alinhamentoColuna: { [coluna: string]: 'left' | 'center' | 'right' } = {
    // valor: 'right',
  };

  tamanhoColunas = {
    nome: { width: '50%' },
    email: { width: '50%' },
    // mostrarAcoes: { width: '75px' },
  };

  dadosForms: FormGroup;

  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.dadosForms = this.fb.group({
      nome: ['', Validators.required],
      email: ['', Validators.required],
      senha: ['', Validators.required],
      perfil: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.carregarDados();
  }

  buttonClick(): void {
    this.title = 'TESTE';
    this.mostrarModal = true;
  }

  carregarDados(): void {
    const ref = this.auth;
    const collectionRef = ref && ref['firestore'] ? ref['firestore'] : null;

    if (!collectionRef) {
      console.error('Firestore não está inicializado.');
      return;
    }

    this.auth.getUsuario().subscribe((u) => {
      this.listaUsuarios = u.sort((a, b) => {
        const nomeA = a.nome?.toLowerCase() || '';
        const nomeB = b.nome?.toLowerCase() || '';
        return nomeA.localeCompare(nomeB);
      });
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

    try {
      await this.auth.cadastrar(this.email, this.senha, {
        nome: this.nome,
        perfil: this.perfil,
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
