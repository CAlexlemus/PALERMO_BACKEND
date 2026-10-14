import { extname } from 'path';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { MAX_FOTO_BYTES } from './incidencias.constants';

export type ImagenDetectada = {
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: '.jpg' | '.png' | '.webp';
};

const EXTENSIONES: Record<ImagenDetectada['mime'], string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

/** Firma real del archivo. No confía en Content-Type ni en la extensión. */
export function detectarImagen(buffer: Buffer): ImagenDetectada | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { mime: 'image/jpeg', extension: '.jpg' };
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', extension: '.png' };
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mime: 'image/webp', extension: '.webp' };
  }

  return null;
}

export function sanearNombreArchivo(original: string): string {
  const base = original.split(/[/\\]/).pop()?.trim() || 'foto';
  const limpio = base.replace(/[^\w.\- ()]/g, '_').slice(0, 255);
  return limpio || 'foto';
}

export function validarFotografia(file: Express.Multer.File): ImagenDetectada {
  if (!file?.buffer?.length) {
    throw new BadRequestException('La fotografía está vacía o no es válida');
  }

  if (file.size > MAX_FOTO_BYTES || file.buffer.length > MAX_FOTO_BYTES) {
    throw new PayloadTooLargeException(
      'Cada fotografía debe pesar como máximo 5 MiB',
    );
  }

  const detectada = detectarImagen(file.buffer);
  if (!detectada) {
    throw new BadRequestException(
      'Solo se permiten imágenes JPEG, PNG o WebP. SVG y otros tipos están prohibidos',
    );
  }

  const extension = extname(file.originalname || '').toLowerCase();
  if (!EXTENSIONES[detectada.mime].includes(extension)) {
    throw new BadRequestException(
      'La extensión del archivo no coincide con su contenido',
    );
  }

  if (file.mimetype !== detectada.mime) {
    throw new BadRequestException(
      'El tipo MIME declarado no coincide con el contenido de la imagen',
    );
  }

  return detectada;
}
