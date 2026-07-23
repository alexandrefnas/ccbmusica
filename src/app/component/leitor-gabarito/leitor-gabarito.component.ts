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

interface PontoMarcador {
  x: number;
  y: number;
  area: number;
}

interface ImagensProcessadas {
  visual: any;
  binaria: any;
}

interface CandidatoMarcador {
  marcador: PontoMarcador;

  largura: number;
  altura: number;

  proporcao: number;
  preenchimento: number;

  areaRetangulo: number;
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

  @ViewChild('canvasMarcadores')
  private canvasMarcadoresRef!: ElementRef<HTMLCanvasElement>;

  private readonly isBrowser: boolean;
  private stream: MediaStream | null = null;

  private cv: any = null;

  private carregamentoOpenCv: Promise<void> | null = null;

  private ultimosMarcadores: {
    superiorEsquerdo: PontoMarcador;
    superiorDireito: PontoMarcador;
    inferiorEsquerdo: PontoMarcador;
    inferiorDireito: PontoMarcador;
  } | null = null;

  carregandoOpenCv = true;
  cameraAtiva = false;
  processando = false;
  usouCorrecaoPerspectiva = false;
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
   * Posição dos centros dos marcadores após o warpPerspective.
   */
  private readonly marcadorDestinoX = 30;
  private readonly marcadorDestinoY = 25;

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

    let visual: any = null;
    let binaria: any = null;
    let debug: any = null;

