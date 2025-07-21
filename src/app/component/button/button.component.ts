import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'tcx-button',
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css',
})
export class ButtonComponent {
  @Input() label: string = 'Button';
  @Input() descricao?: string = '';
  @Output() click = new EventEmitter<Event>();

  onClick(event: Event) {
    this.click.emit(event);
  }
}
