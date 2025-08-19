# QA Automation Tool

A comprehensive automated QA tool for comparing websites before and after deployment. This tool crawls websites, captures screenshots, compares visual and content differences, and generates detailed HTML reports.

## Features

- 🕷️ **Web Crawling**: Automated crawling with Playwright for reliable screenshot capture
- 🔍 **Visual Comparison**: Pixel-perfect image comparison with configurable thresholds
- 📝 **Content Analysis**: Text content comparison with change detection
- 🎯 **Section-by-Section Analysis**: Granular analysis of individual page sections (headers, navigation, content areas, etc.)
- 🎨 **Intelligent UI Comparison**: Distinguishes between content and layout changes, reducing false positives
- 📊 **HTML Reports**: Beautiful, interactive HTML reports with visual diffs and section breakdowns
- ⚙️ **Configurable**: Flexible configuration system for different environments
- 🚀 **CLI Interface**: Easy-to-use command-line interface
- 🔧 **Extensible**: Modular architecture for easy customization

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd qa-automation

# Install dependencies
npm install

# Build the project
npm run build

# Install globally (optional)
npm install -g .
```

## Quick Start

### 1. Initialize Configuration

```bash
qa-automation init
```

This creates a `qa-config.json` file in your current directory with default settings.

### 2. Basic Usage - Full QA Process

```bash
qa-automation run \
  --before-url https://staging.example.com \
  --after-url https://production.example.com \
  --output ./qa-results
```

### 3. Step-by-Step Process

```bash
# Step 1: Crawl before deployment
qa-automation crawl \
  --url https://staging.example.com \
  --output ./before-crawl

# Step 2: Crawl after deployment
qa-automation crawl \
  --url https://production.example.com \
  --output ./after-crawl

# Step 3: Compare and generate report
qa-automation compare \
  --before ./before-crawl \
  --after ./after-crawl \
  --output ./reports
```

**Note**: The tool automatically matches pages by their path (not full URL), so you can compare different domains (staging vs production) and the corresponding pages will be compared correctly.

## Configuration

### Default Configuration Structure

```json
{
  "crawl": {
    "baseUrl": "https://example.com",
    "pages": [
      "/",
      "/about",
      "/contact",
      "/products",
      "/services"
    ],
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "timeout": 30000,
    "waitForTimeout": 2000,
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "excludePatterns": [
      "\\.pdf$",
      "\\.jpg$",
      "\\.png$",
      "\\.gif$",
      "\\.css$",
      "\\.js$",
      "/api/",
      "/admin/"
    ]
  },
  "comparison": {
    "threshold": 0.1,
    "ignoreAntialiasing": true,
    "ignoreColors": false
  },
  "report": {
    "title": "QA Automation Report",
    "outputPath": "./reports",
    "includeScreenshots": true,
    "includeContentDiff": true,
    "threshold": 1.0
  },
  "deploymentWait": {
    "strategy": "delay",
    "maxWaitTime": 300000,
    "interval": 10000,
    "delay": 30000,
    "expectedStatus": 200,
    "expectedExitCode": 0
  }
}
```

### Configuration Options

#### Crawl Configuration
- `baseUrl`: Base URL for crawling
- `pages`: Array of page paths to crawl
- `viewport`: Browser viewport dimensions
- `timeout`: Page load timeout in milliseconds
- `waitForTimeout`: Additional wait time after page load
- `userAgent`: Custom user agent string
- `excludePatterns`: Regex patterns for URLs to exclude
- `includePatterns`: Regex patterns for URLs to include (overrides excludePatterns)
- `headers`: Custom HTTP headers
- `authentication`: Basic authentication credentials

#### Comparison Configuration
- `threshold`: Pixel difference threshold (0-1)
- `ignoreAntialiasing`: Whether to ignore antialiasing differences
- `ignoreColors`: Whether to ignore color differences

#### Report Configuration
- `title`: Report title
- `outputPath`: Output directory for reports
- `includeScreenshots`: Whether to include screenshots in report
- `includeContentDiff`: Whether to include content differences
- `threshold`: Percentage threshold for flagging changes in report

#### Deployment Wait Configuration
- `strategy`: Wait strategy (`delay`, `healthcheck`, `content`, `command`)
- `maxWaitTime`: Maximum wait time in milliseconds
- `interval`: Polling interval in milliseconds
- `delay`: Delay time in milliseconds (for delay strategy)
- `healthcheckUrl`: Health check URL (for healthcheck strategy)
- `expectedStatus`: Expected HTTP status code (for healthcheck strategy)
- `contentUrl`: Content URL to check (for content strategy)
- `expectedContent`: Expected content string (for content strategy)
- `contentSelector`: CSS selector to check (for content strategy)
- `command`: Command to execute (for command strategy)
- `expectedExitCode`: Expected exit code (for command strategy)

## CLI Commands

### `qa-automation crawl`
Crawl a website and capture screenshots.

**Options:**
- `-c, --config <path>`: Path to configuration file
- `-u, --url <url>`: Base URL to crawl
- `-p, --pages <pages>`: Comma-separated list of pages
- `-o, --output <path>`: Output directory
- `--session-name <name>`: Session name

**Example:**
```bash
qa-automation crawl \
  --url https://example.com \
  --pages "/,/about,/contact" \
  --output ./crawl-results
