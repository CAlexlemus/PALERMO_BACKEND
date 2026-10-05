import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
      .addSelect("TO_CHAR(rg.fechaHoraServidor, 'HH24:MI:SS')", 'hora')
      .addSelect('rg.fechaHoraServidor', 'fechahoraservidor')
      .where('rg.obraId = :obraId', { obraId })
      .andWhere(
        'rg.fechaHoraServidor BETWEEN :fechaInicio AND :fechaFin',
        { fechaInicio: inicio, fechaFin: fin },
      )
      .orderBy('rg.fechaHoraServidor', 'ASC')
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

  /** Interpreta fecha o fecha-hora como inicio del rango (00:00 si es solo fecha). */
  private parseFechaInicio(valor: string): Date {
    if (this.esSoloFecha(valor)) {
      return new Date(`${valor}T00:00:00`);
    }
    return new Date(valor);
  }

  /** Interpreta fecha o fecha-hora como fin del rango (23:59:59.999 si es solo fecha). */
  private parseFechaFin(valor: string): Date {
    if (this.esSoloFecha(valor)) {
      return new Date(`${valor}T23:59:59.999`);
    }
    return new Date(valor);
  }

  private esSoloFecha(valor: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(valor.trim());
  }
}
