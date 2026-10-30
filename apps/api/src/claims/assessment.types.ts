export type AssessmentStatus =
  | 'JUSTIFIED'
  | 'NOT_JUSTIFIED'
  | 'INSUFFICIENT_EVIDENCE';

export interface AssessmentEvaluation {
  status: AssessmentStatus;
  confidence: number;
  reasoning: string;
}

export interface AssessmentResponse extends AssessmentEvaluation {
  claimId: string;
  assessmentId: string;
  justified: boolean;
}
