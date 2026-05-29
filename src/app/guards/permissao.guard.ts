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
            // console.log('ROTA:', route.routeConfig?.path);
            // console.log('TABELA:', tabela);
            // console.log('TIPO:', tipo);
            // console.log('USUARIO:', usuario);
            // console.log('ACESSO:', usuario.acessos?.[tabela]);
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
