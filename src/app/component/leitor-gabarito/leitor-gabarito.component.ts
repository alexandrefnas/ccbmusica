import {
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

export type Alternativa = 'A' | 'B' | 'C' | 'D';

export type StatusLeitura = 'marcada' | 'em-branco' | 'multipla' | 'duvidosa';

export interface RespostaLida {
  questao: number;
  resposta: Alternativa | null;
  status: StatusLeitura;

  preenchimentos: Record<Alternativa, number>;
}

interface CoordenadaBolha {
  questao: number;
  alternativa: Alternativa;
  x: number;
  y: number;
  raio: number;
}

@Component({
  selector: 'tcx-leitor-gabarito',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leitor-gabarito.component.html',
  styleUrl: './leitor-gabarito.component.css',
})
export class LeitorGabaritoComponent implements OnInit, OnDestroy {
  @Output() leituraConcluida = new EventEmitter<RespostaLida[]>();

  @ViewChild('videoCamera')
  private videoRef!: ElementRef<HTMLVideoElement>;

  @ViewChild('canvasCaptura')
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  @ViewChild('canvasProcessado')
  private canvasProcessadoRef!: ElementRef<HTMLCanvasElement>;

  private readonly isBrowser: boolean;
  private stream: MediaStream | null = null;

  private cv: any = null;

  private carregamentoOpenCv: Promise<void> | null = null;

  carregandoOpenCv = true;
  cameraAtiva = false;
  processando = false;
  mensagem = 'Carregando leitor...';

  respostas: RespostaLida[] = [];

  /**
   * Tamanho padrão para o qual toda foto será transformada.
   *
   * A proporção é aproximadamente a proporção de uma folha A4.
   */
  private readonly larguraPadrao = 1000;
  private readonly alturaPadrao = 1414;

  /**
   * Estes valores serão calibrados usando o PDF original.
   *
   * x e y são posições dentro da imagem já corrigida para
   * 1000 × 1414 pixels.
   */
  private coordenadasBolhas: CoordenadaBolha[] = [];

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.coordenadasBolhas = this.gerarCoordenadasIniciais();
  }

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    void this.inicializarOpenCv();
  }

  private async inicializarOpenCv(): Promise<void> {
    try {
      await this.carregarOpenCv();
    } catch (erro) {
      console.error('Erro ao carregar o OpenCV:', erro);

      this.mensagem =
        erro instanceof Error
          ? erro.message
          : 'Não foi possível inicializar o leitor de gabarito.';
    }
  }

  // async ngAfterViewInit(): Promise<void> {
  //   if (!this.isBrowser) {
  //     return;
  //   }

  //   try {
  //     await this.carregarOpenCv();
  //   } catch (erro) {
  //     console.error('Erro ao carregar o OpenCV:', erro);

  //     this.mensagem = 'Não foi possível inicializar o leitor de gabarito.';
  //   }
  // }

  ngOnDestroy(): void {
    this.pararCamera();
  }

  async iniciarCamera(): Promise<void> {
    console.log('Botão abrir câmera acionado');

    if (!this.isBrowser) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      this.mensagem = 'Este navegador não oferece suporte à câmera.';
      return;
    }

    try {
      this.pararCamera();

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: {
            ideal: 'environment',
          },
          width: {
            ideal: 1920,
          },
          height: {
            ideal: 1080,
          },
        },
      });

      const video = this.videoRef.nativeElement;
      video.srcObject = this.stream;

      await video.play();

      this.cameraAtiva = true;
      this.mensagem = 'Posicione o gabarito dentro da moldura.';
    } catch (erro) {
      console.error('Erro ao acessar a câmera:', erro);

      this.cameraAtiva = false;
      this.mensagem =
        'Não foi possível acessar a câmera. Verifique a permissão do navegador.';
    }
  }

  pararCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.cameraAtiva = false;
  }

