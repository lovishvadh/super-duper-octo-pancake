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
  cookieModalHandling?: {
    enabled?: boolean;
    customSelectors?: string[];
    waitAfterClick?: number;
  };
}

export interface CrawlResult {
  url: string;
  screenshot: string; // Base64 encoded screenshot
  content: string; // HTML content
  sections: PageSectionInfo[]; // Page sections with bounding boxes
  metadata: {
    title: string;
    description?: string;
    timestamp: string;
    loadTime: number;
    statusCode?: number;
    errors?: string[];
  };
}

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
  sectionComparisons: SectionComparison[];
  metadata: {
    timestamp: string;
    beforeTimestamp: string;
    afterTimestamp: string;
  };
}

export interface SectionComparison {
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
    hasSignificantChanges: boolean;
    changeType: 'none' | 'content' | 'layout' | 'both';
  };
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ReportConfig {
  title: string;
  outputPath: string;
  template?: string;
  includeScreenshots: boolean;
  includeContentDiff: boolean;
  threshold?: number; // Percentage threshold for flagging differences
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
  maxWaitTime: number; // Maximum wait time in milliseconds
  interval: number; // Polling interval in milliseconds
  
  // For delay strategy
  delay?: number; // Delay in milliseconds
  
  // For healthcheck strategy
  healthcheckUrl?: string;
  expectedStatus?: number;
  
  // For content strategy
  contentUrl?: string;
  expectedContent?: string;
  contentSelector?: string; // CSS selector to check for content
  
  // For command strategy
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