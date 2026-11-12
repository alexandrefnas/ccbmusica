import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { catchError, combineLatest, EMPTY, map, switchMap } from 'rxjs';

import {
  Candidatos,
  Exames,
  FirestoreService,
  Igrejas,
} from '../../services/firestore.service';

import { AuthService } from '../../services/auth.service';

import {
  listaPeriodo,
  listaPeriodoPratico,
  listaTipoExame,
} from '../../services/select.service';
import { Router } from '@angular/router';
import { SetorAtivoService } from '../../services/setor-ativo.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type CardDetalhe = {
  label: string;
  total: number;
  aprovado: number;
  reprovado: number;
};

type CardResumo = {
  nome: string;
  total: number;
  detalhamento: CardDetalhe[];
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private firestoreService: FirestoreService,
    private auth: AuthService,
    private router: Router,
    private setorAtivo: SetorAtivoService,
  ) {}

  dados: CardResumo[] = [];
  resumoPorIgreja: any[] = [];
  resumoMSA: any[] = [];
  resumoInstrumento: any[] = [];
  totalSolicitacoesPendentes = 0;

  ngOnInit(): void {
    combineLatest([
      this.auth.getUsuarioAtualObservable(),
      this.setorAtivo.setorAtivo$,
    ])
      .pipe(
        switchMap(([usuario, idSetor]) => {
          this.limparResumo();

          if (!usuario || !idSetor) {
            return EMPTY;
          }

          return combineLatest([
            this.firestoreService.getExames(),
            this.firestoreService.getCandidato(),
            this.firestoreService.getIgrejas(),
          ]).pipe(
            map(([exames, alunos, igrejas]) => ({
              idSetor,
              exames,
              alunos,
              igrejas,
            })),
            catchError((erro) => {
              console.error('Erro ao carregar dashboard do setor:', erro);
              this.limparResumo();
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ idSetor, exames, alunos, igrejas }) => {
        this.carregarDadosCards(idSetor, exames, alunos, igrejas);
      });
  }

  get liberaAcessoExames(): boolean {
    return this.auth.temPermissao('exames', 'read');
  }

  abrirExames(): void {
    if (!this.liberaAcessoExames) return;

    this.router.navigate(['/exames']);
  }

  private limparResumo(): void {
    this.dados = [];
    this.resumoPorIgreja = [];
    this.resumoMSA = [];
    this.resumoInstrumento = [];
    this.totalSolicitacoesPendentes = 0;
  }

  private carregarDadosCards(
    idSetor: string,
    exames: Exames[],
    alunos: Candidatos[],
    igrejas: Igrejas[],
  ): void {
    const podeVerResumo =
      this.auth.temPermissao('exames', 'read') ||
      this.auth.temPermissao('solicitacoes', 'read') ||
      this.auth.temPermissao('candidatos', 'read');

    if (!podeVerResumo) {
      this.limparResumo();
      return;
    }

    // Considera somente alunos do setor ativo.
    const alunosPermitidos = alunos.filter(
      (aluno) =>
        aluno.idSetor === idSetor && this.auth.temAcessoAoRegistro(aluno),
    );

    const idsAlunos = new Set(
      alunosPermitidos
        .map((aluno) => aluno.id)
        .filter((id): id is string => !!id),
    );

    // Os exames são relacionados ao setor pelo aluno.
    const examesPermitidos = exames.filter((exame) =>
      idsAlunos.has(exame.idAluno),
    );

    const igrejasPermitidas = igrejas.filter(
      (igreja) => igreja.idSetor === idSetor,
    );

    this.resumoMSA = this.montarResumoPorIgreja(
      examesPermitidos.filter((exame) => exame.tipoExame === '001'),
      alunosPermitidos,
      igrejasPermitidas,
    );

    this.resumoInstrumento = this.montarResumoPorIgreja(
      examesPermitidos.filter((exame) => exame.tipoExame === '002'),
      alunosPermitidos,
      igrejasPermitidas,
    );

    this.totalSolicitacoesPendentes = examesPermitidos.filter(
      (exame) => exame.status === 'solicitado',
    ).length;

    this.dados = this.montarCards(examesPermitidos);
  }

  montarResumoPorIgreja(
    exames: Exames[],
    alunos: Candidatos[],
    igrejas: any[],
  ) {
    const resumo: any = {};

    exames.forEach((exame) => {
      const aluno = alunos.find((a) => a.id === exame.idAluno);

      if (!aluno?.idComum) return;

      const igreja = igrejas.find((i) => i.id === aluno.idComum);

      const nomeIgreja =
        igreja?.nomeCongregacao?.toLocaleUpperCase('pt-BR') ||
        'IGREJA NÃO ENCONTRADA';

      const tipoExameLabel =
        listaTipoExame.find((t) => t.value === exame.tipoExame)?.label ||
        exame.tipoExame;

      const chave = `${aluno.idComum}_${exame.tipoExame}`;

      if (!resumo[chave]) {
        resumo[chave] = {
          idComum: aluno.idComum,
          igreja: nomeIgreja,
          tipoExame: exame.tipoExame,
          tipoExameLabel,
          total: 0,
          aprovado: 0,
          reprovado: 0,
        };
      }

      resumo[chave].total++;

      if (exame.status === 'aprovado') {
        resumo[chave].aprovado++;
      }

      if (exame.status === 'reprovado') {
        resumo[chave].reprovado++;
      }
    });

    return Object.values(resumo).sort((a: any, b: any) => {
      const igreja = a.igreja.localeCompare(b.igreja);
      if (igreja !== 0) return igreja;

      return a.tipoExameLabel.localeCompare(b.tipoExameLabel);
    });
  }

  montarCards(exames: Exames[]): CardResumo[] {
    const examesMSA = exames.filter((e) => e.tipoExame === '001');
    const examesInstrumento = exames.filter((e) => e.tipoExame === '002');

    return [
      {
        nome: 'Solicitações',
        total: exames.length,
        detalhamento: [
          this.contarGrupo('MSA', examesMSA),
          this.contarGrupo('INSTRUMENTO', examesInstrumento),
        ],
      },
      {
        nome: 'MSA',
        total: examesMSA.length,
        detalhamento: listaPeriodo.map((periodo) =>
          this.contarCategoria(periodo.label, examesMSA, periodo.value),
        ),
      },
      {
        nome: 'INSTRUMENTO',
        total: examesInstrumento.length,
        detalhamento: listaPeriodoPratico.map((categoria) =>
          this.contarCategoria(
            categoria.label,
            examesInstrumento,
            categoria.value,
          ),
        ),
      },
    ];
  }

  contarGrupo(label: string, exames: Exames[]): CardDetalhe {
    return {
      label,
      total: exames.length,
      aprovado: exames.filter((e) => e.status === 'aprovado').length,
      reprovado: exames.filter((e) => e.status === 'reprovado').length,
    };
  }

  contarCategoria(
    label: string,
    exames: Exames[],
    categoriaExame: string,
  ): CardDetalhe {
    const filtrados = exames.filter((e) => e.categoriaExame === categoriaExame);

    return {
      label,
      total: filtrados.length,
      aprovado: filtrados.filter((e) => e.status === 'aprovado').length,
      reprovado: filtrados.filter((e) => e.status === 'reprovado').length,
    };
  }
}

// import { CommonModule } from '@angular/common';
// import { Component, Input } from '@angular/core';
// import { FormBuilder, FormControl, FormGroup } from '@angular/forms';

// @Component({
//   selector: 'app-home',
//   standalone: true,
//   imports: [CommonModule],
//   templateUrl: './home.component.html',
//   styleUrl: './home.component.css',
// })
// export class HomeComponent {

//   dados = [
//     {
//       nome: 'Solicitações',
//       total: 40,
//       detalhamento:[
//         { label: 'MSA', total: 10, aprovado: 8, reprovado: 2 },
//         { label: 'INSTRUMENTO', total: 10, aprovado: 8, reprovado: 2 },
//       ],
//     },
//     {
//       nome: 'MSA',
//       total: 40,
//       detalhamento:[
//         { label: '1º Periodo', total: 10, aprovado: 8, reprovado: 2 },
//         { label: '2º Periodo', total: 10, aprovado: 8, reprovado: 2 },
//         { label: '3º Periodo', total: 10, aprovado: 8, reprovado: 2 },
//         { label: '4º Periodo', total: 10, aprovado: 8, reprovado: 2 },
//       ],
//     },
//     {
//       nome: 'INSTRUMENTO',
//       total: 40,
//       detalhamento:[
//         { label: 'RJM', total: 10, aprovado: 8, reprovado: 2 },
//         { label: 'C.O', total: 10, aprovado: 8, reprovado: 2 },
//         { label: 'OF', total: 10, aprovado: 8, reprovado: 2 },
//       ],
//     },
//   ]

//   constructor(private fb: FormBuilder) {

//   }

// }