async capturarEProcessar(): Promise<void> {
  console.log('Botão capturar acionado', {
    cameraAtiva: this.cameraAtiva,
    processando: this.processando,
    cvPronto: Boolean(this.cv?.Mat),
  });

  if (
    !this.cameraAtiva ||
    this.processando
  ) {
    return;
  }

  try {
    await this.carregarOpenCv();
  } catch (erro) {
    console.error(erro);
    this.mensagem =
      'O OpenCV não está disponível.';
    return;
  }

  this.processando = true;
  this.mensagem =
    'Analisando gabarito...';

  let imagemCorrigida: any = null;
  let imagemDebug: any = null;

  try {
    this.capturarFrame();

    imagemCorrigida =
      this.prepararImagem();

    imagemDebug =
      imagemCorrigida.clone();

    this.desenharAreasLeitura(
      imagemDebug,
    );

    this.respostas =
      this.lerRespostas(
        imagemCorrigida,
      );

    this.leituraConcluida.emit(
      this.respostas,
    );

    this.cv.imshow(
      this.canvasProcessadoRef.nativeElement,
      imagemDebug,
    );

    this.mensagem =
      'Leitura concluída.';
  } catch (erro) {
    console.error(
      'Erro ao processar gabarito:',
      erro,
    );

    this.mensagem =
      erro instanceof Error
        ? erro.message
        : 'Não foi possível processar o gabarito.';
  } finally {
    imagemDebug?.delete();
    imagemCorrigida?.delete();

    this.processando = false;
  }
}

  async carregarImagem(event: Event): Promise<void> {
    console.log('Arquivo selecionado');

    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    if (!arquivo) {
      return;
    }

    try {
      await this.carregarOpenCv();
    } catch (erro) {
      console.error(erro);

      this.mensagem = 'O leitor ainda não está disponível.';

      input.value = '';
      return;
    }

    const imagem = new Image();
    const url = URL.createObjectURL(arquivo);

    imagem.onload = async () => {
      try {
        const canvas = this.canvasRef.nativeElement;

        canvas.width = imagem.naturalWidth;
        canvas.height = imagem.naturalHeight;

        const contexto = canvas.getContext('2d');

        if (!contexto) {
          throw new Error('Não foi possível abrir a imagem.');
        }

        contexto.drawImage(imagem, 0, 0);

        await this.processarCanvas();
      } finally {
        URL.revokeObjectURL(url);
        input.value = '';
      }
    };

    imagem.onerror = () => {
      URL.revokeObjectURL(url);
      this.mensagem = 'Não foi possível carregar a imagem.';
    };

    imagem.src = url;
  }

private async processarCanvas(): Promise<void> {
  this.processando = true;
  this.mensagem = 'Analisando imagem...';

  let imagemCorrigida: any = null;
  let imagemDebug: any = null;

  try {
    imagemCorrigida = this.prepararImagem();
    imagemDebug = imagemCorrigida.clone();

    this.desenharAreasLeitura(imagemDebug);

    this.respostas =
      this.lerRespostas(imagemCorrigida);

    this.leituraConcluida.emit(
      this.respostas,
    );

    this.cv.imshow(
      this.canvasProcessadoRef.nativeElement,
      imagemDebug,
    );

    this.mensagem = 'Leitura concluída.';
  } catch (erro) {
    console.error(
      'Erro ao analisar imagem:',
      erro,
    );

    this.mensagem =
      erro instanceof Error
        ? erro.message
        : 'Erro ao analisar a imagem.';
  } finally {
    imagemDebug?.delete();
    imagemCorrigida?.delete();

    this.processando = false;
  }
}

  private desenharAreasLeitura(imagem: any): void {
    for (const bolha of this.coordenadasBolhas) {
      this.cv.circle(
        imagem,
        new this.cv.Point(Math.round(bolha.x), Math.round(bolha.y)),
        Math.round(bolha.raio * 0.48),
        new this.cv.Scalar(128),
        1,
      );
    }
  }

  private capturarFrame(): void {
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;

    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('A câmera ainda não está pronta.');
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const contexto = canvas.getContext('2d');

    if (!contexto) {
      throw new Error('Não foi possível capturar a imagem.');
    }

    contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
  }

  private prepararImagem(): any {
    const origem = this.cv.imread(this.canvasRef.nativeElement);

    const cinza = new this.cv.Mat();
    const binaria = new this.cv.Mat();
    const redimensionada = new this.cv.Mat();

    try {
      this.cv.cvtColor(origem, cinza, this.cv.COLOR_RGBA2GRAY);

      /**
       * No primeiro protótipo, redimensionamos diretamente.
       *
       * Depois, esta etapa será substituída pela detecção dos
       * quatro marcadores e correção de perspectiva.
       */
      // this.cv.resize(
      //   cinza,
      //   redimensionada,
      //   new this.cv.Size(this.larguraPadrao, this.alturaPadrao),
      //   0,
      //   0,
      //   this.cv.INTER_AREA,
      // );
      this.cv.resize(cinza, redimensionada, new this.cv.Size(1000, 1414));

      this.cv.GaussianBlur(
        redimensionada,
        redimensionada,
        new this.cv.Size(3, 3),
        0,
      );

      this.cv.adaptiveThreshold(
        redimensionada,
        binaria,
        255,
        this.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        this.cv.THRESH_BINARY_INV,
        31,
        12,
      );

      return binaria.clone();
    } finally {
      origem.delete();
      cinza.delete();
      binaria.delete();
      redimensionada.delete();
    }
  }

  private lerRespostas(imagemBinaria: any): RespostaLida[] {
    const resultado: RespostaLida[] = [];

    for (let questao = 1; questao <= 40; questao++) {
      const bolhasQuestao = this.coordenadasBolhas.filter(
        (item) => item.questao === questao,
      );

      const preenchimentos = {
        A: 0,
        B: 0,
        C: 0,
        D: 0,
      } satisfies Record<Alternativa, number>;

      for (const bolha of bolhasQuestao) {
        preenchimentos[bolha.alternativa] = this.calcularPreenchimento(
          imagemBinaria,
          bolha,
        );
      }

      resultado.push(this.classificarQuestao(questao, preenchimentos));
    }

    return resultado;
  }

  private calcularPreenchimento(imagem: any, bolha: CoordenadaBolha): number {
    const raioInterno = Math.max(Math.round(bolha.raio * 0.40), 3);

    const inicioX = Math.max(Math.round(bolha.x - raioInterno), 0);

    const inicioY = Math.max(Math.round(bolha.y - raioInterno), 0);

    const fimX = Math.min(Math.round(bolha.x + raioInterno), imagem.cols);

    const fimY = Math.min(Math.round(bolha.y + raioInterno), imagem.rows);

    const largura = fimX - inicioX;
    const altura = fimY - inicioY;

    if (largura <= 0 || altura <= 0) {
      return 0;
    }

    const area = imagem.roi(
      new this.cv.Rect(inicioX, inicioY, largura, altura),
    );

    const mascara = this.cv.Mat.zeros(altura, largura, this.cv.CV_8UC1);

    const areaMascarada = new this.cv.Mat();

    try {
      /*
       * Primeiro desenha o círculo.
       */
      this.cv.circle(
        mascara,
        new this.cv.Point(Math.round(largura / 2), Math.round(altura / 2)),
        raioInterno,
        new this.cv.Scalar(255),
        -1,
      );

      /*
       * Depois aplica a máscara.
       */
      this.cv.bitwise_and(area, area, areaMascarada, mascara);

      const pixelsMarcados = this.cv.countNonZero(areaMascarada);

      const pixelsPossiveis = Math.PI * raioInterno * raioInterno;

      return Number((pixelsMarcados / pixelsPossiveis).toFixed(4));
    } finally {
      area.delete();
      mascara.delete();
      areaMascarada.delete();
    }
  }

