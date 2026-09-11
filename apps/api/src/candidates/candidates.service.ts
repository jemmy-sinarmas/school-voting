import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { promises as fs } from "fs";
import * as path from "path";
import sharp from "sharp";
import { ListStatus } from "@school-voting/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AppConfigService } from "../config/app-config.service";
import { CreateCandidateDto } from "./dto/create-candidate.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";

export type MediaField = "photo" | "poster";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Every stored image is re-encoded to WebP regardless of the uploaded
// format — this keeps candidate media small and consistently viewable, and
// caps how much disk/bandwidth a single admin upload can cost.
const IMAGE_WEBP_QUALITY = 80;
const IMAGE_MAX_DIMENSION = 1600;

@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
  ) {}

  listForList(candidateListId: string) {
    return this.prisma.candidate.findMany({
      where: { candidateListId, isDeleted: false },
      orderBy: { fullName: "asc" },
    });
  }

  async getOrThrow(id: string) {
    const candidate = await this.prisma.candidate.findUnique({ where: { id } });
    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }
    return candidate;
  }

  async create(dto: CreateCandidateDto) {
    const list = await this.prisma.candidateList.findUnique({ where: { id: dto.candidateListId } });
    if (!list) {
      throw new NotFoundException("Candidate list not found");
    }
    if (list.status !== ListStatus.DRAFT) {
      throw new ConflictException("Candidates can only be added while the list is in draft");
    }
    await this.assertRoleBelongsToList(dto.roleId, dto.candidateListId);

    return this.prisma.candidate.create({
      data: {
        candidateListId: dto.candidateListId,
        roleId: dto.roleId,
        fullName: dto.fullName,
        email: dto.email,
        programme: dto.programme,
        semester: dto.semester,
        instagram: dto.instagram,
        phoneNumber: dto.phoneNumber,
        videoUrl: dto.videoUrl,
        executiveSummary: dto.executiveSummary,
        whyVoteForMe: dto.whyVoteForMe,
        vision: dto.vision,
        mission: dto.mission,
        description: dto.description,
      },
    });
  }

  async update(id: string, dto: UpdateCandidateDto) {
    const candidate = await this.getOrThrow(id);
    // A candidate can only be moved to a role in its own list; never trust a
    // client-supplied roleId that points at a role from a different list.
    if (dto.roleId !== undefined) {
      await this.assertRoleBelongsToList(dto.roleId, candidate.candidateListId);
    }
    return this.prisma.candidate.update({ where: { id }, data: dto });
  }

  private async assertRoleBelongsToList(roleId: string, candidateListId: string): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role || role.candidateListId !== candidateListId) {
      throw new BadRequestException("Role does not belong to this candidate list");
    }
  }

  async remove(id: string): Promise<void> {
    await this.getOrThrow(id);
    const voteCount = await this.prisma.vote.count({ where: { candidateId: id } });
    if (voteCount > 0) {
      await this.prisma.candidate.update({ where: { id }, data: { isDeleted: true } });
      return;
    }
    await this.prisma.candidate.delete({ where: { id } });
  }

  async uploadMedia(id: string, field: MediaField, file: Express.Multer.File) {
    await this.getOrThrow(id);
    this.validateFile(field, file);

    const uploadRoot = this.appConfig.media.uploadRoot;
    const dir = path.join(uploadRoot, "candidates", id);
    await fs.mkdir(dir, { recursive: true });

    const filename = `${field}-${Date.now()}.webp`;
    const destPath = path.join(dir, filename);
    await this.compressImage(file.buffer, destPath);

    const relativePath = `/uploads/candidates/${id}/${filename}`;
    const columnByField = { photo: "photoPath", poster: "posterPath" } as const;
    return this.prisma.candidate.update({
      where: { id },
      data: { [columnByField[field]]: relativePath },
    });
  }

  private async compressImage(buffer: Buffer, destPath: string): Promise<void> {
    await sharp(buffer)
      .rotate() // apply EXIF orientation before stripping metadata
      .resize({ width: IMAGE_MAX_DIMENSION, height: IMAGE_MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: IMAGE_WEBP_QUALITY })
      .toFile(destPath);
  }

  private validateFile(field: MediaField, file: Express.Multer.File): void {
    if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type for ${field}: ${file.mimetype}`);
    }
    if (file.size > this.appConfig.media.maxImageBytes) {
      throw new BadRequestException(`File exceeds the maximum allowed size for ${field}`);
    }
  }
}
