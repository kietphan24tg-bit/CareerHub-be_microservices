import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDepartmentRequestDto {
  @ApiPropertyOptional({ example: 'Marketing' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Phòng Marketing & Truyền thông', nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string | null;
}
