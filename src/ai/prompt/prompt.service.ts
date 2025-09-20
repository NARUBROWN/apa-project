import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import handlebars from 'handlebars';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { PullRequestReviewComment } from '@octokit/webhooks-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@Injectable()
export class PromptService {
    
    private readonly logger = new Logger(PromptService.name);

    private readonly MAX_DIFF_LENGTH = 50000;
    private readonly MAX_FILE_CONTENT_LENGTH = 10000;

    private readonly compiledTemplates = new Map<string, handlebars.TemplateDelegate>();

    constructor() {
        this.loadTemplates();
    }

    createFinalReviewPrompt(prTitle: string, prBody: string | null, analysisResult: string, language: string, allDiffs: string, relatedFilesWithContent: { filePath: string; content: string; }[]): string {
       const truncatedDiff = allDiffs.length > this.MAX_DIFF_LENGTH
                                    ? allDiffs.substring(0, this.MAX_DIFF_LENGTH) + '\n... [Diff content truncated]' :
                                    allDiffs;

        const truncatedRelatedFiles = relatedFilesWithContent.map(file => ({
            ...file,
            content: file.content.length > this.MAX_FILE_CONTENT_LENGTH
                    ? file.content.substring(0, this.MAX_FILE_CONTENT_LENGTH) + '\n... [File content truncated]'
                    : file.content
        }));

        const relatedFilesContent = truncatedRelatedFiles
        .map(file => {
            return `--- 파일: ${file.filePath} ---
            ${file.content}
            `;
        })
        .join('\n');


        const template = this.compiledTemplates.get('final-review-prompt');
        if (!template) throw new InternalServerErrorException('final-review-prompt 템플릿을 불러오는데 실패했습니다.');

        const data = {
            prTitle,
            prBody: prBody || '',
            analysisResult,
            language,
            truncatedDiff,
            relatedFilesContent
        };

        const result = template(data);
        this.logger.log(`[createFinalReviewPrompt] 프롬프트 생성 완료`);
        return result;
    }
    
    createAnalysisPrompt(prTitle: string, prBody: string | null, allChangedFiles: string[], allDiffs: string): string {
        const changedFilesList = allChangedFiles.map(file => ` - ${file}`).join('\n');
        const truncatedDiff = allDiffs.length > this.MAX_DIFF_LENGTH
                                    ? allDiffs.substring(0, this.MAX_DIFF_LENGTH) + '\n... [Diff content truncated]' :
                                    allDiffs;

        const template = this.compiledTemplates.get('analysis-prompt');
        if (!template) throw new InternalServerErrorException('analysis-prompt 템플릿을 불러오는데 실패했습니다.');

        const data = {
            prTitle,
            prBody: prBody || '',
            changedFilesList,
            truncatedDiff
        };

        const result = template(data);
        this.logger.log(`[createAnalysisPrompt] 프롬프트 생성 완료`);
        return result;
    }

    createKeywordExtractionPrompt(prTitle: string, prBody: string | null, changedFiles: string[], diff: string): string {
        const changedFilesList = changedFiles.map(file => ` - ${file}`).join('\n');
        const truncatedDiff = diff.length > this.MAX_DIFF_LENGTH
                                    ? diff.substring(0, this.MAX_DIFF_LENGTH) + '\n... [Diff content truncated]' :
                                    diff;

        const template = this.compiledTemplates.get('keyword-extraction-prompt');
        if (!template) throw new InternalServerErrorException('템플릿을 불러오는데 실패했습니다.');

        const data = {
            prTitle,
            prBody: prBody || '',
            changedFilesList,
            truncatedDiff
        }

        const result = template(data);
        this.logger.log(`[createKeywordExtractionPrompt] ${result}`);
        return result;
    }

    createConversationalPrompt(prTitle: string, prBody: string | null, userComment: string, allDiffs: string, existingReviewComment: PullRequestReviewComment[]) {
        const template = this.compiledTemplates.get('conversational-prompt');
        if (!template) throw new InternalServerErrorException('conversational-prompt 템플릿을 불러오는데 실패했습니다.');
        
        const truncatedDiff = allDiffs.length > this.MAX_DIFF_LENGTH
                                    ? allDiffs.substring(0, this.MAX_DIFF_LENGTH) + '\n... [Diff content truncated]' :
                                    allDiffs;
        
        const existingComments = existingReviewComment.map(c => `AI Reviewer: ${c.body}`).join('\n\n');

        const data = {
            prTitle,
            prBody: prBody || '',
            userComment,
            truncatedDiff,
            existingComments,
        };

        const result = template(data);
        this.logger.log(`[createConversationalPrompt] 프롬프트 생성 완료`);
        return result;
    }

    private loadTemplates() {
        try {
            const templatesPath = path.join(__dirname, 'templates');
            const file = fs.readdirSync(templatesPath);

            file.forEach(file => {
                if (file.endsWith('hbs')) {
                    const filePath = path.join(templatesPath, file);
                    const templatesName = path.parse(file).name;
                    const source = fs.readFileSync(filePath, 'utf-8');
                    this.compiledTemplates.set(templatesName, handlebars.compile(source));
                }
            });
        } catch (e) {
            this.logger.error('템플릿을 불러오는데 실패했습니다. ', e.message);
            throw e;
        }
    }
}
