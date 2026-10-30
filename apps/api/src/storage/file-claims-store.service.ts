import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { z } from 'zod';
import { AssessmentStatus } from '../claims/assessment.types';

export interface StoredAssessment {
  id: string;
  claimId: string;
  evidence: string;
  status: AssessmentStatus;
  confidence: number;
  reasoning: string;
  model: string;
  createdAt: string;
}

export interface StoredClaim {
  id: string;
  text: string;
  productName: string | null;
  createdAt: string;
  updatedAt: string;
  assessments: StoredAssessment[];
}

const assessmentSchema = z.object({
  id: z.string().uuid(),
  claimId: z.string().uuid(),
  evidence: z.string(),
  status: z.enum(['JUSTIFIED', 'NOT_JUSTIFIED', 'INSUFFICIENT_EVIDENCE']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  model: z.string(),
  createdAt: z.string().datetime(),
});

const claimSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  productName: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  assessments: z.array(assessmentSchema),
});

const claimsSchema = z.array(claimSchema);

@Injectable()
export class FileClaimsStoreService {
  private readonly filePath: string;
  private queue: Promise<void> = Promise.resolve();

  constructor(config: ConfigService) {
    const configuredPath = config.get<string>('CLAIMS_DATA_FILE');
    this.filePath = configuredPath
      ? isAbsolute(configuredPath)
        ? configuredPath
        : resolve(process.cwd(), configuredPath)
      : resolve(__dirname, '../../data/claims.json');
  }

  async createClaimWithAssessment(input: {
    text: string;
    evidence: string;
    status: AssessmentStatus;
    confidence: number;
    reasoning: string;
    model: string;
  }): Promise<StoredClaim> {
    return this.withExclusiveAccess(async () => {
      const claims = await this.readClaims();
      const now = new Date().toISOString();
      const claimId = randomUUID();
      const claim: StoredClaim = {
        id: claimId,
        text: input.text,
        productName: null,
        createdAt: now,
        updatedAt: now,
        assessments: [{
          id: randomUUID(),
          claimId,
          evidence: input.evidence,
          status: input.status,
          confidence: input.confidence,
          reasoning: input.reasoning,
          model: input.model,
          createdAt: now,
        }],
      };

      claims.push(claim);
      await this.writeClaims(claims);
      return claim;
    });
  }

  async findClaimById(id: string): Promise<StoredClaim | null> {
    await this.queue;
    const claims = await this.readClaims();
    return claims.find((claim) => claim.id === id) ?? null;
  }

  private async readClaims(): Promise<StoredClaim[]> {
    let contents: string;
    try {
      contents = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(contents);
    } catch {
      throw new Error('Claims data file contains invalid JSON.');
    }

    const result = claimsSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error('Claims data file does not match the expected format.');
    }
    return result.data;
  }

  private async writeClaims(claims: StoredClaim[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(claims, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    await rename(temporaryPath, this.filePath);
  }

  private async withExclusiveAccess<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolveQueue) => {
      release = resolveQueue;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }
}
