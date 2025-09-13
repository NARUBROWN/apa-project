export interface AiService {
    generateCodeReview(diff: string, language: string): Promise<string>;
}