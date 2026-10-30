import { ConfigService } from '@nestjs/config';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileClaimsStoreService } from '../src/storage/file-claims-store.service';

describe('FileClaimsStoreService', () => {
  let directory: string;
  let filePath: string;
  let store: FileClaimsStoreService;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'claims-store-test-'));
    filePath = join(directory, 'claims.json');
    const config = {
      get: (key: string) => key === 'CLAIMS_DATA_FILE' ? filePath : undefined,
    } as ConfigService;
    store = new FileClaimsStoreService(config);
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('creates a JSON file and reads the claim back with its assessment', async () => {
    const created = await store.createClaimWithAssessment({
      text: 'Reduces wrinkles by 20% in 4 weeks',
      evidence: 'A synthetic clinical evidence summary with enough detail.',
      status: 'NOT_JUSTIFIED',
      confidence: 0.91,
      reasoning: 'The measured result is below the claim.',
      model: 'test-model',
    });

    const reloadedStore = new FileClaimsStoreService({
      get: (key: string) => key === 'CLAIMS_DATA_FILE' ? filePath : undefined,
    } as ConfigService);
    await expect(reloadedStore.findClaimById(created.id)).resolves.toEqual(created);
    await expect(readFile(filePath, 'utf8')).resolves.toContain('"NOT_JUSTIFIED"');
  });

  it('preserves all records when concurrent writes occur', async () => {
    const created = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        store.createClaimWithAssessment({
          text: `Synthetic cosmetic claim number ${index}`,
          evidence: 'Synthetic evidence summary for a deterministic store test.',
          status: 'INSUFFICIENT_EVIDENCE',
          confidence: 0.5,
          reasoning: 'More study information is required.',
          model: 'test-model',
        }),
      ),
    );

    const contents = JSON.parse(await readFile(filePath, 'utf8')) as unknown[];
    expect(contents).toHaveLength(10);
    for (const claim of created) {
      await expect(store.findClaimById(claim.id)).resolves.toMatchObject({ id: claim.id });
    }
  });
});
