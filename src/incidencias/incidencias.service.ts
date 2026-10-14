import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, In, Repository } from 'typeorm';
import type { AuthUser } from '../auth/types/auth-user.type';
import { Cuadrilla, Obra, Usuario } from '../entities';
import { CambiarEstadoIncidenciaDto } from './dto/cambiar-estado-incidencia.dto';
import { ConsultarIncidenciasDto } from './dto/consultar-incidencias.dto';
import { CrearIncidenciaDto } from './dto/crear-incidencia.dto';
import { IncidenciaFoto } from './entities/incidencia-foto.entity';
import { Incidencia } from './entities/incidencia.entity';
import {
  assertPuedeAdjuntarFotos,
  assertPuedeCambiarEstado,
  assertTransicionEstado,
  incidenciaVisible,
  obraPermitida,
  resolverAmbito,
  type AmbitoIncidencias,
} from './incidencias.access';
import { MAX_FOTOS_POR_INCIDENCIA, ROL_GUARDIA } from './incidencias.constants';
import { sanearNombreArchivo, validarFotografia } from './incidencias.imagen';
import {
  aIso,
  presentarFoto,
  presentarIncidencia,
  type FotoDetalle,
  type IncidenciaCreada,
  type IncidenciaListada,
} from './incidencias.presenter';
import { IncidenciasStorageService } from './storage/incidencias-storage.service';

type FotoPreparada = {
  id: string;
  key: string;
  buffer: Buffer;
  mime: string;
  nombre: string;
};

@Injectable()
export class IncidenciasService {
  private readonly logger = new Logger(IncidenciasService.name);

  constructor(
    @InjectRepository(Incidencia)
    private readonly incidenciasRepository: Repository<Incidencia>,
    @InjectRepository(IncidenciaFoto)
    private readonly fotosRepository: Repository<IncidenciaFoto>,
    @InjectRepository(Obra)
    private readonly obrasRepository: Repository<Obra>,
    @InjectRepository(Cuadrilla)
    private readonly cuadrillasRepository: Repository<Cuadrilla>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly dataSource: DataSource,
    private readonly storage: IncidenciasStorageService,
  ) {}

  async crear(
    user: AuthUser,
    dto: CrearIncidenciaDto,
    archivos: Express.Multer.File[] = [],
  ): Promise<IncidenciaCreada> {
    const ambito = await this.ambitoDe(user);
    const obra = await this.obraVigenteAutorizada(ambito, dto.obra_id);
    this.assertCantidadSolicitud(archivos, 0);
    const incidenciaId = randomUUID();
    const preparadas = this.prepararArchivos(incidenciaId, archivos);

    const subidas: string[] = [];
    try {
      await this.subir(preparadas, subidas);
      const guardada = await this.dataSource.transaction(async (manager) => {
        const incidencias = manager.getRepository(Incidencia);
        const fotos = manager.getRepository(IncidenciaFoto);

        await incidencias.insert({
          id: incidenciaId,
          usuarioId: user.id,
          obraId: obra.id,
          titulo: dto.titulo,
          descripcion: dto.descripcion,
          estado: 'reportada',
        });

        if (preparadas.length > 0) {
          await fotos.insert(
            preparadas.map((foto) => ({
              id: foto.id,
              incidenciaId,
              archivoClave: foto.key,
              nombreArchivo: foto.nombre,
              tipoMime: foto.mime,
            })),
          );
        }

        const creada = await incidencias.findOneBy({ id: incidenciaId });
        const fotosGuardadas = await fotos.find({
          where: { incidenciaId },
          order: { fechaRegistro: 'ASC', id: 'ASC' },
        });

        if (!creada?.fechaRegistro) {
          throw new InternalServerErrorException(
            'La base no asignó la fecha de registro',
          );
        }

        return presentarIncidencia(creada, fotosGuardadas);
      });

      this.logger.log(
        `Incidencia ${guardada.id} registrada con ${guardada.fotos.length} fotografías`,
      );
      return guardada;
    } catch (error) {
      await this.storage.deleteObjects(subidas);
      throw this.errorDePersistencia(
        error,
        'No se pudo registrar la incidencia',
      );
    }
  }

