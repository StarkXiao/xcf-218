import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { WindowHandling } from '../../entities/window-handling.entity';
import { QueueCall } from '../../entities/queue-call.entity';
import { User } from '../../entities/user.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { Application } from '../../entities/application.entity';
import { Message } from '../../entities/message.entity';
import { ProgressRecord } from '../../entities/progress-record.entity';
import { Appointment } from '../../entities/appointment.entity';
import * as dayjs from 'dayjs';

@Injectable()
export class WindowCoordinationService {
  constructor(
    @InjectRepository(WindowHandling) private readonly handlingRepository: Repository<WindowHandling>,
    @InjectRepository(QueueCall) private readonly callRepository: Repository<QueueCall>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(ServiceItem) private readonly itemRepository: Repository<ServiceItem>,
    @InjectRepository(Application) private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
    @InjectRepository(ProgressRecord) private readonly progressRepository: Repository<ProgressRecord>,
    @InjectRepository(Appointment) private readonly appointmentRepository: Repository<Appointment>,
    private readonly dataSource: DataSource,
  ) {}

  generateHandlingNo() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CK${y}${m}${d}${rand}`;
  }

  generateCallNo() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `JH${y}${m}${d}${rand}`;
  }

  generateQueueNumber(date: string, count: number, prefix: string = 'A') {
    const dateStr = dayjs(date).format('MMDD');
    const seq = String(count + 1).padStart(3, '0');
    return `${prefix}${dateStr}${seq}`;
  }

  generateApplicationNo() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SQ${y}${m}${d}${rand}`;
  }

  async createHandling(data: {
    windowNumber: string;
    userId: number;
    serviceItemId: number;
    applicantName?: string;
    applicantIdCard?: string;
    applicantPhone?: string;
    formData?: string;
    materials?: string;
    handlerId?: number;
  }) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userRepository.findOne({ where: { id: data.userId } });
      if (!user) throw new NotFoundException('用户不存在');

      const serviceItem = await this.itemRepository.findOne({ where: { id: data.serviceItemId } });
      if (!serviceItem) throw new NotFoundException('服务事项不存在');

      const today = dayjs().format('YYYY-MM-DD');
      const todayCount = await this.handlingRepository.count({
        where: {},
      });

      const handlingNo = this.generateHandlingNo();
      const queueNumber = this.generateQueueNumber(today, todayCount, 'W');

      const handling = this.handlingRepository.create({
        handlingNo,
        windowNumber: data.windowNumber,
        userId: data.userId,
        serviceItemId: data.serviceItemId,
        queueNumber,
        applicantName: data.applicantName || user.name,
        applicantIdCard: data.applicantIdCard || user.idCard,
        applicantPhone: data.applicantPhone || user.phone,
        formData: data.formData,
        materials: data.materials,
        status: 'accepted',
        handlerId: data.handlerId,
        acceptedAt: new Date(),
        syncStatus: 'pending',
      });

      const saved = await queryRunner.manager.save(handling);

      await queryRunner.manager.save(Message, {
        userId: data.userId,
        title: '窗口受理成功',
        content: `您的【${serviceItem.name}】已在${data.windowNumber}号窗口受理成功，排队号：${queueNumber}，受理编号：${handlingNo}。请耐心等待叫号。`,
        type: 'window',
        serviceItemId: data.serviceItemId,
        windowHandlingId: saved.id,
      });

      await queryRunner.commitTransaction();
      return this.findOneHandling(saved.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllHandlings(params?: {
    windowNumber?: string;
    serviceItemId?: number;
    status?: string;
    date?: string;
    userId?: number;
  }) {
    const where: any = {};
    if (params?.windowNumber) where.windowNumber = params.windowNumber;
    if (params?.serviceItemId) where.serviceItemId = params.serviceItemId;
    if (params?.status) where.status = params.status;
    if (params?.userId) where.userId = params.userId;

    const list = await this.handlingRepository.find({
      where,
      relations: ['user', 'serviceItem', 'application', 'handler'],
      order: { createdAt: 'DESC' },
    });

    if (params?.date) {
      const filtered = list.filter(h => dayjs(h.createdAt).format('YYYY-MM-DD') === params.date);
      return filtered.map(h => this.transformHandling(h));
    }

    return list.map(h => this.transformHandling(h));
  }

  async findOneHandling(id: number) {
    const handling = await this.handlingRepository.findOne({
      where: { id },
      relations: ['user', 'serviceItem', 'application', 'handler'],
    });
    if (!handling) throw new NotFoundException('窗口受理记录不存在');
    return this.transformHandling(handling);
  }

  private transformHandling(handling: WindowHandling) {
    const result: any = { ...handling };
    if (handling.user) {
      result.user = { ...handling.user, password: undefined };
    }
    if (handling.handler) {
      result.handler = { ...handling.handler, password: undefined };
    }
    return result;
  }

  async getHandlingStats(date?: string) {
    const targetDate = date || dayjs().format('YYYY-MM-DD');
    const startOfDay = dayjs(targetDate).startOf('day').toDate();
    const endOfDay = dayjs(targetDate).endOf('day').toDate();

    const all = await this.handlingRepository.find({
      where: {
        createdAt: Between(startOfDay, endOfDay),
      },
      relations: ['serviceItem'],
    });

    const stats: Record<string, any> = {};
    for (const h of all) {
      const key = String(h.serviceItemId);
      if (!stats[key]) {
        stats[key] = {
          serviceItemId: h.serviceItemId,
          serviceItemName: h.serviceItem?.name,
          total: 0,
          accepted: 0,
          processing: 0,
          completed: 0,
          cancelled: 0,
          synced: 0,
        };
      }
      stats[key].total++;
      if (stats[key][h.status] !== undefined) {
        stats[key][h.status]++;
      }
      if (h.syncStatus === 'synced') {
        stats[key].synced++;
      }
    }
    return Object.values(stats);
  }

  async getQueueList(params?: { windowNumber?: string; serviceItemId?: number }) {
    const where: any = { status: 'accepted' };
    if (params?.windowNumber) where.windowNumber = params.windowNumber;
    if (params?.serviceItemId) where.serviceItemId = params.serviceItemId;

    const list = await this.handlingRepository.find({
      where,
      relations: ['user', 'serviceItem'],
      order: { createdAt: 'ASC' },
    });

    return list.map(h => this.transformHandling(h));
  }

  async updateHandlingStatus(id: number, status: string, remark?: string, handlerId?: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const handling = await this.handlingRepository.findOne({
        where: { id },
        relations: ['user', 'serviceItem'],
      });
      if (!handling) throw new NotFoundException('窗口受理记录不存在');

      const validStatuses = ['accepted', 'processing', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new BadRequestException('无效的状态');
      }

      handling.status = status;
      if (handlerId) handling.handlerId = handlerId;
      if (remark) handling.handlingRemark = remark;

      const now = new Date();
      if (status === 'processing') handling.processingAt = now;
      if (status === 'completed') handling.completedAt = now;

      const saved = await queryRunner.manager.save(handling);

      const titleMap: Record<string, string> = {
        processing: '窗口正在办理',
        completed: '窗口办理完成',
        cancelled: '窗口办理已取消',
      };

      const contentMap: Record<string, string> = {
        processing: `您的【${handling.serviceItem?.name}】（排队号：${handling.queueNumber}）正在${handling.windowNumber}号窗口办理中。`,
        completed: `您的【${handling.serviceItem?.name}】（排队号：${handling.queueNumber}）已在${handling.windowNumber}号窗口办理完成。${remark || ''}`,
        cancelled: `您的【${handling.serviceItem?.name}】（排队号：${handling.queueNumber}）窗口办理已取消。${remark || ''}`,
      };

      if (titleMap[status]) {
        await queryRunner.manager.save(Message, {
          userId: handling.userId,
          title: titleMap[status],
          content: contentMap[status] || '',
          type: 'window',
          serviceItemId: handling.serviceItemId,
          windowHandlingId: handling.id,
        });
      }

      await queryRunner.commitTransaction();
      return this.findOneHandling(saved.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async syncToOnline(id: number, operatorId?: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const handling = await this.handlingRepository.findOne({
        where: { id },
        relations: ['user', 'serviceItem'],
      });
      if (!handling) throw new NotFoundException('窗口受理记录不存在');

      if (handling.syncStatus === 'synced') {
        throw new BadRequestException('该记录已同步到线上');
      }

      let application: Application;
      if (handling.applicationId) {
        application = await this.applicationRepository.findOne({ where: { id: handling.applicationId } });
        if (!application) throw new NotFoundException('关联的线上申请不存在');
      } else {
        const applicationNo = this.generateApplicationNo();
        application = this.applicationRepository.create({
          applicationNo,
          userId: handling.userId,
          serviceItemId: handling.serviceItemId,
          formData: handling.formData || '{}',
          materials: handling.materials || '[]',
          status: 'reviewing',
          reviewerId: operatorId,
          reviewComment: '线下窗口受理录入',
        });
        application = await queryRunner.manager.save(application);
        handling.applicationId = application.id;
      }

      await queryRunner.manager.save(ProgressRecord, {
        applicationId: application.id,
        step: '线下窗口受理',
        status: 'completed',
        remark: `受理编号：${handling.handlingNo}，窗口：${handling.windowNumber}号，排队号：${handling.queueNumber}`,
        operatorId,
      });

      if (handling.status === 'processing') {
        await queryRunner.manager.save(ProgressRecord, {
          applicationId: application.id,
          step: '窗口办理中',
          status: 'completed',
          remark: handling.handlingRemark || '',
          operatorId,
        });
      }

      if (handling.status === 'completed') {
        application.status = 'approved';
        application.reviewComment = handling.handlingRemark || '线下窗口办理完成';
        await queryRunner.manager.save(application);

        await queryRunner.manager.save(ProgressRecord, {
          applicationId: application.id,
          step: '窗口办理完成',
          status: 'completed',
          remark: handling.handlingRemark || '线下窗口办理完成',
          operatorId,
        });
      }

      handling.syncStatus = 'synced';
      handling.syncRemark = `已同步到线上申请，申请编号：${application.applicationNo}`;
      const saved = await queryRunner.manager.save(handling);

      await queryRunner.manager.save(Message, {
        userId: handling.userId,
        title: '线下办理已同步至线上',
        content: `您在${handling.windowNumber}号窗口办理的【${handling.serviceItem?.name}】已同步至线上，您可在"进度跟踪"中查看详细信息，申请编号：${application.applicationNo}。`,
        type: 'window',
        applicationId: application.id,
        serviceItemId: handling.serviceItemId,
        windowHandlingId: handling.id,
      });

      await queryRunner.commitTransaction();
      return this.findOneHandling(saved.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createCall(data: {
    windowNumber: string;
    windowHandlingId?: number;
    queueNumber?: string;
    callerId?: number;
  }) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let handling: WindowHandling | null = null;
      if (data.windowHandlingId) {
        handling = await this.handlingRepository.findOne({
          where: { id: data.windowHandlingId },
          relations: ['user', 'serviceItem'],
        });
      }

      const callNo = this.generateCallNo();
      const queueNumber = data.queueNumber || handling?.queueNumber;
      if (!queueNumber) throw new BadRequestException('缺少排队号');

      const call = this.callRepository.create({
        callNo,
        queueNumber,
        windowNumber: data.windowNumber,
        windowHandlingId: handling?.id,
        userId: handling?.userId,
        serviceItemId: handling?.serviceItemId,
        applicantName: handling?.applicantName,
        status: 'calling',
        callCount: 1,
        callerId: data.callerId,
        calledAt: new Date(),
      });

      const saved = await queryRunner.manager.save(call);

      if (handling?.userId) {
        await queryRunner.manager.save(Message, {
          userId: handling.userId,
          title: '请前往窗口办理',
          content: `请${queueNumber}号到${data.windowNumber}号窗口办理【${handling.serviceItem?.name}】。`,
          type: 'queue',
          serviceItemId: handling.serviceItemId,
          windowHandlingId: handling.id,
        });
      }

      await queryRunner.commitTransaction();
      return this.findOneCall(saved.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findOneCall(id: number) {
    const call = await this.callRepository.findOne({
      where: { id },
      relations: ['windowHandling', 'user', 'serviceItem', 'caller'],
    });
    if (!call) throw new NotFoundException('叫号记录不存在');
    return this.transformCall(call);
  }

  private transformCall(call: QueueCall) {
    const result: any = { ...call };
    if (call.user) {
      result.user = { ...call.user, password: undefined };
    }
    if (call.caller) {
      result.caller = { ...call.caller, password: undefined };
    }
    return result;
  }

  async findAllCalls(params?: { windowNumber?: string; status?: string; date?: string }) {
    const where: any = {};
    if (params?.windowNumber) where.windowNumber = params.windowNumber;
    if (params?.status) where.status = params.status;

    const list = await this.callRepository.find({
      where,
      relations: ['windowHandling', 'user', 'serviceItem', 'caller'],
      order: { createdAt: 'DESC' },
    });

    if (params?.date) {
      const filtered = list.filter(c => dayjs(c.createdAt).format('YYYY-MM-DD') === params.date);
      return filtered.map(c => this.transformCall(c));
    }

    return list.map(c => this.transformCall(c));
  }

  async getRecentCalls(limit: number = 10) {
    const list = await this.callRepository.find({
      relations: ['windowHandling', 'user', 'serviceItem'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return list.map(c => this.transformCall(c));
  }

  async getDisplayCalls() {
    const today = dayjs().format('YYYY-MM-DD');
    const startOfDay = dayjs(today).startOf('day').toDate();
    const endOfDay = dayjs(today).endOf('day').toDate();

    const callingList = await this.callRepository.find({
      where: {
        status: 'calling',
        createdAt: Between(startOfDay, endOfDay),
      },
      relations: ['windowHandling', 'serviceItem'],
      order: { calledAt: 'DESC' },
    });

    const waitingList = await this.handlingRepository.find({
      where: {
        status: 'accepted',
        createdAt: Between(startOfDay, endOfDay),
      },
      relations: ['serviceItem'],
      order: { createdAt: 'ASC' },
      take: 20,
    });

    const completedList = await this.callRepository.find({
      where: {
        status: 'arrived',
        createdAt: Between(startOfDay, endOfDay),
      },
      relations: ['windowHandling', 'serviceItem'],
      order: { arrivedAt: 'DESC' },
      take: 10,
    });

    return {
      calling: callingList.map(c => this.transformCall(c)),
      waiting: waitingList.map(h => this.transformHandling(h)),
      completed: completedList.map(c => this.transformCall(c)),
    };
  }

  async updateCallStatus(id: number, status: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const call = await this.callRepository.findOne({
        where: { id },
        relations: ['windowHandling', 'user', 'serviceItem'],
      });
      if (!call) throw new NotFoundException('叫号记录不存在');

      const validStatuses = ['calling', 'arrived', 'missed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new BadRequestException('无效的状态');
      }

      call.status = status;
      const now = new Date();
      if (status === 'arrived') call.arrivedAt = now;
      if (status === 'missed') call.missedAt = now;

      const saved = await queryRunner.manager.save(call);

      if (call.userId && (status === 'arrived' || status === 'missed')) {
        const titleMap: Record<string, string> = {
          arrived: '已确认到窗口',
          missed: '叫号未到',
        };
        const contentMap: Record<string, string> = {
          arrived: `您已到达${call.windowNumber}号窗口，正在办理【${call.serviceItem?.name}】。`,
          missed: `您的${call.queueNumber}号叫号未到，如您仍需办理请重新取号。`,
        };
        await queryRunner.manager.save(Message, {
          userId: call.userId,
          title: titleMap[status],
          content: contentMap[status] || '',
          type: 'queue',
          serviceItemId: call.serviceItemId,
          windowHandlingId: call.windowHandlingId,
        });
      }

      await queryRunner.commitTransaction();
      return this.findOneCall(saved.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async recallCall(id: number, callerId?: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const call = await this.callRepository.findOne({ where: { id } });
      if (!call) throw new NotFoundException('叫号记录不存在');

      call.callCount += 1;
      call.status = 'calling';
      call.calledAt = new Date();
      if (callerId) call.callerId = callerId;

      const saved = await queryRunner.manager.save(call);

      if (call.userId) {
        const serviceItem = await this.itemRepository.findOne({ where: { id: call.serviceItemId } });
        await queryRunner.manager.save(Message, {
          userId: call.userId,
          title: '再次叫号提醒',
          content: `请${call.queueNumber}号尽快到${call.windowNumber}号窗口办理【${serviceItem?.name || ''}】（第${call.callCount}次叫号）。`,
          type: 'queue',
          serviceItemId: call.serviceItemId,
          windowHandlingId: call.windowHandlingId,
        });
      }

      await queryRunner.commitTransaction();
      return this.findOneCall(saved.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async callNext(data: { windowNumber: string; serviceItemId?: number; callerId?: number }) {
    const where: any = { status: 'accepted', windowNumber: data.windowNumber };
    if (data.serviceItemId) where.serviceItemId = data.serviceItemId;

    const next = await this.handlingRepository.findOne({
      where,
      relations: ['user', 'serviceItem'],
      order: { createdAt: 'ASC' },
    });

    if (!next) {
      throw new NotFoundException('暂无等待办理的用户');
    }

    return this.createCall({
      windowNumber: data.windowNumber,
      windowHandlingId: next.id,
      queueNumber: next.queueNumber,
      callerId: data.callerId,
    });
  }
}
