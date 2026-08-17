import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AdminStatus } from "@school-voting/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { AppConfigService } from "../../config/app-config.service";
import { AdminLoginDto } from "./dto/admin-login.dto";

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly appConfig: AppConfigService,
  ) {}

  async login(dto: AdminLoginDto): Promise<{ accessToken: string }> {
    const admin = await this.prisma.admin.findUnique({ where: { email: dto.email } });
    if (!admin || admin.status !== AdminStatus.ACTIVE) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const matches = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!matches) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const accessToken = this.jwt.sign(
      { sub: admin.id, email: admin.email, role: admin.role, scope: "admin" },
      { expiresIn: this.appConfig.jwtAccessTokenTtl },
    );
    return { accessToken };
  }
}
