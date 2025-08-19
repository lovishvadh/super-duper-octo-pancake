import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import * as diff from 'diff';
import * as cheerio from 'cheerio';
import { CrawlResult, ComparisonResult, SectionComparison, PageSectionInfo } from '../types';
import { Buffer } from 'buffer';

export interface SectionComparisonResult {
  sectionId: string;
  sectionType: string;
  selector: string;
  hasChanges: boolean;
  contentChanges: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  visualChanges: {
    pixelDifference: number;
    percentageChange: number;
    diffScreenshot?: string;
  };
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class ComparisonEngine {
  private threshold: number;
  private ignoreAntialiasing: boolean;
  private ignoreColors: boolean;
  private sectionSelectors: string[];

  constructor(options: {
    threshold?: number;
    ignoreAntialiasing?: boolean;
    ignoreColors?: boolean;
    sectionSelectors?: string[];
  } = {}) {
    this.threshold = options.threshold || 0.1;
    this.ignoreAntialiasing = options.ignoreAntialiasing || true;
    this.ignoreColors = options.ignoreColors || false;
    this.sectionSelectors = options.sectionSelectors || [
      'header', 'nav', 'main', 'aside', 'footer', 
      '.header', '.navigation', '.main-content', '.sidebar', '.footer',
      '[role="banner"]', '[role="navigation"]', '[role="main"]', '[role="complementary"]', '[role="contentinfo"]',
      '.hero', '.banner', '.content', '.form', '.widget', '.section'
    ];
  }

  async compareResults(
    beforeResults: CrawlResult[],
    afterResults: CrawlResult[]
  ): Promise<ComparisonResult[]> {
    const comparisons: ComparisonResult[] = [];

    // Create a map of after results for quick lookup by path
    const afterResultsMap = new Map<string, CrawlResult>();
    afterResults.forEach(result => {
      const path = this.extractPath(result.url);
      afterResultsMap.set(path, result);
    });

    for (const beforeResult of beforeResults) {
      const beforePath = this.extractPath(beforeResult.url);
      const afterResult = afterResultsMap.get(beforePath);
      
      if (!afterResult) {
        // Page was removed
        comparisons.push({
          url: beforeResult.url,
          beforeScreenshot: beforeResult.screenshot,
          afterScreenshot: '',
          pixelDifference: 0,
          percentageChange: 100,
          contentChanges: {
            added: [],
            removed: ['Entire page removed'],
            modified: [],
            summary: 'Entire page removed',
            details: ['➖ Removed: "Entire page removed"'],
          },
          sectionComparisons: [],
          metadata: {
            timestamp: new Date().toISOString(),
            beforeTimestamp: beforeResult.metadata.timestamp,
            afterTimestamp: '',
          },
        });
        continue;
      }

      const comparison = await this.comparePage(beforeResult, afterResult);
      comparisons.push(comparison);
    }

    // Check for new pages
    for (const afterResult of afterResults) {
      const afterPath = this.extractPath(afterResult.url);
      const beforeResult = beforeResults.find(r => this.extractPath(r.url) === afterPath);
      if (!beforeResult) {
        comparisons.push({
          url: afterResult.url,
          beforeScreenshot: '',
          afterScreenshot: afterResult.screenshot,
          pixelDifference: 0,
          percentageChange: 100,
          contentChanges: {
            added: ['New page added'],
            removed: [],
            modified: [],
            summary: 'New page added',
            details: ['➕ Added: "New page added"'],
          },
          sectionComparisons: [],
          metadata: {
            timestamp: new Date().toISOString(),
            beforeTimestamp: '',
            afterTimestamp: afterResult.metadata.timestamp,
          },
        });
      }
    }

    return comparisons;
  }

  private async comparePage(
    beforeResult: CrawlResult,
    afterResult: CrawlResult
  ): Promise<ComparisonResult> {
    // Use sections from crawler results
    const beforeSections = beforeResult.sections || [];
    const afterSections = afterResult.sections || [];

    // Compare sections
    const sectionComparisons = await this.compareSections(
      beforeSections,
      afterSections,
      beforeResult.screenshot,
      afterResult.screenshot
    );

    // Overall screenshot comparison
    const screenshotComparison = await this.compareScreenshots(
      beforeResult.screenshot,
      afterResult.screenshot
    );

    // Overall content comparison
    const contentChanges = this.compareContent(
      beforeResult.content,
      afterResult.content
    );

    return {
      url: beforeResult.url,
      beforeScreenshot: beforeResult.screenshot,
      afterScreenshot: afterResult.screenshot,
      diffScreenshot: screenshotComparison.diffScreenshot,
      pixelDifference: screenshotComparison.pixelDifference,
      percentageChange: screenshotComparison.percentageChange,
      contentChanges,
      sectionComparisons,
      metadata: {
        timestamp: new Date().toISOString(),
        beforeTimestamp: beforeResult.metadata.timestamp,
        afterTimestamp: afterResult.metadata.timestamp,
      },
    };
  }



  private async compareSections(
    beforeSections: PageSectionInfo[],
    afterSections: PageSectionInfo[],
    beforeScreenshot: string,
    afterScreenshot: string
  ): Promise<SectionComparison[]> {
    const comparisons: SectionComparison[] = [];

    // Create maps for quick lookup using selector + type as key
    const beforeSectionsMap = new Map<string, PageSectionInfo>();
    const afterSectionsMap = new Map<string, PageSectionInfo>();

    beforeSections.forEach(section => {
      const key = `${section.selector}-${section.type}`;
      beforeSectionsMap.set(key, section);
    });

    afterSections.forEach(section => {
      const key = `${section.selector}-${section.type}`;
      afterSectionsMap.set(key, section);
    });

    // Compare each section
    for (const beforeSection of beforeSections) {
      const key = `${beforeSection.selector}-${beforeSection.type}`;
      const afterSection = afterSectionsMap.get(key);
      
      if (afterSection) {
        // Section exists in both versions
        const contentChanges = this.compareContent(
          beforeSection.content,
          afterSection.content
        );

        const visualChanges = await this.compareSectionScreenshots(
          beforeScreenshot,
          afterScreenshot,
          beforeSection,
          afterSection
        );

        const hasChanges = contentChanges.added.length > 0 || 
                          contentChanges.removed.length > 0 || 
                          contentChanges.modified.length > 0 ||
                          visualChanges.hasSignificantChanges;

        comparisons.push({
          sectionId: beforeSection.id,
          sectionType: beforeSection.type,
          selector: beforeSection.selector,
          hasChanges,
          contentChanges,
          visualChanges,
          boundingBox: beforeSection.boundingBox,
        });
      } else {
        // Section was removed
        comparisons.push({
          sectionId: beforeSection.id,
          sectionType: beforeSection.type,
          selector: beforeSection.selector,
          hasChanges: true,
          contentChanges: {
            added: [],
            removed: ['Section removed'],
            modified: [],
            summary: 'Section removed',
            details: ['➖ Removed: "Section removed"'],
          },
          visualChanges: {
            pixelDifference: 0,
            percentageChange: 100,
            hasSignificantChanges: true,
            changeType: 'content',
          },
          boundingBox: beforeSection.boundingBox,
        });
      }
    }

    // Check for new sections
    for (const afterSection of afterSections) {
      const key = `${afterSection.selector}-${afterSection.type}`;
      const beforeSection = beforeSectionsMap.get(key);
      if (!beforeSection) {
        comparisons.push({
          sectionId: afterSection.id,
          sectionType: afterSection.type,
          selector: afterSection.selector,
          hasChanges: true,
          contentChanges: {
            added: ['New section added'],
            removed: [],
            modified: [],
            summary: 'New section added',
            details: ['➕ Added: "New section added"'],
          },
          visualChanges: {
            pixelDifference: 0,
            percentageChange: 100,
            hasSignificantChanges: true,
            changeType: 'content',
          },
          boundingBox: afterSection.boundingBox,
        });
      }
    }

    return comparisons;
  }

  private async compareSectionScreenshots(
    beforeScreenshot: string,
    afterScreenshot: string,
    beforeSection: PageSectionInfo,
    afterSection: PageSectionInfo
  ): Promise<{
    pixelDifference: number;
    percentageChange: number;
    diffScreenshot?: string;
    hasSignificantChanges: boolean;
    changeType: 'none' | 'content' | 'layout' | 'both';
  }> {
    // Use individual section screenshots if available
    const beforeSectionScreenshot = beforeSection.screenshot || beforeScreenshot;
    const afterSectionScreenshot = afterSection.screenshot || afterScreenshot;
    
    if (!beforeSectionScreenshot || !afterSectionScreenshot) {
      return {
        pixelDifference: 0,
        percentageChange: 0,
        hasSignificantChanges: false,
        changeType: 'none',
      };
    }

    try {
      const beforeBuffer = Buffer.from(beforeSectionScreenshot, 'base64');
      const afterBuffer = Buffer.from(afterSectionScreenshot, 'base64');

      const beforePng = PNG.sync.read(beforeBuffer);
      const afterPng = PNG.sync.read(afterBuffer);

      // Normalize dimensions for comparison
      const { width, height } = this.normalizeImageDimensions(beforePng, afterPng);

      const diff = new PNG({ width, height });
      const pixelDifference = pixelmatch(
        beforePng.data,
        afterPng.data,
        diff.data,
        width,
        height,
        {
          threshold: this.threshold,
          includeAA: !this.ignoreAntialiasing,
          alpha: 0.1,
        }
      );

      const totalPixels = width * height;
      const percentageChange = (pixelDifference / totalPixels) * 100;

      // Intelligent change detection
      const changeAnalysis = this.analyzeVisualChanges(
        beforePng,
        afterPng,
        pixelDifference,
        percentageChange,
        beforeSection,
        afterSection
      );

      const diffBuffer = PNG.sync.write(diff);
      const diffScreenshot = diffBuffer.toString('base64');

      return {
        pixelDifference,
        percentageChange,
        diffScreenshot,
        hasSignificantChanges: changeAnalysis.hasSignificantChanges,
        changeType: changeAnalysis.changeType,
      };
    } catch (error) {
      console.warn('Error comparing section screenshots:', error);
      return {
        pixelDifference: 0,
        percentageChange: 0,
        hasSignificantChanges: false,
        changeType: 'none',
      };
    }
  }



  private analyzeVisualChanges(
    beforeImg: PNG,
    afterImg: PNG,
    pixelDifference: number,
    percentageChange: number,
    beforeSection: PageSectionInfo,
    afterSection: PageSectionInfo
  ): {
    hasSignificantChanges: boolean;
    changeType: 'none' | 'content' | 'layout' | 'both';
  } {
    // Calculate size differences
    const beforeArea = beforeSection.boundingBox.width * beforeSection.boundingBox.height;
    const afterArea = afterSection.boundingBox.width * afterSection.boundingBox.height;
    const sizeDifference = Math.abs(beforeArea - afterArea) / Math.max(beforeArea, afterArea);

    // Calculate aspect ratio differences
    const beforeAspect = beforeSection.boundingBox.width / beforeSection.boundingBox.height;
    const afterAspect = afterSection.boundingBox.width / afterSection.boundingBox.height;
    const aspectDifference = Math.abs(beforeAspect - afterAspect) / Math.max(beforeAspect, afterAspect);

    // Determine change type based on analysis
    let changeType: 'none' | 'content' | 'layout' | 'both' = 'none';
    let hasSignificantChanges = false;

    // Layout changes (size/aspect ratio changes)
    const hasLayoutChanges = sizeDifference > 0.1 || aspectDifference > 0.1;
    
    // Content changes (pixel differences)
    const hasContentChanges = percentageChange > this.threshold;

    if (hasLayoutChanges && hasContentChanges) {
      changeType = 'both';
      hasSignificantChanges = true;
    } else if (hasContentChanges) {
      changeType = 'content';
      hasSignificantChanges = true;
    } else if (hasLayoutChanges) {
      changeType = 'layout';
      // Only consider layout changes significant if they're substantial
      hasSignificantChanges = sizeDifference > 0.2 || aspectDifference > 0.2;
    }

    // Additional checks for false positives
    if (hasSignificantChanges) {
      // Check if changes are just minor positioning differences
      const isMinorPositioning = percentageChange < 5 && sizeDifference < 0.05;
      if (isMinorPositioning) {
        hasSignificantChanges = false;
        changeType = 'none';
      }
    }

    return {
      hasSignificantChanges,
      changeType,
    };
  }

  private async compareScreenshots(
    beforeScreenshot: string,
    afterScreenshot: string
  ): Promise<{
    diffScreenshot: string;
    pixelDifference: number;
    percentageChange: number;
  }> {
    if (!beforeScreenshot || !afterScreenshot) {
      return {
        diffScreenshot: '',
        pixelDifference: 0,
        percentageChange: beforeScreenshot !== afterScreenshot ? 100 : 0,
      };
    }

    try {
      const beforeBuffer = Buffer.from(beforeScreenshot, 'base64');
      const afterBuffer = Buffer.from(afterScreenshot, 'base64');

      const beforePng = PNG.sync.read(beforeBuffer);
      const afterPng = PNG.sync.read(afterBuffer);

      // Ensure both images have the same dimensions
      const { width, height } = this.normalizeImageDimensions(beforePng, afterPng);

      const diff = new PNG({ width, height });
      const pixelDifference = pixelmatch(
        beforePng.data,
        afterPng.data,
        diff.data,
        width,
        height,
        {
          threshold: this.threshold,
          includeAA: !this.ignoreAntialiasing,
          alpha: 0.1,
        }
      );

      const totalPixels = width * height;
      const percentageChange = (pixelDifference / totalPixels) * 100;

      const diffBuffer = PNG.sync.write(diff);
      const diffScreenshot = diffBuffer.toString('base64');

      return {
        diffScreenshot,
        pixelDifference,
        percentageChange,
      };
    } catch (error) {
      // Error comparing screenshots
      return {
        diffScreenshot: '',
        pixelDifference: 0,
        percentageChange: 0,
      };
    }
  }

  private normalizeImageDimensions(
    img1: PNG,
    img2: PNG
  ): { width: number; height: number } {
    const width = Math.max(img1.width, img2.width);
    const height = Math.max(img1.height, img2.height);

    // Extend smaller image with transparent pixels
    if (img1.width !== width || img1.height !== height) {
      const newImg1 = new PNG({ width, height });
      PNG.bitblt(img1, newImg1, 0, 0, img1.width, img1.height, 0, 0);
      img1.data = newImg1.data;
      img1.width = width;
      img1.height = height;
    }

    if (img2.width !== width || img2.height !== height) {
      const newImg2 = new PNG({ width, height });
      PNG.bitblt(img2, newImg2, 0, 0, img2.width, img2.height, 0, 0);
      img2.data = newImg2.data;
      img2.width = width;
      img2.height = height;
    }

    return { width, height };
  }

  private compareContent(
    beforeContent: string,
    afterContent: string
  ): {
    added: string[];
    removed: string[];
    modified: string[];
    summary: string;
    details: string[];
  } {
    const beforeText = this.extractTextContent(beforeContent);
    const afterText = this.extractTextContent(afterContent);

    const diffResult = diff.diffLines(beforeText, afterText);

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];
    const details: string[] = [];

    diffResult.forEach((part: any) => {
      if (part.added) {
        const text = part.value.trim();
        if (text.length > 0) {
          added.push(text);
          details.push(`➕ Added: "${text}"`);
        }
      } else if (part.removed) {
        const text = part.value.trim();
        if (text.length > 0) {
          removed.push(text);
          details.push(`➖ Removed: "${text}"`);
        }
      }
    });

    // Detect modifications (items that appear in both added and removed)
    const addedSet = new Set(added);
    const removedSet = new Set(removed);

    added.forEach(addedItem => {
      const similarRemoved = Array.from(removedSet).find(removedItem =>
        this.isSimilar(addedItem, removedItem)
      );
      
      if (similarRemoved) {
        const changeDescription = this.describeTextChange(similarRemoved, addedItem);
        modified.push(changeDescription);
        details.push(`✏️ Modified: ${changeDescription}`);
        addedSet.delete(addedItem);
        removedSet.delete(similarRemoved);
      }
    });

    // Generate user-friendly summary
    const summary = this.generateContentSummary(added, removed, modified);

    return {
      added: Array.from(addedSet).filter(item => item.length > 0),
      removed: Array.from(removedSet).filter(item => item.length > 0),
      modified: modified.filter(item => item.length > 0),
      summary,
      details: details.filter(item => item.length > 0),
    };
  }

