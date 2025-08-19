const { WebCrawler } = require('./dist/crawler/WebCrawler');
const { ComparisonEngine } = require('./dist/comparison/ComparisonEngine');
const { HtmlReporter } = require('./dist/reporter/HtmlReporter');
const fs = require('fs-extra');
const path = require('path');

async function testEnhancedComparison() {
  console.log('🚀 Testing Enhanced Section-by-Section Comparison...\n');

  // Test configuration
  const config = {
    baseUrl: 'https://example.com',
    pages: ['/'],
    viewport: { width: 1920, height: 1080 },
    timeout: 30000,
    waitForTimeout: 2000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };

  try {
    // Initialize crawler for "before" state
    console.log('📸 Crawling "before" state...');
    const beforeCrawler = new WebCrawler(config);
    await beforeCrawler.initialize();
    const beforeSession = await beforeCrawler.crawl();
    await beforeCrawler.cleanup();

    console.log(`✅ Before crawl completed. Found ${beforeSession.results.length} pages.`);
    console.log(`📊 Sections found: ${beforeSession.results[0]?.sections?.length || 0} sections`);

    // Initialize crawler for "after" state (simulating a change)
    console.log('\n📸 Crawling "after" state...');
    const afterCrawler = new WebCrawler(config);
    await afterCrawler.initialize();
    const afterSession = await afterCrawler.crawl();
    await afterCrawler.cleanup();

    console.log(`✅ After crawl completed. Found ${afterSession.results.length} pages.`);
    console.log(`📊 Sections found: ${afterSession.results[0]?.sections?.length || 0} sections`);

    // Compare results
    console.log('\n🔍 Comparing results...');
    const comparisonEngine = new ComparisonEngine({
      threshold: 0.1,
      ignoreAntialiasing: true,
      ignoreColors: false
    });

    const comparisons = await comparisonEngine.compareResults(
      beforeSession.results,
      afterSession.results
    );

    console.log(`✅ Comparison completed. Found ${comparisons.length} comparison results.`);

    // Generate report
    console.log('\n📄 Generating enhanced report...');
    const reporter = new HtmlReporter();
    
    const reportData = {
      summary: {
        totalPages: comparisons.length,
        changedPages: comparisons.filter(c => c.percentageChange > 1).length,
        unchangedPages: comparisons.filter(c => c.percentageChange <= 1).length,
        failedPages: 0,
        timestamp: new Date().toISOString(),
        beforeDeployment: beforeSession.timestamp,
        afterDeployment: afterSession.timestamp,
      },
      results: comparisons,
      config: {
        title: 'Enhanced QA Automation Report',
        outputPath: './reports',
        includeScreenshots: true,
        includeContentDiff: true,
        threshold: 1,
      },
    };

    const reportPath = await reporter.generateReport(reportData);
    console.log(`✅ Report generated: ${reportPath}`);

    // Display section analysis summary
    console.log('\n📊 Section Analysis Summary:');
    comparisons.forEach((comparison, index) => {
      console.log(`\nPage ${index + 1}: ${comparison.url}`);
      console.log(`  Overall change: ${comparison.percentageChange.toFixed(2)}%`);
      console.log(`  Sections analyzed: ${comparison.sectionComparisons.length}`);
      
      const changedSections = comparison.sectionComparisons.filter(s => s.hasChanges);
      console.log(`  Sections with changes: ${changedSections.length}`);
      
      changedSections.forEach(section => {
        console.log(`    - ${section.sectionType} (${section.selector}): ${section.contentChanges.added.length} added, ${section.contentChanges.removed.length} removed, ${section.contentChanges.modified.length} modified`);
      });
    });

    console.log('\n🎉 Enhanced comparison test completed successfully!');
    console.log(`📖 Open ${reportPath} in your browser to view the detailed report.`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEnhancedComparison();
