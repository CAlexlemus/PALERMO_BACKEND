import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ApiSchema({ description: 'Cuadrillas asignadas a una obra' })
@Entity({ name: 'cuadrillas' })
export class Cuadrilla {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn({ name: 'id' })
  id!: number;

  @ApiProperty({ example: 'Obra Gris', maxLength: 100 })
  @Column({ name: 'nombre', type: 'varchar', length: 100 })
  nombre!: string;

  @ApiPropertyOptional({
    example: 'a1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'obraid', type: 'uuid', nullable: true })
  obraId!: string | null;
}
