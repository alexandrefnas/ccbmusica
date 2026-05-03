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
  menuOculto = false; // desktop
  menuMobileAberto = false; // mobile

  logado: boolean = false;

  alternarMenu() {
    if (this.isMobile()) {
      this.menuMobileAberto = !this.menuMobileAberto;
    } else {
      this.menuOculto = !this.menuOculto;
    }
  }

  public fecharMenu() {
    if (this.isMobile() || this.isTable()) {
      this.menuMobileAberto = !this.menuMobileAberto;
    }
  }

  fecharMenuMobile() {
    this.menuMobileAberto = false;
  }

  isMobile(): boolean {
    return window.innerWidth <= 576;
  }

  isTable(): boolean {
    const result = window.innerWidth >= 577 && window.innerWidth <= 992;
    return result;
  }

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {
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
