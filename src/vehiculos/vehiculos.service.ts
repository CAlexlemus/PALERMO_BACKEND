import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empresa, Vehiculo } from '../entities';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';

@Injectable()
export class VehiculosService {
  constructor(
    @InjectRepository(Vehiculo)
    private readonly vehiculosRepository: Repository<Vehiculo>,
    @InjectRepository(Empresa)
    private readonly empresasRepository: Repository<Empresa>,
  ) {}

  findAllVigentes() {
    return this.vehiculosRepository.find({
      where: { vigente: true },
      order: { placa: 'ASC' },
    });
  }

  async create(createVehiculoDto: CreateVehiculoDto) {
    const empresa = await this.empresasRepository.findOne({
      where: { id: createVehiculoDto.empresaId, vigente: true },
    });
    if (!empresa) {
      throw new NotFoundException(
        `No se encontró la empresa vigente "${createVehiculoDto.empresaId}"`,
      );
    }

    const vehiculo = this.vehiculosRepository.create({
      empresaId: createVehiculoDto.empresaId,
      placa: createVehiculoDto.placa,
      descripcion: createVehiculoDto.descripcion ?? null,
      vigente: true,
    });

    return this.vehiculosRepository.save(vehiculo);
  }

  async remove(id: string) {
    const vehiculo = await this.vehiculosRepository.findOne({
      where: { id, vigente: true },
    });

    if (!vehiculo) {
      throw new NotFoundException(`No se encontró el vehículo vigente "${id}"`);
    }

    vehiculo.vigente = false;
    await this.vehiculosRepository.save(vehiculo);

    return {
      success: true,
      message: 'Vehículo eliminado correctamente',
      id: vehiculo.id,
    };
  }
}
