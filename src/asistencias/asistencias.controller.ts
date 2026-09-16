import {
  BadRequestException,
  Body,
  Controller,
  Get,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { AsistenciasService } from './asistencias.service';
import { CreateAsistenciaDto } from './dto/create-asistencia.dto';

const MAX_FOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

@ApiTags('Asistencias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('asistencias')
export class AsistenciasController {
  constructor(private readonly asistenciasService: AsistenciasService) {}

  @Get('requisitos')
  @ApiOperation({
    summary: 'Consultar si se requiere foto y ubicación',
    description:
      'Usa el usuario autenticado. Resuelve requisitos en cascada: usuario → obra → rol.',
  })
  @ApiQuery({ name: 'obraId', format: 'uuid' })
  @ApiOkResponse({ description: 'Requisitos resueltos' })
  @ApiUnauthorizedResponse({ description: 'No hay un usuario autenticado' })
  @ApiNotFoundResponse({ description: 'Usuario u obra no encontrados' })
  @ApiBadRequestResponse({ description: 'Parámetros inválidos' })
  obtenerRequisitos(
    @CurrentUser() user: AuthUser,
    @Query('obraId', ParseUUIDPipe) obraId: string,
  ) {
    return this.asistenciasService.obtenerRequisitos(user.id, obraId);
  }

  @Post()
  @ApiOperation({
    summary: 'Registrar asistencia',
    description:
      'Guarda entrada/salida del usuario autenticado. La foto (si aplica) se ' +
      'envía como multipart field "foto" y se almacena localmente por ahora.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['obraId', 'tipoEvento', 'fechaHoraDispositivo'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        obraId: { type: 'string', format: 'uuid' },
        tipoEvento: { type: 'string', enum: ['ENTRADA', 'SALIDA'] },
        fechaHoraDispositivo: { type: 'string', format: 'date-time' },
        esSincronizacionOffline: { type: 'boolean' },
        ubicacion: {
          type: 'string',
          description: 'JSON string: {"type":"Point","coordinates":[lng,lat]}',
        },
        altitud: { type: 'number' },
        agenteDispositivo: { type: 'string' },
        direccionIp: { type: 'string' },
        estado: {
          type: 'string',
          enum: ['A_TIEMPO', 'TARDE', 'FUERA_GEOCERCA', 'SIN_FOTO'],
        },
        foto: {
          type: 'string',
          format: 'binary',
          description: 'Imagen de asistencia (jpeg/png/webp/gif)',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Asistencia registrada' })
  @ApiUnauthorizedResponse({ description: 'No hay un usuario autenticado' })
  @ApiBadRequestResponse({
    description: 'Datos inválidos o falta foto/ubicación requerida',
  })
  @ApiNotFoundResponse({ description: 'Usuario u obra no encontrados' })
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FOTO_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
          callback(
            new BadRequestException(
              'La foto debe ser una imagen jpeg, png, webp o gif',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  create(
    @CurrentUser() user: AuthUser,
    @Body() createAsistenciaDto: CreateAsistenciaDto,
    @UploadedFile() foto?: Express.Multer.File,
  ) {
    return this.asistenciasService.create(user.id, createAsistenciaDto, foto);
  }
}
