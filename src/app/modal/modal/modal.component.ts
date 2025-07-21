import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'tcx-modal',
  imports: [NgIf],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent {
 @Input() visible: boolean = false;
  @Input() closeOnBackdrop: boolean = true;
  @Input() title: string = 'Título';

  @Output() onClose = new EventEmitter<boolean>();



  onBackdropClick() {
    if (this.closeOnBackdrop) {
      this.cancel();
    }
  }

  cancelar(): void {
    this.cancel();
  }

  cancel() {
    this.onClose.emit(false);
  }
}
