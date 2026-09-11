import { IsIn } from "class-validator";
import { StudentStatus } from "@school-voting/shared";

// Admins may only move a student between active and disabled.
// pending_verification is a system-only state (set at registration, cleared by
// OTP verification) and is intentionally not settable here.
export class UpdateStudentStatusDto {
  @IsIn([StudentStatus.ACTIVE, StudentStatus.DISABLED])
  status!: StudentStatus.ACTIVE | StudentStatus.DISABLED;
}
