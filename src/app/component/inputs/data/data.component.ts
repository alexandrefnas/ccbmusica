import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Optional,
  Output,
  Self,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { MY_DATE_FORMATS } from './pt-br-date-formats';
import {
  MatMomentDateModule,
  MomentDateAdapter,
} from '@angular/material-moment-adapter';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'tcx-data',
  standalone: true,
  imports: [
    CommonModule,
    MatInputModule,
    MatDatepickerModule,
    MatMomentDateModule,
  ],

  templateUrl: './data.component.html',
  styleUrl: './data.component.css',
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE],
    },
  ],
})
export class DataComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() value: Date | null | undefined = undefined;

  // @Input() value: Date = new Date();
  @Input() errorMessage: string = 'Campo obrigatório';
  @Input() required: boolean = false;
  @Input() isFocused: boolean = false;
  @Input() disabled: boolean = false;
  @Output() valueChange = new EventEmitter<Date>();

  onChange = (value: any) => {};
  onTouched = () => {};

  constructor(@Self() @Optional() public ngControl: NgControl) {
    if (ngControl) {
      ngControl.valueAccessor = this;
    }
  }

  // ngControl: NgControl | null = null;

  // constructor(private injector: Injector) {}

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

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Delete') {
      this.value = null;
      this.onChange(this.value);
      this.onTouched();
      this.valueChange.emit(undefined);
    }

    if (event.key === 'Enter') {
      event.preventDefault(); // evita comportamento padrão

      const formElements = Array.from(
        document.querySelectorAll<HTMLElement>(
          'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => {
        // Ignorar desabilitados
        if (el.hasAttribute('disabled')) return false;
        // Ignorar o botão do calendário especificamente
        if (el.classList.contains('calendar-button')) return false;
        return true;
      });

      const index = formElements.indexOf(event.target as HTMLElement);
      const next = formElements[index + 1];
      if (next) {
        next.focus();
      }
    }
  }

  permitirSomenteNumeros(event: KeyboardEvent) {
    const tecla = event.key;

    const teclasPermitidas = [
      'Backspace',
      'Tab',
      'Enter',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      '/',
    ];

    const ctrlCombinacoes = ['a', 'c', 'v', 'x'];

    const isCtrl = event.ctrlKey || event.metaKey; // MetaKey para Mac
    const isNumero = /^[0-9]$/.test(tecla);
    const isPermitida = teclasPermitidas.includes(tecla);
    const isCtrlAtalho =
      isCtrl && ctrlCombinacoes.includes(tecla.toLowerCase());

    if (!isNumero && !isPermitida && !isCtrlAtalho) {
      event.preventDefault();
    }
  }

  aplicarMascaraData(event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, ''); // Remove tudo que não for número

    if (valor.length > 8) {
      valor = valor.substring(0, 8);
    }

    // Aplica a máscara: dd/mm/yyyy
    if (valor.length > 4) {
      valor = valor.replace(/^(\d{2})(\d{2})(\d{1,4}).*/, '$1/$2/$3');
    } else if (valor.length > 2) {
      valor = valor.replace(/^(\d{2})(\d{1,2})/, '$1/$2');
    }

    input.value = valor;
  }

  writeValue(value: Date): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // implementar se quiser lidar com desabilitado
    this.disabled = isDisabled;
  }

  onDateChange(event: any) {
    this.value = event.value;
    this.valueChange.emit(this.value ?? undefined);

    this.onChange(this.value);
    this.onTouched();
  }

  handleBlur(): void {
    this.isFocused = false;
    this.onTouched(); // isso marca o campo como "touched" no Angular
  }

  hasError(): boolean {
    return (
      !!this.ngControl?.control?.invalid && !!this.ngControl?.control?.touched
    );
  }
}
