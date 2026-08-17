import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { OtpPurpose } from "@school-voting/shared";
import { EmailService } from "./email.service";
import { AppConfigService } from "../config/app-config.service";

const SUBJECTS: Record<OtpPurpose, string> = {
  [OtpPurpose.VERIFY_EMAIL]: "Verify your School Voting account",
  [OtpPurpose.PASSWORD_RESET]: "Reset your School Voting password",
};

@Injectable()
export class SmtpEmailService implements EmailService {
  private readonly transporter;
  private readonly from: string;

  constructor(config: AppConfigService) {
    const smtp = config.smtp;
    this.from = smtp.from;
    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
    });
  }

  async sendOtpEmail(to: string, purpose: OtpPurpose, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: SUBJECTS[purpose],
      text: `Your verification code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    });
  }
}
