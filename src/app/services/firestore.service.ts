import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface LogSistema {
  id?: string;
  colecao: string;
  documentoId: string;
  acao: 'cadastro' | 'alteracao' | 'exclusao';
  usuarioUid?: string;
  usuarioEmail?: string;
  dataHora?: any;
  dadosAntes?: any;
  dadosDepois?: any;
}

export interface GrupoExames {
  id?: string;
  grupoExame: string;
  descricao: string;
  idSetor: string;
  idComum: string;
  criteriosSelecionados: string[];
  tipoExame: string;
  concluido: boolean;
  criadoEm?: string;
  periodos: any[];
  usuarioCriador: string;
}

export interface Criterio {
  id?: string;
  tipoExame: string;
  nomeCriterio: string;
}

export interface AvaliacaoCriterio {
  idCriterio: string;
  nomeCriterio: string;
  nota: number | null;
}

export interface LicaoAvaliada {
  id: string;
  nomeLicao: string;
  criterios: AvaliacaoCriterio[];
  somaPontos: number;
  pontuacaoFinal: number;
}

export interface Criterio {
  id?: string;
  avaliacao: string;
  nomeCriterio: string;
}

export type StatusExame =
  | 'solicitado'
  | 'agendado'
  | 'emAndamento'
  | 'recuperacao'
  | 'aprovado'
  | 'reprovado'
  | 'cancelado';

export type ResultadoEtapa =
  | 'pendente'
  | 'bloqueado'
  | 'recuperacao'
  | 'aprovado'
  | 'reprovado';

// export interface EtapaExame {
//   nome: string;
//   ordem: number;
//   nota: number | null;
//   notaMinima: number;
//   notaMaxima: number;
//   resultado: ResultadoEtapa;
//   dataAgendada: string;
//   dataLancamento: string;
//   professorLancamento: string;
// }

export interface EtapaExame {
  ordem: number;
  nota: number | null;
  resultado: ResultadoEtapa;
  dataLancamento: string;
  professorLancamento: string;
  observacaoLancamento: string;

licoesAvaliadas?: LicaoAvaliada[];

  // Dados da recuperação
  notaRecuperacao?: number | null;
  dataRecuperacao?: string;
  professorRecuperacao?: string;
  observacaoRecuperacao?: string;
}

export interface Exames {
  id?: string;
  idAluno: string;
  idGrupoExame?: string;
  tipoExame: string;
  status: StatusExame;
  categoriaExame: string;
  dataSolicitacao: string;
  // dataAgendada: string;
  // professorResponsavel: string;
  observacao: string;
  etapaAtual: number;
  etapas: EtapaExame[];

  motivoCancelamento?: string;
  dataCancelamento?: string;
  usuarioCancelamento?: string;
}

export interface Setor {
  id?: string;
  nomeSetor: string;
  nomeCidade: string;
  estado: string;
}

export interface Igrejas {
  id?: string;
  nomeCongregacao: string;
  idSetor: string;
  localizacao: string;
}

export interface Instrumentos {
  id?: string;
  nomeInstrumento: string;
  familia: string;
  vozAlternativa: string;
  vozPrincipal: string;
  ativo?: boolean;
}

export interface Candidatos {
  id?: string;
  nomeAluno: string;
  dataNascimento: string;
  idSetor: string;
  idComum: string;
  idInstrumento: string;
  afinacao: string;
  desativado?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  constructor(
    private firestore: Firestore,
    private auth: Auth,
  ) {}

  //// LOGS
  private async registrarLog(log: Omit<LogSistema, 'dataHora'>) {
    const usuario = this.auth.currentUser;

    const logsRef = collection(this.firestore, 'logs');

    return addDoc(logsRef, {
      ...log,
      usuarioUid: usuario?.uid || 'sem-usuario',
      usuarioEmail: usuario?.email || 'sem-email',
      dataHora: serverTimestamp(),
    });
  }

  private async criarComLog<T extends object>(colecao: string, dados: T) {
    const refCollection = collection(this.firestore, colecao);
    const docRef = doc(refCollection);

    const dadosComId = {
      ...dados,
      id: docRef.id,
    };

    await setDoc(docRef, dadosComId as any);

    await this.registrarLog({
      colecao,
      documentoId: docRef.id,
      acao: 'cadastro',
      dadosDepois: dadosComId,
    });

    return docRef;
  }

