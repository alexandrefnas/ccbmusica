import { Component } from '@angular/core';
import { ModalComponent } from '../../../modal/modal/modal.component';
import { TextComponent } from '../../../component/inputs/text/text.component';
import { SelectComponent } from '../../../component/inputs/select/select.component';
import { ButtonComponent } from '../../../component/button/button.component';
import {
  FirestoreService,
  Instrumentos,
} from '../../../services/firestore.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { confirmarAcao } from '../../../../shared/shared.service';
import { TableComponent } from '../../../component/table/table.component';
import { upper } from '../../../services/select.service';
import { AuthService, PermissoesCRUD } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { AlertService } from '../../../services/alert.service';

@Component({
  selector: 'tcx-instrumentos',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ModalComponent,
    TextComponent,
    ButtonComponent,
    SelectComponent,
    TableComponent,
  ],
  templateUrl: './instrumentos.component.html',
  styleUrl: './instrumentos.component.css',
})
export class InstrumentosComponent {
  title = 'TITULO';
  mostrarModal = false;

  liberaCriar = false;
  liberaEditar = false;
  liberaDeletar = false;

  listaFamilia = [
    { value: 'CORDAS', label: 'CORDAS' },
    { value: 'MADEIRAS', label: 'MADEIRAS' },
    { value: 'METAIS', label: 'METAIS' },
    { value: 'TECLADO', label: 'TECLADO' },
  ];

  listaVoz = [
    { value: 'SOPRANO 8ª ACIMA', label: 'SOPRANO 8ª ACIMA' },
    { value: 'SOPRANO', label: 'SOPRANO' },
    { value: 'CONTRALTO', label: 'CONTRALTO' },
    { value: 'TENOR', label: 'TENOR' },
    { value: 'BAIXO', label: 'BAIXO' },
    { value: 'BAIXO 8ª ABAIXO', label: 'BAIXO 8ª ABAIXO' },
    { value: 'TODAS', label: 'TODAS' },
  ];

  camposColunas = [
    'nomeInstrumento',
    'familia',
    'vozPrincipal',
    'vozAlternativa',
  ];

  tituloColunas = {
    nomeInstrumento: 'Instrumento',
    familia: 'Família',
    vozPrincipal: 'Voz Principal',
    vozAlternativa: 'Voz Alternativa',
  };

  dados: any[] = [];
  dadosParaEditar: any | null = null;

  alinhamentoColunaTitulo: { [coluna: string]: 'left' | 'center' | 'right' } = {
    nomeInstrumento: 'center',
    familia: 'center',
    vozPrincipal: 'center',
    vozAlternativa: 'center',
  };

  alinhamentoColuna: { [coluna: string]: 'left' | 'center' | 'right' } = {
    nomeInstrumento: 'left',
    familia: 'center',
    vozPrincipal: 'left',
    vozAlternativa: 'left',
  };

  tamanhoColunas = {
    nomeInstrumento: { width: '45%', minWidth: '200px' },
    familia: { width: '15%', minWidth: '150px' },
    vozPrincipal: { width: '20%', minWidth: '180px' },
    vozAlternativa: { width: '20%', minWidth: '180px' },
  };

  // Buttons
  acoes = [
    {
      label: '✏️',
      descricao: 'Editar',
      classe: 'acao-editar',
      visivel: () => this.liberaEditar,
      callback: (item: any) => this.editar(item),
    },
    {
      label: '🗑️',
      descricao: 'Excluir',
      classe: 'acao-excluir',
      visivel: () => this.liberaDeletar,
      callback: (item: any) => this.excluir(item),
    },
  ];
  //

  //Fim

