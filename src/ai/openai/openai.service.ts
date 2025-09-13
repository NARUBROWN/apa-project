import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../interfaces/ai-service.interface';
import OpenAI from 'openai';

@Injectable()
export class OpenaiService implements AiService {
    private readonly logger = new Logger(OpenaiService.name);
    private readonly openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    async generateCodeReview(diff: string, language: string): Promise<string> {
        try {
            const prompt = this.createReviewPrompt(diff, language);

            const response = await this.openai.chat.completions.create({
                model: 'gpt-5-nano',
                messages: [{ role: 'developer', content: prompt}]
            });

            return response.choices[0].message.content ? response.choices[0].message.content : '결과 없음';
        } catch(e) {
            this.logger.error(`OpenAI API 호출 중 오류 발생: ${e.message}`);
            throw e;
        }
    }

    private createReviewPrompt(diff: string, language: string): string {
        return `
            당신은 전문적인 코드 리뷰어입니다.
            제공된 코드 변경사항(diff)을 분석하고, 다음 사항들을 중점적으로 검토하여 마크다운 형식으로 간결하게 요약해 주세요.
            1. 주요 변경 사항 요약: 이 PR의 핵심적인 변경사항이 무엇인지 설명합니다.
            2. 개선 제안: 코드 품질, 성능, 가독성 측면에서 더 나은 방법이 있다면 제안합니다.
            3. 잠재적 문제점: 버그, 보안 취약점(예: SQL Injection, XSS), 또는 예외 처리 누락 등 잠재적 위험 요소를 지적합니다.
            코드 언어: ${language}

            코드 변경 사항 (diff): ${diff}
        `
    }
    
}
