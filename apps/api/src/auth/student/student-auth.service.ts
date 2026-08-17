import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { OtpOwnerType, OtpPurpose, StudentStatus, isAllowedUniversityEmail } from "@school-voting/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { OtpService } from "../../otp/otp.service";
import { EmailService } from "../../email/email.service";
import { AppConfigService } from "../../config/app-config.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

const RESET_TOKEN_TYPE = "student_password_reset";

@Injectable()
export class StudentAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly email: EmailService,
    private readonly jwt: JwtService,
    private readonly appConfig: AppConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<void> {
    if (!isAllowedUniversityEmail(dto.email, this.appConfig.allowedEmailDomains)) {
      throw new BadRequestException("Email domain is not an allowed university domain");
    }

    const existing = await this.prisma.student.findFirst({
      where: { OR: [{ email: dto.email }, { studentNumber: dto.studentNumber }] },
    });
    if (existing) {
      throw new ConflictException("An account with this email or student number already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const student = await this.prisma.student.create({
      data: {
        email: dto.email,
        studentNumber: dto.studentNumber,
        fullName: dto.fullName,
        passwordHash,
        status: StudentStatus.PENDING_VERIFICATION,
      },
    });

    const code = await this.otp.issue(OtpOwnerType.STUDENT, student.id, OtpPurpose.VERIFY_EMAIL);
    await this.email.sendOtpEmail(student.email, OtpPurpose.VERIFY_EMAIL, code);
  }

  async verifyOtp(email: string, code: string): Promise<void> {
    const student = await this.findStudentByEmailOrThrow(email);
    await this.otp.verify(OtpOwnerType.STUDENT, student.id, OtpPurpose.VERIFY_EMAIL, code);
    await this.prisma.student.update({
      where: { id: student.id },
      data: { status: StudentStatus.ACTIVE },
    });
  }

  async resendOtp(email: string, purpose: OtpPurpose): Promise<void> {
    const student = await this.findStudentByEmailOrThrow(email);
    const code = await this.otp.issue(OtpOwnerType.STUDENT, student.id, purpose);
    await this.email.sendOtpEmail(student.email, purpose, code);
  }

  async getProfile(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { email: true, fullName: true, studentNumber: true },
    });
    if (!student) {
      throw new UnauthorizedException();
    }
    return student;
  }

  async updateProfile(studentId: string, fullName: string) {
    return this.prisma.student.update({
      where: { id: studentId },
      data: { fullName },
      select: { email: true, fullName: true, studentNumber: true },
    });
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const student = await this.prisma.student.findUnique({ where: { email: dto.email } });
    if (!student) {
      throw new UnauthorizedException("Invalid email or password");
    }
    if (student.status !== StudentStatus.ACTIVE) {
      throw new UnauthorizedException("Account is not verified yet");
    }

    const matches = await bcrypt.compare(dto.password, student.passwordHash);
    if (!matches) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const accessToken = this.jwt.sign(
      { sub: student.id, email: student.email, scope: "student" },
      { expiresIn: this.appConfig.jwtAccessTokenTtl },
    );
    return { accessToken };
  }

  async forgotPassword(email: string): Promise<void> {
    const student = await this.prisma.student.findUnique({ where: { email } });
    // Deliberately don't reveal whether the account exists.
    if (!student) return;
    const code = await this.otp.issue(OtpOwnerType.STUDENT, student.id, OtpPurpose.PASSWORD_RESET);
    await this.email.sendOtpEmail(student.email, OtpPurpose.PASSWORD_RESET, code);
  }

  async verifyResetOtp(email: string, code: string): Promise<{ resetToken: string }> {
    const student = await this.findStudentByEmailOrThrow(email);
    await this.otp.verify(OtpOwnerType.STUDENT, student.id, OtpPurpose.PASSWORD_RESET, code);
    const resetToken = this.jwt.sign(
      { sub: student.id, type: RESET_TOKEN_TYPE },
      { expiresIn: this.appConfig.jwtResetTokenTtl },
    );
    return { resetToken };
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    let payload: { sub: string; type: string };
    try {
      payload = this.jwt.verify(resetToken);
    } catch {
      throw new UnauthorizedException("Reset token is invalid or has expired");
    }
    if (payload.type !== RESET_TOKEN_TYPE) {
      throw new UnauthorizedException("Reset token is invalid");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.student.update({
      where: { id: payload.sub },
      data: { passwordHash },
    });
  }

  private async findStudentByEmailOrThrow(email: string) {
    const student = await this.prisma.student.findUnique({ where: { email } });
    if (!student) {
      throw new BadRequestException("No account found for this email");
    }
    return student;
  }
}
