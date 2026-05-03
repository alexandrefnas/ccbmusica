import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Injectable,
  Injector,
  Input,
  Output,
} from '@angular/core';
import { FormsModule, NgControl } from '@angular/forms';
import { SelectService } from '../../../services/select.service';

@Component({
  selector: 'tcx-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './select.component.html',
  styleUrl: './select.component.css',
})
export class SelectComponent {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() niveisLimitados: { value: string; label: string }[] = [];
  @Input() niveisList: { value: string }[] = [];
  @Input() errorMessage: string = 'Campo obrigatório';
  @Input() isFocused: boolean = false;
  @Input() selectedValue: string = '';
  @Input() disabled: boolean = false;
  @Input() fontSize: number = 12;

  @Output() valorMudou = new EventEmitter<string>();
  open = false;

  private onChange = (_: any) => {};
  onTouched = () => {};

  ngControl: NgControl | null = null;

  constructor(
    private injector: Injector,
    private elementRef: ElementRef,
    private selectService: SelectService,
  ) {}

  ngOnInit(): void {
    try {
      this.ngControl = this.injector.get(NgControl);
      if (this.ngControl) {
        this.ngControl.valueAccessor = this;
      }
    } catch (e) {}
    this.selectService.openSelect$.subscribe((select) => {
      if (select !== this) {
        this.open = false;
      }
    });
  }

  onSelectChange(event: any): void {
    this.selectedValue = event;
    this.onChange(event);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Delete') {
      this.selectedValue = '';
      this.onChange(this.selectedValue);
      this.onTouched();
      this.valorMudou.emit(undefined);
    }

    if (event.key === 'Enter') {
      event.preventDefault();

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

  writeValue(value: any): void {
    this.selectedValue = value;
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

  onBlur() {
    setTimeout(() => {
      this.isFocused = false;
      this.onTouched();
    }, 150);
  }

  hasError(): boolean {
    return (
      !!this.ngControl?.control?.invalid && !!this.ngControl?.control?.touched
    );
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.open) return;

    const target = event.target as HTMLElement;

    if (!this.elementRef.nativeElement.contains(target)) {
      this.open = false;
    }
  }

  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    if (this.disabled) return;

    this.open = !this.open;

    if (this.open) {
      this.selectService.notifyOpen(this);
    }
  }

  selectOption(nivel: any) {
    this.selectedValue = nivel.value;
    this.onChange(this.selectedValue);
    this.valorMudou.emit(this.selectedValue);
    this.open = false;
  }

  getSelectedLabel(): string {
    const found = this.niveisLimitados.find(
      (n) => n.value === this.selectedValue,
    );
    return found ? found.label : '';
  }

  onKeyDownCustom(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.open = !this.open;
    }

    if (event.key === 'Escape') {
      this.open = false;
    }

    if (event.key === 'Delete') {
      this.selectedValue = '';
      this.onChange(this.selectedValue);
    }
  }
}
