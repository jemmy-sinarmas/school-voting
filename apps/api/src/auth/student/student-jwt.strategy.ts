import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AppConfigService } from "../../config/app-config.service";

export interface StudentJwtPayload {
  sub: string;
  email: string;
  scope: "student";
}

@Injectable()
export class StudentJwtStrategy extends PassportStrategy(Strategy, "student-jwt") {
  constructor(config: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtStudentSecret,
    });
  }

  validate(payload: StudentJwtPayload): StudentJwtPayload {
    if (payload.scope !== "student") {
      throw new UnauthorizedException();
    }
    return payload;
  }
}
