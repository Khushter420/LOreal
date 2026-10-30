import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { AssessClaimDto } from './dto/assess-claim.dto';
import { ClaimsService } from './claims.service';

@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post('assess')
  assess(@Body() dto: AssessClaimDto) {
    return this.claimsService.assess(dto);
  }

  @Get(':id')
  async findById(@Param('id', new ParseUUIDPipe()) id: string) {
    const claim = await this.claimsService.findById(id);
    if (!claim) {
      throw new NotFoundException('Claim not found.');
    }
    return claim;
  }
}
