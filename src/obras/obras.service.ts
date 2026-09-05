import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Obra } from '../entities';
import { CreateObraDto } from './dto/create-obra.dto';
import { UpdateObraDto } from './dto/update-obra.dto';

@Injectable()
export class ObrasService {
  constructor(
    @InjectRepository(Obra)
    private readonly obrasRepository: Repository<Obra>,
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

  create(createObraDto: CreateObraDto) {
    const obra = this.obrasRepository.create({
      nombre: createObraDto.nombre,
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
}
