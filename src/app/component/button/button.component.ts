import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'tcx-button',
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css',
})
export class ButtonComponent {
  @Input() label: string = 'Button';
  @Input() labelOn: boolean = false;
  @Input() descricao?: string = '';
  @Input() disabled: boolean = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() icon = '';
  // @Output() click = new EventEmitter<Event>();
  @Output() clicked = new EventEmitter<Event>();

mobile: boolean = this.isMobile();

  @HostListener('window:resize')
  atualizarTamanhoTela(): void {
    this.mobile = this.isMobile();
  }

  onClick(event: Event) {
    if (this.disabled) return;
    this.clicked.emit(event);
  }

  get liberarLabel():boolean{
    if(this.labelOn ===true) return true
    if(this.mobile ===true)return false

    return true;
  }

  isMobile(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.innerWidth <= 575;
}
}
