import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Application } from './application.entity';

@Entity('material_files')
export class MaterialFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  applicationId: number;

  @ManyToOne(() => Application, application => application.materialFiles)
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column()
  materialName: string;

  @Column()
  originalName: string;

  @Column()
  fileName: string;

  @Column()
  filePath: string;

  @Column()
  fileSize: number;

  @Column()
  mimeType: string;

  @Column({ default: false })
  required: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
