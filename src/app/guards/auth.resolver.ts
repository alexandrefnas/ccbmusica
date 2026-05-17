import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, take } from 'rxjs/operators';

export const AuthResolver: ResolveFn<boolean> = () => {
  const auth = inject(AuthService);
  return auth.authInicializado$.pipe(
    filter((ready) => ready === true),
    take(1)
  );
};
