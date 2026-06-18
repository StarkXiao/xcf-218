import { Controller, Get, Post, Put, Body, Param, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { ApprovalService, TimelineNode } from './approval.service';
import { ApprovalFlow } from '../../entities/approval-flow.entity';

@Controller('api/approvals')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Post('flows')
  createFlow(
    @Body() body: { flow: Partial<ApprovalFlow>; nodes: Partial<ApprovalFlow>[] },
  ) {
    return this.approvalService.createFlow(body.flow, body.nodes);
  }

  @Get('flows')
  findAllFlows() {
    return this.approvalService.findAllFlows();
  }

  @Get('flows/:id')
  findFlowById(@Param('id') id: number) {
    return this.approvalService.findFlowById(id);
  }

  @Get('flows/code/:code')
  findFlowByCode(@Param('code') code: string) {
    return this.approvalService.findFlowByCode(code);
  }

  @Post('start')
  startApproval(
    @Body() body: { applicationId: number; flowCode: string; operatorId: number },
  ) {
    return this.approvalService.startApproval(body);
  }

  @Post('process')
  processApproval(
    @Body() body: {
      recordId: number;
      approverId: number;
      action: 'approve' | 'reject' | 'transfer';
      comment: string;
      targetNodeId?: number;
      transferToUserId?: number;
    },
  ) {
    return this.approvalService.processApproval(body);
  }

  @Post('withdraw/:id')
  withdraw(
    @Param('id') id: number,
    @Body() body: { operatorId: number; reason: string },
  ) {
    return this.approvalService.withdraw(id, body.operatorId, body.reason);
  }

  @Get('records/:id')
  findRecordById(@Param('id') id: number) {
    return this.approvalService.findRecordById(id);
  }

  @Get('records/application/:applicationId')
  findRecordByApplicationId(@Param('applicationId') applicationId: number) {
    return this.approvalService.findRecordByApplicationId(applicationId);
  }

  @Get('pending')
  findPendingRecords(
    @Query('approverId') approverId?: number,
    @Query('role') role?: string,
  ) {
    return this.approvalService.findPendingRecords(
      approverId ? Number(approverId) : undefined,
      role,
    );
  }

  @Get('timeline/:applicationId')
  getTimeline(@Param('applicationId') applicationId: number): Promise<TimelineNode[]> {
    return this.approvalService.getTimeline(applicationId);
  }

  @Get('comments/:applicationId')
  getComments(@Param('applicationId') applicationId: number) {
    return this.approvalService.getComments(applicationId);
  }

  @Get('rejectable-nodes/:applicationId')
  getRejectableNodes(@Param('applicationId') applicationId: number) {
    return this.approvalService.getRejectableNodes(applicationId);
  }

  @Get('approvers')
  getApproversByRole(@Query('role') role: string) {
    return this.approvalService.getApproversByRole(role);
  }
}
