import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../../entities/message.entity';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message) private readonly repository: Repository<Message>,
  ) {}

  async findByUserId(userId: number) {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getUnreadCount(userId: number) {
    return this.repository.count({ where: { userId, read: false } });
  }

  async markAsRead(id: number) {
    await this.repository.update(id, { read: true });
    return { success: true };
  }

  async markAllAsRead(userId: number) {
    await this.repository.update({ userId, read: false }, { read: true });
    return { success: true };
  }
}
