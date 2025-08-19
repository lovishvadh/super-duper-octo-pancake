# Section-by-Section Screenshots

The QA automation tool now captures individual screenshots for each page section, enabling true section-by-section UI comparison without the need for image cropping.

## 📸 What are Section Screenshots?

Instead of capturing one full-page screenshot and then cropping it to compare sections, the tool now captures individual screenshots for each detected section (header, main, footer, etc.). This provides more accurate and reliable visual comparison.

### Key Features

- **Individual Section Capture**: Each section gets its own screenshot
- **Direct Comparison**: No image cropping or manipulation needed
- **Better Accuracy**: Eliminates cropping errors and false positives
- **Improved Performance**: Faster comparison without image processing
- **Responsive Layout Support**: Better handling of different screen sizes

## 🔧 How It Works

### Section Detection Process

1. **Page Crawling**: Navigate to the page and wait for full load
2. **Section Extraction**: Identify page sections using selectors
3. **Individual Screenshots**: Capture screenshot for each section
4. **Data Storage**: Store section data with screenshots
5. **Direct Comparison**: Compare section screenshots directly

### Section Selectors

The tool automatically detects sections using these selectors:

```typescript
const sectionSelectors = [
  'header', 'nav', 'main', 'aside', 'footer', 
  '.header', '.navigation', '.main-content', '.sidebar', '.footer',
  '[role="banner"]', '[role="navigation"]', '[role="main"]', 
  '[role="complementary"]', '[role="contentinfo"]',
  '.hero', '.banner', '.content', '.form', '.widget', '.section'
];
```

### Screenshot Capture

```typescript
private async captureSectionScreenshot(page: any, section: PageSectionInfo): Promise<string> {
  try {
    // Wait for animations to complete
    await page.waitForTimeout(100);
    
    // Get the element for this section
    const element = page.locator(section.selector).first();
    
    // Check if element exists and is visible
    const count = await element.count();
    if (count === 0) {
      console.warn(`Section element not found: ${section.selector}`);
      return '';
    }
    
    // Capture screenshot of the specific section
    const screenshotBuffer = await element.screenshot({
      type: 'png',
      timeout: 5000,
    });
    
    return screenshotBuffer.toString('base64');
  } catch (error) {
    console.warn(`Failed to capture screenshot for section ${section.selector}: ${error}`);
    return '';
  }
}
```

## 🚀 Usage

### Automatic Operation

Section screenshots are captured automatically during the crawl process:

```bash
qa-automation run \
  --before-url https://staging.example.com \
  --after-url https://production.example.com \
  --output ./qa-results
```

### Configuration

No additional configuration is needed - section screenshots are enabled by default:

```json
{
  "crawl": {
    "baseUrl": "https://example.com",
    "pages": ["/", "/about", "/contact"],
    "viewport": { "width": 1920, "height": 1080 },
    "timeout": 30000,
    "waitForTimeout": 2000
  }
}
```

## 📊 Example Results

### Section Data Structure

```json
{
  "sections": [
    {
      "id": "section_0",
      "selector": "header",
      "type": "header",
      "content": "<h1>Welcome to Our Site</h1><nav>...</nav>",
      "textContent": "Welcome to Our Site Home About",
      "boundingBox": { "x": 0, "y": 0, "width": 1200, "height": 100 },
      "screenshot": "base64-encoded-screenshot-data"
    },
    {
      "id": "section_1",
      "selector": "main",
      "type": "main",
      "content": "<h2>Main Content</h2><p>...</p>",
      "textContent": "Main Content This is the main content area...",
      "boundingBox": { "x": 0, "y": 100, "width": 1200, "height": 300 },
      "screenshot": "base64-encoded-screenshot-data"
    }
  ]
}
```

### Comparison Results

```
📄 Page Comparison:
   Overall change: 2.5%
   Sections analyzed: 3
   Sections with changes: 1
     - header: content (2.5% change)
       Uses section screenshot: Yes
     - main: none (0.0% change)
       Uses section screenshot: Yes
     - footer: none (0.0% change)
       Uses section screenshot: Yes
```

## 🎯 Benefits

### 1. **Improved Accuracy**
- No cropping errors or artifacts
- Direct pixel-perfect comparison
- Better handling of complex layouts

### 2. **Better Performance**
- No image processing overhead
- Faster comparison operations
- Reduced memory usage

### 3. **Enhanced Reliability**
- Eliminates false positives from cropping
- More consistent results
- Better handling of responsive designs

### 4. **Cleaner Analysis**
- Section-specific visual data
- Independent section comparison
- Better debugging capabilities

