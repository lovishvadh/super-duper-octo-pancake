import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import * as diff from 'diff';
import * as cheerio from 'cheerio';
import { CrawlResult, ComparisonResult } from '../types';
import { Buffer } from 'buffer';

export class ComparisonEngine {
  private threshold: number;
  private ignoreAntialiasing: boolean;
  private ignoreColors: boolean;

  constructor(options: {
    threshold?: number;
    ignoreAntialiasing?: boolean;
    ignoreColors?: boolean;
  } = {}) {
    this.threshold = options.threshold || 0.1;
    this.ignoreAntialiasing = options.ignoreAntialiasing || true;
    this.ignoreColors = options.ignoreColors || false;
  }

  async compareResults(
    beforeResults: CrawlResult[],
    afterResults: CrawlResult[]
  ): Promise<ComparisonResult[]> {
    const comparisons: ComparisonResult[] = [];

    // Create a map of after results for quick lookup
    const afterResultsMap = new Map<string, CrawlResult>();
    afterResults.forEach(result => {
      afterResultsMap.set(result.url, result);
    });

    for (const beforeResult of beforeResults) {
      const afterResult = afterResultsMap.get(beforeResult.url);
      
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
          },
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
      const beforeResult = beforeResults.find(r => r.url === afterResult.url);
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
          },
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
    const screenshotComparison = await this.compareScreenshots(
      beforeResult.screenshot,
      afterResult.screenshot
    );

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
      metadata: {
        timestamp: new Date().toISOString(),
        beforeTimestamp: beforeResult.metadata.timestamp,
        afterTimestamp: afterResult.metadata.timestamp,
      },
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
  } {
    const beforeText = this.extractTextContent(beforeContent);
    const afterText = this.extractTextContent(afterContent);

    const diffResult = diff.diffLines(beforeText, afterText);

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    diffResult.forEach((part: any) => {
      if (part.added) {
        added.push(part.value.trim());
      } else if (part.removed) {
        removed.push(part.value.trim());
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
        modified.push(`Changed: "${similarRemoved}" → "${addedItem}"`);
        addedSet.delete(addedItem);
        removedSet.delete(similarRemoved);
      }
    });

    return {
      added: Array.from(addedSet).filter(item => item.length > 0),
      removed: Array.from(removedSet).filter(item => item.length > 0),
      modified: modified.filter(item => item.length > 0),
    };
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
} 