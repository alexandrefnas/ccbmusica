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
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import { firebaseConfig } from '../../firebase.config';

export interface PermissoesCRUD {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface Acessos {
  candidatos?: PermissoesCRUD;
  igrejas?: PermissoesCRUD;
  instrumentos?: PermissoesCRUD;
  setores?: PermissoesCRUD;
  usuarios?: PermissoesCRUD;
  exames?: PermissoesCRUD;
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

  // currentUser$ = user(this.auth);
  // currentUser$ = authState(this.auth).pipe(
  //   shareReplay({ bufferSize: 1, refCount: true }),
  // );

  // currentUserData$: Observable<Usuarios | null> = this.currentUser$.pipe(
  //   switchMap((userAuth) => {
  //     if (!userAuth) return of(null);

  //     const ref = doc(this.firestore, 'usuarios', userAuth.uid);
  //     return docData(ref, { idField: 'uid' }) as Observable<Usuarios>;
  //   }),
  //   shareReplay({ bufferSize: 1, refCount: true }),
  // );
  currentUser$: Observable<any>;
  currentUserData$: Observable<any | null>;
  // constructor() {
  //   this.currentUser$ = user(this.auth);
  //   // this.currentUserData$.subscribe((usuario) => {
  //   //   this.authUserSnapshot = usuario;
  //   // });

  //   this.currentUserData$ = this.currentUser$.pipe(
  //     switchMap((userAuth) => {
  //       if (!userAuth) return of(null);
  //       const ref = doc(this.firestore, 'usuarios', userAuth.uid);
  //       return docData(ref, { idField: 'uid' });
  //     }),
  //     shareReplay({ bufferSize: 1, refCount: true }),
  //   );

  //   this.currentUserData$.subscribe((u) => {
  //     this.authUserSnapshot = u;
  //   });
  // }

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

        console.log('APP iniciou em:', window.location.pathname);
        const ref = doc(this.firestore, 'usuarios', userAuth.uid);

