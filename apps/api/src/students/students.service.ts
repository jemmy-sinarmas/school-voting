import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { StudentStatus } from "@school-voting/shared";
import { PrismaService } from "../prisma/prisma.service";

const STUDENT_SUMMARY_SELECT = {
  id: true,
  email: true,
  fullName: true,
  studentNumber: true,
  status: true,
  createdAt: true,
} satisfies Prisma.StudentSelect;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { status?: StudentStatus; search?: string }) {
    const where: Prisma.StudentWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.search && params.search.trim().length > 0) {
      const q = params.search.trim();
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q } }, // citext: already case-insensitive
        { studentNumber: { contains: q, mode: "insensitive" } },
      ];
    }
    return this.prisma.student.findMany({
      where,
      select: STUDENT_SUMMARY_SELECT,
      orderBy: { createdAt: "asc" },
    });
  }

  async setStatus(id: string, status: StudentStatus.ACTIVE | StudentStatus.DISABLED) {
    await this.findOrThrow(id);
    return this.prisma.student.update({
      where: { id },
      data: { status },
      select: STUDENT_SUMMARY_SELECT,
    });
  }

  private async findOrThrow(id: string) {
    const student = await this.prisma.student.findUnique({ where: { id }, select: { id: true } });
    if (!student) {
      throw new NotFoundException("Student not found");
    }
    return student;
  }
}
