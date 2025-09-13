import { Controller, Post, Headers, Body, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { WebhookService } from './webhook.service.js';
import { PullRequestOpenedEvent, PullRequestReopenedEvent, PullRequestSynchronizeEvent } from '@octokit/webhooks-types';
import { PullRequestEventPayload } from './webhook.github.type';



@Controller('github/webhook')
export class WebhookController {
    
    constructor(
        private readonly webhookService: WebhookService
    ) {}

    private readonly webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

    @Post()
    handleWebhook(
        @Headers('x-hub-signature-256') signature: string,
        @Headers('x-github-event') event: string,
        @Body() payload: PullRequestEventPayload
    ) {
        if (!this.verifySignature(signature, payload)) {
            throw new UnauthorizedException('유효하지 않은 시그니처');
        }

        if (event == 'pull_request') {
            const { action } = payload;

            if (action === 'opened' || action === 'reopened' || action === 'synchronize') {
                this.webhookService.handlePullRequestEvent(payload);
            }
        }

        return { success: true };
    }

    private verifySignature(signature: string, payload: any): boolean {
        if (!signature || !this.webhookSecret) {
            return false;
        }

        const hmac = createHmac('sha256', this.webhookSecret);
        const digest = `sha256=${hmac.update(JSON.stringify(payload)).digest('hex')}`;

        return digest === signature;
    }
}
