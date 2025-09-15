import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../interfaces/ai-service.interface.js';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OpenaiService implements AiService {

    private readonly logger = new Logger(OpenaiService.name);
    private readonly openai: OpenAI;

    constructor(
        private readonly configService: ConfigService
    ) {
        this.openai = new OpenAI({ apiKey: this.configService.get<string>('OPENAI_API_KEY') });
    }

    async identifyRelevantFiles(prompt: string): Promise<string[]> {

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-5-nano',
                messages: [{ role: 'system', content: prompt }]
            });

            const rawResponse = response.choices[0].message.content;

            if (response.usage) {
                this.logger.log(`[FileIdentification] Prompt Tokens: ${response.usage.prompt_tokens}`);
            }

            if (rawResponse) {
                return JSON.parse(rawResponse) as string[];
            }

            
            return [];
        } catch(e) {
            this.logger.error(`AI 파일 식별 요청 충 오류 발생: ${e.message}`);
            return [];
        }
    }

    async generateCodeReview(prompt: string): Promise<string> {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-5-nano',
                messages: [{ role: 'developer', content: prompt}]
            });

            if (response.usage) {
                this.logger.log(`[CodeReview] Prompt Tokens: ${response.usage.prompt_tokens}`);
            }

            return response.choices[0].message.content ? response.choices[0].message.content : '결과 없음';
        } catch(e) {
            this.logger.error(`OpenAI API 호출 중 오류 발생: ${e.message}`);
            throw e;
        }
    }
    
}
