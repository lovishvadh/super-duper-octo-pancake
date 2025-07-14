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
exports.HtmlReporter = void 0;
const fs = __importStar(require("fs-extra"));
const Handlebars = __importStar(require("handlebars"));
const path_1 = require("path");
class HtmlReporter {
    constructor(templatePath, outputPath) {
        this.templatePath = templatePath || (0, path_1.join)(__dirname, '..', 'templates');
        this.outputPath = outputPath || (0, path_1.join)(process.cwd(), 'reports');
    }
    async generateReport(reportData) {
        await fs.ensureDir(this.outputPath);
        // Generate the main HTML report
        const htmlContent = await this.generateHtmlContent(reportData);
        const reportPath = (0, path_1.join)(this.outputPath, 'qa-report.html');
        await fs.writeFile(reportPath, htmlContent);
        // Copy assets
        await this.copyAssets();
        // Generate individual page reports
        await this.generatePageReports(reportData.results);
        return reportPath;
    }
    async generateHtmlContent(reportData) {
        const template = await this.getTemplate();
        const compiledTemplate = Handlebars.compile(template);
        // Prepare data for template
        const templateData = {
            ...reportData,
            results: reportData.results.map(result => ({
                ...result,
                hasChanges: result.percentageChange > (reportData.config.threshold || 0),
                percentageChangeFormatted: result.percentageChange.toFixed(2),
                beforeScreenshotData: result.beforeScreenshot ? `data:image/png;base64,${result.beforeScreenshot}` : null,
                afterScreenshotData: result.afterScreenshot ? `data:image/png;base64,${result.afterScreenshot}` : null,
                diffScreenshotData: result.diffScreenshot ? `data:image/png;base64,${result.diffScreenshot}` : null,
                urlSafe: this.makeUrlSafe(result.url),
                hasContentChanges: result.contentChanges.added.length > 0 ||
                    result.contentChanges.removed.length > 0 ||
                    result.contentChanges.modified.length > 0,
            })),
            generatedAt: new Date().toLocaleString(),
            thresholdFormatted: (reportData.config.threshold || 0).toFixed(2),
        };
        return compiledTemplate(templateData);
    }
    async getTemplate() {
        const defaultTemplate = this.getDefaultTemplate();
        try {
            const customTemplatePath = (0, path_1.join)(this.templatePath, 'report.hbs');
            if (await fs.pathExists(customTemplatePath)) {
                return await fs.readFile(customTemplatePath, 'utf8');
            }
        }
        catch (error) {
            // Fall back to default template
        }
        return defaultTemplate;
    }
    getDefaultTemplate() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{config.title}}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0;
            opacity: 0.9;
        }
        .summary {
            padding: 30px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .summary-card h3 {
            margin: 0 0 10px;
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .summary-card .number {
            font-size: 2.5em;
            font-weight: bold;
            margin: 0;
        }
        .summary-card.total .number { color: #007bff; }
        .summary-card.changed .number { color: #fd7e14; }
        .summary-card.unchanged .number { color: #28a745; }
        .summary-card.failed .number { color: #dc3545; }
        .results {
            padding: 30px;
        }
        .result-item {
            margin-bottom: 40px;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            overflow: hidden;
        }
        .result-header {
            padding: 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
        }
        .result-header h3 {
            margin: 0 0 10px;
            color: #333;
        }
        .result-meta {
            display: flex;
            gap: 20px;
            align-items: center;
            font-size: 0.9em;
            color: #666;
        }
        .change-indicator {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
        }
        .change-indicator.no-change {
            background: #d4edda;
            color: #155724;
        }
        .change-indicator.has-change {
            background: #f8d7da;
            color: #721c24;
        }
        .result-content {
            padding: 20px;
        }
        .screenshots {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        .screenshot {
            text-align: center;
        }
        .screenshot h4 {
            margin: 0 0 10px;
            color: #666;
            font-size: 0.9em;
        }
        .screenshot img {
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .content-changes {
            margin-top: 30px;
        }
        .content-changes h4 {
            margin: 0 0 15px;
            color: #333;
        }
        .changes-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .change-section {
            background: #f8f9fa;
            border-radius: 4px;
            padding: 15px;
        }
        .change-section h5 {
            margin: 0 0 10px;
            color: #666;
            font-size: 0.8em;
            text-transform: uppercase;
        }
        .change-section.added h5 { color: #28a745; }
        .change-section.removed h5 { color: #dc3545; }
        .change-section.modified h5 { color: #fd7e14; }
        .change-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .change-list li {
            padding: 5px 0;
            border-bottom: 1px solid #e9ecef;
            font-size: 0.9em;
        }
        .change-list li:last-child {
            border-bottom: none;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
            border-top: 1px solid #e9ecef;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{config.title}}</h1>
            <p>Generated on {{generatedAt}}</p>
        </div>
        
        <div class="summary">
            <div class="summary-grid">
                <div class="summary-card total">
                    <h3>Total Pages</h3>
                    <div class="number">{{summary.totalPages}}</div>
                </div>
                <div class="summary-card changed">
                    <h3>Changed</h3>
                    <div class="number">{{summary.changedPages}}</div>
                </div>
                <div class="summary-card unchanged">
                    <h3>Unchanged</h3>
                    <div class="number">{{summary.unchangedPages}}</div>
                </div>
                <div class="summary-card failed">
                    <h3>Failed</h3>
                    <div class="number">{{summary.failedPages}}</div>
                </div>
            </div>
        </div>

        <div class="results">
            {{#each results}}
            <div class="result-item">
                <div class="result-header">
                    <h3>{{url}}</h3>
                    <div class="result-meta">
                        <span class="change-indicator {{#if hasChanges}}has-change{{else}}no-change{{/if}}">
                            {{#if hasChanges}}{{percentageChangeFormatted}}% Changed{{else}}No Changes{{/if}}
                        </span>
                        <span>{{pixelDifference}} pixels different</span>
                    </div>
                </div>
                
                <div class="result-content">
                    {{#if ../config.includeScreenshots}}
                    <div class="screenshots">
                        {{#if beforeScreenshotData}}
                        <div class="screenshot">
                            <h4>Before Deployment</h4>
                            <img src="{{beforeScreenshotData}}" alt="Before screenshot">
                        </div>
                        {{/if}}
                        
                        {{#if afterScreenshotData}}
                        <div class="screenshot">
                            <h4>After Deployment</h4>
                            <img src="{{afterScreenshotData}}" alt="After screenshot">
                        </div>
                        {{/if}}
                        
                        {{#if diffScreenshotData}}
                        <div class="screenshot">
                            <h4>Difference</h4>
                            <img src="{{diffScreenshotData}}" alt="Difference screenshot">
                        </div>
                        {{/if}}
                    </div>
                    {{/if}}
                    
                    {{#if hasContentChanges}}
                    {{#if ../config.includeContentDiff}}
                    <div class="content-changes">
                        <h4>Content Changes</h4>
                        <div class="changes-grid">
                            {{#if contentChanges.added.length}}
                            <div class="change-section added">
                                <h5>Added ({{contentChanges.added.length}})</h5>
                                <ul class="change-list">
                                    {{#each contentChanges.added}}
                                    <li>{{this}}</li>
                                    {{/each}}
                                </ul>
                            </div>
                            {{/if}}
                            
                            {{#if contentChanges.removed.length}}
                            <div class="change-section removed">
                                <h5>Removed ({{contentChanges.removed.length}})</h5>
                                <ul class="change-list">
                                    {{#each contentChanges.removed}}
                                    <li>{{this}}</li>
                                    {{/each}}
                                </ul>
                            </div>
                            {{/if}}
                            
                            {{#if contentChanges.modified.length}}
                            <div class="change-section modified">
                                <h5>Modified ({{contentChanges.modified.length}})</h5>
                                <ul class="change-list">
                                    {{#each contentChanges.modified}}
                                    <li>{{this}}</li>
                                    {{/each}}
                                </ul>
                            </div>
                            {{/if}}
                        </div>
                    </div>
                    {{/if}}
                    {{/if}}
                </div>
            </div>
            {{/each}}
        </div>
        
        <div class="footer">
            <p>Report generated by QA Automation Tool</p>
        </div>
    </div>
</body>
</html>
    `.trim();
    }
    async copyAssets() {
        // Copy any additional assets if needed
        const assetsDir = (0, path_1.join)(this.outputPath, 'assets');
        await fs.ensureDir(assetsDir);
        // You can add CSS, JS, or other assets here
    }
    async generatePageReports(results) {
        const pagesDir = (0, path_1.join)(this.outputPath, 'pages');
        await fs.ensureDir(pagesDir);
        for (const result of results) {
            const pageData = {
                url: result.url,
                result,
                generatedAt: new Date().toLocaleString(),
            };
            const pageTemplate = this.getPageTemplate();
            const compiledTemplate = Handlebars.compile(pageTemplate);
            const htmlContent = compiledTemplate(pageData);
            const fileName = `${this.makeUrlSafe(result.url)}.html`;
            const filePath = (0, path_1.join)(pagesDir, fileName);
            await fs.writeFile(filePath, htmlContent);
        }
    }
    getPageTemplate() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{url}} - QA Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 30px;
        }
        .header {
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            color: #333;
        }
        .screenshots {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .screenshot {
            text-align: center;
        }
        .screenshot h3 {
            margin: 0 0 15px;
            color: #666;
        }
        .screenshot img {
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .back-link {
            display: inline-block;
            margin-bottom: 20px;
            color: #007bff;
            text-decoration: none;
        }
        .back-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="../qa-report.html" class="back-link">← Back to Main Report</a>
        
        <div class="header">
            <h1>{{url}}</h1>
            <p>Generated on {{generatedAt}}</p>
        </div>
        
        <div class="screenshots">
            {{#if result.beforeScreenshot}}
            <div class="screenshot">
                <h3>Before Deployment</h3>
                <img src="data:image/png;base64,{{result.beforeScreenshot}}" alt="Before screenshot">
            </div>
            {{/if}}
            
            {{#if result.afterScreenshot}}
            <div class="screenshot">
                <h3>After Deployment</h3>
                <img src="data:image/png;base64,{{result.afterScreenshot}}" alt="After screenshot">
            </div>
            {{/if}}
            
            {{#if result.diffScreenshot}}
            <div class="screenshot">
                <h3>Difference</h3>
                <img src="data:image/png;base64,{{result.diffScreenshot}}" alt="Difference screenshot">
            </div>
            {{/if}}
        </div>
    </div>
</body>
</html>
    `.trim();
    }
    makeUrlSafe(url) {
        return url
            .replace(/https?:\/\//, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }
}
exports.HtmlReporter = HtmlReporter;
//# sourceMappingURL=HtmlReporter.js.map