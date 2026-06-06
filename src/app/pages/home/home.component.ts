import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { combineLatest } from 'rxjs';

import {
  Candidatos,
  Exames,
  FirestoreService,
} from '../../services/firestore.service';

import { AuthService } from '../../services/auth.service';

import {
  listaPeriodo,
  listaPeriodoPratico,
  listaTipoExame,
} from '../../services/select.service';
import { Router } from '@angular/router';

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
  constructor(
    private firestoreService: FirestoreService,
    private auth: AuthService,
    private router: Router,
  ) {}
  dados: CardResumo[] = [];
  resumoPorIgreja: any[] = [];
  resumoMSA: any[] = [];
  resumoInstrumento: any[] = [];
  totalSolicitacoesPendentes = 0;

  ngOnInit(): void {
    this.auth.getUsuarioAtualObservable().subscribe((usuario) => {
      if (!usuario) return;

      this.carregarDadosCards();
    });
  }

get liberaAcessoExames(): boolean {
  return this.auth.temPermissao('exames', 'read');
}

abrirExames(): void {
  if (!this.liberaAcessoExames) return;

  this.router.navigate(['/exames']);
}

  carregarDadosCards(): void {
    combineLatest([
      this.firestoreService.getExames(),
      this.firestoreService.getCandidato(),
      this.firestoreService.getIgrejas(),
    ]).subscribe(([exames, alunos, igrejas]) => {
      // if (!this.auth.temPermissao('exames', 'read')) {
      //   this.dados = [];
      //   return;
      // }
      const podeVerResumo =
        this.auth.temPermissao('exames', 'read') ||
        this.auth.temPermissao('solicitacoes', 'read') ||
        this.auth.temPermissao('candidatos', 'read');

      if (!podeVerResumo) {
        this.dados = [];
        this.resumoMSA = [];
        this.resumoInstrumento = [];
        this.totalSolicitacoesPendentes = 0;
        return;
      }

      const alunosPermitidos = alunos.filter((a) =>
        this.auth.temAcessoAoRegistro(a),
      );

      const idsAlunosPermitidos = alunosPermitidos.map((a) => a.id);

      const examesPermitidos = exames.filter((exame) =>
        idsAlunosPermitidos.includes(exame.idAluno),
      );

      this.resumoMSA = this.montarResumoPorIgreja(
        examesPermitidos.filter((e) => e.tipoExame === '001'),
        alunosPermitidos,
        igrejas,
      );

      this.resumoInstrumento = this.montarResumoPorIgreja(
        examesPermitidos.filter((e) => e.tipoExame === '002'),
        alunosPermitidos,
        igrejas,
      );

      this.totalSolicitacoesPendentes = examesPermitidos.filter(
        (e) => e.status === 'solicitado',
      ).length;

      this.dados = this.montarCards(examesPermitidos);
    });
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
