import { Test, TestingModule } from '@nestjs/testing';
import { CodeReviewAgentService } from './code-review-agent.service';
import { AI_SERVICE } from '../interfaces/ai-service.token';
import { PromptService } from '../prompt/prompt.service';
import { GithubApiService } from '../../github/github-api/github-api.service';

describe('CodeReviewAgentService', () => {
  let service: CodeReviewAgentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CodeReviewAgentService,
        { provide: AI_SERVICE, useValue: {} },
        { provide: PromptService, useValue: {} },
        { provide: GithubApiService, useValue: {} },
      ],
    }).compile();

    service = module.get<CodeReviewAgentService>(CodeReviewAgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
