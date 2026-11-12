
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, Subscription } from 'rxjs';
import { AuthService, Usuarios } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class SetorAtivoService implements OnDestroy {
  private readonly setorSubject =
    new BehaviorSubject<string | null>(null);

  readonly setorAtivo$ = this.setorSubject
    .asObservable()
    .pipe(distinctUntilChanged());

  private usuarioAtual: Usuarios | null = null;
  private uidAtual: string | null = null;
  private readonly authSubscription: Subscription;

  constructor(private readonly auth: AuthService) {
    this.authSubscription = this.auth.currentUserData$.subscribe(
      (usuario: Usuarios | null) => {
        this.atualizarContexto(usuario);
      },
    );
  }

  get idSetorAtivo(): string | null {
    return this.setorSubject.value;
  }

  get exigeSelecaoManual(): boolean {
    return (
      this.usuarioAtual?.perfil === 'admin' ||
      this.usuarioAtual?.perfil === 'gestor'
    );
  }

  get podeCarregarDados(): boolean {
    return (
      this.usuarioAtual !== null &&
      this.idSetorAtivo !== null
    );
  }

  private setorAutorizado(
    usuario: Usuarios,
    idSetor: string,
  ): boolean {
    if (!idSetor) return false;

    if (usuario.perfil === 'admin') {
      return true;
    }

    if (usuario.perfil === 'gestor') {
      return (usuario.idSetores ?? []).includes(idSetor);
    }

    if (
      ['regional', 'secretario', 'encarregado', 'instrutor']
        .includes(usuario.perfil)
    ) {
      return usuario.idSetor === idSetor;
    }

    return false;
  }

  private atualizarContexto(usuario: Usuarios | null): void {
    const uid = usuario?.uid ?? null;

    if (uid !== this.uidAtual) {
      this.setorSubject.next(null);
    }

    this.uidAtual = uid;
    this.usuarioAtual = usuario;

    if (!usuario) {
      this.setorSubject.next(null);
      return;
    }

    if (
      usuario.perfil === 'admin' ||
      usuario.perfil === 'gestor'
    ) {
      const atual = this.idSetorAtivo;

      if (
        atual &&
        !this.setorAutorizado(usuario, atual)
      ) {
        this.setorSubject.next(null);
      }

      return;
    }

    if (
      ['regional', 'secretario', 'encarregado', 'instrutor']
        .includes(usuario.perfil)
    ) {
      const precisaComum =
        usuario.perfil === 'encarregado' ||
        usuario.perfil === 'instrutor';

      const vinculoValido =
        !!usuario.idSetor &&
        (!precisaComum || !!usuario.idComum);

      this.setorSubject.next(
        vinculoValido ? usuario.idSetor! : null,
      );

      return;
    }

    this.setorSubject.next(null);
  }

  selecionarSetor(idSetor: string): boolean {
    const usuario = this.usuarioAtual;
    const setor = idSetor?.trim();

    if (
      !usuario ||
      !this.exigeSelecaoManual ||
      !this.setorAutorizado(usuario, setor)
    ) {
      return false;
    }

    this.setorSubject.next(setor);
    return true;
  }

  limparSelecao(): void {
    if (this.exigeSelecaoManual) {
      this.setorSubject.next(null);
    }
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
  }
}
