import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ default: false })
  read: boolean;

  @Column({ default: 'system' })
  type: string;

  @Column({ nullable: true })
  applicationId: number;

  @Column({ nullable: true })
  appointmentId: number;

  @CreateDateColumn()
  createdAt: Date;
}
