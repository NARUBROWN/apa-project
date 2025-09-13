import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller.js';
import { WebhookService } from './webhook.service.js';
import { OpenaiService } from '../../ai/openai/openai.service.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule], 
  controllers: [WebhookController],
  providers: [WebhookService, OpenaiService],
})
export class WebhookModule {}