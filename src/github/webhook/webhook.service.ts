import { Injectable, Logger } from '@nestjs/common';
import { PullRequestEventPayload } from './webhook.github.type';
import { GithubApiService } from '../github-api/github-api.service';
import path from 'path';
import { CodeReviewAgentService } from '../../ai/code-review-agent/code-review-agent.service';
import { PromptService } from '../../ai/prompt/prompt.service';
import { IssueCommentCreatedEvent } from '@octokit/webhooks-types';

const IGNORED_FILE_EXTENSIONS = [
  '.svg', '.png', '.jpeg', '.jpg', '.gif', '.bmp', '.ico',
  '.mp4', '.mov', '.avi', '.webm',
  '.lock',
];


@Injectable()
export class WebhookService {
    
    private readonly logger = new Logger(WebhookService.name);

    constructor(
        private readonly codeReviewAgentService: CodeReviewAgentService,
        private readonly githubApiService: GithubApiService,
        private readonly promptService: PromptService
    ) {}

    async handleCommentEvent(payload: IssueCommentCreatedEvent) {
        const { number, title, body } = payload.issue;
        const { owner, name } = payload.repository;
        const commentBody = payload.comment.body;

        try {
            const existingReviewComments = await this.githubApiService.getPullRequestReviewComments(owner.login, name, number);
            const allDiffs = await this.githubApiService.getPullRequestDiff(owner.login, name, number);

            const conversationalResponse = await this.codeReviewAgentService.respondToComment(
                owner.login,
                name,
                number,
                title,
                body,
                commentBody,
                allDiffs,
                existingReviewComments
            );

            await this.githubApiService.createPullRequestReviewComment(owner.login, name, number, conversationalResponse);
            this.logger.log(`PR #${number}에 대한 대화형 답변이 성공적으로 게시되었습니다.`);

        } catch(e) {
            this.logger.error(`PR #${number}의 댓글 처리 중 오류 발생: ${e.message}`);
        }
    }

    async handlePullRequestEvent(payload: PullRequestEventPayload) {
        const { number, title, body } = payload.pull_request;
        const { owner, name } = payload.repository;
        const headSha = payload.pull_request.head.sha;

        try {
            const commits = await this.githubApiService.getPullRequestCommits(owner.login, name, number);
            this.logger.log(`PR #${number}에서 총 ${commits.length}개의 커밋을 발견했습니다.`);

            let filteredAllDiffs = '';
            for (const commitSha of commits) {
                const diff = await this.githubApiService.getCommitDiff(owner.login, name, commitSha);
                const filteredDiffText = this.filterDiff(diff, IGNORED_FILE_EXTENSIONS);
                filteredAllDiffs += filteredDiffText;
            }

            const allChangedFiles = await this.githubApiService.getPullRequestFiles(owner.login, name, number);
            
            const filteredAllChangedFiles = allChangedFiles.filter(file => {
                const extension = path.extname(file).toLocaleLowerCase();
                return !IGNORED_FILE_EXTENSIONS.includes(extension);
            });

            const pr = payload.pull_request;
            const language = pr.base.repo.language ?? 'Unknown Language';

            const reviewComment = await this.codeReviewAgentService.performCodeReview(
                owner.login,
                name,
                number,
                title,
                body,
                language,
                filteredAllDiffs,
                filteredAllChangedFiles,
                headSha
            );

            this.logger.log(`AI가 생성한 리뷰 코멘트: \n${reviewComment}`);

            await this.githubApiService.createPullRequestReview(owner.login, name, number, reviewComment);
        } catch(e) {
            this.logger.error(`PR #${number} 처리 중 오류 발생: ${e.message}`);
        }
    }

    private filterDiff(diff: string, ignoredExtensions: string[]): string {
        if (!diff) {
            return '';
        }

        const diffs = diff.split(/(?=diff --git)/g).filter(s => s.trim().length > 0);
    
        const filteredDiffs = diffs.filter(d => {
            const firstLine = d.split('\n')[0];
        
            const match = firstLine.match(/ b\/(.+)$/);
            if (match && match[1]) {
                const fileName = match[1].trim().split(' ')[0];
                const extension = path.extname(fileName).toLocaleLowerCase();
                return !ignoredExtensions.includes(extension);
            }
            return false; 
        });
    
        return filteredDiffs.join('');
    }
}