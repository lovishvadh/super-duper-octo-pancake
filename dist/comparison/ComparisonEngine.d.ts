import { CrawlResult, ComparisonResult } from '../types';
export interface SectionComparisonResult {
    sectionId: string;
    sectionType: string;
    selector: string;
    hasChanges: boolean;
    contentChanges: {
        added: string[];
        removed: string[];
        modified: string[];
    };
    visualChanges: {
        pixelDifference: number;
        percentageChange: number;
        diffScreenshot?: string;
    };
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export declare class ComparisonEngine {
    private threshold;
    private ignoreAntialiasing;
    private ignoreColors;
    private sectionSelectors;
    constructor(options?: {
        threshold?: number;
        ignoreAntialiasing?: boolean;
        ignoreColors?: boolean;
        sectionSelectors?: string[];
    });
    compareResults(beforeResults: CrawlResult[], afterResults: CrawlResult[]): Promise<ComparisonResult[]>;
    private comparePage;
    private compareSections;
    private compareSectionScreenshots;
    private analyzeVisualChanges;
    private compareScreenshots;
    private normalizeImageDimensions;
    private compareContent;
    private extractContentElements;
    private createUniqueSelector;
    private describeTextChange;
    private generateContentSummary;
    private extractTextContent;
    private isSimilar;
    private levenshteinDistance;
    private extractPath;
}
//# sourceMappingURL=ComparisonEngine.d.ts.map