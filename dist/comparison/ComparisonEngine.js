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
exports.ComparisonEngine = void 0;
const pngjs_1 = require("pngjs");
const pixelmatch_1 = __importDefault(require("pixelmatch"));
const diff = __importStar(require("diff"));
const cheerio = __importStar(require("cheerio"));
const buffer_1 = require("buffer");
class ComparisonEngine {
    constructor(options = {}) {
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
    async compareResults(beforeResults, afterResults) {
        const comparisons = [];
        // Create a map of after results for quick lookup
        const afterResultsMap = new Map();
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
    async comparePage(beforeResult, afterResult) {
        // Use sections from crawler results
        const beforeSections = beforeResult.sections || [];
        const afterSections = afterResult.sections || [];
        // Compare sections
        const sectionComparisons = await this.compareSections(beforeSections, afterSections, beforeResult.screenshot, afterResult.screenshot);
        // Overall screenshot comparison
        const screenshotComparison = await this.compareScreenshots(beforeResult.screenshot, afterResult.screenshot);
        // Overall content comparison
        const contentChanges = this.compareContent(beforeResult.content, afterResult.content);
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
    async compareSections(beforeSections, afterSections, beforeScreenshot, afterScreenshot) {
        const comparisons = [];
        // Create maps for quick lookup
        const beforeSectionsMap = new Map();
        const afterSectionsMap = new Map();
        beforeSections.forEach(section => {
            beforeSectionsMap.set(section.id, section);
        });
        afterSections.forEach(section => {
            afterSectionsMap.set(section.id, section);
        });
        // Compare each section
        for (const beforeSection of beforeSections) {
            const afterSection = afterSectionsMap.get(beforeSection.id);
            if (afterSection) {
                // Section exists in both versions
                const contentChanges = this.compareContent(beforeSection.content, afterSection.content);
                const visualChanges = await this.compareSectionScreenshots(beforeScreenshot, afterScreenshot, beforeSection, afterSection);
                const hasChanges = contentChanges.added.length > 0 ||
                    contentChanges.removed.length > 0 ||
                    contentChanges.modified.length > 0 ||
                    visualChanges.percentageChange > this.threshold;
                comparisons.push({
                    sectionId: beforeSection.id,
                    sectionType: beforeSection.type,
                    selector: beforeSection.selector,
                    hasChanges,
                    contentChanges,
                    visualChanges,
                    boundingBox: beforeSection.boundingBox,
                });
            }
            else {
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
                    },
                    visualChanges: {
                        pixelDifference: 0,
                        percentageChange: 100,
                    },
                    boundingBox: beforeSection.boundingBox,
                });
            }
        }
        // Check for new sections
        for (const afterSection of afterSections) {
            const beforeSection = beforeSectionsMap.get(afterSection.id);
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
                    },
                    visualChanges: {
                        pixelDifference: 0,
                        percentageChange: 100,
                    },
                    boundingBox: afterSection.boundingBox,
                });
            }
        }
        return comparisons;
    }
    async compareSectionScreenshots(beforeScreenshot, afterScreenshot, beforeSection, afterSection) {
        // For now, return basic comparison
        // In a full implementation, you would crop the screenshots to the section bounds
        // and compare only those regions
        return {
            pixelDifference: 0,
            percentageChange: 0,
        };
    }
    async compareScreenshots(beforeScreenshot, afterScreenshot) {
        if (!beforeScreenshot || !afterScreenshot) {
            return {
                diffScreenshot: '',
                pixelDifference: 0,
                percentageChange: beforeScreenshot !== afterScreenshot ? 100 : 0,
            };
        }
        try {
            const beforeBuffer = buffer_1.Buffer.from(beforeScreenshot, 'base64');
            const afterBuffer = buffer_1.Buffer.from(afterScreenshot, 'base64');
            const beforePng = pngjs_1.PNG.sync.read(beforeBuffer);
            const afterPng = pngjs_1.PNG.sync.read(afterBuffer);
            // Ensure both images have the same dimensions
            const { width, height } = this.normalizeImageDimensions(beforePng, afterPng);
            const diff = new pngjs_1.PNG({ width, height });
            const pixelDifference = (0, pixelmatch_1.default)(beforePng.data, afterPng.data, diff.data, width, height, {
                threshold: this.threshold,
                includeAA: !this.ignoreAntialiasing,
                alpha: 0.1,
            });
            const totalPixels = width * height;
            const percentageChange = (pixelDifference / totalPixels) * 100;
            const diffBuffer = pngjs_1.PNG.sync.write(diff);
            const diffScreenshot = diffBuffer.toString('base64');
            return {
                diffScreenshot,
                pixelDifference,
                percentageChange,
            };
        }
        catch (error) {
            // Error comparing screenshots
            return {
                diffScreenshot: '',
                pixelDifference: 0,
                percentageChange: 0,
            };
        }
    }
    normalizeImageDimensions(img1, img2) {
        const width = Math.max(img1.width, img2.width);
        const height = Math.max(img1.height, img2.height);
        // Extend smaller image with transparent pixels
        if (img1.width !== width || img1.height !== height) {
            const newImg1 = new pngjs_1.PNG({ width, height });
            pngjs_1.PNG.bitblt(img1, newImg1, 0, 0, img1.width, img1.height, 0, 0);
            img1.data = newImg1.data;
            img1.width = width;
            img1.height = height;
        }
        if (img2.width !== width || img2.height !== height) {
            const newImg2 = new pngjs_1.PNG({ width, height });
            pngjs_1.PNG.bitblt(img2, newImg2, 0, 0, img2.width, img2.height, 0, 0);
            img2.data = newImg2.data;
            img2.width = width;
            img2.height = height;
        }
        return { width, height };
    }
    compareContent(beforeContent, afterContent) {
        const beforeText = this.extractTextContent(beforeContent);
        const afterText = this.extractTextContent(afterContent);
        const diffResult = diff.diffLines(beforeText, afterText);
        const added = [];
        const removed = [];
        const modified = [];
        diffResult.forEach((part) => {
            if (part.added) {
                added.push(part.value.trim());
            }
            else if (part.removed) {
                removed.push(part.value.trim());
            }
        });
        // Detect modifications (items that appear in both added and removed)
        const addedSet = new Set(added);
        const removedSet = new Set(removed);
        added.forEach(addedItem => {
            const similarRemoved = Array.from(removedSet).find(removedItem => this.isSimilar(addedItem, removedItem));
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
    extractTextContent(html) {
        if (!html)
            return '';
        const $ = cheerio.load(html);
        // Remove script and style elements
        $('script, style, noscript').remove();
        // Extract text content
        return $.text()
            .replace(/\s+/g, ' ')
            .trim();
    }
    isSimilar(str1, str2) {
        if (!str1 || !str2)
            return false;
        const minLength = Math.min(str1.length, str2.length);
        if (minLength === 0)
            return false;
        // Use Levenshtein distance to check similarity
        const distance = this.levenshteinDistance(str1, str2);
        const similarity = 1 - distance / Math.max(str1.length, str2.length);
        return similarity > 0.6; // 60% similarity threshold
    }
    levenshteinDistance(str1, str2) {
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
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
}
exports.ComparisonEngine = ComparisonEngine;
//# sourceMappingURL=ComparisonEngine.js.map