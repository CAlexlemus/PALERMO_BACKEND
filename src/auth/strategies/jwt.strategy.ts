import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Usuario } from '../../entities';
import type { AuthUser, JwtPayload } from '../types/auth-user.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {
    const secret = configService.getOrThrow<string>('jwt.secret');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const usuario = await this.usuariosRepository.findOne({
      where: { id: payload.sub },
    });

    if (!usuario) {
      throw new UnauthorizedException('No hay un usuario autenticado');
    }

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
