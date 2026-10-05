import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ApiSchema({ description: 'Empresas transportistas o contratistas' })
@Entity({ name: 'empresas' })
export class Empresa {
  @ApiProperty({ example: 'e1111111-1111-1111-1111-111111111111', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @ApiProperty({ example: 'Transportes del Norte', maxLength: 150 })
  @Column({ name: 'nombre', type: 'varchar', length: 150 })
  nombre!: string;

  @ApiProperty({
    example: true,
    description: 'Si es false, la empresa se considera eliminada (baja lógica)',
    default: true,
  })
  @Column({ name: 'vigente', type: 'boolean', default: true })
  vigente!: boolean;
}
