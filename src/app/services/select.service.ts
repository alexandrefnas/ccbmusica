import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SelectService {
  private openSelectSource = new Subject<any>();
  openSelect$ = this.openSelectSource.asObservable();

  notifyOpen(select: any) {
    this.openSelectSource.next(select);
  }
}

  export function upper(value: string): string {
    return value?.toLocaleUpperCase('pt-BR') || '';
  }

 export const LISTA_TIPO_USUARIO =  [
    { value: 'admin', label: 'Admin' },
    { value: 'secretario', label: 'Secretário(a)' },
    { value: 'regional', label: 'Regional' },
    { value: 'encarregado', label: 'Encarregado' },
    { value: 'usuario', label: 'Instrutor' },
  ];


export type Permissao = {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
};

export type Modulo =
  | 'candidatos'
  | 'igrejas'
  | 'instrumentos'
  | 'setores'
  | 'usuarios';

export type Acessos = Record<Modulo, Permissao>;

export type Perfil = 'admin' | 'regional' | 'secretario' | 'encarregado' | 'usuario';

export const TIPO_PERFIL: Record<Perfil, { acessos: Acessos }> = {
  admin: {
    acessos: {
      candidatos: { read: true, create: true, update: true, delete: true },
      igrejas: { read: true, create: true, update: true, delete: true },
      instrumentos: { read: true, create: true, update: true, delete: true },
      setores: { read: true, create: true, update: true, delete: true },
      usuarios: { read: true, create: true, update: true, delete: true },
    },
  },

  regional: {
    acessos: {
      candidatos: { read: true, create: true, update: true, delete: true },
      igrejas: { read: true, create: false, update: false, delete: false },
      instrumentos: { read: true, create: false, update: false, delete: false },
      setores: { read: false, create: false, update: false, delete: false },
      usuarios: { read: true, create: true, update: true, delete: true },
    },
  },

  secretario: {
    acessos: {
      candidatos: { read: true, create: true, update: true, delete: true },
      igrejas: { read: true, create: false, update: false, delete: false },
      instrumentos: { read: true, create: false, update: false, delete: false },
      setores: { read: false, create: false, update: false, delete: false },
      usuarios: { read: true, create: true, update: true, delete: true },
    },
  },

  encarregado: {
    acessos: {
      candidatos: { read: true, create: true, update: true, delete: true },
      igrejas: { read: false, create: false, update: false, delete: false },
      instrumentos: { read: false, create: false, update: false, delete: false },
      setores: { read: false, create: false, update: false, delete: false },
      usuarios: { read: false, create: false, update: false, delete: false },
    },
  },

  usuario: {
    acessos: {
      candidatos: { read: true, create: true, update: true, delete: false },
      igrejas: { read: false, create: false, update: false, delete: false },
      instrumentos: { read: false, create: false, update: false, delete: false },
      setores: { read: false, create: false, update: false, delete: false },
      usuarios: { read: false, create: false, update: false, delete: false },
    },
  },
};
