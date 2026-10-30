import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class AssessClaimDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(10, 500)
  claim!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(20, 20000)
  evidence!: string;
}
