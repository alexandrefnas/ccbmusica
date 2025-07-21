import { Component } from '@angular/core';
import { ModalComponent } from "../../modal/modal/modal.component";
import { ButtonComponent } from "../../component/button/button.component";

@Component({
  selector: 'tcx-igrejas',
  imports: [ModalComponent, ButtonComponent],
  templateUrl: './igrejas.component.html',
  styleUrl: './igrejas.component.css'
})
export class IgrejasComponent {
  title = 'TITULO';
  mostrarModal = false;

  buttonClick(): void {
    this.title = 'TESTE';
    this.mostrarModal = true;
  }

  fecharModal() {
    this.mostrarModal = false;
  }
}
