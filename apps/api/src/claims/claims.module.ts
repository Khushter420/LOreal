import { Module } from '@nestjs/common';
import { FileClaimsStoreService } from '../storage/file-claims-store.service';
import { AssessmentAiService } from './assessment-ai.service';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';

@Module({
  controllers: [ClaimsController],
  providers: [ClaimsService, AssessmentAiService, FileClaimsStoreService],
})
export class ClaimsModule {}
