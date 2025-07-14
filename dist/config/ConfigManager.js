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
exports.ConfigManager = void 0;
const fs = __importStar(require("fs-extra"));
const path_1 = require("path");
const DeploymentWaiter_1 = require("../utils/DeploymentWaiter");
class ConfigManager {
    getDefaultConfig() {
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
    async loadConfig(configPath) {
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
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('ENOENT')) {
                throw new Error(`Configuration file not found: ${configPath}`);
            }
            throw error;
        }
    }
    async createDefaultConfig(outputPath) {
        const defaultConfig = this.getDefaultConfig();
        const configContent = JSON.stringify(defaultConfig, null, 2);
        await fs.ensureDir((0, path_1.join)(outputPath, '..'));
        await fs.writeFile(outputPath, configContent, 'utf8');
    }
    validateAndMergeConfig(userConfig) {
        const defaultConfig = this.getDefaultConfig();
        // Deep merge configuration
        const mergedConfig = {
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
            DeploymentWaiter_1.DeploymentWaiter.validateConfig(mergedConfig.deploymentWait);
        }
        return mergedConfig;
    }
    async saveConfig(config, outputPath) {
        const configContent = JSON.stringify(config, null, 2);
        await fs.writeFile(outputPath, configContent, 'utf8');
    }
    async updateConfig(configPath, updates) {
        const currentConfig = await this.loadConfig(configPath);
        const updatedConfig = {
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
    async configExists(configPath) {
        return await fs.pathExists(configPath);
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=ConfigManager.js.map