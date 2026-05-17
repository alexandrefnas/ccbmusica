import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'tcx-sem-permissao',
  imports: [CommonModule],
  templateUrl: './sem-permissao.component.html',
  styleUrl: './sem-permissao.component.css'
})
export class SemPermissaoComponent {
  constructor(private router: Router) {}

  voltar() {
    this.router.navigate(['/']);
  }
}
