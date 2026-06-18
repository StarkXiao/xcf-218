import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Schedule } from '../../entities/schedule.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import * as dayjs from 'dayjs';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(Schedule) private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(ServiceItem) private readonly itemRepository: Repository<ServiceItem>,
  ) {}

  async create(data: {
    serviceItemId: number;
    date: string;
    startTime: string;
    endTime: string;
    capacity: number;
  }) {
    const item = await this.itemRepository.findOne({ where: { id: data.serviceItemId } });
    if (!item) {
      throw new NotFoundException('办事事项不存在');
    }

    const existing = await this.scheduleRepository.findOne({
      where: {
        serviceItemId: data.serviceItemId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });
    if (existing) {
      throw new BadRequestException('该时段已存在排班');
    }

    const schedule = this.scheduleRepository.create({
      ...data,
      bookedCount: 0,
      active: true,
    });
    return this.scheduleRepository.save(schedule);
  }

  async batchCreate(data: {
    serviceItemId: number;
    startDate: string;
    endDate: string;
    timeSlots: { startTime: string; endTime: string; capacity: number }[];
    weekdays?: number[];
  }) {
    const item = await this.itemRepository.findOne({ where: { id: data.serviceItemId } });
    if (!item) {
      throw new NotFoundException('办事事项不存在');
    }

    const start = dayjs(data.startDate);
    const end = dayjs(data.endDate);
    const created: Schedule[] = [];

    for (let d = start.clone(); d.isBefore(end) || d.isSame(end, 'day'); d = d.add(1, 'day')) {
      if (data.weekdays && data.weekdays.length > 0) {
        if (!data.weekdays.includes(d.day())) {
          continue;
        }
      }
      const dateStr = d.format('YYYY-MM-DD');
      for (const slot of data.timeSlots) {
        const existing = await this.scheduleRepository.findOne({
          where: {
            serviceItemId: data.serviceItemId,
            date: dateStr,
            startTime: slot.startTime,
            endTime: slot.endTime,
          },
        });
        if (!existing) {
          const schedule = this.scheduleRepository.create({
            serviceItemId: data.serviceItemId,
            date: dateStr,
            startTime: slot.startTime,
            endTime: slot.endTime,
            capacity: slot.capacity,
            bookedCount: 0,
            active: true,
          });
          created.push(await this.scheduleRepository.save(schedule));
        }
      }
    }
    return created;
  }

  async findAll(params?: { serviceItemId?: number; date?: string; startDate?: string; endDate?: string; active?: boolean }) {
    const where: any = {};
    if (params?.serviceItemId) where.serviceItemId = params.serviceItemId;
    if (params?.date) where.date = params.date;
    if (params?.active !== undefined) where.active = params.active;
    if (params?.startDate && params?.endDate) {
      where.date = Between(params.startDate, params.endDate);
    }
    return this.scheduleRepository.find({
      where,
      relations: ['serviceItem'],
      order: { date: 'ASC', startTime: 'ASC' },
    });
  }

  async findAvailableByServiceItem(serviceItemId: number, date?: string) {
    const targetDate = date || dayjs().format('YYYY-MM-DD');
    const schedules = await this.scheduleRepository.find({
      where: {
        serviceItemId,
        date: targetDate,
        active: true,
      },
      order: { startTime: 'ASC' },
    });
    return schedules.filter(s => s.bookedCount < s.capacity);
  }

  async findOne(id: number) {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
      relations: ['serviceItem'],
    });
    if (!schedule) throw new NotFoundException('排班不存在');
    return schedule;
  }

  async update(id: number, data: Partial<Schedule>) {
    const schedule = await this.findOne(id);
    Object.assign(schedule, data);
    return this.scheduleRepository.save(schedule);
  }

  async remove(id: number) {
    const schedule = await this.findOne(id);
    return this.scheduleRepository.remove(schedule);
  }
}
