import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, filter, take } from 'rxjs/operators';

export const loginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.carregando$.pipe(
    filter((carregando) => !carregando), // espera carregamento terminar
    take(1),
    map(() => {
      if (auth.estaLogado) {
        router.navigate(['/']);
        return false;
      }
      return true;
    })
  );
};
