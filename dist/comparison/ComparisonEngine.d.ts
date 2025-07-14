import { CrawlResult, ComparisonResult } from '../types';
export declare class ComparisonEngine {
    private threshold;
    private ignoreAntialiasing;
    private ignoreColors;
    constructor(options?: {
        threshold?: number;
        ignoreAntialiasing?: boolean;
        ignoreColors?: boolean;
    });
    compareResults(beforeResults: CrawlResult[], afterResults: CrawlResult[]): Promise<ComparisonResult[]>;
    private comparePage;
    private compareScreenshots;
    private normalizeImageDimensions;
    private compareContent;
    private extractTextContent;
    private isSimilar;
    private levenshteinDistance;
}
//# sourceMappingURL=ComparisonEngine.d.ts.map