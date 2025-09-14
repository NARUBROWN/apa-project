import { Test, TestingModule } from '@nestjs/testing';
import { PromptService } from './prompt.service.js';

describe('PromptService', () => {
  let service: PromptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptService],
    }).compile();

    service = module.get<PromptService>(PromptService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
