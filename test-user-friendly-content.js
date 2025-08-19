const { ComparisonEngine } = require('./dist/comparison/ComparisonEngine');

async function testUserFriendlyContent() {
  console.log('📝 Testing User-Friendly Content Comparison...\n');

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
        <header>
          <h1>Welcome to Our Website</h1>
          <nav>
            <a href="/">Home</a>
            <a href="/about">About Us</a>
            <a href="/contact">Contact</a>
          </nav>
        </header>
        <main>
          <h2>Main Content Area</h2>
          <p>This is the main content of our website. We provide excellent services to our customers.</p>
          <div class="feature-box">
            <h3>Feature 1</h3>
            <p>This is a description of our first feature.</p>
          </div>
          <div class="feature-box">
            <h3>Feature 2</h3>
            <p>This is a description of our second feature.</p>
          </div>
        </main>
        <footer>
          <p>Copyright 2024 - All rights reserved</p>
        </footer>
      </body>
    </html>
  `;

  // Scenario 1: Simple text changes
  const textChangedHtml = baseHtml
    .replace('Welcome to Our Website', 'Welcome to Our Updated Website')
    .replace('Feature 1', 'Enhanced Feature 1')
    .replace('excellent services', 'outstanding services');

  // Scenario 2: Content additions and removals
  const contentChangedHtml = baseHtml
    .replace('<a href="/contact">Contact</a>', '<a href="/contact">Contact</a><a href="/services">Services</a>')
    .replace('This is a description of our second feature.', 'This is an improved description of our second feature with more details.')
    .replace('<p>Copyright 2024 - All rights reserved</p>', '<p>Copyright 2024 - All rights reserved</p><p>Privacy Policy | Terms of Service</p>');

  // Scenario 3: Major content restructuring
  const restructuredHtml = baseHtml
    .replace('Welcome to Our Website', 'Welcome to Our Completely Redesigned Website')
    .replace('Main Content Area', 'Our Services')
    .replace('This is the main content of our website. We provide excellent services to our customers.', 'We offer a wide range of professional services designed to meet your needs.')
    .replace('Feature 1', 'Service 1')
    .replace('Feature 2', 'Service 2')
    .replace('This is a description of our first feature.', 'Our first service provides comprehensive solutions.')
    .replace('This is a description of our second feature.', 'Our second service offers specialized expertise.');

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
        content: '<h1>Welcome to Our Website</h1><nav><a href="/">Home</a><a href="/about">About Us</a><a href="/contact">Contact</a></nav>',
        textContent: 'Welcome to Our Website Home About Us Contact',
        boundingBox: { x: 0, y: 0, width: 1200, height: 100 },
        screenshot: 'base64-header-screenshot'
      },
      {
        id: 'section_1',
        selector: 'main',
        type: 'main',
        content: '<h2>Main Content Area</h2><p>This is the main content of our website. We provide excellent services to our customers.</p><div class="feature-box"><h3>Feature 1</h3><p>This is a description of our first feature.</p></div><div class="feature-box"><h3>Feature 2</h3><p>This is a description of our second feature.</p></div>',
        textContent: 'Main Content Area This is the main content of our website. We provide excellent services to our customers. Feature 1 This is a description of our first feature. Feature 2 This is a description of our second feature.',
        boundingBox: { x: 0, y: 100, width: 1200, height: 300 },
        screenshot: 'base64-main-screenshot'
      },
      {
        id: 'section_2',
        selector: 'footer',
        type: 'footer',
        content: '<p>Copyright 2024 - All rights reserved</p>',
        textContent: 'Copyright 2024 - All rights reserved',
        boundingBox: { x: 0, y: 400, width: 1200, height: 50 },
        screenshot: 'base64-footer-screenshot'
      }
    ],
    metadata: {
      title: 'Test Page',
      timestamp: '2024-01-01T00:00:00.000Z',
      loadTime: 1000,
      statusCode: 200
    }
  };

  const textChangedResult = {
    ...baseResult,
    content: textChangedHtml,
    sections: [
      {
        ...baseResult.sections[0],
        content: '<h1>Welcome to Our Updated Website</h1><nav><a href="/">Home</a><a href="/about">About Us</a><a href="/contact">Contact</a></nav>',
        textContent: 'Welcome to Our Updated Website Home About Us Contact'
      },
      {
        ...baseResult.sections[1],
        content: '<h2>Main Content Area</h2><p>This is the main content of our website. We provide outstanding services to our customers.</p><div class="feature-box"><h3>Enhanced Feature 1</h3><p>This is a description of our first feature.</p></div><div class="feature-box"><h3>Feature 2</h3><p>This is a description of our second feature.</p></div>',
        textContent: 'Main Content Area This is the main content of our website. We provide outstanding services to our customers. Enhanced Feature 1 This is a description of our first feature. Feature 2 This is a description of our second feature.'
      },
      baseResult.sections[2]
    ]
  };

  const contentChangedResult = {
    ...baseResult,
    content: contentChangedHtml,
    sections: [
      {
        ...baseResult.sections[0],
        content: '<h1>Welcome to Our Website</h1><nav><a href="/">Home</a><a href="/about">About Us</a><a href="/contact">Contact</a><a href="/services">Services</a></nav>',
        textContent: 'Welcome to Our Website Home About Us Contact Services'
      },
      {
        ...baseResult.sections[1],
        content: '<h2>Main Content Area</h2><p>This is the main content of our website. We provide excellent services to our customers.</p><div class="feature-box"><h3>Feature 1</h3><p>This is a description of our first feature.</p></div><div class="feature-box"><h3>Feature 2</h3><p>This is an improved description of our second feature with more details.</p></div>',
        textContent: 'Main Content Area This is the main content of our website. We provide excellent services to our customers. Feature 1 This is a description of our first feature. Feature 2 This is an improved description of our second feature with more details.'
      },
      {
        ...baseResult.sections[2],
        content: '<p>Copyright 2024 - All rights reserved</p><p>Privacy Policy | Terms of Service</p>',
        textContent: 'Copyright 2024 - All rights reserved Privacy Policy | Terms of Service'
      }
    ]
  };

  const restructuredResult = {
    ...baseResult,
    content: restructuredHtml,
    sections: [
      {
        ...baseResult.sections[0],
        content: '<h1>Welcome to Our Completely Redesigned Website</h1><nav><a href="/">Home</a><a href="/about">About Us</a><a href="/contact">Contact</a></nav>',
        textContent: 'Welcome to Our Completely Redesigned Website Home About Us Contact'
      },
      {
        ...baseResult.sections[1],
        content: '<h2>Our Services</h2><p>We offer a wide range of professional services designed to meet your needs.</p><div class="feature-box"><h3>Service 1</h3><p>Our first service provides comprehensive solutions.</p></div><div class="feature-box"><h3>Service 2</h3><p>Our second service offers specialized expertise.</p></div>',
        textContent: 'Our Services We offer a wide range of professional services designed to meet your needs. Service 1 Our first service provides comprehensive solutions. Service 2 Our second service offers specialized expertise.'
      },
      baseResult.sections[2]
    ]
  };

  try {
    console.log('📊 Test 1: Simple Text Changes...');
    console.log('   Base URL: https://example.com/');
    console.log('   Changed URL: https://example.com/ (text changes only)');
    console.log('');
    
    const comparisons1 = await comparisonEngine.compareResults([baseResult], [textChangedResult]);
    
    console.log(`✅ Comparison completed. Found ${comparisons1.length} comparison results.\n`);
    
    comparisons1.forEach((comparison, index) => {
      console.log(`📄 Page ${index + 1}:`);
      console.log(`   Overall change: ${comparison.percentageChange.toFixed(2)}%`);
      console.log(`   Content Summary: ${comparison.contentChanges.summary}`);
      console.log(`   Sections analyzed: ${comparison.sectionComparisons.length}`);
      
      const changedSections = comparison.sectionComparisons.filter(s => s.hasChanges);
      console.log(`   Sections with changes: ${changedSections.length}`);
      
      changedSections.forEach(section => {
        console.log(`     - ${section.sectionType}:`);
        console.log(`       Summary: ${section.contentChanges.summary}`);
        console.log(`       Details:`);
        section.contentChanges.details.forEach(detail => {
          console.log(`         ${detail}`);
        });
      });
    });

    console.log('\n' + '─'.repeat(60));
    console.log('📊 Test 2: Content Additions and Removals...\n');
    
    const comparisons2 = await comparisonEngine.compareResults([baseResult], [contentChangedResult]);
    
    console.log(`✅ Comparison completed. Found ${comparisons2.length} comparison results.\n`);
    
    comparisons2.forEach((comparison, index) => {
      console.log(`📄 Page ${index + 1}:`);
      console.log(`   Overall change: ${comparison.percentageChange.toFixed(2)}%`);
      console.log(`   Content Summary: ${comparison.contentChanges.summary}`);
      console.log(`   Sections analyzed: ${comparison.sectionComparisons.length}`);
      
      const changedSections = comparison.sectionComparisons.filter(s => s.hasChanges);
      console.log(`   Sections with changes: ${changedSections.length}`);
      
      changedSections.forEach(section => {
        console.log(`     - ${section.sectionType}:`);
        console.log(`       Summary: ${section.contentChanges.summary}`);
        console.log(`       Details:`);
        section.contentChanges.details.forEach(detail => {
          console.log(`         ${detail}`);
        });
      });
    });

    console.log('\n' + '─'.repeat(60));
    console.log('📊 Test 3: Major Content Restructuring...\n');
    
    const comparisons3 = await comparisonEngine.compareResults([baseResult], [restructuredResult]);
    
    console.log(`✅ Comparison completed. Found ${comparisons3.length} comparison results.\n`);
    
    comparisons3.forEach((comparison, index) => {
      console.log(`📄 Page ${index + 1}:`);
      console.log(`   Overall change: ${comparison.percentageChange.toFixed(2)}%`);
      console.log(`   Content Summary: ${comparison.contentChanges.summary}`);
      console.log(`   Sections analyzed: ${comparison.sectionComparisons.length}`);
      
      const changedSections = comparison.sectionComparisons.filter(s => s.hasChanges);
      console.log(`   Sections with changes: ${changedSections.length}`);
      
      changedSections.forEach(section => {
        console.log(`     - ${section.sectionType}:`);
        console.log(`       Summary: ${section.contentChanges.summary}`);
        console.log(`       Details:`);
        section.contentChanges.details.forEach(detail => {
          console.log(`         ${detail}`);
        });
      });
    });

    console.log('\n🎯 User-Friendly Content Comparison Summary:');
    console.log('');
    console.log('✅ The tool now provides user-friendly content comparison:');
    console.log('   • Clear, readable descriptions of changes');
    console.log('   • Summary overview of all changes');
    console.log('   • Detailed breakdown with emojis and context');
    console.log('   • Easy-to-understand change descriptions');
    console.log('');
    console.log('📝 Content Change Types:');
    console.log('   • ➕ Added: New content that was added');
    console.log('   • ➖ Removed: Content that was deleted');
    console.log('   • ✏️ Modified: Content that was changed');
    console.log('');
    console.log('🔍 Change Descriptions:');
    console.log('   • Simple word changes: "old" → "new"');
    console.log('   • Phrase changes: "old phrase" → "new phrase"');
    console.log('   • Context-aware descriptions for longer text');
    console.log('   • Summary counts: "3 items added, 1 item modified"');
    console.log('');
    console.log('📊 Benefits:');
    console.log('   • Much easier to understand what changed');
    console.log('   • Clear visual indicators with emojis');
    console.log('   • Contextual descriptions instead of raw text');
    console.log('   • Summary overview for quick assessment');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testUserFriendlyContent();
