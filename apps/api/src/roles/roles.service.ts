import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ListStatus } from "@school-voting/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  listForList(candidateListId: string) {
    return this.prisma.role.findMany({
      where: { candidateListId },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
  }

  async create(candidateListId: string, dto: CreateRoleDto) {
    await this.assertDraftList(candidateListId);
    try {
      return await this.prisma.role.create({
        data: {
          candidateListId,
          name: dto.name.trim(),
          displayOrder: dto.displayOrder ?? 0,
        },
      });
    } catch (error) {
      throw this.rethrowDuplicate(error);
    }
  }

  async update(roleId: string, dto: UpdateRoleDto) {
    const role = await this.getOrThrow(roleId);
    await this.assertDraftList(role.candidateListId);
    try {
      return await this.prisma.role.update({
        where: { id: roleId },
        data: {
          name: dto.name?.trim(),
          displayOrder: dto.displayOrder,
        },
      });
    } catch (error) {
      throw this.rethrowDuplicate(error);
    }
  }

  async remove(roleId: string): Promise<void> {
    const role = await this.getOrThrow(roleId);
    await this.assertDraftList(role.candidateListId);
    const candidateCount = await this.prisma.candidate.count({ where: { roleId } });
    if (candidateCount > 0) {
      throw new ConflictException("Remove all candidates from this role before deleting it");
    }
    await this.prisma.role.delete({ where: { id: roleId } });
  }

  private async getOrThrow(roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException("Role not found");
    }
    return role;
  }

  private async assertDraftList(candidateListId: string): Promise<void> {
    const list = await this.prisma.candidateList.findUnique({ where: { id: candidateListId } });
    if (!list) {
      throw new NotFoundException("Candidate list not found");
    }
    if (list.status !== ListStatus.DRAFT) {
      throw new ConflictException("Roles can only be changed while the list is in draft");
    }
  }

  private rethrowDuplicate(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return new ConflictException("A role with this name already exists in this list");
    }
    return error;
  }
}
