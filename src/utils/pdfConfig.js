/**
 * PDF Configuration & Constants
 * Centralized settings for consistent PDF generation
 */

const PDF_CONFIG = {
  // ==================== PAGE SETTINGS ====================
  PAGE: {
    layout: 'landscape',
    size: 'A4',
    margins: {
      top: 40,
      bottom: 50,
      left: 30,
      right: 30,
    },
  },

  // ==================== COLORS ====================
  COLORS: {
    primary: '#1B5E20',      // Dark green
    secondary: '#4CAF50',    // Light green
    header: '#FFFFFF',       // White
    headerBg: '#1B5E20',     // Header background
    border: '#1B5E20',       // Border color
    rowEven: '#FFFFFF',      // Even rows
    rowOdd: '#F7FAFC',       // Odd rows
    leave: '#FFF7ED',        // Leave cell background
    leaveText: '#F97316',    // Leave cell text
    text: '#333333',         // Main text
    textAlt: '#666666',      // Alternative text
    divider: '#CBD5E1',      // Light divider
    signature: '#000000',    // Signature line
  },

  // ==================== FONTS ====================
  FONTS: {
    title: { font: 'Helvetica-Bold', size: 16 },
    subtitle: { font: 'Helvetica', size: 10 },
    headerBold: { font: 'Helvetica-Bold', size: 8 },
    header: { font: 'Helvetica', size: 7 },
    sectionTitle: { font: 'Helvetica-Bold', size: 10 },
    cellContent: { font: 'Helvetica', size: 8 },
    cellContentSmall: { font: 'Helvetica', size: 7 },
    signature: { font: 'Helvetica-Bold', size: 9 },
    footer: { font: 'Helvetica', size: 8 },
  },

  // ==================== TABLE SETTINGS ====================
  TABLE: {
    headerHeight: 28,
    minRowHeight: 24,
    maxRowHeight: 400,  // Increased to allow more content per row
    cellPadding: {
      top: 4,
      bottom: 4,
      left: 4,
      right: 4,
    },
    borderWidth: 0.8,
    dividerWidth: 0.4,
    lineGap: 0.8,
    cellVerticalAlign: 'middle',
    rowSpacing: 2,
  },

  // ==================== COLUMN WIDTHS ====================
  COLUMNS: {
    serialNo: 25,
    name: 90,
    designation: 80,
    // Day columns are calculated dynamically
  },

  // ==================== CONTENT ====================
  CONTENT: {
    maxTextLength: 150,      // Max characters before truncation
    truncateEllipsis: '...',
    emptyCell: '–',
  },

  // ==================== SPACING ====================
  SPACING: {
    sectionGap: 20,
    lineItemGap: 3,
    rowGap: 2,
    headerTopMargin: 15,
    contentVerticalAlign: 4, // Vertical offset for center-aligned content
  },

  // ==================== HEADER & FOOTER ====================
  HEADER_FOOTER: {
    includePageNumbers: true,
    includeDate: true,
    signatureLineLength: 150,
    signatureSpacing: 50,
  },

  // ==================== ADVANCED SETTINGS ====================
  ADVANCED: {
    enableRowHighlight: true,    // Highlight on hover simulation
    enableBorders: true,         // Show borders
    allowTextWrapping: true,     // Auto-wrap long text
    pageBreakThreshold: 50,      // Space to leave at bottom before break
    maxItemsPerCell: null,       // null = show all, number = limit
    enableVerticalCentering: true, // Center text vertically in cells
    enableBetterSpacing: true,   // Improved spacing
    compactMode: false,          // Reduce padding for more content
  },

  // ==================== ALIGNMENT SETTINGS ====================
  ALIGNMENT: {
    cellHorizontal: {
      sNo: 'center',
      name: 'left',
      designation: 'left',
      dayContent: 'center',
    },
    cellVertical: 'middle', // 'top', 'middle', 'bottom'
    headerTextAlign: 'center',
    headerVerticalAlign: 'middle',
  },
};

module.exports = PDF_CONFIG;
