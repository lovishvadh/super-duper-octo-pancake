# Cross-Domain Comparison

The QA automation tool now supports comparing websites across different domains, making it perfect for staging vs production comparisons.

## 🌐 What is Cross-Domain Comparison?

Cross-domain comparison allows you to compare pages from different environments (staging, production, development, etc.) by matching them based on their URL paths rather than exact URLs.

### Example Scenarios

- **Staging vs Production**: Compare `https://staging.example.com/` with `https://production.example.com/`
- **Development vs Live**: Compare `https://dev.myapp.com/` with `https://myapp.com/`
- **Test vs Production**: Compare `https://test.company.com/` with `https://www.company.com/`

## 🎯 How It Works

### URL Matching Strategy

The tool extracts the path from each URL and matches pages based on their paths:

```
Staging URL:    https://staging.example.com/about
Production URL: https://production.example.com/about
Matched by:     /about
```

### Path Extraction

The tool extracts the following components from URLs:
- **Pathname**: `/about`, `/products`, `/contact`
- **Query parameters**: `?id=123&type=product`
- **Hash fragments**: `#section1`

## 🚀 Usage

### Basic Cross-Domain Comparison

```bash
qa-automation run \
  --before-url https://staging.example.com \
  --after-url https://production.example.com \
  --output ./qa-results
```

### Step-by-Step Cross-Domain Comparison

```bash
# Step 1: Crawl staging environment
qa-automation crawl \
  --url https://staging.example.com \
  --pages "/,/about,/products,/contact" \
  --output ./staging-crawl

# Step 2: Crawl production environment
qa-automation crawl \
  --url https://production.example.com \
  --pages "/,/about,/products,/contact" \
  --output ./production-crawl

# Step 3: Compare environments
qa-automation compare \
  --before ./staging-crawl \
  --after ./production-crawl \
  --output ./reports
```

## 📋 Configuration Examples

### Staging vs Production

```json
{
  "crawl": {
    "baseUrl": "https://staging.example.com",
    "pages": [
      "/",
      "/about",
      "/products",
      "/contact",
      "/pricing"
    ],
    "viewport": { "width": 1920, "height": 1080 },
    "timeout": 30000,
    "waitForTimeout": 2000,
    "cookieModalHandling": {
      "enabled": true,
      "waitAfterClick": 1000
    }
  }
}
```

### Development vs Live

```json
{
  "crawl": {
    "baseUrl": "https://dev.myapp.com",
    "pages": [
      "/",
      "/dashboard",
      "/profile",
      "/settings"
    ],
    "viewport": { "width": 1920, "height": 1080 },
    "timeout": 45000,
    "waitForTimeout": 3000,
    "cookieModalHandling": {
      "enabled": true,
      "customSelectors": [
        ".dev-cookie-banner .accept",
        ".dev-modal .close"
      ],
      "waitAfterClick": 1500
    }
  }
}
```

## 🎯 Benefits

### 1. **Environment Comparison**
- Compare staging vs production deployments
- Identify differences between environments
- Ensure consistency across deployments

### 2. **Deployment Validation**
- Verify that production matches staging
- Catch deployment issues early
- Validate feature releases

### 3. **Cross-Environment Testing**
- Test across different environments
- Compare development vs production
- Validate staging accuracy

### 4. **Automated QA**
- No manual comparison needed
- Automated cross-environment testing
- Consistent comparison methodology

## 🔧 Technical Details

### URL Path Extraction

The tool uses the following logic to extract paths:

```typescript
private extractPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search + urlObj.hash;
  } catch (error) {
    // Fallback for malformed URLs
    const match = url.match(/https?:\/\/[^\/]+(\/.*)?/);
    return match ? (match[1] || '/') : url;
  }
}
```

### Page Matching

Pages are matched using the following strategy:

1. **Extract path** from both before and after URLs
2. **Match by path** (not full URL)
3. **Compare content** and visual differences
4. **Generate report** with cross-domain information

### Example Matching

```
Before URLs:                    After URLs:                     Matched By:
https://staging.com/           https://production.com/         /
https://staging.com/about      https://production.com/about    /about
https://staging.com/products   https://production.com/products /products
```

## 📊 Report Output

The generated reports show:

- **Cross-domain comparison** information
- **Path-based matching** details
- **Content differences** between environments
- **Visual differences** in screenshots
- **Section-by-section analysis** across domains

### Report Example

```
📄 Page Comparison:
   Staging: https://staging.example.com/about
   Production: https://production.example.com/about
   Overall change: 2.5%
   Sections analyzed: 4
   Sections with changes: 1
     - header: Content modified
     - main: No changes
     - sidebar: No changes
     - footer: No changes
```

## 🚨 Common Scenarios

### 1. **Different Page Structures**

If staging and production have different page structures, the tool will:
- Match pages by path
- Report missing pages as "removed" or "added"
- Compare only matching pages

### 2. **Environment-Specific Content**

If environments have different content (e.g., staging banners, dev notices):
- The tool will detect these differences
- Report them as content changes
- Allow you to configure environment-specific handling

### 3. **Different Domains with Same Content**

If the content is identical but domains differ:
- The tool will show 0% changes
- Confirm successful deployment
- Validate environment consistency

## 🎯 Best Practices

### 1. **Consistent Page Structure**
- Ensure staging and production have the same page paths
- Use consistent URL structures across environments
- Avoid environment-specific URL variations

### 2. **Environment Configuration**
- Configure appropriate timeouts for each environment
- Set up environment-specific cookie modal handling
- Use environment-appropriate waiting strategies

### 3. **Page Selection**
- Crawl the same pages across environments
- Include critical user journeys
- Test both static and dynamic content

### 4. **Deployment Timing**
- Run comparisons after deployment completion
- Use deployment wait strategies
- Ensure environments are stable before comparison

## 🔍 Troubleshooting

### Common Issues

1. **Pages not matching**
   - Check that page paths are identical
   - Verify URL structures are consistent
   - Ensure pages exist in both environments

2. **Different content expected**
   - Configure environment-specific handling
   - Use custom selectors for environment differences
   - Adjust comparison thresholds

3. **Timeout issues**
   - Increase timeout values for slower environments
   - Use environment-specific configurations
   - Check network connectivity

### Debug Tips

1. **Check URL paths**
   - Verify path extraction is working correctly
   - Ensure pages are being matched properly
   - Review comparison logic

2. **Environment differences**
   - Identify environment-specific content
   - Configure appropriate handling
   - Use custom selectors if needed

3. **Performance optimization**
   - Use appropriate timeouts
   - Configure efficient waiting strategies
   - Optimize page selection

## 📁 Examples

See the test files for complete examples:
- `test-cross-domain-comparison.js` - Cross-domain comparison tests
- `config-examples/` - Configuration examples for different scenarios

## 🎉 Summary

Cross-domain comparison enables you to:

- ✅ Compare staging vs production environments
- ✅ Validate deployments across domains
- ✅ Automate cross-environment testing
- ✅ Ensure consistency between environments
- ✅ Detect environment-specific issues
- ✅ Streamline QA processes

The tool automatically handles the complexity of cross-domain comparison, making it easy to validate that your staging environment accurately reflects production.
