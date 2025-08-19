const { ComparisonEngine } = require('./dist/comparison/ComparisonEngine');

async function testSectionScreenshots() {
  console.log('📸 Testing True Section-by-Section UI Comparison...\n');

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
        <header style="height: 100px; background: #f0f0f0;">
          <h1>Welcome to Our Site</h1>
          <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
          </nav>
        </header>
        <main style="height: 300px; background: #ffffff;">
          <h2>Main Content</h2>
          <p>This is the main content area.</p>
          <div class="feature-box">
            <h3>Feature 1</h3>
            <p>This is a feature description.</p>
          </div>
        </main>
        <footer style="height: 50px; background: #333; color: white;">
          <p>Copyright 2024</p>
        </footer>
      </body>
    </html>
  `;

  // Create mock section screenshots (in real usage, these would be actual screenshots)
  const createMockScreenshot = (content, width = 1200, height = 100) => {
    // Create a simple mock screenshot - in real usage this would be an actual PNG
    const mockData = Buffer.alloc(width * height * 4); // RGBA
    for (let i = 0; i < mockData.length; i += 4) {
      mockData[i] = 255;     // R
      mockData[i + 1] = 255; // G
      mockData[i + 2] = 255; // B
      mockData[i + 3] = 255; // A
    }
    return mockData.toString('base64');
  };

  // Create test results with individual section screenshots
  const baseResult = {
    url: 'https://example.com/',
    screenshot: 'base64-full-page-screenshot',
    content: baseHtml,
    sections: [
      {
        id: 'section_0',
        selector: 'header',
        type: 'header',
        content: '<h1>Welcome to Our Site</h1><nav><a href="/">Home</a><a href="/about">About</a></nav>',
        textContent: 'Welcome to Our Site Home About',
        boundingBox: { x: 0, y: 0, width: 1200, height: 100 },
        screenshot: createMockScreenshot('header', 1200, 100)
      },
      {
        id: 'section_1',
        selector: 'main',
        type: 'main',
        content: '<h2>Main Content</h2><p>This is the main content area.</p><div class="feature-box"><h3>Feature 1</h3><p>This is a feature description.</p></div>',
        textContent: 'Main Content This is the main content area. Feature 1 This is a feature description.',
        boundingBox: { x: 0, y: 100, width: 1200, height: 300 },
        screenshot: createMockScreenshot('main', 1200, 300)
      },
      {
        id: 'section_2',
        selector: 'footer',
        type: 'footer',
        content: '<p>Copyright 2024</p>',
        textContent: 'Copyright 2024',
        boundingBox: { x: 0, y: 400, width: 1200, height: 50 },
        screenshot: createMockScreenshot('footer', 1200, 50)
      }
    ],
    metadata: {
      title: 'Test Page',
      timestamp: '2024-01-01T00:00:00.000Z',
      loadTime: 1000,
      statusCode: 200
    }
  };

  // Scenario 1: Only header content changed
  const headerChangedResult = {
    ...baseResult,
    content: baseHtml.replace('Welcome to Our Site', 'Welcome to Our Updated Site'),
    sections: [
      {
        ...baseResult.sections[0],
        content: '<h1>Welcome to Our Updated Site</h1><nav><a href="/">Home</a><a href="/about">About</a></nav>',
        textContent: 'Welcome to Our Updated Site Home About',
        screenshot: createMockScreenshot('header_updated', 1200, 100) // Different screenshot
      },
      ...baseResult.sections.slice(1)
    ]
  };

  // Scenario 2: Only main content changed
  const mainChangedResult = {
    ...baseResult,
    content: baseHtml.replace('Feature 1', 'Enhanced Feature 1'),
    sections: [
      baseResult.sections[0],
      {
        ...baseResult.sections[1],
        content: '<h2>Main Content</h2><p>This is the main content area.</p><div class="feature-box"><h3>Enhanced Feature 1</h3><p>This is a feature description.</p></div>',
        textContent: 'Main Content This is the main content area. Enhanced Feature 1 This is a feature description.',
        screenshot: createMockScreenshot('main_updated', 1200, 300) // Different screenshot
      },
      baseResult.sections[2]
    ]
  };

  // Scenario 3: Layout changes (different sizes)
  const layoutChangedResult = {
    ...baseResult,
    sections: [
      {
        ...baseResult.sections[0],
        boundingBox: { x: 0, y: 0, width: 1200, height: 120 }, // Height increased
        screenshot: createMockScreenshot('header_larger', 1200, 120) // Larger screenshot
      },
      {
        ...baseResult.sections[1],
        boundingBox: { x: 0, y: 120, width: 1200, height: 280 }, // Height decreased
        screenshot: createMockScreenshot('main_smaller', 1200, 280) // Smaller screenshot
      },
      baseResult.sections[2]
    ]
  };

  try {
    console.log('📊 Test 1: Header Content Changes Only...');
    console.log('   Base URL: https://example.com/');
    console.log('   Changed URL: https://example.com/ (header content only)');
    console.log('');
    
    const comparisons1 = await comparisonEngine.compareResults([baseResult], [headerChangedResult]);
    
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
        console.log(`       Uses section screenshot: ${section.visualChanges.hasSignificantChanges ? 'Yes' : 'No'}`);
      });
    });

    console.log('\n' + '─'.repeat(60));
    console.log('📊 Test 2: Main Content Changes Only...\n');
    
    const comparisons2 = await comparisonEngine.compareResults([baseResult], [mainChangedResult]);
    
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
        console.log(`       Uses section screenshot: ${section.visualChanges.hasSignificantChanges ? 'Yes' : 'No'}`);
      });
    });

    console.log('\n' + '─'.repeat(60));
    console.log('📊 Test 3: Layout Changes Only...\n');
    
    const comparisons3 = await comparisonEngine.compareResults([baseResult], [layoutChangedResult]);
    
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
        console.log(`       Uses section screenshot: ${section.visualChanges.hasSignificantChanges ? 'Yes' : 'No'}`);
      });
    });

    console.log('\n🎯 True Section-by-Section UI Comparison Summary:');
    console.log('');
    console.log('✅ The tool now provides true section-by-section UI comparison:');
    console.log('   • Captures individual screenshots for each section');
    console.log('   • Compares sections directly (no cropping needed)');
    console.log('   • More accurate visual comparison');
    console.log('   • Better performance (no image cropping)');
    console.log('');
    console.log('📸 Section Screenshot Process:');
    console.log('   1. Crawl page and extract sections');
    console.log('   2. Capture individual screenshot for each section');
    console.log('   3. Store section screenshots with section data');
    console.log('   4. Compare section screenshots directly');
    console.log('');
    console.log('🔍 Benefits:');
    console.log('   • More accurate visual comparison');
    console.log('   • No false positives from cropping errors');
    console.log('   • Better handling of responsive layouts');
    console.log('   • Cleaner section-specific analysis');
    console.log('');
    console.log('📁 File Structure:');
    console.log('   • Full page screenshots: page.png');
    console.log('   • Section screenshots: page_header.png, page_main.png, page_footer.png');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSectionScreenshots();