  private describeTextChange(oldText: string, newText: string): string {
    // Clean up text for better comparison
    const cleanOld = oldText.replace(/\s+/g, ' ').trim();
    const cleanNew = newText.replace(/\s+/g, ' ').trim();
    
    // If it's a simple word change
    if (cleanOld.split(' ').length === 1 && cleanNew.split(' ').length === 1) {
      return `"${cleanOld}" → "${cleanNew}"`;
    }
    
    // If it's a phrase or sentence change
    if (cleanOld.length < 50 && cleanNew.length < 50) {
      return `"${cleanOld}" → "${cleanNew}"`;
    }
    
    // For longer text, show the key differences
    const oldWords = cleanOld.split(' ');
    const newWords = cleanNew.split(' ');
    
    // Find the first different word
    let firstDiffIndex = 0;
    while (firstDiffIndex < Math.min(oldWords.length, newWords.length) && 
           oldWords[firstDiffIndex] === newWords[firstDiffIndex]) {
      firstDiffIndex++;
    }
    
    if (firstDiffIndex < oldWords.length || firstDiffIndex < newWords.length) {
      const oldDiff = oldWords.slice(firstDiffIndex, firstDiffIndex + 3).join(' ');
      const newDiff = newWords.slice(firstDiffIndex, firstDiffIndex + 3).join(' ');
      return `Changed text around "${oldDiff}" → "${newDiff}"`;
    }
    
    return `"${cleanOld.substring(0, 30)}..." → "${cleanNew.substring(0, 30)}..."`;
  }

