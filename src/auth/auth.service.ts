import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Cuadrilla, Rol, Turno, Usuario } from '../entities';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { LoginDto } from './dto/login.dto';
import { UsuarioPublicoDto } from './dto/login-response.dto';
import type { AuthUser, JwtPayload } from './types/auth-user.type';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolesRepository: Repository<Rol>,
    @InjectRepository(Cuadrilla)
    private readonly cuadrillasRepository: Repository<Cuadrilla>,
    @InjectRepository(Turno)
    private readonly turnosRepository: Repository<Turno>,
    private readonly jwtService: JwtService,
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

    const payload: JwtPayload = {
      sub: usuario.id,
      nombreUsuario: usuario.nombreUsuario,
      rolId: usuario.rolId,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      success: true,
      message: 'Inicio de sesión exitoso',
      accessToken,
      usuario: this.toPublicUser(usuario),
    };
  }

  async findAllUsuarios(): Promise<UsuarioPublicoDto[]> {
    const usuarios = await this.usuariosRepository.find({
      order: { nombreUsuario: 'ASC' },
    });
    return usuarios.map((usuario) => this.toPublicUser(usuario));
  }

  async findAllRoles(): Promise<Rol[]> {
    return this.rolesRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findAllCuadrillas(): Promise<Cuadrilla[]> {
    return this.cuadrillasRepository.find({
      order: { nombre: 'ASC' },
    });
  }

  async findAllTurnos(): Promise<Turno[]> {
    return this.turnosRepository.find({
      order: { horaInicio: 'ASC' },
    });
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

    const rol = await this.rolesRepository.findOne({
      where: { id: createUsuarioDto.rolId },
    });
    if (!rol) {
      throw new NotFoundException(
        `No se encontró el rol "${createUsuarioDto.rolId}"`,
      );
    }

    const cuadrilla = await this.cuadrillasRepository.findOne({
      where: { id: createUsuarioDto.cuadrillaId },
    });
    if (!cuadrilla) {
      throw new NotFoundException(
        `No se encontró la cuadrilla "${createUsuarioDto.cuadrillaId}"`,
      );
    }

    const turno = await this.turnosRepository.findOne({
      where: { id: createUsuarioDto.turnoId },
    });
    if (!turno) {
      throw new NotFoundException(
        `No se encontró el turno "${createUsuarioDto.turnoId}"`,
      );
    }

    const contrasenaHash = await bcrypt.hash(createUsuarioDto.contrasena, 10);

    const usuario = this.usuariosRepository.create({
      nombreUsuario: createUsuarioDto.nombreUsuario,
      contrasenaHash,
      rolId: createUsuarioDto.rolId,
      jefeId: createUsuarioDto.jefeId ?? null,
      cuadrillaId: createUsuarioDto.cuadrillaId,
      turnoId: createUsuarioDto.turnoId,
      requiereFoto: createUsuarioDto.requiereFoto ?? null,
      requiereUbicacion: createUsuarioDto.requiereUbicacion ?? null,
    });

    const guardado = await this.usuariosRepository.save(usuario);
    return this.toPublicUser(guardado);
  }

  async removeUsuario(id: string): Promise<{ success: true; message: string }> {
    const usuario = await this.usuariosRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`No se encontró el usuario "${id}"`);
    }

    await this.usuariosRepository.remove(usuario);
    return {
      success: true,
      message: `Usuario "${usuario.nombreUsuario}" dado de baja`,
    };
  }

  toPublicUser(usuario: Usuario): AuthUser & UsuarioPublicoDto {
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
