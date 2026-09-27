import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cuadrilla, Obra, Usuario } from '../entities';
import { CreateCuadrillaDto } from './dto/create-cuadrilla.dto';

@Injectable()
export class CuadrillasService {
  constructor(
    @InjectRepository(Cuadrilla)
    private readonly cuadrillasRepository: Repository<Cuadrilla>,
    @InjectRepository(Obra)
    private readonly obrasRepository: Repository<Obra>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  async create(createCuadrillaDto: CreateCuadrillaDto) {
    const obra = await this.obrasRepository.findOne({
      where: { id: createCuadrillaDto.obraId, vigente: true },
    });

    if (!obra) {
      throw new NotFoundException(
        `No se encontró la obra vigente "${createCuadrillaDto.obraId}"`,
      );
    }

    const cuadrilla = this.cuadrillasRepository.create({
      nombre: createCuadrillaDto.nombre,
      obraId: createCuadrillaDto.obraId,
    });

    return this.cuadrillasRepository.save(cuadrilla);
  }

  async remove(id: number): Promise<{ success: true; message: string }> {
    const cuadrilla = await this.cuadrillasRepository.findOne({
      where: { id },
    });

    if (!cuadrilla) {
      throw new NotFoundException(`No se encontró la cuadrilla "${id}"`);
    }

    const usuariosAsignados = await this.usuariosRepository.count({
      where: { cuadrillaId: id },
    });

    if (usuariosAsignados > 0) {
      throw new ConflictException(
        `No se puede eliminar la cuadrilla "${cuadrilla.nombre}" porque tiene usuarios asignados`,
      );
    }

    await this.cuadrillasRepository.remove(cuadrilla);

    return {
      success: true,
      message: `Cuadrilla "${cuadrilla.nombre}" eliminada`,
    };
  }
}
