import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  Output,
} from '@angular/core';
import { FormsModule, NgControl } from '@angular/forms';

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
  @Input() niveis: { value: string; label: string }[] = [];
  @Input() niveisList: { value: string;}[] = [];
  @Input() errorMessage: string = 'Campo obrigatório';
  @Input() isFocused: boolean = false;
  @Input() selectedValue: string = '';
  @Input() disabled: boolean = false;
  @Input() fontSize: number = 12;

  @Output() valorMudou = new EventEmitter<string>();

  private onChange = (_: any) => {};
  onTouched = () => {};

  ngControl: NgControl | null = null;

  constructor(private injector: Injector, private elementRef: ElementRef) {}

  ngOnInit(): void {
    try {
      this.ngControl = this.injector.get(NgControl);
      if (this.ngControl) {
        this.ngControl.valueAccessor = this;
      }
    } catch (e) {}
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
}
