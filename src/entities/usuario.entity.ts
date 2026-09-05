import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ApiSchema({ description: 'Usuarios del sistema' })
@Entity({ name: 'usuarios' })
export class Usuario {
  @ApiProperty({ example: 'b1111111-1111-1111-1111-111111111111', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @ApiProperty({ example: 'carlos.jefe', maxLength: 50 })
  @Column({ name: 'nombreusuario', type: 'varchar', length: 50, unique: true })
  nombreUsuario!: string;

  @ApiProperty({
    description: 'Hash de la contraseña (no exponer en respuestas públicas)',
    writeOnly: true,
  })
  @Column({ name: 'contrasenahash', type: 'varchar', length: 255 })
  contrasenaHash!: string;

  @ApiProperty({ example: 2 })
  @Column({ name: 'rolid', type: 'integer' })
  rolId!: number;

  @ApiPropertyOptional({
    example: 'b1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'jefeid', type: 'uuid', nullable: true })
  jefeId!: string | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @Column({ name: 'cuadrillaid', type: 'integer', nullable: true })
  cuadrillaId!: number | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @Column({ name: 'turnoid', type: 'integer', nullable: true })
  turnoId!: number | null;

  @ApiPropertyOptional({ example: true, nullable: true })
  @Column({ name: 'requierefoto', type: 'boolean', nullable: true })
  requiereFoto!: boolean | null;

  @ApiPropertyOptional({ example: true, nullable: true })
  @Column({ name: 'requiereubicacion', type: 'boolean', nullable: true })
  requiereUbicacion!: boolean | null;
}