        return docData(ref, { idField: 'uid' }).pipe(
          map((usuario) => {
            this.authUserSnapshot = usuario as Usuarios;
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

  // async login(email: string, senha: string): Promise<void> {
  //   await setPersistence(this.auth, browserLocalPersistence);

  //   const cred = await signInWithEmailAndPassword(this.auth, email, senha);

  //   const ref = doc(this.firestore, 'usuarios', cred.user.uid);
  //   const snap = await getDoc(ref);

  //   if (!snap.exists()) {
  //     await setDoc(ref, {
  //       uid: cred.user.uid,
  //       email: cred.user.email,
  //       nome: '',
  //       perfil: 'usuario',
  //     });
  //   }
  // }

  // async logout() {
  //   await signOut(this.auth);
  //   this.authUserSnapshot = null;
  //   this.router.navigate(['/login']);
  // }

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
    await signOut(this.auth);

    this.authUserSnapshot = null;
    this.router.navigate(['/login']);
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
      email,
      ...dadosExtras,
    });

    // limpa sessão secundária
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

  podeVerRegistro(registro: any, tabela: keyof Acessos): boolean {
    return (
      this.temPermissao(tabela, 'read') && this.temAcessoAoRegistro(registro)
    );
  }
}

// export class AuthService {
//   // private usuarioLogado$ = new BehaviorSubject<any | null>(null);
//   private usuarioLogado$ = new BehaviorSubject<Usuarios | null>(null);
//   // private secondaryAuth = null;
//   public carregando$ = new BehaviorSubject<boolean>(true);
//   private permissoesCache: Record<string, boolean> = {};
//   constructor(
//     private auth: Auth,
//     private router: Router,
//     private firestore: Firestore,
//   ) {
//     // console.log('🚀 AuthService construído');

//     onAuthStateChanged(this.auth, async (user) => {
//       // console.log('🔄 onAuthStateChanged chamado. Usuário:', user);
//       if (user) {
//         const docRef = doc(this.firestore, 'usuarios', user.uid);
//         const snap = await getDoc(docRef);
//         const perfil = snap.exists() ? (snap.data() as Usuarios) : null;
//         this.usuarioLogado$.next(perfil);
//         if (perfil) {
//           this.carregarPermissoesCache(perfil);
//         }
//       } else {
//         this.usuarioLogado$.next(null);
//       }
//       this.carregando$.next(false);
//     });
//   }

//   // private carregarPermissoesCache(usuario: Usuarios) {
//   //   this.permissoesCache = {};

//   //   if (!usuario.acessos) return;

//   //   Object.entries(usuario.acessos).forEach(([tabela, permissoes]) => {
//   //     //   Object.entries(permissoes).forEach(([tipo, valor]) => {
//   //     //     const chave = `${tabela}.${tipo}`;
//   //     //     this.permissoesCache[chave] = valor as boolean;
//   //     //   });
//   //     (Object.entries(permissoes) as [keyof PermissoesCRUD, boolean][]).forEach(
//   //       ([tipo, valor]) => {
//   //         const chave = `${tabela}.${tipo}`;
//   //         this.permissoesCache[chave] = valor;
//   //       },
//   //     );
//   //   });
//   // }

//   private carregarPermissoesCache(usuario: Usuarios) {
//     this.permissoesCache = {};

//     if (!usuario.acessos) return;

//     Object.entries(usuario.acessos).forEach(([tabela, permissoes]) => {
//       if (!permissoes) return;

//       (Object.entries(permissoes) as [keyof PermissoesCRUD, boolean][]).forEach(
//         ([tipo, valor]) => {
//           const chave = `${tabela}.${tipo}`;
//           this.permissoesCache[chave] = valor;
//         },
//       );
//     });
//   }

//   // 🔐 Login
//   async login(email: string, senha: string): Promise<void> {
//     await setPersistence(this.auth, browserLocalPersistence);
//     const cred = await signInWithEmailAndPassword(this.auth, email, senha);

//     const ref = doc(this.firestore, 'usuarios', cred.user.uid);
//     const snap = await getDoc(ref);
//     if (!snap.exists()) {
//       await setDoc(ref, {
//         uid: cred.user.uid,
//         email: cred.user.email,
//         perfil: 'usuario', // ou outro padrão
//       });
//     }
//     const perfil = snap.exists() ? (snap.data() as Usuarios) : null;
//     if (perfil) {
//       this.carregarPermissoesCache(perfil);
//     }
//     this.usuarioLogado$.next(perfil); // 🔁 já define aqui
//     this.carregando$.next(false); // 🔚 finaliza carregamento
//   }

//   // 📄 Carrega perfil do Firestore
//   private async carregarPerfil(uid: string) {
//     const ref = doc(this.firestore, 'usuarios', uid);
//     const snap = await getDoc(ref);
//     const perfil = snap.exists() ? (snap.data() as Usuarios) : null;
//     this.usuarioLogado$.next(perfil);
//   }

//   // 🚪 Logout
//   async logout() {
//     sessionStorage.removeItem('sessaoAtiva');
//     await signOut(this.auth);
//     this.usuarioLogado$.next(null);
//     this.router.navigate(['/login']);
//   }

//   // ⚙️ Cadastro com perfil
//   async cadastrar(email: string, senha: string, dadosExtras: any) {
//     const secondaryApp =
//       getApps().find((app) => app.name === 'secondary') ||
//       initializeApp(firebaseConfig, 'secondary');

//     const secondaryAuth = getAuth(secondaryApp);
//     const cred = await createUserWithEmailAndPassword(
//       secondaryAuth,
//       email,
//       senha,
//     );
//     const ref = doc(this.firestore, 'usuarios', cred.user.uid);
//     await setDoc(ref, {
//       uid: cred.user.uid,
//       email,
//       ...dadosExtras,
//     });

//     // limpa sessão secundária
//     await signOut(secondaryAuth);
//     return cred;
//   }

//   getUsuario() {
//     const dadosCollection = collection(this.firestore, 'usuarios');
//     return collectionData(dadosCollection, {
//       idField: 'uid',
//     }) as Observable<Usuarios[]>;
//   }

//   async updateUsuario(uid: string, dados: any) {
//     const ref = doc(this.firestore, 'usuarios', uid);

//     return await updateDoc(ref, {
//       perfil: dados.perfil,
//       acessos: dados.acessos,
//     });
//   }

//   async reautenticarEAlterarSenha(
//     email: string,
//     senhaAtual: string,
//     novaSenha: string,
//   ) {
//     const usuario = this.auth.currentUser;
//     if (!usuario) throw new Error('Usuário não está logado.');

//     const credencial = EmailAuthProvider.credential(email, senhaAtual);
//     await reauthenticateWithCredential(usuario, credencial);
//     await updatePassword(usuario, novaSenha);
//   }
//   // 🔍 Getters

//   get isAdmin(): boolean {
//     return this.usuario?.perfil === 'admin';
//   }

//   get estaLogado(): boolean {
//     return this.usuario !== null;
//   }

//   get usuario() {
//     return this.usuarioLogado$.value;
//   }

//   get usuarioEmail() {
//     return this.auth.currentUser;
//   }

//   getUsuarioAtualObservable() {
//     return this.usuarioLogado$.asObservable();
//   }

//   getPerfilUsuario() {
//     return this.usuario;
//   }

//   temPermissao(tabela: keyof Acessos, tipo: keyof PermissoesCRUD): boolean {
//     const usuario = this.usuario;

//     if (!usuario) return false;

//     if (usuario.perfil === 'admin') return true;

//     const chave = `${tabela}.${tipo}`;

//     return this.permissoesCache[chave] === true;
//   }
// }
