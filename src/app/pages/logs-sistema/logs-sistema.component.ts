import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FirestoreService, LogSistema } from '../../services/firestore.service';
import { TableComponent } from '../../component/table/table.component';
import { AuthService } from '../../services/auth.service';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'tcx-logs-sistema',
  standalone: true,
  imports: [CommonModule, TableComponent],
  templateUrl: './logs-sistema.component.html',
  styleUrl: './logs-sistema.component.css',
})
export class LogsSistemaComponent implements OnInit {
  logs: any[] = [];
  logsFiltrados: any[] = [];

  carregando = false;

  colunas = [
    'dataHoraFormatada',
    'usuarioEmail',
    'acaoFormatada',
    'colecao',
    'documentoId',
  ];

  colunasLabels: { [key: string]: string } = {
    dataHoraFormatada: 'DATA/HORA',
    usuarioEmail: 'USUÁRIO',
    acaoFormatada: 'AÇÃO',
    colecao: 'COLEÇÃO',
    documentoId: 'DOCUMENTO',
  };

  tamanhosColunas = {
    dataHoraFormatada: { width: '160px' },
    usuarioEmail: { width: '220px' },
    acaoFormatada: { width: '120px' },
    colecao: { width: '130px' },
    documentoId: { width: '220px' },
  };

  alinhamentoColunaTitulo: { [coluna: string]: 'left' | 'center' | 'right' } = {
    dataHoraFormatada: 'center',
    usuarioEmail: 'left',
    acaoFormatada: 'center',
    colecao: 'center',
    documentoId: 'left',
  };

  alinhamentoColuna: { [coluna: string]: 'left' | 'center' | 'right' } = {
    dataHoraFormatada: 'center',
    usuarioEmail: 'left',
    acaoFormatada: 'center',
    colecao: 'center',
    documentoId: 'left',
  };

  acoesTabela = [
    {
      label: '<i class="bi bi-eye"></i>',
      descricao: 'Visualizar detalhes do log',
      classe: 'buttons-stile',
      callback: (item: any) => this.visualizarLog(item),
    },
  ];

  logSelecionado: any = null;
  mostrarDetalhes = false;

  constructor(
    private firestoreService: FirestoreService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.carregarLogs();
  }

  carregarLogs() {
    this.carregando = true;

    combineLatest([
      this.firestoreService.getLogs(),
      this.authService.usuarioLogado$,
      this.firestoreService.getAcessos(),
    ]).subscribe({
      next: ([logs, usuarioLogado, usuarios]) => {
        if (!usuarioLogado) {
          this.logs = [];
          this.logsFiltrados = [];
          this.carregando = false;
          return;
        }

        const logsPermitidos = this.filtrarLogsPorNivelUsuario(
          logs,
          usuarioLogado,
          usuarios,
        );

        this.logs = logsPermitidos.map((log) => ({
          ...log,
          dataHoraFormatada: this.formatarTimestamp(log.dataHora),
          acaoFormatada: this.formatarAcao(log.acao),
          colecao: (log.colecao || '').toUpperCase(),
        }));

        this.logsFiltrados = [...this.logs];
        this.carregando = false;
      },
      error: (erro) => {
        console.error('Erro ao carregar logs:', erro);
        this.carregando = false;
      },
    });
  }

  filtrarLogsPorNivelUsuario(
    logs: LogSistema[],
    usuarioLogado: any,
    usuarios: any[],
  ): LogSistema[] {
    const perfil = usuarioLogado?.perfil;

    if (perfil === 'admin' || perfil === 'zeus') {
      return logs;
    }

    return logs.filter((log) => {
      const mesmoUsuario =
        log.usuarioUid === usuarioLogado.uid ||
        log.usuarioEmail === usuarioLogado.email;

      if (mesmoUsuario) {
        return true;
      }

      const usuarioLog = usuarios.find(
        (u) =>
          u.uid === log.usuarioUid ||
          u.id === log.usuarioUid ||
          u.email === log.usuarioEmail,
      );

      if (!usuarioLog) {
        return false;
      }

      if (perfil === 'regional' || perfil === 'secretario') {
        return usuarioLog.idSetor === usuarioLogado.idSetor;
      }

      if (perfil === 'encarregado' || perfil === 'instrutor') {
        return usuarioLog.idComum === usuarioLogado.idComum;
      }

      return false;
    });
  }
  visualizarLog(log: any) {
    this.logSelecionado = log;
    this.mostrarDetalhes = true;
  }

  fecharDetalhes() {
    this.logSelecionado = null;
    this.mostrarDetalhes = false;
  }

  formatarAcao(acao: string): string {
    switch (acao) {
      case 'cadastro':
        return 'CADASTRO';
      case 'alteracao':
        return 'ALTERAÇÃO';
      case 'exclusao':
        return 'EXCLUSÃO';
      default:
        return acao?.toUpperCase() || '';
    }
  }

  formatarTimestamp(data: any): string {
    if (!data) return '';

    const date = data.toDate ? data.toDate() : new Date(data);

    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  formatarJson(valor: any): string {
    if (!valor) return 'Sem dados';

    return JSON.stringify(valor, null, 2);
  }
}
