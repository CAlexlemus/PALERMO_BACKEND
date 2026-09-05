import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Usuario } from '../entities';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { LoginDto } from './dto/login.dto';
import { UsuarioPublicoDto } from './dto/login-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  async login(loginDto: LoginDto) {
    const usuario = await this.usuariosRepository.findOne({
      where: { nombreUsuario: loginDto.nombreUsuario },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await bcrypt.compare(
      loginDto.contrasena,
      usuario.contrasenaHash,
    );

    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return {
      success: true,
      message: 'Inicio de sesión exitoso',
      usuario: this.toPublicUser(usuario),
    };
  }

  async createUsuario(createUsuarioDto: CreateUsuarioDto) {
    const existente = await this.usuariosRepository.findOne({
      where: { nombreUsuario: createUsuarioDto.nombreUsuario },
    });

    if (existente) {
      throw new ConflictException(
        `El usuario "${createUsuarioDto.nombreUsuario}" ya existe`,
      );
    }

    const contrasenaHash = await bcrypt.hash(createUsuarioDto.contrasena, 10);

    const usuario = this.usuariosRepository.create({
      nombreUsuario: createUsuarioDto.nombreUsuario,
      contrasenaHash,
      rolId: createUsuarioDto.rolId,
      jefeId: createUsuarioDto.jefeId ?? null,
      cuadrillaId: createUsuarioDto.cuadrillaId ?? null,
      turnoId: createUsuarioDto.turnoId ?? null,
      requiereFoto: createUsuarioDto.requiereFoto ?? null,
      requiereUbicacion: createUsuarioDto.requiereUbicacion ?? null,
    });

    const guardado = await this.usuariosRepository.save(usuario);
    return this.toPublicUser(guardado);
  }

  private toPublicUser(usuario: Usuario): UsuarioPublicoDto {
    return {
      id: usuario.id,
      nombreUsuario: usuario.nombreUsuario,
      rolId: usuario.rolId,
      jefeId: usuario.jefeId,
      cuadrillaId: usuario.cuadrillaId,
      turnoId: usuario.turnoId,
      requiereFoto: usuario.requiereFoto,
      requiereUbicacion: usuario.requiereUbicacion,
    };
  }
}