```

### `qa-automation compare`
Compare two crawl sessions and generate report.

**Options:**
- `-c, --config <path>`: Configuration file path
- `-b, --before <path>`: Before crawl session path
- `-a, --after <path>`: After crawl session path
- `-o, --output <path>`: Output directory
- `--threshold <number>`: Difference threshold

**Example:**
```bash
qa-automation compare \
  --before ./before-crawl \
  --after ./after-crawl \
  --threshold 0.5 \
  --output ./reports
```

### `qa-automation run`
Run the complete QA process.

**Options:**
- `-c, --config <path>`: Configuration file path
- `--before-url <url>`: Before deployment URL
- `--after-url <url>`: After deployment URL
- `-o, --output <path>`: Output directory
- `--wait-strategy <strategy>`: Deployment wait strategy (delay, healthcheck, content, command)
- `--wait-time <ms>`: Maximum wait time in milliseconds
- `--wait-interval <ms>`: Polling interval in milliseconds
- `--wait-delay <ms>`: Delay time in milliseconds (for delay strategy)
- `--wait-healthcheck-url <url>`: Health check URL (for healthcheck strategy)
- `--wait-expected-status <code>`: Expected HTTP status code (for healthcheck strategy)
- `--wait-content-url <url>`: Content URL to check (for content strategy)
- `--wait-expected-content <content>`: Expected content string (for content strategy)
- `--wait-content-selector <selector>`: CSS selector to check (for content strategy)
- `--wait-command <command>`: Command to execute (for command strategy)
- `--wait-expected-exit-code <code>`: Expected exit code (for command strategy)
- `--skip-wait`: Skip deployment wait (use this flag to disable waiting)

**Example:**
```bash
qa-automation run \
  --before-url https://staging.example.com \
  --after-url https://production.example.com \
  --output ./qa-results
```

**Cross-Domain Comparison**: The tool automatically matches pages by their path, so you can compare different environments:
- Staging vs Production: `--before-url https://staging.example.com --after-url https://production.example.com`
- Dev vs Live: `--before-url https://dev.myapp.com --after-url https://myapp.com`
- Test vs Production: `--before-url https://test.company.com --after-url https://www.company.com`

**Example with deployment wait:**
```bash
qa-automation run \
  --before-url https://staging.example.com \
  --after-url https://production.example.com \
  --wait-strategy healthcheck \
  --wait-healthcheck-url https://production.example.com/health \
  --wait-time 300000 \
  --output ./qa-results
```

### `qa-automation init`
Initialize a new configuration file.

**Options:**
- `-o, --output <path>`: Output path for config file

**Example:**
```bash
qa-automation init --output ./my-qa-config.json
```

## Report Features

The generated HTML reports include:

- **Executive Summary**: Overview of total, changed, unchanged, and failed pages
- **Visual Diffs**: Side-by-side before/after screenshots with difference highlights
- **Content Changes**: Detailed text content differences (added/removed/modified)
- **Section-by-Section Analysis**: Granular breakdown of changes by page sections (headers, navigation, content areas, etc.)
- **Individual Page Reports**: Detailed view for each page comparison
- **Responsive Design**: Reports work well on desktop and mobile devices
- **Interactive Elements**: Expandable sections and hover effects

### Enhanced Section Analysis

The tool now provides detailed section-by-section analysis, automatically detecting and comparing:

- **Page Sections**: Headers, navigation, main content, sidebars, footers, forms
- **Content Changes**: Text additions, removals, and modifications per section
- **Visual Changes**: Pixel-level differences and percentage changes per section
- **Bounding Box Information**: Precise location and dimensions of each section

This granular analysis helps identify exactly which parts of a page have changed, reducing false positives and providing actionable insights for debugging.

For detailed information about the enhanced features, see [ENHANCED_FEATURES.md](./ENHANCED_FEATURES.md).

## Deployment Wait Strategies

The QA automation tool supports multiple strategies for waiting until deployment is complete before crawling the after URL. This ensures that you're comparing the correct versions of your application.

### Available Strategies

#### 1. Delay Strategy
Simply waits for a specified amount of time.

```json
{
  "deploymentWait": {
    "strategy": "delay",
    "maxWaitTime": 300000,
    "interval": 10000,
    "delay": 60000
  }
}
```

**CLI Example:**
```bash
qa-automation run \
  --before-url https://staging.example.com \
  --after-url https://production.example.com \
  --wait-strategy delay \
  --wait-delay 60000
```

#### 2. Health Check Strategy
Polls a health check endpoint until it returns the expected status code.

