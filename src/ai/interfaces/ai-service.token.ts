import { AIService } from "./ai-service.interface.js";

export const AI_SERVICE = Symbol('AI_SERVICE');

export interface AIServiceProvider {
    provide: typeof AI_SERVICE;
    useClass: new (...args: any[]) => AIService;
}