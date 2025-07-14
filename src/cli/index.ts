#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs-extra';
import { join } from 'path';
import { WebCrawler } from '../crawler/WebCrawler';
import { ComparisonEngine } from '../comparison/ComparisonEngine';
import { HtmlReporter } from '../reporter/HtmlReporter';
import { ConfigManager } from '../config/ConfigManager';
import { DeploymentWaiter } from '../utils/DeploymentWaiter';
import { CrawlConfig, QAConfig, ReportData, DeploymentWaitConfig } from '../types';

const program = new Command();

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
    const spinner = ora('Initializing crawler...').start();
    
    try {
      const config = await loadConfig(options.config);
      const crawlConfig = buildCrawlConfig(config, options);
      
      spinner.text = 'Starting browser...';
      const crawler = new WebCrawler(crawlConfig);
      await crawler.initialize();
      
      spinner.text = 'Crawling website...';
      const session = await crawler.crawl();
      
      const outputPath = options.output || join(process.cwd(), 'crawl-results');
      await crawler.saveSession(outputPath);
      
      await crawler.cleanup();
      
      spinner.succeed(chalk.green(`Crawl completed! Results saved to: ${outputPath}`));
      
      console.log(chalk.blue('\nSummary:'));
      console.log(`- Session ID: ${session.id}`);
      console.log(`- Pages crawled: ${session.results.length}`);
      console.log(`- Successful: ${session.results.filter(r => !r.metadata.errors?.length).length}`);
      console.log(`- Failed: ${session.results.filter(r => r.metadata.errors?.length).length}`);
      
    } catch (error) {
      spinner.fail(chalk.red('Crawl failed'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
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
    const spinner = ora('Loading crawl sessions...').start();
    
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
      const comparisonEngine = new ComparisonEngine({
        threshold: parseFloat(options.threshold) || config.comparison?.threshold || 0.1,
        ignoreAntialiasing: config.comparison?.ignoreAntialiasing || true,
        ignoreColors: config.comparison?.ignoreColors || false,
      });
      
      const comparisons = await comparisonEngine.compareResults(
        beforeSession.results,
        afterSession.results
      );
      
      spinner.text = 'Generating report...';
      const reportData: ReportData = {
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
          outputPath: options.output || join(process.cwd(), 'reports'),
          includeScreenshots: config.report?.includeScreenshots !== false,
          includeContentDiff: config.report?.includeContentDiff !== false,
          threshold: config.comparison?.threshold || 0.1,
        },
      };
      
      const reporter = new HtmlReporter();
      const reportPath = await reporter.generateReport(reportData);
      
      spinner.succeed(chalk.green(`Comparison completed! Report saved to: ${reportPath}`));
      
      console.log(chalk.blue('\nComparison Summary:'));
      console.log(`- Total pages: ${reportData.summary.totalPages}`);
      console.log(`- Changed pages: ${chalk.red(reportData.summary.changedPages.toString())}`);
      console.log(`- Unchanged pages: ${chalk.green(reportData.summary.unchangedPages.toString())}`);
      console.log(`- Failed pages: ${chalk.yellow(reportData.summary.failedPages.toString())}`);
      
    } catch (error) {
      spinner.fail(chalk.red('Comparison failed'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
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
    const spinner = ora('Starting QA automation process...').start();
    
    try {
      const config = await loadConfig(options.config);
      
      if (!options.beforeUrl || !options.afterUrl) {
        throw new Error('Both --before-url and --after-url are required');
      }
      
      const outputPath = options.output || join(process.cwd(), 'qa-results');
      await fs.ensureDir(outputPath);
      
      // Crawl before deployment
      spinner.text = 'Crawling before deployment...';
      const beforeConfig = { ...config.crawl, baseUrl: options.beforeUrl };
      const beforeCrawler = new WebCrawler(beforeConfig);
      await beforeCrawler.initialize();
      const beforeSession = await beforeCrawler.crawl();
      await beforeCrawler.saveSession(join(outputPath, 'before'));
      await beforeCrawler.cleanup();
      
      // Wait for deployment if configured
      if (!options.skipWait) {
        const waitConfig = buildWaitConfig(config, options);
        if (waitConfig) {
          spinner.text = 'Waiting for deployment to complete...';
          const deploymentWaiter = new DeploymentWaiter(waitConfig);
          await deploymentWaiter.waitForDeployment();
        }
      }
      
      // Crawl after deployment
      spinner.text = 'Crawling after deployment...';
      const afterConfig = { ...config.crawl, baseUrl: options.afterUrl };
      const afterCrawler = new WebCrawler(afterConfig);
      await afterCrawler.initialize();
      const afterSession = await afterCrawler.crawl();
      await afterCrawler.saveSession(join(outputPath, 'after'));
      await afterCrawler.cleanup();
      
      // Compare results
      spinner.text = 'Comparing results...';
      const comparisonEngine = new ComparisonEngine(config.comparison);
      const comparisons = await comparisonEngine.compareResults(
        beforeSession.results,
        afterSession.results
      );
      
      // Generate report
      spinner.text = 'Generating report...';
      const reportData: ReportData = {
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
          outputPath: join(outputPath, 'report'),
        },
      };
      
      const reporter = new HtmlReporter();
      const reportPath = await reporter.generateReport(reportData);
      
      spinner.succeed(chalk.green(`QA process completed! Report saved to: ${reportPath}`));
      
      console.log(chalk.blue('\nFinal Summary:'));
      console.log(`- Total pages: ${reportData.summary.totalPages}`);
      console.log(`- Changed pages: ${chalk.red(reportData.summary.changedPages.toString())}`);
      console.log(`- Unchanged pages: ${chalk.green(reportData.summary.unchangedPages.toString())}`);
      console.log(`- Failed pages: ${chalk.yellow(reportData.summary.failedPages.toString())}`);
      
      if (reportData.summary.changedPages > 0) {
        console.log(chalk.yellow('\n⚠️  Changes detected! Please review the report.'));
      } else {
        console.log(chalk.green('\n✅ No significant changes detected.'));
      }
      
    } catch (error) {
      spinner.fail(chalk.red('QA process failed'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new QA automation configuration')
  .option('-o, --output <path>', 'Output path for configuration file')
  .action(async (options) => {
    const spinner = ora('Creating configuration file...').start();
    
    try {
      const configManager = new ConfigManager();
      const configPath = options.output || join(process.cwd(), 'qa-config.json');
      
      await configManager.createDefaultConfig(configPath);
      
      spinner.succeed(chalk.green(`Configuration file created: ${configPath}`));
      console.log(chalk.blue('\nEdit the configuration file to customize your QA automation setup.'));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to create configuration'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

async function loadConfig(configPath?: string): Promise<QAConfig> {
  const configManager = new ConfigManager();
  
  if (configPath) {
    return await configManager.loadConfig(configPath);
  }
  
  // Try to find config in current directory
  const defaultPaths = [
    join(process.cwd(), 'qa-config.json'),
    join(process.cwd(), 'qa-config.js'),
    join(process.cwd(), '.qa-config.json'),
  ];
  
  for (const path of defaultPaths) {
    if (await fs.pathExists(path)) {
      return await configManager.loadConfig(path);
    }
  }
  
  // Return default configuration
  return configManager.getDefaultConfig();
}

function buildCrawlConfig(config: QAConfig, options: any): CrawlConfig {
  return {
    ...config.crawl,
    baseUrl: options.url || config.crawl.baseUrl,
    pages: options.pages ? options.pages.split(',').map((p: string) => p.trim()) : config.crawl.pages,
  };
}

function buildWaitConfig(config: QAConfig, options: any): DeploymentWaitConfig | null {
  // If user explicitly wants to skip waiting, return null
  if (options.skipWait) {
    return null;
  }

  // Start with default or config file settings
  const baseConfig = config.deploymentWait || DeploymentWaiter.getDefaultConfig();

  // Override with CLI options if provided
  const waitConfig: DeploymentWaitConfig = {
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
    DeploymentWaiter.validateConfig(waitConfig);
    return waitConfig;
  } catch (error) {
    throw new Error(`Invalid deployment wait configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function loadSession(sessionPath: string): Promise<any> {
  const sessionFile = sessionPath.endsWith('.json') ? sessionPath : join(sessionPath, 'session*.json');
  
  if (sessionPath.endsWith('.json')) {
    return await fs.readJson(sessionPath);
  }
  
  // Find session file in directory
  const files = await fs.readdir(sessionPath);
  const sessionFile2 = files.find(f => f.startsWith('session-') && f.endsWith('.json'));
  
  if (!sessionFile2) {
    throw new Error(`No session file found in: ${sessionPath}`);
  }
  
  return await fs.readJson(join(sessionPath, sessionFile2));
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, 'reason:', reason);
  process.exit(1);
});

program.parse(); 