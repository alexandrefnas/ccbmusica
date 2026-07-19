import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  OnDestroy,
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
export class LeitorGabaritoComponent implements AfterViewInit, OnDestroy {
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

  private carregamentoOpenCv: Promise<any> | null = null;

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

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }

    try {
      await this.carregarOpenCv();
    } catch (erro) {
      console.error('Erro ao carregar o OpenCV:', erro);

      this.mensagem = 'Não foi possível inicializar o leitor de gabarito.';
    }
  }

  ngOnDestroy(): void {
    this.pararCamera();
  }

  async iniciarCamera(): Promise<void> {
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
    if (!this.cameraAtiva || this.processando) {
      return;
    }


  try {
    await this.carregarOpenCv();
  } catch (erro) {
    console.error(erro);
    this.mensagem = 'O OpenCV não está disponível.';
    return;
  }

    this.processando = true;
    this.mensagem = 'Analisando gabarito...';

    try {
      this.capturarFrame();

      const imagemCorrigida = this.prepararImagem();

      try {
        this.respostas = this.lerRespostas(imagemCorrigida);
        this.leituraConcluida.emit(this.respostas);

        this.cv.imshow(this.canvasProcessadoRef.nativeElement, imagemCorrigida);
      } finally {
        imagemCorrigida.delete();
      }

      this.mensagem = 'Leitura concluída.';
    } catch (erro) {
      console.error('Erro ao processar gabarito:', erro);

      this.mensagem =
        erro instanceof Error
          ? erro.message
          : 'Não foi possível processar o gabarito.';
    } finally {
      this.processando = false;
    }
  }

  async carregarImagem(event: Event): Promise<void> {
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

    try {
      const imagemCorrigida = this.prepararImagem();

      try {
        this.respostas = this.lerRespostas(imagemCorrigida);
        this.leituraConcluida.emit(this.respostas);
        this.cv.imshow(this.canvasProcessadoRef.nativeElement, imagemCorrigida);
      } finally {
        imagemCorrigida.delete();
      }

      this.mensagem = 'Leitura concluída.';
    } catch (erro) {
      console.error(erro);

      this.mensagem =
        erro instanceof Error ? erro.message : 'Erro ao analisar a imagem.';
    } finally {
      this.processando = false;
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
      this.cv.resize(
        cinza,
        redimensionada,
        new this.cv.Size(this.larguraPadrao, this.alturaPadrao),
        0,
        0,
        this.cv.INTER_AREA,
      );

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
    const raioInterno = Math.max(Math.round(bolha.raio * 0.58), 3);

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

    const areaMascarada = this.aplicarMascara(area, mascara);
    try {
      this.cv.circle(
        mascara,
        new this.cv.Point(Math.round(largura / 2), Math.round(altura / 2)),
        raioInterno,
        new this.cv.Scalar(255),
        -1,
      );

      const pixelsMarcados = this.cv.countNonZero(areaMascarada);

      const pixelsPossiveis = Math.PI * raioInterno * raioInterno;

      return Number((pixelsMarcados / pixelsPossiveis).toFixed(4));
    } finally {
      // area.delete();
      // mascara.delete();
      areaMascarada.delete();
    }
  }

  private aplicarMascara(area: any, mascara: any): any {
    const resultado = new this.cv.Mat();

    this.cv.bitwise_and(area, area, resultado, mascara);

    return resultado;
  }

  private classificarQuestao(
    questao: number,
    preenchimentos: Record<Alternativa, number>,
  ): RespostaLida {
    const ordenadas = (
      Object.entries(preenchimentos) as [Alternativa, number][]
    ).sort((a, b) => b[1] - a[1]);

    const primeira = ordenadas[0];
    const segunda = ordenadas[1];

    const limiteMarcada = 0.24;
    const limiteMultipla = 0.2;
    const diferencaMinima = 0.07;

    if (primeira[1] < limiteMarcada) {
      return {
        questao,
        resposta: null,
        status: 'em-branco',
        preenchimentos,
      };
    }

    if (
      segunda[1] >= limiteMultipla &&
      primeira[1] - segunda[1] < diferencaMinima
    ) {
      return {
        questao,
        resposta: null,
        status: 'multipla',
        preenchimentos,
      };
    }

    if (primeira[1] - segunda[1] < diferencaMinima) {
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

    const colunaEsquerdaX = [142, 203, 264, 325];

    const colunaDireitaX = [544, 606, 666, 727];

    const primeiraLinhaY = 475;
    const distanciaVertical = 42.1;
    const raio = 16;

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

private carregarOpenCv(): Promise<any> {
  if (!this.isBrowser) {
    return Promise.reject(
      new Error('O OpenCV só pode ser carregado no navegador.'),
    );
  }

  if (this.cv?.Mat) {
    return Promise.resolve(this.cv);
  }

  if (this.carregamentoOpenCv) {
    return this.carregamentoOpenCv;
  }

  this.carregandoOpenCv = true;
  this.mensagem = 'Carregando OpenCV...';

  this.carregamentoOpenCv = new Promise<any>((resolve, reject) => {
    let finalizado = false;
    let intervalo: number | null = null;

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

      resolve(instanciaCv);
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

    const timeout = window.setTimeout(() => {
      falhar(
        'Tempo excedido ao inicializar o OpenCV.',
      );
    }, 60_000);

    /*
     * Verifica periodicamente se cv.Mat já está disponível.
     *
     * Não use await window.cv e não chame window.cv.then(),
     * pois esta versão possui um then() próprio que retorna
     * o próprio Module.
     */
    const iniciarVerificacao = (): void => {
      concluir();

      if (finalizado) {
        return;
      }

      intervalo = window.setInterval(() => {
        concluir();
      }, 100);
    };

    /*
     * Se o OpenCV já estiver carregado ao voltar para a tela.
     */
    const cvExistente = (globalThis as any).cv;

    if (cvExistente) {
      /*
       * Nesta versão, onRuntimeInitialized pode ser substituído
       * antes de o runtime terminar.
       */
      const callbackAnterior =
        cvExistente.onRuntimeInitialized;

      cvExistente.onRuntimeInitialized = () => {
        if (typeof callbackAnterior === 'function') {
          callbackAnterior();
        }

        concluir();
      };

      iniciarVerificacao();
      return;
    }

    const scriptExistente =
      document.querySelector<HTMLScriptElement>(
        'script[data-opencv-loader="true"]',
      );

    if (scriptExistente) {
      /*
       * Remove uma tag antiga que pode ter falhado.
       */
      scriptExistente.remove();
    }

    const script = document.createElement('script');

    script.dataset['opencvLoader'] = 'true';

    script.src = new URL(
      'opencv/opencv.js',
      document.baseURI,
    ).href;

    script.async = true;

    script.onload = () => {
      console.log(
        'Arquivo OpenCV carregado:',
        script.src,
      );

      const instanciaCv = (globalThis as any).cv;

      if (!instanciaCv) {
        falhar(
          'O arquivo opencv.js foi carregado, mas window.cv não foi criado.',
        );
        return;
      }

      /*
       * Preserva um callback que possa existir no OpenCV.
       */
      const callbackAnterior =
        instanciaCv.onRuntimeInitialized;

      instanciaCv.onRuntimeInitialized = () => {
        if (typeof callbackAnterior === 'function') {
          callbackAnterior();
        }

        concluir();
      };

      iniciarVerificacao();
    };

    script.onerror = () => {
      falhar(
        `Falha ao carregar o OpenCV em: ${script.src}`,
      );
    };

    document.head.appendChild(script);
  });

  return this.carregamentoOpenCv;
}
}
