import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { LoginDto } from './dto/login.dto';
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

  @Post('usuarios')
  @ApiOperation({
    summary: 'Crear usuario',
    description: 'Registra un nuevo usuario en el sistema.',
  })
  @ApiCreatedResponse({
    description: 'Usuario creado correctamente',
    type: UsuarioPublicoDto,
  })
  @ApiConflictResponse({ description: 'El nombre de usuario ya existe' })
  @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
  createUsuario(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.authService.createUsuario(createUsuarioDto);
  }
}
