import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GatewayDepartmentsService } from '../../../application/departments/gateway-departments.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import type { GatewayAuthenticatedUser } from '../../../auth/types/gateway-auth.types';
import { CreateDepartmentRequestDto } from './dto/create-department.request.dto';
import { UpdateDepartmentRequestDto } from './dto/update-department.request.dto';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('employer/departments')
@Roles('employer')
export class EmployerDepartmentsController {
  constructor(private readonly gatewayDepartmentsService: GatewayDepartmentsService) {}

  @Get()
  async listDepartments(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Headers('x-request-id') requestId?: string
  ) {
    const departments = await this.gatewayDepartmentsService.listByCompany({
      identityId: user.id,
      requestId
    });

    return {
      data: departments,
      message: 'Departments loaded successfully'
    };
  }

  @Post()
  async createDepartment(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Body() dto: CreateDepartmentRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    const department = await this.gatewayDepartmentsService.create({
      identityId: user.id,
      description: dto.description,
      name: dto.name,
      requestId
    });

    return {
      data: department,
      message: 'Department created successfully'
    };
  }

  @Patch(':id')
  async updateDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    const department = await this.gatewayDepartmentsService.update({
      description: dto.description,
      id,
      name: dto.name,
      requestId
    });

    return {
      data: department,
      message: 'Department updated successfully'
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDepartment(
    @Param('id') id: string,
    @Headers('x-request-id') requestId?: string
  ) {
    await this.gatewayDepartmentsService.delete({ id, requestId });
  }
}
