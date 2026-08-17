import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ThrottlerModule } from "@nestjs/throttler";
import { OtpModule } from "../../otp/otp.module";
import { EmailModule } from "../../email/email.module";
import { AppConfigModule } from "../../config/app-config.module";
import { AppConfigService } from "../../config/app-config.service";
import { StudentAuthController } from "./student-auth.controller";
import { StudentAuthService } from "./student-auth.service";
import { StudentJwtStrategy } from "./student-jwt.strategy";

@Module({
  imports: [
    OtpModule,
    EmailModule,
    AppConfigModule,
    PassportModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
    JwtModule.registerAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtStudentSecret,
        signOptions: { expiresIn: config.jwtAccessTokenTtl },
      }),
    }),
  ],
  controllers: [StudentAuthController],
  providers: [StudentAuthService, StudentJwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class StudentAuthModule {}
