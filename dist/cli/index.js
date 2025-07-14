#!/usr/bin/env node
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const fs = __importStar(require("fs-extra"));
const path_1 = require("path");
const WebCrawler_1 = require("../crawler/WebCrawler");
const ComparisonEngine_1 = require("../comparison/ComparisonEngine");
const HtmlReporter_1 = require("../reporter/HtmlReporter");
const ConfigManager_1 = require("../config/ConfigManager");
const DeploymentWaiter_1 = require("../utils/DeploymentWaiter");
const program = new commander_1.Command();
program
    .name('qa-automation')
    .description('Automated QA tool for pre/post deployment website comparison')
    .version('1.0.0');
program
    .command('crawl')
    .description('Crawl a website and capture screenshots')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('-u, --url <url>', 'Base URL to crawl')
    .option('-p, --pages <pages>', 'Comma-separated list of pages to crawl')
    .option('-o, --output <path>', 'Output directory for results')
    .option('--session-name <name>', 'Name for the crawl session')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Initializing crawler...').start();
    try {
        const config = await loadConfig(options.config);
        const crawlConfig = buildCrawlConfig(config, options);
        spinner.text = 'Starting browser...';
        const crawler = new WebCrawler_1.WebCrawler(crawlConfig);
        await crawler.initialize();
        spinner.text = 'Crawling website...';
        const session = await crawler.crawl();
        const outputPath = options.output || (0, path_1.join)(process.cwd(), 'crawl-results');
        await crawler.saveSession(outputPath);
        await crawler.cleanup();
        spinner.succeed(chalk_1.default.green(`Crawl completed! Results saved to: ${outputPath}`));
        console.log(chalk_1.default.blue('\nSummary:'));
        console.log(`- Session ID: ${session.id}`);
        console.log(`- Pages crawled: ${session.results.length}`);
        console.log(`- Successful: ${session.results.filter(r => !r.metadata.errors?.length).length}`);
        console.log(`- Failed: ${session.results.filter(r => r.metadata.errors?.length).length}`);
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Crawl failed'));
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
});
program
    .command('compare')
    .description('Compare two crawl sessions')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('-b, --before <path>', 'Path to before crawl session')
    .option('-a, --after <path>', 'Path to after crawl session')
    .option('-o, --output <path>', 'Output directory for report')
    .option('--threshold <number>', 'Difference threshold percentage (default: 1)')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Loading crawl sessions...').start();
    try {
        if (!options.before || !options.after) {
            throw new Error('Both --before and --after session paths are required');
        }
        const config = await loadConfig(options.config);
        spinner.text = 'Loading before session...';
        const beforeSession = await loadSession(options.before);
        spinner.text = 'Loading after session...';
        const afterSession = await loadSession(options.after);
        spinner.text = 'Comparing sessions...';
        const comparisonEngine = new ComparisonEngine_1.ComparisonEngine({
            threshold: parseFloat(options.threshold) || config.comparison?.threshold || 0.1,
            ignoreAntialiasing: config.comparison?.ignoreAntialiasing || true,
            ignoreColors: config.comparison?.ignoreColors || false,
        });
        const comparisons = await comparisonEngine.compareResults(beforeSession.results, afterSession.results);
        spinner.text = 'Generating report...';
        const reportData = {
            summary: {
                totalPages: comparisons.length,
                changedPages: comparisons.filter(c => c.percentageChange > (config.comparison?.threshold || 0)).length,
                unchangedPages: comparisons.filter(c => c.percentageChange <= (config.comparison?.threshold || 0)).length,
                failedPages: comparisons.filter(c => !c.beforeScreenshot || !c.afterScreenshot).length,
                timestamp: new Date().toISOString(),
                beforeDeployment: beforeSession.timestamp,
                afterDeployment: afterSession.timestamp,
            },
            results: comparisons,
            config: {
                title: config.report?.title || 'QA Automation Report',
                outputPath: options.output || (0, path_1.join)(process.cwd(), 'reports'),
                includeScreenshots: config.report?.includeScreenshots !== false,
                includeContentDiff: config.report?.includeContentDiff !== false,
                threshold: config.comparison?.threshold || 0.1,
            },
        };
        const reporter = new HtmlReporter_1.HtmlReporter();
        const reportPath = await reporter.generateReport(reportData);
        spinner.succeed(chalk_1.default.green(`Comparison completed! Report saved to: ${reportPath}`));
        console.log(chalk_1.default.blue('\nComparison Summary:'));
        console.log(`- Total pages: ${reportData.summary.totalPages}`);
        console.log(`- Changed pages: ${chalk_1.default.red(reportData.summary.changedPages.toString())}`);
        console.log(`- Unchanged pages: ${chalk_1.default.green(reportData.summary.unchangedPages.toString())}`);
        console.log(`- Failed pages: ${chalk_1.default.yellow(reportData.summary.failedPages.toString())}`);
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Comparison failed'));
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
});
program
    .command('run')
    .description('Run complete QA process: crawl before, crawl after, compare, and report')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('--before-url <url>', 'URL for before deployment crawl')
    .option('--after-url <url>', 'URL for after deployment crawl')
    .option('-o, --output <path>', 'Output directory for results and report')
    .option('--wait-strategy <strategy>', 'Deployment wait strategy (delay, healthcheck, content, command)')
    .option('--wait-time <ms>', 'Maximum wait time in milliseconds')
    .option('--wait-interval <ms>', 'Polling interval in milliseconds')
    .option('--wait-delay <ms>', 'Delay time in milliseconds (for delay strategy)')
    .option('--wait-healthcheck-url <url>', 'Health check URL (for healthcheck strategy)')
    .option('--wait-expected-status <code>', 'Expected HTTP status code (for healthcheck strategy)')
    .option('--wait-content-url <url>', 'Content URL to check (for content strategy)')
    .option('--wait-expected-content <content>', 'Expected content string (for content strategy)')
    .option('--wait-content-selector <selector>', 'CSS selector to check (for content strategy)')
    .option('--wait-command <command>', 'Command to execute (for command strategy)')
    .option('--wait-expected-exit-code <code>', 'Expected exit code (for command strategy)')
    .option('--skip-wait', 'Skip deployment wait (use this flag to disable waiting)')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Starting QA automation process...').start();
    try {
        const config = await loadConfig(options.config);
        if (!options.beforeUrl || !options.afterUrl) {
            throw new Error('Both --before-url and --after-url are required');
        }
        const outputPath = options.output || (0, path_1.join)(process.cwd(), 'qa-results');
        await fs.ensureDir(outputPath);
        // Crawl before deployment
        spinner.text = 'Crawling before deployment...';
        const beforeConfig = { ...config.crawl, baseUrl: options.beforeUrl };
        const beforeCrawler = new WebCrawler_1.WebCrawler(beforeConfig);
        await beforeCrawler.initialize();
        const beforeSession = await beforeCrawler.crawl();
        await beforeCrawler.saveSession((0, path_1.join)(outputPath, 'before'));
        await beforeCrawler.cleanup();
        // Wait for deployment if configured
        if (!options.skipWait) {
            const waitConfig = buildWaitConfig(config, options);
            if (waitConfig) {
                spinner.text = 'Waiting for deployment to complete...';
                const deploymentWaiter = new DeploymentWaiter_1.DeploymentWaiter(waitConfig);
                await deploymentWaiter.waitForDeployment();
            }
        }
        // Crawl after deployment
        spinner.text = 'Crawling after deployment...';
        const afterConfig = { ...config.crawl, baseUrl: options.afterUrl };
        const afterCrawler = new WebCrawler_1.WebCrawler(afterConfig);
        await afterCrawler.initialize();
        const afterSession = await afterCrawler.crawl();
        await afterCrawler.saveSession((0, path_1.join)(outputPath, 'after'));
        await afterCrawler.cleanup();
        // Compare results
        spinner.text = 'Comparing results...';
        const comparisonEngine = new ComparisonEngine_1.ComparisonEngine(config.comparison);
        const comparisons = await comparisonEngine.compareResults(beforeSession.results, afterSession.results);
        // Generate report
        spinner.text = 'Generating report...';
        const reportData = {
            summary: {
                totalPages: comparisons.length,
                changedPages: comparisons.filter(c => c.percentageChange > (config.comparison?.threshold || 0)).length,
                unchangedPages: comparisons.filter(c => c.percentageChange <= (config.comparison?.threshold || 0)).length,
                failedPages: comparisons.filter(c => !c.beforeScreenshot || !c.afterScreenshot).length,
                timestamp: new Date().toISOString(),
                beforeDeployment: beforeSession.timestamp,
                afterDeployment: afterSession.timestamp,
            },
            results: comparisons,
            config: {
                ...config.report,
                outputPath: (0, path_1.join)(outputPath, 'report'),
            },
        };
        const reporter = new HtmlReporter_1.HtmlReporter();
        const reportPath = await reporter.generateReport(reportData);
        spinner.succeed(chalk_1.default.green(`QA process completed! Report saved to: ${reportPath}`));
        console.log(chalk_1.default.blue('\nFinal Summary:'));
        console.log(`- Total pages: ${reportData.summary.totalPages}`);
        console.log(`- Changed pages: ${chalk_1.default.red(reportData.summary.changedPages.toString())}`);
        console.log(`- Unchanged pages: ${chalk_1.default.green(reportData.summary.unchangedPages.toString())}`);
        console.log(`- Failed pages: ${chalk_1.default.yellow(reportData.summary.failedPages.toString())}`);
        if (reportData.summary.changedPages > 0) {
            console.log(chalk_1.default.yellow('\n⚠️  Changes detected! Please review the report.'));
        }
        else {
            console.log(chalk_1.default.green('\n✅ No significant changes detected.'));
        }
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('QA process failed'));
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
});
program
    .command('init')
    .description('Initialize a new QA automation configuration')
    .option('-o, --output <path>', 'Output path for configuration file')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Creating configuration file...').start();
    try {
        const configManager = new ConfigManager_1.ConfigManager();
        const configPath = options.output || (0, path_1.join)(process.cwd(), 'qa-config.json');
        await configManager.createDefaultConfig(configPath);
        spinner.succeed(chalk_1.default.green(`Configuration file created: ${configPath}`));
        console.log(chalk_1.default.blue('\nEdit the configuration file to customize your QA automation setup.'));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Failed to create configuration'));
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
});
async function loadConfig(configPath) {
    const configManager = new ConfigManager_1.ConfigManager();
    if (configPath) {
        return await configManager.loadConfig(configPath);
    }
    // Try to find config in current directory
    const defaultPaths = [
        (0, path_1.join)(process.cwd(), 'qa-config.json'),
        (0, path_1.join)(process.cwd(), 'qa-config.js'),
        (0, path_1.join)(process.cwd(), '.qa-config.json'),
    ];
    for (const path of defaultPaths) {
        if (await fs.pathExists(path)) {
            return await configManager.loadConfig(path);
        }
    }
    // Return default configuration
    return configManager.getDefaultConfig();
}
function buildCrawlConfig(config, options) {
    return {
        ...config.crawl,
        baseUrl: options.url || config.crawl.baseUrl,
        pages: options.pages ? options.pages.split(',').map((p) => p.trim()) : config.crawl.pages,
    };
}
function buildWaitConfig(config, options) {
    // If user explicitly wants to skip waiting, return null
    if (options.skipWait) {
        return null;
    }
    // Start with default or config file settings
    const baseConfig = config.deploymentWait || DeploymentWaiter_1.DeploymentWaiter.getDefaultConfig();
    // Override with CLI options if provided
    const waitConfig = {
        ...baseConfig,
        strategy: options.waitStrategy || baseConfig.strategy,
        maxWaitTime: options.waitTime ? parseInt(options.waitTime) : baseConfig.maxWaitTime,
        interval: options.waitInterval ? parseInt(options.waitInterval) : baseConfig.interval,
    };
    // Strategy-specific overrides
    if (options.waitDelay) {
        waitConfig.delay = parseInt(options.waitDelay);
    }
    if (options.waitHealthcheckUrl) {
        waitConfig.healthcheckUrl = options.waitHealthcheckUrl;
    }
    if (options.waitExpectedStatus) {
        waitConfig.expectedStatus = parseInt(options.waitExpectedStatus);
    }
    if (options.waitContentUrl) {
        waitConfig.contentUrl = options.waitContentUrl;
    }
    if (options.waitExpectedContent) {
        waitConfig.expectedContent = options.waitExpectedContent;
    }
    if (options.waitContentSelector) {
        waitConfig.contentSelector = options.waitContentSelector;
    }
    if (options.waitCommand) {
        waitConfig.command = options.waitCommand;
    }
    if (options.waitExpectedExitCode) {
        waitConfig.expectedExitCode = parseInt(options.waitExpectedExitCode);
    }
    // Validate the configuration
    try {
        DeploymentWaiter_1.DeploymentWaiter.validateConfig(waitConfig);
        return waitConfig;
    }
    catch (error) {
        throw new Error(`Invalid deployment wait configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function loadSession(sessionPath) {
    const sessionFile = sessionPath.endsWith('.json') ? sessionPath : (0, path_1.join)(sessionPath, 'session*.json');
    if (sessionPath.endsWith('.json')) {
        return await fs.readJson(sessionPath);
    }
    // Find session file in directory
    const files = await fs.readdir(sessionPath);
    const sessionFile2 = files.find(f => f.startsWith('session-') && f.endsWith('.json'));
    if (!sessionFile2) {
        throw new Error(`No session file found in: ${sessionPath}`);
    }
    return await fs.readJson((0, path_1.join)(sessionPath, sessionFile2));
}
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error(chalk_1.default.red('Uncaught Exception:'), error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk_1.default.red('Unhandled Rejection at:'), promise, 'reason:', reason);
    process.exit(1);
});
program.parse();
//# sourceMappingURL=index.js.map