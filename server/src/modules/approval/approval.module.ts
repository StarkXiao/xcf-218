import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalFlow } from '../../entities/approval-flow.entity';
import { ApprovalNode } from '../../entities/approval-node.entity';
import { ApprovalRecord } from '../../entities/approval-record.entity';
import { ApprovalComment } from '../../entities/approval-comment.entity';
import { ApprovalHistory } from '../../entities/approval-history.entity';
import { Application } from '../../entities/application.entity';
import { User } from '../../entities/user.entity';
import { Message } from '../../entities/message.entity';
import { ProgressRecord } from '../../entities/progress-record.entity';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { JointApplicationModule } from '../joint-application/joint-application.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApprovalFlow,
      ApprovalNode,
      ApprovalRecord,
      ApprovalComment,
      ApprovalHistory,
      Application,
      User,
      Message,
      ProgressRecord,
    ]),
    forwardRef(() => JointApplicationModule),
  ],
  providers: [ApprovalService],
  controllers: [ApprovalController],
  exports: [ApprovalService],
})
export class ApprovalModule {}
