import { Test, TestingModule } from '@nestjs/testing';
import { CodeReviewAgentService } from './code-review-agent.service';

describe('CodeReviewAgentService', () => {
  let service: CodeReviewAgentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CodeReviewAgentService],
    }).compile();

    service = module.get<CodeReviewAgentService>(CodeReviewAgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
