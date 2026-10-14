import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { textoRelojMexico } from '../common/fecha-mexico';
import { Obra, RegistroAsistencia, Usuario } from '../entities';
import { ConsultarAsistenciasObraDto } from './dto/consultar-asistencias-obra.dto';
import { CreateObraDto } from './dto/create-obra.dto';
import { UpdateObraDto } from './dto/update-obra.dto';

@Injectable()
export class ObrasService {
  constructor(
    @InjectRepository(Obra)
    private readonly obrasRepository: Repository<Obra>,
    @InjectRepository(RegistroAsistencia)
    private readonly asistenciasRepository: Repository<RegistroAsistencia>,
  ) {}

  findAllVigentes() {
    return this.obrasRepository.find({
      where: { vigente: true },
      order: { nombre: 'ASC' },
    });
  }

  async findOneVigente(id: string) {
    const obra = await this.obrasRepository.findOne({
      where: { id, vigente: true },
    });

    if (!obra) {
      throw new NotFoundException(`No se encontró la obra vigente "${id}"`);
    }

    return obra;
  }

  /**
   * Lista registros de asistencia de una obra en un rango de fechas,
   * con nombre de usuario, nombre de obra, ubicación, tipo de evento y hora.
   */
  async consultarAsistencias(
    obraId: string,
    dto: ConsultarAsistenciasObraDto,
  ) {
    await this.findOneVigente(obraId);

    const { fechaInicio, fechaFin } = dto;
    const inicio = this.parseFechaInicio(fechaInicio);
    const fin = this.parseFechaFin(fechaFin);

    if (inicio > fin) {
      throw new BadRequestException(
        'fechaInicio no puede ser posterior a fechaFin',
      );
    }

    return this.asistenciasRepository
      .createQueryBuilder('rg')
      .innerJoin(Obra, 'o', 'rg.obraId = o.id')
      .innerJoin(Usuario, 'u', 'rg.usuarioId = u.id')
      .select('u.nombreUsuario', 'nombreusuario')
      .addSelect('o.nombre', 'nombre')
      .addSelect('o.radiometros', 'radioMetros')
      .addSelect('ST_AsGeoJSON(rg.ubicacion)::json', 'ubicacion')
      .addSelect('rg.tipoEvento', 'tipoevento')
      .addSelect("TO_CHAR(rg.fechaHoraDispositivo, 'HH24:MI:SS')", 'hora')
      .addSelect('rg.fechaHoraDispositivo', 'fechahoraservidor')
      .where('rg.obraId = :obraId', { obraId })
      .andWhere(
        'rg.fechaHoraDispositivo BETWEEN :fechaInicio AND :fechaFin',
        { fechaInicio: inicio, fechaFin: fin },
      )
      .orderBy('rg.fechaHoraDispositivo', 'ASC')
      .getRawMany();
  }

  create(createObraDto: CreateObraDto) {
    const obra = this.obrasRepository.create({
      nombre: createObraDto.nombre,
      empresaId: createObraDto.empresaId ?? null,
      ubicacion: createObraDto.ubicacion,
      radioMetros: createObraDto.radioMetros ?? 50,
      requiereFoto: createObraDto.requiereFoto ?? null,
      requiereUbicacion: createObraDto.requiereUbicacion ?? null,
      vigente: true,
    });

    return this.obrasRepository.save(obra);
  }

  async update(id: string, updateObraDto: UpdateObraDto) {
    const obra = await this.findOneVigente(id);

    this.obrasRepository.merge(obra, {
      ...updateObraDto,
      vigente: true,
    });

    return this.obrasRepository.save(obra);
  }

  async remove(id: string) {
    const obra = await this.findOneVigente(id);

    obra.vigente = false;
    await this.obrasRepository.save(obra);

    return {
      success: true,
      message: 'Obra eliminada correctamente',
      id: obra.id,
    };
  }

  /**
   * Inicio del rango como reloj de Mexico, sin zona.
   * Así se compara directo contra las columnas timestamp de asistencia.
   */
  private parseFechaInicio(valor: string): string {
    if (this.esSoloFecha(valor)) {
      return `${valor.trim()} 00:00:00.000`;
    }
    return textoRelojMexico(new Date(valor));
  }

  /** Fin del rango como reloj de Mexico, sin zona. */
  private parseFechaFin(valor: string): string {
    if (this.esSoloFecha(valor)) {
      return `${valor.trim()} 23:59:59.999`;
    }
    return textoRelojMexico(new Date(valor));
  }

  private esSoloFecha(valor: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(valor.trim());
  }
}
