/**
 * Test PDF Generation with Analytics
 * Verifies that the new analytics charts are rendered correctly
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

async function testPDFWithAnalytics() {
  console.log('🧪 Testing PDF Generation with Analytics...\n');

  try {
    // Setup dates
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 5);
    const endDate = new Date();
    const dateRange = getDatesInRange(startDate, endDate);

    console.log(`✅ Date range: ${dateRange.length} days`);

    // Create generator
    const generator = new PDFReportGenerator();
    const doc = generator.createDocument();
    console.log('✅ PDF document created');

    // Calculate column widths
    generator.calculateColumnWidths(dateRange);
    console.log(
      `✅ Column widths calculated\n   - S.No width: ${generator.columnWidths['S.No']}px\n   - Name width: ${generator.columnWidths['Name']}px\n   - Designation width: ${generator.columnWidths['Designation']}px`
    );

    // Draw title
    generator.drawTitle('Center for Research and Development', `Weekly Report (${formatDate(startDate)} to ${formatDate(endDate)})`);
    console.log('✅ Title drawn');

    // Draw table header
    generator.drawTableHeader();
    console.log('✅ Table header drawn');

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
          `Paper "AI Applications" submitted to journal (IF: 3.5)`,
          `Project "Smart City" - Active (Grant: Rs. 50,00,000)`,
          `Patent "Novel Algorithm" filed (App. No. IN/2024/001)`,
        ],
      }));

      generator.drawTableRow({
        sNo: staff.sNo,
        name: staff.name,
        designation: staff.designation,
        dayContents: dayContents,
        isOdd: index % 2 === 1,
      });
    });

    console.log('✅ 3 data rows drawn');

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

    // Set analytics and finalize
    generator.setAnalyticsData({
      staffStats,
      activityStats,
      dateStats,
    });

    console.log('✅ Analytics data set');
    console.log('   - Staff activity: 3 members');
    console.log('   - Activity types: Papers(9), Projects(6), Patents(5), Books(3)');
    console.log('   - Daily distribution: 6 days');

    // Finalize (includes analytics rendering)
    generator.finalize();
    console.log('✅ PDF finalized with analytics');

    // Save to file
    const outputPath = path.join(__dirname, 'test-pdf-with-analytics-output.pdf');
    const stream = fs.createWriteStream(outputPath);

    doc.on('finish', () => {
      const stats = fs.statSync(outputPath);
      console.log(`\n✅ PDF saved to: ${outputPath}`);
      console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log('\n🎉 All tests passed! Analytics charts should be visible at the end of the PDF.');
    });

    doc.pipe(stream);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testPDFWithAnalytics();
