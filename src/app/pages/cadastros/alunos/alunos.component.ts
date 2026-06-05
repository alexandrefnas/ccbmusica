import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { combineLatest } from 'rxjs';
import { ModalComponent } from '../../../modal/modal/modal.component';
import { ButtonComponent } from '../../../component/button/button.component';
import { TextComponent } from '../../../component/inputs/text/text.component';
import { SelectComponent } from '../../../component/inputs/select/select.component';
import { DataComponent } from '../../../component/inputs/data/data.component';
import {
  confirmarAcao,
  converterISOParaBR,
  formatarDataString,
} from '../../../../shared/shared.service';
import { TableComponent } from '../../../component/table/table.component';
import {
  Candidatos,
  FirestoreService,
  Igrejas,
  Instrumentos,
} from '../../../services/firestore.service';
import { upper } from '../../../services/select.service';
import { AuthService, PermissoesCRUD } from '../../../services/auth.service';
import { AlertService } from '../../../services/alert.service';

@Component({
  selector: 'tcx-alunos',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ModalComponent,
    ButtonComponent,
    TextComponent,
    SelectComponent,
    DataComponent,
    TableComponent,
  ],
  templateUrl: './alunos.component.html',
  styleUrl: './alunos.component.css',
})
export class AlunosComponent implements OnInit {
  constructor(
    private fb: FormBuilder,
    private firestoreService: FirestoreService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
    private alertService: AlertService,
  ) {
    this.dadosForms = this.fb.group({
      nomeAluno: ['', Validators.required],
      dataNascimento: ['', Validators.required],
      idSetor: [''],
      idComum: ['', Validators.required],
      idInstrumento: [''],
      afinacao: [''],
    });
    // this.carregarDados();
    // this.liberaEditar = this.permissao('update');
    // this.liberaCriar = this.permissao('create');
    // this.liberaDeletar = this.permissao('delete');
  }

  liberaEditar: boolean = false;
  liberaCriar: boolean = false;
  liberaDeletar: boolean = false;
  title = '';
  mostrarModal = false;

  listaIgreja: { value: string; label: string; idSetor: string }[] = [];
  listaSetor: { value: string; label: string }[] = [];
  listaIgrejaTodas: { value: string; label: string; idSetor: string }[] = [];
  listaInstrumento: { value: string; label: string }[] = [];
  listaAfinacao = [
    { value: 'DÓ', label: 'DÓ' },
    { value: 'FÁ', label: 'FÁ' },
    { value: 'FÁ/SIB', label: 'FÁ/SIB' },
    { value: 'LÁ', label: 'LÁ' },
    { value: 'MIB', label: 'MIB' },
    { value: 'SIB', label: 'SIB' },
  ];

  // DADOS TABELA
  camposColunas = [
    'nomeAluno',
    'dataNascimentoExibicao',
    'nomeComum',
    'nomeInstrumento',
    'afinacao',
  ];

  tituloColunas = {
    nomeAluno: 'Aluno',
    dataNascimentoExibicao: 'Data Nascimento',
    nomeComum: 'Comum',
    nomeInstrumento: 'Instrumento',
    afinacao: 'Afinação',
  };

  dados: any[] = [];
  dadosParaEditar: any | null = null;

  alinhamentoColunaTitulo: { [coluna: string]: 'left' | 'center' | 'right' } = {
    nomeAluno: 'center',
    dataNascimentoExibicao: 'center',
    nomeComum: 'center',
    nomeInstrumento: 'center',
    afinacao: 'center',
  };

  alinhamentoColuna: { [coluna: string]: 'left' | 'center' | 'right' } = {
    nomeAluno: 'left',
    dataNascimentoExibicao: 'center',
    nomeComum: 'left',
    nomeInstrumento: 'left',
    afinacao: 'center',
  };

  tamanhoColunas = {
    nomeAluno: { width: '45%' },
    dataNascimentoExibicao: { width: '15%' },
    nomeComum: { width: '20%' },
    nomeInstrumento: { width: '20%' },
    afinacao: { width: '20%' },
  };

