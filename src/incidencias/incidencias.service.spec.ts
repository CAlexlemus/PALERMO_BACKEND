/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await */
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
  TypeOrmModule: { forFeature: jest.fn() },
}));

jest.mock('./storage/incidencias-storage.service', () => ({
  IncidenciasStorageService: class IncidenciasStorageService {},
}));

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import type { AuthUser } from '../auth/types/auth-user.type';
import { Obra } from '../entities';
import { CrearIncidenciaDto } from './dto/crear-incidencia.dto';
import { ConsultarIncidenciasDto } from './dto/consultar-incidencias.dto';
import { IncidenciaFoto } from './entities/incidencia-foto.entity';
import { Incidencia } from './entities/incidencia.entity';
import { MAX_FOTO_BYTES } from './incidencias.constants';
import { IncidenciasService } from './incidencias.service';

const OBRA = '11111111-1111-4111-8111-111111111111';
const OTRA_OBRA = '22222222-2222-4222-8222-222222222222';
const EMPRESA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FECHA = new Date('2026-10-14T04:00:00.000Z');

function usuario(partial: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'usuario-1',
    nombreUsuario: 'carlos',
    rolId: 1,
    jefeId: null,
    cuadrillaId: null,
    turnoId: null,
    empresaId: EMPRESA,
    requiereFoto: null,
    requiereUbicacion: null,
    ...partial,
  };
}

function obra(partial: Partial<Obra> = {}): Obra {
  return {
    id: OBRA,
    nombre: 'Palermo',
    empresaId: EMPRESA,
    ubicacion: { type: 'Point', coordinates: [0, 0] },
    radioMetros: 50,
    requiereFoto: null,
    requiereUbicacion: null,
    vigente: true,
    ...partial,
  };
}

function jpeg(nombre = 'porton.jpg'): Express.Multer.File {
  const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  return {
    fieldname: 'fotos',
    originalname: nombre,
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: buffer.length,
    buffer,
    stream: null as never,
    destination: '',
    filename: '',
    path: '',
  };
}

