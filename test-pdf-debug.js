/**
 * Debug PDF Generation with Analytics - Detailed Version
 */

const PDFReportGenerator = require('./src/utils/PDFReportGenerator');
const path = require('path');
const fs = require('fs');

// Helper: Get dates in range
const getDatesInRange = (startDate, endDate) => {
  const dates = [];
  let currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

// Helper: Format date
const formatDate = (date) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
};

async function testPDFDebug() {
  console.log('🧪 Debugging PDF Generation with Analytics...\n');

  try {
    // Setup dates
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 5);
    const endDate = new Date();
    const dateRange = getDatesInRange(startDate, endDate);

    // Create generator
    const generator = new PDFReportGenerator();
    const doc = generator.createDocument();

    console.log(`📄 PDF Document created`);
    console.log(`   Page dimensions: ${generator.pageWidth}x${generator.pageHeight}px`);
    console.log(`   Margins: top=${generator.config.PAGE.margins.top}, bottom=${generator.config.PAGE.margins.bottom}`);

    // Calculate column widths
    generator.calculateColumnWidths(dateRange);
    console.log(`✅ Column widths calculated`);

    // Draw title
    generator.drawTitle('Center for Research and Development', `Weekly Report (${formatDate(startDate)} to ${formatDate(endDate)})`);
    console.log(`✅ Title drawn at Y: ${generator.currentY}`);

    // Draw table header
    generator.drawTableHeader();
    console.log(`✅ Table header drawn at Y: ${generator.currentY}`);

    // Generate sample staff data
    const staffMembers = [
      { sNo: 1, name: 'Dr. Rajesh Kumar', designation: 'Senior Researcher / CFRD' },
      { sNo: 2, name: 'Dr. Priya Sharma', designation: 'Researcher / CFRD' },
      { sNo: 3, name: 'Dr. Amit Patel', designation: 'Assistant / CFRD' },
    ];

    // Draw rows
    staffMembers.forEach((staff, index) => {
      const dayContents = dateRange.map((date) => ({
        type: 'text',
        items: [
          `Paper "AI Applications" submitted`,
          `Project "Smart City" Active`,
          `Patent "Novel Algorithm" filed`,
        ],
      }));

      generator.drawTableRow({
        sNo: staff.sNo,
        name: staff.name,
        designation: staff.designation,
        dayContents: dayContents,
        isOdd: index % 2 === 1,
      });
      
      console.log(`   Row ${staff.sNo} drawn, currentY: ${generator.currentY}`);
    });

    console.log(`✅ 3 data rows drawn\n`);

    // Prepare analytics data
    const staffStats = [
      { name: 'Dr. Rajesh Kumar', taskCount: 15 },
      { name: 'Dr. Priya Sharma', taskCount: 12 },
      { name: 'Dr. Amit Patel', taskCount: 8 },
    ];

    const activityStats = {
      paper: 9,
      project: 6,
      patent: 5,
      book: 3,
    };

    const dateStats = [
      { date: '01/01/2024', count: 8 },
      { date: '02/01/2024', count: 12 },
      { date: '03/01/2024', count: 10 },
      { date: '04/01/2024', count: 11 },
      { date: '05/01/2024', count: 9 },
      { date: '06/01/2024', count: 5 },
    ];

    // Set analytics
    generator.setAnalyticsData({
      staffStats,
      activityStats,
      dateStats,
    });

    console.log(`📊 Analytics data set:`);
    console.log(`   Current Y before analytics: ${generator.currentY}`);
    console.log(`   Page height: ${generator.pageHeight}`);
    console.log(`   Bottom margin: ${generator.config.PAGE.margins.bottom}`);
    console.log(`   Available space: ${generator.pageHeight - generator.currentY - generator.config.PAGE.margins.bottom}px\n`);

    // Call drawAnalytics directly to debug
    console.log(`🎨 Drawing analytics...`);
    generator.drawAnalytics();
    console.log(`✅ Analytics drawn, final Y: ${generator.currentY}\n`);

    // Draw signatures and footer
    console.log(`📝 Drawing signatures and footer...`);
    generator.drawSignatures();
    generator.drawFooter();
    
    console.log(`✅ Document finalization complete`);

    // End document
    generator.doc.end();

    // Save to file
    const outputPath = path.join(__dirname, 'test-pdf-debug-output.pdf');
    const stream = fs.createWriteStream(outputPath);

    doc.on('finish', () => {
      const stats = fs.statSync(outputPath);
      console.log(`\n✅ PDF saved to: ${outputPath}`);
      console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`\n💡 If analytics still not visible, try opening the PDF to verify charts are present.`);
    });

    doc.pipe(stream);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testPDFDebug();
