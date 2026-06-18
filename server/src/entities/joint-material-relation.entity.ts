import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { JointApplication } from './joint-application.entity';
import { MaterialFile } from './material-file.entity';
import { ServiceItem } from './service-item.entity';

@Entity('joint_material_relations')
export class JointMaterialRelation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  jointApplicationId: number;

  @ManyToOne(() => JointApplication)
  @JoinColumn({ name: 'jointApplicationId' })
  jointApplication: JointApplication;

  @Column()
  materialFileId: number;

  @ManyToOne(() => MaterialFile)
  @JoinColumn({ name: 'materialFileId' })
  materialFile: MaterialFile;

  @Column()
  materialName: string;

  @Column()
  fieldName: string;

  @Column({ default: false })
  isShared: boolean;

  @Column('simple-array', { nullable: true })
  usedByServiceItemIds: number[];

  @Column('simple-array', { nullable: true })
  usedByApplicationIds: number[];

  @CreateDateColumn()
  createdAt: Date;
}
