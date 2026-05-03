import { Component, OnInit } from '@angular/core';
import { ModalComponent } from '../../../modal/modal/modal.component';
import { ButtonComponent } from '../../../component/button/button.component';
import { TextComponent } from '../../../component/inputs/text/text.component';
import { SelectComponent } from '../../../component/inputs/select/select.component';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  FirestoreService,
  Igrejas,
  Setor,
} from '../../../services/firestore.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { confirmarAcao } from '../../../../shared/shared.service';
import { combineLatest, forkJoin, take } from 'rxjs';
import { TableComponent } from '../../../component/table/table.component';

@Component({
  selector: 'tcx-igrejas',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ModalComponent,
    ButtonComponent,
    TextComponent,
    SelectComponent,
    TableComponent,
  ],
  templateUrl: './igrejas.component.html',
  styleUrl: './igrejas.component.css',
})
export class IgrejasComponent implements OnInit {
  title = 'TITULO';
  mostrarModal = false;

  // listaSetor = [{ value: '01', label: 'Teste' }];
  listaSetor: { value: string; label: string }[] = [];

  // Campos TABELA
  camposColunas = ['nomeCongregacao', 'nomeSetor', 'localizacao'];
  tituloColunas = {
    nomeCongregacao: 'Congregação',
    nomeSetor: 'Setor',
    localizacao: 'Localização',
  };

  dados: Igrejas[] = [];
  // dados$: Observable<Setor[]>;
  dadosParaEditar: any | null = null;

  alinhamentoColunaTitulo: { [coluna: string]: 'left' | 'center' | 'right' } = {
    nomeCongregacao: 'center',
    nomeSetor: 'center',
    localizacao: 'center',
  };

  alinhamentoColuna: { [coluna: string]: 'left' | 'center' | 'right' } = {
    nomeCongregacao: 'left',
    nomeSetor: 'center',
    localizacao: 'center',
  };

  tamanhoColunas = {
    nomeCongregacao: { width: '25%' },
    nomeSetor: { width: '25%' },
    localizacao: { width: '45%' },
  };

  // Buttons
  acoes = [
    {
      label: '✏️',
      descricao: 'Editar',
      classe: 'acao-editar',
      visivel: (item: any) => true,
      callback: (item: any) => this.editar(item),
    },
    {
      label: '🗑️',
      descricao: 'Excluir',
      classe: 'acao-excluir',
      visivel: (item: any) => true,
      callback: (item: any) => this.excluir(item),
    },
  ];
  //

  //Fim

  dadosForms: FormGroup;

  constructor(
    private fb: FormBuilder,
    private firestoreService: FirestoreService,
    private snackBar: MatSnackBar,
  ) {
    this.dadosForms = this.fb.group({
      nomeCongregacao: ['', Validators.required],
      idSetor: ['', Validators.required],
      localizacao: [''],
    });
    this.carregarDados();
  }

  ngOnInit(): void {
    this.firestoreService.getSetor().subscribe((lista: Setor[]) => {
      // this.listaLinks = lista;
      this.listaSetor = lista.map((l) => ({
        value: l.id!,
        label: l.nomeSetor,
      }));
    });

    this.carregarDados();
  }

  getControl(controlName: string): FormControl {
    const control = this.dadosForms.get(controlName);
    if (!control) {
      throw new Error(`FormControl '${controlName}' não existe no FormGroup`);
    }
    return control as FormControl;
  }

