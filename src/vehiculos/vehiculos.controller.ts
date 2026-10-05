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
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Vehiculo } from '../entities';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { VehiculosService } from './vehiculos.service';

@ApiTags('Vehiculos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehiculos')
export class VehiculosController {
  constructor(private readonly vehiculosService: VehiculosService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar vehículos vigentes',
    description: 'Devuelve únicamente los vehículos con vigente = true.',
  })
  @ApiOkResponse({
    description: 'Listado de vehículos vigentes',
    type: [Vehiculo],
  })
  @ApiUnauthorizedResponse({ description: 'No hay un usuario autenticado' })
  findAll() {
    return this.vehiculosService.findAllVigentes();
  }

  @Post()
  @ApiOperation({
    summary: 'Crear vehículo',
    description: 'Registra un vehículo vigente de una empresa.',
  })
  @ApiCreatedResponse({
    description: 'Vehículo creado correctamente',
    type: Vehiculo,
  })
  @ApiUnauthorizedResponse({ description: 'No hay un usuario autenticado' })
  @ApiNotFoundResponse({ description: 'Empresa no encontrada o no vigente' })
  @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
  create(@Body() createVehiculoDto: CreateVehiculoDto) {
    return this.vehiculosService.create(createVehiculoDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar vehículo (baja lógica)',
    description: 'No borra el registro: pone vigente = false.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Vehículo marcado como no vigente' })
  @ApiUnauthorizedResponse({ description: 'No hay un usuario autenticado' })
  @ApiNotFoundResponse({ description: 'El vehículo no existe o no está vigente' })
  @ApiBadRequestResponse({ description: 'El ID no es un UUID válido' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiculosService.remove(id);
  }
}
