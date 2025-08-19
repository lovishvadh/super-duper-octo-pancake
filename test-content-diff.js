const { ComparisonEngine } = require('./dist/comparison/ComparisonEngine');

async function testContentDifference() {
  console.log('🔍 Testing Content Difference Analysis...\n');

  // Create a comparison engine
  const comparisonEngine = new ComparisonEngine({
    threshold: 0.1,
    ignoreAntialiasing: true,
    ignoreColors: false
  });

  // Test HTML content with different sections
  const beforeHtml = `
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
          <p>This is the original content that will be changed.</p>
          <p>This paragraph will be removed.</p>
        </main>
        <footer>
          <p>Copyright 2023</p>
        </footer>
      </body>
    </html>
  `;

  const afterHtml = `
    <html>
      <head><title>Test Page</title></head>
      <body>
        <header>
          <h1>Welcome to Our Updated Site</h1>
          <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </nav>
        </header>
        <main>
          <h2>Main Content</h2>
          <p>This is the updated content that has been changed.</p>
          <p>This is a new paragraph that was added.</p>
        </main>
        <footer>
          <p>Copyright 2024</p>
        </footer>
      </body>
    </html>
  `;

  // Create mock crawl results
  const beforeResult = {
    url: 'https://example.com',
    screenshot: 'base64-screenshot-data',
    content: beforeHtml,
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
        content: '<h2>Main Content</h2><p>This is the original content that will be changed.</p><p>This paragraph will be removed.</p>',
        textContent: 'Main Content This is the original content that will be changed. This paragraph will be removed.',
        boundingBox: { x: 0, y: 100, width: 1200, height: 200 }
      },
      {
        id: 'section_2',
        selector: 'footer',
        type: 'footer',
        content: '<p>Copyright 2023</p>',
        textContent: 'Copyright 2023',
        boundingBox: { x: 0, y: 300, width: 1200, height: 50 }
      }
    ],
    metadata: {
      title: 'Test Page',
      timestamp: new Date().toISOString(),
      loadTime: 1000,
      statusCode: 200
    }
  };

  const afterResult = {
    url: 'https://example.com',
    screenshot: 'base64-screenshot-data',
    content: afterHtml,
    sections: [
      {
        id: 'section_0',
        selector: 'header',
        type: 'header',
        content: '<h1>Welcome to Our Updated Site</h1><nav><a href="/">Home</a><a href="/about">About</a><a href="/contact">Contact</a></nav>',
        textContent: 'Welcome to Our Updated Site Home About Contact',
        boundingBox: { x: 0, y: 0, width: 1200, height: 100 }
      },
      {
        id: 'section_1',
        selector: 'main',
        type: 'main',
        content: '<h2>Main Content</h2><p>This is the updated content that has been changed.</p><p>This is a new paragraph that was added.</p>',
        textContent: 'Main Content This is the updated content that has been changed. This is a new paragraph that was added.',
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
      timestamp: new Date().toISOString(),
      loadTime: 1000,
      statusCode: 200
    }
  };

  try {
    // Compare the results
    const comparisons = await comparisonEngine.compareResults([beforeResult], [afterResult]);
    
    console.log('✅ Content comparison completed!\n');
    
    // Display the results
    comparisons.forEach((comparison, index) => {
      console.log(`📄 Page ${index + 1}: ${comparison.url}`);
      console.log(`   Overall change: ${comparison.percentageChange.toFixed(2)}%`);
      console.log(`   Sections analyzed: ${comparison.sectionComparisons.length}\n`);
      
      // Overall content changes
      console.log('📝 Overall Content Changes:');
      if (comparison.contentChanges.added.length > 0) {
        console.log(`   ➕ Added (${comparison.contentChanges.added.length}):`);
        comparison.contentChanges.added.forEach(item => console.log(`      - ${item}`));
      }
      if (comparison.contentChanges.removed.length > 0) {
        console.log(`   ➖ Removed (${comparison.contentChanges.removed.length}):`);
        comparison.contentChanges.removed.forEach(item => console.log(`      - ${item}`));
      }
      if (comparison.contentChanges.modified.length > 0) {
        console.log(`   🔄 Modified (${comparison.contentChanges.modified.length}):`);
        comparison.contentChanges.modified.forEach(item => console.log(`      - ${item}`));
      }
      console.log('');
      
      // Section-by-section analysis
      console.log('🎯 Section-by-Section Analysis:');
      comparison.sectionComparisons.forEach((section, sectionIndex) => {
        console.log(`\n   Section ${sectionIndex + 1}: ${section.sectionType} (${section.selector})`);
        console.log(`   ID: ${section.sectionId}`);
        
        if (section.hasChanges) {
          console.log(`   🔍 Changes detected:`);
          
          if (section.contentChanges.added.length > 0) {
            console.log(`      ➕ Content Added (${section.contentChanges.added.length}):`);
            section.contentChanges.added.forEach(item => console.log(`         - ${item}`));
          }
          
          if (section.contentChanges.removed.length > 0) {
            console.log(`      ➖ Content Removed (${section.contentChanges.removed.length}):`);
            section.contentChanges.removed.forEach(item => console.log(`         - ${item}`));
          }
          
          if (section.contentChanges.modified.length > 0) {
            console.log(`      🔄 Content Modified (${section.contentChanges.modified.length}):`);
            section.contentChanges.modified.forEach(item => console.log(`         - ${item}`));
          }
          
          if (section.visualChanges.percentageChange > 0) {
            console.log(`      🎨 Visual Changes: ${section.visualChanges.percentageChange}% change, ${section.visualChanges.pixelDifference} pixels different`);
          }
        } else {
          console.log(`   ✅ No changes detected`);
        }
      });
    });

    console.log('\n🎉 Content difference analysis test completed successfully!');
    console.log('\n📊 Summary of what the tool analyzes:');
    console.log('   • Text content additions, removals, and modifications');
    console.log('   • Section-by-section breakdown of changes');
    console.log('   • Visual changes (pixel differences)');
    console.log('   • Content similarity detection using Levenshtein distance');
    console.log('   • HTML structure analysis with Cheerio');
    console.log('   • Detailed reporting in HTML format');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testContentDifference();
