import { IsEmail, IsOptional, IsString, IsUrl, MinLength } from "class-validator";

export class CreateCandidateDto {
  @IsString()
  candidateListId!: string;

  @IsString()
  roleId!: string;

  @IsString()
  @MinLength(1)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional() @IsString() programme?: string;
  @IsOptional() @IsString() semester?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() phoneNumber?: string;
  @IsOptional() @IsUrl() videoUrl?: string;
  @IsOptional() @IsString() executiveSummary?: string;
  @IsOptional() @IsString() whyVoteForMe?: string;
  @IsOptional() @IsString() vision?: string;
  @IsOptional() @IsString() mission?: string;
  @IsOptional() @IsString() description?: string;
}
