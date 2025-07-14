"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebCrawler = void 0;
const playwright_1 = require("playwright");
const uuid_1 = require("uuid");
const fs = __importStar(require("fs-extra"));
const path_1 = require("path");
const buffer_1 = require("buffer");
class WebCrawler {
    constructor(config) {
        this.browser = null;
        this.config = config;
        this.session = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date().toISOString(),
            config,
            results: [],
            status: 'pending',
        };
    }
    async initialize() {
        try {
            this.browser = await playwright_1.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-dev-shm-usage'],
            });
            this.session.status = 'running';
        }
        catch (error) {
            this.session.status = 'failed';
            this.session.errors = [
                `Failed to initialize browser: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ];
            throw error;
        }
    }
    async crawl() {
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
        }
        catch (error) {
            this.session.status = 'failed';
            this.session.errors = [
                `Crawling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ];
        }
        finally {
            await context.close();
        }
        return this.session;
    }
    async crawlPage(context, url) {
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
        }
        catch (error) {
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
        }
        finally {
            await page.close();
        }
    }
    buildUrl(pagePath) {
        if (pagePath.startsWith('http')) {
            return pagePath;
        }
        const baseUrl = this.config.baseUrl.endsWith('/')
            ? this.config.baseUrl.slice(0, -1)
            : this.config.baseUrl;
        const path = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
        return `${baseUrl}${path}`;
    }
    shouldExcludeUrl(url) {
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
    async saveSession(outputPath) {
        const sessionPath = (0, path_1.join)(outputPath, `session-${this.session.id}.json`);
        await fs.ensureDir((0, path_1.dirname)(sessionPath));
        await fs.writeJson(sessionPath, this.session, { spaces: 2 });
        // Save screenshots separately
        const screenshotsDir = (0, path_1.join)(outputPath, 'screenshots', this.session.id);
        await fs.ensureDir(screenshotsDir);
        for (const result of this.session.results) {
            if (result.screenshot) {
                const screenshotPath = (0, path_1.join)(screenshotsDir, `${this.sanitizeFilename(result.url)}.png`);
                const buffer = buffer_1.Buffer.from(result.screenshot, 'base64');
                await fs.writeFile(screenshotPath, buffer);
            }
        }
    }
    sanitizeFilename(url) {
        return url
            .replace(/https?:\/\//, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
    getSession() {
        return this.session;
    }
}
exports.WebCrawler = WebCrawler;
//# sourceMappingURL=WebCrawler.js.map