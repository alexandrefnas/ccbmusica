import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'tcx-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email = '';
  senha = '';
  erro = '';
  carregando = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertService: AlertService,
  ) {}

  async login() {
    this.erro = '';
    this.carregando = true;

    try {
      await this.authService.login(this.email, this.senha);

      // console.log('👤 Usuário logado:', this.authService.usuario);

      this.router.navigate(['/home']);
    } catch (err) {
      this.alertService.erro('❌ Erro ao fazer login');
      this.erro = 'Email ou senha inválidos';
    } finally {
      this.carregando = false;
    }
  }
}

// export class LoginComponent {
//   email = '';
//   senha = '';
//   erro = '';

//   constructor(
//     private authService: AuthService,
//     private router: Router,
//   ) {}

//   login() {
//     this.authService
//       .login(this.email, this.senha)
//       .then(() => {
//         console.log('✅ Login iniciado, aguardando onAuthStateChanged...');

//         let sub: any;

//         // use setTimeout para empurrar para o próximo ciclo de evento
//         setTimeout(() => {
//           sub = this.authService
//             .getUsuarioAtualObservable()
//             .subscribe((usuario) => {
//               if (usuario) {
//                 console.log('👤 Usuário detectado após login:', usuario);
//                 this.router.navigate(['/']);
//                 sub?.unsubscribe(); // agora funciona
//               }
//             });
//         });
//       })
//       .catch((err) => {
//         console.error('❌ Erro ao fazer login', err);
//         this.erro = 'Email ou senha inválidos';
//       });
//   }

//   // login() {
//   //   this.authService.login(this.email, this.senha)
//   //     .then(() => this.router.navigate(['/'])) // redireciona para a home ou painel
//   //     .catch((err) => {
//   //       console.error(err);
//   //       this.erro = 'Email ou senha inválidos';
//   //     });
//   // }

//   // usuarios = [
//   //   {
//   //     name: '',
//   //     email: '',
//   //     perfil: '',
//   //     uid: '',
//   //     acessos: {
//   //       tabelas: {
//   //         tabela: 'candidatos',
//   //         access: true,
//   //         tipoAcesso: {
//   //           create: true,
//   //           delete: false,
//   //           update: false,
//   //           read: true,
//   //         },
//   //       },
//   //     },
//   //   },
//   // ];

// }
