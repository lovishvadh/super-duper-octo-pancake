const { ComparisonEngine } = require('./dist/comparison/ComparisonEngine');

async function debugComparison() {
  console.log('🔍 Debugging Comparison Issues...\n');

  // Create a comparison engine
  const comparisonEngine = new ComparisonEngine({
    threshold: 0.1,
    ignoreAntialiasing: true,
    ignoreColors: false
  });

  // Create identical test data to see if comparison works
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
          <p>This is the content that should be identical.</p>
        </main>
        <footer>
          <p>Copyright 2024</p>
        </footer>
      </body>
    </html>
  `;

  // Create identical before and after results
  const beforeResult = {
    url: 'https://example.com',
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
        content: '<h2>Main Content</h2><p>This is the content that should be identical.</p>',
        textContent: 'Main Content This is the content that should be identical.',
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

  const afterResult = {
    url: 'https://example.com',
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
        content: '<h2>Main Content</h2><p>This is the content that should be identical.</p>',
        textContent: 'Main Content This is the content that should be identical.',
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
    console.log('📊 Testing with identical content...');
    
    // Compare the results
    const comparisons = await comparisonEngine.compareResults([beforeResult], [afterResult]);
    
    console.log(`✅ Comparison completed. Found ${comparisons.length} comparison results.\n`);
    
    // Display the results
    comparisons.forEach((comparison, index) => {
      console.log(`📄 Page ${index + 1}: ${comparison.url}`);
      console.log(`   Overall change: ${comparison.percentageChange.toFixed(2)}%`);
      console.log(`   Pixel difference: ${comparison.pixelDifference}`);
      console.log(`   Sections analyzed: ${comparison.sectionComparisons.length}`);
      
      // Overall content changes
      console.log('📝 Overall Content Changes:');
      console.log(`   Added: ${comparison.contentChanges.added.length}`);
      console.log(`   Removed: ${comparison.contentChanges.removed.length}`);
      console.log(`   Modified: ${comparison.contentChanges.modified.length}`);
      
      if (comparison.contentChanges.added.length > 0) {
        console.log(`   ➕ Added: ${comparison.contentChanges.added.join(', ')}`);
      }
      if (comparison.contentChanges.removed.length > 0) {
        console.log(`   ➖ Removed: ${comparison.contentChanges.removed.join(', ')}`);
      }
      if (comparison.contentChanges.modified.length > 0) {
        console.log(`   🔄 Modified: ${comparison.contentChanges.modified.join(', ')}`);
      }
      
      // Section-by-section analysis
      console.log('\n🎯 Section-by-Section Analysis:');
      comparison.sectionComparisons.forEach((section, sectionIndex) => {
        console.log(`\n   Section ${sectionIndex + 1}: ${section.sectionType} (${section.selector})`);
        console.log(`   ID: ${section.sectionId}`);
        console.log(`   Has changes: ${section.hasChanges}`);
        
        if (section.hasChanges) {
          console.log(`   🔍 Changes detected:`);
          console.log(`      Added: ${section.contentChanges.added.length}`);
          console.log(`      Removed: ${section.contentChanges.removed.length}`);
          console.log(`      Modified: ${section.contentChanges.modified.length}`);
          
          if (section.contentChanges.added.length > 0) {
            console.log(`      ➕ Added: ${section.contentChanges.added.join(', ')}`);
          }
          if (section.contentChanges.removed.length > 0) {
            console.log(`      ➖ Removed: ${section.contentChanges.removed.join(', ')}`);
          }
          if (section.contentChanges.modified.length > 0) {
            console.log(`      🔄 Modified: ${section.contentChanges.modified.join(', ')}`);
          }
        } else {
          console.log(`   ✅ No changes detected`);
        }
      });
    });

    console.log('\n🔍 Debug Information:');
    console.log('   • Before sections count:', beforeResult.sections.length);
    console.log('   • After sections count:', afterResult.sections.length);
    console.log('   • Before content length:', beforeResult.content.length);
    console.log('   • After content length:', afterResult.content.length);
    console.log('   • Content identical:', beforeResult.content === afterResult.content);

  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

// Run the debug
debugComparison();
