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
  fieldName: string;

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

  @Column({ default: 1 })
  version: number;

  @Column({ default: true })
  isCurrent: boolean;

  @Column({ default: 'normal' })
  status: string;

  @Column({ nullable: true })
  uploaderId: number;

  @Column('text', { nullable: true })
  rejectReason: string;

  @CreateDateColumn()
  createdAt: Date;
}
