export interface CrawlConfig {
    baseUrl: string;
    pages: string[];
    viewport?: {
        width: number;
        height: number;
    };
    timeout?: number;
    waitForSelector?: string;
    waitForTimeout?: number;
    userAgent?: string;
    headers?: Record<string, string>;
    authentication?: {
        username: string;
        password: string;
    };
    excludePatterns?: string[];
    includePatterns?: string[];
}
export interface CrawlResult {
    url: string;
    screenshot: string;
    content: string;
    metadata: {
        title: string;
        description?: string;
        timestamp: string;
        loadTime: number;
        statusCode?: number;
        errors?: string[];
    };
}
export interface ComparisonResult {
    url: string;
    beforeScreenshot: string;
    afterScreenshot: string;
    diffScreenshot?: string;
    pixelDifference: number;
    percentageChange: number;
    contentChanges: {
        added: string[];
        removed: string[];
        modified: string[];
    };
    metadata: {
        timestamp: string;
        beforeTimestamp: string;
        afterTimestamp: string;
    };
}
export interface ReportConfig {
    title: string;
    outputPath: string;
    template?: string;
    includeScreenshots: boolean;
    includeContentDiff: boolean;
    threshold?: number;
}
export interface ReportData {
    summary: {
        totalPages: number;
        changedPages: number;
        unchangedPages: number;
        failedPages: number;
        timestamp: string;
        beforeDeployment: string;
        afterDeployment: string;
    };
    results: ComparisonResult[];
    config: ReportConfig;
}
export interface DeploymentWaitConfig {
    strategy: 'delay' | 'healthcheck' | 'content' | 'command';
    maxWaitTime: number;
    interval: number;
    delay?: number;
    healthcheckUrl?: string;
    expectedStatus?: number;
    contentUrl?: string;
    expectedContent?: string;
    contentSelector?: string;
    command?: string;
    expectedExitCode?: number;
}
export interface QAConfig {
    crawl: CrawlConfig;
    comparison: {
        threshold: number;
        ignoreAntialiasing: boolean;
        ignoreColors: boolean;
    };
    report: ReportConfig;
    deploymentWait?: DeploymentWaitConfig;
}
export interface CrawlSession {
    id: string;
    timestamp: string;
    config: CrawlConfig;
    results: CrawlResult[];
    status: 'pending' | 'running' | 'completed' | 'failed';
    errors?: string[];
}
//# sourceMappingURL=index.d.ts.map