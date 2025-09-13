import { Module } from '@nestjs/common';
import { WebhookController } from './github/webhook/webhook.controller.js';
import { WebhookService } from './github/webhook/webhook.service.js';
import { OpenaiService } from './ai/openai/openai.service.js';
import { ConfigModule } from '@nestjs/config';
import { WebhookModule } from './github/webhook/webhook.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    WebhookModule
  ],
  controllers: [WebhookController],
  providers: [WebhookService, OpenaiService],
})
export class AppModule {}
