import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { randomInt } from "crypto";
import * as bcrypt from "bcrypt";
import { OtpOwnerType, OtpPurpose } from "@school-voting/shared";
import { PrismaService } from "../prisma/prisma.service";

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

@Injectable()
export class OtpService {
  constructor(private readonly prisma: PrismaService) {}

  /** Generates and persists a new OTP, enforcing a resend cooldown. Returns the plaintext code to email to the user. */
  async issue(ownerType: OtpOwnerType, ownerId: string, purpose: OtpPurpose): Promise<string> {
    const mostRecent = await this.prisma.otpCode.findFirst({
      where: { ownerType, ownerId, purpose },
      orderBy: { createdAt: "desc" },
    });

    if (mostRecent && Date.now() - mostRecent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      throw new ConflictException("Please wait before requesting another code");
    }

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, 10);

    await this.prisma.otpCode.create({
      data: {
        ownerType,
        ownerId,
        purpose,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    return code;
  }

  /** Verifies a submitted code against the latest unconsumed, unexpired OTP for this owner+purpose. */
  async verify(ownerType: OtpOwnerType, ownerId: string, purpose: OtpPurpose, submittedCode: string): Promise<void> {
    const otp = await this.prisma.otpCode.findFirst({
      where: { ownerType, ownerId, purpose, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw new BadRequestException("Code is invalid or has expired");
    }

    if (otp.attemptCount >= otp.maxAttempts) {
      throw new UnauthorizedException("Too many attempts — request a new code");
    }

    const matches = await bcrypt.compare(submittedCode, otp.codeHash);
    if (!matches) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attemptCount: { increment: 1 } },
      });
      throw new BadRequestException("Incorrect code");
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });
  }

  private generateCode(): string {
    const max = 10 ** OTP_LENGTH;
    return randomInt(0, max).toString().padStart(OTP_LENGTH, "0");
  }
}
