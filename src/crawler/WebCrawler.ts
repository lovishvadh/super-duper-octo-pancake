import { chromium, Browser, Page } from 'playwright';
import { CrawlConfig, CrawlResult, CrawlSession } from '../types';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs-extra';
import { join, dirname } from 'path';
import { Buffer } from 'buffer';

export class WebCrawler {
  private browser: Browser | null = null;
  private config: CrawlConfig;
  private session: CrawlSession;

  constructor(config: CrawlConfig) {
    this.config = config;
    this.session = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      config,
      results: [],
      status: 'pending',
    };
  }

  async initialize(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      });
      this.session.status = 'running';
    } catch (error) {
      this.session.status = 'failed';
      this.session.errors = [
        `Failed to initialize browser: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ];
      throw error;
    }
  }

  async crawl(): Promise<CrawlSession> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const context = await this.browser.newContext({
      viewport: this.config.viewport || { width: 1920, height: 1080 },
      userAgent: this.config.userAgent,
    });

    // Set headers if provided
    if (this.config.headers) {
      await context.setExtraHTTPHeaders(this.config.headers);
    }

    // Handle authentication if provided
    if (this.config.authentication) {
      await context.setHTTPCredentials(this.config.authentication);
    }

    try {
      for (const pagePath of this.config.pages) {
        const url = this.buildUrl(pagePath);
        
        if (this.shouldExcludeUrl(url)) {
          continue;
        }

        const result = await this.crawlPage(context, url);
        this.session.results.push(result);
      }

      this.session.status = 'completed';
    } catch (error) {
      this.session.status = 'failed';
      this.session.errors = [
        `Crawling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ];
    } finally {
      await context.close();
    }

    return this.session;
  }

  private async crawlPage(context: any, url: string): Promise<CrawlResult> {
    const page = await context.newPage();
    const startTime = Date.now();
    
    try {
      // Navigate to the page
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout || 30000,
      });

      // Wait for specific selector if provided
      if (this.config.waitForSelector) {
        await page.waitForSelector(this.config.waitForSelector, {
          timeout: this.config.timeout || 30000,
        });
      }

      // Additional wait if specified
      if (this.config.waitForTimeout) {
        await page.waitForTimeout(this.config.waitForTimeout);
      }

      // Capture screenshot
      const screenshotBuffer = await page.screenshot({
        fullPage: true,
        type: 'png',
      });

      // Get page content
      const content = await page.content();

      // Extract metadata
      const title = await page.title();
      const description = await page
        .locator('meta[name="description"]')
        .getAttribute('content')
        .catch(() => null);

      const loadTime = Date.now() - startTime;

      return {
        url,
        screenshot: screenshotBuffer.toString('base64'),
        content,
        metadata: {
          title,
          description: description || undefined,
          timestamp: new Date().toISOString(),
          loadTime,
          statusCode: response?.status(),
          errors: [],
        },
      };
    } catch (error) {
      const loadTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        url,
        screenshot: '',
        content: '',
        metadata: {
          title: 'Error',
          timestamp: new Date().toISOString(),
          loadTime,
          errors: [errorMessage],
        },
      };
    } finally {
      await page.close();
    }
  }

  private buildUrl(pagePath: string): string {
    if (pagePath.startsWith('http')) {
      return pagePath;
    }
    
    const baseUrl = this.config.baseUrl.endsWith('/') 
      ? this.config.baseUrl.slice(0, -1) 
      : this.config.baseUrl;
    
    const path = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
    
    return `${baseUrl}${path}`;
  }

  private shouldExcludeUrl(url: string): boolean {
    if (this.config.excludePatterns) {
      for (const pattern of this.config.excludePatterns) {
        if (new RegExp(pattern).test(url)) {
          return true;
        }
      }
    }

    if (this.config.includePatterns) {
      for (const pattern of this.config.includePatterns) {
        if (new RegExp(pattern).test(url)) {
          return false;
        }
      }
      return true; // If include patterns are specified, exclude by default
    }

    return false;
  }

  async saveSession(outputPath: string): Promise<void> {
    const sessionPath = join(outputPath, `session-${this.session.id}.json`);
    await fs.ensureDir(dirname(sessionPath));
    await fs.writeJson(sessionPath, this.session, { spaces: 2 });

    // Save screenshots separately
    const screenshotsDir = join(outputPath, 'screenshots', this.session.id);
    await fs.ensureDir(screenshotsDir);

    for (const result of this.session.results) {
      if (result.screenshot) {
        const screenshotPath = join(
          screenshotsDir,
          `${this.sanitizeFilename(result.url)}.png`
        );
        const buffer = Buffer.from(result.screenshot, 'base64');
        await fs.writeFile(screenshotPath, buffer);
      }
    }
  }

  private sanitizeFilename(url: string): string {
    return url
      .replace(/https?:\/\//, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  getSession(): CrawlSession {
    return this.session;
  }
} 