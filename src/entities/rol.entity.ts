import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ApiSchema({ description: 'Catálogo de roles del sistema' })
@Entity({ name: 'roles' })
export class Rol {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn({ name: 'id' })
  id!: number;

  @ApiProperty({ example: 'Trabajador de Campo', maxLength: 50 })
  @Column({ name: 'nombre', type: 'varchar', length: 50 })
  nombre!: string;

  @ApiPropertyOptional({ example: true })
  @Column({ name: 'requierefoto', type: 'boolean', nullable: true })
  requiereFoto!: boolean | null;

  @ApiPropertyOptional({ example: true })
  @Column({ name: 'requiereubicacion', type: 'boolean', nullable: true })
  requiereUbicacion!: boolean | null;
}
