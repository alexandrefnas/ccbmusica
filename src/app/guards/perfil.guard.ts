import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

export const PerfilGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.getUsuarioAtualObservable().pipe(
    map((user: any) => {
      if (user?.perfil === 'admin') {
        return true;
      } else {
        return router.createUrlTree(['/']);
      }
    })
  );
};
