import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostListener,
  Input,
  Optional,
  Output,
  Self,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NgControl,
} from '@angular/forms';

@Component({
  selector: 'tcx-text-select',
  imports: [CommonModule],
  templateUrl: './text-select.component.html',
  styleUrl: './text-select.component.css',
})
export class TextSelectComponent implements ControlValueAccessor {
  @Input() label: string = '';

  @Input() selectedValue: string = '';
  @Input() placeholder: string = '';
  // @Input() allowTyping: boolean = false;
  @Input() fontSize: number = 12;
  @Input() isFocused: boolean = false;
  @Input() showOptions: boolean = false;
  @Input() showOptionsClose: boolean = false;
  @Input() disabled: boolean = false;
  @Input() required: boolean = false;
  @Input() errorMessage: string = 'Campo obrigatório';

  @Input() filteredOptions: { value: string; label: string }[] = [];
  @Input() niveis: { value: string; label: string }[] = [];

  // onChange = (value: any) => {};
  // onTouched = () => {};

  @Output() valorMudou = new EventEmitter<string>();

  value: string = '';
  // ngControl: NgControl | null = null;
  private clicandoInternamente = false;

  constructor(
    private elementRef: ElementRef,
    @Self() @Optional() public ngControl: NgControl
  ) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  ngOnInit() {
    this.filteredOptions = [...this.niveis];
  }

  // Quando digita no input
  onInputChange(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.selectedValue = valor;
    this.valorMudou.emit(valor);

    this.filteredOptions = this.niveis.filter((option) =>
      option.label.toLowerCase().includes(valor.toLowerCase())
    );
    this.showOptions = true;
  }

  toggleOptions(): void {
    this.showOptions = !this.showOptions;
  }

  onFocus(): void {
    this.isFocused = true;
    this.showOptions = true;
  }

  selectOption(option: { value: string; label: string }): void {
    this.selectedValue = option.value;
    this.onChange(this.selectedValue);
    this.showOptions = false;
    this.valorMudou.emit(this.selectedValue);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showOptions = false;
      this.isFocused = false;
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.showOptions = false;
      this.showOptionsClose = true;
    }

    if (event.key === 'Delete') {
      this.selectedValue = '';
      this.onChange('');
      this.filteredOptions = [...this.niveis];
      this.valorMudou.emit('');
    }

    if (event.key === 'Enter') {
      event.preventDefault(); // evita comportamento padrão

      const formElements = Array.from(
        document.querySelectorAll<HTMLElement>(
          'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled'));

      const index = formElements.indexOf(event.target as HTMLElement);
      const next = formElements[index + 1];
      if (next) {
        next.focus();
      }
    }
  }

  // Métodos do ControlValueAccessor

  onChange = (value: any) => {};
  onTouched = () => {};
  getInputValue(event: Event): string {
    const target = event.target as HTMLInputElement;
    return target?.value || '';
  }

  writeValue(value: any): void {
    this.value = value;
    this.selectedValue = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // você pode adicionar lógica para desabilitar o input, se quiser
  }

  selecionarValor(valor: string) {
    this.value = valor;
    this.onChange(this.value);
    this.onTouched();
  }

  hasError(): boolean {
    return !!(
      this.ngControl?.control?.invalid && this.ngControl?.control?.touched
    );
  }

  onBlur(): void {
    this.isFocused = false;
    this.onTouched();
  }
}

// onBlur() {
//   setTimeout(() => {
//     if (this.clicandoInternamente) {
//       this.clicandoInternamente = false;
//       return; // não fecha o dropdown se o clique foi interno
//     }

//     if (!this.showOptionsClose) {
//       this.showOptions = false;
//     }

//     this.isFocused = false;
//     this.onTouched();
//   }, 150);
// }

// abrirFecharComControle(event: MouseEvent): void {
//   event.preventDefault(); // impede que o input perca o foco
//   this.toggleOptions();
// }

// selecionarComControle(
//   option: { value: string; label: string },
//   event: MouseEvent
// ) {
//   event.preventDefault(); // impede que o input perca o foco
//   this.selectOption(option);
// }

// onMouseDownInterno(): void {
//   this.clicandoInternamente = true;
// }
