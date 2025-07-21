import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Injector,
  Input,
  Optional,
  Output,
  Self,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { NgControl } from '@angular/forms';

@Component({
  selector: 'tcx-decimal',
  imports: [CommonModule],
  templateUrl: './decimal.component.html',
  styleUrl: './decimal.component.css',
})
export class DecimalComponent {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() type: string = 'text';
  @Input() required: boolean = false;
  @Input() errorMessage: string = 'Este campo é obrigatório';
  @Input() onlyNumbers: boolean = false;
  @Input() maskType:
    | 'numeric'
    | 'decimal'
    | 'cpf'
    | 'cnpj'
    | 'money'
    | 'cep'
    | 'phone'
    | '' = '';
  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>(); // Valor Formato
  @Output() rawValueChange = new EventEmitter<number>(); // Valor Limpo (ex: 1234.56)
  @Input() maxLength: number = 20; // ou o valor que quiser
  @Input() disabled: boolean = false;
  @Input() alinharDireita: boolean = false;

  @Input() isFocused: boolean = false;
  formattedValue: string = '';

  onChange = (_: any) => {};
  onTouched = () => {};

 constructor(@Self() @Optional() public ngControl: NgControl) {
    if (ngControl) {
      ngControl.valueAccessor = this;
    }
  }


  // ngControl: NgControl | null = null;

  // constructor(private injector: Injector) {}

  // Receber foco no Input
  // @ViewChild('input') inputElementRef!: ElementRef<HTMLInputElement>;

  // focus(): void {
  //   this.inputElementRef?.nativeElement?.focus();
  // }

  alinhaTexto(): { [klass: string]: any } {
    return this.alinharDireita ? { 'text-align': 'right' } : {};
  }

