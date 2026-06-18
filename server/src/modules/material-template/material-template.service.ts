import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialTemplate } from '../../entities/material-template.entity';

@Injectable()
export class MaterialTemplateService {
  constructor(
    @InjectRepository(MaterialTemplate) private readonly repository: Repository<MaterialTemplate>,
  ) {}

  async create(data: Partial<MaterialTemplate>) {
    if (data.fields) {
      try {
        JSON.parse(data.fields);
      } catch {
        throw new BadRequestException('字段定义格式不正确，必须为有效JSON');
      }
    }

    const serviceItemId = data.serviceItemId;
    const currentVersion = await this.getLatestVersion(serviceItemId);
    const newVersion = currentVersion + 1;

    await this.repository.update(
      { serviceItemId, isCurrent: true },
      { isCurrent: false },
    );

    const template = this.repository.create({
      ...data,
      version: newVersion,
      isActive: true,
      isCurrent: true,
    });

    return this.repository.save(template);
  }

  async findByServiceItem(serviceItemId: number) {
    return this.repository.find({
      where: { serviceItemId },
      order: { version: 'DESC' },
    });
  }

  async findCurrentByServiceItem(serviceItemId: number) {
    const template = await this.repository.findOne({
      where: { serviceItemId, isCurrent: true, isActive: true },
    });
    if (!template) return null;
    return this.transformTemplate(template);
  }

  async findAll(serviceItemId?: number) {
    const where: any = {};
    if (serviceItemId) where.serviceItemId = serviceItemId;
    const templates = await this.repository.find({
      where,
      order: { updatedAt: 'DESC' },
    });
    return templates.map(t => this.transformTemplate(t));
  }

  async findOne(id: number) {
    const template = await this.repository.findOne({ where: { id } });
    if (!template) throw new NotFoundException('模板不存在');
    return this.transformTemplate(template);
  }

  async update(id: number, data: Partial<MaterialTemplate>) {
    const template = await this.repository.findOne({ where: { id } });
    if (!template) throw new NotFoundException('模板不存在');

    if (data.fields) {
      try {
        JSON.parse(data.fields);
      } catch {
        throw new BadRequestException('字段定义格式不正确，必须为有效JSON');
      }
    }

    await this.repository.update(id, data);
    return this.findOne(id);
  }

  async enable(id: number) {
    const template = await this.repository.findOne({ where: { id } });
    if (!template) throw new NotFoundException('模板不存在');
    await this.repository.update(id, { isActive: true });
    return { success: true };
  }

  async disable(id: number) {
    const template = await this.repository.findOne({ where: { id } });
    if (!template) throw new NotFoundException('模板不存在');

    if (template.isCurrent) {
      throw new BadRequestException('当前使用中的模板不能停用，请先切换到其他版本');
    }

    await this.repository.update(id, { isActive: false });
    return { success: true };
  }

  async switchVersion(id: number) {
    const template = await this.repository.findOne({ where: { id } });
    if (!template) throw new NotFoundException('模板不存在');

    if (!template.isActive) {
      throw new BadRequestException('已停用的模板不能切换为当前版本，请先启用');
    }

    await this.repository.update(
      { serviceItemId: template.serviceItemId, isCurrent: true },
      { isCurrent: false },
    );

    await this.repository.update(id, { isCurrent: true });
    return { success: true };
  }

  async remove(id: number) {
    const template = await this.repository.findOne({ where: { id } });
    if (!template) throw new NotFoundException('模板不存在');

    if (template.isCurrent) {
      throw new BadRequestException('当前使用中的模板不能删除，请先切换到其他版本');
    }

    await this.repository.delete(id);
    return { success: true };
  }

  private async getLatestVersion(serviceItemId: number): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('t')
      .select('MAX(t.version)', 'maxVersion')
      .where('t.serviceItemId = :serviceItemId', { serviceItemId })
      .getRawOne();
    return result?.maxVersion || 0;
  }

  private transformTemplate(template: MaterialTemplate) {
    try {
      return { ...template, fields: JSON.parse(template.fields) };
    } catch {
      return { ...template, fields: [] };
    }
  }
}
