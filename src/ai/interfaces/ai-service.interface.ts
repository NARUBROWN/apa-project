export interface AiService {
    identifyRelevantFiles(prTitle: string, prBody: string, changedFiles: string[], repositoryFilePaths: string[]): Promise<string[]>;
    generateCodeReview(
        diff: string, 
        language: string, 
        relatedFilesWithContent: Array<{ filePath: string; content: string }>,
        prTitle: string,
        prBody: string
    ): Promise<string>;
}