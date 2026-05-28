import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { combineLatest, filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const loginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  return combineLatest([auth.authInicializado$, auth.currentUser$]).pipe(
    filter(([inicializado]) => inicializado === true),
    take(1),
    map(([_, userAuth]) => {
      return userAuth ? router.parseUrl('/home') : true;
    }),
  );
};

// import { isPlatformBrowser } from '@angular/common';
// import { inject, PLATFORM_ID } from '@angular/core';
// import { CanActivateFn, Router } from '@angular/router';
// import { combineLatest, map, take } from 'rxjs';
// import { AuthService } from '../services/auth.service';

// export const loginGuard: CanActivateFn = () => {
//   const auth = inject(AuthService);
//   const router = inject(Router);
//   const platformId = inject(PLATFORM_ID);

//   if (!isPlatformBrowser(platformId)) {
//     return true;
//   }

//   // Espera o estado de inicialização + usuário
//   return combineLatest([auth.authInicializado$, auth.currentUser$]).pipe(
//     take(1),
//     map(([inicializado, userAuth]) => {
//       if (!inicializado) {
//         // ainda não inicializou, bloqueia navegação até emitir
//         return false;
//       }
//       return userAuth ? router.parseUrl('/home') : true;
//     }),
//   );
// };


// export const loginGuard: CanActivateFn = () => {
//   const auth = inject(AuthService);
//   const router = inject(Router);

//   return auth.carregando$.pipe(
//     filter((carregando) => !carregando), // espera carregamento terminar
//     take(1),
//     map(() => {
//       if (auth.estaLogado) {
//         router.navigate(['/']);
//         return false;
//       }
//       return true;
//     })
//   );
// };
