import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { CodeReviewAgentService } from '../../ai/code-review-agent/code-review-agent.service';
import { GithubApiService } from '../github-api/github-api.service';
import { PromptService } from '../../ai/prompt/prompt.service';
import { PullRequestEventPayload } from './webhook.github.type';

describe('WebhookService', () => {
  let service: WebhookService;
  let githubApiService: GithubApiService;
  let codeReviewAgentService: CodeReviewAgentService;

  const mockCodeReviewAgentService = {
    performCodeReview: jest.fn(),
  };
  const mockGithubApiService = {
    getPullRequestCommits: jest.fn(),
    getCommitDiff: jest.fn(),
    getPullRequestFiles: jest.fn(),
    createPullRequestReview: jest.fn(),
    getPullRequestReviewComments: jest.fn(),
    createPullRequestReviewComment: jest.fn(),
    getPullRequestDiff: jest.fn(),
  };
  const mockPromptService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: CodeReviewAgentService, useValue: mockCodeReviewAgentService },
        { provide: GithubApiService, useValue: mockGithubApiService },
        { provide: PromptService, useValue: mockPromptService },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    githubApiService = module.get<GithubApiService>(GithubApiService);
    codeReviewAgentService = module.get<CodeReviewAgentService>(CodeReviewAgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handlePullRequestEvent', () => {
    let payload: Partial<PullRequestEventPayload>;

    beforeEach(() => {
      jest.resetAllMocks(); // Reset mocks before each test

      payload = {
        pull_request: {
          number: 133,
          title: 'Test PR',
          body: 'Test PR body',
          head: { sha: 'test-sha' },
          base: { repo: { language: 'TypeScript' } },
        },
        repository: { owner: { login: 'test-owner' }, name: 'test-repo' },
      } as Partial<PullRequestEventPayload>;

      // Default mocks for a happy path
      (githubApiService.getPullRequestCommits as jest.Mock).mockResolvedValue(['sha1']);
      (githubApiService.getCommitDiff as jest.Mock).mockResolvedValue('diff --git a/src/main.ts b/src/main.ts');
      (githubApiService.createPullRequestReview as jest.Mock).mockResolvedValue({});
      (codeReviewAgentService.performCodeReview as jest.Mock).mockResolvedValue('LGTM!');
    });

    it('should not throw when getPullRequestFiles returns objects without filename', async () => {
      const files = [{ filename: 'good.ts' }, { status: 'deleted' }]; // An object without 'filename'
      (githubApiService.getPullRequestFiles as jest.Mock).mockResolvedValue(files);

      await expect(service.handlePullRequestEvent(payload as PullRequestEventPayload)).resolves.not.toThrow();
      
      expect(codeReviewAgentService.performCodeReview).toHaveBeenCalled();
      const passedFiles = (codeReviewAgentService.performCodeReview as jest.Mock).mock.calls[0][7];
      expect(passedFiles).toHaveLength(1);
      expect(passedFiles[0].filename).toBe('good.ts');
    });

    it('should not throw when getPullRequestFiles returns undefined or null in the list', async () => {
      const files = [{ filename: 'good.ts' }, undefined, null];
      (githubApiService.getPullRequestFiles as jest.Mock).mockResolvedValue(files);

      await expect(service.handlePullRequestEvent(payload as PullRequestEventPayload)).resolves.not.toThrow();
      
      expect(codeReviewAgentService.performCodeReview).toHaveBeenCalled();
      const passedFiles = (codeReviewAgentService.performCodeReview as jest.Mock).mock.calls[0][7];
      expect(passedFiles).toHaveLength(1);
      expect(passedFiles[0].filename).toBe('good.ts');
    });
  });

  describe('filterDiff', () => {
    const IGNORED_FILE_EXTENSIONS = ['.lock'];

    it('should filter out diffs for ignored file extensions', () => {
      const diff = `diff --git a/yarn.lock b/yarn.lock\n...`;
      const result = (service as any).filterDiff(diff, IGNORED_FILE_EXTENSIONS);
      expect(result).toBe('');
    });

    it('should handle malformed diff lines gracefully', () => {
      const malformedDiff = 'diff --git a/some/file.ts b/ \n--- a/some/file.ts\n+++ b/ \n';
      const result = (service as any).filterDiff(malformedDiff, IGNORED_FILE_EXTENSIONS);
      expect(result).toBe('');
    });

    it('should return an empty string for an empty diff', () => {
      const result = (service as any).filterDiff('', IGNORED_FILE_EXTENSIONS);
      expect(result).toBe('');
    });
  });
});
