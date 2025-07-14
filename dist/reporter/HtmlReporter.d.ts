import { ReportData } from '../types';
export declare class HtmlReporter {
    private templatePath;
    private outputPath;
    constructor(templatePath?: string, outputPath?: string);
    generateReport(reportData: ReportData): Promise<string>;
    private generateHtmlContent;
    private getTemplate;
    private getDefaultTemplate;
    private copyAssets;
    private generatePageReports;
    private getPageTemplate;
    private makeUrlSafe;
}
//# sourceMappingURL=HtmlReporter.d.ts.map