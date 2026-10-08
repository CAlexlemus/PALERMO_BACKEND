import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { Viaje } from '../entities';
import { ConsultaPuntosDto } from './dto/consulta-puntos.dto';
import { CreateViajeDto } from './dto/create-viaje.dto';
import { FinalizarViajeDto } from './dto/finalizar-viaje.dto';
import { SincronizacionViajeDto } from './dto/sincronizacion-viaje.dto';
import { RutasService } from './rutas.service';
import { ViajesService } from './viajes.service';

@ApiTags('Viajes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('viajes')
export class ViajesController {
  constructor(
    private readonly viajesService: ViajesService,
    private readonly rutasService: RutasService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Crear o confirmar un viaje',
    description:
      'El UUID lo genera la app. pilotoId y empresaId salen del JWT; el body no puede imponerlos. ' +
      'Valida obra/dispositivo/vehículo de la misma empresa. Un solo EN_CURSO por (empresa, piloto).',
  })
  @ApiCreatedResponse({ type: Viaje, description: 'Viaje creado o confirmado' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  @ApiForbiddenResponse({ description: 'Sin permiso' })
  @ApiConflictResponse({
    description: 'Mismo id con contenido distinto, o ya hay EN_CURSO',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Obra/dispositivo/vehículo inválidos o usuario sin empresa',
  })
  @ApiNotFoundResponse({ description: 'Obra, dispositivo o vehículo no encontrado' })
  crear(@CurrentUser() user: AuthUser, @Body() dto: CreateViajeDto) {
    return this.viajesService.crear(user, dto);
  }

  @Post(':id/finalizar')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Declarar cierre del viaje',
    description:
      'Persiste secuenciaFinalEsperada = N. Pasa a SINCRONIZANDO o FINALIZADO si ya hay 1..N. ' +
      'Repeticiones idénticas son idempotentes; cambios incompatibles → 409.',
  })
  @ApiOkResponse({ type: SincronizacionViajeDto })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  @ApiForbiddenResponse({ description: 'Solo el piloto asignado puede finalizar' })
  @ApiConflictResponse({ description: 'Declaración de cierre incompatible' })
  @ApiUnprocessableEntityResponse({
    description: 'Estado inválido o N menor que secuencias ya guardadas',
  })
  @ApiNotFoundResponse({ description: 'Viaje no encontrado' })
  finalizar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinalizarViajeDto,
  ) {
    return this.viajesService.finalizar(user, id, dto);
  }

  @Get('rutas')
  @ApiOperation({
    summary: 'Rutas GeoJSON de la empresa',
    description:
      'Devuelve todas las rutas de la empresa del JWT, de la más reciente a la más antigua. ' +
      'Cada elemento es un FeatureCollection con LineStrings, inicio/fin, calidad y huecos.',
  })
  @ApiOkResponse({ description: 'Listado de rutas GeoJSON' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  @ApiUnprocessableEntityResponse({
    description: 'El usuario no tiene empresa asignada',
  })
  rutas(@CurrentUser() user: AuthUser) {
    return this.rutasService.listarRutas(user);
  }

  @Get(':id/sincronizacion')
  @ApiOperation({
    summary: 'Estado de sincronización del viaje',
    description:
      'Devuelve estado, contadores, revisión de ruta y rangos faltantes 1..N. ' +
      'Lectura permitida a usuarios de la misma empresa.',
  })
  @ApiOkResponse({ type: SincronizacionViajeDto })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  @ApiForbiddenResponse({ description: 'Empresa distinta' })
  @ApiNotFoundResponse({ description: 'Viaje no encontrado' })
  sincronizacion(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.viajesService.sincronizacion(user, id);
  }

  @Get(':id/ruta')
  @ApiOperation({
    summary: 'Ruta GeoJSON del viaje',
    description:
      'FeatureCollection con LineStrings por segmento, marcadores inicio/fin, ' +
      'metadatos de calidad, huecos y revisión.',
  })
  @ApiOkResponse({ description: 'GeoJSON FeatureCollection' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  @ApiForbiddenResponse({ description: 'Empresa distinta' })
  @ApiNotFoundResponse({ description: 'Viaje no encontrado' })
  ruta(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rutasService.getRuta(user, id);
  }

  @Get(':id/puntos')
  @ApiOperation({
    summary: 'Puntos del viaje ordenados por secuencia',
    description: 'Paginación con despuesDe (secuencia) y limite (máx. 500).',
  })
  @ApiOkResponse({ description: 'Lista de puntos' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  @ApiForbiddenResponse({ description: 'Empresa distinta' })
  @ApiNotFoundResponse({ description: 'Viaje no encontrado' })
  puntos(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ConsultaPuntosDto,
  ) {
    return this.rutasService.getPuntos(user, id, query);
  }
}
