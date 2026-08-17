import { Injectable, Logger } from "@nestjs/common";
import { OtpPurpose } from "@school-voting/shared";
import { EmailService } from "./email.service";

/**
 * Offline/demo stand-in for real email delivery: logs the OTP instead of
 * sending it, and keeps the most recent code per (email, purpose) in memory
 * so a dev-only endpoint (see DevController) can hand it back during manual
 * QA without any SMTP configuration.
 */
@Injectable()
export class MockEmailService implements EmailService {
  private readonly logger = new Logger(MockEmailService.name);
  private readonly lastCodes = new Map<string, string>();

  async sendOtpEmail(to: string, purpose: OtpPurpose, code: string): Promise<void> {
    const key = this.key(to, purpose);
    this.lastCodes.set(key, code);
    this.logger.log(`[MOCK EMAIL] OTP for ${to} (${purpose}): ${code}`);
  }

  getLastCode(to: string, purpose: OtpPurpose): string | undefined {
    return this.lastCodes.get(this.key(to, purpose));
  }

  private key(to: string, purpose: OtpPurpose): string {
    return `${purpose}:${to.trim().toLowerCase()}`;
  }
}