  async listar(user: AuthUser, consulta: ConsultarIncidenciasDto) {
    const ambito = await this.ambitoDe(user);

    if (consulta.obra_id) {
      await this.obraVigenteAutorizada(ambito, consulta.obra_id);
    }

    const qb = this.incidenciasRepository.createQueryBuilder('i');
    this.aplicarAmbito(qb, ambito);

    if (consulta.obra_id) {
      qb.andWhere('i.obraId = :obraId', { obraId: consulta.obra_id });
    }
    if (consulta.estado) {
      qb.andWhere('i.estado = :estado', { estado: consulta.estado });
    }

    qb.orderBy('i.fechaRegistro', 'DESC').addOrderBy('i.id', 'DESC');

    const total = await qb.clone().getCount();
    const filas = await qb
      .skip((consulta.pagina - 1) * consulta.limite)
      .take(consulta.limite)
      .getMany();

    const data = await this.completarListado(filas);
    const totalPaginas = total === 0 ? 0 : Math.ceil(total / consulta.limite);

    return {
      data,
      meta: {
        pagina: consulta.pagina,
        limite: consulta.limite,
        total,
        total_paginas: totalPaginas,
      },
    };
  }

  async detalle(user: AuthUser, id: string) {
    const incidencia = await this.incidenciaVisible(user, id);
    const fotos = await this.fotosRepository.find({
      where: { incidenciaId: incidencia.id },
      order: { fechaRegistro: 'ASC', id: 'ASC' },
    });
    const nombreusuario = await this.nombreDe(incidencia.usuarioId);
    const fotosFirmadas: FotoDetalle[] = [];

    for (const foto of fotos) {
      const url = await this.storage.signedReadUrl(foto.archivoClave);
      fotosFirmadas.push({
        ...presentarFoto(foto),
        fecha_registro: aIso(foto.fechaRegistro),
        url,
      });
    }

    return {
      ...presentarIncidencia(incidencia, []),
      nombreusuario,
      fotos: fotosFirmadas,
    };
  }

  async cambiarEstado(
    user: AuthUser,
    id: string,
    dto: CambiarEstadoIncidenciaDto,
  ): Promise<IncidenciaCreada & { nombreusuario: string }> {
    const ambito = await this.ambitoDe(user);
    assertPuedeCambiarEstado(ambito);
    const incidencia = await this.incidenciaVisible(user, id);
    const estado = assertTransicionEstado(incidencia.estado, dto.estado);

    await this.incidenciasRepository.update({ id: incidencia.id }, { estado });
    const actualizada = await this.incidenciasRepository.findOneBy({
      id: incidencia.id,
    });
    if (!actualizada) {
      throw new NotFoundException('No se encontró la incidencia');
    }

    const fotos = await this.fotosRepository.find({
      where: { incidenciaId: incidencia.id },
      order: { fechaRegistro: 'ASC', id: 'ASC' },
    });

    this.logger.log(`Incidencia ${id} pasó a ${estado}`);

    return {
      ...presentarIncidencia(actualizada, fotos),
      nombreusuario: await this.nombreDe(actualizada.usuarioId),
    };
  }

