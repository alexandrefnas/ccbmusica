import { Component } from '@angular/core';
import { ModalComponent } from "../../modal/modal/modal.component";
import { ButtonComponent } from "../../component/button/button.component";

@Component({
  selector: 'tcx-usuarios',
  imports: [ModalComponent, ButtonComponent],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css'
})
export class UsuariosComponent {
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
