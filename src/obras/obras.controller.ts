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
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Obra } from '../entities';
import { ConsultarAsistenciasObraDto } from './dto/consultar-asistencias-obra.dto';
import { CreateObraDto } from './dto/create-obra.dto';
import { UpdateObraDto } from './dto/update-obra.dto';
import { ObrasService } from './obras.service';

@ApiTags('Obras')
@Controller('obras')
export class ObrasController {
  constructor(private readonly obrasService: ObrasService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar obras vigentes',
    description: 'Devuelve únicamente las obras con vigente = true.',
  })
  @ApiOkResponse({ description: 'Listado de obras vigentes', type: [Obra] })
  findAll() {
    return this.obrasService.findAllVigentes();
  }

  @Get(':id/asistencias')
  @ApiOperation({
    summary: 'Consultar registros de asistencia de una obra',
    description:
      'Devuelve nombre de usuario, obra, ubicación, tipo de evento, hora y fecha/hora servidor en un rango de fechas.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID de la obra' })
  @ApiOkResponse({ description: 'Listado de registros de asistencia' })
  @ApiNotFoundResponse({ description: 'La obra no existe o no está vigente' })
  @ApiBadRequestResponse({ description: 'Parámetros inválidos' })
  consultarAsistencias(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ConsultarAsistenciasObraDto,
  ) {
    return this.obrasService.consultarAsistencias(id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una obra vigente',
    description: 'Consulta una obra por ID si sigue vigente.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Obra encontrada', type: Obra })
  @ApiNotFoundResponse({ description: 'La obra no existe o no está vigente' })
  @ApiBadRequestResponse({ description: 'El ID no es un UUID válido' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.obrasService.findOneVigente(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Crear obra con ubicación',
    description: 'Registra una obra vigente y guarda su geocerca.',
  })
  @ApiCreatedResponse({ description: 'Obra creada correctamente', type: Obra })
  @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
  create(@Body() createObraDto: CreateObraDto) {
    return this.obrasService.create(createObraDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar obra y ubicación',
    description: 'Guarda cambios de una obra vigente, incluida su ubicación.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Obra actualizada correctamente', type: Obra })
  @ApiNotFoundResponse({ description: 'La obra no existe o no está vigente' })
  @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateObraDto: UpdateObraDto,
  ) {
    return this.obrasService.update(id, updateObraDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar obra (baja lógica)',
    description: 'No borra el registro: pone vigente = false.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Obra marcada como no vigente' })
  @ApiNotFoundResponse({ description: 'La obra no existe o no está vigente' })
  @ApiBadRequestResponse({ description: 'El ID no es un UUID válido' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.obrasService.remove(id);
  }
}