  private async atualizarComLog<T extends object>(
    colecao: string,
    id: string,
    dados: Partial<T>,
  ) {
    const docRef = doc(this.firestore, colecao, id);

    const snapAntes = await getDoc(docRef);
    const dadosAntes = snapAntes.exists() ? snapAntes.data() : null;

    await updateDoc(docRef, dados as any);

    await this.registrarLog({
      colecao,
      documentoId: id,
      acao: 'alteracao',
      dadosAntes,
      dadosDepois: dados,
    });
  }

  private async excluirComLog(colecao: string, id: string) {
    const docRef = doc(this.firestore, colecao, id);

    const snapAntes = await getDoc(docRef);
    const dadosAntes = snapAntes.exists() ? snapAntes.data() : null;

    await deleteDoc(docRef);

    await this.registrarLog({
      colecao,
      documentoId: id,
      acao: 'exclusao',
      dadosAntes,
    });
  }
  /// FIM LOGS

  ////ModeloExame
  // private modelosExameCollection = collection(this.firestore, 'grupoExames');

  // addSemestres(data: GrupoExames) {
  //   return addDoc(collection(this.firestore, 'grupoExames'), data);
  // }

  // getSemestres(): Observable<GrupoExames[]> {
  //   const q = query(
  //     collection(this.firestore, 'grupoExames'),
  //     orderBy('grupoExame', 'desc'),
  //   );

  //   return collectionData(q, { idField: 'id' }) as Observable<GrupoExames[]>;
  // }

  // updateSemestres(id: string, data: Partial<GrupoExames>) {
  //   const ref = doc(this.firestore, `grupoExames/${id}`);
  //   return updateDoc(ref, data);
  // }

  // deleteSemestres(id: string) {
  //   const ref = doc(this.firestore, `grupoExames/${id}`);
  //   return deleteDoc(ref);
  // }
  // GRUPO EXAMES

  addSemestres(data: GrupoExames) {
    return this.criarComLog<GrupoExames>('grupoExames', data);
  }

  getSemestres(): Observable<GrupoExames[]> {
    const q = query(
      collection(this.firestore, 'grupoExames'),
      orderBy('grupoExame', 'desc'),
    );

    return collectionData(q, { idField: 'id' }) as Observable<GrupoExames[]>;
  }

  updateSemestres(id: string, data: Partial<GrupoExames>) {
    return this.atualizarComLog<GrupoExames>('grupoExames', id, data);
  }

  deleteSemestres(id: string) {
    return this.excluirComLog('grupoExames', id);
  }
  // FIM


// CRITÉRIOS

getCriterios(): Observable<Criterio[]> {
  const criteriosCollection = collection(this.firestore, 'criterios');

  return collectionData(criteriosCollection, {
    idField: 'id',
  }) as Observable<Criterio[]>;
}

// FIM CRITÉRIOS

  //// Exames
  // async addExame(dados: Exames) {
  //   const dadosRef = collection(this.firestore, 'exames');
  //   const docRef = await addDoc(dadosRef, dados);

  //   await setDoc(docRef, { ...dados, id: docRef.id }, { merge: true });

  //   return docRef;
  // }
  // async addExame(dados: Exames) {
  //   const dadosRef = collection(this.firestore, 'exames');

  //   const docRef = doc(dadosRef);

  //   await setDoc(docRef, {
  //     ...dados,
  //     id: docRef.id,
  //   });

  //   return docRef;
  // }

  // getExames() {
  //   const dadosCollection = collection(this.firestore, 'exames');
  //   return collectionData(dadosCollection, {
  //     idField: 'id',
  //   }) as Observable<Exames[]>;
  // }

  // // async deleteExame(id: string) {
  // //   const dadosDocRef = doc(this.firestore, 'exames', id);
  // //   return deleteDoc(dadosDocRef);
  // // }

  // async deleteExame(id: string) {
  //   const dadosDocRef = doc(this.firestore, 'exames', id);

  //   const snapAntes = await getDoc(dadosDocRef);
  //   const dadosAntes = snapAntes.exists() ? snapAntes.data() : null;

  //   await deleteDoc(dadosDocRef);

  //   await this.registrarLog({
  //     colecao: 'exames',
  //     documentoId: id,
  //     acao: 'exclusao',
  //     dadosAntes,
  //   });
  // }

