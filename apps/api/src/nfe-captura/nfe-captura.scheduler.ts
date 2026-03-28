import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NfeCapturaService } from './nfe-captura.service';

@Injectable()
export class NfeCapturaScheduler {
  private readonly logger = new Logger(NfeCapturaScheduler.name);
  private rodando = false;

  constructor(private readonly nfeCapturaService: NfeCapturaService) {}

  /** Executa a cada hora (respeitando o intervalo mínimo da SEFAZ) */
  @Cron('0 0 * * * *')
  async executarCaptura(): Promise<void> {
    if (this.rodando) {
      this.logger.warn('Captura anterior ainda em andamento, pulando ciclo.');
      return;
    }

    this.rodando = true;
    this.logger.log('Iniciando ciclo de captura DF-e...');

    try {
      await this.nfeCapturaService.capturarTodasEmpresas();
      this.logger.log('Ciclo de captura DF-e concluído.');
    } catch (err) {
      this.logger.error(`Erro no ciclo de captura: ${(err as Error).message}`);
    } finally {
      this.rodando = false;
    }
  }
}
