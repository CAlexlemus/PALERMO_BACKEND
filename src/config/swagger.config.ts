import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  Cuadrilla,
  Obra,
  RegistroAsistencia,
  Rol,
  Turno,
  Usuario,
} from '../entities';
import { GeoPointDto } from '../common/dto/geo-point.dto';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('BEFCO API')
    .setDescription(
      'API del backend BEFCO para gestión de asistencia en obra, usuarios y catálogos.',
    )
    .setVersion('1.0')
    .addTag('App', 'Endpoints generales de la aplicación')
    .addTag('Auth', 'Autenticación, login y creación de usuarios')
    .addTag('Obras', 'Consulta, alta y baja lógica de obras y sus ubicaciones')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      Rol,
      Turno,
      Obra,
      Cuadrilla,
      Usuario,
      RegistroAsistencia,
      GeoPointDto,
    ],
  });

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
}
