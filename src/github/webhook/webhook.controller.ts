import { Controller, Post, Headers, Body, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { WebhookService } from './webhook.service.js';
import { PullRequestEventPayload, WebhookPayload } from './webhook.github.type';
import { ConfigService } from '@nestjs/config';
import { IssueCommentCreatedEvent } from '@octokit/webhooks-types';


@Controller('github/webhook')
export class WebhookController {
    private webhookSecret: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly webhookService: WebhookService
    ) {}

    onModuleInit() {
        const secret = this.configService.get<string>('GITHUB_WEBHOOK_SECRET');
        if (!secret) {
            throw new Error('GITHUB_WEBHOOK_SECRET 환경 변수가 설정되지 않았습니다.');
        }
        this.webhookSecret = secret;
    }
    
    @Post()
    handleWebhook(
        @Headers('x-hub-signature-256') signature: string,
        @Headers('x-github-event') event: string,
        @Body() payload: WebhookPayload
    ) {
        if (!this.verifySignature(signature, payload)) {
            throw new UnauthorizedException('유효하지 않은 시그니처');
        }

        if (event == 'pull_request') {
            const { action } = payload as PullRequestEventPayload;

            if (action === 'opened' || action === 'reopened' || action === 'synchronize') {
                this.webhookService.handlePullRequestEvent(payload as PullRequestEventPayload);
            }
        } else if (event === 'issue_comment') {
            const { action, issue, comment } = payload as IssueCommentCreatedEvent;
            
            if (action === 'created' && issue.pull_request && comment.body.includes('@APA-PR-Analyst')) {
                this.webhookService.handleCommentEvent(payload as IssueCommentCreatedEvent);
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
