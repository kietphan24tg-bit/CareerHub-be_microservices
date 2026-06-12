import { IsString } from 'class-validator';

export class SaveJobRequestDto {
  @IsString()
  jobId!: string;
}
