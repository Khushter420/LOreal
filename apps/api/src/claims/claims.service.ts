import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { FileClaimsStoreService } from '../storage/file-claims-store.service';
// PostgreSQL persistence retained for later:
// import { AssessmentStatus as PrismaAssessmentStatus } from '@prisma/client';
// import { PrismaService } from '../prisma/prisma.service';
import { AssessmentAiService } from './assessment-ai.service';
import { AssessmentResponse } from './assessment.types';
import { AssessClaimDto } from './dto/assess-claim.dto';

/*
Previous Prisma enum mapping:
const domainStatus = {
  JUSTIFIED: PrismaAssessmentStatus.JUSTIFIED,
  NOT_JUSTIFIED: PrismaAssessmentStatus.NOT_JUSTIFIED,
  INSUFFICIENT_EVIDENCE: PrismaAssessmentStatus.INSUFFICIENT_EVIDENCE,
};
*/

function contradiction(claim: string, evidence: string): string | undefined {
  const target = claim.match(/(\d+(?:\.\d+)?)\s*%/);
  const claimDuration = duration(claim);
  if (!target || !claimDuration) return;

  const stopWords = new Set([
    'a', 'an', 'and', 'at', 'by', 'claim', 'decrease', 'decreases', 'decreased',
    'day', 'days', 'for', 'from', 'in', 'increase', 'increases', 'increased',
    'improve', 'improves', 'improved', 'month', 'months', 'of', 'on', 'reduce',
    'reduces', 'reduced', 'reduction', 'the', 'to', 'week', 'weeks', 'within',
  ]);
  const endpointWords = (text: string) =>
    new Set(
      (text.match(/[a-z]+/gi) ?? [])
        .map((word) => word.toLowerCase().replace(/s$/, ''))
        .filter((word) => word.length > 2 && !stopWords.has(word)),
    );
  const claimEndpoint = endpointWords(claim.slice(0, target.index));
  const targetValue = Number(target[1]);
  if (claimEndpoint.size === 0) return;

  for (const sentence of evidence.split(/[.!?;\n]+/)) {
    const evidenceDuration = duration(sentence);
    if (
      !evidenceDuration ||
      evidenceDuration.value !== claimDuration.value ||
      evidenceDuration.unit !== claimDuration.unit
    ) {
      continue;
    }

    const evidenceEndpoint = endpointWords(sentence);
    const overlappingWords = [...claimEndpoint].filter((word) => evidenceEndpoint.has(word));
    if (overlappingWords.length / claimEndpoint.size < 0.5) continue;

    for (const observed of sentence.matchAll(/(\d+(?:\.\d+)?)\s*%/g)) {
      if (Number(observed[1]) < targetValue) {
        return `The measured ${observed[1]}% is below the claimed ${target[1]}% at the same stated duration.`;
      }
    }
  }
}

function duration(text: string): { value: string; unit: string } | undefined {
  const forward = text.match(/\b(\d+)[\s-]*(day|week|month)s?\b/i);
  if (forward) {
    return { value: forward[1], unit: forward[2].toLowerCase() };
  }
  const reverse = text.match(/\b(day|week|month)s?\s+(\d+)\b/i);
  if (reverse) {
    return { value: reverse[2], unit: reverse[1].toLowerCase() };
  }
}

@Injectable()
export class ClaimsService {
  constructor(
    private readonly ai: AssessmentAiService,
    private readonly store: FileClaimsStoreService,
  ) {}

  async assess(dto: AssessClaimDto): Promise<AssessmentResponse> {
    const evaluation = await this.ai.evaluate(dto.claim, dto.evidence);
    if (
      !Number.isFinite(evaluation.confidence) ||
      evaluation.confidence < 0 ||
      evaluation.confidence > 1 ||
      !evaluation.reasoning.trim() ||
      evaluation.reasoning.length > 2000
    ) {
      throw new InternalServerErrorException('Assessment provider returned an invalid result.');
    }

    const mismatch = contradiction(dto.claim, dto.evidence);
    const status = mismatch ? 'NOT_JUSTIFIED' : evaluation.status;
    const reasoning = mismatch
      ? `${mismatch} ${evaluation.reasoning}`.slice(0, 2000)
      : evaluation.reasoning;

    try {
      const claim = await this.store.createClaimWithAssessment({
        text: dto.claim,
        evidence: dto.evidence,
        status,
        confidence: evaluation.confidence,
        reasoning,
        model: this.ai.getModel(),
      });
      const assessment = claim.assessments[0];
      return {
        claimId: claim.id,
        assessmentId: assessment.id,
        justified: assessment.status === 'JUSTIFIED',
        status: assessment.status,
        confidence: assessment.confidence,
        reasoning: assessment.reasoning,
      };
    } catch {
      throw new InternalServerErrorException('Unable to save the assessment.');
    }
  }

  findById(id: string) {
    return this.store.findClaimById(id);
  }

  /*
   * Previous Prisma nested-create persistence (kept for when PostgreSQL is
   * re-enabled):
   *
   * const claim = await this.prisma.claim.create({
   *   data: {
   *     text: dto.claim,
   *     assessments: {
   *       create: {
   *         evidence: dto.evidence,
   *         status: domainStatus[status],
   *         confidence: evaluation.confidence,
   *         reasoning,
   *         model: this.ai.getModel(),
   *       },
   *     },
   *   },
   *   include: { assessments: { orderBy: { createdAt: 'desc' }, take: 1 } },
   * });
   *
   * Previous Prisma history lookup:
   * return this.prisma.claim.findUnique({
   *   where: { id },
   *   include: { assessments: { orderBy: { createdAt: 'desc' } } },
   * });
   */
}
