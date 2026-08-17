import { IsISO8601 } from "class-validator";

export class ActivateListDto {
  @IsISO8601()
  votingStartAt!: string;

  @IsISO8601()
  votingEndAt!: string;
}
