import { Injectable } from '@nestjs/common';
import type { Department } from '@careerhub/contracts';
import { EmployerGrpcClient } from '../../infrastructure/transport/grpc/employer-grpc.client';

export type GatewayDepartment = {
  companyId: string;
  createdAt: string;
  description: string | null;
  id: string;
  name: string;
  updatedAt: string;
};

function toGatewayDepartment(dept: Department): GatewayDepartment {
  const nullFields = new Set(dept.null_fields ?? []);

  return {
    companyId: dept.company_id,
    createdAt: dept.created_at,
    description: nullFields.has('description') ? null : dept.description || null,
    id: dept.id,
    name: dept.name,
    updatedAt: dept.updated_at
  };
}

@Injectable()
export class GatewayDepartmentsService {
  constructor(private readonly employerGrpcClient: EmployerGrpcClient) {}

  async listByCompany(input: {
    identityId: string;
    requestId?: string;
  }): Promise<GatewayDepartment[]> {
    const response = await this.employerGrpcClient.listDepartmentsByCompany(
      { identity_id: input.identityId },
      input.requestId
    );

    return (response.departments ?? []).map(toGatewayDepartment);
  }

  async create(input: {
    identityId: string;
    description?: string | null;
    name: string;
    requestId?: string;
  }): Promise<GatewayDepartment> {
    const response = await this.employerGrpcClient.createDepartment(
      {
        identity_id: input.identityId,
        description: input.description ?? '',
        name: input.name
      },
      input.requestId
    );

    return toGatewayDepartment(response.department);
  }

  async update(input: {
    description?: string | null;
    id: string;
    name?: string;
    requestId?: string;
  }): Promise<GatewayDepartment> {
    const updatedFields: string[] = [];
    const clearFields: string[] = [];

    if (input.name !== undefined) updatedFields.push('name');
    if (input.description !== undefined) {
      if (input.description === null) {
        clearFields.push('description');
      } else {
        updatedFields.push('description');
      }
    }

    const response = await this.employerGrpcClient.updateDepartment(
      {
        clear_fields: clearFields,
        description: input.description ?? '',
        id: input.id,
        name: input.name ?? '',
        updated_fields: updatedFields
      },
      input.requestId
    );

    return toGatewayDepartment(response.department);
  }

  async delete(input: { id: string; requestId?: string }): Promise<void> {
    await this.employerGrpcClient.deleteDepartment({ id: input.id }, input.requestId);
  }
}
