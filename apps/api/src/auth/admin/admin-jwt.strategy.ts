import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AdminRole } from "@school-voting/shared";
import { AppConfigService } from "../../config/app-config.service";

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: AdminRole;
  scope: "admin";
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, "admin-jwt") {
  constructor(config: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtAdminSecret,
    });
  }

  validate(payload: AdminJwtPayload): AdminJwtPayload {
    if (payload.scope !== "admin") {
      throw new UnauthorizedException();
    }
    return payload;
  }
}
