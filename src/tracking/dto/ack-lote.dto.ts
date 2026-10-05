import { ApiProperty } from '@nestjs/swagger';

export class AckLoteDto {
  @ApiProperty({ example: '4f0b5632-37c1-4b15-90d4-711741344247', format: 'uuid' })
  batchId!: string;

  @ApiProperty({
    example: [1, 2, 3],
    type: [Number],
    description: 'Secuencias del lote ya persistidas (nuevas o duplicados idénticos)',
  })
  secuenciasConfirmadas!: number[];

  @ApiProperty({ example: 2 })
  insertados!: number;

  @ApiProperty({ example: 1 })
  duplicados!: number;
}