  //
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.formattedValue = this.applyMask(String(this.value || ''));
    }
  }

  copiarValor(): void {
    if (!this.value) return;

    navigator.clipboard.writeText(this.value).then(
      () => {
        alert('Copiado para a área de transferência!');
      },
      (err) => {
        console.error('Erro ao copiar:', err);
      }
    );
  }

  writeValue(value: string | number | null): void {
    const valorString = value != null ? String(value) : '';
    this.value = valorString;
    this.formattedValue = this.applyMask(valorString);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // Implementar se quiser suportar desabilitado
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const rawValue = input.value;
    const masked = this.applyMask(rawValue);
    this.formattedValue = masked;
    this.value = masked;
    this.valueChange.emit(masked);

    // Emitir o valor numérico limpo (ex: 12345.67)
    const rawNumeric = this.extractNumericValue(masked);
    this.rawValueChange.emit(rawNumeric);

    this.onChange(masked);
    this.onTouched();
  }

  extractNumericValue(masked: string): number {
    if (this.maskType === 'money') {
      const cleaned = masked.replace(/[^\d]/g, '');
      const numeric = parseFloat(cleaned) / 100;
      return isNaN(numeric) ? 0 : numeric;
    }

    // Caso queira usar para outras máscaras no futuro
    return parseFloat(masked.replace(/[^\d]/g, '')) || 0;
  }

  @ViewChild('input') input!: ElementRef<HTMLInputElement>;

  onKeyDown(event: KeyboardEvent): void {
    const allowedKeys = [
      'Backspace',
      'Tab',
      'ArrowLeft',
      'ArrowRight',
      'Delete',
      'Enter',
    ];
    const isNumber = /^[0-9]$/.test(event.key);
    const isAllowed = allowedKeys.includes(event.key);
    const isCtrlV = event.ctrlKey && event.key.toLowerCase() === 'v';
    const isCtrlC = event.ctrlKey && event.key.toLowerCase() === 'c';

    if (!isNumber && !isAllowed && !isCtrlV && !isCtrlC) {
      event.preventDefault();
    }

    if (event.key === 'Delete') {
      this.value = '';
      this.onChange(this.value);
      this.onTouched();
      this.valueChange.emit(undefined);

      if (this.input?.nativeElement) {
        this.input.nativeElement.value = '';
      }
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

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    const pastedText = event.clipboardData?.getData('text') || '';
    const masked = this.applyMask(pastedText);
    this.formattedValue = masked;
    this.value = masked;
    this.valueChange.emit(masked);

    const rawNumeric = this.extractNumericValue(masked);
    this.rawValueChange.emit(rawNumeric);

    this.onChange(masked);
    this.onTouched();

    event.preventDefault(); // Impede duplicação do conteúdo colado

    // Atualiza visualmente o input
    if (this.input?.nativeElement) {
      this.input.nativeElement.value = masked;
    }
  }

  applyMask(value: string): string {
    const onlyNumbers = value.replace(/\D/g, '');
    if (!onlyNumbers) return '';
    switch (this.maskType) {
      case 'numeric':
        return this.applyNumeric(value);
      case 'decimal':
        return this.applyDecimal(value);
      case 'money':
        return this.applyMoneyMask(value);
      case 'cpf':
        this.maxLength = 14;
        return this.applyCpfMask(value);
      case 'cnpj':
        this.maxLength = 18;
        return this.applyCnpjMask(value);
      case 'cep':
        this.maxLength = 10;
        return this.applyCepMask(value);
      case 'phone':
        this.maxLength = 15;
        return this.applyPhoneMask(value);
      default:
        return value;
    }
  }

  applyNumeric(value: string): string {
    value = value.replace(/[^0-9,]/g, '');
    const parts = value.split(',');
    if (parts.length > 2) {
      value = parts[0] + ',' + parts.slice(1).join('');
    }
    return value;
  }

  applyDecimal(value: string): string {
    value = value.replace(/\D/g, '');

    // Remove zeros à esquerda
    value = value.replace(/^0+/, '');

    // Garante pelo menos 3 dígitos para formatar centavos corretamente
    while (value.length < 3) {
      value = '0' + value;
    }

    const cents = value.slice(-2);
    const reais = value.slice(0, -2);
    const reaisFormatted = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return reaisFormatted + ',' + cents;
  }

  applyMoneyMask(value: string): string {
    value = value.replace(/\D/g, '');

    // Remove zeros à esquerda
    value = value.replace(/^0+/, '');

    // Garante pelo menos 3 dígitos para formatar centavos corretamente
    while (value.length < 3) {
      value = '0' + value;
    }

    const decimal = value.slice(-2);
    const milhar = value.slice(0, -2);
    const valorFormatted = milhar.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return 'R$ ' + valorFormatted + ',' + decimal;
  }

  applyCpfMask(value: string): string {
    value = value.replace(/\D/g, '').slice(0, 11);
    return value
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  applyCnpjMask(value: string): string {
    value = value.replace(/\D/g, '').slice(0, 14);
    return value
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }

  applyCepMask(value: string): string {
    value = value.replace(/\D/g, '').slice(0, 8);
    return value.replace(/(\d{5})(\d)/, '$1-$2');
  }

  applyPhoneMask(value: string): string {
    value = value.replace(/\D/g, '').slice(0, 11);
    return value
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
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

  getErrorMessage(): string {
    const errors = this.ngControl?.control?.errors;
    if (!errors) return '';

    if (errors['required']) {
      return this.errorMessage || 'Campo obrigatório';
    }

    if (errors['numeroInvalido']) {
      return 'Digite um número válido';
    }

    if (errors['valorAcimaDoPermitido']) {
      return 'Valor maior que o devido.';
    }

    if (errors['valorInvalido']) {
      return 'O valor deve ser maior que zero';
    }

    if (errors['min']) {
      return `O valor mínimo permitido é ${errors['min'].min}`;
    }

    if (errors['maxlength']) {
      return `Máximo de ${errors['maxlength'].requiredLength} caracteres`;
    }

    return 'Valor inválido';
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
}
