import { CrawlConfig, CrawlSession } from '../types';
export declare class WebCrawler {
    private browser;
    private config;
    private session;
    constructor(config: CrawlConfig);
    initialize(): Promise<void>;
    crawl(): Promise<CrawlSession>;
    private crawlPage;
    private buildUrl;
    private shouldExcludeUrl;
    saveSession(outputPath: string): Promise<void>;
    private sanitizeFilename;
    cleanup(): Promise<void>;
    getSession(): CrawlSession;
}
//# sourceMappingURL=WebCrawler.d.ts.map