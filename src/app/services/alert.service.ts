import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface AlertData {
  tipo: 'sucesso' | 'erro' | 'aviso' | 'confirmacao';
  titulo?: string;
  mensagem: string;
  resolver?: (resposta: boolean) => void;
}

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  private alertSubject = new Subject<AlertData>();

  alert$ = this.alertSubject.asObservable();

sucesso(mensagem: string, titulo = 'Sucesso') {
  this.alertSubject.next({
    tipo: 'sucesso',
    titulo,
    mensagem,
  });
}

erro(mensagem: string, titulo = 'Erro') {
  this.alertSubject.next({
    tipo: 'erro',
    titulo,
    mensagem,
  });
}

aviso(mensagem: string, titulo = 'Atenção') {
  this.alertSubject.next({
    tipo: 'aviso',
    titulo,
    mensagem,
  });
}

confirmar(mensagem: string, titulo = 'Confirmação'): Promise<boolean> {
  return new Promise((resolve) => {
    this.alertSubject.next({
      tipo: 'confirmacao',
      titulo,
      mensagem,
      resolver: resolve,
    });
  });
}
}
