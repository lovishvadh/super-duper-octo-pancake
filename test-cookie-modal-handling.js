const { WebCrawler } = require('./dist/crawler/WebCrawler');

async function testCookieModalHandling() {
  console.log('🍪 Testing Cookie Modal Handling...\n');

  // Test configurations for different scenarios
  const testConfigs = [
    {
      name: 'Default Cookie Handling',
      config: {
        baseUrl: 'https://httpbin.org',
        pages: ['/'],
        viewport: { width: 1920, height: 1080 },
        timeout: 30000,
        waitForTimeout: 2000,
        cookieModalHandling: {
          enabled: true,
          waitAfterClick: 1000
        }
      }
    },
    {
      name: 'Custom Cookie Selectors',
      config: {
        baseUrl: 'https://httpbin.org',
        pages: ['/'],
        viewport: { width: 1920, height: 1080 },
        timeout: 30000,
        waitForTimeout: 2000,
        cookieModalHandling: {
          enabled: true,
          customSelectors: [
            '.my-custom-cookie-button',
            '#my-cookie-accept',
            'button[aria-label="Accept cookies"]',
            '.cookie-consent .btn-primary'
          ],
          waitAfterClick: 1500
        }
      }
    },
    {
      name: 'Disabled Cookie Handling',
      config: {
        baseUrl: 'https://httpbin.org',
        pages: ['/'],
        viewport: { width: 1920, height: 1080 },
        timeout: 30000,
        waitForTimeout: 2000,
        cookieModalHandling: {
          enabled: false
        }
      }
    },
    {
      name: 'European GDPR Site',
      config: {
        baseUrl: 'https://httpbin.org',
        pages: ['/'],
        viewport: { width: 1920, height: 1080 },
        timeout: 45000,
        waitForTimeout: 3000,
        cookieModalHandling: {
          enabled: true,
          customSelectors: [
            '.gdpr-accept-all',
            '.cookie-accept-all',
            '[data-gdpr-accept="all"]',
            'button:has-text("Accept All Cookies")',
            'button:has-text("I Accept All")',
            '.cookie-banner .accept-all'
          ],
          waitAfterClick: 2000
        }
      }
    }
  ];

  for (const testConfig of testConfigs) {
    console.log(`🔍 Testing: ${testConfig.name}`);
    console.log(`   URL: ${testConfig.config.baseUrl}${testConfig.config.pages[0]}`);
    console.log(`   Cookie handling: ${testConfig.config.cookieModalHandling?.enabled ? 'Enabled' : 'Disabled'}`);
    if (testConfig.config.cookieModalHandling?.customSelectors) {
      console.log(`   Custom selectors: ${testConfig.config.cookieModalHandling.customSelectors.length}`);
    }
    console.log('');

    try {
      const startTime = Date.now();
      
      // Initialize crawler
      const crawler = new WebCrawler(testConfig.config);
      await crawler.initialize();
      
      // Crawl the page
      const session = await crawler.crawl();
      await crawler.cleanup();
      
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ Success!`);
      console.log(`   Total time: ${totalTime}ms`);
      console.log(`   Pages crawled: ${session.results.length}`);
      
      if (session.results.length > 0) {
        const result = session.results[0];
        console.log(`   Page load time: ${result.metadata.loadTime}ms`);
        console.log(`   Status code: ${result.metadata.statusCode}`);
        console.log(`   Sections found: ${result.sections.length}`);
        console.log(`   Title: ${result.metadata.title}`);
        
        if (result.metadata.errors && result.metadata.errors.length > 0) {
          console.log(`   ⚠️  Warnings: ${result.metadata.errors.join(', ')}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
    
    console.log('─'.repeat(60));
    console.log('');
  }

  console.log('📊 Cookie Modal Handling Summary:');
  console.log('');
  console.log('🍪 The tool automatically handles cookie modals and popups:');
  console.log('   1. Common cookie accept buttons (Accept, Accept All, etc.)');
  console.log('   2. GDPR compliance buttons');
  console.log('   3. Modal close buttons (×, Close, etc.)');
  console.log('   4. Overlay/backdrop clicks');
  console.log('   5. ESC key for modals');
  console.log('   6. Custom selectors from configuration');
  console.log('');
  console.log('⚙️  Configuration Options:');
  console.log('   • enabled: Enable/disable cookie modal handling (default: true)');
  console.log('   • customSelectors: Array of custom CSS selectors to try');
  console.log('   • waitAfterClick: Time to wait after clicking (default: 1000ms)');
  console.log('');
  console.log('🎯 Common Cookie Modal Patterns Handled:');
  console.log('   • data-testid selectors (data-testid="accept-cookies")');
  console.log('   • Class-based selectors (.cookie-accept, .gdpr-accept)');
  console.log('   • ID-based selectors (#accept-cookies, #cookie-accept)');
  console.log('   • Text-based selectors (button:has-text("Accept"))');
  console.log('   • Close buttons (button:has-text("×"), .close-modal)');
  console.log('');
  console.log('📁 See config-examples/cookie-modal-examples.json for more examples');
  console.log('');
  console.log('💡 Tips:');
  console.log('   • For custom websites, add specific selectors to customSelectors');
  console.log('   • Increase waitAfterClick for slow-dismissing modals');
  console.log('   • Disable if you want to capture modals in screenshots');
  console.log('   • The tool tries multiple strategies to ensure modals are dismissed');
}

// Run the test
testCookieModalHandling();
