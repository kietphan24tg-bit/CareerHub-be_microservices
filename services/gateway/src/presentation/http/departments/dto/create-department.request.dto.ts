import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDepartmentRequestDto {
  @ApiProperty({ example: 'Kỹ thuật' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Phòng phát triển sản phẩm và hạ tầng kỹ thuật' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string | null;
}
