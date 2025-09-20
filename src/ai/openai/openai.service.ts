import { Injectable, Logger } from '@nestjs/common';
import { AIService } from '../interfaces/ai-service.interface.js';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OpenAIService implements AIService {

    private readonly logger = new Logger(OpenAIService.name);
    private readonly openai: OpenAI;

    constructor(
        private readonly configService: ConfigService
    ) {
        this.openai = new OpenAI({ apiKey: this.configService.get<string>('OPENAI_API_KEY') });
    }
    async generateConversationalResponse(prompt: string): Promise<string> {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini', 
                messages: [{ role: 'developer', content: prompt }]
            });

            if (response.usage) {
                this.logger.log(`[ConversationalResponse] Prompt Tokens: ${response.usage.prompt_tokens}`);
            }

            return response.choices[0].message.content || '답변을 생성할 수 없습니다.';
        } catch(e) {
            this.logger.error(`OpenAI API 호출 중 오류 발생: ${e.message}`);
            throw e;
        }
    }

    async extractKeywords(prompt: string): Promise<string[]> {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-5-nano',
                messages: [{ role: 'system', content: prompt }]
            });

            const rawResponse = response.choices[0].message.content;

            if (response.usage) {
                this.logger.log(`[KeywordExtraction] Prompt Tokens: ${response.usage.prompt_tokens}`);
            }

            if (rawResponse) {
                return JSON.parse(rawResponse) as string[];
            }
            return [];

        } catch(e) {
            this.logger.error(`AI 키워드 추출 요청 중 오류 발생: ${e.message}`);
            return [];
        }
    }

    async generateCodeReview(prompt: string): Promise<string> {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
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

    async generateAnalysis(prompt: string): Promise<string> {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'developer', content: prompt}]
            });

            if (response.usage) {
                this.logger.log(`[Analysis] Prompt Tokens: ${response.usage.prompt_tokens}`);
            }

            return response.choices[0].message.content ? response.choices[0].message.content : '결과 없음';
        } catch(e) {
            this.logger.error(`OpenAI API 호출 중 오류 발생: ${e.message}`);
            throw e;
        }
    }


    
}
