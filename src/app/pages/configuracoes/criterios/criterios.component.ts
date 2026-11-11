import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, firstValueFrom, of, startWith, switchMap, take } from 'rxjs';
import { AlertService } from '../../../services/alert.service';
import { AuthService, PermissoesCRUD } from '../../../services/auth.service';
import { Criterio, FirestoreService } from '../../../services/firestore.service';
import { listaTipoExame, upper } from '../../../services/select.service';
import { ModalComponent } from '../../../modal/modal/modal.component';
import { ButtonComponent } from '../../../component/button/button.component';
import { SelectComponent } from '../../../component/inputs/select/select.component';
import { TextComponent } from '../../../component/inputs/text/text.component';
import { TableComponent } from '../../../component/table/table.component';

type LinhaCriterio = Criterio & { tipoExameLabel: string };

@Component({
  selector: 'tcx-criterios',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalComponent,
    ButtonComponent,
    SelectComponent,
    TextComponent,
    TableComponent,
  ],
  templateUrl: './criterios.component.html',
  styleUrl: './criterios.component.css',
})
export class CriteriosComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  dados: LinhaCriterio[] = [];
  criterios: Criterio[] = [];
  dadosParaEditar: Criterio | null = null;
  title = 'Cadastro de Critérios';
  mostrarModal = false;
  salvando = false;
  liberaCriar = false;
  liberaEditar = false;
  liberaDeletar = false;
  ehAdmin = false;
  setorAtivo = '';
  listaSetores: { value: string; label: string }[] = [];
  readonly setorFiltro = new FormControl<string>('', { nonNullable: true });

  readonly listaTipoExame = listaTipoExame;
  readonly camposColunas = ['nomeCriterio', 'tipoExameLabel'];
  readonly tituloColunas = {
    nomeCriterio: 'Critério',
    tipoExameLabel: 'Tipo de exame',
  };
  readonly tamanhoColunas = {
    nomeCriterio: { width: '70%', minWidth: '230px' },
    tipoExameLabel: { width: '30%', minWidth: '140px' },
  };
  readonly alinhamentoColunaTitulo: Record<string, 'left' | 'center' | 'right'> = {
    nomeCriterio: 'left',
    tipoExameLabel: 'center',
  };
  readonly alinhamentoColuna: Record<string, 'left' | 'center' | 'right'> = {
    nomeCriterio: 'left',
    tipoExameLabel: 'center',
  };

  readonly acoes = [
    {
      label: '',
      descricao: 'Editar',
      classe: 'acao-editar bi bi-pencil',
      visivel: () => this.liberaEditar,
      callback: (item: Criterio) => this.editar(item),
    },
    {
      label: '',
      descricao: 'Excluir',
      classe: 'acao-excluir bi bi-trash3',
      visivel: () => this.liberaDeletar,
      callback: (item: Criterio) => void this.excluir(item),
    },
  ];

  readonly dadosForms: FormGroup;

  constructor(
    private fb: FormBuilder,
    private firestoreService: FirestoreService,
    private auth: AuthService,
    private alertService: AlertService,
  ) {
    this.dadosForms = this.fb.group({
      tipoExame: ['', Validators.required],
      nomeCriterio: ['', [Validators.required, Validators.maxLength(120)]],
    });
  }

  ngOnInit(): void {
    // A consulta somente ocorre após identificar o setor. Cada mudança cancela
    // a assinatura anterior para não misturar dados de dois setores na tela.
    this.setorFiltro.valueChanges.pipe(
      startWith(this.setorFiltro.value),
      distinctUntilChanged(),
      switchMap((idSetor) => {
        this.setorAtivo = idSetor || '';
        this.criterios = [];
        this.dados = [];
        if (this.mostrarModal && !this.salvando) this.fecharModal();
        return this.setorAtivo ? this.firestoreService.getCriterios(this.setorAtivo) : of([] as Criterio[]);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (lista) => {
        this.criterios = lista;
        this.dados = lista.map((item) => ({
          ...item,
          tipoExameLabel: this.listaTipoExame.find((tipo) => tipo.value === item.tipoExame)?.label ?? item.tipoExame,
        })).sort((a, b) =>
          a.tipoExameLabel.localeCompare(b.tipoExameLabel, 'pt-BR') ||
          a.nomeCriterio.localeCompare(b.nomeCriterio, 'pt-BR'),
        );
      },
      error: (erro) => {
        console.error('Erro ao buscar critérios do setor:', erro);
        this.alertService.erro('Não foi possível carregar os critérios deste setor.');
      },
    });

    this.auth.currentUserData$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((usuario) => {
      this.ehAdmin = usuario?.perfil === 'admin';
      this.liberaCriar = this.permissao('create');
      this.liberaEditar = this.permissao('update');
      this.liberaDeletar = this.permissao('delete');

      if (this.ehAdmin) {
        this.firestoreService.getSetor()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (setores) => {
              this.listaSetores = setores
                .filter((setor) => !!setor.id)
                .map((setor) => ({ value: setor.id!, label: setor.nomeSetor }))
                .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
            },
            error: () => this.alertService.erro('Não foi possível carregar os setores.'),
          });
        // O administrador seleciona explicitamente o setor, sem ver dados antes disso.
        if (this.setorFiltro.value && !this.listaSetores.some((s) => s.value === this.setorFiltro.value)) {
          this.setorFiltro.setValue('');
        }
      } else {
        // Regional/secretário e demais perfis ficam restritos ao setor do próprio usuário.
        this.setorFiltro.setValue(usuario?.idSetor || '');
      }
    });
  }

  get liberaAcoes(): boolean {
    return this.liberaEditar || this.liberaDeletar;
  }

  permissao(tipo: keyof PermissoesCRUD): boolean {
    return this.auth.temPermissao('criterios', tipo);
  }

  getControl(controlName: string): FormControl {
    const control = this.dadosForms.get(controlName);
    if (!control) throw new Error(`Controle inexistente: ${controlName}`);
    return control as FormControl;
  }

  novo(): void {
    if (!this.permissao('create') || !this.setorAtivo) return;
    this.dadosParaEditar = null;
    this.dadosForms.reset({ tipoExame: '', nomeCriterio: '' });
    this.title = 'Cadastrar Critério';
    this.mostrarModal = true;
  }

  editar(item: Criterio): void {
    if (!this.permissao('update') || !this.setorAtivo || item.idSetor !== this.setorAtivo) return;
    this.dadosParaEditar = { ...item };
    this.dadosForms.patchValue({
      tipoExame: item.tipoExame,
      nomeCriterio: item.nomeCriterio,
    });
    this.title = 'Editar Critério';
    this.mostrarModal = true;
  }

  fecharModal(): void {
    if (this.salvando) return;
    this.mostrarModal = false;
    this.dadosParaEditar = null;
    this.dadosForms.reset({ tipoExame: '', nomeCriterio: '' });
  }

  private normalizarNome(nome: string): string {
    return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  }

  private async criterioVinculado(id: string): Promise<boolean> {
    const grupos = await firstValueFrom(this.firestoreService.getSemestres().pipe(take(1)));
    return grupos.some((grupo) => (grupo.criteriosSelecionados ?? []).includes(id));
  }

  async onSalvar(): Promise<void> {
    const item = this.dadosParaEditar;
    if (!this.permissao(item ? 'update' : 'create') || this.salvando || !this.setorAtivo) return;

    const usuario = this.auth.usuario;
    const idSetor = this.setorAtivo;
    if (!this.ehAdmin && idSetor !== usuario?.idSetor) {
      this.alertService.erro('Setor incompatível com o usuário.');
      return;
    }
    if (item && item.idSetor !== idSetor) {
      this.alertService.erro('Não é permitido transferir critérios entre setores.');
      return;
    }

    const nomeCriterio = upper(String(this.dadosForms.value.nomeCriterio ?? '').trim().replace(/\s+/g, ' '));
    const tipoExame = String(this.dadosForms.value.tipoExame ?? '');

    if (!this.dadosForms.valid || !nomeCriterio || !this.listaTipoExame.some((tipo) => tipo.value === tipoExame)) {
      this.dadosForms.markAllAsTouched();
      this.alertService.aviso('Informe o nome e um tipo de exame válido.');
      return;
    }

    const duplicado = this.criterios.some((existente) =>
      existente.id !== item?.id && existente.idSetor === idSetor &&
      existente.tipoExame === tipoExame &&
      this.normalizarNome(existente.nomeCriterio) === this.normalizarNome(nomeCriterio),
    );
    if (duplicado) {
      this.alertService.aviso('Já existe um critério com esse nome para este setor e tipo de exame.');
      return;
    }

    if (item && item.tipoExame === tipoExame && item.nomeCriterio === nomeCriterio) {
      this.alertService.aviso('Nenhuma alteração identificada.');
      return;
    }

    this.salvando = true;
    try {
      if (item?.id && item.tipoExame !== tipoExame && await this.criterioVinculado(item.id)) {
        this.alertService.aviso('Este critério está vinculado a um grupo de avaliações. Não é possível alterar seu tipo de exame.');
        return;
      }

      const mensagem = item ? `Deseja alterar o critério "${item.nomeCriterio}"?` : `Deseja cadastrar o critério "${nomeCriterio}" neste setor?`;
      if (!(await this.alertService.confirmar(mensagem))) return;
      if (this.setorAtivo !== idSetor) return;

      if (item?.id) {
        await this.firestoreService.updateCriterio(item.id, { nomeCriterio, tipoExame });
        this.alertService.sucesso('Critério atualizado com sucesso.');
      } else {
        await this.firestoreService.addCriterio({ idSetor, nomeCriterio, tipoExame });
        this.alertService.sucesso('Critério cadastrado com sucesso.');
      }
      this.mostrarModal = false;
      this.dadosParaEditar = null;
      this.dadosForms.reset({ tipoExame: '', nomeCriterio: '' });
    } catch (error) {
      console.error('Erro ao salvar critério:', error);
      this.alertService.erro('Não foi possível salvar o critério. Confira as permissões do Firestore.');
    } finally {
      this.salvando = false;
    }
  }

  async excluir(item: Criterio): Promise<void> {
    if (!item.id || !this.permissao('delete') || this.salvando || !this.setorAtivo || item.idSetor !== this.setorAtivo) return;
    this.salvando = true;
    try {
      if (await this.criterioVinculado(item.id)) {
        this.alertService.aviso('Não é possível excluir: critério utilizado por um grupo de avaliações.');
        return;
      }
      if (!(await this.alertService.confirmar(`Deseja excluir o critério "${item.nomeCriterio}"?`))) return;
      if (this.setorAtivo !== item.idSetor) return;
      if (await this.criterioVinculado(item.id)) {
        this.alertService.aviso('Exclusão cancelada: o critério passou a ser utilizado por um grupo.');
        return;
      }
      await this.firestoreService.deleteCriterio(item.id);
      this.alertService.sucesso('Critério excluído com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir critério:', error);
      this.alertService.erro('Não foi possível verificar ou excluir o critério. Confira as permissões do Firestore.');
    } finally {
      this.salvando = false;
    }
  }
}
