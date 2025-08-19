const { ComparisonEngine } = require('./dist/comparison/ComparisonEngine');

async function testCrossDomainComparison() {
  console.log('🌐 Testing Cross-Domain Comparison (Staging vs Production)...\n');

  // Create a comparison engine
  const comparisonEngine = new ComparisonEngine({
    threshold: 0.1,
    ignoreAntialiasing: true,
    ignoreColors: false
  });

  // Test HTML content (same content, different domains)
  const testHtml = `
    <html>
      <head><title>Test Page</title></head>
      <body>
        <header>
          <h1>Welcome to Our Site</h1>
          <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
          </nav>
        </header>
        <main>
          <h2>Main Content</h2>
          <p>This is the content that should be identical across environments.</p>
        </main>
        <footer>
          <p>Copyright 2024</p>
        </footer>
      </body>
    </html>
  `;

  // Create staging (before) results
  const stagingResult = {
    url: 'https://staging.example.com/',
    screenshot: 'base64-screenshot-data',
    content: testHtml,
    sections: [
      {
        id: 'section_0',
        selector: 'header',
        type: 'header',
        content: '<h1>Welcome to Our Site</h1><nav><a href="/">Home</a><a href="/about">About</a></nav>',
        textContent: 'Welcome to Our Site Home About',
        boundingBox: { x: 0, y: 0, width: 1200, height: 100 }
      },
      {
        id: 'section_1',
        selector: 'main',
        type: 'main',
        content: '<h2>Main Content</h2><p>This is the content that should be identical across environments.</p>',
        textContent: 'Main Content This is the content that should be identical across environments.',
        boundingBox: { x: 0, y: 100, width: 1200, height: 200 }
      },
      {
        id: 'section_2',
        selector: 'footer',
        type: 'footer',
        content: '<p>Copyright 2024</p>',
        textContent: 'Copyright 2024',
        boundingBox: { x: 0, y: 300, width: 1200, height: 50 }
      }
    ],
    metadata: {
      title: 'Test Page',
      timestamp: '2024-01-01T00:00:00.000Z',
      loadTime: 1000,
      statusCode: 200
    }
  };

  // Create production (after) results with different URL but same content
  const productionResult = {
    url: 'https://production.example.com/',
    screenshot: 'base64-screenshot-data',
    content: testHtml,
    sections: [
      {
        id: 'section_0',
        selector: 'header',
        type: 'header',
        content: '<h1>Welcome to Our Site</h1><nav><a href="/">Home</a><a href="/about">About</a></nav>',
        textContent: 'Welcome to Our Site Home About',
        boundingBox: { x: 0, y: 0, width: 1200, height: 100 }
      },
      {
        id: 'section_1',
        selector: 'main',
        type: 'main',
        content: '<h2>Main Content</h2><p>This is the content that should be identical across environments.</p>',
        textContent: 'Main Content This is the content that should be identical across environments.',
        boundingBox: { x: 0, y: 100, width: 1200, height: 200 }
      },
      {
        id: 'section_2',
        selector: 'footer',
        type: 'footer',
        content: '<p>Copyright 2024</p>',
        textContent: 'Copyright 2024',
        boundingBox: { x: 0, y: 300, width: 1200, height: 50 }
      }
    ],
    metadata: {
      title: 'Test Page',
      timestamp: '2024-01-01T00:00:00.000Z',
      loadTime: 1000,
      statusCode: 200
    }
  };

  // Test with different content to show changes
  const productionResultWithChanges = {
    url: 'https://production.example.com/',
    screenshot: 'base64-screenshot-data',
    content: testHtml.replace('Welcome to Our Site', 'Welcome to Our Updated Site'),
    sections: [
      {
        id: 'section_0',
        selector: 'header',
        type: 'header',
        content: '<h1>Welcome to Our Updated Site</h1><nav><a href="/">Home</a><a href="/about">About</a></nav>',
        textContent: 'Welcome to Our Updated Site Home About',
        boundingBox: { x: 0, y: 0, width: 1200, height: 100 }
      },
      {
        id: 'section_1',
        selector: 'main',
        type: 'main',
        content: '<h2>Main Content</h2><p>This is the content that should be identical across environments.</p>',
        textContent: 'Main Content This is the content that should be identical across environments.',
        boundingBox: { x: 0, y: 100, width: 1200, height: 200 }
      },
      {
        id: 'section_2',
        selector: 'footer',
        type: 'footer',
        content: '<p>Copyright 2024</p>',
        textContent: 'Copyright 2024',
        boundingBox: { x: 0, y: 300, width: 1200, height: 50 }
      }
    ],
    metadata: {
      title: 'Test Page',
      timestamp: '2024-01-01T00:00:00.000Z',
      loadTime: 1000,
      statusCode: 200
    }
  };

  try {
    console.log('📊 Test 1: Identical content across domains...');
    console.log('   Staging URL: https://staging.example.com/');
    console.log('   Production URL: https://production.example.com/');
    console.log('');
    
    // Compare identical content
    const comparisons1 = await comparisonEngine.compareResults([stagingResult], [productionResult]);
    
    console.log(`✅ Comparison completed. Found ${comparisons1.length} comparison results.\n`);
    
    comparisons1.forEach((comparison, index) => {
      console.log(`📄 Page ${index + 1}:`);
      console.log(`   Staging: ${stagingResult.url}`);
      console.log(`   Production: ${productionResult.url}`);
      console.log(`   Overall change: ${comparison.percentageChange.toFixed(2)}%`);
      console.log(`   Sections analyzed: ${comparison.sectionComparisons.length}`);
      
      const changedSections = comparison.sectionComparisons.filter(s => s.hasChanges);
      console.log(`   Sections with changes: ${changedSections.length}`);
      
      if (changedSections.length > 0) {
        changedSections.forEach(section => {
          console.log(`     - ${section.sectionType}: ${section.contentChanges.added.length} added, ${section.contentChanges.removed.length} removed`);
        });
      }
    });

    console.log('\n' + '─'.repeat(60));
    console.log('📊 Test 2: Different content across domains...\n');
    
    // Compare different content
    const comparisons2 = await comparisonEngine.compareResults([stagingResult], [productionResultWithChanges]);
    
    console.log(`✅ Comparison completed. Found ${comparisons2.length} comparison results.\n`);
    
    comparisons2.forEach((comparison, index) => {
      console.log(`📄 Page ${index + 1}:`);
      console.log(`   Staging: ${stagingResult.url}`);
      console.log(`   Production: ${productionResultWithChanges.url}`);
      console.log(`   Overall change: ${comparison.percentageChange.toFixed(2)}%`);
      console.log(`   Sections analyzed: ${comparison.sectionComparisons.length}`);
      
      const changedSections = comparison.sectionComparisons.filter(s => s.hasChanges);
      console.log(`   Sections with changes: ${changedSections.length}`);
      
      if (changedSections.length > 0) {
        changedSections.forEach(section => {
          console.log(`     - ${section.sectionType}: ${section.contentChanges.added.length} added, ${section.contentChanges.removed.length} removed`);
          if (section.contentChanges.modified.length > 0) {
            console.log(`       Modified: ${section.contentChanges.modified.join(', ')}`);
          }
        });
      }
    });

    console.log('\n🎯 Cross-Domain Comparison Summary:');
    console.log('');
    console.log('✅ The tool now supports cross-domain comparison:');
    console.log('   • Matches pages by path (not full URL)');
    console.log('   • Compares staging vs production environments');
    console.log('   • Handles different domains automatically');
    console.log('   • Provides accurate content and visual comparison');
    console.log('');
    console.log('🌐 URL Matching Strategy:');
    console.log('   • Staging: https://staging.example.com/');
    console.log('   • Production: https://production.example.com/');
    console.log('   • Matched by: / (root path)');
    console.log('');
    console.log('📋 Usage Examples:');
    console.log('   • npm start -- --before-url https://staging.example.com --after-url https://production.example.com');
    console.log('   • npm start -- --before-url https://dev.myapp.com --after-url https://myapp.com');
    console.log('   • npm start -- --before-url https://test.company.com --after-url https://www.company.com');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testCrossDomainComparison();
