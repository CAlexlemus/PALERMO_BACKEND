import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { URL_FIRMADA_SEGUNDOS } from '../incidencias.constants';

type S3Settings = {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

/**
 * Subida mediada por el backend (PutObject). El cliente no recibe credenciales.
 *
 * Mejora futura, no implementada: presigned PUT para que el navegador suba
 * directo al bucket. Exigiría CORS en el bucket y un segundo paso de confirmación.
 */
@Injectable()
export class IncidenciasStorageService {
  private readonly logger = new Logger(IncidenciasStorageService.name);
  private client: S3Client | null = null;
  private bucket: string | null = null;

  constructor(private readonly configService: ConfigService) {}

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    const { client, bucket } = this.requireClient();

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    } catch (error) {
      this.logger.error(
        `No se pudo subir el objeto de incidencia (${this.codigoError(error)})`,
      );
      throw new ServiceUnavailableException(
        'No se pudo almacenar la fotografía',
      );
    }
  }

  async signedReadUrl(key: string): Promise<string> {
    const { client, bucket } = this.requireClient();

    try {
      return await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn: URL_FIRMADA_SEGUNDOS },
      );
    } catch (error) {
      this.logger.error(
        `No se pudo firmar la lectura de incidencia (${this.codigoError(error)})`,
      );
      throw new ServiceUnavailableException(
        'No se pudo generar el enlace de la fotografía',
      );
    }
  }

  /** Limpieza best-effort. No relanza: el error de negocio original debe prevalecer. */
  async deleteObjects(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    const settings = this.readSettings();
    if (!settings || !this.client) {
      this.logger.error(
        `No se pudieron limpiar ${keys.length} objetos: almacenamiento no configurado`,
      );
      return;
    }

    for (const key of keys) {
      try {
        await this.client.send(
          new DeleteObjectCommand({ Bucket: settings.bucket, Key: key }),
        );
      } catch (error) {
        this.logger.error(
          `No se pudo eliminar un objeto de incidencia (${this.codigoError(error)})`,
        );
      }
    }
  }

  private requireClient(): { client: S3Client; bucket: string } {
    const settings = this.readSettings();
    if (!settings) {
      throw new ServiceUnavailableException(
        'El almacenamiento de fotografías no está configurado',
      );
    }

    if (!this.client || this.bucket !== settings.bucket) {
      this.client = new S3Client({
        region: settings.region,
        endpoint: settings.endpoint,
        credentials: {
          accessKeyId: settings.accessKeyId,
          secretAccessKey: settings.secretAccessKey,
        },
        forcePathStyle: settings.forcePathStyle,
      });
      this.bucket = settings.bucket;
    }

    return { client: this.client, bucket: settings.bucket };
  }

  private readSettings(): S3Settings | null {
    const endpoint = this.configService.get<string>('s3.endpoint');
    const bucket = this.configService.get<string>('s3.bucket');
    const accessKeyId = this.configService.get<string>('s3.accessKeyId');
    const secretAccessKey =
      this.configService.get<string>('s3.secretAccessKey');
    const region = this.configService.get<string>('s3.region') || 'auto';
    const forcePathStyle =
      this.configService.get<boolean>('s3.forcePathStyle') === true;

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      return null;
    }

    return {
      endpoint,
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      forcePathStyle,
    };
  }

  private codigoError(error: unknown): string {
    if (error && typeof error === 'object' && 'name' in error) {
      return String(error.name);
    }
    return 'Error';
  }
}
