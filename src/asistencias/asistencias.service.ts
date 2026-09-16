import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { EstadoAsistencia } from '../common/enums';
import { Obra, RegistroAsistencia, Rol, Usuario } from '../entities';
import { StorageService } from '../storage/storage.service';
import { CreateAsistenciaDto } from './dto/create-asistencia.dto';

export type RequisitosAsistencia = {
  requiereFoto: boolean;
  requiereUbicacion: boolean;
  origenFoto: 'usuario' | 'obra' | 'rol' | 'default';
  origenUbicacion: 'usuario' | 'obra' | 'rol' | 'default';
};

@Injectable()
export class AsistenciasService {
  constructor(
    @InjectRepository(RegistroAsistencia)
    private readonly asistenciasRepository: Repository<RegistroAsistencia>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Obra)
    private readonly obrasRepository: Repository<Obra>,
    @InjectRepository(Rol)
    private readonly rolesRepository: Repository<Rol>,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Resuelve requisitos en cascada: usuario → obra → rol.
   * El primer valor no nulo gana; si todos son null, el requisito es false.
   */
  resolverRequisitos(
    usuario: Pick<Usuario, 'requiereFoto' | 'requiereUbicacion'>,
    obra: Pick<Obra, 'requiereFoto' | 'requiereUbicacion'>,
    rol: Pick<Rol, 'requiereFoto' | 'requiereUbicacion'> | null,
  ): RequisitosAsistencia {
    const foto = this.resolverBandera(
      usuario.requiereFoto,
      obra.requiereFoto,
      rol?.requiereFoto ?? null,
    );
    const ubicacion = this.resolverBandera(
      usuario.requiereUbicacion,
      obra.requiereUbicacion,
      rol?.requiereUbicacion ?? null,
    );

    return {
      requiereFoto: foto.valor,
      requiereUbicacion: ubicacion.valor,
      origenFoto: foto.origen,
      origenUbicacion: ubicacion.origen,
    };
  }

  async obtenerRequisitos(usuarioId: string, obraId: string) {
    const { usuario, obra, rol } = await this.cargarContexto(usuarioId, obraId);
    return this.resolverRequisitos(usuario, obra, rol);
  }

  async create(
    usuarioId: string,
    createAsistenciaDto: CreateAsistenciaDto,
    foto?: Express.Multer.File,
  ) {
    const { usuario, obra, rol } = await this.cargarContexto(
      usuarioId,
      createAsistenciaDto.obraId,
    );

    const requisitos = this.resolverRequisitos(usuario, obra, rol);

    if (requisitos.requiereFoto && !foto) {
      throw new BadRequestException(
        'Se requiere foto para marcar asistencia (requisito resuelto desde ' +
          `${requisitos.origenFoto})`,
      );
    }

    if (requisitos.requiereUbicacion && !createAsistenciaDto.ubicacion) {
      throw new BadRequestException(
        'Se requiere ubicación para marcar asistencia (requisito resuelto desde ' +
          `${requisitos.origenUbicacion})`,
      );
    }

    const id = createAsistenciaDto.id ?? randomUUID();

    if (createAsistenciaDto.id) {
      const existente = await this.asistenciasRepository.findOne({
        where: { id: createAsistenciaDto.id },
      });
      if (existente) {
        throw new BadRequestException(
          `Ya existe un registro de asistencia con id "${createAsistenciaDto.id}"`,
        );
      }
    }

    let urlFoto: string | null = null;
    if (foto) {
      urlFoto = await this.storageService.saveAsistenciaFoto(foto);
    }

    const registro = this.asistenciasRepository.create({
      id,
      usuarioId,
      obraId: createAsistenciaDto.obraId,
      tipoEvento: createAsistenciaDto.tipoEvento,
      fechaHoraDispositivo: new Date(createAsistenciaDto.fechaHoraDispositivo),
      fechaHoraServidor: new Date(),
      esSincronizacionOffline:
        createAsistenciaDto.esSincronizacionOffline ?? false,
      ubicacion: createAsistenciaDto.ubicacion ?? null,
      altitud:
        createAsistenciaDto.altitud !== undefined &&
        createAsistenciaDto.altitud !== null
          ? String(createAsistenciaDto.altitud)
          : null,
      agenteDispositivo: createAsistenciaDto.agenteDispositivo ?? null,
      direccionIp: createAsistenciaDto.direccionIp ?? null,
      urlFoto,
      estado: createAsistenciaDto.estado ?? EstadoAsistencia.A_TIEMPO,
    });

    const guardado = await this.asistenciasRepository.save(registro);

    return {
      ...guardado,
      requisitos,
    };
  }

  private async cargarContexto(usuarioId: string, obraId: string) {
    const usuario = await this.usuariosRepository.findOne({
      where: { id: usuarioId },
    });
    if (!usuario) {
      throw new NotFoundException(`No se encontró el usuario "${usuarioId}"`);
    }

    const obra = await this.obrasRepository.findOne({
      where: { id: obraId, vigente: true },
    });
    if (!obra) {
      throw new NotFoundException(
        `No se encontró la obra vigente "${obraId}"`,
      );
    }

    const rol = await this.rolesRepository.findOne({
      where: { id: usuario.rolId },
    });

    return { usuario, obra, rol };
  }

  private resolverBandera(
    valorUsuario: boolean | null,
    valorObra: boolean | null,
    valorRol: boolean | null,
  ): { valor: boolean; origen: RequisitosAsistencia['origenFoto'] } {
    if (valorUsuario !== null) {
      return { valor: valorUsuario, origen: 'usuario' };
    }
    if (valorObra !== null) {
      return { valor: valorObra, origen: 'obra' };
    }
    if (valorRol !== null) {
      return { valor: valorRol, origen: 'rol' };
    }
    return { valor: false, origen: 'default' };
  }
}
