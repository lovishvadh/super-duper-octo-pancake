import { CrawlConfig, CrawlSession } from '../types';
export interface PageSectionInfo {
    id: string;
    selector: string;
    type: string;
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    content: string;
    textContent: string;
}
export declare class WebCrawler {
    private browser;
    private config;
    private session;
    private sectionSelectors;
    constructor(config: CrawlConfig);
    initialize(): Promise<void>;
    crawl(): Promise<CrawlSession>;
    private crawlPage;
    private waitForPageLoad;
    private handleCookieModals;
    private extractPageSections;
    private determineSectionType;
    private isChildOfExistingSection;
    private buildUrl;
    private shouldExcludeUrl;
    saveSession(outputPath: string): Promise<void>;
    private sanitizeFilename;
    cleanup(): Promise<void>;
    getSession(): CrawlSession;
}
//# sourceMappingURL=WebCrawler.d.ts.map