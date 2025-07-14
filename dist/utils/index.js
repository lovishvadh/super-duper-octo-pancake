"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeUrl = sanitizeUrl;
exports.formatBytes = formatBytes;
exports.formatDuration = formatDuration;
exports.isValidUrl = isValidUrl;
exports.normalizeUrl = normalizeUrl;
exports.delay = delay;
exports.createTimestamp = createTimestamp;
exports.parseThreshold = parseThreshold;
function sanitizeUrl(url) {
    return url
        .replace(/https?:\/\//, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    else {
        return `${seconds}s`;
    }
}
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
}
function normalizeUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.origin + urlObj.pathname;
    }
    catch {
        return url;
    }
}
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function createTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}
function parseThreshold(threshold) {
    const parsed = typeof threshold === 'string' ? parseFloat(threshold) : threshold;
    return Math.max(0, Math.min(100, parsed));
}
//# sourceMappingURL=index.js.map