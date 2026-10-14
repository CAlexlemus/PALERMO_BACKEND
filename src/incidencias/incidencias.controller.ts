import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CambiarEstadoIncidenciaDto } from './dto/cambiar-estado-incidencia.dto';
import { ConsultarIncidenciasDto } from './dto/consultar-incidencias.dto';
import { CrearIncidenciaDto } from './dto/crear-incidencia.dto';
import { IncidenciasUploadFilter } from './incidencias-upload.filter';
import {
  MAX_FOTO_BYTES,
  MAX_FOTOS_POR_INCIDENCIA,
} from './incidencias.constants';
import { IncidenciasService } from './incidencias.service';

const fotosInterceptor = FilesInterceptor('fotos', MAX_FOTOS_POR_INCIDENCIA, {
  storage: memoryStorage(),
  limits: {
    fileSize: MAX_FOTO_BYTES,
    files: MAX_FOTOS_POR_INCIDENCIA,
  },
});

@ApiTags('Incidencias')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'No hay un usuario autenticado' })
@UseGuards(JwtAuthGuard)
@Controller('incidencias')
export class IncidenciasController {
  constructor(private readonly incidenciasService: IncidenciasService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar una incidencia',
    description:
      'El usuario y la fecha salen del JWT y de PostgreSQL. Las fotos son opcionales (máximo 5).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['titulo', 'descripcion', 'obra_id'],
      properties: {
        titulo: { type: 'string', minLength: 3, maxLength: 200 },
        descripcion: { type: 'string', minLength: 5, maxLength: 5000 },
        obra_id: { type: 'string', format: 'uuid' },
        fotos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: '0 a 5 imágenes JPEG, PNG o WebP de hasta 5 MiB',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Incidencia registrada en estado reportada',
  })
  @ApiBadRequestResponse({ description: 'Datos o fotografías inválidas' })
  @ApiForbiddenResponse({
    description: 'La obra no está en el ámbito del usuario',
  })
  @ApiNotFoundResponse({ description: 'La obra no existe o no está vigente' })
  @ApiPayloadTooLargeResponse({ description: 'Una fotografía supera 5 MiB' })
  @ApiServiceUnavailableResponse({
    description: 'El almacenamiento no está disponible',
  })
  @UseFilters(IncidenciasUploadFilter)
  @UseInterceptors(fotosInterceptor)
  crear(
    @CurrentUser() user: AuthUser,
    @Body() dto: CrearIncidenciaDto,
    @UploadedFiles() fotos?: Express.Multer.File[],
  ) {
    return this.incidenciasService.crear(user, dto, fotos ?? []);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar incidencias del ámbito autorizado',
    description:
      'Orden: fecha_registro DESC, id DESC. No incluye URLs firmadas.',
  })
  @ApiOkResponse({ description: 'Página de incidencias' })
  @ApiBadRequestResponse({ description: 'Filtros inválidos' })
  @ApiForbiddenResponse({ description: 'Obra fuera del ámbito' })
  listar(
    @CurrentUser() user: AuthUser,
    @Query() consulta: ConsultarIncidenciasDto,
  ) {
    return this.incidenciasService.listar(user, consulta);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalle de una incidencia con enlaces de lectura temporales',
    description:
      'Cada consulta regenera URLs firmadas de 300 segundos. No devuelve la clave del objeto.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Incidencia y fotografías autorizadas' })
  @ApiNotFoundResponse({
    description: 'Incidencia inexistente o fuera de alcance',
  })
  @ApiServiceUnavailableResponse({
    description: 'No se pudo firmar la fotografía',
  })
  detalle(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.incidenciasService.detalle(user, id);
  }

  @Patch(':id/estado')
  @ApiOperation({
    summary: 'Cambiar el estado (solo administrador)',
    description: 'Transiciones válidas: reportada → en_revision → resuelta.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Incidencia actualizada, sin URLs firmadas' })
  @ApiBadRequestResponse({ description: 'Transición de estado no permitida' })
  @ApiForbiddenResponse({ description: 'El usuario no es administrador' })
  @ApiNotFoundResponse({
    description: 'Incidencia inexistente o fuera de alcance',
  })
  cambiarEstado(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CambiarEstadoIncidenciaDto,
  ) {
    return this.incidenciasService.cambiarEstado(user, id, dto);
  }

  @Post(':id/fotos')
  @ApiOperation({
    summary: 'Anexar fotografías a una incidencia',
    description:
      'De 1 a 5 archivos por solicitud, sin superar 5 en total. El guardia solo puede hacerlo sobre la suya en estado reportada.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fotos'],
      properties: {
        fotos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Metadatos de las fotografías nuevas' })
  @ApiBadRequestResponse({ description: 'Archivo inválido' })
  @ApiConflictResponse({
    description: 'Límite de 5 fotos o incidencia que ya no está reportada',
  })
  @ApiNotFoundResponse({
    description: 'Incidencia inexistente o fuera de alcance',
  })
  @ApiPayloadTooLargeResponse({ description: 'Una fotografía supera 5 MiB' })
  @UseFilters(IncidenciasUploadFilter)
  @UseInterceptors(fotosInterceptor)
  agregarFotos(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() fotos?: Express.Multer.File[],
  ) {
    return this.incidenciasService.agregarFotos(user, id, fotos ?? []);
  }
}
