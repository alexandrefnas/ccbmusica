import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
} from '@angular/router';
import { from, map, of, switchMap, take } from 'rxjs';
import { Acessos, AuthService, PermissoesCRUD } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class PermissaoGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router,
  ) { }

  canActivate(route: ActivatedRouteSnapshot) {
    const tabela = route.data['tabela'] as keyof Acessos;
    const tipo = (route.data['tipo'] || 'read') as keyof PermissoesCRUD;
    return from(this.auth.aguardarAuth()).pipe(
      switchMap((user) => {
        if (!user) {
          return of(this.router.parseUrl('/login'));
        }

        return this.auth.currentUserData$.pipe(
          take(1),
          map((usuario) => {
            if (!usuario) {
              return this.router.parseUrl('/login');
            }

            if (usuario.perfil === 'admin') {
              return true;
            }

            if (usuario.acessos?.[tabela]?.[tipo] === true) {
              return true;
            }

            return this.router.parseUrl('/sem-permissao');
          }),
        );
      }),
    );
  }
}

// import { Injectable } from '@angular/core';
// import {
//   ActivatedRouteSnapshot,
//   CanActivate,
//   Router,
// } from '@angular/router';
// import { Acessos, AuthService, PermissoesCRUD } from '../services/auth.service';
// import { filter, map, take } from 'rxjs';

// @Injectable({ providedIn: 'root' })
// export class PermissaoGuard implements CanActivate {
//   constructor(private auth: AuthService, private router: Router) {}

//   // canActivate(route: ActivatedRouteSnapshot) {
//   //   const tabela = route.data['tabela'];
//   //   const tipo = route.data['tipo'] || 'read';

//   //   return this.auth.carregando$.pipe(
//   //     filter((c) => !c),
//   //     take(1),
//   //     map(() => {
//   //       if (!this.auth.estaLogado) {
//   //         return this.router.createUrlTree(['/login']);
//   //       }

//   //       if (this.auth.temPermissao(tabela, tipo)) {
//   //         return true;
//   //       }

//   //       console.warn(`⛔ Sem permissão: ${tabela} - ${tipo}`);
//   //       return this.router.createUrlTree(['/']); // ou página 403
//   //     })
//   //   );
//   // }

// canActivate(route: ActivatedRouteSnapshot) {
//   const tabela = route.data['tabela'] as keyof Acessos;
//   const tipo = (route.data['tipo'] || 'read') as keyof PermissoesCRUD;

//   if (!tabela) {
//     console.error('🚨 Rota sem "tabela" definida');
//     return this.router.createUrlTree(['/']);
//   }

//   return this.auth.carregando$.pipe(
//     filter((c) => !c),
//     take(1),
//     map(() => {
//       if (!this.auth.estaLogado) {
//         return this.router.createUrlTree(['/login']);
//       }

//       if (this.auth.temPermissao(tabela, tipo)) {
//         return true;
//       }

//       console.warn(`⛔ Sem permissão: ${tabela} - ${tipo}`);
//       return this.router.createUrlTree(['/sem-permissao']);
//     })
//   );
// }
// }
