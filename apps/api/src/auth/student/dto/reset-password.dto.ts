import { IsString, Matches, MinLength } from "class-validator";

export class ResetPasswordDto {
  @IsString()
  resetToken!: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @Matches(/[A-Za-z]/, { message: "Password must contain a letter" })
  @Matches(/[0-9]/, { message: "Password must contain a number" })
  newPassword!: string;
}