  async agregarFotos(
    user: AuthUser,
    id: string,
    archivos: Express.Multer.File[] = [],
  ) {
    const ambito = await this.ambitoDe(user);
    this.assertCantidadSolicitud(archivos, 1);
    const visible = await this.incidenciaVisible(user, id);
    assertPuedeAdjuntarFotos(ambito, visible);

    const existentes = await this.fotosRepository.count({
      where: { incidenciaId: id },
    });
    if (existentes + archivos.length > MAX_FOTOS_POR_INCIDENCIA) {
      throw new ConflictException(
        'La incidencia no puede tener más de 5 fotografías',
      );
    }

    const preparadas = this.prepararArchivos(id, archivos);
    const subidas: string[] = [];

    try {
      await this.subir(preparadas, subidas);
      const fotos = await this.dataSource.transaction(async (manager) => {
        const fila = leerFila(
          await manager.query(
            `SELECT id, usuario_id, obra_id, estado
             FROM incidencias
             WHERE id = $1
             FOR UPDATE`,
            [id],
          ),
        );

        if (!fila) {
          throw new NotFoundException('No se encontró la incidencia');
        }

        const obra = await manager.getRepository(Obra).findOne({
          where: { id: fila.obra_id },
        });
        if (
          !incidenciaVisible(
            ambito,
            { usuarioId: fila.usuario_id, obraId: fila.obra_id },
            obra,
          )
        ) {
          throw new NotFoundException('No se encontró la incidencia');
        }

        assertPuedeAdjuntarFotos(ambito, {
          usuarioId: fila.usuario_id,
          estado: fila.estado,
        });

        const totalActual = leerTotal(
          await manager.query(
            `SELECT COUNT(*)::int AS total
             FROM incidencia_fotos
             WHERE incidencia_id = $1`,
            [id],
          ),
        );
        if (totalActual + preparadas.length > MAX_FOTOS_POR_INCIDENCIA) {
          throw new ConflictException(
            'La incidencia no puede tener más de 5 fotografías',
          );
        }

        await manager.getRepository(IncidenciaFoto).insert(
          preparadas.map((foto) => ({
            id: foto.id,
            incidenciaId: id,
            archivoClave: foto.key,
            nombreArchivo: foto.nombre,
            tipoMime: foto.mime,
          })),
        );

        return manager.getRepository(IncidenciaFoto).find({
          where: { id: In(preparadas.map((foto) => foto.id)) },
          order: { fechaRegistro: 'ASC', id: 'ASC' },
        });
      });

      this.logger.log(
        `Incidencia ${id}: se anexaron ${fotos.length} fotografías`,
      );

      return {
        fotos: fotos.map((foto) => ({
          ...presentarFoto(foto),
          fecha_registro: aIso(foto.fechaRegistro),
        })),
      };
    } catch (error) {
      await this.storage.deleteObjects(subidas);
      throw this.errorDePersistencia(
        error,
        'No se pudieron anexar las fotografías',
      );
    }
  }

  private async ambitoDe(user: AuthUser): Promise<AmbitoIncidencias> {
    if (user.rolId !== ROL_GUARDIA) {
      return resolverAmbito(user, null, null);
    }

    const cuadrilla =
      user.cuadrillaId == null
        ? null
        : await this.cuadrillasRepository.findOne({
            where: { id: user.cuadrillaId },
          });
    const obraAsignada = cuadrilla?.obraId
      ? await this.obrasRepository.findOne({ where: { id: cuadrilla.obraId } })
      : null;

    return resolverAmbito(user, cuadrilla, obraAsignada);
  }

  private async obraVigenteAutorizada(
    ambito: AmbitoIncidencias,
    obraId: string,
  ): Promise<Obra> {
    const obra = await this.obrasRepository.findOne({ where: { id: obraId } });
    if (!obra || !obra.vigente) {
      throw new NotFoundException('No se encontró la obra');
    }
    if (!obraPermitida(ambito, obra)) {
      throw new ForbiddenException('No tiene acceso a esta obra');
    }
    return obra;
  }

  private async incidenciaVisible(
    user: AuthUser,
    id: string,
  ): Promise<Incidencia> {
    const ambito = await this.ambitoDe(user);
    const incidencia = await this.incidenciasRepository.findOne({
      where: { id },
    });
    if (!incidencia) {
      throw new NotFoundException('No se encontró la incidencia');
    }

    const obra = await this.obrasRepository.findOne({
      where: { id: incidencia.obraId },
    });
    if (!incidenciaVisible(ambito, incidencia, obra)) {
      throw new NotFoundException('No se encontró la incidencia');
    }

    return incidencia;
  }

  private aplicarAmbito(
    qb: ReturnType<Repository<Incidencia>['createQueryBuilder']>,
    ambito: AmbitoIncidencias,
  ): void {
    if (ambito.tipo === 'administrador') {
      qb.innerJoin(Obra, 'obra', 'obra.id = i.obraId').andWhere(
        'obra.empresaId = :empresaId',
        { empresaId: ambito.empresaId },
      );
      return;
    }

    qb.andWhere('i.usuarioId = :usuarioId', {
      usuarioId: ambito.usuarioId,
    }).andWhere('i.obraId = :obraAsignada', { obraAsignada: ambito.obraId });
  }

