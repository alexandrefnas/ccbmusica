import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AlertData, AlertService } from '../../services/alert.service';

@Component({
  selector: 'tcx-alert',
  imports: [CommonModule],
  templateUrl: './tcx-alert.component.html',
  styleUrl: './tcx-alert.component.css',
})
export class TcxAlertComponent {
  visible = false;
  dados!: AlertData;

  constructor(private alertService: AlertService) {
    this.alertService.alert$.subscribe((alerta) => {
      this.dados = alerta;
      this.visible = true;
    });
  }

  get icone(): string {
    switch (this.dados?.tipo) {
      case 'sucesso':
        return 'bi bi-check-circle-fill';
      case 'erro':
        return 'bi bi-x-circle-fill';
      case 'aviso':
        return 'bi bi-exclamation-triangle-fill';
      default:
        return 'bi bi-info-circle-fill';
    }
  }

  confirmar(): void {
    this.dados.resolver?.(true);
    this.visible = false;
  }

  cancelar(): void {
    this.dados.resolver?.(false);
    this.visible = false;
  }

  fechar(): void {
    this.dados.resolver?.(false);
    this.visible = false;
  }
}
