import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonComponent } from '../../../component/button/button.component';
import { ModalComponent } from '../../../modal/modal/modal.component';
import { TextComponent } from '../../../component/inputs/text/text.component';
import { SelectComponent } from '../../../component/inputs/select/select.component';
import { confirmarAcao } from '../../../../shared/shared.service';
import { FirestoreService, Setor } from '../../../services/firestore.service';
import { TableComponent } from '../../../component/table/table.component';
import { upper } from '../../../services/select.service';
import { AlertService } from '../../../services/alert.service';

@Component({
  selector: 'tcx-setor',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonComponent,
    ModalComponent,
    TextComponent,
    SelectComponent,
    TableComponent,
  ],
  templateUrl: './setor.component.html',
  styleUrl: './setor.component.css',
})
export class SetorComponent implements OnInit {
  title = 'TITULO';
  mostrarModal = false;

  listaEstados = [{ value: 'MG', label: 'MG' }];

  camposColunas = ['nomeSetor', 'nomeCidade', 'estado'];
  tituloColunas = {
    nomeSetor: 'Setor',
    nomeCidade: 'Cidade',
    estado: 'UF',
  };

  dados: any[] = [];
  // dados$: Observable<Setor[]>;
  dadosParaEditar: any | null = null;

  alinhamentoColunaTitulo: { [coluna: string]: 'left' | 'center' | 'right' } = {
    nomeSetor: 'center',
    nomeCidade: 'center',
    estado: 'center',
  };

  alinhamentoColuna: { [coluna: string]: 'left' | 'center' | 'right' } = {
    nomeSetor: 'center',
    estado: 'center',
  };

  tamanhoColunas = {
    nomeSetor: { width: '45%', minWidth: '200px' },
    nomeCidade: { width: '45%' },
    estado: { width: '10%', minWidth: '50px' },
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
    private alertService: AlertService,
  ) {
    this.dadosForms = this.fb.group({
      nomeSetor: ['', Validators.required],
      nomeCidade: ['', Validators.required],
      estado: ['MG', Validators.required],
    });
    this.carregarDados();
  }

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarDados(): void {
    this.firestoreService.getSetor().subscribe((setores) => {
      const setoresOrdenados = setores.sort((a, b) => {
        // UF
        const estadoA = (a.estado || '').toLowerCase();
        const estadoB = (b.estado || '').toLowerCase();

        const compararEstado = estadoA.localeCompare(estadoB);

        if (compararEstado !== 0) {
          return compararEstado;
        }

        // Cidade
        const cidadeA = (a.nomeCidade || '').toLowerCase();
        const cidadeB = (b.nomeCidade || '').toLowerCase();

        const compararCidade = cidadeA.localeCompare(cidadeB);

        if (compararCidade !== 0) {
          return compararCidade;
        }

        // Setor
        const setorA = (a.nomeSetor || '').toLowerCase();
        const setorB = (b.nomeSetor || '').toLowerCase();

        return setorA.localeCompare(setorB);
      });

      this.dados = [...setoresOrdenados]; // 🔁 Cria nova referência
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

  buttonClick(): void {
    this.title = 'Cadastro Setor';
    this.mostrarModal = true;
  }

  editar(select: Setor): void {
    this.title = 'Editar Setor';
    this.mostrarModal = true;
    this.dadosParaEditar = { ...select };

    this.dadosForms.patchValue({
      nomeSetor: select.nomeSetor || '',
      nomeCidade: select.nomeCidade || '',
      estado: select.estado || '',
    });
    console.log(this.dadosParaEditar);
  }

  async excluir(dados: Setor): Promise<void> {
    const mensagem =`Tems certeza que deseja excluir "${dados.nomeSetor}"?`;
    // if (!confirmacao) {
    //   return;
    // }

  if (!(await this.alertService.confirmar(mensagem))) return;

    if (dados.id) {
      try {
        await this.firestoreService.deleteSetor(dados.id).then(() => {
          this.snackBar.open(
            `${dados.nomeSetor} deletado com sucesso!`,
            'Fechar',
            {
              duration: 4000,
            },
          );
        });
        // console.log('Cliente excluído:', dados);
        this.carregarDados();
      } catch (error) {
        console.error(`Erro ao excluir: "${dados.nomeSetor}" `, error);
      }
    }
  }

  async onSalvar(): Promise<void> {
    if (!this.dadosForms.valid) {
      this.dadosForms.markAllAsTouched();
      this.alertService.aviso(
        'Formulário inválido. Preencha os campos obrigatórios.',
      );
      return;
    }

    // const baseData = this.dadosForms.value;

    const baseData = {
      ...this.dadosForms.value,
      nomeSetor: upper(this.dadosForms.value.nomeSetor),
      nomeCidade: upper(this.dadosForms.value.nomeCidade),
      estado: upper(this.dadosForms.value.estado),
    };

    const mensagem = this.dadosParaEditar
      ? `Deseja realmente altera ${this.dadosParaEditar.nomeSetor}?`
      : `Deseja realmente salvar ${baseData.nomeSetor}?`;

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

      if (!(await this.alertService.confirmar(mensagem))) return;
      // if (!confirmarAcao(mensagem)) return;

      this.firestoreService
        .updateSetor(this.dadosParaEditar.id!, baseData)
        .then(() => {
          this.snackBar.open(
            `${baseData.nomeSetor} alterado com sucesso!`,
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

      this.firestoreService.addSetor(baseData).then(() => {
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
