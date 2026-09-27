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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Cuadrilla, Rol, Turno } from '../entities';
import { AuthService } from './auth.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import {
  LoginResponseDto,
  UsuarioPublicoDto,
} from './dto/login-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Autentica con nombre de usuario y contraseña.',
  })
  @ApiOkResponse({
    description: 'Inicio de sesión exitoso',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('usuarios')
  @ApiOperation({
    summary: 'Listar usuarios',
    description: 'Devuelve todos los usuarios registrados (sin hash de contraseña).',
  })
  @ApiOkResponse({
    description: 'Listado de usuarios',
    type: UsuarioPublicoDto,
    isArray: true,
  })
  findAllUsuarios() {
    return this.authService.findAllUsuarios();
  }

  @Get('roles')
  @ApiOperation({
    summary: 'Listar roles',
    description: 'Catálogo de roles disponibles para alta de usuarios.',
  })
  @ApiOkResponse({
    description: 'Listado de roles',
    type: Rol,
    isArray: true,
  })
  findAllRoles() {
    return this.authService.findAllRoles();
  }

  @Get('cuadrillas')
  @ApiOperation({
    summary: 'Listar cuadrillas',
    description: 'Catálogo de cuadrillas disponibles para alta de usuarios.',
  })
  @ApiOkResponse({
    description: 'Listado de cuadrillas',
    type: Cuadrilla,
    isArray: true,
  })
  findAllCuadrillas() {
    return this.authService.findAllCuadrillas();
  }

  @Get('turnos')
  @ApiOperation({
    summary: 'Listar turnos',
    description: 'Catálogo de turnos disponibles para alta de usuarios.',
  })
  @ApiOkResponse({
    description: 'Listado de turnos',
    type: Turno,
    isArray: true,
  })
  findAllTurnos() {
    return this.authService.findAllTurnos();
  }

  @Post('usuarios')
  @ApiOperation({
    summary: 'Crear usuario',
    description:
      'Registra un nuevo usuario. Requiere rol, cuadrilla y turno existentes.',
  })
  @ApiCreatedResponse({
    description: 'Usuario creado correctamente',
    type: UsuarioPublicoDto,
  })
  @ApiConflictResponse({ description: 'El nombre de usuario ya existe' })
  @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
  @ApiNotFoundResponse({
    description: 'El rol, cuadrilla o turno indicado no existe',
  })
  createUsuario(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.authService.createUsuario(createUsuarioDto);
  }

  @Put('usuarios/:id')
  @ApiOperation({
    summary: 'Editar usuario',
    description:
      'Actualiza únicamente los campos enviados con un valor no vacío.',
  })
  @ApiOkResponse({
    description: 'Usuario actualizado correctamente',
    type: UsuarioPublicoDto,
  })
  @ApiConflictResponse({ description: 'El nombre de usuario ya existe' })
  @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
  @ApiNotFoundResponse({
    description: 'El usuario, rol, jefe, cuadrilla o turno no existe',
  })
  updateUsuario(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
  ) {
    return this.authService.updateUsuario(id, updateUsuarioDto);
  }

  @Delete('usuarios/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dar de baja usuario',
    description: 'Elimina un usuario del sistema por ID.',
  })
  @ApiOkResponse({ description: 'Usuario dado de baja' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  removeUsuario(@Param('id', ParseUUIDPipe) id: string) {
    return this.authService.removeUsuario(id);
  }
}
