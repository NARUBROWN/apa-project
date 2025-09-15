import { Injectable, Logger } from '@nestjs/common';
import { OpenaiService } from '../../ai/openai/openai.service.js';
import { PullRequestEventPayload } from './webhook.github.type.js';
import { GithubApiService } from '../github-api/github-api.service.js';
import { PromptService } from '../../ai/prompt/prompt.service.js';
import path from 'path';

const IGNORED_FILE_EXTENSIONS = [
  '.svg', '.png', '.jpeg', '.jpg', '.gif', '.bmp', '.ico',
  '.mp4', '.mov', '.avi', '.webm',
  '.lock',
];


@Injectable()
export class WebhookService {
    private readonly logger = new Logger(WebhookService.name);

    constructor(
        private readonly openAiService: OpenaiService,
        private readonly githubApiService: GithubApiService,
        private readonly promptService: PromptService
    ) {}

    async handlePullRequestEvent(payload: PullRequestEventPayload) {
        const { number, title, body } = payload.pull_request;
        const { owner, name } = payload.repository;
        const headSha = payload.pull_request.head.sha;

        try {
            const allChangedFiles = await this.githubApiService.getPullRequestFiles(owner.login, name, number);
            const repositoryTree = await this.githubApiService.getRepositoryTree(owner.login, name, headSha);
            const diffText = await this.githubApiService.getPullRequestDiff(owner.login, name, number);

            const changedCodeFiles = allChangedFiles.filter(file => {
                const extension = path.extname(file).toLocaleLowerCase();
                return !IGNORED_FILE_EXTENSIONS.includes(extension);
            });

            this.logger.log(`PR #${number}의 키워드 추출을 AI에게 요청합니다.`);
            const keywordExtractionPrompt = this.promptService.createKeywordExtractionPrompt(
                title,
                body,
                changedCodeFiles,
                diffText
            );
            const keywords = await this.openAiService.extractKeywords(keywordExtractionPrompt);
            this.logger.log(`AI가 추출한 키워드: ${keywords.join(', ')}`);

            const codeFilesFromRepository = repositoryTree.filter(file => {
                const extension = path.extname(file).toLocaleLowerCase();
                return !IGNORED_FILE_EXTENSIONS.includes(extension);
            });

            const relevantFiles = this.githubApiService.fuzzySearchFiles(codeFilesFromRepository, keywords);

            const filesToFetch = relevantFiles.slice(0, 5);
            
            const relatedFilesWithContent = (await Promise.all(
                filesToFetch.map(async filePath => {
                    const content = await this.githubApiService.getFileContent(owner.login, name, filePath, headSha);
                    if (content !== null) {
                        return { filePath, content };
                    }
                    return null;
                })
            )).filter(file => file !== null);

            const pr = payload.pull_request;
            const language = pr.base.repo.language ?? 'Unknown Language';

            this.logger.log(`PR #${number}의 diff 내용을 가져왔습니다. AI 분석을 시작합니다.`);

            const codeReviewPrompt = this.promptService.createReviewPrompt(
                diffText,
                language,
                relatedFilesWithContent,
                title,
                body
            );
            
            const reviewComment = await this.openAiService.generateCodeReview(codeReviewPrompt);

            this.logger.log(`AI가 생성한 리뷰 코멘트: \n${reviewComment}`);

            await this.githubApiService.createPullRequestReview(owner.login, name, number, reviewComment);
        } catch(e) {
            this.logger.error(`PR #${number} 처리 중 오류 발생: ${e.message}`);
        }
    }
}
