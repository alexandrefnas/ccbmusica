
import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { map, take } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { SetorAtivoService } from '../services/setor-ativo.service';

export const SetorAtivoGuard: CanActivateChildFn = (route) => {
  const auth = inject(AuthService);
  const setorAtivo = inject(SetorAtivoService);
  const router = inject(Router);

  // Rotas que não dependem de um setor ativo.
  const rotasLiberadas = [
    'login',
    'selecionar-setor',
    'as',
    'sem-permissao',
  ];

  const rota = route.routeConfig?.path ?? '';

  if (rotasLiberadas.includes(rota)) {
    return true;
  }

  return auth.currentUserData$.pipe(
    take(1),
    map((usuario) => {
      if (!usuario) {
        return router.parseUrl('/login');
      }

      if (!setorAtivo.podeCarregarDados) {
        return router.parseUrl('/selecionar-setor');
      }

      return true;
    }),
  );
};

