import { IsInt, IsString, Min, MinLength } from "class-validator";

export class CreateListDto {
  @IsInt()
  @Min(2000)
  electionYear!: number;

  @IsString()
  @MinLength(1)
  name!: string;
}
