import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ThrottlerModule } from "@nestjs/throttler";
import { AppConfigModule } from "../../config/app-config.module";
import { AppConfigService } from "../../config/app-config.service";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAuthService } from "./admin-auth.service";
import { AdminJwtStrategy } from "./admin-jwt.strategy";

@Module({
  imports: [
    AppConfigModule,
    PassportModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
    JwtModule.registerAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtAdminSecret,
        signOptions: { expiresIn: config.jwtAccessTokenTtl },
      }),
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminJwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AdminAuthModule {}