  // Buttons
  acoes = [
    {
      label: '✏️',
      descricao: 'Editar',
      classe: 'acao-editar',
      visivel: (item: any) => this.liberaEditar,
      callback: (item: any) => this.editar(item),
    },
    {
      label: '🗑️',
      descricao: 'Excluir',
      classe: 'acao-excluir',
      visivel: (item: any) => this.liberaDeletar,
      callback: (item: any) => this.excluir(item),
    },
  ];
  //

  //Fim

  dadosForms: FormGroup;

  permissao(tipo: keyof PermissoesCRUD): boolean {
    return this.auth.temPermissao('candidatos', tipo);
  }

  usuarioEhAdmin(): boolean {
    return this.auth.usuario?.perfil === 'admin';
  }

  // ngOnInit(): void {
  //   this.firestoreService.getSetor().subscribe((setores) => {
  //     this.listaSetor = setores
  //       .map((s) => ({
  //         value: s.id!,
  //         label: s.nomeSetor,
  //       }))
  //       .sort((a, b) => a.label.localeCompare(b.label));
  //   });
  //   this.escutarMudancaSetor();
  //   this.firestoreService.getIgrejas().subscribe((lista: Igrejas[]) => {
  //     const usuario = this.auth.usuario;

  //     // ADMIN
  //     if (usuario?.perfil === 'admin') {
  //       this.listaIgrejaTodas = lista.map((l) => ({
  //         value: l.id!,
  //         label: l.nomeCongregacao?.toUpperCase() || '',
  //         idSetor: l.idSetor,
  //       }));

  //       // começa vazio até selecionar setor
  //       this.listaIgreja = [];

  //       return;
  //     }

  //     // DEMAIS PERFIS
  //     const igrejasFiltradas = lista.filter((igreja) =>
  //       this.auth.temAcessoAoRegistro({
  //         idSetor: igreja.idSetor,
  //         idComum: igreja.id,
  //       }),
  //     );

  //     this.listaIgreja = igrejasFiltradas.map((l) => ({
  //       value: l.id!,
  //       label: l.nomeCongregacao?.toUpperCase() || '',
  //       idSetor: l.idSetor,
  //     }));
  //   });
  //   this.firestoreService
  //     .getInstrumento()
  //     .subscribe((lista: Instrumentos[]) => {
  //       // this.listaLinks = lista;
  //       this.listaInstrumento = lista.map((l) => ({
  //         value: l.id!,
  //         label: l.nomeInstrumento?.toUpperCase() || '',
  //       }));
  //     });

  //   this.carregarDados();
  // }

