import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller.js';
import { WebhookService } from './webhook.service.js';
import { OpenAIService } from '../../ai/openai/openai.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GithubApiService } from '../github-api/github-api.service.js';
import { PromptService } from '../../ai/prompt/prompt.service.js';
import { CodeReviewAgentService } from '../../ai/code-review-agent/code-review-agent.service.js';
import { AI_SERVICE } from '../../ai/interfaces/ai-service.token.js';
@Module({
  imports: [ConfigModule], 
  controllers: [WebhookController],
  providers: [
    WebhookService, 
    GithubApiService, 
    PromptService,
    CodeReviewAgentService,
    {
      provide: AI_SERVICE,
      useFactory: async (configService: ConfigService) => {
        const provider = configService.get<string>('AI_PROVIDER');

        switch (provider) {
          case 'openai':
            return new OpenAIService(configService);
        }
      },
      inject: [ConfigService]
    }],
})
export class WebhookModule {}