import { Injectable } from '@angular/core';
import {
  Auth,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  User,
  UserCredential,
} from '@angular/fire/auth';
import { doc, Firestore, getDoc, setDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private usuarioLogado$ = new BehaviorSubject<any | null>(null);
  public carregando$ = new BehaviorSubject<boolean>(true); // novo!

  constructor(
    private auth: Auth,
    private router: Router,
    private firestore: Firestore
  ) {
    // console.log('🚀 AuthService construído');

    onAuthStateChanged(this.auth, async (user) => {
      // console.log('🔄 onAuthStateChanged chamado. Usuário:', user);

      if (user) {
        const docRef = doc(this.firestore, 'usuarios', user.uid);
        const snap = await getDoc(docRef);
        const perfil = snap.exists() ? snap.data() : null;
        this.usuarioLogado$.next(perfil);
      } else {
        this.usuarioLogado$.next(null);
      }
      this.carregando$.next(false);
    });
  }

  // 🔐 Login
  async login(email: string, senha: string): Promise<void> {
    await setPersistence(this.auth, browserLocalPersistence);
    const cred = await signInWithEmailAndPassword(this.auth, email, senha);

    const ref = doc(this.firestore, 'usuarios', cred.user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: cred.user.uid,
        email: cred.user.email,
        perfil: 'usuario', // ou outro padrão
      });
    }
    const perfil = (await getDoc(ref)).data();

    this.usuarioLogado$.next(perfil); // 🔁 já define aqui
    this.carregando$.next(false); // 🔚 finaliza carregamento
  }

  // 📄 Carrega perfil do Firestore
  private async carregarPerfil(uid: string) {
    const ref = doc(this.firestore, 'usuarios', uid);
    const snap = await getDoc(ref);
    const perfil = snap.exists() ? snap.data() : null;
    this.usuarioLogado$.next(perfil);
  }

  // 🚪 Logout
  async logout() {
    sessionStorage.removeItem('sessaoAtiva');
    await signOut(this.auth);
    this.usuarioLogado$.next(null);
    this.router.navigate(['/login']);
  }

  // ⚙️ Cadastro com perfil
  async cadastrar(email: string, senha: string, dadosExtras: any) {
    const cred = await createUserWithEmailAndPassword(this.auth, email, senha);
    const ref = doc(this.firestore, 'usuarios', cred.user.uid);
    await setDoc(ref, {
      uid: cred.user.uid,
      email,
      ...dadosExtras,
    });
    return cred;
  }

  async reautenticarEAlterarSenha(
    email: string,
    senhaAtual: string,
    novaSenha: string
  ) {
    const usuario = this.auth.currentUser;
    if (!usuario) throw new Error('Usuário não está logado.');

    const credencial = EmailAuthProvider.credential(email, senhaAtual);
    await reauthenticateWithCredential(usuario, credencial);
    await updatePassword(usuario, novaSenha);
  }
  // 🔍 Getters

  get isAdmin(): boolean {
    return this.usuario?.perfil === 'admin';
  }

  get estaLogado(): boolean {
    return this.usuario !== null;
  }

  get usuario() {
    return this.usuarioLogado$.value;
  }

  get usuarioEmail() {
    return this.auth.currentUser;
  }

  getUsuarioAtualObservable() {
    return this.usuarioLogado$.asObservable();
  }

  getPerfilUsuario() {
    return this.usuario;
  }
}
