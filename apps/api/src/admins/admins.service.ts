import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AdminRole, AdminStatus } from "@school-voting/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { UpdateAdminDto } from "./dto/update-admin.dto";

@Injectable()
export class AdminsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.admin.findMany({
      select: { id: true, email: true, fullName: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(dto: CreateAdminDto) {
    const existing = await this.prisma.admin.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("An admin with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.temporaryPassword, 12);
    const admin = await this.prisma.admin.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        passwordHash,
        role: AdminRole.ADMIN,
        status: AdminStatus.ACTIVE,
      },
    });
    return { id: admin.id, email: admin.email, fullName: admin.fullName, role: admin.role, status: admin.status };
  }

  async update(id: string, dto: UpdateAdminDto) {
    await this.findOrThrow(id);
    const admin = await this.prisma.admin.update({
      where: { id },
      data: { email: dto.email, fullName: dto.fullName, status: dto.status },
    });
    return { id: admin.id, email: admin.email, fullName: admin.fullName, role: admin.role, status: admin.status };
  }

  async remove(id: string): Promise<void> {
    const target = await this.findOrThrow(id);
    // The real security boundary: independent of any UI, the super admin
    // can never be deleted through this API, closing off the "accidentally
    // (or maliciously) delete every admin" failure mode.
    if (target.role === AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException("The super admin account cannot be deleted");
    }
    await this.prisma.admin.delete({ where: { id } });
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    await this.findOrThrow(id);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.admin.update({ where: { id }, data: { passwordHash } });
  }

  private async findOrThrow(id: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id } });
    if (!admin) {
      throw new NotFoundException("Admin not found");
    }
    return admin;
  }
}
