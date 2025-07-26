import { Component, Input } from '@angular/core';
import { ModalComponent } from '../../modal/modal/modal.component';
import { ButtonComponent } from '../../component/button/button.component';
import { DataComponent } from '../../component/inputs/data/data.component';
import { TextComponent } from '../../component/inputs/text/text.component';
import { DecimalComponent } from '../../component/inputs/decimal/decimal.component';
import { SelectComponent } from '../../component/inputs/select/select.component';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TextSelectComponent } from '../../component/inputs/text-select/text-select.component';
import { TableComponent } from '../../component/table/table.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ModalComponent,
    ButtonComponent,
    DataComponent,
    TextComponent,
    DecimalComponent,
    SelectComponent,
    TextSelectComponent,
    TableComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  title = 'TITULO';
  mostrarModal = false;
  nome: string = '';
  dataTeste = '';

  lista1 = [
    { value: 'Alta', label: 'Alta' },
    { value: 'Moderado', label: 'Moderado' },
    { value: 'Baixa', label: 'Baixa' },
    { value: 'Em Andamento', label: 'Em Andamento' },
  ];

  dadosForms: FormGroup;
  // dados: any[] = [];

  tituloColunas = {
    data: 'Data',
    nome: 'Nome',
    valor: 'Valor (R$)',
    status: 'Situação',
  };

  camposColunas = ['data', 'nome', 'valor', 'status'];

  formatoColunas: any = { data: 'data', valor: 'decimal' };

  dados = [
    { data: '15/12/2014', nome: 'Alexandre', valor: 1200, status: 'pendente' },
    { data: '', nome: 'Fernanda', valor: 800, status: 'pago' },
    { data: '', nome: 'Carlos', valor: 600, status: 'atrasado' },
  ];

  // Buttons
  acoes = [
    {
      label: '✏️',
      descricao: 'Editar',
      classe: 'acao-editar',
      visivel: (item: any) => item.status !== 'pago',
      callback: (item: any) => this.buttonClick(),
    },
    {
      label: '✅',
      descricao: 'Confirmar',
      classe: 'acao-confirmar',
      visivel: (item: any) => item.status === 'pendente',
      callback: (item: any) => console.log('Confirmado', item),
    },
  ];
  // fim

  // Regras de destaque linhas
  regrasDestaque = [
    {
      condicao: (item: any) => item.status === 'atrasado',
      estiloClasse: 'linha-vermelha',
    },
    {
      condicao: (item: any) => item.status === 'pago',
      estiloClasse: 'linha-sucesso',
    },
    {
      condicao: (item: any) => item.status === 'pendente',
      estiloClasse: 'linha-aviso',
    },
  ];
  // fim

  // Formatação Colunas
  tamanhoColunas = {
    valor: { width: '100px' },
    status: { width: '100px' },
    // mostrarAcoes: { width: '75px' },
  };

  alinhamentoColunaTitulo: { [coluna: string]: 'left' | 'center' | 'right' } = {
    // mostrarAcoes: 'center',
    nome: 'center',
  };

  alinhamentoColuna: { [coluna: string]: 'left' | 'center' | 'right' } = {
    valor: 'right',
  };
  // fim

  constructor(private fb: FormBuilder) {
    this.dadosForms = this.fb.group({
      dataTeste: [''],
      cpf: [''],
      nome: [''],
      teste: [''],
      testeAlerta: [''],
      // testeAlerta: ['',Validators.required],
    });
  }

  editarItem(): void {}

  getControl(controlName: string): FormControl {
    const control = this.dadosForms.get(controlName);
    if (!control) {
      throw new Error(`FormControl '${controlName}' não existe no FormGroup`);
    }
    return control as FormControl;
  }

  onSalvar(): void {
    // const data = this.dadosForms.value.dataTeste;
    // const cpf = this.dadosForms.value.cpf;
    // const nome = this.dadosForms.value.nome;
    // const teste = this.dadosForms.value.teste;
    console.log(this.dadosForms.value);
  }

  buttonClick(): void {
    this.title = 'TESTE';
    this.mostrarModal = true;
  }


  fecharModal() {
    this.mostrarModal = false;
    this.dadosForms.reset();
  }
}
