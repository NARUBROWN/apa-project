import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from './webhook.controller';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './webhook.service';

describe('WebhookController', () => {
  let controller: WebhookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        { provide: ConfigService, useValue: {} },
        { provide: WebhookService, useValue: {} },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
