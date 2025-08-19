# Cookie Modal Handling

The QA automation tool now includes comprehensive automatic handling of cookie consent modals, popups, and other overlays that could interfere with page analysis.

## 🍪 Why Cookie Modal Handling?

Cookie consent modals are very common on modern websites, especially those serving European users (GDPR compliance). These modals can:

- **Block content**: Cover important page elements
- **Interfere with analysis**: Prevent accurate section detection
- **Cause false positives**: Make pages appear different when they're actually the same
- **Slow down testing**: Require manual intervention

## 🚀 Automatic Handling Features

The tool automatically handles cookie modals using multiple strategies:

### 1. **Comprehensive Selector Detection**
The tool tries **80+ common selectors** for cookie modals:

#### Accept Buttons
```css
[data-testid="accept-cookies"]
[data-testid="accept-all-cookies"]
[data-testid="cookie-accept"]
[data-testid="gdpr-accept"]
[data-testid="consent-accept"]
.cookie-accept
.gdpr-accept
.consent-accept
#accept-cookies
#cookie-accept
```

#### Text-Based Detection
```css
button:has-text("Accept")
button:has-text("Accept All")
button:has-text("Accept Cookies")
button:has-text("I Accept")
button:has-text("I Agree")
button:has-text("OK")
button:has-text("Got it")
```

#### Close Buttons
```css
[data-testid="close-modal"]
[data-testid="modal-close"]
.close-modal
.modal-close
button:has-text("×")
button:has-text("Close")
```

### 2. **Multiple Dismissal Strategies**
If clicking buttons doesn't work, the tool tries:

- **Overlay/backdrop clicks**: Clicking modal backgrounds
- **ESC key**: Pressing Escape to close modals
- **Custom selectors**: User-defined selectors from configuration

### 3. **Timing Control**
- **Configurable wait times**: After clicking modals
- **Multiple attempts**: Tries at different stages of page load
- **Graceful fallback**: Continues if modal handling fails

## ⚙️ Configuration

### Basic Configuration
```json
{
  "crawl": {
    "baseUrl": "https://example.com",
    "pages": ["/", "/about"],
    "cookieModalHandling": {
      "enabled": true,
      "waitAfterClick": 1000
    }
  }
}
```

### Advanced Configuration
```json
{
  "crawl": {
    "baseUrl": "https://example.com",
    "pages": ["/", "/about"],
    "cookieModalHandling": {
      "enabled": true,
      "customSelectors": [
        ".my-custom-cookie-button",
        "#my-cookie-accept",
        "button[aria-label='Accept cookies']",
        ".cookie-consent .btn-primary"
      ],
      "waitAfterClick": 1500
    }
  }
}
```

### Disable Cookie Handling
```json
{
  "crawl": {
    "baseUrl": "https://example.com",
    "pages": ["/", "/about"],
    "cookieModalHandling": {
      "enabled": false
    }
  }
}
```

## 🎯 Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable cookie modal handling |
| `customSelectors` | string[] | `[]` | Array of custom CSS selectors to try |
| `waitAfterClick` | number | `1000` | Milliseconds to wait after clicking |

## 📋 Common Use Cases

### 1. **European GDPR Sites**
```json
{
  "cookieModalHandling": {
    "enabled": true,
    "customSelectors": [
      ".gdpr-accept-all",
      ".cookie-accept-all",
      "[data-gdpr-accept='all']",
      "button:has-text('Accept All Cookies')",
      "button:has-text('I Accept All')"
    ],
    "waitAfterClick": 2000
  }
}
```

### 2. **News Sites with Multiple Popups**
```json
{
  "cookieModalHandling": {
    "enabled": true,
    "customSelectors": [
      ".newsletter-popup .close",
      ".ad-popup .dismiss",
      ".cookie-banner .accept",
      ".subscription-modal .close",
      "button:has-text('No thanks')",
      "button:has-text('Skip')"
    ],
    "waitAfterClick": 1500
  }
}
```

### 3. **E-commerce Sites**
```json
{
  "cookieModalHandling": {
    "enabled": true,
    "customSelectors": [
      ".promo-popup .close",
      ".discount-modal .dismiss",
      ".newsletter-signup .skip",
      ".cookie-consent .accept",
      "button:has-text('Continue shopping')",
      "button:has-text('Not now')"
    ],
    "waitAfterClick": 2000
  }
}
```

### 4. **Single Page Applications**
```json
{
  "cookieModalHandling": {
    "enabled": true,
    "customSelectors": [
      "[data-testid='cookie-accept']",
      "[data-testid='modal-close']",
      "[data-testid='popup-dismiss']",
      ".dynamic-modal .close",
      "button[data-cy='accept-cookies']"
    ],
    "waitAfterClick": 1500
  }
}
```

## 🔧 How It Works

### 1. **Page Load Process**
```
1. Navigate to page
2. Wait for DOM content loaded
3. Handle cookie modals (first attempt)
4. Wait for network idle
5. Handle cookie modals (second attempt)
6. Wait for animations to complete
7. Wait for images to load
8. Capture screenshot and content
```

### 2. **Modal Detection Process**
```
1. Try custom selectors first (if configured)
2. Try common accept button selectors
3. Try close button selectors
4. Try overlay/backdrop clicks
5. Try ESC key
6. Wait specified time after click
7. Continue with page analysis
```

### 3. **Fallback Strategy**
- If modal handling fails, the tool continues anyway
- Logs warnings but doesn't stop the process
- Ensures robust operation even with problematic modals

## 🎯 Best Practices

### 1. **For Custom Websites**
- Inspect the cookie modal HTML
- Add specific selectors to `customSelectors`
- Test with different selectors if needed

### 2. **For Slow Modals**
- Increase `waitAfterClick` time
- Consider adding multiple wait stages
- Test with different timing values

### 3. **For Complex Modals**
- Add multiple selector strategies
- Include both button and backdrop selectors
- Consider modal-specific configurations

### 4. **For Testing**
- Disable cookie handling if you want to capture modals
- Use custom selectors for specific modal types
- Monitor console logs for modal detection

## 🚨 Troubleshooting

### Common Issues

1. **Modal not being detected**
   - Check if selector is correct
   - Add custom selectors to configuration
   - Verify modal is visible when tool runs

2. **Modal reappears after dismissal**
   - Increase `waitAfterClick` time
   - Add multiple dismissal attempts
   - Check for dynamic modal loading

3. **False positives from modals**
   - Ensure cookie handling is enabled
   - Add specific selectors for your modal
   - Test with different timing configurations

### Debug Tips

1. **Enable verbose logging**
   - Check console output for modal detection
   - Look for "🍪 Found cookie modal" messages
   - Monitor timing and selector attempts

2. **Test selectors manually**
   - Use browser dev tools to test selectors
   - Verify selectors work in your browser
   - Check for timing issues

3. **Configuration validation**
   - Ensure JSON syntax is correct
   - Verify selector syntax is valid
   - Test with minimal configuration first

## 📁 Examples

See `config-examples/cookie-modal-examples.json` for complete configuration examples for different types of websites.

## 🎉 Benefits

- **Automatic operation**: No manual intervention needed
- **Comprehensive coverage**: Handles most common modal types
- **Configurable**: Adaptable to specific websites
- **Robust**: Continues even if modal handling fails
- **Fast**: Minimal impact on crawling speed
- **Reliable**: Reduces false positives in comparisons

The cookie modal handling ensures your QA automation runs smoothly on modern websites with consent popups, providing accurate and reliable comparison results.
