import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { CodeReviewAgentService } from '../../ai/code-review-agent/code-review-agent.service';
import { GithubApiService } from '../github-api/github-api.service';
import { PromptService } from '../../ai/prompt/prompt.service';

describe('WebhookService', () => {
  let service: WebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: CodeReviewAgentService, useValue: {} },
        { provide: GithubApiService, useValue: {} },
        { provide: PromptService, useValue: {} },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
