const { WebCrawler } = require('./dist/crawler/WebCrawler');

async function testWaitingMechanisms() {
  console.log('⏱️ Testing Enhanced Waiting Mechanisms...\n');

  // Test configurations for different website types
  const testConfigs = [
    {
      name: 'Fast Website',
      config: {
        baseUrl: 'https://httpbin.org',
        pages: ['/'],
        viewport: { width: 1920, height: 1080 },
        timeout: 15000,
        waitForTimeout: 1000,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    },
    {
      name: 'Slow Website (Simulated)',
      config: {
        baseUrl: 'https://httpbin.org',
        pages: ['/delay/3'], // This endpoint has a 3-second delay
        viewport: { width: 1920, height: 1080 },
        timeout: 30000,
        waitForTimeout: 2000,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    },
    {
      name: 'Website with Custom Selector',
      config: {
        baseUrl: 'https://httpbin.org',
        pages: ['/'],
        viewport: { width: 1920, height: 1080 },
        timeout: 20000,
        waitForTimeout: 1000,
        waitForSelector: 'body', // Wait for body element
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }
  ];

  for (const testConfig of testConfigs) {
    console.log(`🔍 Testing: ${testConfig.name}`);
    console.log(`   URL: ${testConfig.config.baseUrl}${testConfig.config.pages[0]}`);
    console.log(`   Timeout: ${testConfig.config.timeout}ms`);
    console.log(`   Wait Timeout: ${testConfig.config.waitForTimeout}ms`);
    if (testConfig.config.waitForSelector) {
      console.log(`   Wait Selector: ${testConfig.config.waitForSelector}`);
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

  console.log('📊 Waiting Mechanism Summary:');
  console.log('');
  console.log('🔄 The tool implements multiple waiting strategies:');
  console.log('   1. Network Idle: Waits until no network requests for 500ms');
  console.log('   2. DOM Ready: Waits for DOM content to be loaded');
  console.log('   3. Custom Selector: Waits for specific CSS selector to appear');
  console.log('   4. Additional Timeout: Configurable extra wait time');
  console.log('   5. Animation Completion: Waits for CSS animations to finish');
  console.log('   6. Image Loading: Waits for lazy-loaded images to load');
  console.log('');
  console.log('⚙️  Configuration Options:');
  console.log('   • timeout: Maximum time to wait for page load (default: 30s)');
  console.log('   • waitForTimeout: Additional wait after page loads (default: 2s)');
  console.log('   • waitForSelector: CSS selector to wait for');
  console.log('   • Enhanced waiting for animations and images');
  console.log('');
  console.log('🎯 Best Practices:');
  console.log('   • Fast websites: 15s timeout, 1s wait');
  console.log('   • Slow websites: 60s timeout, 5s wait + custom selector');
  console.log('   • SPAs: 45s timeout, 3s wait + app-loaded selector');
  console.log('   • E-commerce: 90s timeout, 8s wait + product grid selector');
  console.log('');
  console.log('📁 See config-examples/waiting-strategies.json for more examples');
}

// Run the test
testWaitingMechanisms();
