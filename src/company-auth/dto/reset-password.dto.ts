import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8, { message: 'Nova senha deve ter no mínimo 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Nova senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial',
  })
  newPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'Confirmação de senha é obrigatória!' })
  confirmNewPassword: string;
}