    try {
      this.capturarFrame();

      const processadas = this.prepararImagem();

      visual = processadas.visual;
      binaria = processadas.binaria;

      this.respostas = this.lerRespostas(binaria);

      this.leituraConcluida.emit(this.respostas);

      debug = visual.clone();

      this.desenharAreasLeituraColoridas(debug);

      this.cv.imshow(this.canvasProcessadoRef.nativeElement, debug);

      this.mensagem = this.usouCorrecaoPerspectiva
        ? 'Leitura concluída com correção pelos marcadores.'
        : 'Leitura concluída sem correção de perspectiva.';
    } catch (erro) {
      console.error('Erro ao processar gabarito:', erro);

      this.mensagem =
        erro instanceof Error
          ? erro.message
          : 'Não foi possível processar o gabarito.';
    } finally {
      visual?.delete();
      binaria?.delete();
      debug?.delete();

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

  // private async processarCanvas(): Promise<void> {
  //   this.processando = true;
  //   this.mensagem = 'Analisando imagem...';

  //   let imagemCorrigida: any = null;
  //   let imagemDebug: any = null;

  //   try {
  //     imagemCorrigida = this.prepararImagem();
  //     imagemDebug = imagemCorrigida.clone();

  //     this.desenharAreasLeitura(imagemDebug);

  //     this.respostas = this.lerRespostas(imagemCorrigida);

  //     this.leituraConcluida.emit(this.respostas);

  //     this.cv.imshow(this.canvasProcessadoRef.nativeElement, imagemDebug);

  //     this.mensagem = 'Leitura concluída.';
  //   } catch (erro) {
  //     console.error('Erro ao analisar imagem:', erro);

  //     this.mensagem =
  //       erro instanceof Error ? erro.message : 'Erro ao analisar a imagem.';
  //   } finally {
  //     imagemDebug?.delete();
  //     imagemCorrigida?.delete();

  //     this.processando = false;
  //   }
  // }

  private async processarCanvas(): Promise<void> {
    this.processando = true;
    this.mensagem = 'Analisando imagem...';

    let visual: any = null;
    let binaria: any = null;
    let debug: any = null;

    try {
      const processadas = this.prepararImagem();

      visual = processadas.visual;
      binaria = processadas.binaria;

      this.respostas = this.lerRespostas(binaria);

      this.leituraConcluida.emit(this.respostas);

      /*
       * Mostra a imagem corrigida normal.
       */
      debug = visual.clone();

      this.desenharAreasLeituraColoridas(debug);

      this.cv.imshow(this.canvasProcessadoRef.nativeElement, debug);

      this.mensagem = this.usouCorrecaoPerspectiva
        ? 'Leitura concluída com correção pelos marcadores.'
        : 'Leitura concluída sem correção de perspectiva.';
    } catch (erro) {
      console.error('Erro ao analisar imagem:', erro);

      this.mensagem =
        erro instanceof Error ? erro.message : 'Erro ao analisar a imagem.';
    } finally {
      visual?.delete();
      binaria?.delete();
      debug?.delete();

      this.processando = false;
    }
  }

  private desenharAreasLeituraColoridas(imagem: any): void {
    for (const bolha of this.coordenadasBolhas) {
      this.cv.circle(
        imagem,
        new this.cv.Point(Math.round(bolha.x), Math.round(bolha.y)),
        Math.round(bolha.raio * 0.4),
        new this.cv.Scalar(255, 0, 0, 255),
        2,
      );
    }
  }

  private desenharMarcadoresDetectados(imagem: any): void {
    if (!this.ultimosMarcadores) {
      return;
    }

    const marcadores = [
      this.ultimosMarcadores.superiorEsquerdo,

      this.ultimosMarcadores.superiorDireito,

      this.ultimosMarcadores.inferiorEsquerdo,

      this.ultimosMarcadores.inferiorDireito,
    ];

    for (const marcador of marcadores) {
      this.cv.circle(
        imagem,
        new this.cv.Point(Math.round(marcador.x), Math.round(marcador.y)),
        80,
        new this.cv.Scalar(255, 0, 0, 255),
        5,
      );
    }
  }

  // private desenharAreasLeitura(imagem: any): void {
  //   for (const bolha of this.coordenadasBolhas) {
  //     this.cv.circle(
  //       imagem,
  //       new this.cv.Point(Math.round(bolha.x), Math.round(bolha.y)),
  //       Math.round(bolha.raio * 0.48),
  //       new this.cv.Scalar(128),
  //       1,
  //     );
  //   }
  // }

  private desenharAreasLeitura(imagem: any): void {
    for (const bolha of this.coordenadasBolhas) {
      this.cv.circle(
        imagem,
        new this.cv.Point(Math.round(bolha.x), Math.round(bolha.y)),
        Math.round(bolha.raio * 0.4),
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

  // private prepararImagem(): any {
  //   const origem = this.cv.imread(this.canvasRef.nativeElement);

  //   const cinza = new this.cv.Mat();
  //   const binaria = new this.cv.Mat();
  //   const redimensionada = new this.cv.Mat();

  //   try {
  //     this.cv.cvtColor(origem, cinza, this.cv.COLOR_RGBA2GRAY);

  //     /**
  //      * No primeiro protótipo, redimensionamos diretamente.
  //      *
  //      * Depois, esta etapa será substituída pela detecção dos
  //      * quatro marcadores e correção de perspectiva.
  //      */
  //     // this.cv.resize(
  //     //   cinza,
  //     //   redimensionada,
  //     //   new this.cv.Size(this.larguraPadrao, this.alturaPadrao),
  //     //   0,
  //     //   0,
  //     //   this.cv.INTER_AREA,
  //     // );
  //     this.cv.resize(cinza, redimensionada, new this.cv.Size(1000, 1414));

  //     this.cv.GaussianBlur(
  //       redimensionada,
  //       redimensionada,
  //       new this.cv.Size(3, 3),
  //       0,
  //     );

  //     this.cv.adaptiveThreshold(
  //       redimensionada,
  //       binaria,
  //       255,
  //       this.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
  //       this.cv.THRESH_BINARY_INV,
  //       31,
  //       12,
  //     );

  //     return binaria.clone();
  //   } finally {
  //     origem.delete();
  //     cinza.delete();
  //     binaria.delete();
  //     redimensionada.delete();
  //   }
  // }

  private prepararImagem(): ImagensProcessadas {
    const origem = this.cv.imread(this.canvasRef.nativeElement);

    let corrigida: any = null;

    const cinza = new this.cv.Mat();
    const suavizada = new this.cv.Mat();
    const binaria = new this.cv.Mat();

    try {
      // corrigida =
      //   this.corrigirPerspectivaPorMarcadores(
      //     origem,
      //   );

      this.usouCorrecaoPerspectiva = false;

      corrigida = this.corrigirPerspectivaPorMarcadores(origem);

      this.usouCorrecaoPerspectiva = true;

      this.coordenadasBolhas = this.gerarCoordenadasIniciais();

      this.cv.cvtColor(corrigida, cinza, this.cv.COLOR_RGBA2GRAY);

      this.cv.GaussianBlur(cinza, suavizada, new this.cv.Size(3, 3), 0);

      this.cv.adaptiveThreshold(
        suavizada,
        binaria,
        255,
        this.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        this.cv.THRESH_BINARY_INV,
        41,
        16,
      );

      return {
        visual: corrigida.clone(),
        binaria: binaria.clone(),
      };
    } finally {
      origem.delete();
      corrigida?.delete();
      cinza.delete();
      suavizada.delete();
      binaria.delete();
    }
  }

  // private corrigirPerspectivaPorMarcadores(origem: any): any {
  //   const marcadores = this.localizarMarcadoresDeCanto(origem);

  //   if (!marcadores) {
  //     throw new Error(
  //       'Não foi possível localizar os quatro marcadores. ' +
  //         'Fotografe a folha inteira, com os quatro quadrados visíveis.',
  //     );
  //   }

  //   const {
  //     superiorEsquerdo,
  //     superiorDireito,
  //     inferiorEsquerdo,
  //     inferiorDireito,
  //   } = marcadores;

  //   /*
  //    * Posições esperadas para os centros dos marcadores
  //    * na imagem padronizada de 1000 × 1414.
  //    *
  //    * Ajuste margemX e margemY somente se os círculos de
  //    * depuração ficarem deslocados depois da perspectiva.
  //    */
  //   const margemX = 28;
  //   const margemY = 28;

  //   const pontosOrigem = this.cv.matFromArray(4, 1, this.cv.CV_32FC2, [
  //     superiorEsquerdo.x,
  //     superiorEsquerdo.y,

  //     superiorDireito.x,
  //     superiorDireito.y,

  //     inferiorDireito.x,
  //     inferiorDireito.y,

  //     inferiorEsquerdo.x,
  //     inferiorEsquerdo.y,
  //   ]);

  //   const pontosDestino = this.cv.matFromArray(4, 1, this.cv.CV_32FC2, [
  //     margemX,
  //     margemY,

  //     this.larguraPadrao - margemX,
  //     margemY,

  //     this.larguraPadrao - margemX,
  //     this.alturaPadrao - margemY,

  //     margemX,
  //     this.alturaPadrao - margemY,
  //   ]);

  //   const matrizPerspectiva = this.cv.getPerspectiveTransform(
  //     pontosOrigem,
  //     pontosDestino,
  //   );

  //   const resultado = new this.cv.Mat();

  //   try {
  //     this.cv.warpPerspective(
  //       origem,
  //       resultado,
  //       matrizPerspectiva,
  //       new this.cv.Size(this.larguraPadrao, this.alturaPadrao),
  //       this.cv.INTER_LINEAR,
  //       this.cv.BORDER_CONSTANT,
  //       new this.cv.Scalar(255, 255, 255, 255),
  //     );

  //     return resultado.clone();
  //   } finally {
  //     resultado.delete();
  //     matrizPerspectiva.delete();
  //     pontosOrigem.delete();
  //     pontosDestino.delete();
  //   }
  // }

  private corrigirPerspectivaPorMarcadores(origem: any): any {
    const marcadores = this.localizarMarcadoresDeCanto(origem);

    if (!marcadores) {
      throw new Error(
        'Não foi possível identificar corretamente os quatro marcadores.',
      );
    }

    const {
      superiorEsquerdo: se,
      superiorDireito: sd,
      inferiorEsquerdo: ie,
      inferiorDireito: id,
    } = marcadores;

    // const destinoX = 30;
    // const destinoY = 25;

    const imagemMarcadores = origem.clone();

    try {
      this.desenharMarcadoresDetectados(imagemMarcadores);

      this.cv.imshow(this.canvasMarcadoresRef.nativeElement, imagemMarcadores);
    } finally {
      imagemMarcadores.delete();
    }

    const pontosOrigem = this.cv.matFromArray(4, 1, this.cv.CV_32FC2, [
      se.x,
      se.y,

      sd.x,
      sd.y,

      id.x,
      id.y,

      ie.x,
      ie.y,
    ]);

    // const pontosDestino = this.cv.matFromArray(4, 1, this.cv.CV_32FC2, [
    //   destinoX,
    //   destinoY,

    //   this.larguraPadrao - destinoX,
    //   destinoY,

    //   this.larguraPadrao - destinoX,
    //   this.alturaPadrao - destinoY,

    //   destinoX,
    //   this.alturaPadrao - destinoY,
    // ]);

    const pontosDestino = this.cv.matFromArray(4, 1, this.cv.CV_32FC2, [
      this.marcadorDestinoX,
      this.marcadorDestinoY,

      this.larguraPadrao - this.marcadorDestinoX,
      this.marcadorDestinoY,

      this.larguraPadrao - this.marcadorDestinoX,
      this.alturaPadrao - this.marcadorDestinoY,

      this.marcadorDestinoX,
      this.alturaPadrao - this.marcadorDestinoY,
    ]);

    const matriz = this.cv.getPerspectiveTransform(pontosOrigem, pontosDestino);

    const resultado = new this.cv.Mat();

    try {
      this.cv.warpPerspective(
        origem,
        resultado,
        matriz,
        new this.cv.Size(this.larguraPadrao, this.alturaPadrao),
        this.cv.INTER_LINEAR,
        this.cv.BORDER_CONSTANT,
        new this.cv.Scalar(255, 255, 255, 255),
      );

      return resultado.clone();
    } finally {
      pontosOrigem.delete();
      pontosDestino.delete();
      matriz.delete();
      resultado.delete();
    }
  }

private localizarMarcadoresDeCanto(
  origem: any,
): {
  superiorEsquerdo: PontoMarcador;
  superiorDireito: PontoMarcador;
  inferiorEsquerdo: PontoMarcador;
  inferiorDireito: PontoMarcador;
} | null {
  /*
   * Primeira tentativa:
   * procura os quatro quadrados na imagem inteira.
   *
   * A posição e a dimensão da folha somente serão
   * determinadas depois que os marcadores forem encontrados.
   */
  const marcadoresGlobais =
    this.localizarMarcadoresGlobalmente(origem);

  if (marcadoresGlobais) {
    console.log(
      'Marcadores encontrados pela busca global.',
      marcadoresGlobais,
    );

    return marcadoresGlobais;
  }

  /*
   * Fallback:
   * mantém o método antigo que já funciona quando a folha
   * ocupa praticamente toda a fotografia.
   */
  console.warn(
    'Busca global não encontrou os quatro marcadores. Tentando busca próxima das bordas.',
  );

  const marcadoresProximos =
    this.localizarMarcadoresProximosDasBordas(origem);

  if (marcadoresProximos) {
    console.log(
      'Marcadores encontrados pela busca próxima das bordas.',
      marcadoresProximos,
    );
  }

  return marcadoresProximos;
}


private localizarMarcadoresProximosDasBordas(
  origem: any,
): {
  superiorEsquerdo: PontoMarcador;
  superiorDireito: PontoMarcador;
  inferiorEsquerdo: PontoMarcador;
  inferiorDireito: PontoMarcador;
} | null {
  const largura = origem.cols;
  const altura = origem.rows;

  const tentativas = [
    {
      larguraPercentual: 0.22,
      alturaPercentual: 0.18,
    },
    {
      larguraPercentual: 0.32,
      alturaPercentual: 0.27,
    },
    {
      larguraPercentual: 0.42,
      alturaPercentual: 0.36,
    },
  ];

  for (let tentativa = 0; tentativa < tentativas.length; tentativa++) {
    const configuracao = tentativas[tentativa];

    const larguraRegiao = Math.round(
      largura * configuracao.larguraPercentual,
    );

    const alturaRegiao = Math.round(
      altura * configuracao.alturaPercentual,
    );

    console.log(`Tentativa de marcadores ${tentativa + 1}:`, {
      larguraRegiao,
      alturaRegiao,
    });

    const superiorEsquerdo = this.localizarBlocoPretoNoCanto(
      origem,
      new this.cv.Rect(0, 0, larguraRegiao, alturaRegiao),
      'superior esquerdo',
      'superior-esquerdo',
    );

    const superiorDireito = this.localizarBlocoPretoNoCanto(
      origem,
      new this.cv.Rect(
        largura - larguraRegiao,
        0,
        larguraRegiao,
        alturaRegiao,
      ),
      'superior direito',
      'superior-direito',
    );

    const inferiorEsquerdo = this.localizarBlocoPretoNoCanto(
      origem,
      new this.cv.Rect(
        0,
        altura - alturaRegiao,
        larguraRegiao,
        alturaRegiao,
      ),
      'inferior esquerdo',
      'inferior-esquerdo',
    );

    const inferiorDireito = this.localizarBlocoPretoNoCanto(
      origem,
      new this.cv.Rect(
        largura - larguraRegiao,
        altura - alturaRegiao,
        larguraRegiao,
        alturaRegiao,
      ),
      'inferior direito',
      'inferior-direito',
    );

    if (
      !superiorEsquerdo ||
      !superiorDireito ||
      !inferiorEsquerdo ||
      !inferiorDireito
    ) {
      continue;
    }

    const marcadores = {
      superiorEsquerdo,
      superiorDireito,
      inferiorEsquerdo,
      inferiorDireito,
    };

    if (!this.validarMarcadores(marcadores, largura, altura)) {
      continue;
    }

    this.ultimosMarcadores = marcadores;

    return marcadores;
  }

  return null;
}

private localizarMarcadoresGlobalmente(
  origem: any,
): {
  superiorEsquerdo: PontoMarcador;
  superiorDireito: PontoMarcador;
  inferiorEsquerdo: PontoMarcador;
  inferiorDireito: PontoMarcador;
} | null {
  const cinza = new this.cv.Mat();
  const suavizada = new this.cv.Mat();
  const binaria = new this.cv.Mat();

  const linhasHorizontais = new this.cv.Mat();
  const linhasVerticais = new this.cv.Mat();
  const linhas = new this.cv.Mat();
  const semLinhas = new this.cv.Mat();
  const fechada = new this.cv.Mat();

  const contornos = new this.cv.MatVector();
  const hierarquia = new this.cv.Mat();

  const menorDimensao = Math.min(
    origem.cols,
    origem.rows,
  );

  /*
   * As linhas da moldura são longas e finas.
   * Os marcadores são blocos compactos.
   */
  let comprimentoLinha = Math.round(
    menorDimensao * 0.035,
  );

  comprimentoLinha = Math.max(
    comprimentoLinha,
    25,
  );

  const kernelHorizontal =
    this.cv.getStructuringElement(
      this.cv.MORPH_RECT,
      new this.cv.Size(
        comprimentoLinha,
        1,
      ),
    );

  const kernelVertical =
    this.cv.getStructuringElement(
      this.cv.MORPH_RECT,
      new this.cv.Size(
        1,
        comprimentoLinha,
      ),
    );

  const kernelFechamento =
    this.cv.getStructuringElement(
      this.cv.MORPH_RECT,
      new this.cv.Size(5, 5),
    );

  try {
    this.cv.cvtColor(
      origem,
      cinza,
      this.cv.COLOR_RGBA2GRAY,
    );

    this.cv.GaussianBlur(
      cinza,
      suavizada,
      new this.cv.Size(3, 3),
      0,
    );

    /*
     * Marcadores e demais regiões escuras ficam brancos.
     */
    this.cv.threshold(
      suavizada,
      binaria,
      0,
      255,
      this.cv.THRESH_BINARY_INV |
        this.cv.THRESH_OTSU,
    );

    /*
     * Extrai somente linhas horizontais longas.
     */
    this.cv.morphologyEx(
      binaria,
      linhasHorizontais,
      this.cv.MORPH_OPEN,
      kernelHorizontal,
    );

    /*
     * Extrai somente linhas verticais longas.
     */
    this.cv.morphologyEx(
      binaria,
      linhasVerticais,
      this.cv.MORPH_OPEN,
      kernelVertical,
    );

    this.cv.bitwise_or(
      linhasHorizontais,
      linhasVerticais,
      linhas,
    );

    /*
     * Remove as linhas da moldura.
     *
     * Isso é importante principalmente no marcador
     * inferior esquerdo, que aparece ligado à linha
     * inferior e à borda lateral.
     */
    this.cv.subtract(
      binaria,
      linhas,
      semLinhas,
    );

    /*
     * Reconecta pequenas falhas dentro dos marcadores.
     */
    this.cv.morphologyEx(
      semLinhas,
      fechada,
      this.cv.MORPH_CLOSE,
      kernelFechamento,
    );

    /*
     * RETR_LIST também recupera contornos que ficaram
     * internos ou parcialmente ligados a outros elementos.
     */
    this.cv.findContours(
      fechada,
      contornos,
      hierarquia,
      this.cv.RETR_LIST,
      this.cv.CHAIN_APPROX_SIMPLE,
    );

    /*
     * Ainda não sabemos quantos pixels correspondem a 7 mm,
     * porque primeiro precisamos saber quanto da foto é folha.
     *
     * Por isso usamos uma faixa ampla. A semelhança entre
     * os quatro marcadores será validada depois.
     */
    const ladoMinimo =
      menorDimensao * 0.006;

    const ladoMaximo =
      menorDimensao * 0.10;

    const candidatos: CandidatoMarcador[] = [];

    for (
      let indice = 0;
      indice < contornos.size();
      indice++
    ) {
      const contorno =
        contornos.get(indice);

      const aproximado =
        new this.cv.Mat();

      try {
        const area =
          this.cv.contourArea(contorno);

        if (area <= 0) {
          continue;
        }

        const retangulo =
          this.cv.boundingRect(contorno);

        if (
          retangulo.width <
            ladoMinimo ||
          retangulo.height <
            ladoMinimo ||
          retangulo.width >
            ladoMaximo ||
          retangulo.height >
            ladoMaximo
        ) {
          continue;
        }

        const proporcao =
          retangulo.width /
          retangulo.height;

        /*
         * Tolerância para deformação de perspectiva.
         */
        if (
          proporcao < 0.68 ||
          proporcao > 1.47
        ) {
          continue;
        }

        const perimetro =
          this.cv.arcLength(
            contorno,
            true,
          );

        this.cv.approxPolyDP(
          contorno,
          aproximado,
          perimetro * 0.035,
          true,
        );

        /*
         * O marcador precisa realmente possuir quatro lados.
         */
        if (aproximado.rows !== 4) {
          continue;
        }

        if (
          !this.cv.isContourConvex(
            aproximado,
          )
        ) {
          continue;
        }

        const pontos =
          this.extrairPontosContorno(
            aproximado,
          );

        /*
         * Os quatro ângulos precisam ser próximos de 90°.
         */
        if (
          !this.validarAngulosQuadrado(
            pontos,
          )
        ) {
          continue;
        }

        const areaRetangulo =
          retangulo.width *
          retangulo.height;

        const preenchimento =
          area /
          areaRetangulo;

        /*
         * Círculos ficam normalmente próximos de 0,78.
         * O quadrado preenchido tende a ficar mais próximo de 1.
         */
        if (preenchimento < 0.82) {
          continue;
        }

        /*
         * Compara a área do contorno com a área do
         * quadrilátero aproximado.
         */
        const areaAproximada =
          Math.abs(
            this.cv.contourArea(
              aproximado,
            ),
          );

        const solidezQuadrilateral =
          area /
          Math.max(
            areaAproximada,
            1,
          );

        if (
          solidezQuadrilateral < 0.82 ||
          solidezQuadrilateral > 1.18
        ) {
          continue;
        }

        const momentos =
          this.cv.moments(
            contorno,
            false,
          );

        if (
          Math.abs(momentos.m00) <
          0.0001
        ) {
          continue;
        }

        /*
         * Usa o centro real do contorno, não apenas
         * o centro do boundingRect.
         */
        const centroX =
          momentos.m10 /
          momentos.m00;

        const centroY =
          momentos.m01 /
          momentos.m00;

        candidatos.push({
          marcador: {
            x: centroX,
            y: centroY,
            area,
          },

          largura:
            retangulo.width,

          altura:
            retangulo.height,

          proporcao,
          preenchimento,
          areaRetangulo,
        });
      } finally {
        aproximado.delete();
        contorno.delete();
      }
    }

    const candidatosSemDuplicidade =
      this.removerCandidatosDuplicados(
        candidatos,
      );

    console.table(
      candidatosSemDuplicidade.map(
        (item) => ({
          x: Math.round(
            item.marcador.x,
          ),

          y: Math.round(
            item.marcador.y,
          ),

          largura:
            item.largura,

          altura:
            item.altura,

          proporcao:
            item.proporcao.toFixed(2),

          preenchimento:
            item.preenchimento.toFixed(2),

          area:
            Math.round(
              item.areaRetangulo,
            ),
        }),
      ),
    );

    /*
     * Ordena por qualidade geométrica.
     */
    candidatosSemDuplicidade.sort(
      (a, b) => {
        const erroA =
          Math.abs(
            1 - a.proporcao,
          );

        const erroB =
          Math.abs(
            1 - b.proporcao,
          );

        const qualidadeA =
          a.areaRetangulo *
          a.preenchimento *
          (1 - erroA * 0.5);

        const qualidadeB =
          b.areaRetangulo *
          b.preenchimento *
          (1 - erroB * 0.5);

        return (
          qualidadeB -
          qualidadeA
        );
      },
    );

    const candidatosPrincipais =
      candidatosSemDuplicidade.slice(
        0,
        24,
      );

    console.log(
      'Quadrados pretos confirmados:',
      candidatosPrincipais.length,
    );

    if (
      candidatosPrincipais.length < 4
    ) {
      return null;
    }

    const marcadores =
      this.encontrarMelhorConjuntoDeQuatroMarcadores(
        candidatosPrincipais,
        origem.cols,
        origem.rows,
      );

    if (!marcadores) {
      return null;
    }

    if (
      !this.validarMarcadoresGlobais(
        marcadores,
        origem.cols,
        origem.rows,
      )
    ) {
      return null;
    }

    this.ultimosMarcadores =
      marcadores;

    return marcadores;
  } finally {
    cinza.delete();
    suavizada.delete();
    binaria.delete();

    linhasHorizontais.delete();
    linhasVerticais.delete();
    linhas.delete();
    semLinhas.delete();
    fechada.delete();

    kernelHorizontal.delete();
    kernelVertical.delete();
    kernelFechamento.delete();

    contornos.delete();
    hierarquia.delete();
  }
}

private extrairPontosContorno(
  contorno: any,
): Array<{
  x: number;
  y: number;
}> {
  const pontos: Array<{
    x: number;
    y: number;
  }> = [];

  for (
    let indice = 0;
    indice < contorno.rows;
    indice++
  ) {
    pontos.push({
      x:
        contorno.data32S[
          indice * 2
        ],

      y:
        contorno.data32S[
          indice * 2 + 1
        ],
    });
  }

  return pontos;
}


private validarAngulosQuadrado(
  pontos: Array<{
    x: number;
    y: number;
  }>,
): boolean {
  if (pontos.length !== 4) {
    return false;
  }

  const centro = {
    x:
      pontos.reduce(
        (soma, ponto) =>
          soma + ponto.x,
        0,
      ) / 4,

    y:
      pontos.reduce(
        (soma, ponto) =>
          soma + ponto.y,
        0,
      ) / 4,
  };

  /*
   * Ordena os pontos ao redor do centro.
   */
  const ordenados =
    [...pontos].sort(
      (a, b) =>
        Math.atan2(
          a.y - centro.y,
          a.x - centro.x,
        ) -
        Math.atan2(
          b.y - centro.y,
          b.x - centro.x,
        ),
    );

  for (
    let indice = 0;
    indice < 4;
    indice++
  ) {
    const anterior =
      ordenados[
        (indice + 3) % 4
      ];

    const atual =
      ordenados[indice];

    const proximo =
      ordenados[
        (indice + 1) % 4
      ];

    const vetor1 = {
      x:
        anterior.x -
        atual.x,

      y:
        anterior.y -
        atual.y,
    };

    const vetor2 = {
      x:
        proximo.x -
        atual.x,

      y:
        proximo.y -
        atual.y,
    };

    const produtoEscalar =
      vetor1.x * vetor2.x +
      vetor1.y * vetor2.y;

    const modulo1 =
      Math.hypot(
        vetor1.x,
        vetor1.y,
      );

    const modulo2 =
      Math.hypot(
        vetor2.x,
        vetor2.y,
      );

    if (
      modulo1 === 0 ||
      modulo2 === 0
    ) {
      return false;
    }

    const cosseno =
      Math.max(
        -1,
        Math.min(
          1,
          produtoEscalar /
            (
              modulo1 *
              modulo2
            ),
        ),
      );

    const angulo =
      Math.acos(cosseno) *
      180 /
      Math.PI;

    /*
     * Perspectiva pode deformar os 90°,
     * mas não deve produzir ângulos extremos.
     */
    if (
      angulo < 65 ||
      angulo > 115
    ) {
      return false;
    }
  }

  return true;
}

private removerCandidatosDuplicados(
  candidatos: CandidatoMarcador[],
): CandidatoMarcador[] {
  const resultado: CandidatoMarcador[] = [];

  const ordenados = [...candidatos].sort(
    (a, b) =>
      b.areaRetangulo -
      a.areaRetangulo,
  );

  for (const candidato of ordenados) {
    const distanciaMinima =
      Math.max(
        Math.min(
          candidato.largura,
          candidato.altura,
        ) * 0.5,
        5,
      );

    const jaExiste =
      resultado.some((existente) => {
        const distancia = Math.hypot(
          candidato.marcador.x -
            existente.marcador.x,

          candidato.marcador.y -
            existente.marcador.y,
        );

        return (
          distancia <
          distanciaMinima
        );
      });

    if (!jaExiste) {
      resultado.push(candidato);
    }
  }

  return resultado;
}

private validarMarcadoresGlobais(
  marcadores: {
    superiorEsquerdo: PontoMarcador;
    superiorDireito: PontoMarcador;
    inferiorEsquerdo: PontoMarcador;
    inferiorDireito: PontoMarcador;
  },
  larguraImagem: number,
  alturaImagem: number,
): boolean {
  const {
    superiorEsquerdo: se,
    superiorDireito: sd,
    inferiorEsquerdo: ie,
    inferiorDireito: id,
  } = marcadores;

  /*
   * Ordem lógica.
   */
  if (
    se.x >= sd.x ||
    ie.x >= id.x ||
    se.y >= ie.y ||
    sd.y >= id.y
  ) {
    return false;
  }

  const larguraSuperior =
    Math.hypot(
      sd.x - se.x,
      sd.y - se.y,
    );

  const larguraInferior =
    Math.hypot(
      id.x - ie.x,
      id.y - ie.y,
    );

  const alturaEsquerda =
    Math.hypot(
      ie.x - se.x,
      ie.y - se.y,
    );

  const alturaDireita =
    Math.hypot(
      id.x - sd.x,
      id.y - sd.y,
    );

  /*
   * A folha precisa formar uma área relevante, mas não
   * precisa ocupar quase toda a fotografia.
   */
  if (
    larguraSuperior <
      larguraImagem * 0.20 ||
    larguraInferior <
      larguraImagem * 0.20 ||
    alturaEsquerda <
      alturaImagem * 0.28 ||
    alturaDireita <
      alturaImagem * 0.28
  ) {
    return false;
  }

  const larguraMedia =
    (
      larguraSuperior +
      larguraInferior
    ) / 2;

  const alturaMedia =
    (
      alturaEsquerda +
      alturaDireita
    ) / 2;

  /*
   * Relação aproximada da folha A4:
   * altura/largura ≈ 1,414.
   *
   * A perspectiva pode alterar bastante essa relação,
   * portanto usamos uma faixa tolerante.
   */
  const proporcaoFolha =
    alturaMedia /
    larguraMedia;

  if (
    proporcaoFolha < 0.9 ||
    proporcaoFolha > 2.1
  ) {
    return false;
  }

  const diferencaLargura =
    Math.abs(
      larguraSuperior -
        larguraInferior,
    ) /
    Math.max(
      larguraSuperior,
      larguraInferior,
    );

  const diferencaAltura =
    Math.abs(
      alturaEsquerda -
        alturaDireita,
    ) /
    Math.max(
      alturaEsquerda,
      alturaDireita,
    );

  if (
    diferencaLargura > 0.55 ||
    diferencaAltura > 0.55
  ) {
    return false;
  }

  return true;
}

private encontrarMelhorConjuntoDeQuatroMarcadores(
  candidatos: CandidatoMarcador[],
  larguraImagem: number,
  alturaImagem: number,
): {
  superiorEsquerdo: PontoMarcador;
  superiorDireito: PontoMarcador;
  inferiorEsquerdo: PontoMarcador;
  inferiorDireito: PontoMarcador;
} | null {
  let melhorConjunto: {
    superiorEsquerdo: PontoMarcador;
    superiorDireito: PontoMarcador;
    inferiorEsquerdo: PontoMarcador;
    inferiorDireito: PontoMarcador;
  } | null = null;

  let melhorPontuacao =
    Number.NEGATIVE_INFINITY;

  for (
    let a = 0;
    a < candidatos.length - 3;
    a++
  ) {
    for (
      let b = a + 1;
      b < candidatos.length - 2;
      b++
    ) {
      for (
        let c = b + 1;
        c < candidatos.length - 1;
        c++
      ) {
        for (
          let d = c + 1;
          d < candidatos.length;
          d++
        ) {
          const grupo = [
            candidatos[a],
            candidatos[b],
            candidatos[c],
            candidatos[d],
          ];

          const ordenados =
            this.ordenarMarcadoresPorCanto(
              grupo,
            );

          if (!ordenados) {
            continue;
          }

          const {
            superiorEsquerdo: se,
            superiorDireito: sd,
            inferiorEsquerdo: ie,
            inferiorDireito: id,
          } = ordenados;

          const larguraSuperior =
            Math.hypot(
              sd.marcador.x -
                se.marcador.x,

              sd.marcador.y -
                se.marcador.y,
            );

          const larguraInferior =
            Math.hypot(
              id.marcador.x -
                ie.marcador.x,

              id.marcador.y -
                ie.marcador.y,
            );

          const alturaEsquerda =
            Math.hypot(
              ie.marcador.x -
                se.marcador.x,

              ie.marcador.y -
                se.marcador.y,
            );

          const alturaDireita =
            Math.hypot(
              id.marcador.x -
                sd.marcador.x,

              id.marcador.y -
                sd.marcador.y,
            );

          /*
           * Os quatro marcadores devem formar uma região
           * relevante da fotografia.
           *
           * O limite é menor que o usado na busca rápida
           * porque a folha pode estar mais distante.
           */
          if (
            larguraSuperior <
              larguraImagem * 0.25 ||
            larguraInferior <
              larguraImagem * 0.25 ||
            alturaEsquerda <
              alturaImagem * 0.35 ||
            alturaDireita <
              alturaImagem * 0.35
          ) {
            continue;
          }

          const areas =
            grupo.map(
              (item) =>
                item.areaRetangulo,
            );

          const menorArea =
            Math.min(...areas);

          const maiorArea =
            Math.max(...areas);

          /*
           * Com perspectiva, o marcador mais próximo pode
           * parecer maior, mas não deve ser absurdamente maior.
           */
          const proporcaoAreas =
            maiorArea /
            Math.max(menorArea, 1);

if (proporcaoAreas > 2.1) {
  continue;
}

const ladosMedios = grupo.map(
  (item) =>
    (
      item.largura +
      item.altura
    ) / 2,
);

const menorLado =
  Math.min(...ladosMedios);

const maiorLado =
  Math.max(...ladosMedios);

if (
  maiorLado /
    Math.max(menorLado, 1) >
  1.8
) {
  continue;
}

          const diferencaLargura =
            Math.abs(
              larguraSuperior -
                larguraInferior,
            ) /
            Math.max(
              larguraSuperior,
              larguraInferior,
            );

          const diferencaAltura =
            Math.abs(
              alturaEsquerda -
                alturaDireita,
            ) /
            Math.max(
              alturaEsquerda,
              alturaDireita,
            );

          if (
            diferencaLargura >
              0.55 ||
            diferencaAltura >
              0.55
          ) {
            continue;
          }

          const areaQuadrilatero =
            this.calcularAreaQuadrilatero(
              se.marcador,
              sd.marcador,
              id.marcador,
              ie.marcador,
            );

          const areaNormalizada =
            areaQuadrilatero /
            (
              larguraImagem *
              alturaImagem
            );

          const mediaPreenchimento =
            grupo.reduce(
              (total, item) =>
                total +
                item.preenchimento,
              0,
            ) /
            grupo.length;

          const erroQuadradoMedio =
            grupo.reduce(
              (total, item) =>
                total +
                Math.abs(
                  1 -
                    item.proporcao,
                ),
              0,
            ) /
            grupo.length;

          /*
           * Maior pontuação é melhor.
           *
           * O tamanho do quadrilátero tem o maior peso.
           * Dessa maneira, as bolhas de respostas não vencem:
           * elas ficam próximas umas das outras e formam um
           * quadrilátero muito menor.
           */
          const pontuacao =
            areaNormalizada * 10 +
            mediaPreenchimento * 2 -
            erroQuadradoMedio * 2 -
            diferencaLargura -
            diferencaAltura -
            Math.max(
              proporcaoAreas - 1,
              0,
            ) *
              0.25;

          if (
            pontuacao >
            melhorPontuacao
          ) {
            melhorPontuacao =
              pontuacao;

            melhorConjunto = {
              superiorEsquerdo:
                se.marcador,

              superiorDireito:
                sd.marcador,

              inferiorEsquerdo:
                ie.marcador,

              inferiorDireito:
                id.marcador,
            };
          }
        }
      }
    }
  }

  if (!melhorConjunto) {
    return null;
  }

  console.log(
    'Melhor conjunto global de marcadores:',
    {
      pontuacao:
        melhorPontuacao,

      marcadores:
        melhorConjunto,
    },
  );

  this.ultimosMarcadores =
    melhorConjunto;

  return melhorConjunto;
}

private ordenarMarcadoresPorCanto(
  candidatos: CandidatoMarcador[],
): {
  superiorEsquerdo: CandidatoMarcador;
  superiorDireito: CandidatoMarcador;
  inferiorEsquerdo: CandidatoMarcador;
  inferiorDireito: CandidatoMarcador;
} | null {
  if (candidatos.length !== 4) {
    return null;
  }

  const porSoma = [
    ...candidatos,
  ].sort(
    (a, b) =>
      (
        a.marcador.x +
        a.marcador.y
      ) -
      (
        b.marcador.x +
        b.marcador.y
      ),
  );

  const porDiferenca = [
    ...candidatos,
  ].sort(
    (a, b) =>
      (
        a.marcador.y -
        a.marcador.x
      ) -
      (
        b.marcador.y -
        b.marcador.x
      ),
  );

  const superiorEsquerdo =
    porSoma[0];

  const inferiorDireito =
    porSoma[
      porSoma.length - 1
    ];

  const superiorDireito =
    porDiferenca[0];

  const inferiorEsquerdo =
    porDiferenca[
      porDiferenca.length - 1
    ];

  const unicos = new Set([
    superiorEsquerdo,
    superiorDireito,
    inferiorEsquerdo,
    inferiorDireito,
  ]);

  if (unicos.size !== 4) {
    return null;
  }

  return {
    superiorEsquerdo,
    superiorDireito,
    inferiorEsquerdo,
    inferiorDireito,
  };
}

private calcularAreaQuadrilatero(
  superiorEsquerdo: PontoMarcador,
  superiorDireito: PontoMarcador,
  inferiorDireito: PontoMarcador,
  inferiorEsquerdo: PontoMarcador,
): number {
  const pontos = [
    superiorEsquerdo,
    superiorDireito,
    inferiorDireito,
    inferiorEsquerdo,
  ];

  let area = 0;

  for (
    let indice = 0;
    indice < pontos.length;
    indice++
  ) {
    const atual =
      pontos[indice];

    const proximo =
      pontos[
        (indice + 1) %
          pontos.length
      ];

    area +=
      atual.x * proximo.y -
      proximo.x * atual.y;
  }

  return Math.abs(area) / 2;
}

  private localizarBlocoPretoNoCanto(
    origem: any,
    regiao: any,
    nome: string,
    canto:
      | 'superior-esquerdo'
      | 'superior-direito'
      | 'inferior-esquerdo'
      | 'inferior-direito',
  ): PontoMarcador | null {
    const recorte = origem.roi(regiao);

    const cinza = new this.cv.Mat();
    const suavizada = new this.cv.Mat();
    const binaria = new this.cv.Mat();
    const fechada = new this.cv.Mat();
    const distancia = new this.cv.Mat();

    /*
     * Evita considerar sombras ou faixas pretas que estejam
     * exatamente na extremidade da fotografia.
     */
    const margemExterna = Math.max(
      Math.round(Math.min(origem.cols, origem.rows) * 0.0025),
      3,
    );

    const larguraBusca = regiao.width - margemExterna * 2;

    const alturaBusca = regiao.height - margemExterna * 2;

    if (larguraBusca <= 0 || alturaBusca <= 0) {
      recorte.delete();
      cinza.delete();
      suavizada.delete();
      binaria.delete();
      fechada.delete();
      distancia.delete();

      return null;
    }

    const kernelFechamento = this.cv.getStructuringElement(
      this.cv.MORPH_RECT,
      new this.cv.Size(7, 7),
    );

    let areaBusca: any = null;
    let binariaBusca: any = null;

    try {
      this.cv.cvtColor(recorte, cinza, this.cv.COLOR_RGBA2GRAY);

      this.cv.GaussianBlur(cinza, suavizada, new this.cv.Size(3, 3), 0);

      /*
       * O OTSU adapta o limite à iluminação da fotografia.
       * As regiões escuras passam a ser brancas.
       */
      this.cv.threshold(
        suavizada,
        binaria,
        0,
        255,
        this.cv.THRESH_BINARY_INV | this.cv.THRESH_OTSU,
      );

      /*
       * Fecha pequenas falhas no preenchimento do quadrado.
       * Não usamos MORPH_OPEN, pois ele pode deformar ou
       * apagar marcadores ligados à moldura.
       */
      this.cv.morphologyEx(
        binaria,
        fechada,
        this.cv.MORPH_CLOSE,
        kernelFechamento,
      );

      /*
       * Remove apenas uma pequena faixa externa do recorte.
       * O marcador continua dentro da área de busca.
       */
      areaBusca = fechada.roi(
        new this.cv.Rect(
          margemExterna,
          margemExterna,
          larguraBusca,
          alturaBusca,
        ),
      );

      /*
       * A distância transformada mede quanto cada pixel preto
       * está distante do fundo branco.
       *
       * Linhas finas e textos:
       * distância pequena.
       *
       * Centro do quadrado preto de 7 mm:
       * distância grande.
       */
      this.cv.distanceTransform(areaBusca, distancia, this.cv.DIST_L2, 5);

      const resultado = this.cv.minMaxLoc(distancia);

      const distanciaMaxima = resultado.maxVal;

      const pontoMaximo = resultado.maxLoc;

      /*
       * O raio interno esperado do marcador deve ocupar pelo
       * menos cerca de 0,6% da menor dimensão da fotografia.
       */
      // const distanciaMinima = Math.min(origem.cols, origem.rows) * 0.006;

      const menorDimensao = Math.min(origem.cols, origem.rows);

      const distanciaMinima = Math.max(menorDimensao * 0.0035, 4);
      console.log(`Marcador ${nome}:`, {
        canto,
        xLocal: pontoMaximo.x,
        yLocal: pontoMaximo.y,
        distanciaMaxima,
        distanciaMinima,
      });

      if (distanciaMaxima < distanciaMinima) {
        console.warn(
          `Nenhum bloco preto suficientemente espesso foi encontrado no canto ${nome}.`,
        );

        return null;
      }

      const x = regiao.x + margemExterna + pontoMaximo.x;

      const y = regiao.y + margemExterna + pontoMaximo.y;

      /*
       * Área estimada somente para diagnóstico.
       * O warpPerspective usa apenas x e y.
       */
      const ladoEstimado = distanciaMaxima * 2;

      const areaEstimada = ladoEstimado * ladoEstimado;

      console.log(`Marcador confirmado — ${nome}:`, {
        x: Math.round(x),
        y: Math.round(y),
        distanciaMaxima: Number(distanciaMaxima.toFixed(2)),
        ladoEstimado: Number(ladoEstimado.toFixed(2)),
      });

      return {
        x,
        y,
        area: areaEstimada,
      };
    } finally {
      areaBusca?.delete();
      binariaBusca?.delete();

      recorte.delete();
      cinza.delete();
      suavizada.delete();
      binaria.delete();
      fechada.delete();
      distancia.delete();

      kernelFechamento.delete();
    }
  }

  private obterCantoLocal(
    canto:
      | 'superior-esquerdo'
      | 'superior-direito'
      | 'inferior-esquerdo'
      | 'inferior-direito',
    largura: number,
    altura: number,
  ): {
    x: number;
    y: number;
  } {
    switch (canto) {
      case 'superior-esquerdo':
        return {
          x: 0,
          y: 0,
        };

      case 'superior-direito':
        return {
          x: largura,
          y: 0,
        };

      case 'inferior-esquerdo':
        return {
          x: 0,
          y: altura,
        };

      case 'inferior-direito':
        return {
          x: largura,
          y: altura,
        };
    }
  }

  // private validarMarcadores(
  //   marcadores: {
  //     superiorEsquerdo: PontoMarcador;
  //     superiorDireito: PontoMarcador;
  //     inferiorEsquerdo: PontoMarcador;
  //     inferiorDireito: PontoMarcador;
  //   },
  //   larguraImagem: number,
  //   alturaImagem: number,
  // ): boolean {
  //   const {
  //     superiorEsquerdo: se,
  //     superiorDireito: sd,
  //     inferiorEsquerdo: ie,
  //     inferiorDireito: id,
  //   } = marcadores;

  //   const larguraSuperior = Math.hypot(sd.x - se.x, sd.y - se.y);

  //   const larguraInferior = Math.hypot(id.x - ie.x, id.y - ie.y);

  //   const alturaEsquerda = Math.hypot(ie.x - se.x, ie.y - se.y);

  //   const alturaDireita = Math.hypot(id.x - sd.x, id.y - sd.y);

  //   /*
  //    * Os marcadores devem ocupar boa parte da fotografia.
  //    */
  //   if (
  //     larguraSuperior < larguraImagem * 0.55 ||
  //     larguraInferior < larguraImagem * 0.55 ||
  //     alturaEsquerda < alturaImagem * 0.65 ||
  //     alturaDireita < alturaImagem * 0.65
  //   ) {
  //     return false;
  //   }

  //   /*
  //    * Lados opostos não podem possuir diferenças absurdas.
  //    */
  //   const diferencaLargura =
  //     Math.abs(larguraSuperior - larguraInferior) /
  //     Math.max(larguraSuperior, larguraInferior);

  //   const diferencaAltura =
  //     Math.abs(alturaEsquerda - alturaDireita) /
  //     Math.max(alturaEsquerda, alturaDireita);

  //   if (diferencaLargura > 0.35 || diferencaAltura > 0.35) {
  //     return false;
  //   }

  //   /*
  //    * Verifica a ordem lógica dos pontos.
  //    */
  //   return se.x < sd.x && ie.x < id.x && se.y < ie.y && sd.y < id.y;
  // }

  private validarMarcadores(
    marcadores: {
      superiorEsquerdo: PontoMarcador;
      superiorDireito: PontoMarcador;
      inferiorEsquerdo: PontoMarcador;
      inferiorDireito: PontoMarcador;
    },
    larguraImagem: number,
    alturaImagem: number,
  ): boolean {
    const {
      superiorEsquerdo: se,
      superiorDireito: sd,
      inferiorEsquerdo: ie,
      inferiorDireito: id,
    } = marcadores;

    /*
     * Ordem lógica básica.
     */
    if (se.x >= sd.x || ie.x >= id.x || se.y >= ie.y || sd.y >= id.y) {
      return false;
    }

    const larguraSuperior = Math.hypot(sd.x - se.x, sd.y - se.y);

    const larguraInferior = Math.hypot(id.x - ie.x, id.y - ie.y);

    const alturaEsquerda = Math.hypot(ie.x - se.x, ie.y - se.y);

    const alturaDireita = Math.hypot(id.x - sd.x, id.y - sd.y);

    /*
     * Os marcadores devem formar uma região suficientemente grande.
     */
    if (
      larguraSuperior < larguraImagem * 0.42 ||
      larguraInferior < larguraImagem * 0.42 ||
      alturaEsquerda < alturaImagem * 0.48 ||
      alturaDireita < alturaImagem * 0.48
    ) {
      return false;
    }

    const diferencaLargura =
      Math.abs(larguraSuperior - larguraInferior) /
      Math.max(larguraSuperior, larguraInferior);

    const diferencaAltura =
      Math.abs(alturaEsquerda - alturaDireita) /
      Math.max(alturaEsquerda, alturaDireita);

    /*
     * Tolerância maior para fotografias inclinadas.
     */
    if (diferencaLargura > 0.5 || diferencaAltura > 0.5) {
      return false;
    }

    return true;
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
    const raioInterno = Math.max(Math.round(bolha.raio * 0.4), 3);

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
      Object.entries(preenchimentos) as [Alternativa, number][]
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
    const preenchimentoMinimo = 0.4;

    /*
     * Duas alternativas só serão consideradas realmente marcadas
     * quando ambas tiverem preenchimento alto.
     */
    const preenchimentoMultiplo = 0.5;

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
  // private gerarCoordenadasIniciais(): CoordenadaBolha[] {
  //   const coordenadas: CoordenadaBolha[] = [];

  //   const alternativas: Alternativa[] = ['A', 'B', 'C', 'D'];

  //   const colunaEsquerdaX = [156, 214, 272, 332];

  //   const colunaDireitaX = [548, 604, 662, 720];

  //   const primeiraLinhaY = 478;
  //   const distanciaVertical = 40.7;
  //   const raio = 15;

  //   for (let questao = 1; questao <= 20; questao++) {
  //     const y = primeiraLinhaY + (questao - 1) * distanciaVertical;

  //     alternativas.forEach((alternativa, indice) => {
  //       coordenadas.push({
  //         questao,
  //         alternativa,
  //         x: colunaEsquerdaX[indice],
  //         y,
  //         raio,
  //       });
  //     });
  //   }

  //   for (let questao = 21; questao <= 40; questao++) {
  //     const y = primeiraLinhaY + (questao - 21) * distanciaVertical;

  //     alternativas.forEach((alternativa, indice) => {
  //       coordenadas.push({
  //         questao,
  //         alternativa,
  //         x: colunaDireitaX[indice],
  //         y,
  //         raio,
  //       });
  //     });
  //   }

  //   return coordenadas;
  // }

  private gerarCoordenadasIniciais(): CoordenadaBolha[] {
    const coordenadas: CoordenadaBolha[] = [];

    const alternativas: Alternativa[] = ['A', 'B', 'C', 'D'];

    /*
     * Coordenadas calibradas na imagem já corrigida
     * pelo warpPerspective para 1000 × 1414.
     *
     * Questões 1 até 20.
     */
    const colunaEsquerdaX = [
      139, // A
      202, // B
      263, // C
      324, // D
    ];
    // const colunaEsquerdaX = [
    //   151, // A
    //   211, // B
    //   270, // C
    //   330, // D
    // ];

    /*
     * Questões 21 até 40.
     */
    const colunaDireitaX = [
      547, // A
      609, // B
      670, // C
      733, // D
    ];
    // const colunaDireitaX = [
    //   563, // A
    //   623, // B
    //   683, // C
    //   743, // D
    // ];

    /*
     * Centro vertical da primeira linha:
     * questões 1 e 21.
     */
    const primeiraLinhaY = 466;

    /*
     * Distância entre o centro de uma questão
     * e o centro da questão seguinte.
     */
    const distanciaVertical = 41.8;

    const raio = 45;

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
