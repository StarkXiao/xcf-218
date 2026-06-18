import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProxyApplication } from '../../entities/proxy-application.entity';
import { ProxyProgressRecord } from '../../entities/proxy-progress-record.entity';
import { ProxyRelation } from '../../entities/proxy-relation.entity';
import { User } from '../../entities/user.entity';
import { Message } from '../../entities/message.entity';

interface CreateProxyApplicationData {
  principalId: number;
  proxyName: string;
  proxyIdCard: string;
  proxyPhone: string;
  proxyRelation?: string;
  authorizationScope: string;
  idCardFrontPath?: string;
  idCardBackPath?: string;
  authorizationLetterPath?: string;
}

interface RiskAssessmentResult {
  riskLevel: number;
  riskTips: string[];
}

@Injectable()
export class ProxyService {
  constructor(
    @InjectRepository(ProxyApplication) private readonly proxyAppRepository: Repository<ProxyApplication>,
    @InjectRepository(ProxyProgressRecord) private readonly proxyProgressRepository: Repository<ProxyProgressRecord>,
    @InjectRepository(ProxyRelation) private readonly proxyRelationRepository: Repository<ProxyRelation>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
    private readonly dataSource: DataSource,
  ) {}

  generateApplicationNo(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `DB${y}${m}${d}${rand}`;
  }

  private assessRisk(data: CreateProxyApplicationData): RiskAssessmentResult {
    const tips: string[] = [];
    let level = 0;

    if (!data.idCardFrontPath || !data.idCardBackPath) {
      level += 2;
      tips.push('未上传完整身份证明材料');
    }

    if (!data.authorizationLetterPath) {
      level += 2;
      tips.push('未上传授权委托书');
    }

    if (!data.proxyRelation) {
      level += 1;
      tips.push('未说明与委托人的关系');
    }

    const scope = data.authorizationScope || '';
    if (scope.includes('全部') || scope.includes('所有') || scope.length > 200) {
      level += 2;
      tips.push('授权范围过大，建议明确具体授权事项');
    }

    const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
    if (!idCardRegex.test(data.proxyIdCard)) {
      level += 3;
      tips.push('身份证号格式不正确');
    }

    if (data.proxyPhone && data.proxyPhone.length !== 11) {
      level += 1;
      tips.push('手机号格式需核验');
    }

    return {
      riskLevel: Math.min(level, 5),
      riskTips: tips,
    };
  }

  async createApplication(data: CreateProxyApplicationData) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const principal = await this.userRepository.findOne({ where: { id: data.principalId } });
      if (!principal) {
        throw new NotFoundException('委托人不存在');
      }

      const riskAssessment = this.assessRisk(data);
      const applicationNo = this.generateApplicationNo();

      const application = this.proxyAppRepository.create({
        applicationNo,
        principalId: data.principalId,
        proxyName: data.proxyName,
        proxyIdCard: data.proxyIdCard,
        proxyPhone: data.proxyPhone,
        proxyRelation: data.proxyRelation,
        authorizationScope: data.authorizationScope,
        idCardFrontPath: data.idCardFrontPath,
        idCardBackPath: data.idCardBackPath,
        authorizationLetterPath: data.authorizationLetterPath,
        status: 'submitted',
        riskLevel: riskAssessment.riskLevel,
        riskTips: JSON.stringify(riskAssessment.riskTips),
      });

      const savedApp = await queryRunner.manager.save(application);

      await queryRunner.manager.save(ProxyProgressRecord, {
        proxyApplicationId: savedApp.id,
        step: '提交申请',
        status: 'completed',
        remark: '代办人申请已提交，等待审核',
        operatorId: data.principalId,
      });

      if (riskAssessment.riskLevel >= 3) {
        await queryRunner.manager.save(ProxyProgressRecord, {
          proxyApplicationId: savedApp.id,
          step: '风险评估',
          status: 'warning',
          remark: `风险等级：${riskAssessment.riskLevel}级 - ${riskAssessment.riskTips.join('；')}`,
          operatorId: null,
        });
      }

      await queryRunner.manager.save(Message, {
        userId: data.principalId,
        title: '代办人申请已提交',
        content: `您的代办人申请（编号：${applicationNo}）已成功提交，我们将尽快为您审核。`,
        type: 'proxy',
      });

