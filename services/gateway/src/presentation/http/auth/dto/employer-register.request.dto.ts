import {
  Equals,
  IsEmail,
  IsString,
  MinLength
} from 'class-validator';

export class EmployerRegisterRequestDto {
  @Equals(true, {
    message: 'acceptTerms must be true'
  })
  acceptTerms!: true;

  @IsString()
  @MinLength(5)
  address!: string;

  @IsEmail()
  companyEmail!: string;

  @IsString()
  @MinLength(2)
  companyName!: string;

  @IsString()
  @MinLength(6)
  confirmPassword!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(2)
  industry!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(8)
  phone!: string;
}
