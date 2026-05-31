import { Component } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FirestoreService,
  GrupoExames,
  Igrejas,
} from '../../../services/firestore.service';
import { AuthService, PermissoesCRUD } from '../../../services/auth.service';
import {
  confirmarAcao,
  formatarDataString,
} from '../../../../shared/shared.service';
import {
  listaPeriodo,
  listaPeriodoPratico,
  listaTipoExame,
  upper,
} from '../../../services/select.service';
import { ModalComponent } from '../../../modal/modal/modal.component';
import { SelectComponent } from '../../../component/inputs/select/select.component';
import { TextComponent } from '../../../component/inputs/text/text.component';
import { ButtonComponent } from '../../../component/button/button.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'tcx-semestres',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ModalComponent,
    SelectComponent,
    TextComponent,
    ButtonComponent,
  ],
  templateUrl: './semestres.component.html',
  styleUrl: './semestres.component.css',
})
export class SemestresComponent {
  constructor(
    private fb: FormBuilder,
    private firestoreService: FirestoreService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {
    this.dadosForms = this.fb.group({
      grupoExame: ['', Validators.required],
      descricao: ['', Validators.required],
      idSetor: [''],
      idComum: ['', Validators.required],
      tipoExame: ['', Validators.required],
      avaliacoes: this.fb.array([]),
      concluido: [false],
    });
  }

  dadosForms: FormGroup;
  dadosParaEditar: GrupoExames | null = null;
  mostrarModal: boolean = false;
  title: string = '';
  liberaCriar: boolean = false;

  listaTipoExame = listaTipoExame;
  listaPeriodo = listaPeriodo;
  listaPratico = listaPeriodoPratico;

  listaIgreja: { value: string; label: string; idSetor: string }[] = [];
  listaSetor: { value: string; label: string }[] = [];
  listaIgrejaTodas: { value: string; label: string; idSetor: string }[] = [];

  usuarioEhAdmin(): boolean {
    return this.auth.usuario?.perfil === 'admin';
  }

  permissao(tipo: keyof PermissoesCRUD): boolean {
    return this.auth.temPermissao('grupoExames', tipo);
  }

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

    // this.firestoreService
    //   .getInstrumento()
    //   .subscribe((lista: Instrumentos[]) => {
    //     this.listaInstrumento = lista
    //       .sort((a, b) =>
    //         (a.nomeInstrumento || '').localeCompare(
    //           b.nomeInstrumento || '',
    //           'pt-BR',
    //           { sensitivity: 'base' },
    //         ),
    //       )
    //       .map((l) => ({
    //         value: l.id!,
    //         label: l.nomeInstrumento?.toUpperCase() || '',
    //       }));
    //   });

    // this.carregarDados();
    // this.liberaEditar = this.permissao('update');
    this.liberaCriar = this.permissao('create');
    // this.liberaDeletar = this.permissao('delete');

    this.escutarMudancaIgreja();
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

  getControl(controlName: string): FormControl {
    const control = this.dadosForms.get(controlName);
    if (!control) {
      throw new Error(`FormControl '${controlName}' não existe no FormGroup`);
    }
    return control as FormControl;
  }

  getListaCategoriaExame() {
    const tipo = this.dadosForms.get('tipoExame')?.value;

    if (tipo === this.listaTipoExame[0].value) {
      return this.listaPeriodo;
    }

    if (tipo === this.listaTipoExame[1].value) {
      return this.listaPratico;
    }

    return [];
  }

  get avaliacoesArray(): FormArray {
    return this.dadosForms.get('avaliacoes') as FormArray;
  }

criarPeriodos(): any[] {
  const tipoExame = this.dadosForms.value.tipoExame;
  const avaliacoes = this.avaliacoesArray.value;

  if (tipoExame === '001') {
    return [
      {
        categoriaExame: '001',
        tipoExame: 'MSA',
        etapas: avaliacoes.map((item: any) => ({
          tipo: item.tipo,
          avaliacao: [
            {
              nome: 'PARTE TEÓRICA',
              ordem: 1,
              notaMinima: Number(item.teoricaNotaMinima),
              notaMaxima: Number(item.teoricaNotaMaxima),
              bloqueadaInicialmente: false,
            },
            {
              nome: 'PARTE PRÁTICA',
              ordem: 2,
              notaMinima: Number(item.praticaNotaMinima),
              notaMaxima: Number(item.praticaNotaMaxima),
              bloqueadaInicialmente: true,
            },
          ],
        })),
      },
    ];
  }

  if (tipoExame === '002') {
    return [
      {
        categoriaExame: '002',
        tipoExame: 'PRÁTICO',
        etapas: avaliacoes.map((item: any) => ({
          tipo: item.tipo,
          avaliacao: [
            {
              nome: 'PARTE PRÁTICA',
              ordem: 1,
              notaMinima: Number(item.praticaNotaMinima),
              notaMaxima: Number(item.praticaNotaMaxima),
              bloqueadaInicialmente: false,
            },
          ],
        })),
      },
    ];
  }

  return [];
}

  onTipoExameChange(): void {
    this.avaliacoesArray.clear();

    const tipoExame = this.dadosForms.get('tipoExame')?.value;

    if (tipoExame === '001') {
      this.listaPeriodo.forEach((periodo) => {
        this.avaliacoesArray.push(
          this.fb.group({
            tipo: [periodo.value],
            label: [periodo.label],

            teoricaNotaMinima: [null, Validators.required],
            teoricaNotaMaxima: [null, Validators.required],

            praticaNotaMinima: [null, Validators.required],
            praticaNotaMaxima: [null, Validators.required],
          }),
        );
      });
    }

    if (tipoExame === '002') {
      this.listaPratico.forEach((periodo) => {
        this.avaliacoesArray.push(
          this.fb.group({
            tipo: [periodo.value],
            label: [periodo.label],

            praticaNotaMinima: [null, Validators.required],
            praticaNotaMaxima: [null, Validators.required],
          }),
        );
      });
    }
  }

  buttonClick(): void {
    this.title = 'Criar Grupo de Avaliações';
    this.mostrarModal = true;
    this.dadosParaEditar = null;
    this.dadosForms.reset();
  }

  onSalvar(): void {
    if (!this.dadosForms.valid) {
      this.dadosForms.markAllAsTouched();
      alert('Formulário inválido. Preencha os campos obrigatórios.');
      return;
    }
    const usuarioLogado = this.auth.usuario;
    const nomeUsuario =
      typeof usuarioLogado === 'string'
        ? usuarioLogado
        : (usuarioLogado?.nome ?? 'Não identificado');

    const data = {
      grupoExame: upper(this.dadosForms.value.grupoExame),
      descricao: upper(this.dadosForms.value.descricao),
      idSetor: this.dadosForms.value.idSetor || '',
      idComum: this.dadosForms.value.idComum || '',
      tipoExame: this.dadosForms.value.tipoExame,
      categoriaExame: this.dadosForms.value.categoriaExame,
      concluido: this.dadosForms.value.concluido || false,
      criadoEm:
        this.dadosParaEditar?.criadoEm || formatarDataString(new Date()),
      usuarioCriador: nomeUsuario,
      periodos: this.criarPeriodos(),
    };

    const mensagem = this.dadosParaEditar
      ? `Deseja realmente alterar ${this.dadosParaEditar.grupoExame}?`
      : `Deseja realmente salvar ${data.grupoExame}?`;

    if (this.dadosParaEditar?.id) {
      // const alterado = Object.keys(data).some(
      //   (key) => data[key] !== this.dadosParaEditar[key],
      // );

      // if (!alterado) {
      //   this.snackBar.open('Nenhuma alteração detectada.', 'Fechar', {
      //     duration: 3000,
      //   });
      //   this.fecharModal();
      //   return;
      // }

      if (!confirmarAcao(mensagem)) return;

      this.firestoreService
        .updateSemestres(this.dadosParaEditar.id!, data)
        .then(() => {
          this.snackBar.open('Semestre alterado com sucesso!', 'Fechar', {
            duration: 4000,
          });
          this.fecharModal();
        });
    } else {
      this.firestoreService.addSemestres(data).then(() => {
        this.snackBar.open('Semestre cadastrado com sucesso!', 'Fechar', {
          duration: 4000,
        });
        this.fecharModal();
      });
    }
  }

  // editar(select: Semestres): void {
  //   this.title = 'Editar Instrumentos';
  //   this.mostrarModal = true;
  //   this.dadosParaEditar = { ...select };
  // }

  fecharModal() {
    this.mostrarModal = false;
    this.dadosForms.reset();
  }
}
