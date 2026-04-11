# 🔧 PDF ADVANCED TROUBLESHOOTING & FEATURES

## Table of Contents
1. [Common Issues & Solutions](#common-issues--solutions)
2. [Advanced Features](#advanced-features)
3. [Real-World Scenarios](#real-world-scenarios)
4. [Performance Optimization](#performance-optimization)
5. [Security & Data Handling](#security--data-handling)

---

## Common Issues & Solutions

### ⚠️ Issue 1: PDF Opening as Blank

**Symptoms:**
- Generated PDF is blank or shows only header
- No error in console
- File size is large (expected content missing)

**Root Cause:**
```javascript
// ❌ WRONG - Missing finalize()
generator.drawTableHeader();
generator.drawTableRow(row);
doc.pipe(res);  // No finalize! PDF incomplete!
```

**Solution:**
```javascript
// ✅ CORRECT
generator.drawTableHeader();
generator.drawTableRow(row);
generator.finalize();  // MUST call this!
doc.pipe(res);
```

**Debug:**
```javascript
// Add logging to verify flow
console.log('1. Creating document...');
const doc = generator.createDocument();

console.log('2. Drawing header...');
generator.drawTableHeader();

console.log('3. Drawing rows...');
staffList.forEach(staff => generator.drawTableRow(data));

console.log('4. Finalizing...');
generator.finalize();

console.log('5. PDF should be complete');
```

---

### ⚠️ Issue 2: "Row Height is NaN"

**Symptoms:**
Error: `TypeError: Cannot read property 'height' of undefined`

**Root Cause:**
```javascript
// ❌ WRONG - dayContents has wrong structure
const dayContents = [
  { type: 'text', content: 'Some text' }  // Wrong! Should be 'items' not 'content'
];
```

**Solution:**
```javascript
// ✅ CORRECT structure
const dayContents = [
  { type: 'text', items: ['Item 1', 'Item 2'] },  // Array of items!
  { type: 'leave', leaveType: 'Sick Leave' },
  { type: 'empty' }
];
```

**Validation Function:**
```javascript
function validateDayContent(content) {
  if (!content.type) throw new Error('Missing type');
  
  if (content.type === 'text') {
    if (!Array.isArray(content.items)) {
      throw new Error('Items must be array for text type');
    }
  }
  
  if (content.type === 'leave') {
    if (!content.leaveType) {
      throw new Error('Missing leaveType for leave type');
    }
  }
  
  return true;
}

// Use it
dayContents.forEach(content => {
  try {
    validateDayContent(content);
  } catch (e) {
    console.error('Invalid day content:', e.message);
  }
});
```

---

### ⚠️ Issue 3: Text Wrapping Not Working

**Symptoms:**
- Text gets cut off mid-word
- No automatic line breaking
- Only first line visible

**Root Cause:**
```javascript
// ❌ WRONG - Not specifying width for text wrapping
doc.text(longText, x, y);  // No width = no wrapping!
```

**Solution:**
In `PDFReportGenerator._drawCellText()`:

```javascript
// ✅ CORRECT - Width is required for wrapping
doc.text(text, x, y, {
  width: contentWidth,        // REQUIRED for wrapping
  align: 'left',
  lineGap: 0.5,              // Space between lines
});
```

**Debug Text Width:**
```javascript
// Check what width we're actually using
const contentWidth = columnWidth - padding.left - padding.right;
console.log('Content width:', contentWidth);

// Verify height calculation
const testText = "Your long text here...";
const height = doc.heightOfString(testText, {
  width: contentWidth,
  size: fontSize
});
console.log('Needed height for text:', height);
```

---

### ⚠️ Issue 4: Columns Not Aligning

**Symptoms:**
- Columns misaligned when printing
- Header and data rows don't match
- Varies between pages

**Root Cause:**
```javascript
// ❌ WRONG - Not consistent column calculation
function drawRow() {
  const colWidth = 100; // Hard-coded!
}

function drawHeader() {
  const colWidth = 95;  // Different value!
}
```

**Solution:**
```javascript
// ✅ CORRECT - Use centralized calculation
class PDFReportGenerator {
  calculateColumnWidths(dateRange) {
    // Calculate ONCE, use EVERYWHERE
    this.columnWidths = {
      serialNo: this.config.COLUMNS.serialNo,
      name: this.config.COLUMNS.name,
      designation: this.config.COLUMNS.designation,
      dayColumn: (availableWidth - staticWidth) / dateRange.length,
      totalWidth: availableWidth
    };
  }

  drawTableHeader() {
    const x = this.config.PAGE.margins.left;
    const colWidth = this.columnWidths.dayColumn;  // Use stored width
    // ...
  }

  _drawHeaderDividers(x, y, height) {
    const xPos = x + this.columnWidths.serialNo;  // Same calculation
    // ...
  }
}
```

---

### ⚠️ Issue 5: Page Breaks in Wrong Places

**Symptoms:**
- Rows split between pages
- Header not repeated on new pages
- Content jumps to wrong position

**Root Cause:**
```javascript
// ❌ WRONG - Check after drawing
drawer.drawTableRow(row);
if (currentY > pageHeight) {
  // Too late! Row already partially drawn
  drawer.addNewPage();
}
```

**Solution:**
```javascript
// ✅ CORRECT - Check BEFORE drawing
const rowHeight = this._calculateRowHeight(content);
if (this.currentY + rowHeight > this.pageHeight - this.config.PAGE.margins.bottom - 50) {
  this.addNewPage();  // Add page FIRST
}
// Now draw the row
this.drawTableRow(row);
```

**Advanced Page Break Logic:**
```javascript
// In PDFReportGenerator.drawTableRow()

const pageBreakThreshold = this.config.ADVANCED.pageBreakThreshold;
const availableHeight = this.pageHeight - this.config.PAGE.margins.bottom - pageBreakThreshold;

if (this.currentY + rowHeight > availableHeight) {
  console.log(`Page break triggered: Y=${this.currentY}, Height=${rowHeight}, Available=${availableHeight}`);
  
  // Draw footer and signature on current page
  this.drawFooter();
  this.drawSignatures();
  
  // Create new page
  this.doc.addPage();
  this.currentPage++;
  this.currentY = this.config.PAGE.margins.top;
  
  // Re-draw header on new page
  this.drawTableHeader();
}
```

---

### ⚠️ Issue 6: Signature Lines Misaligned

**Symptoms:**
- Left and right signatures at different heights
- Lines have different lengths
- Text below lines

**Root Cause:**
```javascript
// ❌ WRONG - Different Y values for each
const sigY = doc.page.height - 50;
doc.moveTo(35, sigY - 5).lineTo(185, sigY - 5).stroke();      // Left
doc.moveTo(pageWidth - 185, sigY - 5).lineTo(pageWidth - 35).stroke(); // Right

// Text at different Y
doc.text('Name 1', 35, sigY);
doc.text('Name 2', pageWidth - 185, sigY + 5);  // Different Y!
```

**Solution:**
```javascript
// ✅ CORRECT - Use same Y for alignment
const sigY = this.pageHeight - this.config.PAGE.margins.bottom + 10;
const lineY = sigY - 15;
const textY = sigY - 10;

// Left signature
this.doc.moveTo(x, lineY).lineTo(x + lineLength, lineY).stroke();
this.doc.text('Name 1', x, textY, { align: 'left' });

// Right signature - parallel positioning
this.doc.moveTo(rightX, lineY).lineTo(rightX + lineLength, lineY).stroke();
this.doc.text('Name 2', rightX, textY, { align: 'right' });
```

---

## Advanced Features

### 1. Custom Color Schemes

Create a theme system:

```javascript
// In pdfConfig.js - Add color themes
const COLOR_SCHEMES = {
  default: {
    primary: '#1B5E20',
    secondary: '#4CAF50',
    headerBg: '#1B5E20',
    // ...
  },
  
  dark: {
    primary: '#1A237E',
    secondary: '#3F51B5',
    headerBg: '#1A237E',
    rowEven: '#F5F5F5',
    rowOdd: '#EEEEEE',
  },
  
  corporate: {
    primary: '#00274C',
    secondary: '#0080D0',
    headerBg: '#00274C',
    rowEven: '#F9F9F9',
    rowOdd: '#F0F0F0',
  }
};

module.exports = { PDF_CONFIG, COLOR_SCHEMES };
```

**Usage:**

```javascript
const { PDF_CONFIG, COLOR_SCHEMES } = require('./pdfConfig');

function generatePDF(req, res) {
  const theme = req.query.theme || 'default';
  const config = {
    ...PDF_CONFIG,
    COLORS: COLOR_SCHEMES[theme]
  };
  
  const generator = new PDFReportGenerator(config);
  // ... rest of code
}
```

---

### 2. Multi-Language Support

```javascript
// In pdfConfig.js - Add translations
const TRANSLATIONS = {
  en: {
    title: 'Weekly Report',
    serialNo: 'S.No',
    name: 'Name',
    designation: 'Designation',
    pageLabel: 'Page',
    signature: 'Signature'
  },
  
  hi: {
    title: 'साप्ताहिक रिपोर्ट',
    serialNo: 'क्रम संख्या',
    name: 'नाम',
    designation: 'पद',
    pageLabel: 'पृष्ठ',
    signature: 'हस्ताक्षर'
  }
};

module.exports = { PDF_CONFIG, TRANSLATIONS };
```

**Usage:**

```javascript
const { PDF_CONFIG, TRANSLATIONS } = require('./pdfConfig');

function generatePDF(req, res) {
  const lang = req.query.lang || 'en';
  const t = TRANSLATIONS[lang];
  
  generator.drawTitle(t.title, subtitle);
  generator.drawTableHeader();  // Uses translated headers
}
```

---

### 3. Conditional Row Styling

```javascript
// Add styling based on data
drawTableRow(rowData) {
  // ... existing code
  
  // Determine background color based on status
  let bgColor = this.config.COLORS.rowEven;
  
  if (rowData.status === 'pending') {
    bgColor = '#FFFACD';  // Light yellow
  } else if (rowData.status === 'completed') {
    bgColor = '#E8F5E9';  // Light green
  } else if (rowData.status === 'urgent') {
    bgColor = '#FFEBEE';  // Light red
  }
  
  this.doc.fillColor(bgColor)
           .rect(x, y, width, height)
           .fill();
  
  // ... rest of method
}
```

---

### 4. Dynamic Statistics Box

```javascript
// Add summary statistics above table
drawStatistics(stats) {
  const x = this.config.PAGE.margins.left;
  const y = this.currentY;
  const width = this.columnWidths.totalWidth;
  
  // Stats background
  this.doc.fillColor('#F5F5F5')
           .rect(x, y, width, 30)
           .fill();
  
  const fontSize = this.config.FONTS.header.size;
  this.doc.font(this.config.FONTS.header.font)
           .fontSize(fontSize);
  
  const statWidth = width / Object.keys(stats).length;
  let statX = x;
  
  Object.entries(stats).forEach(([label, value]) => {
    this.doc.fillColor(this.config.COLORS.primary)
             .text(`${label}: ${value}`, statX, y + 8, {
               width: statWidth,
               align: 'center'
             });
    statX += statWidth;
  });
  
  this.currentY = y + 30 + this.config.SPACING.sectionGap;
}

// Usage
generator.drawStatistics({
  'Total Staff': staffList.length,
  'Reporting Period': '06.04.2026 - 11.04.2026',
  'Entries': tasks.length
});
```

---

### 5. Watermark Support

```javascript
// Add watermark to every page
class PDFReportGenerator {
  addWatermark(text, opacity = 0.3) {
    this.watermarkText = text;
    this.watermarkOpacity = opacity;
  }
  
  drawWatermark() {
    this.doc.save()
             .fillOpacity(this.watermarkOpacity)
             .font('Helvetica')
             .fontSize(60)
             .text(this.watermarkText, 100, this.pageHeight / 2, {
               align: 'center',
               angle: 45
             })
             .restore();
  }
  
  addNewPage() {
    this.drawFooter();
    this.doc.addPage();
    this.currentPage++;
    this.currentY = this.config.PAGE.margins.top;
    this.drawWatermark();  // Add to new page
    this.drawTableHeader();
  }
}

// Usage
generator.addWatermark('DRAFT', 0.15);
```

---

## Real-World Scenarios

### Scenario 1: Generate Reports for Multiple Departments

```javascript
async function generateDepartmentReports(req, res) {
  const departments = await User.distinct('department', { role: 'staff' });
  
  for (const dept of departments) {
    const staffList = await User.find({ department: dept, role: 'staff' });
    const generator = new PDFReportGenerator();
    const doc = generator.createDocument();
    
    // ... generate report for department
    
    const filename = `Report_${dept}_${formatDate(new Date())}.pdf`;
    doc.pipe(fs.createWriteStream(`./reports/${filename}`));
    generator.finalize();
  }
  
  res.json({ message: `Generated ${departments.length} departmental reports` });
}
```

---

### Scenario 2: Email Reports Automatically

```javascript
const nodemailer = require('nodemailer');
const PDFReportGenerator = require('./PDFReportGenerator');

async function generateAndEmailReport() {
  const generator = new PDFReportGenerator();
  const doc = generator.createDocument();
  
  // Generate PDF in memory
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  
  // ... draw report
  generator.finalize();
  
  // Wait for document to finish
  await new Promise(resolve => doc.on('end', resolve));
  
  const pdfBuffer = Buffer.concat(chunks);
  
  // Send email with attachment
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL, pass: process.env.PASSWORD }
  });
  
  await transporter.sendMail({
    from: 'reports@cfrd.edu',
    to: 'admin@cfrd.edu',
    subject: 'Weekly Report',
    attachments: [{ filename: 'report.pdf', content: pdfBuffer }]
  });
}
```

---

## Performance Optimization

### 1. Streaming for Large Reports

```javascript
// ✅ GOOD - Stream data, don't load all in memory
async function generateLargeReport(req, res) {
  const query = User.find({ role: 'staff' }).stream();
  let count = 0;
  
  query.on('data', async (staff) => {
    query.pause();  // Pause while processing
    
    const row = await formatStaffRow(staff);
    generator.drawTableRow(row);
    
    count++;
    if (count % 100 === 0) {
      console.log(`Processed ${count} staff members`);
    }
    
    query.resume();  // Continue
  });
  
  query.on('end', () => {
    generator.finalize();
  });
}

// ❌ WRONG - Load everything, runs out of memory
const staffList = await User.find({ role: 'staff' });  // 10,000+ documents!
staffList.forEach(staff => {
  // ... process
});
```

---

### 2. Cache Configuration

```javascript
// Cache calculated widths to avoid recalculation
class PDFReportGenerator {
  constructor(options = {}) {
    this.widthCache = new Map();
  }
  
  calculateColumnWidths(dateRange) {
    const cacheKey = `width_${dateRange.length}`;
    
    if (this.widthCache.has(cacheKey)) {
      this.columnWidths = this.widthCache.get(cacheKey);
      return this.columnWidths;
    }
    
    // Calculate if not cached
    const calculated = { /* ... */ };
    this.widthCache.set(cacheKey, calculated);
    this.columnWidths = calculated;
    
    return calculated;
  }
}
```

---

### 3. Batch Processing

```javascript
async function generateBatchReports(staffIds, batchSize = 100) {
  const reports = [];
  
  for (let i = 0; i < staffIds.length; i += batchSize) {
    const batch = staffIds.slice(i, i + batchSize);
    const staffList = await User.find({ _id: { $in: batch } });
    
    const generator = new PDFReportGenerator();
    const doc = generator.createDocument();
    
    // Generate report for batch
    staffList.forEach(staff => {
      // ... draw row
    });
    
    generator.finalize();
    reports.push(doc);
    
    console.log(`Completed batch ${Math.floor(i / batchSize) + 1}`);
  }
  
  return reports;
}
```

---

## Security & Data Handling

### 1. Input Validation

```javascript
function validateReportRequest(req) {
  const { from, to, dept } = req.query;
  const errors = [];
  
  if (from && !isValidDate(from)) errors.push('Invalid from date');
  if (to && !isValidDate(to)) errors.push('Invalid to date');
  if (from && to && new Date(from) > new Date(to)) {
    errors.push('Start date must be before end date');
  }
  if (dept && typeof dept !== 'string') errors.push('Invalid department');
  
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  
  return { from, to, dept };
}

// Use in controller
app.get('/reports/pdf', (req, res) => {
  try {
    const params = validateReportRequest(req);
    generatePDF(req, res, params);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

---

### 2. Sanitize Text Output

```javascript
function sanitizeForPDF(text) {
  if (!text) return '';
  
  return text
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')  // Remove control chars
    .replace(/<[^>]*>/g, '')                             // Remove HTML tags
    .replace(/&([^;]+);/g, (_, entity) => {              // Decode entities
      const entities = {
        'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'"
      };
      return entities[entity] || `&${entity};`;
    })
    .trim();
}
```

---

### 3. Access Control

```javascript
// Verify user can access report
function checkReportAccess(req, staffId) {
  const user = req.user;
  
  // Admin can view all reports
  if (user.role === 'admin') return true;
  
  // Staff can only view their own
  if (user.role === 'staff' && user._id.toString() === staffId) return true;
  
  // Department head can view their department
  if (user.role === 'depthead' && user.department === staffDepartment) return true;
  
  return false;
}

// Use in route
app.get('/reports/pdf', (req, res) => {
  if (!checkReportAccess(req, req.query.staffId)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  generatePDF(req, res);
});
```

---

### 4. Log All Report Generations

```javascript
const ReportLog = require('../models/ReportLog');

async function logReportGeneration(userId, reportType, params) {
  await ReportLog.create({
    generatedBy: userId,
    type: reportType,
    parameters: params,
    timestamp: new Date(),
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip
  });
}

// Use in controller
async function generatePDF(req, res) {
  await logReportGeneration(req.user._id, 'weekly_report', req.query);
  // ... rest of code
}
```

---

**End of Advanced Guide**

For more details, refer to `PDF_BEST_PRACTICES.md` and `PDF_MIGRATION_GUIDE.md`
