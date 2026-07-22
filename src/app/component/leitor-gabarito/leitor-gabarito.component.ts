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
        20,
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

  private localizarMarcadoresDeCanto(origem: any): {
    superiorEsquerdo: PontoMarcador;
    superiorDireito: PontoMarcador;
    inferiorEsquerdo: PontoMarcador;
    inferiorDireito: PontoMarcador;
  } | null {
    const largura = origem.cols;
    const altura = origem.rows;

    /*
     * Analisa somente 18% da largura e 14% da altura
     * de cada extremidade da fotografia.
     */
    const larguraRegiao = Math.round(largura * 0.22);

    const alturaRegiao = Math.round(altura * 0.18);

    const superiorEsquerdo = this.localizarBlocoPretoNoCanto(
      origem,
      new this.cv.Rect(0, 0, larguraRegiao, alturaRegiao),
      'superior esquerdo',
      'superior-esquerdo',
    );

    const superiorDireito = this.localizarBlocoPretoNoCanto(
      origem,
      new this.cv.Rect(largura - larguraRegiao, 0, larguraRegiao, alturaRegiao),
      'superior direito',
      'superior-direito',
    );

    const inferiorEsquerdo = this.localizarBlocoPretoNoCanto(
      origem,
      new this.cv.Rect(0, altura - alturaRegiao, larguraRegiao, alturaRegiao),
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

    console.log('Marcadores selecionados:', {
      superiorEsquerdo,
      superiorDireito,
      inferiorEsquerdo,
      inferiorDireito,
    });

    if (
      !superiorEsquerdo ||
      !superiorDireito ||
      !inferiorEsquerdo ||
      !inferiorDireito
    ) {
      console.error('Não foram encontrados os quatro marcadores.', {
        superiorEsquerdo,
        superiorDireito,
        inferiorEsquerdo,
        inferiorDireito,
      });

      return null;
    }

    const marcadores = {
      superiorEsquerdo,
      superiorDireito,
      inferiorEsquerdo,
      inferiorDireito,
    };

    this.ultimosMarcadores = marcadores;

    return marcadores;
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
    Math.round(
      Math.min(origem.cols, origem.rows) * 0.006,
    ),
    6,
  );

  const larguraBusca =
    regiao.width - margemExterna * 2;

  const alturaBusca =
    regiao.height - margemExterna * 2;

  if (
    larguraBusca <= 0 ||
    alturaBusca <= 0
  ) {
    recorte.delete();
    cinza.delete();
    suavizada.delete();
    binaria.delete();
    fechada.delete();
    distancia.delete();

    return null;
  }

  const kernelFechamento =
    this.cv.getStructuringElement(
      this.cv.MORPH_RECT,
      new this.cv.Size(7, 7),
    );

  let areaBusca: any = null;
  let binariaBusca: any = null;

  try {
    this.cv.cvtColor(
      recorte,
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
     * O OTSU adapta o limite à iluminação da fotografia.
     * As regiões escuras passam a ser brancas.
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
    this.cv.distanceTransform(
      areaBusca,
      distancia,
      this.cv.DIST_L2,
      5,
    );

    const resultado =
      this.cv.minMaxLoc(distancia);

    const distanciaMaxima =
      resultado.maxVal;

    const pontoMaximo =
      resultado.maxLoc;

    /*
     * O raio interno esperado do marcador deve ocupar pelo
     * menos cerca de 0,6% da menor dimensão da fotografia.
     */
    const distanciaMinima =
      Math.min(
        origem.cols,
        origem.rows,
      ) * 0.006;

    console.log(
      `Marcador ${nome}:`,
      {
        canto,
        xLocal:
          pontoMaximo.x,
        yLocal:
          pontoMaximo.y,
        distanciaMaxima,
        distanciaMinima,
      },
    );

    if (
      distanciaMaxima <
      distanciaMinima
    ) {
      console.warn(
        `Nenhum bloco preto suficientemente espesso foi encontrado no canto ${nome}.`,
      );

      return null;
    }

    const x =
      regiao.x +
      margemExterna +
      pontoMaximo.x;

    const y =
      regiao.y +
      margemExterna +
      pontoMaximo.y;

    /*
     * Área estimada somente para diagnóstico.
     * O warpPerspective usa apenas x e y.
     */
    const ladoEstimado =
      distanciaMaxima * 2;

    const areaEstimada =
      ladoEstimado *
      ladoEstimado;

    console.log(
      `Marcador confirmado — ${nome}:`,
      {
        x: Math.round(x),
        y: Math.round(y),
        distanciaMaxima:
          Number(
            distanciaMaxima.toFixed(2),
          ),
        ladoEstimado:
          Number(
            ladoEstimado.toFixed(2),
          ),
      },
    );

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
      larguraSuperior < larguraImagem * 0.5 ||
      larguraInferior < larguraImagem * 0.5 ||
      alturaEsquerda < alturaImagem * 0.55 ||
      alturaDireita < alturaImagem * 0.55
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
    const preenchimentoMinimo = 0.40;

    /*
     * Duas alternativas só serão consideradas realmente marcadas
     * quando ambas tiverem preenchimento alto.
     */
    const preenchimentoMultiplo = 0.50;

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

  const alternativas: Alternativa[] = [
    'A',
    'B',
    'C',
    'D',
  ];

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

  for (
    let questao = 1;
    questao <= 20;
    questao++
  ) {
    const y =
      primeiraLinhaY +
      (questao - 1) *
        distanciaVertical;

    alternativas.forEach(
      (alternativa, indice) => {
        coordenadas.push({
          questao,
          alternativa,
          x: colunaEsquerdaX[indice],
          y,
          raio,
        });
      },
    );
  }

  for (
    let questao = 21;
    questao <= 40;
    questao++
  ) {
    const y =
      primeiraLinhaY +
      (questao - 21) *
        distanciaVertical;

    alternativas.forEach(
      (alternativa, indice) => {
        coordenadas.push({
          questao,
          alternativa,
          x: colunaDireitaX[indice],
          y,
          raio,
        });
      },
    );
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
