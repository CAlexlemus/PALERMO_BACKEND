import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispositivo, Empresa, Usuario } from '../entities';
import { CreateDispositivoDto } from './dto/create-dispositivo.dto';

@Injectable()
export class DispositivosService {
  constructor(
    @InjectRepository(Dispositivo)
    private readonly dispositivosRepository: Repository<Dispositivo>,
    @InjectRepository(Empresa)
    private readonly empresasRepository: Repository<Empresa>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  findAllVigentes() {
    return this.dispositivosRepository.find({
      where: { vigente: true },
      order: { identificador: 'ASC' },
    });
  }

  async create(createDispositivoDto: CreateDispositivoDto) {
    const empresa = await this.empresasRepository.findOne({
      where: { id: createDispositivoDto.empresaId, vigente: true },
    });
    if (!empresa) {
      throw new NotFoundException(
        `No se encontró la empresa vigente "${createDispositivoDto.empresaId}"`,
      );
    }

    const piloto = await this.usuariosRepository.findOne({
      where: { id: createDispositivoDto.pilotoId },
    });
    if (!piloto) {
      throw new NotFoundException(
        `No se encontró el piloto "${createDispositivoDto.pilotoId}"`,
      );
    }

    const existente = await this.dispositivosRepository.findOne({
      where: { identificador: createDispositivoDto.identificador },
    });
    if (existente) {
      throw new ConflictException(
        `Ya existe un dispositivo con identificador "${createDispositivoDto.identificador}"`,
      );
    }

    const dispositivo = this.dispositivosRepository.create({
      empresaId: createDispositivoDto.empresaId,
      pilotoId: createDispositivoDto.pilotoId,
      identificador: createDispositivoDto.identificador,
      plataforma: createDispositivoDto.plataforma,
      vigente: true,
    });

    return this.dispositivosRepository.save(dispositivo);
  }

  async remove(id: string) {
    const dispositivo = await this.dispositivosRepository.findOne({
      where: { id, vigente: true },
    });

    if (!dispositivo) {
      throw new NotFoundException(
        `No se encontró el dispositivo vigente "${id}"`,
      );
    }

    dispositivo.vigente = false;
    await this.dispositivosRepository.save(dispositivo);

    return {
      success: true,
      message: 'Dispositivo eliminado correctamente',
      id: dispositivo.id,
    };
  }
}
