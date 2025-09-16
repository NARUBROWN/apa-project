import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import handlebars from 'handlebars';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@Injectable()
export class PromptService {
    
    private readonly logger = new Logger(PromptService.name);

    private readonly MAX_DIFF_LENGTH = 10000;
    private readonly MAX_FILE_CONTENT_LENGTH = 5000;

    private readonly compiledTemplates = new Map<string, handlebars.TemplateDelegate>();

    constructor() {
        this.loadTemplates();
    }
    
    createReviewPrompt(
        diff: string,
        language: string,
        relatedFilesWithContent: Array<{ filePath: string; content: string }>,
        prTitle: string,
        prBody: string | null
    ): string {

        const truncatedDiff = diff.length > this.MAX_DIFF_LENGTH
                                    ? diff.substring(0, this.MAX_DIFF_LENGTH) + '\n... [Diff content truncated]' :
                                    diff;

        const truncatedRelatedFiles = relatedFilesWithContent.map(file => ({
            ...file,
            content: file.content.length > this.MAX_FILE_CONTENT_LENGTH
                    ? file.content.substring(0, this.MAX_FILE_CONTENT_LENGTH) + '\n... [File content truncated]'
                    : file.content
        }));

        const relatedFilesContent = truncatedRelatedFiles
        .map(file => {
            return `--- File: ${file.filePath} ---
            ${file.content}
            `;
        })
        .join('\n');


        const templates = this.compiledTemplates.get('review-prompt');
        if (!templates) throw new InternalServerErrorException('템플릿을 불러오는데 실패했습니다.');

        const data = {
            prTitle,
            prBody: prBody || '',
            relatedFilesContent,
            language,
            truncatedDiff
        };

        const result = templates(data);
        this.logger.log(`[createReviewPrompt] ${result}`);
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
