import { Module } from "@nestjs/common";
import { EmailService } from "./email.service";
import { SmtpEmailService } from "./smtp-email.service";
import { MockEmailService } from "./mock-email.service";
import { AppConfigService } from "../config/app-config.service";
import { DevController } from "./dev.controller";

@Module({
  controllers: [DevController],
  providers: [
    MockEmailService,
    SmtpEmailService,
    {
      provide: EmailService,
      useFactory: (config: AppConfigService, mock: MockEmailService, smtp: SmtpEmailService) =>
        config.emailMode === "smtp" ? smtp : mock,
      inject: [AppConfigService, MockEmailService, SmtpEmailService],
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
