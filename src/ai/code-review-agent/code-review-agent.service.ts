import { Injectable, Logger, Inject } from '@nestjs/common';
import { PromptService } from '../prompt/prompt.service.js';
import { GithubApiService } from '../../github/github-api/github-api.service.js';
import { AIService } from '../interfaces/ai-service.interface.js';
import { AI_SERVICE } from '../interfaces/ai-service.token.js';

@Injectable()
export class CodeReviewAgentService {
    private readonly logger = new Logger(CodeReviewAgentService.name);

    constructor(
        @Inject(AI_SERVICE)
        private readonly aiService: AIService,
        private readonly promptService: PromptService,
        private readonly githubApiService: GithubApiService
    ) {}

    async performCodeReview(
        owner: string,
        repo: string,
        pull_number: number,
        prTitle: string,
        prBody: string | null,
        language: string,
        allDiffs: string,
        allChangedFiles: string[],
        headSha: string
    ): Promise<string> {
        this.logger.log(`PR #${pull_number}에 대한 사고 사슬 기반 리뷰를 시작합니다.`);

        // PR 의도 및 변경점 분석
        this.logger.log('PR의도 및 변경점 분석을 시작합니다.');
        const analysisPrompt = this.promptService.createAnalysisPrompt(prTitle, prBody, allChangedFiles, allDiffs);
        const analysisResult = await this.aiService.generateAnalysis(analysisPrompt);
        this.logger.log(`분석 결과:\n${analysisResult}`);

        // 관련 파일 내용 가져오기
        const extractKeywordsPrompt = this.promptService.createKeywordExtractionPrompt(
            prTitle,
            prBody,
            allChangedFiles,
            allDiffs
        );
        const extractKeywordsResult = await this.aiService.extractKeywords(extractKeywordsPrompt);
        const relevantFiles = this.githubApiService.fuzzySearchFiles(allChangedFiles, extractKeywordsResult);
        const relatedFilesWithContent = (await Promise.all(
            relevantFiles.map(async filePath => {
                const content = await this.githubApiService.getFileContent(owner, repo, filePath, headSha);
                if (content !== null) {
                    return { filePath, content }
                }
                return null;
            })
        )).filter(file => file !== null);

        this.logger.log(`검색된 관련 파일: ${relatedFilesWithContent.map(f => f.filePath).join(', ')}`);

        // 종합하여 최종 리뷰 코멘트 생성
        this.logger.log('종합 리뷰 코멘트를 생성합니다.');
        const finalReviewPrompt = this.promptService.createFinalReviewPrompt(
            prTitle,
            prBody,
            analysisResult,
            language,
            allDiffs,
            relatedFilesWithContent
        );
        const finalReviewComment = await this.aiService.generateCodeReview(finalReviewPrompt);
        this.logger.log(`최종 리뷰 코멘트:\n${finalReviewComment}`);

        return finalReviewComment;
    }
}
