import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
  ) {}

  async login() {
    this.erro = '';
    this.carregando = true;

    try {
      await this.authService.login(this.email, this.senha);

      console.log('👤 Usuário logado:', this.authService.usuario);

      this.router.navigate(['/']);
    } catch (err) {
      console.error('❌ Erro ao fazer login', err);
      this.erro = 'Email ou senha inválidos';
    } finally {
      this.carregando = false;
    }
  }
    tipoPerfil = [
        {
          admin: {
            acessos: {
              candidatos: { read: true, create: true, update: true, delete: true },
              igrejas: { read: true, create: true, update: true, delete: true },
              instrumentos: {
                read: true,
                create: true,
                update: true,
                delete: true,
              },
              setores: { read: true, create: true, update: true, delete: true },
              usuarios: { read: true, create: true, update: true, delete: true },
            },
          },
        },
        {
          regional: {
            acessos: {
              candidatos: { read: true, create: true, update: true, delete: true },
              igrejas: { read: true, create: false, update: false, delete: false },
              instrumentos: {
                read: true,
                create: false,
                update: false,
                delete: false,
              },
              setores: { read: false, create: false, update: false, delete: false },
              usuarios: { read: true, create: true, update: true, delete: true },
            },
          },
        },
        {
          encarregado: {
            acessos: {
              candidatos: { read: true, create: true, update: true, delete: true },
              igrejas: { read: false, create: false, update: false, delete: false },
              instrumentos: {
                read: false,
                create: false,
                update: false,
                delete: false,
              },
              setores: { read: false, create: false, update: false, delete: false },
              usuarios: {
                read: false,
                create: false,
                update: false,
                delete: false,
              },
            },
          },
        },
        {
          usuario: {
            acessos: {
              candidatos: { read: true, create: true, update: true, delete: false },
              igrejas: { read: false, create: false, update: false, delete: false },
              instrumentos: {
                read: false,
                create: false,
                update: false,
                delete: false,
              },
              setores: { read: false, create: false, update: false, delete: false },
              usuarios: {
                read: false,
                create: false,
                update: false,
                delete: false,
              },
            },
          },
        },
      ];
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
