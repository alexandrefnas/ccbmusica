import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, Observable } from 'rxjs';

export class perfilGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.auth.getUsuarioAtualObservable().pipe(
      map((user: any) => {
        if (user?.perfil === 'admin') {
          return true;
        } else {
          return this.router.createUrlTree(['/']);
        }
      })
    );
}}
