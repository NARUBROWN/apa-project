export interface AiService {
    generateCodeReview(prompt: string): Promise<string>;
    extractKeywords(prompt: string): Promise<string[]>;
}