  dadosForms: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private firestoreService: FirestoreService,
    private snackBar: MatSnackBar,
private alertService: AlertService
  ) {
    this.dadosForms = this.fb.group({
      nomeInstrumento: ['', Validators.required],
      familia: ['', Validators.required],
      vozPrincipal: ['', Validators.required],
      vozAlternativa: [''],
    });
    this.carregarDados();
  }

  permissao(tipo: keyof PermissoesCRUD): boolean {
    return this.auth.temPermissao('instrumentos', tipo);
  }

  ngOnInit(): void {
    this.liberaEditar = this.permissao('update');
    this.liberaCriar = this.permissao('create');
    this.liberaDeletar = this.permissao('delete');
    this.carregarDados();
  }

  // carregarDados(): void {
  //   this.firestoreService.getInstrumento().subscribe((date) => {
  //     const dadosOrdenados = date.sort((a, b) => {
  //       const nomeA = a.nomeInstrumento?.toLowerCase() || '';
  //       const nomeB = b.nomeInstrumento?.toLowerCase() || '';
  //       return nomeA.localeCompare(nomeB);
  //     });

  //     this.dados = [...dadosOrdenados]; // 🔁 Cria nova referência
  //     console.log('Dados carregados: ', this.dados);
  //   });
  // }

  carregarDados(): void {
    this.firestoreService.getInstrumento().subscribe((date) => {
      const ordemFamilia: Record<string, number> = {
        cordas: 1,
        madeiras: 2,
        metais: 3,
      };

      const ordemVoz: Record<string, number> = {
        'soprano 8ª acima': 1,
        soprano: 2,
        contralto: 3,
        tenor: 4,
        baixo: 5,
        'baixo 8ª abaixo': 6,
      };

      const dadosOrdenados = date.sort((a, b) => {
        // 1️⃣ Ordena por família
        const familiaA = ordemFamilia[a.familia?.toLowerCase()] ?? 999;
        const familiaB = ordemFamilia[b.familia?.toLowerCase()] ?? 999;

        if (familiaA !== familiaB) {
          return familiaA - familiaB;
        }

        // 2️⃣ Ordena por vozPrincipal
        const vozA = ordemVoz[normalizar(a.vozPrincipal)] ?? 999;
        const vozB = ordemVoz[normalizar(b.vozPrincipal)] ?? 999;

        if (vozA !== vozB) {
          return vozA - vozB;
        }

        // 3️⃣ Ordena por nomeInstrumento
        const nomeA = a.nomeInstrumento?.toLowerCase() || '';
        const nomeB = b.nomeInstrumento?.toLowerCase() || '';

        return nomeA.localeCompare(nomeB);
      });

      this.dados = [...dadosOrdenados];
      console.log('Dados carregados: ', this.dados);
    });
  }

  getControl(controlName: string): FormControl {
    const control = this.dadosForms.get(controlName);
    if (!control) {
      throw new Error(`FormControl '${controlName}' não existe no FormGroup`);
    }
    return control as FormControl;
  }

  get liberaAcoes(): boolean {
    return this.liberaCriar || this.liberaEditar || this.liberaDeletar;
  }

  buttonClick(): void {
    this.title = 'Cadastro Instrumentos';
    this.mostrarModal = true;
  }

  editar(select: Instrumentos): void {
    this.title = 'Editar Instrumentos';
    this.mostrarModal = true;
    this.dadosParaEditar = { ...select };

    this.dadosForms.patchValue({
      nomeInstrumento: select.nomeInstrumento || '',
      familia: select.familia || '',
      vozPrincipal: select.vozPrincipal || '',
      vozAlternativa: select.vozAlternativa || '',
    });
    console.log(this.dadosParaEditar);
  }

  async excluir(dados: Instrumentos): Promise<void> {
    const mensagem =`Tems certeza que deseja excluir "${dados.nomeInstrumento}"?`;
    // if (!confirmacao) {
    //   return;
    // }
  if (!(await this.alertService.confirmar(mensagem))) return;

    if (dados.id) {
      try {
        await this.firestoreService.deleteInstrumento(dados.id).then(() => {
          this.snackBar.open(
            `${dados.nomeInstrumento} deletado com sucesso!`,
            'Fechar',
            {
              duration: 4000,
            },
          );
        });
        // console.log('Cliente excluído:', dados);
        this.carregarDados();
      } catch (error) {
        console.error(`Erro ao excluir: "${dados.nomeInstrumento}" `, error);
      }
    }
  }

  async onSalvar(): Promise<void> {
    if (!this.dadosForms.valid) {
      this.dadosForms.markAllAsTouched();
      this.alertService.aviso('Formulário inválido. Preencha os campos obrigatórios.');
      return;
    }

    // const baseData = this.dadosForms.value;

    const baseData = {
      ...this.dadosForms.value,
      nomeInstrumento: upper(this.dadosForms.value.nomeInstrumento),
      familia: upper(this.dadosForms.value.familia),
      estvozPrincipalado: upper(this.dadosForms.value.vozPrincipal),
      vozAlternativa: upper(this.dadosForms.value.vozAlternativa),
    };

    const mensagem = this.dadosParaEditar
      ? `Deseja realmente alterar ${this.dadosParaEditar.nomeInstrumento}?`
      : `Deseja realmente salvar ${baseData.nomeInstrumento}?`;

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

      // if (!confirmarAcao(mensagem)) return;
      if (!(await this.alertService.confirmar(mensagem))) return;

      this.firestoreService
        .updateInstrumento(this.dadosParaEditar.id!, baseData)
        .then(() => {
          this.snackBar.open(
            `${baseData.nomeInstrumento} alterado com sucesso!`,
            'Fechar',
            {
              duration: 4000,
            },
          );
          this.fecharModal();
        });
    } else {
      // if (!confirmarAcao(mensagem)) return;
      if (!(await this.alertService.confirmar(mensagem))) return;
      this.firestoreService.addInstrumento(baseData).then(() => {
        this.snackBar.open(
          `${baseData.nomeSetor} salvo com sucesso!`,
          'Fechar',
          {
            duration: 4000,
          },
        );
        this.fecharModal();
      });
    }
  }

  fecharModal() {
    this.mostrarModal = false;
    this.dadosForms.reset();
  }
}

function normalizar(texto: string): string {
  return texto
    ?.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .trim();
}