  onSalvar(): void {
    if (!this.dadosForms.valid) {
      this.dadosForms.markAllAsTouched();
      alert('Formulário inválido. Preencha os campos obrigatórios.');
      return;
    }

    const baseData = this.dadosForms.value;

    const mensagem = this.dadosParaEditar
      ? `Deseja realmente alterar ${this.dadosParaEditar.nomeCongregacao}?`
      : `Deseja realmente salvar ${baseData.nomeCongregacao}?`;

    // if (!confirmarAcao(mensagem)) return;

    if (this.dadosParaEditar) {
      const alterado = Object.keys(baseData).some(
        (key) => baseData[key] !== this.dadosParaEditar[key],
      );

      if (!alterado) {
        this.snackBar.open('Nenhuma alteração detectada.', 'Fechar', {
          duration: 3000,
        });
        this.fecharModal();
        return;
      }

      if (!confirmarAcao(mensagem)) return;

      this.firestoreService
        .updateIgrejas(this.dadosParaEditar.id!, baseData)
        .then(() => {
          this.snackBar.open(
            `${baseData.nomeCongregacao} alterado com sucesso!`,
            'Fechar',
            {
              duration: 4000,
            },
          );
          this.fecharModal();
        });
    } else {
      if (!confirmarAcao(mensagem)) return;

      this.firestoreService.addIgrejas(baseData).then(() => {
        this.snackBar.open(
          `${baseData.nomeCongregacao} salvo com sucesso!`,
          'Fechar',
          {
            duration: 4000,
          },
        );
        this.fecharModal();
      });
    }
  }

  // carregarDados(): void {
  //   forkJoin({
  //     igrejas: this.firestoreService.getIgrejas().pipe(take(1)),
  //     setores: this.firestoreService.getSetor().pipe(take(1)),
  //   }).subscribe(({ igrejas, setores }) => {
  //     let dadosIgrejas = igrejas.map((igreja) => {
  //       const setorFiltro = setores.find((c) => c.id === igreja.idSetor);
  //       return {
  //         ...igreja,
  //         nomeSetor: setorFiltro?.nomeSetor ?? 'Setor não encontrado',
  //         nomeCidade: setorFiltro?.nomeCidade ?? '',
  //         estado: setorFiltro?.estado ?? '',
  //       };
  //     });

  //     const igrejasOrdenadas = dadosIgrejas.sort((a, b) => {
  //       const nomeA = a.nomeCongregacao?.toLowerCase() || '';
  //       const nomeB = b.nomeCongregacao?.toLowerCase() || '';
  //       return nomeA.localeCompare(nomeB);
  //     });

  //     this.dados = [...igrejasOrdenadas]; // 🔁 Cria nova referência
  //     // console.log('Dados carregados: ', this.dados);
  //   });
  // }

  carregarDados(): void {
    combineLatest([
      this.firestoreService.getIgrejas(),
      this.firestoreService.getSetor(),
    ]).subscribe(([igrejas, setores]) => {
      const dadosIgrejas = igrejas.map((igreja) => {
        const setorFiltro = setores.find((c) => c.id === igreja.idSetor);
        return {
          ...igreja,
          nomeSetor: setorFiltro?.nomeSetor ?? 'Setor não encontrado',
        };
      });

      // Ordenar se necessário
      this.dados = [...dadosIgrejas].sort((a, b) =>
        (a.nomeCongregacao || '').localeCompare(b.nomeCongregacao || ''),
      );
    });
  }

  buttonClick(): void {
    this.title = 'Cadastro de Congregação';
    this.mostrarModal = true;
  }

  editar(select: Igrejas): void {
    this.title = 'Editar Igreja';
    this.mostrarModal = true;
    this.dadosParaEditar = { ...select };

    this.dadosForms.patchValue({
      nomeCongregacao: select.nomeCongregacao || '',
      idSetor: select.idSetor || '',
      localizacao: select.localizacao || '',
    });
    // console.log(this.dadosParaEditar);
  }

  async excluir(dados: Igrejas): Promise<void> {
    const confirmacao = confirm(
      `Tems certeza que deseja excluir "${dados.nomeCongregacao}"?`,
    );
    if (!confirmacao) {
      return;
    }

    if (dados.id) {
      try {
        await this.firestoreService.deleteIgrejas(dados.id).then(() => {
          this.snackBar.open(
            `${dados.nomeCongregacao} deletado com sucesso!`,
            'Fechar',
            {
              duration: 4000,
            },
          );
        });
        // console.log('Cliente excluído:', dados);
        this.carregarDados();
      } catch (error) {
        console.error(`Erro ao excluir: "${dados.nomeCongregacao}" `, error);
      }
    }
  }

  fecharModal() {
    this.mostrarModal = false;
    this.dadosForms.reset();
  }
}
