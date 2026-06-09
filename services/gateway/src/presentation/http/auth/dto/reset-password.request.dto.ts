import { IsString, MinLength } from 'class-validator';

export class ResetPasswordRequestDto {
  @IsString()
  @MinLength(6)
  newPassword!: string;

  @IsString()
  @MinLength(6)
  token!: string;
}
