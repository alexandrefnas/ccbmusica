import { Component } from '@angular/core';
import { ButtonComponent } from '../../component/button/button.component';
import { ModalComponent } from '../../modal/modal/modal.component';
import { TableComponent } from '../../component/table/table.component';
import { TextComponent } from '../../component/inputs/text/text.component';
import { SelectComponent } from '../../component/inputs/select/select.component';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'tcx-setor',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonComponent,
    ModalComponent,
    // TableComponent,
    TextComponent,
    SelectComponent,
  ],
  templateUrl: './setor.component.html',
  styleUrl: './setor.component.css',
})
export class SetorComponent {
  title = 'TITULO';
  mostrarModal = false;

  listaEstados = [
    { value: 'AC', label: 'AC' },
    { value: 'AL', label: 'AL' },
    { value: 'AP', label: 'AP' },
    { value: 'AM', label: 'AM' },
    { value: 'BA', label: 'BA' },
    { value: 'CE', label: 'CE' },
    { value: 'DF', label: 'DF' },
    { value: 'ES', label: 'ES' },
    { value: 'GO', label: 'GO' },
    { value: 'MA', label: 'MA' },
    { value: 'MS', label: 'MS' },
    { value: 'MT', label: 'MT' },
    { value: 'MG', label: 'MG' },
    { value: 'PA', label: 'PA' },
    { value: 'PB', label: 'PB' },
    { value: 'PR', label: 'PR' },
    { value: 'PE', label: 'PE' },
    { value: 'PI', label: 'PI' },
    { value: 'RJ', label: 'RJ' },
    { value: 'RN', label: 'RN' },
    { value: 'RS', label: 'RS' },
    { value: 'RO', label: 'RO' },
    { value: 'RR', label: 'RR' },
    { value: 'SC', label: 'SC' },
    { value: 'SP', label: 'SP' },
    { value: 'SE', label: 'SE' },
    { value: 'TO', label: 'TO' },
  ];

  dadosForms: FormGroup;

  constructor(private fb: FormBuilder) {
    this.dadosForms = this.fb.group({
      nomeSetor: ['', Validators.required],
      nomeCidade: ['', Validators.required],
      estado: ['', Validators.required],
      // testeAlerta: ['',Validators.required],
    });
  }

  getControl(controlName: string): FormControl {
    const control = this.dadosForms.get(controlName);
    if (!control) {
      throw new Error(`FormControl '${controlName}' não existe no FormGroup`);
    }
    return control as FormControl;
  }

  buttonClick(): void {
    this.title = 'Cadastro Setor';
    this.mostrarModal = true;
  }

  onSalvar(): void {
    if (!this.dadosForms.valid) {
      this.dadosForms.markAllAsTouched();
      alert('Formulário inválido. Preencha os campos obrigatórios.');
      return;
    }
    console.log(this.dadosForms.value);
  }

  fecharModal() {
    this.mostrarModal = false;
  }
}