  // // async updateExame(id: string, dados: Partial<Exames>) {
  // //   const dadosDocRef = doc(this.firestore, 'exames', id);
  // //   return updateDoc(dadosDocRef, dados);
  // // }
  // async updateExame(id: string, dados: Partial<Exames>) {
  //   const dadosDocRef = doc(this.firestore, 'exames', id);

  //   const snapAntes = await getDoc(dadosDocRef);
  //   const dadosAntes = snapAntes.exists() ? snapAntes.data() : null;

  //   await updateDoc(dadosDocRef, dados);

  //   await this.registrarLog({
  //     colecao: 'exames',
  //     documentoId: id,
  //     acao: 'alteracao',
  //     dadosAntes,
  //     dadosDepois: dados,
  //   });
  // }

  // EXAMES

  async addExame(dados: Exames) {
    return this.criarComLog<Exames>('exames', dados);
  }

  getExames() {
    const dadosCollection = collection(this.firestore, 'exames');
    return collectionData(dadosCollection, {
      idField: 'id',
    }) as Observable<Exames[]>;
  }

  async updateExame(id: string, dados: Partial<Exames>) {
    return this.atualizarComLog<Exames>('exames', id, dados);
  }

  async deleteExame(id: string) {
    return this.excluirComLog('exames', id);
  }
  // Fim

  //// Igreja
  // // Adicionar
  // async addIgrejas(dados: Igrejas) {
  //   const dadosfasRef = collection(this.firestore, 'igrejas');
  //   const docRef = await addDoc(dadosfasRef, dados);

  //   // Atualiza o documento adicionando o ID dentro dele:
  //   await setDoc(docRef, { ...dados, id: docRef.id }, { merge: true });

  //   return docRef;
  // }

  // // Pesquisar
  // getIgrejas() {
  //   const dadosCollection = collection(this.firestore, 'igrejas');
  //   return collectionData(dadosCollection, {
  //     idField: 'id',
  //   }) as Observable<Igrejas[]>;
  // }

  // // Deletar
  // async deleteIgrejas(id: string) {
  //   const dadosDocRef = doc(this.firestore, 'igrejas', id);
  //   return deleteDoc(dadosDocRef);
  // }

  // // Atualizar
  // async updateIgrejas(id: string, dados: Partial<Igrejas>) {
  //   const dadosDocRef = doc(this.firestore, 'igrejas', id);
  //   return updateDoc(dadosDocRef, dados);
  // }

  // IGREJAS

  async addIgrejas(dados: Igrejas) {
    return this.criarComLog<Igrejas>('igrejas', dados);
  }

  getIgrejas() {
    const dadosCollection = collection(this.firestore, 'igrejas');
    return collectionData(dadosCollection, {
      idField: 'id',
    }) as Observable<Igrejas[]>;
  }

  async updateIgrejas(id: string, dados: Partial<Igrejas>) {
    return this.atualizarComLog<Igrejas>('igrejas', id, dados);
  }

  async deleteIgrejas(id: string) {
    return this.excluirComLog('igrejas', id);
  }

  // Fim

  //// Setor
  // // Adicionar
  // async addSetor(dados: Setor) {
  //   const dadosfasRef = collection(this.firestore, 'setores');
  //   const docRef = await addDoc(dadosfasRef, dados);

  //   // Atualiza o documento adicionando o ID dentro dele:
  //   await setDoc(docRef, { ...dados, id: docRef.id }, { merge: true });

  //   return docRef;
  // }

  // // Pesquisar
  // getSetor() {
  //   const dadosCollection = collection(this.firestore, 'setores');
  //   return collectionData(dadosCollection, {
  //     idField: 'id',
  //   }) as Observable<Setor[]>;
  // }

  // // Deletar
  // async deleteSetor(id: string) {
  //   const dadosDocRef = doc(this.firestore, 'setores', id);
  //   return deleteDoc(dadosDocRef);
  // }

  // // Atualizar
  // async updateSetor(id: string, dados: Partial<Setor>) {
  //   const dadosDocRef = doc(this.firestore, 'setores', id);
  //   return updateDoc(dadosDocRef, dados);
  // }

  // SETORES

  async addSetor(dados: Setor) {
    return this.criarComLog<Setor>('setores', dados);
  }

