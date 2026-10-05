import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RutasService } from './rutas.service';

@Injectable()
export class RutasWorker {
  private readonly logger = new Logger(RutasWorker.name);
  private running = false;

  constructor(private readonly rutasService: RutasService) {}

  @Interval(45000)
  async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const procesados = await this.rutasService.procesarPendientes();
      if (procesados > 0) {
        this.logger.debug(`Rutas reconstruidas: ${procesados}`);
      }
    } catch (error) {
      this.logger.warn(`Error en RutasWorker: ${String(error)}`);
    } finally {
      this.running = false;
    }
  }
}
