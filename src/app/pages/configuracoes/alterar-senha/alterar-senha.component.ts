import { Component } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AlertService } from '../../../services/alert.service';
import { MenuComponent } from '../../../component/menu/menu.component';

@Component({
  selector: 'tcx-alterar-senha',
  imports: [CommonModule, FormsModule],
  templateUrl: './alterar-senha.component.html',
  styleUrl: './alterar-senha.component.css',
})
export class AlterarSenhaComponent {
  //  email = '';
  senhaAtual = '';
  novaSenha = '';
  carregando = false;
  mostrarSenhaAtual = false;
  mostrarNovaSenha = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private alertService: AlertService,
    // private menu: MenuComponent,
  ) {}

  visualizador(tipo: string) {
    if (tipo === 'atual') this.mostrarSenhaAtual = !this.mostrarSenhaAtual;
    if (tipo === 'nova') this.mostrarNovaSenha = !this.mostrarNovaSenha;
  }

  async alterarSenha() {
    const email = this.auth.usuarioEmail?.email;

    if (!email || !this.senhaAtual || !this.novaSenha) {
      this.alertService.aviso('Preencha todos os campos.');
      return;
    }

    this.carregando = true;

    try {
      await this.auth.reautenticarEAlterarSenha(
        email,
        this.senhaAtual,
        this.novaSenha,
      );
      this.alertService.sucesso('Senha alterada com sucesso!');
      // this.email = '';
      this.senhaAtual = '';
      this.novaSenha = '';
      this.router.navigate(['/home']);
      // this.menu.menuHome();
    } catch (erro) {
      console.error(erro);
      this.alertService.erro('Erro ao alterar senha');
      // alert('Erro ao alterar senha: ' + (erro as any).message);
    } finally {
      this.carregando = false;
    }
  }
}
