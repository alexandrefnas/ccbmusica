import { Component } from '@angular/core';
import { ModalComponent } from '../../modal/modal/modal.component';
import { ButtonComponent } from '../../component/button/button.component';
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
import { DataComponent } from '../../component/inputs/data/data.component';
import { converterISOParaBR, formatarDataString } from '../../../shared/shared.service';

@Component({
  selector: 'tcx-alunos',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ModalComponent,
    ButtonComponent,
    TextComponent,
    SelectComponent,
    DataComponent,
  ],
  templateUrl: './alunos.component.html',
  styleUrl: './alunos.component.css',
})
export class AlunosComponent {
  title = 'TITULO';
  mostrarModal = false;

  listaCongregacao = [{ value: '01', label: 'Teste' }];
  listaInstrumento = [{ value: '01', label: 'Teste' }];
  listaAfinacao = [
    { value: 'DÓ', label: 'DÓ' },
    { value: 'FÁ', label: 'FÁ' },
    { value: 'FÁ/SIB', label: 'FÁ/SIB' },
    { value: 'LÁ', label: 'LÁ' },
    { value: 'MIB', label: 'MIB' },
    { value: 'SIB', label: 'SIB' },
  ];

  dadosForms: FormGroup;

  constructor(private fb: FormBuilder) {
    this.dadosForms = this.fb.group({
      nomeAluno: ['', Validators.required],
      idCongregacao: ['', Validators.required],
      dataNascimento: [''],
      idInstrumento: [''],
      afinacao: [''],
    });
  }

  getControl(controlName: string): FormControl {
    const control = this.dadosForms.get(controlName);
    if (!control) {
      throw new Error(`FormControl '${controlName}' não existe no FormGroup`);
    }
    return control as FormControl;
  }

  onSalvar(): void {
    if (!this.dadosForms.valid) {
      this.dadosForms.markAllAsTouched();
      alert('Formulário inválido. Preencha os campos obrigatórios.');
      return;
    }
    const date = formatarDataString(new Date(this.dadosForms.value.dataNascimento));
    const baseData = {
      ...this.dadosForms.value,
      dataNascimento: date,
}
    console.log(baseData);
  }

  buttonClick(): void {
    this.title = 'Cadastro Alunos';
    this.mostrarModal = true;
  }

  fecharModal() {
    this.mostrarModal = false;
    this.dadosForms.reset();
  }
}
