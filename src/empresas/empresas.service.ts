import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empresa } from '../entities';
import { CreateEmpresaDto } from './dto/create-empresa.dto';

@Injectable()
export class EmpresasService {
  constructor(
    @InjectRepository(Empresa)
    private readonly empresasRepository: Repository<Empresa>,
  ) {}

  findAllVigentes() {
    return this.empresasRepository.find({
      where: { vigente: true },
      order: { nombre: 'ASC' },
    });
  }

  create(createEmpresaDto: CreateEmpresaDto) {
    const empresa = this.empresasRepository.create({
      nombre: createEmpresaDto.nombre,
      vigente: true,
    });

    return this.empresasRepository.save(empresa);
  }

  async remove(id: string) {
    const empresa = await this.empresasRepository.findOne({
      where: { id, vigente: true },
    });

    if (!empresa) {
      throw new NotFoundException(`No se encontró la empresa vigente "${id}"`);
    }

    empresa.vigente = false;
    await this.empresasRepository.save(empresa);

    return {
      success: true,
      message: 'Empresa eliminada correctamente',
      id: empresa.id,
    };
  }
}
