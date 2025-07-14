import { DeploymentWaitConfig } from '../types';
export declare class DeploymentWaiter {
    private config;
    private browser;
    constructor(config: DeploymentWaitConfig);
    waitForDeployment(): Promise<void>;
    private waitWithDelay;
    private waitWithHealthcheck;
    private waitWithContent;
    private waitWithCommand;
    private cleanup;
    static getDefaultConfig(): DeploymentWaitConfig;
    static validateConfig(config: DeploymentWaitConfig): void;
}
//# sourceMappingURL=DeploymentWaiter.d.ts.map