export type AssessmentStatus =
  | 'JUSTIFIED'
  | 'NOT_JUSTIFIED'
  | 'INSUFFICIENT_EVIDENCE';

export interface AssessmentResult {
  claimId: string;
  assessmentId: string;
  justified: boolean;
  status: AssessmentStatus;
  confidence: number;
  reasoning: string;
}

export interface AssessClaimRequest {
  claim: string;
  evidence: string;
}
