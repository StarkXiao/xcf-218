import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Appointment } from '../../entities/appointment.entity';
import { Schedule } from '../../entities/schedule.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { User } from '../../entities/user.entity';
import { Message } from '../../entities/message.entity';
import { ProgressRecord } from '../../entities/progress-record.entity';
import { Application } from '../../entities/application.entity';
import * as dayjs from 'dayjs';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment) private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Schedule) private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(ServiceItem) private readonly itemRepository: Repository<ServiceItem>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
    @InjectRepository(ProgressRecord) private readonly progressRepository: Repository<ProgressRecord>,
    @InjectRepository(Application) private readonly applicationRepository: Repository<Application>,
    private readonly dataSource: DataSource,
  ) {}

  generateAppointmentNo() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `YY${y}${m}${d}${rand}`;
  }

  generateQueueNumber(date: string, count: number) {
    const dateStr = dayjs(date).format('MMDD');
    const seq = String(count + 1).padStart(3, '0');
    return `A${dateStr}${seq}`;
  }

  async create(data: { userId: number; scheduleId: number; remark?: string }) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userRepository.findOne({ where: { id: data.userId } });
      if (!user) throw new NotFoundException('用户不存在');

      const schedule = await this.scheduleRepository.findOne({
        where: { id: data.scheduleId },
        relations: ['serviceItem'],
      });
      if (!schedule) throw new NotFoundException('排班不存在');
      if (!schedule.active) throw new BadRequestException('该时段已停止预约');
      if (schedule.bookedCount >= schedule.capacity) throw new BadRequestException('该时段预约已满');

      const existingAppt = await this.appointmentRepository.findOne({
        where: {
          userId: data.userId,
          scheduleId: data.scheduleId,
          status: 'pending',
        },
      });
      if (existingAppt) throw new BadRequestException('您已预约该时段，请不要重复预约');

      const todayCount = await this.appointmentRepository.count({
        where: { appointmentDate: schedule.date },
      });

      const appointmentNo = this.generateAppointmentNo();
      const queueNumber = this.generateQueueNumber(schedule.date, todayCount);

      const appointment = this.appointmentRepository.create({
        appointmentNo,
        userId: data.userId,
        serviceItemId: schedule.serviceItemId,
        scheduleId: data.scheduleId,
        appointmentDate: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        queueNumber,
        status: 'pending',
        remark: data.remark,
      });

      const saved = await queryRunner.manager.save(appointment);

      schedule.bookedCount += 1;
      await queryRunner.manager.save(schedule);

      await queryRunner.manager.save(Message, {
        userId: data.userId,
        title: '预约取号成功',
        content: `您已成功预约【${schedule.serviceItem.name}】，预约编号：${appointmentNo}，排队号：${queueNumber}，预约时间：${schedule.date} ${schedule.startTime}-${schedule.endTime}。请按时前往办理。`,
        type: 'appointment',
        appointmentId: saved.id,
      });

      await queryRunner.commitTransaction();
      return this.findOne(saved.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findByUserId(userId: number) {
    const list = await this.appointmentRepository.find({
      where: { userId },
      relations: ['serviceItem', 'schedule', 'application'],
      order: { createdAt: 'DESC' },
    });
    return list;
  }

  async findAll(params?: { serviceItemId?: number; date?: string; status?: string; startDate?: string; endDate?: string }) {
    const where: any = {};
    if (params?.serviceItemId) where.serviceItemId = params.serviceItemId;
    if (params?.date) where.appointmentDate = params.date;
    if (params?.status) where.status = params.status;
    const list = await this.appointmentRepository.find({
      where,
      relations: ['user', 'serviceItem', 'schedule', 'application'],
      order: { appointmentDate: 'DESC', startTime: 'ASC' },
    });
    return list.map(a => this.transformAppointment(a));
  }

  async findOne(id: number) {
    const appt = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['user', 'serviceItem', 'schedule', 'application'],
    });
    if (!appt) throw new NotFoundException('预约不存在');
    return this.transformAppointment(appt);
  }

  private transformAppointment(appt: Appointment) {
    const result: any = { ...appt };
    if (appt.user) {
      result.user = { ...appt.user, password: undefined };
    }
    return result;
  }

  async updateStatus(id: number, status: string, remark?: string, operatorId?: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const appt = await this.appointmentRepository.findOne({
        where: { id },
        relations: ['user', 'serviceItem', 'schedule'],
      });
      if (!appt) throw new NotFoundException('预约不存在');

      const validStatuses = ['pending', 'checked_in', 'processing', 'completed', 'cancelled', 'no_show'];
      if (!validStatuses.includes(status)) {
        throw new BadRequestException('无效的状态');
      }

      if (status === 'cancelled' && appt.status === 'pending') {
        const schedule = await this.scheduleRepository.findOne({ where: { id: appt.scheduleId } });
        if (schedule && schedule.bookedCount > 0) {
          schedule.bookedCount -= 1;
          await queryRunner.manager.save(schedule);
        }
      }

      if (status === 'checked_in' && !appt.checkInTime) {
        appt.checkInTime = new Date();
      }

      appt.status = status;
      if (remark) appt.remark = remark;
      await queryRunner.manager.save(appt);

      if (appt.applicationId) {
        const progressStepMap: Record<string, { step: string; status: string }> = {
          checked_in: { step: '预约签到', status: 'completed' },
          processing: { step: '现场办理中', status: 'completed' },
          completed: { step: '现场办理完成', status: 'completed' },
          cancelled: { step: '预约已取消', status: 'failed' },
          no_show: { step: '未到场（预约过期）', status: 'failed' },
        };
        const progressInfo = progressStepMap[status];
        if (progressInfo) {
          await queryRunner.manager.save(ProgressRecord, {
            applicationId: appt.applicationId,
            step: progressInfo.step,
            status: progressInfo.status,
            remark: remark || '',
            operatorId,
          });
        }
      }

      const titleMap: Record<string, string> = {
        checked_in: '您已成功签到',
        processing: '正在为您办理',
        completed: '预约办理已完成',
        cancelled: '预约已取消',
        no_show: '预约已过期（未到场）',
      };

      const contentMap: Record<string, string> = {
        checked_in: `您的预约【${appt.serviceItem?.name}】（排队号：${appt.queueNumber}）已签到成功，请等待叫号。`,
        processing: `您的预约【${appt.serviceItem?.name}】正在办理中，请耐心等待。`,
        completed: `您的预约【${appt.serviceItem?.name}】已办理完成，感谢您的配合！${remark || ''}`,
        cancelled: `您的预约【${appt.serviceItem?.name}】已取消。${remark || ''}`,
        no_show: `您的预约【${appt.serviceItem?.name}】因未按时到场已过期，如需办理请重新预约。`,
      };

      if (titleMap[status]) {
        await queryRunner.manager.save(Message, {
          userId: appt.userId,
          title: titleMap[status],
          content: contentMap[status] || '',
          type: 'appointment',
          applicationId: appt.applicationId || null,
          appointmentId: appt.id,
        });
      }

      await queryRunner.commitTransaction();
      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async linkApplication(appointmentId: number, applicationId: number) {
    const appt = await this.appointmentRepository.findOne({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('预约不存在');
    const app = await this.applicationRepository.findOne({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('申请不存在');

    appt.applicationId = applicationId;
    const saved = await this.appointmentRepository.save(appt);

    await this.progressRepository.save({
      applicationId,
      step: '预约取号',
      status: 'completed',
      remark: `预约编号：${appt.appointmentNo}，排队号：${appt.queueNumber}，预约时间：${appt.appointmentDate} ${appt.startTime}-${appt.endTime}`,
    });

    return this.findOne(saved.id);
  }

  async cancel(id: number, userId: number, remark?: string) {
    const appt = await this.appointmentRepository.findOne({ where: { id } });
    if (!appt) throw new NotFoundException('预约不存在');
    if (appt.userId !== userId) throw new BadRequestException('无权取消该预约');
    if (appt.status !== 'pending') throw new BadRequestException('该预约状态无法取消');

    return this.updateStatus(id, 'cancelled', remark || '用户主动取消', userId);
  }

  async getStatsByDate(date: string) {
    const appointments = await this.appointmentRepository.find({
      where: { appointmentDate: date },
      relations: ['serviceItem'],
    });
    const stats: Record<string, any> = {};
    for (const appt of appointments) {
      const key = String(appt.serviceItemId);
      if (!stats[key]) {
        stats[key] = {
          serviceItemId: appt.serviceItemId,
          serviceItemName: appt.serviceItem?.name,
          total: 0,
          pending: 0,
          checked_in: 0,
          completed: 0,
          cancelled: 0,
          no_show: 0,
        };
      }
      stats[key].total++;
      if (stats[key][appt.status] !== undefined) {
        stats[key][appt.status]++;
      }
    }
    return Object.values(stats);
  }
}
