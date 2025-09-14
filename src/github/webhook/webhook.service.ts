import { Body, Injectable, Logger } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { OpenaiService } from '../../ai/openai/openai.service.js';
import { isString } from '../../utils/type-guards.js';
import { PullRequestEventPayload } from './webhook.github.type.js';
import { GithubApiService } from '../github-api/github-api.service.js';
import { Content } from 'openai/resources/containers/files/content.js';


@Injectable()
export class WebhookService {
    private readonly logger = new Logger(WebhookService.name);
    private readonly octokit: Octokit;

    constructor(
        private readonly openAiService: OpenaiService,
        private readonly githubApiService: GithubApiService
    ) {
        this.octokit = new Octokit({
            auth: process.env.GITHUB_ACCESS_TOKEN
        });
    }

    async handlePullRequestEvent(payload: PullRequestEventPayload) {
        const { number, title, body } = payload.pull_request;
        const { owner, name } = payload.repository;
        const headSha = payload.pull_request.head.sha;

        try {
            const allChangedFiles = await this.githubApiService.getPullRequestFiles(owner.login, name, number);

            const repositoryTree = await this.githubApiService.getRepositoryTree(owner.login, name, headSha);

            const relevantFiles = await this.openAiService.identifyRelevantFiles(
                title,
                body,
                allChangedFiles,
                repositoryTree
            );

            const filesToFetch = relevantFiles.slice(0, 2);
            const relatedFilesWithContent = await Promise.all(
                filesToFetch.map(async filePath => ({
                    filePath,
                    content: await this.githubApiService.getFileContent(owner.login, name, filePath)
                }))
            );

            const diffText = await this.githubApiService.getPullRequestDiff(owner.login, name, number);

            const pr = payload.pull_request;
            const language = pr.base.repo.language ?? 'Unknown Language';

            this.logger.log(`PR #${number}의 diff 내용을 가져왔습니다. AI 분석을 시작합니다.`);
            
            const reviewComment = await this.openAiService.generateCodeReview(
                diffText, 
                language, 
                relatedFilesWithContent,
                title,
                body
            );

            this.logger.log(`AI가 생성한 리뷰 코멘트: \n${reviewComment}`);

            await this.githubApiService.createPullRequestReview(owner.login, name, number, reviewComment);
        } catch(e) {
            this.logger.error(`PR #${number}의 diff를 가져오는 중 오류 발생: ${e.message}`);
        }
    }
}
