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
import { Empresa } from '../entities';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { EmpresasService } from './empresas.service';

@ApiTags('Empresas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar empresas vigentes',
    description: 'Devuelve únicamente las empresas con vigente = true.',
  })
  @ApiOkResponse({ description: 'Listado de empresas vigentes', type: [Empresa] })
  @ApiUnauthorizedResponse({ description: 'No hay un usuario autenticado' })
  findAll() {
    return this.empresasService.findAllVigentes();
  }

  @Post()
  @ApiOperation({
    summary: 'Crear empresa',
    description: 'Registra una empresa vigente.',
  })
  @ApiCreatedResponse({ description: 'Empresa creada correctamente', type: Empresa })
  @ApiUnauthorizedResponse({ description: 'No hay un usuario autenticado' })
  @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
  create(@Body() createEmpresaDto: CreateEmpresaDto) {
    return this.empresasService.create(createEmpresaDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar empresa (baja lógica)',
    description: 'No borra el registro: pone vigente = false.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Empresa marcada como no vigente' })
  @ApiUnauthorizedResponse({ description: 'No hay un usuario autenticado' })
  @ApiNotFoundResponse({ description: 'La empresa no existe o no está vigente' })
  @ApiBadRequestResponse({ description: 'El ID no es un UUID válido' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.empresasService.remove(id);
  }
}
