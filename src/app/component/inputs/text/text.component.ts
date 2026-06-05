import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Injector,
  Input,
  Optional,
  Output,
  Self,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { AlertService } from '../../../services/alert.service';

@Component({
  selector: 'tcx-text',
  imports: [CommonModule],
  templateUrl: './text.component.html',
  styleUrl: './text.component.css',
})
export class TextComponent {
  @Input() type: string = 'text';
  @Input() label: string = '';
  @Input() required: boolean = false;
  @Input() placeholder: string = '';
  @Input() errorMessage: string = 'Este campo é obrigatório';
  @Input() value: any;
  @Input() min?: number;
  @Input() max?: number;
  @Input() isFocused: boolean = false;
  @Input() disabled: boolean = false;
  @Input() copiaConteudo: boolean = false;
  @Output() valueChange = new EventEmitter<string>();

  onChange = (_: any) => {};
  onTouched = () => {};

  // ngControl: NgControl | null = null;

  // constructor(private injector: Injector) {}
  constructor(@Self() @Optional() public ngControl: NgControl,private alertService: AlertService) {
    if (ngControl) {
      ngControl.valueAccessor = this;
    }
  }

  // ngOnInit(): void {
  //   try {
  //     this.ngControl = this.injector.get(NgControl);
  //     if (this.ngControl) {
  //       this.ngControl.valueAccessor = this;
  //     }
  //   } catch (e) {
  //     // Ignora se não estiver dentro de um FormControl
  //   }
  // }

  handleClick(): void {
    if (this.disabled) {
      this.copiarValor();
    }
  }

  copiarValor(): void {
    if (!this.value) return;

    navigator.clipboard.writeText(this.value).then(
      () => {
        this.alertService.sucesso('Copiado para a área de transferência!');
      },
      (err) => {
        this.alertService.erro('Erro ao copiar:', err);
      },
    );
  }

  handleBlur(): void {
    this.isFocused = false;
    this.onTouched(); // isso marca o campo como "touched" no Angular
  }

  hasError(): boolean {
    return !!(
      this.ngControl?.control?.invalid && this.ngControl?.control?.touched
    );
  }

  writeValue(value: any): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // se quiser lidar com campo desabilitado
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let inputValue = input.value ?? '';

    this.value = inputValue;
    this.valueChange.emit(inputValue);
    this.onChange(inputValue);
    this.onTouched();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault(); // evita comportamento padrão

      const formElements = Array.from(
        document.querySelectorAll<HTMLElement>(
          'input, select, textarea, button, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled'));

      const index = formElements.indexOf(event.target as HTMLElement);
      const next = formElements[index + 1];
      if (next) {
        next.focus();
      }
    }
  }

  getErrorMessage(): string {
    const errors = this.ngControl?.control?.errors;
    if (!errors) return '';

    if (errors['required']) {
      return this.errorMessage || 'Campo obrigatório';
    }

    if (errors['min']) {
      return `O valor mínimo permitido é ${errors['min'].min}`;
    }

    if (errors['max']) {
      return `O valor máximo permitido é ${errors['max'].max}`;
    }

    return 'Valor inválido';
  }
}
