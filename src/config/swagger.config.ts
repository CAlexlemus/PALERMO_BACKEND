import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  Cuadrilla,
  Dispositivo,
  Empresa,
  Obra,
  PuntoViaje,
  RegistroAsistencia,
  Rol,
  SegmentoViaje,
  Turno,
  Usuario,
  Vehiculo,
  Viaje,
} from '../entities';
import { GeoPointDto } from '../common/dto/geo-point.dto';
import { AckLoteDto } from '../tracking/dto/ack-lote.dto';
import { CreateViajeDto } from '../tracking/dto/create-viaje.dto';
import { FinalizarViajeDto } from '../tracking/dto/finalizar-viaje.dto';
import { LotePuntosDto, PuntoLoteDto } from '../tracking/dto/lote-puntos.dto';
import { SincronizacionViajeDto } from '../tracking/dto/sincronizacion-viaje.dto';

export function setupSwagger(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3000;
  const publicUrl = configService.get<string>('app.publicUrl');
  const productionUrl =
    configService.get<string>('app.productionUrl') ??
    'https://palermobackend-production.up.railway.app';

  const localUrl = publicUrl ?? `http://localhost:${port}`;
  const isRunningOnProduction =
    publicUrl != null &&
    publicUrl.replace(/\/$/, '') === productionUrl.replace(/\/$/, '');

  const builder = new DocumentBuilder()
    .setTitle('Condominio Villas Palermo API')
    .setDescription(
      'API de Condominio Villas Palermo para gestión de asistencia en obra y rastreo de rutas ' +
        'de transporte (viajes GPS por lotes, sincronización idempotente y GeoJSON). ' +
        'Autenticación JWT Bearer en endpoints protegidos. ' +
        'Códigos frecuentes del módulo de rastreo: 401 (sin sesión), 403 (empresa/piloto), ' +
        '409 (conflicto de contenido o cierre), 422 (reglas de negocio / referencias inválidas). ' +
        'Usa el selector de Servers para apuntar a Local o Producción (Railway).',
    )
    .setVersion('1.0')
    .addBearerAuth();

  if (isRunningOnProduction) {
    builder
      .addServer(productionUrl, 'Producción (Railway)')
      .addServer(`http://localhost:${port}`, 'Local (desarrollo)');
  } else {
    builder
      .addServer(localUrl, 'Local (desarrollo)')
      .addServer(productionUrl, 'Producción (Railway)');
  }

  const config = builder
    .addTag('App', 'Endpoints generales de la aplicación')
    .addTag('Auth', 'Autenticación, login y creación de usuarios')
    .addTag(
      'Empresas',
      'Alta, listado y baja lógica de empresas (requiere JWT)',
    )
    .addTag(
      'Dispositivos',
      'Alta, listado y baja lógica de dispositivos (requiere JWT)',
    )
    .addTag(
      'Vehiculos',
      'Alta, listado y baja lógica de vehículos (requiere JWT)',
    )
    .addTag('Obras', 'Consulta, alta y baja lógica de obras y sus ubicaciones')
    .addTag('Cuadrillas', 'Alta y baja de cuadrillas asociadas a una obra')
    .addTag('Asistencias', 'Registro de entradas/salidas (requiere JWT)')
    .addTag(
      'Incidencias',
      'Reporte de incidencias con fotografías privadas en bucket S3 (requiere JWT)',
    )
    .addTag(
      'Viajes',
      'Inicio, cierre, sincronización y consulta de rutas de transporte (requiere JWT)',
    )
    .addTag(
      'Puntos',
      'Ingesta idempotente de lotes GPS (1–200 puntos, ≤256 KiB; requiere JWT)',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      Rol,
      Turno,
      Empresa,
      Obra,
      Cuadrilla,
      Usuario,
      Dispositivo,
      Vehiculo,
      RegistroAsistencia,
      Viaje,
      PuntoViaje,
      SegmentoViaje,
      GeoPointDto,
      CreateViajeDto,
      FinalizarViajeDto,
      LotePuntosDto,
      PuntoLoteDto,
      AckLoteDto,
      SincronizacionViajeDto,
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
