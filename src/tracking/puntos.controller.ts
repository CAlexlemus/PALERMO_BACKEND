import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { AckLoteDto } from './dto/ack-lote.dto';
import { LotePuntosDto } from './dto/lote-puntos.dto';
import { IngestaService } from './ingesta.service';

@ApiTags('Puntos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('viajes')
export class PuntosController {
  constructor(private readonly ingestaService: IngestaService) {}

  @Post(':id/puntos/lote')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Ingestar lote de puntos GPS',
    description:
      '1–200 puntos, ≤256 KiB. Transacción con SELECT FOR UPDATE, inserción masiva ' +
      'vía jsonb_to_recordset, idempotencia por PK (viaje_id, secuencia). ' +
      'Duplicado idéntico → ACK; contenido distinto → 409. Solo el piloto asignado.',
  })
  @ApiOkResponse({
    type: AckLoteDto,
    description: 'Confirmación tras COMMIT',
    schema: {
      example: {
        batchId: '4f0b5632-37c1-4b15-90d4-711741344247',
        secuenciasConfirmadas: [1],
        insertados: 1,
        duplicados: 0,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' })
  @ApiForbiddenResponse({ description: 'Solo el piloto asignado puede enviar puntos' })
  @ApiConflictResponse({
    description: 'Misma secuencia con contenido distinto',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Estado inválido, secuencia fuera de rango o coordenadas inválidas',
  })
  @ApiPayloadTooLargeResponse({ description: 'Lote > 256 KiB' })
  @ApiNotFoundResponse({ description: 'Viaje no encontrado' })
  recibirLote(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LotePuntosDto,
    @Headers('content-length') contentLength?: string,
    @Req() req?: Request,
  ) {
    const headerBytes = contentLength ? Number(contentLength) : undefined;
    const rawBytes =
      headerBytes && Number.isFinite(headerBytes)
        ? headerBytes
        : req?.headers['content-length']
          ? Number(req.headers['content-length'])
          : undefined;

    return this.ingestaService.recibirLote(user, id, dto, rawBytes);
  }
}
