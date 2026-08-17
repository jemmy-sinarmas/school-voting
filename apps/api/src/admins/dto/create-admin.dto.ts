import { IsEmail, IsString, Matches, MinLength } from "class-validator";

// Deliberately has no `role` field: the API can never be used to grant
// super_admin — that value is only ever assigned via the seed/bootstrap
// script, closing off "create a second super admin, then delete the
// first" as an attack path.
export class CreateAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  fullName!: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @Matches(/[A-Za-z]/, { message: "Password must contain a letter" })
  @Matches(/[0-9]/, { message: "Password must contain a number" })
  temporaryPassword!: string;
}
