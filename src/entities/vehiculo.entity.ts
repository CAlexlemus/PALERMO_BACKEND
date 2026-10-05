import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ApiSchema({ description: 'Vehículos de una empresa' })
@Entity({ name: 'vehiculos' })
export class Vehiculo {
  @ApiProperty({ example: 'v1111111-1111-1111-1111-111111111111', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @ApiProperty({ example: 'e1111111-1111-1111-1111-111111111111', format: 'uuid' })
  @Column({ name: 'empresaid', type: 'uuid' })
  empresaId!: string;

  @ApiProperty({ example: 'P-123ABC', maxLength: 20 })
  @Column({ name: 'placa', type: 'varchar', length: 20 })
  placa!: string;

  @ApiPropertyOptional({
    example: 'Camión tolva 10 m³',
    maxLength: 200,
    nullable: true,
  })
  @Column({ name: 'descripcion', type: 'varchar', length: 200, nullable: true })
  descripcion!: string | null;

  @ApiProperty({
    example: true,
    description: 'Si es false, el vehículo se considera eliminado (baja lógica)',
    default: true,
  })
  @Column({ name: 'vigente', type: 'boolean', default: true })
  vigente!: boolean;
}
