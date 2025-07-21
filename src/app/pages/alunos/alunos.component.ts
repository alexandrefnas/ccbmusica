import { Component } from '@angular/core';
import { ModalComponent } from "../../modal/modal/modal.component";
import { ButtonComponent } from "../../component/button/button.component";

@Component({
  selector: 'tcx-alunos',
  imports: [ModalComponent, ButtonComponent],
  templateUrl: './alunos.component.html',
  styleUrl: './alunos.component.css',
})
export class AlunosComponent {
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
