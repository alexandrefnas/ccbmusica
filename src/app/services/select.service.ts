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

export type Modulo =
  | 'candidatos'
  | 'grupoExames'
  | 'solicitacoes'
  | 'exames'
  | 'igrejas'
  | 'instrumentos'
  | 'setores'
  | 'usuarios';

export const LISTA_TIPO_USUARIO = [
  { value: 'admin', label: 'Admin' },
  { value: 'secretario', label: 'Secretário(a)' },
  { value: 'regional', label: 'Regional' },
  { value: 'encarregado', label: 'Encarregado' },
  { value: 'instrutor', label: 'Instrutor' },
];

export type Permissao = {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
};

export type Acessos = Record<Modulo, Permissao>;

export type Perfil =
  | 'admin'
  | 'regional'
  | 'secretario'
  | 'encarregado'
  | 'instrutor';

export const TIPO_PERFIL: Record<Perfil, { acessos: Acessos }> = {
  admin: {
    acessos: {
      candidatos: { read: true, create: true, update: true, delete: true },
      grupoExames: { read: true, create: true, update: true, delete: true },
      solicitacoes: { read: true, create: true, update: true, delete: true },
      exames: { read: true, create: true, update: true, delete: true },
      igrejas: { read: true, create: true, update: true, delete: true },
      instrumentos: { read: true, create: true, update: true, delete: true },
      setores: { read: true, create: true, update: true, delete: true },
      usuarios: { read: true, create: true, update: true, delete: true },
    },
  },

  regional: {
    acessos: {
      candidatos: { read: true, create: true, update: true, delete: true },
      grupoExames: { read: true, create: true, update: true, delete: true },
      solicitacoes: { read: true, create: true, update: true, delete: true },
      exames: { read: true, create: true, update: true, delete: true },
      igrejas: { read: true, create: false, update: false, delete: false },
      instrumentos: { read: true, create: false, update: false, delete: false },
      setores: { read: false, create: false, update: false, delete: false },
      usuarios: { read: true, create: true, update: true, delete: true },
    },
  },

  secretario: {
    acessos: {
      candidatos: { read: true, create: true, update: true, delete: true },
      grupoExames: { read: true, create: true, update: true, delete: true },
      solicitacoes: { read: true, create: true, update: true, delete: true },
      exames: { read: true, create: true, update: true, delete: true },
      igrejas: { read: true, create: false, update: false, delete: false },
      instrumentos: { read: true, create: false, update: false, delete: false },
      setores: { read: false, create: false, update: false, delete: false },
      usuarios: { read: true, create: true, update: true, delete: true },
    },
  },

  encarregado: {
    acessos: {
      candidatos: { read: true, create: true, update: true, delete: true },
      grupoExames: {
        read: false,
        create: false,
        update: false,
        delete: false,
      },
      solicitacoes: { read: true, create: true, update: true, delete: true },
      igrejas: { read: false, create: false, update: false, delete: false },
      exames: { read: false, create: false, update: false, delete: false },
      instrumentos: {
        read: false,
        create: false,
        update: false,
        delete: false,
      },
      setores: { read: false, create: false, update: false, delete: false },
      usuarios: { read: false, create: false, update: false, delete: false },
    },
  },

  instrutor: {
    acessos: {
      candidatos: { read: true, create: true, update: true, delete: false },
      grupoExames: {
        read: false,
        create: false,
        update: false,
        delete: false,
      },
      solicitacoes: { read: true, create: false, update: false, delete: false },
      exames: { read: false, create: false, update: false, delete: false },
      igrejas: { read: false, create: false, update: false, delete: false },
      instrumentos: {
        read: false,
        create: false,
        update: false,
        delete: false,
      },
      setores: { read: false, create: false, update: false, delete: false },
      usuarios: { read: false, create: false, update: false, delete: false },
    },
  },
};

export const listaTipoExame = [
  { value: '001', label: 'MSA' },
  { value: '002', label: 'PRÁTICO' },
  // { value: '002', label: 'TEÓRICO' },
];

