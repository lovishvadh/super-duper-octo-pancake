const { ComparisonEngine } = require('./dist/comparison/ComparisonEngine');

async function testIntelligentUIComparison() {
  console.log('🎨 Testing Intelligent UI Comparison...\n');

  // Create a comparison engine
  const comparisonEngine = new ComparisonEngine({
    threshold: 0.1,
    ignoreAntialiasing: true,
    ignoreColors: false
  });

  // Test HTML content with different scenarios
  const baseHtml = `
    <html>
      <head><title>Test Page</title></head>
      <body>
        <header style="height: 100px;">
          <h1>Welcome to Our Site</h1>
          <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
          </nav>
        </header>
        <main style="height: 300px;">
          <h2>Main Content</h2>
          <p>This is the main content area.</p>
          <div class="feature-box">
            <h3>Feature 1</h3>
            <p>This is a feature description.</p>
          </div>
        </main>
        <footer style="height: 50px;">
          <p>Copyright 2024</p>
        </footer>
      </body>
    </html>
  `;

  // Scenario 1: Content changes only (same layout)
  const contentChangedHtml = baseHtml.replace(
    'Welcome to Our Site',
    'Welcome to Our Updated Site'
  );

  // Scenario 2: Layout changes only (same content)
  const layoutChangedHtml = baseHtml.replace(
    'style="height: 100px;"',
    'style="height: 120px;"'
  ).replace(
    'style="height: 300px;"',
    'style="height: 280px;"'
  );

  // Scenario 3: Both content and layout changes
  const bothChangedHtml = contentChangedHtml.replace(
    'style="height: 100px;"',
    'style="height: 120px;"'
  ).replace(
    'Feature 1',
    'Enhanced Feature 1'
  );

  // Create test results
  const baseResult = {
    url: 'https://example.com/',
    screenshot: 'base64-screenshot-data',
    content: baseHtml,
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
        content: '<h2>Main Content</h2><p>This is the main content area.</p><div class="feature-box"><h3>Feature 1</h3><p>This is a feature description.</p></div>',
        textContent: 'Main Content This is the main content area. Feature 1 This is a feature description.',
        boundingBox: { x: 0, y: 100, width: 1200, height: 300 }
      },
      {
        id: 'section_2',
        selector: 'footer',
        type: 'footer',
        content: '<p>Copyright 2024</p>',
        textContent: 'Copyright 2024',
        boundingBox: { x: 0, y: 400, width: 1200, height: 50 }
      }
    ],
    metadata: {
      title: 'Test Page',
      timestamp: '2024-01-01T00:00:00.000Z',
      loadTime: 1000,
      statusCode: 200
    }
  };

  const contentChangedResult = {
    ...baseResult,
    content: contentChangedHtml,
    sections: [
      {
        ...baseResult.sections[0],
        content: '<h1>Welcome to Our Updated Site</h1><nav><a href="/">Home</a><a href="/about">About</a></nav>',
        textContent: 'Welcome to Our Updated Site Home About'
      },
      ...baseResult.sections.slice(1)
    ]
  };

  const layoutChangedResult = {
    ...baseResult,
    content: layoutChangedHtml,
    sections: [
      {
        ...baseResult.sections[0],
        boundingBox: { x: 0, y: 0, width: 1200, height: 120 }
      },
      {
        ...baseResult.sections[1],
        boundingBox: { x: 0, y: 120, width: 1200, height: 280 }
      },
      {
        ...baseResult.sections[2],
        boundingBox: { x: 0, y: 400, width: 1200, height: 50 }
      }
    ]
  };

  const bothChangedResult = {
    ...baseResult,
    content: bothChangedHtml,
    sections: [
      {
        ...baseResult.sections[0],
        content: '<h1>Welcome to Our Updated Site</h1><nav><a href="/">Home</a><a href="/about">About</a></nav>',
        textContent: 'Welcome to Our Updated Site Home About',
        boundingBox: { x: 0, y: 0, width: 1200, height: 120 }
      },
      {
        ...baseResult.sections[1],
        content: '<h2>Main Content</h2><p>This is the main content area.</p><div class="feature-box"><h3>Enhanced Feature 1</h3><p>This is a feature description.</p></div>',
        textContent: 'Main Content This is the main content area. Enhanced Feature 1 This is a feature description.',
        boundingBox: { x: 0, y: 120, width: 1200, height: 280 }
      },
      {
        ...baseResult.sections[2],
        boundingBox: { x: 0, y: 400, width: 1200, height: 50 }
      }
    ]
  };

  try {
    console.log('📊 Test 1: Content Changes Only...');
    console.log('   Base URL: https://example.com/');
    console.log('   Changed URL: https://example.com/ (content only)');
    console.log('');
    
    const comparisons1 = await comparisonEngine.compareResults([baseResult], [contentChangedResult]);
    
    console.log(`✅ Comparison completed. Found ${comparisons1.length} comparison results.\n`);
    
    comparisons1.forEach((comparison, index) => {
      console.log(`📄 Page ${index + 1}:`);
      console.log(`   Overall change: ${comparison.percentageChange.toFixed(2)}%`);
      console.log(`   Sections analyzed: ${comparison.sectionComparisons.length}`);
      
      const changedSections = comparison.sectionComparisons.filter(s => s.hasChanges);
      console.log(`   Sections with changes: ${changedSections.length}`);
      
      changedSections.forEach(section => {
        console.log(`     - ${section.sectionType}:`);
        console.log(`       Content: ${section.contentChanges.added.length} added, ${section.contentChanges.removed.length} removed, ${section.contentChanges.modified.length} modified`);
        console.log(`       Visual: ${section.visualChanges.changeType} (${section.visualChanges.percentageChange.toFixed(2)}% change)`);
      });
    });

    console.log('\n' + '─'.repeat(60));
    console.log('📊 Test 2: Layout Changes Only...\n');
    
    const comparisons2 = await comparisonEngine.compareResults([baseResult], [layoutChangedResult]);
    
    console.log(`✅ Comparison completed. Found ${comparisons2.length} comparison results.\n`);
    
    comparisons2.forEach((comparison, index) => {
      console.log(`📄 Page ${index + 1}:`);
      console.log(`   Overall change: ${comparison.percentageChange.toFixed(2)}%`);
      console.log(`   Sections analyzed: ${comparison.sectionComparisons.length}`);
      
      const changedSections = comparison.sectionComparisons.filter(s => s.hasChanges);
      console.log(`   Sections with changes: ${changedSections.length}`);
      
      changedSections.forEach(section => {
        console.log(`     - ${section.sectionType}:`);
        console.log(`       Content: ${section.contentChanges.added.length} added, ${section.contentChanges.removed.length} removed, ${section.contentChanges.modified.length} modified`);
        console.log(`       Visual: ${section.visualChanges.changeType} (${section.visualChanges.percentageChange.toFixed(2)}% change)`);
      });
    });

    console.log('\n' + '─'.repeat(60));
    console.log('📊 Test 3: Both Content and Layout Changes...\n');
    
    const comparisons3 = await comparisonEngine.compareResults([baseResult], [bothChangedResult]);
    
    console.log(`✅ Comparison completed. Found ${comparisons3.length} comparison results.\n`);
    
    comparisons3.forEach((comparison, index) => {
      console.log(`📄 Page ${index + 1}:`);
      console.log(`   Overall change: ${comparison.percentageChange.toFixed(2)}%`);
      console.log(`   Sections analyzed: ${comparison.sectionComparisons.length}`);
      
      const changedSections = comparison.sectionComparisons.filter(s => s.hasChanges);
      console.log(`   Sections with changes: ${changedSections.length}`);
      
      changedSections.forEach(section => {
        console.log(`     - ${section.sectionType}:`);
        console.log(`       Content: ${section.contentChanges.added.length} added, ${section.contentChanges.removed.length} removed, ${section.contentChanges.modified.length} modified`);
        console.log(`       Visual: ${section.visualChanges.changeType} (${section.visualChanges.percentageChange.toFixed(2)}% change)`);
      });
    });

    console.log('\n🎯 Intelligent UI Comparison Summary:');
    console.log('');
    console.log('✅ The tool now provides intelligent UI comparison:');
    console.log('   • Distinguishes between content and layout changes');
    console.log('   • Reduces false positives from minor positioning changes');
    console.log('   • Provides section-specific visual analysis');
    console.log('   • Categorizes changes as: content, layout, both, or none');
    console.log('');
    console.log('🔍 Change Detection Logic:');
    console.log('   • Content changes: Pixel differences in section content');
    console.log('   • Layout changes: Size or aspect ratio differences > 10%');
    console.log('   • Significant layout: Size or aspect ratio differences > 20%');
    console.log('   • False positive reduction: Minor changes < 5% pixel + < 5% size');
    console.log('');
    console.log('📊 Benefits:');
    console.log('   • More accurate change detection');
    console.log('   • Reduced noise from layout shifts');
    console.log('   • Better focus on actual content changes');
    console.log('   • Clearer reporting of change types');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testIntelligentUIComparison();
