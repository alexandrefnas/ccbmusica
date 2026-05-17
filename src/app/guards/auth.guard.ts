import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { combineLatest, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const AuthGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return combineLatest([auth.authInicializado$, auth.currentUser$]).pipe(
    take(1),
    map(([inicializado, userAuth]) => {
      if (!inicializado) {
        return false; // segura até inicializar
      }
      return userAuth ? true : router.parseUrl('/login');
    }),
  );
};



// import { Injectable } from '@angular/core';
// import { CanActivate, Router } from '@angular/router';
// import { AuthService } from '../services/auth.service';
// import { filter, map, take } from 'rxjs';

// @Injectable({ providedIn: 'root' })
// export class AuthGuard implements CanActivate {
//   constructor(private authService: AuthService, private router: Router) {}

//   canActivate() {
//     return this.authService.carregando$.pipe(
//       filter((c) => !c),
//       take(1),
//       map(() => {
//         if (this.authService.estaLogado) {
//           return true;
//         } else {
//           return this.router.createUrlTree(['/login']);
//         }
//       })
//     );
//   }
// }
