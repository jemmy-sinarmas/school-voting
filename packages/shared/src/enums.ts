export enum StudentStatus {
  PENDING_VERIFICATION = "pending_verification",
  ACTIVE = "active",
  DISABLED = "disabled",
}

export enum AdminRole {
  ADMIN = "admin",
  SUPER_ADMIN = "super_admin",
}

export enum AdminStatus {
  ACTIVE = "active",
  DISABLED = "disabled",
}

export enum OtpOwnerType {
  STUDENT = "student",
  ADMIN = "admin",
}

export enum OtpPurpose {
  VERIFY_EMAIL = "verify_email",
  PASSWORD_RESET = "password_reset",
}

export enum ListStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  CLOSED = "closed",
}
