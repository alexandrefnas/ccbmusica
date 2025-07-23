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

@Component({
  selector: 'tcx-igrejas',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ModalComponent,
    ButtonComponent,
    TextComponent,
    SelectComponent,
  ],
  templateUrl: './igrejas.component.html',
  styleUrl: './igrejas.component.css',
})
export class IgrejasComponent {
  title = 'TITULO';
  mostrarModal = false;

  listaSetor = [{ value: '01', label: 'Teste' }];

  dadosForms: FormGroup;

  constructor(private fb: FormBuilder) {
    this.dadosForms = this.fb.group({
      nomeCongregacao: ['', Validators.required],
      idSetor: ['', Validators.required],
      localizacao: [''],
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
    console.log(this.dadosForms.value);
  }

  buttonClick(): void {
    this.title = 'Cadastro de Congregação';
    this.mostrarModal = true;
  }

  fecharModal() {
    this.mostrarModal = false;
    this.dadosForms.reset();
  }
}
