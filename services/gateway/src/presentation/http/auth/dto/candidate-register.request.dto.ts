import {
  Equals,
  IsEmail,
  IsString,
  MinLength
} from 'class-validator';

export class CandidateRegisterRequestDto {
  @Equals(true, {
    message: 'acceptTerms must be true'
  })
  acceptTerms!: true;

  @IsString()
  @MinLength(6)
  confirmPassword!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(8)
  phone!: string;
}
