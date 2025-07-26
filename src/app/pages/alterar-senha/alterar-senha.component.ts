import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'tcx-alterar-senha',
  imports: [CommonModule, FormsModule],
  templateUrl: './alterar-senha.component.html',
  styleUrl: './alterar-senha.component.css'
})
export class AlterarSenhaComponent {
 //  email = '';
  senhaAtual = '';
  novaSenha = '';
  carregando = false;
  mostrarSenhaAtual = false;
  mostrarNovaSenha = false;

  constructor(private auth: AuthService, private router: Router) {}

  visualizador(tipo:string) {
    if(tipo ==='atual')
    this.mostrarSenhaAtual = !this.mostrarSenhaAtual;
    if(tipo ==='nova')
    this.mostrarNovaSenha = !this.mostrarNovaSenha;
  };

  async alterarSenha() {
    const email = this.auth.usuarioEmail?.email;

    if (!email || !this.senhaAtual || !this.novaSenha) {
      alert('Preencha todos os campos.');
      return;
    }

    this.carregando = true;

    try {
      await this.auth.reautenticarEAlterarSenha(
        email,
        this.senhaAtual,
        this.novaSenha
      );
      alert('Senha alterada com sucesso!');
      // this.email = '';
      this.senhaAtual = '';
      this.novaSenha = '';
      this.router.navigate(['/home']);
    } catch (erro) {
      console.error(erro);
      alert('Erro ao alterar senha');
      // alert('Erro ao alterar senha: ' + (erro as any).message);
    } finally {
      this.carregando = false;
    }
  }
}