  private async completarListado(
    filas: Incidencia[],
  ): Promise<IncidenciaListada[]> {
    if (filas.length === 0) {
      return [];
    }

    const ids = filas.map((fila) => fila.id);
    const usuarioIds = [...new Set(filas.map((fila) => fila.usuarioId))];
    const [conteos, usuarios] = await Promise.all([
      this.fotosRepository
        .createQueryBuilder('f')
        .select('f.incidenciaId', 'incidenciaId')
        .addSelect('COUNT(f.id)', 'cantidad')
        .where('f.incidenciaId IN (:...ids)', { ids })
        .groupBy('f.incidenciaId')
        .getRawMany<{
          incidenciaId?: string;
          incidenciaid?: string;
          cantidad: string;
        }>(),
      this.usuariosRepository.find({ where: { id: In(usuarioIds) } }),
    ]);

    const cantidades = new Map<string, number>();
    for (const conteo of conteos) {
      const incidenciaId = conteo.incidenciaId ?? conteo.incidenciaid;
      if (incidenciaId) {
        cantidades.set(incidenciaId, Number(conteo.cantidad));
      }
    }

    const nombres = new Map(
      usuarios.map((usuario) => [usuario.id, usuario.nombreUsuario]),
    );

    return filas.map((fila) => ({
      id: fila.id,
      titulo: fila.titulo,
      descripcion: fila.descripcion,
      estado: fila.estado,
      fecha_registro: aIso(fila.fechaRegistro),
      obra_id: fila.obraId,
      usuario_id: fila.usuarioId,
      nombreusuario: nombres.get(fila.usuarioId) ?? '',
      cantidad_fotos: cantidades.get(fila.id) ?? 0,
    }));
  }

  private async nombreDe(usuarioId: string): Promise<string> {
    const usuario = await this.usuariosRepository.findOne({
      where: { id: usuarioId },
    });
    return usuario?.nombreUsuario ?? '';
  }

  private assertCantidadSolicitud(
    archivos: Express.Multer.File[],
    minimo: number,
  ): void {
    if (archivos.length < minimo) {
      throw new BadRequestException('Debe adjuntar al menos una fotografía');
    }
    if (archivos.length > MAX_FOTOS_POR_INCIDENCIA) {
      throw new BadRequestException(
        'Se permiten como máximo 5 fotografías por solicitud',
      );
    }
  }

  private prepararArchivos(
    incidenciaId: string,
    archivos: Express.Multer.File[],
  ): FotoPreparada[] {
    return archivos.map((archivo) => {
      const detectada = validarFotografia(archivo);
      const id = randomUUID();
      return {
        id,
        key: `incidencias/${incidenciaId}/${id}${detectada.extension}`,
        buffer: archivo.buffer,
        mime: detectada.mime,
        nombre: sanearNombreArchivo(archivo.originalname),
      };
    });
  }

  private async subir(
    preparadas: FotoPreparada[],
    subidas: string[],
  ): Promise<void> {
    for (const foto of preparadas) {
      await this.storage.putObject(foto.key, foto.buffer, foto.mime);
      subidas.push(foto.key);
    }
  }

  private errorDePersistencia(error: unknown, mensaje: string): Error {
    if (error instanceof HttpException) {
      return error;
    }
    this.logger.error(
      `${mensaje} (${error instanceof Error ? error.name : 'Error'})`,
    );
    return new InternalServerErrorException(mensaje);
  }
}

function esLista(valor: unknown): valor is readonly unknown[] {
  return Array.isArray(valor);
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function leerFila(valor: unknown):
  | {
      id: string;
      usuario_id: string;
      obra_id: string;
      estado: string;
    }
  | undefined {
  if (!esLista(valor) || !esRegistro(valor[0])) {
    return undefined;
  }

  const fila = valor[0];
  if (
    typeof fila.id !== 'string' ||
    typeof fila.usuario_id !== 'string' ||
    typeof fila.obra_id !== 'string' ||
    typeof fila.estado !== 'string'
  ) {
    return undefined;
  }

  return {
    id: fila.id,
    usuario_id: fila.usuario_id,
    obra_id: fila.obra_id,
    estado: fila.estado,
  };
}

function leerTotal(valor: unknown): number {
  if (!esLista(valor) || !esRegistro(valor[0])) {
    return 0;
  }

  const total = valor[0].total;
  if (typeof total === 'number' && Number.isFinite(total)) {
    return total;
  }
  if (
    typeof total === 'string' &&
    total.trim() !== '' &&
    Number.isFinite(Number(total))
  ) {
    return Number(total);
  }
  return 0;
}
