import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller.js';
import { WebhookService } from './webhook.service.js';
import { OpenaiService } from '../../ai/openai/openai.service.js';
import { ConfigModule } from '@nestjs/config';
import { GithubApiService } from '../github-api/github-api.service.js';
import { PromptService } from '../../ai/prompt/prompt.service.js';

@Module({
  imports: [ConfigModule], 
  controllers: [WebhookController],
  providers: [WebhookService, OpenaiService, GithubApiService, PromptService],
})
export class WebhookModule {}