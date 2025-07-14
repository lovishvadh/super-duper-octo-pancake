import * as fs from 'fs-extra';
import { join } from 'path';
import { QAConfig } from '../types';
import { DeploymentWaiter } from '../utils/DeploymentWaiter';

export class ConfigManager {
  
  getDefaultConfig(): QAConfig {
    return {
      crawl: {
        baseUrl: 'https://example.com',
        pages: [
          '/',
          '/about',
          '/contact',
          '/products',
          '/services',
        ],
        viewport: {
          width: 1920,
          height: 1080,
        },
        timeout: 30000,
        waitForTimeout: 2000,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        excludePatterns: [
          '\\.pdf$',
          '\\.jpg$',
          '\\.png$',
          '\\.gif$',
          '\\.css$',
          '\\.js$',
          '/api/',
          '/admin/',
        ],
      },
      comparison: {
        threshold: 0.1, // 0.1% difference threshold
        ignoreAntialiasing: true,
        ignoreColors: false,
      },
      report: {
        title: 'QA Automation Report',
        outputPath: './reports',
        includeScreenshots: true,
        includeContentDiff: true,
        threshold: 1.0, // 1% threshold for flagging in report
      },
      deploymentWait: {
        strategy: 'delay',
        maxWaitTime: 300000, // 5 minutes
        interval: 10000, // 10 seconds
        delay: 30000, // 30 seconds default
        expectedStatus: 200,
        expectedExitCode: 0,
      },
    };
  }

  async loadConfig(configPath: string): Promise<QAConfig> {
    try {
      const configContent = await fs.readFile(configPath, 'utf8');
      
      if (configPath.endsWith('.json')) {
        const config = JSON.parse(configContent);
        return this.validateAndMergeConfig(config);
      }
      
      if (configPath.endsWith('.js')) {
        // For JavaScript configs, we would use dynamic import
        // For now, we'll throw an error as it's more complex
        throw new Error('JavaScript config files are not supported yet. Please use JSON.');
      }
      
      throw new Error(`Unsupported config file format: ${configPath}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error(`Configuration file not found: ${configPath}`);
      }
      throw error;
    }
  }

  async createDefaultConfig(outputPath: string): Promise<void> {
    const defaultConfig = this.getDefaultConfig();
    const configContent = JSON.stringify(defaultConfig, null, 2);
    
    await fs.ensureDir(join(outputPath, '..'));
    await fs.writeFile(outputPath, configContent, 'utf8');
  }

  private validateAndMergeConfig(userConfig: Partial<QAConfig>): QAConfig {
    const defaultConfig = this.getDefaultConfig();
    
    // Deep merge configuration
    const mergedConfig: QAConfig = {
      crawl: {
        ...defaultConfig.crawl,
        ...userConfig.crawl,
      },
      comparison: {
        ...defaultConfig.comparison,
        ...userConfig.comparison,
      },
      report: {
        ...defaultConfig.report,
        ...userConfig.report,
      },
      deploymentWait: userConfig.deploymentWait ? {
        ...defaultConfig.deploymentWait,
        ...userConfig.deploymentWait,
      } : defaultConfig.deploymentWait,
    };

    // Validate required fields
    if (!mergedConfig.crawl.baseUrl) {
      throw new Error('Configuration error: crawl.baseUrl is required');
    }

    if (!mergedConfig.crawl.pages || mergedConfig.crawl.pages.length === 0) {
      throw new Error('Configuration error: crawl.pages must contain at least one page');
    }

    // Validate threshold values
    if (mergedConfig.comparison.threshold < 0 || mergedConfig.comparison.threshold > 1) {
      throw new Error('Configuration error: comparison.threshold must be between 0 and 1');
    }

    if (mergedConfig.report.threshold && (mergedConfig.report.threshold < 0 || mergedConfig.report.threshold > 100)) {
      throw new Error('Configuration error: report.threshold must be between 0 and 100');
    }

    // Validate deployment wait configuration
    if (mergedConfig.deploymentWait) {
      DeploymentWaiter.validateConfig(mergedConfig.deploymentWait);
    }

    return mergedConfig;
  }

  async saveConfig(config: QAConfig, outputPath: string): Promise<void> {
    const configContent = JSON.stringify(config, null, 2);
    await fs.writeFile(outputPath, configContent, 'utf8');
  }

  async updateConfig(configPath: string, updates: Partial<QAConfig>): Promise<void> {
    const currentConfig = await this.loadConfig(configPath);
    
    const updatedConfig: QAConfig = {
      crawl: {
        ...currentConfig.crawl,
        ...updates.crawl,
      },
      comparison: {
        ...currentConfig.comparison,
        ...updates.comparison,
      },
      report: {
        ...currentConfig.report,
        ...updates.report,
      },
    };

    await this.saveConfig(updatedConfig, configPath);
  }

  async configExists(configPath: string): Promise<boolean> {
    return await fs.pathExists(configPath);
  }
} 