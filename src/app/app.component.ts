import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuComponent } from './component/menu/menu.component';
import { AuthService } from './services/auth.service';
import { TcxAlertComponent } from "./component/tcx-alert/tcx-alert.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MenuComponent, CommonModule, TcxAlertComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  constructor(
    public authService: AuthService,
    // private router: Router,
  ) {

    this.authService.currentUser$.subscribe((user) => {
      this.logado = !!user;
      // console.log('URL REAL AO INICIAR:', window.location.href);
    });

    // this.authService.carregando$.subscribe((carregando) => {
    //   if (!carregando) {
    //     const logado = this.authService.estaLogado;
    //     // console.log('✅ Login detectado?', logado);
    //     this.logado = logado;
    //     if (!logado) {
    //       this.router.navigate(['/login']);
    //     }
    //   }
    // });
  }

  title = 'ccbmusica';
  menuOculto = false; // desktop
  menuMobileAberto = false; // mobile

  logado: boolean = false;

  alternarMenu() {
    if (this.isMobile()) {
      // if (this.isMobile() || this.isTable()) {
        this.menuMobileAberto = !this.menuMobileAberto;
      } else {
        this.menuOculto = !this.menuOculto;
      }
    }

    public fecharMenu() {
      // if (this.isMobile() || this.isTable()) {
      if (this.isMobile()) {
      this.menuMobileAberto = !this.menuMobileAberto;
    }
  }

  fecharMenuMobile() {
    this.menuMobileAberto = false;
    this.menuOculto = false;
  }

  isMobile(): boolean {
    return window.innerWidth <= 576;
  }

  isTable(): boolean {
    const result = window.innerWidth >= 577 && window.innerWidth <= 992;
    return result;
  }

  // carregando: any;

  logout() {
    this.authService.logout();
  }
}
