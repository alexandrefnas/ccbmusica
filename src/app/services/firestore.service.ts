import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export type StatusExame =
  | 'solicitado'
  | 'agendado'
  | 'emAndamento'
  | 'aprovado'
  | 'reprovado'
  | 'cancelado';

export type ResultadoEtapa =
  | 'pendente'
  | 'bloqueado'
  | 'aprovado'
  | 'reprovado';

export interface EtapaExame {
  nome: string;
  ordem: number;
  nota: number | null;
  notaMinima: number;
  resultado: ResultadoEtapa;
  dataAgendada: string;
  dataLancamento: string;
  professorLancamento: string;
}

export interface Exames {
  id?: string;
  idAluno: string;
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
}

export interface Candidatos {
  id?: string;
  nomeAluno: string;
  dataNascimento: string;
  idSetor: string;
  idComum: string;
  idInstrumento: string;
  afinacao: string;
}

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  constructor(private firestore: Firestore) {}

  //// Exames
  // async addExame(dados: Exames) {
  //   const dadosRef = collection(this.firestore, 'exames');
  //   const docRef = await addDoc(dadosRef, dados);

  //   await setDoc(docRef, { ...dados, id: docRef.id }, { merge: true });

  //   return docRef;
  // }
  async addExame(dados: Exames) {
    const dadosRef = collection(this.firestore, 'exames');

    const docRef = doc(dadosRef);

    await setDoc(docRef, {
      ...dados,
      id: docRef.id,
    });

    return docRef;
  }

  getExames() {
    const dadosCollection = collection(this.firestore, 'exames');
    return collectionData(dadosCollection, {
      idField: 'id',
    }) as Observable<Exames[]>;
  }

  async deleteExame(id: string) {
    const dadosDocRef = doc(this.firestore, 'exames', id);
    return deleteDoc(dadosDocRef);
  }

  async updateExame(id: string, dados: Partial<Exames>) {
    const dadosDocRef = doc(this.firestore, 'exames', id);
    return updateDoc(dadosDocRef, dados);
  }
  // Fim

  //// Igreja
  // Adicionar
  async addIgrejas(dados: Igrejas) {
    const dadosfasRef = collection(this.firestore, 'igrejas');
    const docRef = await addDoc(dadosfasRef, dados);

    // Atualiza o documento adicionando o ID dentro dele:
    await setDoc(docRef, { ...dados, id: docRef.id }, { merge: true });

    return docRef;
  }

  // Pesquisar
  getIgrejas() {
    const dadosCollection = collection(this.firestore, 'igrejas');
    return collectionData(dadosCollection, {
      idField: 'id',
    }) as Observable<Igrejas[]>;
  }

  // Deletar
  async deleteIgrejas(id: string) {
    const dadosDocRef = doc(this.firestore, 'igrejas', id);
    return deleteDoc(dadosDocRef);
  }

  // Atualizar
  async updateIgrejas(id: string, dados: Partial<Igrejas>) {
    const dadosDocRef = doc(this.firestore, 'igrejas', id);
    return updateDoc(dadosDocRef, dados);
  }

  // Fim

  //// Setor
  // Adicionar
  async addSetor(dados: Setor) {
    const dadosfasRef = collection(this.firestore, 'setores');
    const docRef = await addDoc(dadosfasRef, dados);

    // Atualiza o documento adicionando o ID dentro dele:
    await setDoc(docRef, { ...dados, id: docRef.id }, { merge: true });

    return docRef;
  }

  // Pesquisar
  getSetor() {
    const dadosCollection = collection(this.firestore, 'setores');
    return collectionData(dadosCollection, {
      idField: 'id',
    }) as Observable<Setor[]>;
  }

  // Deletar
  async deleteSetor(id: string) {
    const dadosDocRef = doc(this.firestore, 'setores', id);
    return deleteDoc(dadosDocRef);
  }

  // Atualizar
  async updateSetor(id: string, dados: Partial<Setor>) {
    const dadosDocRef = doc(this.firestore, 'setores', id);
    return updateDoc(dadosDocRef, dados);
  }

  // Fim

  //// Instrumentos
  // Adicionar
  async addInstrumento(dados: Instrumentos) {
    const dadosfasRef = collection(this.firestore, 'instrumentos');
    const docRef = await addDoc(dadosfasRef, dados);

    // Atualiza o documento adicionando o ID dentro dele:
    await setDoc(docRef, { ...dados, id: docRef.id }, { merge: true });

    return docRef;
  }

  // Pesquisar
  getInstrumento() {
    const dadosCollection = collection(this.firestore, 'instrumentos');
    return collectionData(dadosCollection, {
      idField: 'id',
    }) as Observable<Instrumentos[]>;
  }

  // Deletar
  async deleteInstrumento(id: string) {
    const dadosDocRef = doc(this.firestore, 'instrumentos', id);
    return deleteDoc(dadosDocRef);
  }

  // Atualizar
  async updateInstrumento(id: string, dados: Partial<Instrumentos>) {
    const dadosDocRef = doc(this.firestore, 'instrumentos', id);
    return updateDoc(dadosDocRef, dados);
  }
  // Fim

  //// Candidato
  // Adicionar
  async addCandidato(dados: Candidatos) {
    const dadosfasRef = collection(this.firestore, 'candidatos');
    const docRef = await addDoc(dadosfasRef, dados);

    // Atualiza o documento adicionando o ID dentro dele:
    await setDoc(docRef, { ...dados, id: docRef.id }, { merge: true });

    return docRef;
  }

  // Pesquisar
  getCandidato() {
    const dadosCollection = collection(this.firestore, 'candidatos');
    return collectionData(dadosCollection, {
      idField: 'id',
    }) as Observable<Candidatos[]>;
  }

  // Deletar
  async deleteCandidato(id: string) {
    const dadosDocRef = doc(this.firestore, 'candidatos', id);
    return deleteDoc(dadosDocRef);
  }

  // Atualizar
  async updateCandidato(id: string, dados: Partial<Candidatos>) {
    const dadosDocRef = doc(this.firestore, 'candidatos', id);
    return updateDoc(dadosDocRef, dados);
  }
  // Fim

  //// Acessos
  // Pesquisar
  getAcessos() {
    const dadosCollection = collection(this.firestore, 'usuarios');
    return collectionData(dadosCollection, {
      idField: 'id',
    }) as Observable<Candidatos[]>;
  }

  // Deletar
  async deleteAcessos(id: string) {
    const dadosDocRef = doc(this.firestore, 'usuarios', id);
    return deleteDoc(dadosDocRef);
  }

  // Atualizar
  async updateAcessos(id: string, dados: Partial<Candidatos>) {
    const dadosDocRef = doc(this.firestore, 'usuarios', id);
    return updateDoc(dadosDocRef, dados);
  }
  // Fim
}
