import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { ServiceItem } from './entities/service-item.entity';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(ServiceItem) private readonly serviceItemRepository: Repository<ServiceItem>,
  ) {}

  async seed() {
    await this.seedUsers();
    await this.seedServiceItems();
  }

  private async seedUsers() {
    const adminCount = await this.userRepository.count({ where: { role: 'admin' } });
    if (adminCount === 0) {
      await this.userRepository.save({
        username: 'admin',
        password: 'admin123',
        name: '系统管理员',
        idCard: '110101199001010000',
        phone: '13800000000',
        role: 'admin',
      });
      console.log('已创建管理员账号: admin / admin123');
    }

    const userCount = await this.userRepository.count({ where: { role: 'user' } });
    if (userCount === 0) {
      await this.userRepository.save({
        username: 'user',
        password: 'user123',
        name: '张三',
        idCard: '110101199001010001',
        phone: '13800000001',
        role: 'user',
      });
      console.log('已创建普通用户账号: user / user123');
    }
  }

  private async seedServiceItems() {
    const count = await this.serviceItemRepository.count();
    if (count === 0) {
      const items = [
        {
          name: '居民身份证办理',
          code: 'ID-001',
          category: '户政服务',
          description: '首次申请、换领、补领居民身份证',
          requirements: '年满16周岁公民应当自年满之日起三个月内，向常住户口所在地的公安机关申请领取居民身份证。',
          materials: JSON.stringify([
            { name: '居民户口簿', required: true },
            { name: '本人近期一寸免冠照片', required: true },
            { name: '申领登记表', required: true },
          ]),
          processingDays: 20,
        },
        {
          name: '社保卡申领',
          code: 'SOC-001',
          category: '社会保障',
          description: '申领社会保障卡，用于办理各项社会保险业务',
          requirements: '已参加社会保险的人员均可申领。',
          materials: JSON.stringify([
            { name: '本人有效身份证件', required: true },
            { name: '近期一寸免冠彩色照片', required: true },
            { name: '社会保险参保证明', required: false },
          ]),
          processingDays: 15,
        },
        {
          name: '营业执照办理',
          code: 'BUS-001',
          category: '市场监管',
          description: '个体工商户或企业营业执照的设立登记',
          requirements: '有经营能力的公民，依照规定经工商行政管理部门登记，从事工商业经营的，为个体工商户。',
          materials: JSON.stringify([
            { name: '申请人身份证明', required: true },
            { name: '经营场所证明', required: true },
            { name: '个体工商户登记申请书', required: true },
            { name: '经营范围说明', required: true },
          ]),
          processingDays: 7,
        },
        {
          name: '不动产权证办理',
          code: 'PROP-001',
          category: '不动产登记',
          description: '国有土地范围内房屋所有权登记',
          requirements: '申请房屋所有权登记，应当提交相关证明材料。',
          materials: JSON.stringify([
            { name: '登记申请书', required: true },
            { name: '申请人身份证明', required: true },
            { name: '房屋所有权证书或者房地产权证书', required: true },
            { name: '证明房屋所有权发生转移的材料', required: true },
          ]),
          processingDays: 30,
        },
        {
          name: '出入境通行证办理',
          code: 'PAS-001',
          category: '出入境管理',
          description: '中华人民共和国普通护照签发',
          requirements: '公民因前往外国定居、探亲、学习、就业、旅行、从事商务活动等非公务原因出国的，由本人向户籍所在地的县级以上地方人民政府公安机关出入境管理机构申请普通护照。',
          materials: JSON.stringify([
            { name: '近期免冠照片一张', required: true },
            { name: '居民身份证', required: true },
            { name: '中国公民因私出国申请表', required: true },
          ]),
          processingDays: 10,
        },
        {
          name: '公积金提取',
          code: 'HF-001',
          category: '住房公积金',
          description: '职工提取住房公积金账户内的存储余额',
          requirements: '职工有下列情形之一的，可以提取职工住房公积金账户内的存储余额：购买、建造、翻建、大修自住住房的；离休、退休的；完全丧失劳动能力，并与单位终止劳动关系的等。',
          materials: JSON.stringify([
            { name: '提取申请书', required: true },
            { name: '本人身份证件', required: true },
            { name: '购房合同或相关证明材料', required: true },
            { name: '婚姻状况证明', required: false },
          ]),
          processingDays: 5,
        },
      ];

      for (const item of items) {
        await this.serviceItemRepository.save(item);
      }
      console.log(`已创建 ${items.length} 个办事事项`);
    }
  }
}
