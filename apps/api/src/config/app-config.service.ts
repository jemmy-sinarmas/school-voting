import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppConfig } from "./configuration";

/** Thin typed wrapper around ConfigService so call sites don't repeat `{ infer: true }` everywhere. */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  get nodeEnv() {
    return this.config.get("nodeEnv", { infer: true });
  }
  get port() {
    return this.config.get("port", { infer: true });
  }
  get jwtStudentSecret() {
    return this.config.get("jwtStudentSecret", { infer: true });
  }
  get jwtAdminSecret() {
    return this.config.get("jwtAdminSecret", { infer: true });
  }
  get jwtAccessTokenTtl() {
    return this.config.get("jwtAccessTokenTtl", { infer: true });
  }
  get jwtResetTokenTtl() {
    return this.config.get("jwtResetTokenTtl", { infer: true });
  }
  get allowedEmailDomains() {
    return this.config.get("allowedEmailDomains", { infer: true });
  }
  get corsOrigins() {
    return this.config.get("corsOrigins", { infer: true });
  }
  get emailMode() {
    return this.config.get("emailMode", { infer: true });
  }
  get smtp() {
    return this.config.get("smtp", { infer: true });
  }
  get media() {
    return this.config.get("media", { infer: true });
  }
  get seed() {
    return this.config.get("seed", { infer: true });
  }
}
