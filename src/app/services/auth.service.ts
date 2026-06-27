import { inject, Injectable } from '@angular/core';
import {
  Auth,
  authState,
  browserLocalPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  user,
} from '@angular/fire/auth';
import {
  collection,
  collectionData,
  doc,
  docData,
  Firestore,
  getDoc,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { getApps, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import {
  BehaviorSubject,
  filter,
  firstValueFrom,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  take,
} from 'rxjs';
import { firebaseConfig } from '../../firebase.config';
// import { Functions, httpsCallable } from '@angular/fire/functions';

export interface PermissoesCRUD {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface Acessos {
  igrejas?: PermissoesCRUD;
  instrumentos?: PermissoesCRUD;
  setores?: PermissoesCRUD;
  usuarios?: PermissoesCRUD;
  candidatos?: PermissoesCRUD;
  grupoExames?: PermissoesCRUD;
  exames?: PermissoesCRUD;
  solicitacoes?: PermissoesCRUD;
  logs: PermissoesCRUD;
}

export interface Usuarios {
  uid?: string;
  nome: string;
  email: string;
  perfil: string;
  idSetor?: string;
  idComum?: string;
  acessos?: Acessos;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  authUserSnapshot: Usuarios | null = null;

  public authInicializado$ = new BehaviorSubject<boolean>(false);
  public usuarioLogado$ = new BehaviorSubject<Usuarios | null>(null);

  currentUser$: Observable<any>;
  currentUserData$: Observable<any | null>;

  constructor() {
    this.currentUser$ = authState(this.auth).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.currentUserData$ = this.currentUser$.pipe(
      switchMap((userAuth) => {
        if (!userAuth) {
          this.authUserSnapshot = null;
          this.authInicializado$.next(true);
          return of(null);
        }

        // console.log('APP iniciou em:', window.location.pathname);
        const ref = doc(this.firestore, 'usuarios', userAuth.uid);

        return docData(ref, { idField: 'uid' }).pipe(
          map((usuario) => {
            this.authUserSnapshot = usuario as Usuarios;
            this.usuarioLogado$.next(usuario as Usuarios);
            this.authInicializado$.next(true);
            return usuario as Usuarios;
          }),
        );
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.currentUserData$.subscribe();
  }

  async aguardarAuth(): Promise<User | null> {
    await this.auth.authStateReady();
    return this.auth.currentUser;
  }

  async login(email: string, senha: string): Promise<void> {
    await setPersistence(this.auth, browserLocalPersistence);

    const cred = await signInWithEmailAndPassword(this.auth, email, senha);

    if (typeof window !== 'undefined') {
      localStorage.setItem('authCache', 'logado');
    }
    const ref = doc(this.firestore, 'usuarios', cred.user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        uid: cred.user.uid,
        email: cred.user.email,
        nome: '',
        perfil: 'usuario',
      });
    }
  }

  async logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authCache');
    }

    this.authUserSnapshot = null;
    this.authInicializado$.next(false);

    await signOut(this.auth);

    await firstValueFrom(
      this.currentUser$.pipe(
        filter((user) => user === null),
        take(1),
      ),
    );

    this.authInicializado$.next(true);

    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  get estaLogado(): boolean {
    return !!this.authUserSnapshot;
  }

  get usuario() {
    return this.authUserSnapshot;
  }

  getUsuarioAtualObservable() {
    return this.currentUserData$;
  }

  temPermissao(tabela: keyof Acessos, tipo: keyof PermissoesCRUD): boolean {
    const usuario = this.authUserSnapshot;

    if (!usuario) return false;

    if (usuario.perfil === 'admin') return true;

    return usuario.acessos?.[tabela]?.[tipo] === true;
  }

  getUsuario() {
    const dadosCollection = collection(this.firestore, 'usuarios');
    return collectionData(dadosCollection, {
      idField: 'uid',
    }) as Observable<Usuarios[]>;
  }

  async updateUsuario(uid: string, dados: any) {
    const ref = doc(this.firestore, 'usuarios', uid);

    return await updateDoc(ref, {
      perfil: dados.perfil,
      idSetor: dados.idSetor || '',
      idComum: dados.idComum || '',
      acessos: dados.acessos,
    });
  }

  get usuarioEmail() {
    return this.auth.currentUser;
  }

  async reautenticarEAlterarSenha(
    email: string,
    senhaAtual: string,
    novaSenha: string,
  ) {
    const usuario = this.auth.currentUser;

    if (!usuario) {
      throw new Error('Usuário não está logado.');
    }

    const credencial = EmailAuthProvider.credential(email, senhaAtual);

    await reauthenticateWithCredential(usuario, credencial);
    await updatePassword(usuario, novaSenha);
  }

  // ⚙️ Cadastro com perfil
  // async cadastrar(email: string, senha: string, dadosExtras: any) {
  //   const secondaryApp =
  //     getApps().find((app) => app.name === 'secondary') ||
  //     initializeApp(firebaseConfig, 'secondary');

  //   const secondaryAuth = getAuth(secondaryApp);
  //   const cred = await createUserWithEmailAndPassword(
  //     secondaryAuth,
  //     email,
  //     senha,
  //   );
  //   const ref = doc(this.firestore, 'usuarios', cred.user.uid);
  //   await setDoc(ref, {
  //     uid: cred.user.uid,
  //     email,
  //     ...dadosExtras,
  //   });

  //   // limpa sessão secundária
  //   await signOut(secondaryAuth);
  //   return cred;
  // }

  async cadastrar(email: string, senha: string, dadosExtras: any) {
    const secondaryApp =
      getApps().find((app) => app.name === 'secondary') ||
      initializeApp(firebaseConfig, 'secondary');

    const secondaryAuth = getAuth(secondaryApp);

    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      senha,
    );

    const ref = doc(this.firestore, 'usuarios', cred.user.uid);

    await setDoc(ref, {
      uid: cred.user.uid,
      email: email.toLowerCase().trim(),
      ...dadosExtras,
    });

    await signOut(secondaryAuth);

    return cred;
  }

  temAcessoAoRegistro(registro: any): boolean {
    const usuario = this.authUserSnapshot;

    if (!usuario) return false;

    // Admin vê tudo
    if (usuario.perfil === 'admin') return true;

    // Regional e Secretário veem o setor inteiro
    if (usuario.perfil === 'regional' || usuario.perfil === 'secretario') {
      return registro.idSetor === usuario.idSetor;
    }

    // Encarregado e Instrutor veem somente a comum
    if (usuario.perfil === 'encarregado' || usuario.perfil === 'instrutor') {
      return registro.idComum === usuario.idComum;
    }

    return false;
  }

  // podeVerRegistro(registro: any, tabela: keyof Acessos): boolean {
  //   return (
  //     this.temPermissao(tabela, 'read') && this.temAcessoAoRegistro(registro)
  //   );
  // }

  podeVerRegistro(registro: any, tabela: keyof Acessos): boolean {
    // precisa ter permissão de leitura na tabela
    const temPermissao = this.temPermissao(tabela, 'read');
    // precisa respeitar o vínculo do usuário (comum/setor/admin)
    const temAcesso = this.temAcessoAoRegistro(registro);

    return temPermissao && temAcesso;
  }
}
