import { ArrayMinSize, IsArray, IsString } from "class-validator";

export class PromoteWinnersDto {
  @IsString()
  candidateListId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  candidateIds!: string[];
}
