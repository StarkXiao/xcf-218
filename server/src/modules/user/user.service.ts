import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async login(username: string, password: string) {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (user.password !== password) {
      throw new UnauthorizedException('密码错误');
    }
    const { password: _, ...result } = user;
    return result;
  }

  async findAll() {
    return this.userRepository.find({
      select: ['id', 'username', 'name', 'idCard', 'phone', 'role', 'createdAt'],
    });
  }

  async findOne(id: number) {
    return this.userRepository.findOne({ where: { id } });
  }
}