## 📁 File Structure

### Screenshot Storage

```
qa-results/
├── before/
│   ├── screenshots/
│   │   └── session-id/
│   │       ├── www_example_com.png          # Full page
│   │       ├── www_example_com_header.png   # Header section
│   │       ├── www_example_com_main.png     # Main section
│   │       └── www_example_com_footer.png   # Footer section
│   └── session-session-id.json
└── after/
    ├── screenshots/
    │   └── session-id/
    │       ├── www_example_com.png
    │       ├── www_example_com_header.png
    │       ├── www_example_com_main.png
    │       └── www_example_com_footer.png
    └── session-session-id.json
```

### Naming Convention

- **Full page**: `{sanitized-url}.png`
- **Section**: `{sanitized-url}_{section-selector}.png`

## 🔍 Technical Details

### Screenshot Capture Process

1. **Element Selection**: Use Playwright's `locator()` to find section elements
2. **Visibility Check**: Ensure element exists and is visible
3. **Screenshot Capture**: Use `element.screenshot()` for precise capture
4. **Error Handling**: Graceful fallback if section not found
5. **Data Storage**: Store base64-encoded screenshot with section data

### Comparison Process

1. **Section Matching**: Match sections by selector and type
2. **Screenshot Retrieval**: Get individual section screenshots
3. **Direct Comparison**: Compare screenshots without cropping
4. **Change Analysis**: Apply intelligent change detection
5. **Result Generation**: Generate comparison results

### Error Handling

- **Missing Sections**: Log warning and continue
- **Screenshot Failures**: Use fallback to full page screenshot
- **Element Not Found**: Skip section with warning
- **Timeout Issues**: Retry with longer timeout

## 🎨 Visual Indicators

The HTML report shows section-specific information:

```html
<div class="section-change-item visual">
  <h6>Visual Changes (content)</h6>
  <ul class="section-change-list">
    <li>2.5% visual change</li>
    <li>Uses section screenshot: Yes</li>
    <li>Section: header</li>
  </ul>
</div>
```

## 🔧 Configuration Options

### Custom Section Selectors

You can customize section detection by modifying the crawler:

```typescript
// Add custom selectors
const customSelectors = [
  '.my-custom-header',
  '.my-custom-content',
  '.my-custom-footer'
];

// Extend the default selectors
this.sectionSelectors = [...this.sectionSelectors, ...customSelectors];
```

### Screenshot Quality

Control screenshot quality and format:

```typescript
const screenshotBuffer = await element.screenshot({
  type: 'png',        // or 'jpeg'
  quality: 90,        // for JPEG
  timeout: 5000,      // timeout in ms
});
```

## 📋 Use Cases

### 1. **Responsive Design Testing**
- Capture sections at different viewport sizes
- Compare section layouts across devices
- Test responsive behavior

### 2. **Component Testing**
- Test individual page components
- Compare component variations
- Validate component changes

### 3. **Layout Validation**
- Ensure consistent section layouts
- Detect layout regressions
- Validate design changes

### 4. **Content Verification**
- Verify content changes in specific sections
- Test content updates
- Validate text changes

## 🚨 Troubleshooting

### Common Issues

1. **Section not found**
   - Check if selector exists in HTML
   - Verify element visibility
   - Review section detection logic

2. **Screenshot failures**
   - Check element visibility
   - Verify page load completion
   - Review timeout settings

3. **Comparison errors**
   - Check screenshot data integrity
   - Verify section matching
   - Review comparison logic

### Debug Tips

1. **Check section detection**
   - Review HTML structure
   - Verify selectors match
   - Check element visibility

2. **Validate screenshots**
   - Check screenshot file sizes
   - Verify base64 encoding
   - Review screenshot quality

3. **Monitor performance**
   - Check screenshot capture times
   - Monitor memory usage
   - Review comparison speed

## 📁 Examples

See the test files for complete examples:
- `test-section-screenshots.js` - Section screenshot tests
- `config-examples/` - Configuration examples

## 🎉 Summary

Section-by-section screenshots provide:

- ✅ **True section comparison** without cropping
- ✅ **Improved accuracy** and reliability
- ✅ **Better performance** with direct comparison
- ✅ **Enhanced debugging** with section-specific data
- ✅ **Responsive layout support** for different screen sizes
- ✅ **Cleaner file structure** with organized screenshots

The tool now provides the most accurate and reliable section-by-section UI comparison possible, eliminating the issues with cropping and providing true pixel-perfect comparison for each section.
