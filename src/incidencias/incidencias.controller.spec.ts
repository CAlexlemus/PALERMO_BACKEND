jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
  TypeOrmModule: { forFeature: jest.fn() },
}));

jest.mock('./storage/incidencias-storage.service', () => ({
  IncidenciasStorageService: class IncidenciasStorageService {},
}));

jest.mock('@nestjs/passport', () => ({
  AuthGuard: () =>
    class {
      canActivate(): boolean {
        return true;
      }
    },
}));

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ConsultarIncidenciasDto } from './dto/consultar-incidencias.dto';
import { IncidenciasController } from './incidencias.controller';
import { IncidenciasService } from './incidencias.service';

describe('IncidenciasController', () => {
  const user: AuthUser = {
    id: 'usuario-jwt',
    nombreUsuario: 'carlos',
    rolId: 2,
    jefeId: null,
    cuadrillaId: 3,
    turnoId: null,
    empresaId: 'empresa-1',
    requiereFoto: null,
    requiereUbicacion: null,
  };

  it('pasa el usuario autenticado al servicio y no un id del body', async () => {
    const service = {
      crear: jest.fn().mockResolvedValue({ id: 'inc-1', usuario_id: user.id }),
    };
    const controller = new IncidenciasController(
      service as unknown as IncidenciasService,
    );
    const dto = {
      titulo: 'Portón dañado',
      descripcion: 'No cierra durante el rondín.',
      obra_id: '11111111-1111-4111-8111-111111111111',
    };

    await controller.crear(user, dto, []);

    expect(service.crear).toHaveBeenCalledWith(user, dto, []);
    expect(JwtAuthGuard).toBeDefined();
  });

  it('exige autenticación en el controlador', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      IncidenciasController,
    ) as unknown[];
    expect(guards).toContain(JwtAuthGuard);
  });

  it('rechaza un límite de página inválido antes de consultar', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });
    await expect(
      pipe.transform(
        { limite: 0 },
        { type: 'query', metatype: ConsultarIncidenciasDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
