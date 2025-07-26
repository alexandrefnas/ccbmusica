import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MenuComponent } from './component/menu/menu.component';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MenuComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'ccbmusica';
  menuOculto = false;
  logado: boolean = false;

  alternarMenu() {
    this.menuOculto = !this.menuOculto;
  }

  constructor(private authService: AuthService, private router: Router) {
    this.authService.carregando$.subscribe((carregando) => {
      if (!carregando) {
        const logado = this.authService.estaLogado;
        // console.log('✅ Login detectado?', logado);
        this.logado = logado;
        if (!logado) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  logout() {
    this.authService.logout();
  }
}
