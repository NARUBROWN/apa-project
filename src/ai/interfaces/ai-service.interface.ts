export interface AIService {
    generateCodeReview(prompt: string): Promise<string>;
    extractKeywords(prompt: string): Promise<string[]>;
    generateAnalysis(prompt: string): Promise<string>;
    generateConversationalResponse(prompt: string): Promise<string>;
}