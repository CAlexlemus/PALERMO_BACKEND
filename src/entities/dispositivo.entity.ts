import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ApiSchema({ description: 'Dispositivos móviles asignados a un piloto' })
@Entity({ name: 'dispositivos' })
export class Dispositivo {
  @ApiProperty({ example: 'd1111111-1111-1111-1111-111111111111', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @ApiProperty({ example: 'e1111111-1111-1111-1111-111111111111', format: 'uuid' })
  @Column({ name: 'empresaid', type: 'uuid' })
  empresaId!: string;

  @ApiProperty({ example: 'c1111111-1111-1111-1111-111111111111', format: 'uuid' })
  @Column({ name: 'pilotid', type: 'uuid' })
  pilotoId!: string;

  @ApiProperty({
    example: 'a1b2c3d4e5f6',
    description: 'IMEI o UUID estable de la app',
    maxLength: 100,
  })
  @Column({ name: 'identificador', type: 'varchar', length: 100, unique: true })
  identificador!: string;

  @ApiProperty({ example: 'android', maxLength: 30 })
  @Column({ name: 'plataforma', type: 'varchar', length: 30 })
  plataforma!: string;

  @ApiProperty({
    example: true,
    description: 'Si es false, el dispositivo se considera eliminado (baja lógica)',
    default: true,
  })
  @Column({ name: 'vigente', type: 'boolean', default: true })
  vigente!: boolean;
}
