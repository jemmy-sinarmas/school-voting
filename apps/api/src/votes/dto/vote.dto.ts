import { IsString, MinLength } from "class-validator";

export class VoteDto {
  @IsString()
  @MinLength(1)
  candidateId!: string;
}
