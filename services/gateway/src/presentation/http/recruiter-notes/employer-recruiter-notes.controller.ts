import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { GatewayRecruiterNotesService } from '../../../application/recruiter-notes/gateway-recruiter-notes.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import type { GatewayAuthenticatedUser } from '../../../auth/types/gateway-auth.types';

class RecruiterNoteWriteDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  body!: string;
}

@Controller()
@Roles('employer')
export class EmployerRecruiterNotesController {
  constructor(private readonly gatewayRecruiterNotesService: GatewayRecruiterNotesService) {}

  @Get('employer/applications/:applicationId/notes')
  async listApplicationNotes(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('applicationId') applicationId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayRecruiterNotesService.listNotes({
        applicationId,
        identityId: user.id,
        requestId
      }),
      message: 'Recruiter notes loaded successfully'
    };
  }

  @Post('employer/applications/:applicationId/notes')
  async createApplicationNote(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('applicationId') applicationId: string,
    @Body() dto: RecruiterNoteWriteDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayRecruiterNotesService.createNote({
        applicationId,
        body: dto.body,
        identityId: user.id,
        requestId
      }),
      message: 'Recruiter note created successfully'
    };
  }

  @Patch('employer/notes/:noteId')
  async updateRecruiterNote(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('noteId') noteId: string,
    @Body() dto: RecruiterNoteWriteDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayRecruiterNotesService.updateNote({
        body: dto.body,
        identityId: user.id,
        noteId,
        requestId
      }),
      message: 'Recruiter note updated successfully'
    };
  }

  @Delete('employer/notes/:noteId')
  async deleteRecruiterNote(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('noteId') noteId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayRecruiterNotesService.deleteNote({
        identityId: user.id,
        noteId,
        requestId
      }),
      message: 'Recruiter note deleted successfully'
    };
  }
}