      await queryRunner.commitTransaction();
      return this.findOneApplication(savedApp.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findMyApplications(principalId: number) {
    const apps = await this.proxyAppRepository.find({
      where: { principalId },
      relations: ['progressRecords'],
      order: { createdAt: 'DESC' },
    });
    return apps.map(app => this.transformApplication(app));
  }

  async findAllApplications(status?: string) {
    const where: any = {};
    if (status) where.status = status;
    const apps = await this.proxyAppRepository.find({
      where,
      relations: ['principal', 'progressRecords'],
      order: { createdAt: 'DESC' },
    });
    return apps.map(app => this.transformApplication(app, true));
  }

  async findOneApplication(id: number, includeUser = false) {
    const app = await this.proxyAppRepository.findOne({
      where: { id },
      relations: includeUser ? ['principal', 'progressRecords'] : ['progressRecords'],
    });
    if (!app) throw new NotFoundException('代办人申请不存在');
    return this.transformApplication(app, includeUser);
  }

  private transformApplication(app: ProxyApplication, includeUser = false) {
    const result: any = {
      ...app,
      riskTips: app.riskTips ? JSON.parse(app.riskTips) : [],
      progressRecords: app.progressRecords || [],
    };
    if (includeUser && app.principal) {
      result.principal = { ...app.principal, password: undefined };
    }
    return result;
  }

  async reviewApplication(id: number, action: 'approve' | 'reject' | 'reviewing', comment: string, reviewerId: number) {
    const app = await this.proxyAppRepository.findOne({ where: { id } });
    if (!app) throw new NotFoundException('代办人申请不存在');

    if (app.status === 'approved' || app.status === 'rejected') {
      throw new BadRequestException('该申请已完成审核，无法重复操作');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const statusMap: Record<string, string> = {
        approve: 'approved',
        reject: 'rejected',
        reviewing: 'reviewing',
      };

      const stepMap: Record<string, { step: string; status: string }> = {
        approve: { step: '审核通过', status: 'completed' },
        reject: { step: '审核驳回', status: 'failed' },
        reviewing: { step: '开始审核', status: 'processing' },
      };

      app.status = statusMap[action];
      app.reviewComment = comment;
      app.reviewerId = reviewerId;
      await queryRunner.manager.save(app);

      const stepInfo = stepMap[action];
      await queryRunner.manager.save(ProxyProgressRecord, {
        proxyApplicationId: id,
        step: stepInfo.step,
        status: stepInfo.status,
        remark: comment,
        operatorId: reviewerId,
      });

      if (action === 'approve') {
        let proxyUser = await this.userRepository.findOne({ where: { idCard: app.proxyIdCard } });
        
        if (!proxyUser) {
          const tempUsername = `proxy_${app.proxyIdCard.slice(-6)}`;
          proxyUser = this.userRepository.create({
            username: tempUsername,
            password: '123456',
            name: app.proxyName,
            idCard: app.proxyIdCard,
            phone: app.proxyPhone,
            role: 'user',
          });
          proxyUser = await queryRunner.manager.save(proxyUser);
        }

        const existingRelation = await this.proxyRelationRepository.findOne({
          where: { principalId: app.principalId, proxyId: proxyUser.id },
        });

        if (!existingRelation) {
          const relation = this.proxyRelationRepository.create({
            principalId: app.principalId,
            proxyId: proxyUser.id,
            proxyRelation: app.proxyRelation,
            authorizationScope: app.authorizationScope,
            isActive: true,
            sourceApplicationId: app.id,
          });
          await queryRunner.manager.save(relation);
        } else {
          existingRelation.isActive = true;
          existingRelation.authorizationScope = app.authorizationScope;
          existingRelation.proxyRelation = app.proxyRelation;
          existingRelation.sourceApplicationId = app.id;
          await queryRunner.manager.save(existingRelation);
        }

        await queryRunner.manager.save(Message, {
          userId: app.principalId,
          title: '代办人申请已通过',
          content: `您的代办人申请（编号：${app.applicationNo}）已审核通过。代办人：${app.proxyName}。`,
          type: 'proxy',
        });
      } else if (action === 'reject') {
        await queryRunner.manager.save(Message, {
          userId: app.principalId,
          title: '代办人申请被驳回',
          content: `您的代办人申请（编号：${app.applicationNo}）被驳回。原因：${comment}`,
          type: 'proxy',
        });
      }

      await queryRunner.commitTransaction();
      return this.findOneApplication(id, true);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getProxyRelations(principalId: number) {
    const relations = await this.proxyRelationRepository.find({
      where: { principalId, isActive: true },
      relations: ['proxy'],
      order: { createdAt: 'DESC' },
    });
    return relations.map(r => ({
      ...r,
      proxy: r.proxy ? { ...r.proxy, password: undefined } : null,
    }));
  }

  async getMyPrincipals(proxyId: number) {
    const relations = await this.proxyRelationRepository.find({
      where: { proxyId, isActive: true },
      relations: ['principal'],
      order: { createdAt: 'DESC' },
    });
    return relations.map(r => ({
      ...r,
      principal: r.principal ? { ...r.principal, password: undefined } : null,
    }));
  }

  async deactivateRelation(id: number, principalId: number) {
    const relation = await this.proxyRelationRepository.findOne({ where: { id, principalId } });
    if (!relation) throw new NotFoundException('代理关系不存在');

    relation.isActive = false;
    await this.proxyRelationRepository.save(relation);

    await this.messageRepository.save({
      userId: relation.proxyId,
      title: '代理关系已解除',
      content: '您的某个代理关系已被委托人解除。',
      type: 'proxy',
    });

    return { success: true };
  }

  async getProgressRecords(proxyApplicationId: number) {
    return this.proxyProgressRepository.find({
      where: { proxyApplicationId },
      order: { createdAt: 'ASC' },
    });
  }

  async getStatistics() {
    const [total, submitted, reviewing, approved, rejected] = await Promise.all([
      this.proxyAppRepository.count(),
      this.proxyAppRepository.count({ where: { status: 'submitted' } }),
      this.proxyAppRepository.count({ where: { status: 'reviewing' } }),
      this.proxyAppRepository.count({ where: { status: 'approved' } }),
      this.proxyAppRepository.count({ where: { status: 'rejected' } }),
    ]);

    const activeRelations = await this.proxyRelationRepository.count({ where: { isActive: true } });
    const highRiskApps = await this.proxyAppRepository
      .createQueryBuilder('app')
      .where('app.riskLevel >= :level', { level: 3 })
      .andWhere('app.status IN (:...statuses)', { statuses: ['submitted', 'reviewing'] })
      .getCount();

    return {
      totalApplications: total,
      submittedCount: submitted,
      reviewingCount: reviewing,
      approvedCount: approved,
      rejectedCount: rejected,
      activeRelations,
      highRiskCount: highRiskApps,
    };
  }
}
