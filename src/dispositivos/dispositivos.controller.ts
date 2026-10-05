import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Dispositivo } from '../entities';
import { CreateDispositivoDto } from './dto/create-dispositivo.dto';
import { DispositivosService } from './dispositivos.service';

@ApiTags('Dispositivos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dispositivos')
export class DispositivosController {
  constructor(private readonly dispositivosService: DispositivosService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar dispositivos vigentes',
    description: 'Devuelve únicamente los dispositivos con vigente = true.',
  })
  @ApiOkResponse({
    description: 'Listado de dispositivos vigentes',
    type: [Dispositivo],
  })
  @ApiUnauthorizedResponse({ description: 'No hay un usuario autenticado' })
  findAll() {
    return this.dispositivosService.findAllVigentes();
  }

  @Post()
  @ApiOperation({
    summary: 'Crear dispositivo',
    description: 'Registra un dispositivo vigente asignado a un piloto.',
  })
  @ApiCreatedResponse({
    description: 'Dispositivo creado correctamente',
    type: Dispositivo,
  })
  @ApiUnauthorizedResponse({ description: 'No hay un usuario autenticado' })
  @ApiNotFoundResponse({ description: 'Empresa o piloto no encontrados' })
  @ApiConflictResponse({ description: 'Identificador de dispositivo duplicado' })
  @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
  create(@Body() createDispositivoDto: CreateDispositivoDto) {
    return this.dispositivosService.create(createDispositivoDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar dispositivo (baja lógica)',
    description: 'No borra el registro: pone vigente = false.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Dispositivo marcado como no vigente' })
  @ApiUnauthorizedResponse({ description: 'No hay un usuario autenticado' })
  @ApiNotFoundResponse({
    description: 'El dispositivo no existe o no está vigente',
  })
  @ApiBadRequestResponse({ description: 'El ID no es un UUID válido' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.dispositivosService.remove(id);
  }
}