  private generateContentSummary(added: string[], removed: string[], modified: string[]): string {
    const totalChanges = added.length + removed.length + modified.length;
    
    if (totalChanges === 0) {
      return "No content changes detected";
    }
    
    const parts: string[] = [];
    
    if (added.length > 0) {
      if (added.length === 1) {
        parts.push(`1 item added`);
      } else {
        parts.push(`${added.length} items added`);
      }
    }
    
    if (removed.length > 0) {
      if (removed.length === 1) {
        parts.push(`1 item removed`);
      } else {
        parts.push(`${removed.length} items removed`);
      }
    }
    
    if (modified.length > 0) {
      if (modified.length === 1) {
        parts.push(`1 item modified`);
      } else {
        parts.push(`${modified.length} items modified`);
      }
    }
    
    return parts.join(', ');
  }

  private extractTextContent(html: string): string {
    if (!html) return '';

    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, noscript').remove();
    
    // Extract text content
    return $.text()
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isSimilar(str1: string, str2: string): boolean {
    if (!str1 || !str2) return false;
    
    const minLength = Math.min(str1.length, str2.length);
    if (minLength === 0) return false;

    // Use Levenshtein distance to check similarity
    const distance = this.levenshteinDistance(str1, str2);
    const similarity = 1 - distance / Math.max(str1.length, str2.length);
    
    return similarity > 0.6; // 60% similarity threshold
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private extractPath(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search + urlObj.hash;
    } catch (error) {
      // If URL parsing fails, try to extract path manually
      const match = url.match(/https?:\/\/[^\/]+(\/.*)?/);
      return match ? (match[1] || '/') : url;
    }
  }
} 