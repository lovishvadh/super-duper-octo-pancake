import { QAConfig } from '../types';
export declare class ConfigManager {
    getDefaultConfig(): QAConfig;
    loadConfig(configPath: string): Promise<QAConfig>;
    createDefaultConfig(outputPath: string): Promise<void>;
    private validateAndMergeConfig;
    saveConfig(config: QAConfig, outputPath: string): Promise<void>;
    updateConfig(configPath: string, updates: Partial<QAConfig>): Promise<void>;
    configExists(configPath: string): Promise<boolean>;
}
//# sourceMappingURL=ConfigManager.d.ts.map