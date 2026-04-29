import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, take } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PermissaoGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot) {
    const tabela = route.data['tabela'];
    const tipo = route.data['tipo'] || 'read';

    return this.auth.carregando$.pipe(
      filter((c) => !c),
      take(1),
      map(() => {
        if (!this.auth.estaLogado) {
          return this.router.createUrlTree(['/login']);
        }

        if (this.auth.temPermissao(tabela, tipo)) {
          return true;
        }

        console.warn(`⛔ Sem permissão: ${tabela} - ${tipo}`);
        return this.router.createUrlTree(['/']); // ou página 403
      })
    );
  }
}
