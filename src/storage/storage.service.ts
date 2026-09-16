import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Guarda la foto de una asistencia y devuelve la URL pública relativa.
   *
   * TODO: Implementar almacenamiento en una instancia de S3 (AWS SDK / @aws-sdk/client-s3).
   *       Cuando esté listo, subir el buffer al bucket y devolver la URL del objeto;
   *       mantener esta misma firma para no cambiar el servicio de asistencias.
   *       De momento se guarda localmente en la carpeta de uploads.
   */
  async saveAsistenciaFoto(file: Express.Multer.File): Promise<string> {
    const uploadsDir =
      this.configService.get<string>('storage.uploadsDir') ?? 'uploads';
    const publicBasePath =
      this.configService.get<string>('storage.publicBasePath') ?? '/uploads';

    const folder = join(uploadsDir, 'asistencias');
    await mkdir(folder, { recursive: true });

    const extension = this.resolveExtension(file);
    const filename = `${randomUUID()}${extension}`;
    const absolutePath = join(folder, filename);

    await writeFile(absolutePath, file.buffer);

    return `${publicBasePath}/asistencias/${filename}`;
  }

  private resolveExtension(file: Express.Multer.File): string {
    const fromName = extname(file.originalname || '').toLowerCase();
    if (fromName && fromName.length <= 8) {
      return fromName;
    }

    switch (file.mimetype) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/gif':
        return '.gif';
      default:
        return '.jpg';
    }
  }
}