  ngOnInit(): void {
    const usuario = this.auth.usuario;

    // SOMENTE ADMIN
    if (usuario?.perfil === 'admin') {
      this.firestoreService.getSetor().subscribe((setores) => {
        this.listaSetor = setores
          .map((s) => ({
            value: s.id!,
            label: s.nomeSetor,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
      });

      this.escutarMudancaSetor();
    }

    this.firestoreService.getIgrejas().subscribe((lista: Igrejas[]) => {
      // ADMIN
      if (usuario?.perfil === 'admin') {
        this.listaIgrejaTodas = lista.map((l) => ({
          value: l.id!,
          label: l.nomeCongregacao?.toUpperCase() || '',
          idSetor: l.idSetor,
        }));
        this.listaIgreja = [];

        return;
      }

      // DEMAIS PERFIS
      const igrejasFiltradas = lista.filter((igreja) =>
        this.auth.temAcessoAoRegistro({
          idSetor: igreja.idSetor,
          idComum: igreja.id,
        }),
      );
      this.listaIgreja = igrejasFiltradas.map((l) => ({
        value: l.id!,
        label: l.nomeCongregacao?.toUpperCase() || '',
        idSetor: l.idSetor,
      }));
    });

    this.firestoreService
      .getInstrumento()
      .subscribe((lista: Instrumentos[]) => {
        this.listaInstrumento = lista
          .sort((a, b) =>
            (a.nomeInstrumento || '').localeCompare(
              b.nomeInstrumento || '',
              'pt-BR',
              { sensitivity: 'base' },
            ),
          )
          .map((l) => ({
            value: l.id!,
            label: l.nomeInstrumento?.toUpperCase() || '',
          }));
      });

    this.carregarDados();
    this.liberaEditar = this.permissao('update');
    this.liberaCriar = this.permissao('create');
    this.liberaDeletar = this.permissao('delete');

    this.escutarMudancaIgreja();
  }

  getControl(controlName: string): FormControl {
    const control = this.dadosForms.get(controlName);
    if (!control) {
      throw new Error(`FormControl '${controlName}' não existe no FormGroup`);
    }
    return control as FormControl;
  }

  escutarMudancaSetor(): void {
    this.getControl('idSetor').valueChanges.subscribe((idSetor) => {
      if (this.auth.usuario?.perfil !== 'admin') return;

      this.listaIgreja = this.listaIgrejaTodas
        .filter((i) => i.idSetor === idSetor)
        .sort((a, b) => a.label.localeCompare(b.label));

      this.dadosForms.patchValue(
        {
          idComum: '',
        },
        { emitEvent: false },
      );
    });
  }

  escutarMudancaIgreja(): void {
    this.getControl('idComum').valueChanges.subscribe((idIgreja) => {
      if (this.auth.usuario?.perfil === 'admin') return;

      const igrejaSelecionada = this.listaIgreja.find(
        (i) => i.value === idIgreja,
      );
      if (igrejaSelecionada) {
        // Vincula o idSetor da igreja diretamente no formulário do aluno
        this.dadosForms.patchValue({
          idSetor: igrejaSelecionada.idSetor,
        });
      }
    });
  }

  // carregarDadosOFF(): void {
  //   this.firestoreService.getCandidato().subscribe((date) => {
  //     const dateOrdenados = date.sort((a, b) => {
  //       const nomeA = a.nomeAluno?.toLowerCase() || '';
  //       const nomeB = b.nomeAluno?.toLowerCase() || '';
  //       return nomeA.localeCompare(nomeB);
  //     });

  //     this.dados = [...dateOrdenados]; // 🔁 Cria nova referência
  //     console.log('Dados carregados: ', this.dados);
  //   });
  // }

  carregarDados(): void {
    combineLatest([
      this.firestoreService.getCandidato(),
      this.firestoreService.getIgrejas(),
      this.firestoreService.getInstrumento(),
    ]).subscribe(([candidato, igrejas, instrumento]) => {
      const dadosCandidatos = candidato
        .filter((c) => this.auth.podeVerRegistro(c, 'candidatos'))
        .map((c) => {
          const igrejaFiltro = igrejas.find((s) => s.id === c.idComum);

          const InstrumentoFiltro = instrumento.find(
            (i) => i.id === c.idInstrumento,
          );

          return {
            ...c,
            nomeAluno: c.nomeAluno?.toLocaleUpperCase('pt-BR') || '',
            dataNascimento: c.dataNascimento || '',
            dataNascimentoExibicao: `${converterISOParaBR(c.dataNascimento || '')} (${this.calcularIdade(c.dataNascimento)} anos)`,
            nomeComum:
              igrejaFiltro?.nomeCongregacao?.toLocaleUpperCase('pt-BR') ||
              'NÃO CADASTRADO',
            nomeInstrumento:
              InstrumentoFiltro?.nomeInstrumento?.toLocaleUpperCase('pt-BR') ||
              'SEM INSTRUMENTO',
          };
        });

      // Ordenar se necessário
      this.dados = [...dadosCandidatos].sort((a, b) =>
        (a.nomeAluno || '').localeCompare(b.nomeAluno || ''),
      );
    });
  }

  async onSalvar(): Promise<void> {
    if (!this.dadosForms.valid) {
      this.dadosForms.markAllAsTouched();
      // alert('Formulário inválido. Preencha os campos obrigatórios.');
      this.alertService.erro('Formulário inválido. Preencha os campos obrigatórios.');
      return;
    }

    const igrejaSelecionada = this.listaIgreja.find(
      (i) => i.value === this.dadosForms.value.idComum,
    );

    if (!igrejaSelecionada) {
      // alert('Comum inválida.');
      this.alertService.erro('Comum inválida.');
      return;
    }

    const date = formatarDataString(
      new Date(this.dadosForms.value.dataNascimento),
    );

    // const baseData = {
    //   ...this.dadosForms.value,
    //   nomeAluno:
    //     this.dadosForms.value.nomeAluno?.toLocaleUpperCase('pt-BR') || '',
    //   afinacao:
    //     this.dadosForms.value.afinacao?.toLocaleUpperCase('pt-BR') || '',
    //   dataNascimento: date,
    // };

    const baseData = {
      ...this.dadosForms.value,
      nomeAluno: upper(this.dadosForms.value.nomeAluno),
      idSetor: igrejaSelecionada.idSetor,
      afinacao: upper(this.dadosForms.value.afinacao),
      vozAlternativa: upper(this.dadosForms.value.vozAlternativa),
      dataNascimento: date,
    };

    const mensagem = this.dadosParaEditar
      ? `Deseja realmente alterar ${this.dadosParaEditar.nomeAluno}?`
      : `Deseja realmente salvar ${baseData.nomeAluno}?`;
    // console.log(baseData);
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
        .updateCandidato(this.dadosParaEditar.id!, baseData)
        .then(() => {
          this.snackBar.open(
            `${baseData.nomeAluno} alterado com sucesso!`,
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

      this.firestoreService.addCandidato(baseData).then(() => {
        this.snackBar.open(
          `${baseData.nomeAluno} salvo com sucesso!`,
          'Fechar',
          {
            duration: 4000,
          },
        );
        this.fecharModal();
      });
    }
  }

  calcularIdade(data: string): number {
    if (!data) return 0;

    const hoje = new Date();
    const nascimento = new Date(data);

    let idade = hoje.getFullYear() - nascimento.getFullYear();

    const mes = hoje.getMonth() - nascimento.getMonth();

    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }

    return idade;
  }

  buttonClick(): void {
    this.title = 'Cadastro Alunos';
    this.mostrarModal = true;
  }

  editar(select: Candidatos): void {
    this.title = 'Editar Instrumentos';
    this.mostrarModal = true;
    this.dadosParaEditar = { ...select };
    this.dadosForms.patchValue({
      nomeAluno: select.nomeAluno || '',
      dataNascimento: select.dataNascimento || '',
      idSetor: select.idSetor || '',
      idComum: select.idComum || '',
      idInstrumento: select.idInstrumento || '',
      afinacao: select.afinacao || '',
    });
    if (this.auth.usuario?.perfil === 'admin') {
      this.listaIgreja = this.listaIgrejaTodas.filter(
        (i) => i.idSetor === select.idSetor,
      );
    }
    // console.log(this.dadosParaEditar);
  }

  async excluir(dados: Candidatos): Promise<void> {
    const confirmacao = confirm(
      `Tems certeza que deseja excluir "${dados.nomeAluno}"?`,
    );
    if (!confirmacao) {
      return;
    }

    if (dados.id) {
      try {
        await this.firestoreService.deleteCandidato(dados.id).then(() => {
          this.snackBar.open(
            `${dados.nomeAluno} deletado com sucesso!`,
            'Fechar',
            {
              duration: 4000,
            },
          );
        });
        // console.log('Cliente excluído:', dados);
        this.carregarDados();
      } catch (error) {
        console.error(`Erro ao excluir: "${dados.nomeAluno}" `, error);
      }
    }
  }

  fecharModal() {
    this.mostrarModal = false;
    this.dadosForms.reset();
  }
}