  getSetor() {
    const dadosCollection = collection(this.firestore, 'setores');
    return collectionData(dadosCollection, {
      idField: 'id',
    }) as Observable<Setor[]>;
  }

  async updateSetor(id: string, dados: Partial<Setor>) {
    return this.atualizarComLog<Setor>('setores', id, dados);
  }

  async deleteSetor(id: string) {
    return this.excluirComLog('setores', id);
  }

  // Fim

  //// Instrumentos
  // // Adicionar
  // async addInstrumento(dados: Instrumentos) {
  //   const dadosfasRef = collection(this.firestore, 'instrumentos');
  //   const docRef = await addDoc(dadosfasRef, dados);

  //   // Atualiza o documento adicionando o ID dentro dele:
  //   await setDoc(docRef, { ...dados, id: docRef.id }, { merge: true });

  //   return docRef;
  // }

  // // Pesquisar
  // getInstrumento() {
  //   const dadosCollection = collection(this.firestore, 'instrumentos');
  //   return collectionData(dadosCollection, {
  //     idField: 'id',
  //   }) as Observable<Instrumentos[]>;
  // }

  // // Deletar
  // async deleteInstrumento(id: string) {
  //   const dadosDocRef = doc(this.firestore, 'instrumentos', id);
  //   return deleteDoc(dadosDocRef);
  // }

  // // Atualizar
  // async updateInstrumento(id: string, dados: Partial<Instrumentos>) {
  //   const dadosDocRef = doc(this.firestore, 'instrumentos', id);
  //   return updateDoc(dadosDocRef, dados);
  // }

  // INSTRUMENTOS

  async addInstrumento(dados: Instrumentos) {
    return this.criarComLog<Instrumentos>('instrumentos', dados);
  }

  getInstrumento() {
    const dadosCollection = collection(this.firestore, 'instrumentos');
    return collectionData(dadosCollection, {
      idField: 'id',
    }) as Observable<Instrumentos[]>;
  }

  async updateInstrumento(id: string, dados: Partial<Instrumentos>) {
    return this.atualizarComLog<Instrumentos>('instrumentos', id, dados);
  }

  async deleteInstrumento(id: string) {
    return this.excluirComLog('instrumentos', id);
  }

  // Fim

  //// Candidato
  //  // CANDIDATOS

  async addCandidato(dados: Candidatos) {
    return this.criarComLog<Candidatos>('candidatos', {
      ...dados,
      desativado: false,
    });
  }

  getCandidato() {
    const dadosCollection = collection(this.firestore, 'candidatos');
    return collectionData(dadosCollection, {
      idField: 'id',
    }) as Observable<Candidatos[]>;
  }

  async updateCandidato(id: string, dados: Partial<Candidatos>) {
    return this.atualizarComLog<Candidatos>('candidatos', id, dados);
  }

  async deleteCandidato(id: string) {
    return this.excluirComLog('candidatos', id);
  }
  // Fim

  //// Acessos
  // // Pesquisar
  // getAcessos() {
  //   const dadosCollection = collection(this.firestore, 'usuarios');
  //   return collectionData(dadosCollection, {
  //     idField: 'id',
  //   }) as Observable<Candidatos[]>;
  // }

  // // Deletar
  // async deleteAcessos(id: string) {
  //   const dadosDocRef = doc(this.firestore, 'usuarios', id);
  //   return deleteDoc(dadosDocRef);
  // }

  // // Atualizar
  // async updateAcessos(id: string, dados: Partial<Candidatos>) {
  //   const dadosDocRef = doc(this.firestore, 'usuarios', id);
  //   return updateDoc(dadosDocRef, dados);
  // }

  // USUÁRIOS / ACESSOS

  getAcessos() {
    const dadosCollection = collection(this.firestore, 'usuarios');
    return collectionData(dadosCollection, {
      idField: 'id',
    }) as Observable<any[]>;
  }

  async updateAcessos(id: string, dados: Partial<any>) {
    return this.atualizarComLog<any>('usuarios', id, dados);
  }

  async deleteAcessos(id: string) {
    return this.excluirComLog('usuarios', id);
  }
  // Fim

  // LOGS

  getLogs() {
    const q = query(
      collection(this.firestore, 'logs'),
      orderBy('dataHora', 'desc'),
    );

    return collectionData(q, {
      idField: 'id',
    }) as Observable<LogSistema[]>;
  }
}
