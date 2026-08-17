import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { AdminStatus } from "@school-voting/shared";

// No `role` field here either — role can never be changed via the API,
// so a super_admin can never be downgraded (or a regular admin upgraded)
// through this endpoint.
export class UpdateAdminDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @IsOptional()
  @IsIn([AdminStatus.ACTIVE, AdminStatus.DISABLED])
  status?: AdminStatus;
}
