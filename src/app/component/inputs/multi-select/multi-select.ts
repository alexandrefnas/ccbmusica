import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Injector,
  Input,
  Output,
} from '@angular/core';
import { FormsModule, NgControl } from '@angular/forms';

@Component({
  selector: 'tcx-multi-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './multi-select.html',
  styleUrl: './multi-select.css',
})
export class MultiSelectComponent {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() niveisLimitados: { value: string; label: string }[] = [];
  @Input() errorMessage = 'Campo obrigatório';
  @Input() isFocused = false;
  @Input() disabled = false;

  @Output() valorMudou = new EventEmitter<string[]>();

  selectedValues: string[] = [];
  open = false;

  indiceDestacado = -1;
  textoBusca = '';
  timerBusca: any;

  private onChange = (_: any) => {};
  onTouched = () => {};

  ngControl: NgControl | null = null;

  constructor(
    private injector: Injector,
    private elementRef: ElementRef,
  ) {}

  ngOnInit(): void {
    try {
      this.ngControl = this.injector.get(NgControl);
      if (this.ngControl) {
        this.ngControl.valueAccessor = this;
      }
    } catch (e) {}
  }

  writeValue(value: any): void {
    this.selectedValues = Array.isArray(value) ? value : [];
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled) return;

    this.open = !this.open;
  }

  toggleOption(nivel: { value: string; label: string }, event: MouseEvent): void {
    event.stopPropagation();

    if (nivel.value === 'TODOS') {
      this.selectedValues = this.isSelected('TODOS') ? [] : ['TODOS'];
    } else {
      this.selectedValues = this.selectedValues.filter((v) => v !== 'TODOS');

      if (this.isSelected(nivel.value)) {
        this.selectedValues = this.selectedValues.filter((v) => v !== nivel.value);
      } else {
        this.selectedValues = [...this.selectedValues, nivel.value];
      }
    }

    this.onChange(this.selectedValues);
    this.valorMudou.emit(this.selectedValues);
  }

  isSelected(value: string): boolean {
    return this.selectedValues.includes(value);
  }

  limparSelecao(event: MouseEvent): void {
    event.stopPropagation();

    this.selectedValues = [];
    this.onChange(this.selectedValues);
    this.valorMudou.emit(this.selectedValues);
  }

  getSelectedLabel(): string {
    if (!this.selectedValues.length) {
      return '';
    }

    if (this.selectedValues.includes('TODOS')) {
      return 'Todos';
    }

    const labels = this.niveisLimitados
      .filter((n) => this.selectedValues.includes(n.value))
      .map((n) => n.label);

    if (labels.length <= 2) {
      return labels.join(', ');
    }

    return `${labels.length} selecionados`;
  }

  // onBlur(): void {
  //   setTimeout(() => {
  //     this.isFocused = false;
  //     this.onTouched();
  //   }, 150);
  // }

  onBlur(): void {
    setTimeout(() => {
      const elementoAtivo = document.activeElement;

      if (!this.elementRef.nativeElement.contains(elementoAtivo)) {
        this.open = false;
        this.isFocused = false;
        this.onTouched();
      }
    }, 150);
  }

  hasError(): boolean {
    return !!this.ngControl?.control?.invalid && !!this.ngControl?.control?.touched;
  }

  onKeyDownCustom(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.open = !this.open;
    }

    if (event.key === 'Escape') {
      this.open = false;
    }

    if (event.key === 'Delete') {
      this.selectedValues = [];
      this.onChange(this.selectedValues);
      this.valorMudou.emit(this.selectedValues);
    }
  }

  buscarPorTecla(event: KeyboardEvent): void {
    const tecla = event.key;

    if (tecla.length !== 1) return;

    event.preventDefault();

    clearTimeout(this.timerBusca);

    this.textoBusca += tecla.toLowerCase();

    const index = this.niveisLimitados.findIndex((nivel) =>
      nivel.label.toLowerCase().startsWith(this.textoBusca),
    );

    if (index >= 0) {
      this.open = true;
      this.indiceDestacado = index;

      setTimeout(() => {
        const item = this.elementRef.nativeElement.querySelector(`.option[data-index="${index}"]`);

        item?.scrollIntoView({
          block: 'nearest',
        });
      });
    }

    this.timerBusca = setTimeout(() => {
      this.textoBusca = '';
    }, 1000);
  }

  // @HostListener('document:click', ['$event'])
  // onClickOutside(event: MouseEvent): void {
  //   if (!this.open) return;

  //   const target = event.target as HTMLElement;

  //   if (!this.elementRef.nativeElement.contains(target)) {
  //     this.open = false;
  //   }
  // }
  @HostListener('document:mousedown', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (!this.elementRef.nativeElement.contains(target)) {
      this.open = false;
      this.isFocused = false;
      this.onTouched();
    }
  }
}
