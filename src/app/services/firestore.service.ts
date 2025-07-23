import { Injectable } from '@angular/core';
import { addDoc, collection, collectionData, deleteDoc, doc, Firestore, setDoc, updateDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Setor {
  id?: string;
  nomeSetor: string;
  nomeCidade: string;
  estado: string;
}


@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  constructor(private firestore: Firestore) {}

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
  getContas() {
    const dadosCollection = collection(this.firestore, 'setores');
    return collectionData(dadosCollection, {
      idField: 'id',
    }) as Observable<Setor[]>;
  }

  // Deletar
  async deleteContas(id: string) {
    const dadosDocRef = doc(this.firestore, 'setores', id);
    return deleteDoc(dadosDocRef);
  }

  // Atualizar
  async updateContas(id: string, dados: Partial<Setor>) {
    const dadosDocRef = doc(this.firestore, 'setores', id);
    return updateDoc(dadosDocRef, dados);
  }

  // Fim Contas
}
