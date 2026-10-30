import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AssessmentAiService,
  parseAssessmentResponse,
} from '../src/claims/assessment-ai.service';

const mockGenerateContent = jest.fn();
let mockGoogleGenAIOptions: unknown;

jest.mock('@google/genai', () => ({
  ThinkingLevel: { MINIMAL: 'MINIMAL' },
  GoogleGenAI: jest.fn().mockImplementation((options) => {
    mockGoogleGenAIOptions = options;
    return {
      models: { generateContent: mockGenerateContent },
    };
  }),
}));

describe('AssessmentAiService', () => {
  it('accepts a complete structured assessment', () => {
    expect(parseAssessmentResponse(JSON.stringify({
      status: 'INSUFFICIENT_EVIDENCE',
      confidence: 0,
      reasoning: 'The study duration is missing.',
    }))).toEqual({
      status: 'INSUFFICIENT_EVIDENCE',
      confidence: 0,
      reasoning: 'The study duration is missing.',
    });
  });

  it.each([
    ['empty response', undefined, 'STOP'],
    ['incomplete response', '{"status":"JUSTIFIED"}', 'MAX_TOKENS'],
    ['malformed JSON', '{', 'STOP'],
    ['missing reasoning', '{"status":"JUSTIFIED","confidence":0.8}', 'STOP'],
    ['out-of-range confidence', '{"status":"JUSTIFIED","confidence":1.1,"reasoning":"Text."}', 'STOP'],
  ])('rejects %s', (_description, output, finishReason) => {
    expect(() => parseAssessmentResponse(output, finishReason)).toThrow();
  });

  it('fails with a controlled unavailable response when credentials are missing', async () => {
    const config = {
      get: jest.fn((key: string) => (key === 'GEMINI_API_KEY' ? undefined : 'gemini-3.5-flash-lite')),
    } as unknown as ConfigService;
    const service = new AssessmentAiService(config);
    await expect(service.evaluate('A cosmetic claim', 'Synthetic evidence text.'))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('uses the Gemini API with constrained JSON output and validates its response', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        status: 'INSUFFICIENT_EVIDENCE',
        confidence: 0.75,
        reasoning: 'The study population is not specified.',
      }),
      candidates: [{ finishReason: 'STOP' }],
    });
    const config = {
      get: jest.fn((key: string) => ({
        GEMINI_API_KEY: 'test-key-not-a-real-credential',
        GEMINI_MODEL: 'gemini-test-model',
        GEMINI_TIMEOUT_MS: '10000',
      })[key]),
    } as unknown as ConfigService;
    const service = new AssessmentAiService(config);

    await expect(service.evaluate('A cosmetic claim', 'Synthetic study evidence.')).resolves.toEqual({
      status: 'INSUFFICIENT_EVIDENCE',
      confidence: 0.75,
      reasoning: 'The study population is not specified.',
    });
    expect(service.getModel()).toBe('gemini-test-model');
    expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-test-model',
      contents: JSON.stringify({
        claim: 'A cosmetic claim',
        evidence: 'Synthetic study evidence.',
      }),
      config: expect.objectContaining({
        responseMimeType: 'application/json',
        responseSchema: expect.objectContaining({ type: 'OBJECT' }),
        maxOutputTokens: 256,
        thinkingConfig: { thinkingLevel: 'MINIMAL' },
      }),
    }));
    const requestConfig = mockGenerateContent.mock.calls.at(-1)?.[0].config;
    expect(requestConfig).not.toHaveProperty('temperature');
    expect(requestConfig).not.toHaveProperty('topP');
    expect(requestConfig).not.toHaveProperty('topK');
    expect(mockGoogleGenAIOptions).toEqual(expect.objectContaining({
      httpOptions: expect.objectContaining({
        timeout: 10000,
        retryOptions: expect.objectContaining({
          attempts: 1,
          httpStatusCodes: expect.arrayContaining([504]),
        }),
      }),
    }));
  });

  it('maps Gemini request failures to a generic unavailable error', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('private upstream details'));
    const config = {
      get: jest.fn((key: string) => key === 'GEMINI_API_KEY' ? 'test-key-not-a-real-credential' : undefined),
    } as unknown as ConfigService;
    const service = new AssessmentAiService(config);
    await expect(service.evaluate('A cosmetic claim', 'Synthetic evidence text.'))
      .rejects.toThrow('Assessment provider is temporarily unavailable.');
  });
});
