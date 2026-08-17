import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { OtpPurpose } from "@school-voting/shared";
import { StudentAuthService } from "./student-auth.service";
import { RegisterDto } from "./dto/register.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { StudentJwtAuthGuard } from "./student-jwt-auth.guard";
import { CurrentStudent } from "./current-student.decorator";
import { StudentJwtPayload } from "./student-jwt.strategy";

// Rate-limited: register/login/OTP endpoints are the most attractive
// brute-force/spam targets in the whole API.
@Controller("auth/student")
@UseGuards(ThrottlerGuard)
export class StudentAuthController {
  constructor(private readonly service: StudentAuthService) {}

  @Get("me")
  @UseGuards(StudentJwtAuthGuard)
  me(@CurrentStudent() student: StudentJwtPayload) {
    return this.service.getProfile(student.sub);
  }

  @Patch("me")
  @UseGuards(StudentJwtAuthGuard)
  updateMe(@CurrentStudent() student: StudentJwtPayload, @Body() dto: UpdateProfileDto) {
    return this.service.updateProfile(student.sub, dto.fullName);
  }

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.service.register(dto);
  }

  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.service.verifyOtp(dto.email, dto.code);
  }

  @Post("resend-otp")
  @HttpCode(HttpStatus.OK)
  resendOtp(@Body() dto: ForgotPasswordDto) {
    return this.service.resendOtp(dto.email, OtpPurpose.VERIFY_EMAIL);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.service.forgotPassword(dto.email);
  }

  @Post("verify-reset-otp")
  @HttpCode(HttpStatus.OK)
  verifyResetOtp(@Body() dto: VerifyOtpDto) {
    return this.service.verifyResetOtp(dto.email, dto.code);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.service.resetPassword(dto.resetToken, dto.newPassword);
  }
}
