import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Cuadrilla } from '../entities';
import { CuadrillasService } from './cuadrillas.service';
import { CreateCuadrillaDto } from './dto/create-cuadrilla.dto';

@ApiTags('Cuadrillas')
@Controller('cuadrillas')
export class CuadrillasController {
  constructor(private readonly cuadrillasService: CuadrillasService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear cuadrilla',
    description: 'Registra una cuadrilla y guarda el ID de la obra asociada.',
  })
  @ApiCreatedResponse({
    description: 'Cuadrilla creada correctamente',
    type: Cuadrilla,
  })
  @ApiNotFoundResponse({ description: 'La obra no existe o no está vigente' })
  @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
  create(@Body() createCuadrillaDto: CreateCuadrillaDto) {
    return this.cuadrillasService.create(createCuadrillaDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar cuadrilla',
    description: 'Elimina una cuadrilla si no tiene usuarios asignados.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ description: 'Cuadrilla eliminada' })
  @ApiNotFoundResponse({ description: 'Cuadrilla no encontrada' })
  @ApiConflictResponse({
    description: 'La cuadrilla tiene usuarios asignados',
  })
  @ApiBadRequestResponse({ description: 'El ID no es un número válido' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cuadrillasService.remove(id);
  }
}
