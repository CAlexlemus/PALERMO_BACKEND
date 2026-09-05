import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ApiSchema({ description: 'Catálogo de turnos laborales' })
@Entity({ name: 'turnos' })
export class Turno {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn({ name: 'id' })
  id!: number;

  @ApiProperty({ example: 'Diurno', maxLength: 100 })
  @Column({ name: 'nombre', type: 'varchar', length: 100 })
  nombre!: string;

  @ApiProperty({ example: '08:00:00', description: 'Hora de inicio (HH:mm:ss)' })
  @Column({ name: 'horainicio', type: 'time' })
  horaInicio!: string;

  @ApiProperty({ example: '17:00:00', description: 'Hora de fin (HH:mm:ss)' })
  @Column({ name: 'horafin', type: 'time' })
  horaFin!: string;

  @ApiProperty({ example: 15, default: 15 })
  @Column({ name: 'minutostolerancia', type: 'integer', default: 15 })
  minutosTolerancia!: number;
}
