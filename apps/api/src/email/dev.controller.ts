import { Controller, Get, NotFoundException, Query } from "@nestjs/common";
import { OtpPurpose } from "@school-voting/shared";
import { MockEmailService } from "./mock-email.service";
import { AppConfigService } from "../config/app-config.service";

/**
 * Dev-only convenience for offline/demo QA: hands back the last OTP sent to
 * an address without needing real SMTP. Disabled outside development and
 * whenever EMAIL_MODE isn't "mock" so it can never leak in a real deployment.
 */
@Controller("dev")
export class DevController {
  constructor(
    private readonly mockEmail: MockEmailService,
    private readonly config: AppConfigService,
  ) {}

  @Get("last-otp")
  getLastOtp(@Query("email") email: string, @Query("purpose") purpose: OtpPurpose) {
    const isDevEnabled = this.config.nodeEnv !== "production" && this.config.emailMode === "mock";

    if (!isDevEnabled) {
      throw new NotFoundException();
    }

    const code = this.mockEmail.getLastCode(email, purpose);
    if (!code) {
      throw new NotFoundException("No OTP found for this email/purpose");
    }
    return { email, purpose, code };
  }
}