function build() {
  const incidenciasRepo = {
    insert: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const fotosRepo = {
    insert: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn(),
  };
  const obras = { findOne: jest.fn() };
  const cuadrillas = { findOne: jest.fn() };
  const usuarios = {
    findOne: jest
      .fn()
      .mockResolvedValue({ id: 'usuario-1', nombreUsuario: 'carlos' }),
    find: jest
      .fn()
      .mockResolvedValue([{ id: 'usuario-1', nombreUsuario: 'carlos' }]),
  };
  const storage = {
    putObject: jest.fn().mockResolvedValue(undefined),
    deleteObjects: jest.fn().mockResolvedValue(undefined),
    signedReadUrl: jest
      .fn()
      .mockResolvedValue('https://signed.example/lectura'),
  };
  const manager = {
    getRepository: (entity: unknown) => {
      if (entity === Incidencia) return incidenciasRepo;
      if (entity === IncidenciaFoto) return fotosRepo;
      if (entity === Obra) return obras;
      throw new Error('repositorio no preparado');
    },
    query: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(async (fn: (m: typeof manager) => Promise<unknown>) =>
      fn(manager),
    ),
  };

  const service = new IncidenciasService(
    incidenciasRepo as never,
    fotosRepo as never,
    obras as never,
    cuadrillas as never,
    usuarios as never,
    dataSource as never,
    storage as never,
  );

  return {
    service,
    incidenciasRepo,
    fotosRepo,
    obras,
    cuadrillas,
    usuarios,
    storage,
    manager,
    dataSource,
  };
}

describe('IncidenciasService', () => {
  const dto = {
    titulo: 'Portón principal dañado',
    descripcion: 'La cerradura no funciona durante el rondín.',
    obra_id: OBRA,
  };

  it('crea una incidencia sin fotos en estado reportada y con fecha de la base', async () => {
    const { service, obras, incidenciasRepo, fotosRepo, storage } = build();
    obras.findOne.mockResolvedValue(obra());
    incidenciasRepo.findOneBy.mockImplementation(
      async ({ id }: { id: string }) => ({
        id,
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        estado: 'reportada',
        obraId: OBRA,
        usuarioId: 'usuario-1',
        fechaRegistro: FECHA,
      }),
    );

    const creada = await service.crear(usuario(), dto, []);

    expect(creada.estado).toBe('reportada');
    expect(creada.usuario_id).toBe('usuario-1');
    expect(creada.fecha_registro).toBe('2026-10-14T04:00:00.000Z');
    expect(creada.fotos).toEqual([]);
    expect(storage.putObject).not.toHaveBeenCalled();
    const insertado = incidenciasRepo.insert.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(insertado.usuarioId).toBe('usuario-1');
    expect(insertado.estado).toBe('reportada');
    expect(insertado).not.toHaveProperty('fechaRegistro');
    expect(fotosRepo.insert).not.toHaveBeenCalled();
  });

  it('sube 1 y 5 fotos con claves generadas en el servidor', async () => {
    const { service, obras, incidenciasRepo, fotosRepo, storage } = build();
    obras.findOne.mockResolvedValue(obra());
    incidenciasRepo.findOneBy.mockImplementation(
      async ({ id }: { id: string }) => ({
        id,
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        estado: 'reportada',
        obraId: OBRA,
        usuarioId: 'usuario-1',
        fechaRegistro: FECHA,
      }),
    );
    fotosRepo.find.mockImplementation(async () =>
      (fotosRepo.insert.mock.calls.at(-1)?.[0] as Array<{ id: string }>).map(
        (foto) => ({
          ...foto,
          nombreArchivo: 'porton.jpg',
          tipoMime: 'image/jpeg',
          fechaRegistro: FECHA,
        }),
      ),
    );

    const una = await service.crear(usuario(), dto, [jpeg()]);
    expect(una.fotos).toHaveLength(1);
    expect(storage.putObject).toHaveBeenCalledTimes(1);
    const clave = storage.putObject.mock.calls[0][0] as string;
    expect(clave).toMatch(/^incidencias\/[0-9a-f-]+\/[0-9a-f-]+\.jpg$/);
    expect(clave).not.toContain('porton');

    await service.crear(usuario(), dto, [
      jpeg(),
      jpeg(),
      jpeg(),
      jpeg(),
      jpeg(),
    ]);
    expect(storage.putObject).toHaveBeenCalledTimes(6);
  });

  it('rechaza 6 fotos, tamaño, MIME, extensión y firma', async () => {
    const { service, obras, storage } = build();
    obras.findOne.mockResolvedValue(obra());
    const seis = Array.from({ length: 6 }, () => jpeg());
    await expect(service.crear(usuario(), dto, seis)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    const grande = jpeg();
    grande.size = MAX_FOTO_BYTES + 1;
    await expect(
      service.crear(usuario(), dto, [grande]),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);

    const mime = jpeg();
    mime.mimetype = 'image/gif';
    await expect(service.crear(usuario(), dto, [mime])).rejects.toBeInstanceOf(
      BadRequestException,
    );

    const extension = jpeg('porton.png');
    await expect(
      service.crear(usuario(), dto, [extension]),
    ).rejects.toBeInstanceOf(BadRequestException);

    const falsa = jpeg();
    falsa.buffer = Buffer.from('no-es-imagen');
    await expect(service.crear(usuario(), dto, [falsa])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('rechaza obra inexistente y el guardia no usa otra obra', async () => {
    const admin = build();
    admin.obras.findOne.mockResolvedValue(null);
    await expect(
      admin.service.crear(usuario(), dto, []),
    ).rejects.toBeInstanceOf(NotFoundException);

    const guardia = build();
    guardia.cuadrillas.findOne.mockResolvedValue({ id: 10, obraId: OBRA });
    guardia.obras.findOne.mockImplementation(async ({ id }: { id: string }) =>
      id === OBRA ? obra() : obra({ id: OTRA_OBRA }),
    );
    await expect(
      guardia.service.crear(
        usuario({ rolId: 2, cuadrillaId: 10 }),
        { ...dto, obra_id: OTRA_OBRA },
        [],
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('toma usuario_id del JWT y el DTO rechaza campos del cliente', async () => {
    const { service, obras, incidenciasRepo } = build();
    obras.findOne.mockResolvedValue(obra());
    incidenciasRepo.findOneBy.mockImplementation(
      async ({ id }: { id: string }) => ({
        id,
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        estado: 'reportada',
        obraId: OBRA,
        usuarioId: 'guardia-9',
        fechaRegistro: FECHA,
      }),
    );

    await service.crear(usuario({ id: 'guardia-9', rolId: 1 }), dto, []);
    expect(incidenciasRepo.insert.mock.calls[0][0]).toMatchObject({
      usuarioId: 'guardia-9',
      estado: 'reportada',
    });

    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    await expect(
      pipe.transform(
        {
          ...dto,
          usuario_id: 'otro',
          estado: 'resuelta',
          fecha_registro: FECHA.toISOString(),
        },
        { type: 'body', metatype: CrearIncidenciaDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      pipe.transform(
        { ...dto, titulo: '  ', descripcion: '     ' },
        { type: 'body', metatype: CrearIncidenciaDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      pipe.transform(
        { ...dto, obra_id: 'no-uuid' },
        { type: 'body', metatype: CrearIncidenciaDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('oculta incidencias ajenas al guardia y obras de otra empresa al administrador', async () => {
    const ajena = build();
    ajena.cuadrillas.findOne.mockResolvedValue({ id: 10, obraId: OBRA });
    ajena.obras.findOne.mockResolvedValue(obra());
    ajena.incidenciasRepo.findOne.mockResolvedValue({
      id: 'inc-1',
      usuarioId: 'otro',
      obraId: OBRA,
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      estado: 'reportada',
      fechaRegistro: FECHA,
    });

    await expect(
      ajena.service.detalle(usuario({ rolId: 2, cuadrillaId: 10 }), 'inc-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    const otraEmpresa = build();
    otraEmpresa.obras.findOne.mockResolvedValue(
      obra({ empresaId: 'empresa-2' }),
    );
    await expect(
      otraEmpresa.service.crear(usuario(), dto, []),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lista paginada y filtrada dentro del ámbito', async () => {
    const { service, obras, incidenciasRepo, fotosRepo } = build();
    obras.findOne.mockResolvedValue(obra());
    const filtros: unknown[] = [];
    const qb = {
      innerJoin: jest.fn(() => qb),
      andWhere: jest.fn((sql: string, params: unknown) => {
        filtros.push([sql, params]);
        return qb;
      }),
      orderBy: jest.fn(() => qb),
      addOrderBy: jest.fn(() => qb),
      clone: jest.fn(() => qb),
      getCount: jest.fn(async () => 1),
      skip: jest.fn(() => qb),
      take: jest.fn(() => qb),
      getMany: jest.fn(async () => [
        {
          id: 'inc-1',
          titulo: dto.titulo,
          descripcion: dto.descripcion,
          estado: 'reportada',
          fechaRegistro: FECHA,
          obraId: OBRA,
          usuarioId: 'usuario-1',
        },
      ]),
    };
    incidenciasRepo.createQueryBuilder.mockReturnValue(qb);
    const conteo = {
      select: jest.fn(() => conteo),
      addSelect: jest.fn(() => conteo),
      where: jest.fn(() => conteo),
      groupBy: jest.fn(() => conteo),
      getRawMany: jest.fn(async () => [
        { incidenciaId: 'inc-1', cantidad: '1' },
      ]),
    };
    fotosRepo.createQueryBuilder.mockReturnValue(conteo);

    const pipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });
    const consulta = await pipe.transform(
      { pagina: '2', limite: '10', obra_id: OBRA, estado: 'reportada' },
      { type: 'query', metatype: ConsultarIncidenciasDto },
    );
    await expect(
      pipe.transform(
        { limite: '101', estado: 'cerrada' },
        { type: 'query', metatype: ConsultarIncidenciasDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const pagina = await service.listar(usuario(), consulta);
    expect(pagina.meta).toEqual({
      pagina: 2,
      limite: 10,
      total: 1,
      total_paginas: 1,
    });
    expect(pagina.data[0].cantidad_fotos).toBe(1);
    expect(pagina.data[0].nombreusuario).toBe('carlos');
    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.orderBy).toHaveBeenCalledWith('i.fechaRegistro', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('i.id', 'DESC');
    expect(JSON.stringify(filtros)).toContain('reportada');
    expect(JSON.stringify(filtros)).toContain(EMPRESA);
  });

  it('solo el administrador cambia el estado y solo con la transición válida', async () => {
    const guardia = build();
    guardia.cuadrillas.findOne.mockResolvedValue({ id: 10, obraId: OBRA });
    guardia.obras.findOne.mockResolvedValue(obra());
    await expect(
      guardia.service.cambiarEstado(
        usuario({ rolId: 2, cuadrillaId: 10 }),
        'inc-1',
        { estado: 'en_revision' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const admin = build();
    admin.obras.findOne.mockResolvedValue(obra());
    admin.incidenciasRepo.findOne.mockResolvedValue({
      id: 'inc-1',
      usuarioId: 'usuario-1',
      obraId: OBRA,
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      estado: 'reportada',
      fechaRegistro: FECHA,
    });
    await expect(
      admin.service.cambiarEstado(usuario(), 'inc-1', { estado: 'resuelta' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    admin.incidenciasRepo.findOneBy.mockResolvedValue({
      id: 'inc-1',
      usuarioId: 'usuario-1',
      obraId: OBRA,
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      estado: 'en_revision',
      fechaRegistro: FECHA,
    });
    const actualizada = await admin.service.cambiarEstado(usuario(), 'inc-1', {
      estado: 'en_revision',
    });
    expect(actualizada.estado).toBe('en_revision');
    expect(admin.incidenciasRepo.update).toHaveBeenCalledWith(
      { id: 'inc-1' },
      { estado: 'en_revision' },
    );
  });

  it('compensa objetos si falla S3 o la base', async () => {
    const s3 = build();
    s3.obras.findOne.mockResolvedValue(obra());
    s3.storage.putObject
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ServiceUnavailableException('almacen'));
    await expect(
      s3.service.crear(usuario(), dto, [jpeg(), jpeg()]),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(s3.storage.deleteObjects).toHaveBeenCalledWith([
      expect.stringMatching(/^incidencias\//),
    ]);
    expect(s3.dataSource.transaction).not.toHaveBeenCalled();

    const db = build();
    db.obras.findOne.mockResolvedValue(obra());
    db.incidenciasRepo.insert.mockRejectedValue(new Error('db'));
    await expect(
      db.service.crear(usuario(), dto, [jpeg()]),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(db.storage.deleteObjects).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(db.storage.deleteObjects.mock.calls)).not.toContain(
      'https://signed',
    );
  });

  it('regenera la URL firmada en el detalle y no revela la clave ni secretos', async () => {
    const { service, obras, incidenciasRepo, fotosRepo, storage } = build();
    obras.findOne.mockResolvedValue(obra());
    incidenciasRepo.findOne.mockResolvedValue({
      id: 'inc-1',
      usuarioId: 'usuario-1',
      obraId: OBRA,
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      estado: 'reportada',
      fechaRegistro: FECHA,
    });
    fotosRepo.find.mockResolvedValue([
      {
        id: 'foto-1',
        incidenciaId: 'inc-1',
        archivoClave: 'incidencias/inc-1/foto-1.jpg',
        nombreArchivo: 'porton.jpg',
        tipoMime: 'image/jpeg',
        fechaRegistro: FECHA,
      },
    ]);

    const detalle = await service.detalle(usuario(), 'inc-1');
    expect(storage.signedReadUrl).toHaveBeenCalledWith(
      'incidencias/inc-1/foto-1.jpg',
    );
    expect(detalle.fotos[0].url).toBe('https://signed.example/lectura');
    const json = JSON.stringify(detalle);
    expect(json).not.toContain('archivo_clave');
    expect(json).not.toContain('archivoClave');
    expect(json).not.toContain('secret');
    expect(json).not.toContain('AWS_');
  });

  it('respeta el límite total de fotos aunque el conteo previo quede desactualizado', async () => {
    const { service, obras, incidenciasRepo, fotosRepo, storage, manager } =
      build();
    obras.findOne.mockResolvedValue(obra());
    incidenciasRepo.findOne.mockResolvedValue({
      id: 'inc-1',
      usuarioId: 'usuario-1',
      obraId: OBRA,
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      estado: 'reportada',
      fechaRegistro: FECHA,
    });
    fotosRepo.count.mockResolvedValue(4);
    const guardadas = 5;
    manager.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) {
        return [
          {
            id: 'inc-1',
            usuario_id: 'usuario-1',
            obra_id: OBRA,
            estado: 'reportada',
          },
        ];
      }
      if (sql.includes('COUNT')) {
        return [{ total: guardadas }];
      }
      return [];
    });

    await expect(
      service.agregarFotos(usuario(), 'inc-1', [jpeg()]),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(storage.putObject).toHaveBeenCalledTimes(1);
    expect(storage.deleteObjects).toHaveBeenCalledTimes(1);
    expect(fotosRepo.insert).not.toHaveBeenCalled();
    expect(String(manager.query.mock.calls[0][0])).toContain('FOR UPDATE');
  });
});
