import { OtpPurpose } from "@school-voting/shared";

export abstract class EmailService {
  abstract sendOtpEmail(to: string, purpose: OtpPurpose, code: string): Promise<void>;
}
