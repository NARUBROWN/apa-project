import { Injectable, Logger } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { OpenaiService } from '../../ai/openai/openai.service.js';
import { isString } from '../../utils/type-guards.js';
import { PullRequestEventPayload } from './webhook.github.type.js';


@Injectable()
export class WebhookService {
    private readonly logger = new Logger(WebhookService.name);
    private readonly octokit: Octokit;

    constructor(
        private readonly openAiService: OpenaiService
    ) {
        this.octokit = new Octokit({
            auth: process.env.GITHUB_ACCESS_TOKEN
        });
    }

    async handlePullRequestEvent(payload: PullRequestEventPayload) {
        const { number } = payload.pull_request;
        const { owner, name } = payload.repository;

        try {
            const response = await this.octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
                owner: owner.login,
                repo: name,
                pull_number: number,
                headers: {
                    accept: 'application/vnd.github.v3.diff',
                },
                mediaType: {
                    format: 'diff'
                }
            });

            const pr = payload.pull_request;
            const language = pr.base.repo.language ?? 'Unknown Language';
            
            if (!isString(response.data)) {
                this.logger.error(`PR #${number}의 diff를 가져오는데 실패했습니다. 알 수 없는 데이터 타입입니다.`);
                return;
            }

            const diffText: string = response.data;

            this.logger.log(`PR #${number}의 diff 내용을 가져왔습니다. AI 분석을 시작합니다.`);
            
            const reviewComment = await this.openAiService.generateCodeReview(diffText, language);

            this.logger.log(`AI 생성한 리뷰 코멘트: \n${reviewComment}`)

            // AI 리뷰 코멘트를 PR에 게시하는 로직
            await this.octokit.rest.pulls.createReview({
                owner: owner.login,
                repo: name,
                pull_number: number,
                body: reviewComment,
                event: 'COMMENT'
            }); 

            this.logger.log(`PR #${number}에 AI 리뷰 코멘트가 성공적으로 게시되었습니다.`);
            
        } catch(e) {
            this.logger.error(`PR #${number}의 diff를 가져오는 중 오류 발생: ${e.message}`);
        }
    }
}
