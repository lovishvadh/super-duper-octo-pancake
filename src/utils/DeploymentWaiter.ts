import { chromium, Browser } from 'playwright';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DeploymentWaitConfig } from '../types';

const execAsync = promisify(exec);

export class DeploymentWaiter {
  private config: DeploymentWaitConfig;
  private browser: Browser | null = null;

  constructor(config: DeploymentWaitConfig) {
    this.config = config;
  }

  async waitForDeployment(): Promise<void> {
    const startTime = Date.now();
    
    console.log(`Waiting for deployment using strategy: ${this.config.strategy}`);
    
    try {
      switch (this.config.strategy) {
        case 'delay':
          await this.waitWithDelay();
          break;
        case 'healthcheck':
          await this.waitWithHealthcheck();
          break;
        case 'content':
          await this.waitWithContent();
          break;
        case 'command':
          await this.waitWithCommand();
          break;
        default:
          throw new Error(`Unknown deployment wait strategy: ${this.config.strategy}`);
      }
      
      const elapsedTime = Date.now() - startTime;
      console.log(`Deployment wait completed in ${Math.round(elapsedTime / 1000)}s`);
    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      throw new Error(`Deployment wait failed after ${Math.round(elapsedTime / 1000)}s: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await this.cleanup();
    }
  }

  private async waitWithDelay(): Promise<void> {
    const delay = this.config.delay || 30000; // Default 30 seconds
    console.log(`Waiting for ${delay / 1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private async waitWithHealthcheck(): Promise<void> {
    if (!this.config.healthcheckUrl) {
      throw new Error('healthcheckUrl is required for healthcheck strategy');
    }

    const expectedStatus = this.config.expectedStatus || 200;
    const startTime = Date.now();
    
    console.log(`Polling health check endpoint: ${this.config.healthcheckUrl}`);
    
    while (Date.now() - startTime < this.config.maxWaitTime) {
      try {
        const response = await fetch(this.config.healthcheckUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'QA-Automation-Tool/1.0',
          },
        });

        if (response.status === expectedStatus) {
          console.log(`Health check passed with status ${response.status}`);
          return;
        }

        console.log(`Health check returned status ${response.status}, expected ${expectedStatus}. Retrying...`);
      } catch (error) {
        console.log(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}. Retrying...`);
      }

      await new Promise(resolve => setTimeout(resolve, this.config.interval));
    }

    throw new Error(`Health check timeout after ${this.config.maxWaitTime / 1000}s`);
  }

  private async waitWithContent(): Promise<void> {
    if (!this.config.contentUrl) {
      throw new Error('contentUrl is required for content strategy');
    }

    if (!this.config.expectedContent && !this.config.contentSelector) {
      throw new Error('Either expectedContent or contentSelector is required for content strategy');
    }

    const startTime = Date.now();
    
    // Initialize browser for content checking
    this.browser = await chromium.launch({ headless: true });
    const context = await this.browser.newContext();
    const page = await context.newPage();

    console.log(`Polling content at: ${this.config.contentUrl}`);
    
    while (Date.now() - startTime < this.config.maxWaitTime) {
      try {
        await page.goto(this.config.contentUrl, { 
          waitUntil: 'networkidle',
          timeout: 30000,
        });

        let contentFound = false;

        if (this.config.expectedContent) {
          const pageContent = await page.content();
          contentFound = pageContent.includes(this.config.expectedContent);
          
          if (contentFound) {
            console.log(`Expected content found: "${this.config.expectedContent}"`);
          } else {
            console.log(`Expected content not found: "${this.config.expectedContent}". Retrying...`);
          }
        } else if (this.config.contentSelector) {
          const element = await page.locator(this.config.contentSelector).first();
          contentFound = await element.isVisible().catch(() => false);
          
          if (contentFound) {
            console.log(`Element found with selector: "${this.config.contentSelector}"`);
          } else {
            console.log(`Element not found with selector: "${this.config.contentSelector}". Retrying...`);
          }
        }

        if (contentFound) {
          await context.close();
          return;
        }
      } catch (error) {
        console.log(`Content check failed: ${error instanceof Error ? error.message : 'Unknown error'}. Retrying...`);
      }

      await new Promise(resolve => setTimeout(resolve, this.config.interval));
    }

    await context.close();
    throw new Error(`Content check timeout after ${this.config.maxWaitTime / 1000}s`);
  }

  private async waitWithCommand(): Promise<void> {
    if (!this.config.command) {
      throw new Error('command is required for command strategy');
    }

    const expectedExitCode = this.config.expectedExitCode || 0;
    const startTime = Date.now();
    
    console.log(`Executing command: ${this.config.command}`);
    
    while (Date.now() - startTime < this.config.maxWaitTime) {
      try {
        const { stdout, stderr } = await execAsync(this.config.command);
        
        // Command executed successfully (exit code 0)
        console.log(`Command executed successfully`);
        if (stdout.trim()) {
          console.log(`Command output: ${stdout.trim()}`);
        }
        return;
      } catch (error: any) {
        const exitCode = error.code || 1;
        
        if (exitCode === expectedExitCode) {
          console.log(`Command exited with expected code: ${exitCode}`);
          return;
        }
        
        console.log(`Command failed with exit code ${exitCode}, expected ${expectedExitCode}. Retrying...`);
        if (error.stderr) {
          console.log(`Command stderr: ${error.stderr}`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, this.config.interval));
    }

    throw new Error(`Command timeout after ${this.config.maxWaitTime / 1000}s`);
  }

  private async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  static getDefaultConfig(): DeploymentWaitConfig {
    return {
      strategy: 'delay',
      maxWaitTime: 300000, // 5 minutes
      interval: 10000, // 10 seconds
      delay: 30000, // 30 seconds
      expectedStatus: 200,
      expectedExitCode: 0,
    };
  }

  static validateConfig(config: DeploymentWaitConfig): void {
    if (!config.strategy) {
      throw new Error('Deployment wait strategy is required');
    }

    if (!['delay', 'healthcheck', 'content', 'command'].includes(config.strategy)) {
      throw new Error(`Invalid deployment wait strategy: ${config.strategy}`);
    }

    if (config.maxWaitTime <= 0) {
      throw new Error('maxWaitTime must be positive');
    }

    if (config.interval <= 0) {
      throw new Error('interval must be positive');
    }

    if (config.interval >= config.maxWaitTime) {
      throw new Error('interval must be less than maxWaitTime');
    }

    switch (config.strategy) {
      case 'delay':
        if (config.delay && config.delay <= 0) {
          throw new Error('delay must be positive');
        }
        break;
      case 'healthcheck':
        if (!config.healthcheckUrl) {
          throw new Error('healthcheckUrl is required for healthcheck strategy');
        }
        if (config.expectedStatus && (config.expectedStatus < 100 || config.expectedStatus > 599)) {
          throw new Error('expectedStatus must be a valid HTTP status code');
        }
        break;
      case 'content':
        if (!config.contentUrl) {
          throw new Error('contentUrl is required for content strategy');
        }
        if (!config.expectedContent && !config.contentSelector) {
          throw new Error('Either expectedContent or contentSelector is required for content strategy');
        }
        break;
      case 'command':
        if (!config.command) {
          throw new Error('command is required for command strategy');
        }
        break;
    }
  }
} 