private classificarQuestao(
  questao: number,
  preenchimentos: Record<Alternativa, number>,
): RespostaLida {
  const ordenadas = (
    Object.entries(preenchimentos) as [
      Alternativa,
      number,
    ][]
  ).sort((a, b) => b[1] - a[1]);

  const [primeira, segunda] = ordenadas;

  const maiorValor = primeira[1];
  const segundoValor = segunda[1];
  const diferenca = maiorValor - segundoValor;

  /*
   * Pelas leituras atuais:
   *
   * bolhas vazias: aproximadamente 0.19 até 0.38
   * bolhas marcadas: aproximadamente 0.74 até 0.86
   */
  const preenchimentoMinimo = 0.55;

  /*
   * Duas alternativas só serão consideradas realmente marcadas
   * quando ambas tiverem preenchimento alto.
   */
  const preenchimentoMultiplo = 0.55;

  /*
   * Diferença mínima para considerar uma alternativa predominante.
   */
  const diferencaMarcada = 0.15;

  /*
   * Duas bolhas com valores altos e próximos indicam marcação dupla.
   */
  const diferencaMultipla = 0.12;

  /*
   * Nenhuma bolha possui preenchimento suficiente.
   */
  if (maiorValor < preenchimentoMinimo) {
    return {
      questao,
      resposta: null,
      status: 'em-branco',
      preenchimentos,
    };
  }

  /*
   * Duas alternativas realmente preenchidas.
   */
  if (
    maiorValor >= preenchimentoMultiplo &&
    segundoValor >= preenchimentoMultiplo &&
    diferenca < diferencaMultipla
  ) {
    return {
      questao,
      resposta: null,
      status: 'multipla',
      preenchimentos,
    };
  }

  /*
   * Existe preenchimento alto, mas não há diferença suficiente
   * entre a primeira e a segunda.
   */
  if (diferenca < diferencaMarcada) {
    return {
      questao,
      resposta: primeira[0],
      status: 'duvidosa',
      preenchimentos,
    };
  }

  return {
    questao,
    resposta: primeira[0],
    status: 'marcada',
    preenchimentos,
  };
}
  /**
   * Coordenadas aproximadas do modelo atual.
   *
   * Elas deverão ser calibradas depois que a correção de
   * perspectiva estiver pronta.
   */
  private gerarCoordenadasIniciais(): CoordenadaBolha[] {
    const coordenadas: CoordenadaBolha[] = [];

    const alternativas: Alternativa[] = ['A', 'B', 'C', 'D'];

    const colunaEsquerdaX = [156, 214, 272, 332];

    const colunaDireitaX = [548, 604, 662, 720];

    const primeiraLinhaY = 478;
    const distanciaVertical = 40.7;
    const raio = 15;

    for (let questao = 1; questao <= 20; questao++) {
      const y = primeiraLinhaY + (questao - 1) * distanciaVertical;

      alternativas.forEach((alternativa, indice) => {
        coordenadas.push({
          questao,
          alternativa,
          x: colunaEsquerdaX[indice],
          y,
          raio,
        });
      });
    }

    for (let questao = 21; questao <= 40; questao++) {
      const y = primeiraLinhaY + (questao - 21) * distanciaVertical;

      alternativas.forEach((alternativa, indice) => {
        coordenadas.push({
          questao,
          alternativa,
          x: colunaDireitaX[indice],
          y,
          raio,
        });
      });
    }

    return coordenadas;
  }

  private carregarOpenCv(): Promise<void> {
    if (!this.isBrowser) {
      return Promise.reject(
        new Error('O OpenCV só pode ser carregado no navegador.'),
      );
    }

    if (this.cv?.Mat) {
      return Promise.resolve();
    }

    if (this.carregamentoOpenCv) {
      return this.carregamentoOpenCv;
    }

    this.carregandoOpenCv = true;

    this.carregamentoOpenCv = new Promise<void>((resolve, reject) => {
      let finalizado = false;
      let intervalo: number | null = null;

      const timeout = window.setTimeout(() => {
        falhar('Tempo excedido ao inicializar o OpenCV.');
      }, 60_000);

      const limparVerificacoes = (): void => {
        if (intervalo !== null) {
          window.clearInterval(intervalo);
          intervalo = null;
        }

        window.clearTimeout(timeout);
      };

      const concluir = (): void => {
        if (finalizado) {
          return;
        }

        const instanciaCv = (globalThis as any).cv;

        if (!instanciaCv?.Mat) {
          return;
        }

        finalizado = true;
        limparVerificacoes();

        this.cv = instanciaCv;
        this.carregandoOpenCv = false;
        this.mensagem = 'Leitor pronto.';

        console.log('OpenCV inicializado com sucesso.');

        /*
         * Não passe instanciaCv no resolve.
         * O objeto cv possui um método then próprio.
         */
        resolve();
      };

      const falhar = (mensagem: string): void => {
        if (finalizado) {
          return;
        }

        finalizado = true;
        limparVerificacoes();

        this.carregamentoOpenCv = null;
        this.carregandoOpenCv = false;
        this.mensagem = mensagem;

        reject(new Error(mensagem));
      };

      /*
       * Como falhar() é uma function normal, precisamos manter
       * o contexto do componente.
       */
      // falhar = falhar.bind(this);

      const iniciarVerificacao = (): void => {
        concluir();

        if (finalizado) {
          return;
        }

        intervalo = window.setInterval(() => {
          concluir();
        }, 100);
      };

      const cvExistente = (globalThis as any).cv;

      if (cvExistente) {
        const callbackAnterior = cvExistente.onRuntimeInitialized;

        cvExistente.onRuntimeInitialized = () => {
          if (typeof callbackAnterior === 'function') {
            callbackAnterior();
          }

          concluir();
        };

        iniciarVerificacao();
        return;
      }

      const scriptExistente = document.querySelector<HTMLScriptElement>(
        'script[data-opencv-loader="true"]',
      );

      if (scriptExistente) {
        scriptExistente.remove();
      }

      const script = document.createElement('script');

      script.dataset['opencvLoader'] = 'true';

      script.src = new URL('opencv/opencv.js', document.baseURI).href;

      script.async = true;

      script.onload = () => {
        console.log(`Arquivo OpenCV carregado: ${script.src}`);

        const instanciaCv = (globalThis as any).cv;

        if (!instanciaCv) {
          falhar('O arquivo foi carregado, mas window.cv não foi criado.');
          return;
        }

        const callbackAnterior = instanciaCv.onRuntimeInitialized;

        instanciaCv.onRuntimeInitialized = () => {
          if (typeof callbackAnterior === 'function') {
            callbackAnterior();
          }

          concluir();
        };

        iniciarVerificacao();
      };

      script.onerror = () => {
        falhar(`Falha ao carregar o OpenCV em: ${script.src}`);
      };

      document.head.appendChild(script);
    });

    return this.carregamentoOpenCv;
  }
}