```json
{
  "deploymentWait": {
    "strategy": "healthcheck",
    "maxWaitTime": 600000,
    "interval": 15000,
    "healthcheckUrl": "https://your-app.com/health",
    "expectedStatus": 200
  }
}
```

**CLI Example:**
```bash
qa-automation run \
  --before-url https://staging.example.com \
  --after-url https://production.example.com \
  --wait-strategy healthcheck \
  --wait-healthcheck-url https://production.example.com/health \
  --wait-expected-status 200
```

#### 3. Content Strategy
Checks a URL for specific content or CSS selectors.

**Check for specific text:**
```json
{
  "deploymentWait": {
    "strategy": "content",
    "maxWaitTime": 300000,
    "interval": 10000,
    "contentUrl": "https://your-app.com/version",
    "expectedContent": "v2.1.0"
  }
}
```

**Check for CSS selector:**
```json
{
  "deploymentWait": {
    "strategy": "content",
    "maxWaitTime": 300000,
    "interval": 10000,
    "contentUrl": "https://your-app.com",
    "contentSelector": ".deployment-complete"
  }
}
```

**CLI Example:**
```bash
qa-automation run \
  --before-url https://staging.example.com \
  --after-url https://production.example.com \
  --wait-strategy content \
  --wait-content-url https://production.example.com \
  --wait-content-selector ".deployment-complete"
```

#### 4. Command Strategy
Executes a command until it returns the expected exit code.

**Kubernetes example:**
```json
{
  "deploymentWait": {
    "strategy": "command",
    "maxWaitTime": 600000,
    "interval": 30000,
    "command": "kubectl rollout status deployment/your-app",
    "expectedExitCode": 0
  }
}
```

**Docker example:**
```json
{
  "deploymentWait": {
    "strategy": "command",
    "maxWaitTime": 300000,
    "interval": 15000,
    "command": "docker ps --filter name=your-app --filter status=running --quiet",
    "expectedExitCode": 0
  }
}
```

**CLI Example:**
```bash
qa-automation run \
  --before-url https://staging.example.com \
  --after-url https://production.example.com \
  --wait-strategy command \
  --wait-command "kubectl rollout status deployment/your-app"
```

### Skipping Deployment Wait

If you want to skip the deployment wait entirely, use the `--skip-wait` flag:

```bash
qa-automation run \
  --before-url https://staging.example.com \
  --after-url https://production.example.com \
  --skip-wait
```

## Advanced Usage

### Custom Configuration

```json
{
  "crawl": {
    "baseUrl": "https://example.com",
    "pages": ["/", "/products", "/about"],
    "viewport": { "width": 1920, "height": 1080 },
    "timeout": 30000,
    "waitForSelector": ".content-loaded",
    "headers": {
      "Authorization": "Bearer your-token"
    },
    "authentication": {
      "username": "user",
      "password": "pass"
    }
  },
  "comparison": {
    "threshold": 0.05,
    "ignoreAntialiasing": true,
    "ignoreColors": false
  },
  "report": {
    "title": "My App QA Report",
    "includeScreenshots": true,
    "includeContentDiff": true,
    "threshold": 0.5
  }
}
```

### Environment Variables

You can use environment variables in your configuration:

```bash
export QA_BASE_URL="https://staging.example.com"
export QA_TIMEOUT="45000"
```

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: QA Automation

on:
  push:
    branches: [ main ]

jobs:
  qa-check:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm install
    
    - name: Run QA automation
      run: |
        npx qa-automation run \
          --before-url ${{ env.STAGING_URL }} \
          --after-url ${{ env.PRODUCTION_URL }} \
          --output ./qa-results
    
    - name: Upload results
      uses: actions/upload-artifact@v2
      with:
        name: qa-results
        path: ./qa-results
```

## Development

### Project Structure

```
qa-automation/
├── src/
│   ├── cli/           # Command-line interface
│   ├── crawler/       # Web crawling functionality
│   ├── comparison/    # Image and content comparison
│   ├── reporter/      # HTML report generation
│   ├── config/        # Configuration management
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── config/            # Configuration files
├── reports/           # Generated reports
└── package.json
```

### Building from Source

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Development mode (watch)
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Troubleshooting

### Common Issues

1. **Browser Launch Failed**
   - Ensure Playwright dependencies are installed: `npx playwright install`
   - On Linux, you might need additional dependencies: `npx playwright install-deps`

2. **Memory Issues**
   - Reduce viewport size or limit concurrent pages
   - Increase Node.js memory: `node --max-old-space-size=4096`

3. **Timeout Errors**
   - Increase timeout values in configuration
   - Check network connectivity and page load times

4. **Permission Errors**
   - Ensure write permissions for output directories
   - Check file system permissions

### Performance Tips

- Use smaller viewport sizes for faster processing
- Limit the number of pages crawled simultaneously
- Use exclude patterns to skip unnecessary resources
- Consider using headless mode for better performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues, questions, or contributions, please visit our GitHub repository or contact the development team. 