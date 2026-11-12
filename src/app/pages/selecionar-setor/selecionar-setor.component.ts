
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../services/auth.service';
import { SetorAtivoService } from '../../services/setor-ativo.service';
import {
  FirestoreService,
  Setor,
} from '../../services/firestore.service';

@Component({
  selector: 'tcx-selecionar-setor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './selecionar-setor.component.html',
  styleUrl: './selecionar-setor.component.css',
})
export class SelecionarSetorComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  setores: Setor[] = [];
  carregando = true;
  erro = '';

  constructor(
    private auth: AuthService,
    private setorAtivo: SetorAtivoService,
    private firestoreService: FirestoreService,
    private firestore: Firestore,
    private router: Router,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const usuario = this.auth.usuario;

    if (!usuario) {
      this.erro = 'Não foi possível identificar o usuário.';
      this.carregando = false;
      return;
    }

    if (usuario.perfil === 'admin') {
      this.firestoreService
        .getSetor()
        .pipe(
          take(1),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (setores) => {
            this.setores = this.ordenarSetores(setores);
            this.carregando = false;
            this.cd.markForCheck();
          },
          error: () => {
            this.erro = 'Não foi possível carregar os setores.';
            this.carregando = false;
            this.cd.markForCheck();
          },
        });

      return;
    }

    if (usuario.perfil === 'gestor') {
      void this.carregarSetoresGestor(usuario.idSetores ?? []);
      return;
    }

    void this.router.navigateByUrl('/home');
  }

  private async carregarSetoresGestor(
    idsSetores: string[],
  ): Promise<void> {
    const ids = [...new Set(idsSetores.filter(Boolean))];

    if (!ids.length) {
      this.erro = 'Nenhum setor foi vinculado a este gestor.';
      this.carregando = false;
      this.cd.markForCheck();
      return;
    }

    try {
      // Consulta somente documentos autorizados.
      const setores = await Promise.all(
        ids.map(async (id) => {
          const referencia = doc(this.firestore, 'setores', id);
          const documento = await getDoc(referencia);

          if (!documento.exists()) return null;

          return {
            ...documento.data(),
            id: documento.id,
          } as Setor;
        }),
      );

      this.setores = this.ordenarSetores(
        setores.filter((setor): setor is Setor => setor !== null),
      );
    } catch (erro) {
      console.error('Erro ao carregar setores do gestor:', erro);
      this.erro = 'Não foi possível consultar os setores autorizados.';
    } finally {
      this.carregando = false;
      this.cd.markForCheck();
    }
  }

  private ordenarSetores(setores: Setor[]): Setor[] {
    return [...setores].sort((a, b) =>
      (a.nomeSetor || '').localeCompare(
        b.nomeSetor || '',
        'pt-BR',
      ),
    );
  }

  selecionarSetor(idSetor: string): void {
    this.erro = '';

    if (!this.setorAtivo.selecionarSetor(idSetor)) {
      this.erro = 'Você não possui autorização para este setor.';
      return;
    }

    void this.router.navigateByUrl('/home');
  }
}
