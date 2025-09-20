import { Injectable, Logger } from '@nestjs/common';
import { PullRequestEventPayload } from './webhook.github.type.js';
import { GithubApiService } from '../github-api/github-api.service.js';
import path from 'path';
import parseDiff from 'parse-diff';
import { CodeReviewAgentService } from '../../ai/code-review-agent/code-review-agent.service.js';
import { PromptService } from '../../ai/prompt/prompt.service.js';
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
                filteredAllDiffs += filteredDiffText + '\n';
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
        const files = parseDiff(diff);
        const filteredDiffs: string[] = [];

        for (const file of files) {
            if (typeof file.to !== 'string') {
                continue;
            }

            const extension = path.extname(file.to).toLocaleLowerCase();

            if (!ignoredExtensions.includes(extension)) {
                const header = `diff --git a/${file.from} b/${file.to}\n`;
                const chunks = file.chunks.map(chunk => {
                    const chunkHeader = `@@ -${chunk.oldStart},${chunk.oldLines} +${chunk.newStart},${chunk.newLines} @@\n`;
                    const changes = chunk.changes.map(change => `${change.content}`).join('\n');
                    return chunkHeader + changes;
                }).join('\n');
                filteredDiffs.push(header + chunks);
            }
        }
        return filteredDiffs.join('\n');
    }
}
