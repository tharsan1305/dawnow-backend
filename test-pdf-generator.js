/**
 * Quick PDF Test - Verify the PDF generation works correctly
 * Run this to test the new PDFReportGenerator
 */

const PDFDocument = require('pdfkit');
const PDFReportGenerator = require('./src/utils/PDFReportGenerator');
const fs = require('fs');
const path = require('path');

// Test data
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

async function testPDFGeneration() {
  console.log('🧪 Testing PDF Generation...\n');

  try {
    // Date range
    const startDate = new Date('2026-04-06');
    const endDate = new Date('2026-04-11');
    const dateRange = getDatesInRange(startDate, endDate);

    console.log(`✅ Date range: ${dateRange.length} days`);

    // Initialize generator
    const generator = new PDFReportGenerator();
    const doc = generator.createDocument();

    console.log('✅ PDF document created');

    // Calculate column widths
    generator.calculateColumnWidths(dateRange);
    console.log('✅ Column widths calculated');
    console.log(`  - S.No width: ${generator.columnWidths.serialNo}px`);
    console.log(`  - Name width: ${generator.columnWidths.name}px`);
    console.log(`  - Designation width: ${generator.columnWidths.designation}px`);
    console.log(`  - Day column width: ${generator.columnWidths.dayColumn.toFixed(2)}px`);
    console.log(`  - Total table width: ${generator.columnWidths.totalWidth}px\n`);

    // Draw title
    generator.drawTitle(
      'Center for Research and Development',
      `Weekly Report (${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()})`
    );
    console.log('✅ Title drawn');

    // Draw table header
    generator.drawTableHeader();
    console.log('✅ Table header drawn');

    // Test data
    const testStaff = [
      {
        sNo: 1,
        name: 'Arun',
        designation: 'Assistant Professor / CSE',
        dayContents: [
          { type: 'text', items: ['Paper revision to journal "123" (IF=1.0)'] },
          { type: 'text', items: ['Modernized file-saving rules and controller architecture'] },
          { type: 'text', items: ['Filed patent "Case Sensitivity" (App. No. 24304)'] },
          { type: 'empty' },
          { type: 'text', items: ['Debugged reference error in backend routes'] },
          { type: 'empty' }
        ]
      },
      {
        sNo: 2,
        name: 'Surendar',
        designation: 'Assistant Professor / CSE',
        dayContents: [
          { type: 'text', items: ['Revised paper to journal "Surendar" (IF=17.5)'] },
          { type: 'text', items: ['Approved funded project: Rs. 10,000'] },
          { type: 'text', items: ['Research phase 1'] },
          { type: 'text', items: ['Research phase 2'] },
          { type: 'text', items: ['Research phase 3'] },
          { type: 'empty' }
        ]
      },
      {
        sNo: 3,
        name: 'Tharsan',
        designation: 'Assistant Professor / ECE',
        dayContents: [
          { type: 'text', items: ['Revised paper to journal "DLDDTHATH" (IF=18.4)'] },
          { type: 'leave', leaveType: 'Sick Leave' },
          { type: 'empty' },
          { type: 'empty' },
          { type: 'empty' },
          { type: 'empty' }
        ]
      }
    ];

    // Draw rows
    testStaff.forEach((staff, index) => {
      generator.drawTableRow({
        sNo: staff.sNo,
        name: staff.name,
        designation: staff.designation,
        dayContents: staff.dayContents,
        isOdd: index % 2 === 1
      });
    });

    console.log(`✅ ${testStaff.length} data rows drawn`);

    // Finalize
    generator.finalize();
    console.log('✅ PDF finalized');

    // Save file
    const outputPath = path.join(__dirname, 'test-pdf-output.pdf');
    doc.pipe(fs.createWriteStream(outputPath));

    // Wait for write to complete
    await new Promise((resolve, reject) => {
      doc.on('finish', () => {
        const stats = fs.statSync(outputPath);
        console.log(`\n✅ PDF saved to: ${outputPath}`);
        console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
        resolve();
      });
      doc.on('error', reject);
    });

    console.log('\n🎉 PDF Generation Test PASSED!\n');
    console.log('📋 The PDF should have:');
    console.log('   ✓ Proper title and subtitle');
    console.log('   ✓ All column headers (S.No, Name, Designation, dates)');
    console.log('   ✓ 3 data rows with different content types');
    console.log('   ✓ Text properly constrained within cells');
    console.log('   ✓ No overflow or misalignment');
    console.log('   ✓ Professional formatting\n');

    return true;
  } catch (error) {
    console.error('\n❌ PDF Generation Test FAILED!');
    console.error('Error:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run test
testPDFGeneration().then(success => {
  process.exit(success ? 0 : 1);
});