export const listaPeriodo = [
  { value: '101', label: '1º PERÍODO' },
  { value: '102', label: '2º PERÍODO' },
  { value: '103', label: '3º PERÍODO' },
  { value: '104', label: '4º PERÍODO' },
];

export const listaPeriodoPratico = [
  { value: '1001', label: 'REUNIÃO DE JOVENS E MENORES' },
  { value: '1002', label: 'CULTO OFICIAL' },
  { value: '1003', label: 'OFICIALIZAÇÃO' },
];

const grupoExames1 = [
  {
    grupoExame: '2026/2',
    descricao: 'Testes teórico e pratica de solfejo',
    idSetor: '',
    idComum: '',
    criadoEm: '',
    usuarioCriador: '',
    concluido: false,
    periodos: [
      {
        categoriaExame: '001',
        tipoExame: 'TEÓRICO E PRÁTICO',
        etapas: [
          {
            tipo: '101',
            avaliacao: [
              {
                nome: 'PARTE TEÓRICA',
                dataAvaliacao: '',
                ordem: 1,
                notaMinima: 18,
                notaMaxima: 20,
                bloqueadaInicialmente: false,
              },
              {
                nome: 'PARTE PRÁTICA',
                dataAvaliacao: '',
                ordem: 2,
                notaMinima: 7,
                notaMaxima: 10,
                bloqueadaInicialmente: true,
              },
            ],
          },
          {
            tipo: '102',
            avaliacao: [
              {
                nome: 'PARTE TEÓRICA',
                dataAvaliacao: '',
                ordem: 1,
                notaMinima: 22,
                notaMaxima: 35,
                bloqueadaInicialmente: false,
              },
              {
                nome: 'PARTE PRÁTICA',
                dataAvaliacao: '',
                ordem: 2,
                notaMinima: 7,
                notaMaxima: 10,
                bloqueadaInicialmente: true,
              },
            ],
          },
          {
            tipo: '103',
            avaliacao: [
              {
                nome: 'PARTE TEÓRICA',
                dataAvaliacao: '',
                ordem: 1,
                notaMinima: 22,
                notaMaxima: 35,
                bloqueadaInicialmente: false,
              },
              {
                nome: 'PARTE PRÁTICA',
                dataAvaliacao: '',
                ordem: 2,
                notaMinima: 7,
                notaMaxima: 10,
                bloqueadaInicialmente: true,
              },
            ],
          },
          {
            tipo: '104',
            avaliacao: [
              {
                nome: 'PARTE TEÓRICA',
                dataAvaliacao: '',
                ordem: 1,
                notaMinima: 22,
                notaMaxima: 35,
                bloqueadaInicialmente: false,
              },
              {
                nome: 'PARTE PRÁTICA',
                dataAvaliacao: '',
                ordem: 2,
                notaMinima: 7,
                notaMaxima: 10,
                bloqueadaInicialmente: true,
              },
            ],
          },
        ],
      },
    ],
  },
];

const grupoExames2 = [
  {
    grupoExame: '2026/2',
    descricao: 'Teste Instrumentos',
    idSetor: '',
    idComum: '',
    criadoEm: '',
    usuarioCriador: '',
    concluido: false,
    periodos: [
      {
        categoriaExame: '002',
        tipoExame: 'PRÁTICO',
        etapas: [
          {
            tipo: '1001',
            avaliacao: [
              {
                nome: 'PARTE PRÁTICA',
                dataAvaliacao: '',
                ordem: 1,
                notaMinima: 7,
                notaMaxima: 10,
                bloqueadaInicialmente: false,
              },
            ],
          },
          {
            tipo: '1002',
            avaliacao: [
              {
                nome: 'PARTE PRÁTICA',
                dataAvaliacao: '',
                ordem: 1,
                notaMinima: 7,
                notaMaxima: 10,
                bloqueadaInicialmente: false,
              },
            ],
          },
          {
            tipo: '1003',
            avaliacao: [
              {
                nome: 'PARTE PRÁTICA',
                dataAvaliacao: '',
                ordem: 1,
                notaMinima: 7,
                notaMaxima: 10,
                bloqueadaInicialmente: false,
              },
            ],
          },
        ],
      },
    ],
  },
];
