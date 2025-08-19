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
        this.sectionSelectors = [
            'header', 'nav', 'main', 'aside', 'footer',
            '.header', '.navigation', '.main-content', '.sidebar', '.footer',
            '[role="banner"]', '[role="navigation"]', '[role="main"]', '[role="complementary"]', '[role="contentinfo"]',
            '.hero', '.banner', '.content', '.form', '.widget', '.section'
        ];
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
            // Navigate to the page with enhanced waiting
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
            // Wait for page to be fully loaded
            await this.waitForPageLoad(page);
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
            // Extract section information
            const sections = await this.extractPageSections(page);
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
                sections,
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
                sections: [],
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
    async waitForPageLoad(page) {
        try {
            // Wait for DOM to be ready
            await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
            // Handle cookie modals and popups first
            await this.handleCookieModals(page);
            // Wait for network to be idle (no requests for 500ms)
            await page.waitForLoadState('networkidle', { timeout: 15000 });
            // Handle any popups that might have appeared after network idle
            await this.handleCookieModals(page);
            // Simple wait for any remaining animations (simplified to avoid eval issues)
            try {
                await page.waitForTimeout(1000); // Wait for any animations to complete
            }
            catch (error) {
                // Ignore timeout errors
            }
        }
        catch (error) {
            // If any waiting fails, continue anyway - the page might be slow but functional
            console.warn(`Warning: Some page load waiting failed for ${page.url()}: ${error}`);
        }
    }
    async handleCookieModals(page) {
        try {
            // Check if cookie modal handling is disabled
            if (this.config.cookieModalHandling?.enabled === false) {
                return;
            }
            // Common cookie modal selectors
            let cookieSelectors = [
                // Accept buttons
                '[data-testid="accept-cookies"]',
                '[data-testid="accept-all-cookies"]',
                '[data-testid="cookie-accept"]',
                '[data-testid="cookie-accept-all"]',
                '[data-testid="gdpr-accept"]',
                '[data-testid="gdpr-accept-all"]',
                '[data-testid="consent-accept"]',
                '[data-testid="consent-accept-all"]',
                '[data-testid="cookie-banner-accept"]',
                '[data-testid="cookie-banner-accept-all"]',
                // Common class-based selectors
                '.cookie-accept',
                '.cookie-accept-all',
                '.gdpr-accept',
                '.gdpr-accept-all',
                '.consent-accept',
                '.consent-accept-all',
                '.cookie-banner-accept',
                '.cookie-banner-accept-all',
                '.accept-cookies',
                '.accept-all-cookies',
                '.btn-accept-cookies',
                '.btn-accept-all-cookies',
                '.btn-cookie-accept',
                '.btn-cookie-accept-all',
                '.btn-gdpr-accept',
                '.btn-gdpr-accept-all',
                '.btn-consent-accept',
                '.btn-consent-accept-all',
                // ID-based selectors
                '#accept-cookies',
                '#accept-all-cookies',
                '#cookie-accept',
                '#cookie-accept-all',
                '#gdpr-accept',
                '#gdpr-accept-all',
                '#consent-accept',
                '#consent-accept-all',
                // Text-based selectors
                'button:has-text("Accept")',
                'button:has-text("Accept All")',
                'button:has-text("Accept Cookies")',
                'button:has-text("Accept All Cookies")',
                'button:has-text("I Accept")',
                'button:has-text("I Agree")',
                'button:has-text("OK")',
                'button:has-text("Got it")',
                'button:has-text("Continue")',
                'button:has-text("Proceed")',
                'a:has-text("Accept")',
                'a:has-text("Accept All")',
                'a:has-text("Accept Cookies")',
                'a:has-text("Accept All Cookies")',
                'a:has-text("I Accept")',
                'a:has-text("I Agree")',
                'a:has-text("OK")',
                'a:has-text("Got it")',
                'a:has-text("Continue")',
                'a:has-text("Proceed")',
                // Close buttons for modals
                '[data-testid="close-modal"]',
                '[data-testid="close-popup"]',
                '[data-testid="modal-close"]',
                '[data-testid="popup-close"]',
                '.close-modal',
                '.close-popup',
                '.modal-close',
                '.popup-close',
                '.btn-close',
                '.btn-close-modal',
                '.btn-close-popup',
                'button:has-text("×")',
                'button:has-text("✕")',
                'button:has-text("Close")',
                'a:has-text("×")',
                'a:has-text("✕")',
                'a:has-text("Close")',
                // Cookie banner dismiss
                '[data-testid="cookie-banner-dismiss"]',
                '[data-testid="cookie-banner-close"]',
                '.cookie-banner-dismiss',
                '.cookie-banner-close',
                '.cookie-dismiss',
                '.cookie-close',
                // GDPR specific
                '[data-testid="gdpr-accept-necessary"]',
                '[data-testid="gdpr-accept-functional"]',
                '[data-testid="gdpr-accept-analytics"]',
                '[data-testid="gdpr-accept-marketing"]',
                '.gdpr-accept-necessary',
                '.gdpr-accept-functional',
                '.gdpr-accept-analytics',
                '.gdpr-accept-marketing'
            ];
            // Add custom selectors from configuration
            if (this.config.cookieModalHandling?.customSelectors) {
                cookieSelectors = [...this.config.cookieModalHandling.customSelectors, ...cookieSelectors];
            }
            // Try to find and click cookie accept buttons
            for (const selector of cookieSelectors) {
                try {
                    const element = await page.locator(selector).first();
                    if (await element.isVisible({ timeout: 2000 })) {
                        console.log(`🍪 Found cookie modal, clicking: ${selector}`);
                        await element.click();
                        const waitTime = this.config.cookieModalHandling?.waitAfterClick || 1000;
                        await page.waitForTimeout(waitTime); // Wait for modal to disappear
                        break; // Exit after clicking the first found button
                    }
                }
                catch (error) {
                    // Continue to next selector if this one doesn't exist or isn't visible
                    continue;
                }
            }
            // Handle overlay/backdrop clicks (common for modals)
            try {
                const overlaySelectors = [
                    '.modal-backdrop',
                    '.modal-overlay',
                    '.popup-backdrop',
                    '.popup-overlay',
                    '.cookie-backdrop',
                    '.cookie-overlay',
                    '.gdpr-backdrop',
                    '.gdpr-overlay',
                    '.consent-backdrop',
                    '.consent-overlay',
                    '[data-testid="modal-backdrop"]',
                    '[data-testid="popup-backdrop"]',
                    '[data-testid="cookie-backdrop"]',
                    '[data-testid="gdpr-backdrop"]',
                    '[data-testid="consent-backdrop"]'
                ];
                for (const selector of overlaySelectors) {
                    try {
                        const element = await page.locator(selector).first();
                        if (await element.isVisible({ timeout: 1000 })) {
                            console.log(`🎭 Found modal backdrop, clicking: ${selector}`);
                            await element.click();
                            await page.waitForTimeout(500);
                            break;
                        }
                    }
                    catch (error) {
                        continue;
                    }
                }
            }
            catch (error) {
                // Ignore backdrop click errors
            }
            // Handle ESC key for modals
            try {
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);
            }
            catch (error) {
                // Ignore ESC key errors
            }
        }
        catch (error) {
            console.warn(`Warning: Cookie modal handling failed: ${error}`);
        }
    }
    async extractPageSections(page) {
        const sections = [];
        let sectionId = 0;
        try {
            // Extract sections based on selectors
            for (const selector of this.sectionSelectors) {
                const elements = await page.locator(selector).all();
                for (const element of elements) {
                    try {
                        const isVisible = await element.isVisible();
                        if (!isVisible)
                            continue;
                        const boundingBox = await element.boundingBox();
                        if (!boundingBox || boundingBox.width === 0 || boundingBox.height === 0)
                            continue;
                        const content = await element.innerHTML();
                        const textContent = await element.textContent() || '';
                        if (textContent.trim().length < 10)
                            continue; // Skip sections with minimal content
                        const sectionType = await this.determineSectionType(page, selector, element);
                        sections.push({
                            id: `section_${sectionId++}`,
                            selector,
                            type: sectionType,
                            boundingBox: {
                                x: boundingBox.x,
                                y: boundingBox.y,
                                width: boundingBox.width,
                                height: boundingBox.height,
                            },
                            content,
                            textContent: textContent.trim(),
                        });
                    }
                    catch (error) {
                        // Skip elements that can't be processed
                        continue;
                    }
                }
            }
            // If no sections found, create sections based on major divs
            if (sections.length === 0) {
                const divs = await page.locator('div').all();
                for (const div of divs) {
                    try {
                        const isVisible = await div.isVisible();
                        if (!isVisible)
                            continue;
                        const boundingBox = await div.boundingBox();
                        if (!boundingBox || boundingBox.width === 0 || boundingBox.height === 0)
                            continue;
                        const content = await div.innerHTML();
                        const textContent = await div.textContent() || '';
                        if (textContent.trim().length < 50)
                            continue; // Skip divs with minimal content
                        // Check if this div is a child of any existing section
                        const isChildOfExisting = await this.isChildOfExistingSection(page, div, sections);
                        if (isChildOfExisting)
                            continue;
                        const sectionType = await this.determineSectionType(page, 'div', div);
                        sections.push({
                            id: `section_${sectionId++}`,
                            selector: 'div',
                            type: sectionType,
                            boundingBox: {
                                x: boundingBox.x,
                                y: boundingBox.y,
                                width: boundingBox.width,
                                height: boundingBox.height,
                            },
                            content,
                            textContent: textContent.trim(),
                        });
                    }
                    catch (error) {
                        // Skip elements that can't be processed
                        continue;
                    }
                }
            }
            return sections;
        }
        catch (error) {
            console.warn('Failed to extract page sections:', error);
            return [];
        }
    }
    async determineSectionType(page, selector, element) {
        try {
            const className = await element.getAttribute('class') || '';
            const role = await element.getAttribute('role') || '';
            const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
            if (tagName === 'header' || className.includes('header') || role === 'banner') {
                return 'header';
            }
            if (tagName === 'nav' || className.includes('nav') || role === 'navigation') {
                return 'navigation';
            }
            if (tagName === 'main' || className.includes('main') || role === 'main') {
                return 'main';
            }
            if (tagName === 'aside' || className.includes('sidebar') || role === 'complementary') {
                return 'sidebar';
            }
            if (tagName === 'footer' || className.includes('footer') || role === 'contentinfo') {
                return 'footer';
            }
            if (tagName === 'form' || className.includes('form')) {
                return 'form';
            }
            if (className.includes('content') || className.includes('hero') || className.includes('banner')) {
                return 'content';
            }
            return 'other';
        }
        catch (error) {
            return 'other';
        }
    }
    async isChildOfExistingSection(page, element, sections) {
        try {
            for (const section of sections) {
                const parent = await element.locator(`xpath=ancestor::${section.selector}`).count();
                if (parent > 0) {
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            return false;
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