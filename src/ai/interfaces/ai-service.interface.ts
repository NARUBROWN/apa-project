export interface AiService {
    identifyRelevantFiles(prompt: string): Promise<string[]>;
    generateCodeReview(prompt: string): Promise<string>;
}