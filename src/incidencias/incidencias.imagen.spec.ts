import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { MAX_FOTO_BYTES } from './incidencias.constants';
import { detectarImagen, validarFotografia } from './incidencias.imagen';

function archivo(
  buffer: Buffer,
  originalname: string,
  mimetype: string,
  size = buffer.length,
): Express.Multer.File {
  return {
    fieldname: 'fotos',
    originalname,
    encoding: '7bit',
    mimetype,
    size,
    buffer,
    stream: null as never,
    destination: '',
    filename: '',
    path: '',
  };
}

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const webp = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP'),
]);

describe('validación de fotografías', () => {
  it('acepta JPEG, PNG y WebP con firma real', () => {
    expect(detectarImagen(jpeg)?.mime).toBe('image/jpeg');
    expect(detectarImagen(png)?.mime).toBe('image/png');
    expect(detectarImagen(webp)?.mime).toBe('image/webp');
    expect(
      validarFotografia(archivo(jpeg, 'porton.jpg', 'image/jpeg')).extension,
    ).toBe('.jpg');
    expect(
      validarFotografia(archivo(jpeg, 'porton.jpeg', 'image/jpeg')).extension,
    ).toBe('.jpg');
    expect(
      validarFotografia(archivo(png, 'porton.png', 'image/png')).extension,
    ).toBe('.png');
    expect(
      validarFotografia(archivo(webp, 'porton.webp', 'image/webp')).extension,
    ).toBe('.webp');
  });

  it('rechaza MIME no permitido, extensión falsa, firma falsa y SVG', () => {
    expect(() =>
      validarFotografia(archivo(jpeg, 'porton.jpg', 'image/gif')),
    ).toThrow(BadRequestException);
    expect(() =>
      validarFotografia(archivo(jpeg, 'porton.png', 'image/jpeg')),
    ).toThrow(BadRequestException);
    expect(() =>
      validarFotografia(
        archivo(Buffer.from('<svg></svg>'), 'icono.svg', 'image/svg+xml'),
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      validarFotografia(
        archivo(Buffer.from('not-an-image'), 'foto.jpg', 'image/jpeg'),
      ),
    ).toThrow(BadRequestException);
  });

  it('rechaza archivos mayores a 5 MiB', () => {
    expect(() =>
      validarFotografia(
        archivo(jpeg, 'grande.jpg', 'image/jpeg', MAX_FOTO_BYTES + 1),
      ),
    ).toThrow(PayloadTooLargeException);
  });
});
