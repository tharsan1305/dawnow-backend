/**
 * Advanced PDF Report Generator
 * Handles table creation, row management, page breaks, and professional formatting
 * 
 * Features:
 * - Dynamic table layout with proper column spacing
 * - Smart page break handling
 * - Text wrapping and overflow management
 * - Professional header/footer with signatures
 * - Configurable styling and colors
 * - Support for multi-line content cells
 */

const PDFDocument = require('pdfkit');
const PDF_CONFIG = require('./pdfConfig');

class PDFReportGenerator {
  constructor(options = {}) {
    this.config = { ...PDF_CONFIG, ...options };
    this.doc = null;
    this.currentPage = 1;
    this.currentY = this.config.PAGE.margins.top;
    this.pageHeight = 0;
    this.pageWidth = 0;
    this.dateRange = [];
    this.columnWidths = {};
    this.analyticsData = null;
  }

  /**
   * Initialize PDF document
   */
  createDocument() {
    this.doc = new PDFDocument({
      layout: this.config.PAGE.layout,
      size: this.config.PAGE.size,
      margin: 0, // Manual margin control for precision
    });

    this.pageHeight = this.doc.page.height;
    this.pageWidth = this.doc.page.width;
    this.currentY = this.config.PAGE.margins.top;

    return this.doc;
  }

  /**
   * Calculate column widths dynamically
   * @param {Array} dateRange - Array of dates for columns
   */
  calculateColumnWidths(dateRange) {
    this.dateRange = dateRange;
    const availableWidth =
      this.pageWidth -
      this.config.PAGE.margins.left -
      this.config.PAGE.margins.right;

    const staticColumnsWidth =
      this.config.COLUMNS.serialNo +
      this.config.COLUMNS.name +
      this.config.COLUMNS.designation;

    const dayColumnWidth = (availableWidth - staticColumnsWidth) / dateRange.length;

    this.columnWidths = {
      serialNo: this.config.COLUMNS.serialNo,
      name: this.config.COLUMNS.name,
      designation: this.config.COLUMNS.designation,
      dayColumn: dayColumnWidth,
      totalWidth: availableWidth,
    };

    return this.columnWidths;
  }

  /**
   * Format date as DD.MM.YYYY
   */
  formatDate(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
  }

  /**
   * Draw report title
   */
  drawTitle(title, subtitle = '') {
    const x = this.config.PAGE.margins.left;
    const width = this.pageWidth - this.config.PAGE.margins.left - this.config.PAGE.margins.right;

    // Main title
    this.doc
      .fillColor(this.config.COLORS.text)
      .font(this.config.FONTS.title.font)
      .fontSize(this.config.FONTS.title.size)
      .text(title, x, this.currentY, { width, align: 'center' });

    const titleHeight = this.doc.heightOfString(title, { width });
    this.currentY += titleHeight + (this.config.ADVANCED.enableBetterSpacing ? 15 : 10);

    // Subtitle
    if (subtitle) {
      this.doc
        .fillColor(this.config.COLORS.textAlt)
        .font(this.config.FONTS.subtitle.font)
        .fontSize(this.config.FONTS.subtitle.size)
        .text(subtitle, x, this.currentY, { width, align: 'center' });

      const subtitleHeight = this.doc.heightOfString(subtitle, { width });
      this.currentY += subtitleHeight + 12;
    }

    // Divider line - better centered
    const dividerY = this.currentY;
    const dividerX = x + (width / 2) - 100; // 200px divider line
    this.doc
      .strokeColor(this.config.COLORS.primary)
      .lineWidth(2)
      .moveTo(dividerX, dividerY)
      .lineTo(dividerX + 200, dividerY)
      .stroke();

    this.currentY = dividerY + this.config.SPACING.sectionGap + 10;
  }

  /**
   * Draw table header row
   */
  drawTableHeader() {
    const x = this.config.PAGE.margins.left;
    const y = this.currentY;
    const height = this.config.TABLE.headerHeight;

    // Header background - full width
    this.doc
      .fillColor(this.config.COLORS.headerBg)
      .rect(x, y, this.columnWidths.totalWidth, height)
      .fill();

    // Header border - full width
    if (this.config.ADVANCED.enableBorders) {
      this.doc
        .strokeColor(this.config.COLORS.border)
        .lineWidth(this.config.TABLE.borderWidth)
        .rect(x, y, this.columnWidths.totalWidth, height)
        .stroke();
    }

    // Header text color
    this.doc
      .fillColor(this.config.COLORS.header)
      .font(this.config.FONTS.headerBold.font)
      .fontSize(this.config.FONTS.headerBold.size);

    // Helper function to draw header cell properly
    const drawHeaderCell = (text, cellX, cellWidth) => {
      const padding = this.config.TABLE.cellPadding;
      const contentWidth = cellWidth - padding.left - padding.right;
      const verticalPos = this._getVerticalCellPosition(height, this.config.FONTS.headerBold.size);
      
      this.doc.text(text, cellX + padding.left, y + verticalPos, {
        width: contentWidth,
        align: this.config.ALIGNMENT.headerTextAlign,
        height: height - padding.top - padding.bottom,
        lineGap: this.config.TABLE.lineGap,
      });
    };

    // S.No header
    drawHeaderCell('S.No', x, this.columnWidths.serialNo);

    // Name header
    drawHeaderCell('Name', x + this.columnWidths.serialNo, this.columnWidths.name);

    // Designation header
    drawHeaderCell(
      'Designation',
      x + this.columnWidths.serialNo + this.columnWidths.name,
      this.columnWidths.designation
    );

    // Date headers
    this.dateRange.forEach((date, index) => {
      const dateX =
        x +
        this.columnWidths.serialNo +
        this.columnWidths.name +
        this.columnWidths.designation +
        index * this.columnWidths.dayColumn;

      drawHeaderCell(this.formatDate(date), dateX, this.columnWidths.dayColumn);
    });

    // Draw vertical dividers
    this._drawHeaderDividers(x, y, height);

    this.currentY = y + height;
  }

  /**
   * Draw vertical dividers in header
   */
  _drawHeaderDividers(x, y, height) {
    this.doc
      .strokeColor(this.config.COLORS.divider)
      .lineWidth(this.config.TABLE.dividerWidth);

    // Column separators
    const xPositions = [
      this.columnWidths.serialNo,
      this.columnWidths.serialNo + this.columnWidths.name,
      this.columnWidths.serialNo + this.columnWidths.name + this.columnWidths.designation,
    ];

    xPositions.forEach((offset) => {
      this.doc
        .moveTo(x + offset, y)
        .lineTo(x + offset, y + height)
        .stroke();
    });

    // Date column dividers
    for (let i = 1; i < this.dateRange.length; i++) {
      const xPos =
        x +
        this.columnWidths.serialNo +
        this.columnWidths.name +
        this.columnWidths.designation +
        i * this.columnWidths.dayColumn;

      this.doc
        .moveTo(xPos, y)
        .lineTo(xPos, y + height)
        .stroke();
    }
  }

  /**
   * Draw a data row in the table
   * @param {Object} rowData - { sNo, name, designation, dayContents[] }
   * @param {number} rowIndex - For alternating colors
   */
  drawTableRow(rowData) {
    const x = this.config.PAGE.margins.left;
    const sNo = rowData.sNo;
    const name = rowData.name;
    const designation = rowData.designation;
    const dayContents = rowData.dayContents; // Array of content objects

    // Calculate row height based on content
    const rowHeight = this._calculateRowHeight(dayContents);

    // Check page break
    if (this.currentY + rowHeight > this.pageHeight - this.config.PAGE.margins.bottom - 50) {
      this.addNewPage();
    }

    const y = this.currentY;

    // Row background
    const bgColor = rowData.isOdd
      ? this.config.COLORS.rowOdd
      : this.config.COLORS.rowEven;

    this.doc
      .fillColor(bgColor)
      .rect(x, y, this.columnWidths.totalWidth, rowHeight)
      .fill();

    // Row border
    if (this.config.ADVANCED.enableBorders) {
      this.doc
        .strokeColor(this.config.COLORS.border)
        .lineWidth(this.config.TABLE.borderWidth)
        .rect(x, y, this.columnWidths.totalWidth, rowHeight)
        .stroke();
    }

    this.doc.fillColor(this.config.COLORS.text);

    // Ensure sNo starts with "Dr." prefix if not present
    let displayName = name;
    if (displayName && !displayName.toLowerCase().startsWith('dr.')) {
      displayName = `Dr. ${displayName}`;
    }

    // Helper to draw data cell with proper alignment
    const drawDataCell = (text, cellX, cellWidth, alignType = 'left') => {
      const padding = this.config.TABLE.cellPadding;
      const contentWidth = cellWidth - padding.left - padding.right;
      const verticalPos = this._getVerticalCellPosition(rowHeight, this.config.FONTS.cellContent.size);
      
      this.doc
        .fontSize(this.config.FONTS.cellContent.size)
        .text(text || '–', cellX + padding.left, y + verticalPos, {
          width: contentWidth,
          align: alignType,
          height: rowHeight - padding.top - padding.bottom,
          lineGap: this.config.TABLE.lineGap,
        });
    };

    // S.No cell
    this.doc.font(this.config.FONTS.cellContent.font);
    drawDataCell(String(sNo), x, this.columnWidths.serialNo, this.config.ALIGNMENT.cellHorizontal.sNo);

    // Name cell (bold)
    this.doc.font(this.config.FONTS.cellContent.font + '-Bold');
    drawDataCell(displayName, x + this.columnWidths.serialNo, this.columnWidths.name, this.config.ALIGNMENT.cellHorizontal.name);
    this.doc.font(this.config.FONTS.cellContent.font);

    // Designation cell
    drawDataCell(
      designation,
      x + this.columnWidths.serialNo + this.columnWidths.name,
      this.columnWidths.designation,
      this.config.ALIGNMENT.cellHorizontal.designation
    );

    // Day content cells
    dayContents.forEach((content, index) => {
      const dayX =
        x +
        this.columnWidths.serialNo +
        this.columnWidths.name +
        this.columnWidths.designation +
        index * this.columnWidths.dayColumn;

      this._drawContentCell(dayX, y, this.columnWidths.dayColumn, rowHeight, content);
    });

    // Draw vertical dividers
    this._drawRowDividers(x, y, rowHeight);

    this.currentY = y + rowHeight;
  }

  /**
   * Draw content in a cell (handles text, leave, empty states)
   */
  _drawContentCell(x, y, width, height, content) {
    const padding = this.config.TABLE.cellPadding;

    if (content.type === 'leave') {
      // Leave cell styling
      this.doc
        .fillColor(this.config.COLORS.leave)
        .rect(x + padding.left, y + padding.top, width - padding.left - padding.right, height - padding.top - padding.bottom)
        .fill();

      this.doc
        .fillColor(this.config.COLORS.leaveText)
        .font(this.config.FONTS.cellContent.font + '-Bold')
        .fontSize(this.config.FONTS.cellContent.size);

      const leaveTextHeight = this.doc.heightOfString(content.leaveType, {
        width: width - padding.left - padding.right,
      });
      const verticalPos = this._getVerticalCellPosition(height, leaveTextHeight);

      this.doc.text(content.leaveType, x + padding.left, y + verticalPos, {
        width: width - padding.left - padding.right,
        align: 'center',
      });

      this.doc.fillColor(this.config.COLORS.text);
    } else if (content.type === 'empty') {
      // Empty cell
      const contentWidth = width - padding.left - padding.right;
      const verticalPos = this._getVerticalCellPosition(height, 14);
      
      this.doc
        .fillColor('#E8E8E8')
        .fontSize(14)
        .text(this.config.CONTENT.emptyCell, x + padding.left, y + verticalPos, {
          width: contentWidth,
          align: 'center',
        })
        .fillColor(this.config.COLORS.text);
    } else if (content.type === 'text' && content.items && content.items.length > 0) {
      // Text content with multiple items
      this.doc
        .font(this.config.FONTS.cellContent.font)
        .fontSize(this.config.FONTS.cellContentSmall.size);

      let itemY = y + padding.top + 2; // Start a bit lower for better spacing
      const contentWidth = width - padding.left - padding.right - 2;

      const maxAvailableHeight = height - padding.top - padding.bottom;
      const itemSpacing = 4; // Space between items

      // Draw ALL items that fit in the height (no limit)
      for (let i = 0; i < content.items.length; i++) {
        const item = content.items[i];
        
        // Truncate if needed
        const displayText =
          item.length > this.config.CONTENT.maxTextLength
            ? item.substring(0, this.config.CONTENT.maxTextLength - 3) + this.config.CONTENT.truncateEllipsis
            : item;

        // Calculate text height with exact measurement
        const textHeight = this.doc.heightOfString(displayText, {
          width: contentWidth,
          size: this.config.FONTS.cellContentSmall.size,
        });

        // Calculate space needed for this item (including spacing)
        const spaceNeeded = textHeight + (i < content.items.length - 1 ? itemSpacing : 0);

        // Check if text fits in remaining cell space
        if (itemY + spaceNeeded > y + maxAvailableHeight) {
          // Won't fit - show ellipsis indicating more items
          if (i < content.items.length - 1) {
            this.doc.font(this.config.FONTS.cellContent.font)
                   .fontSize(this.config.FONTS.cellContentSmall.size)
                   .text('...', x + padding.left, itemY, {
                     width: contentWidth,
                     align: 'left',
                   });
          }
          break;
        }

        // Draw text with proper positioning
        this.doc.text(displayText, x + padding.left, itemY, {
          width: contentWidth,
          align: 'left', // Always left align in day columns
          lineGap: 1,
        });

        // Move to next line (with spacing only between items, not after last)
        itemY += spaceNeeded;
      }
    }
  }

  /**
   * Draw vertical dividers in row
   */
  _drawRowDividers(x, y, height) {
    this.doc
      .strokeColor(this.config.COLORS.divider)
      .lineWidth(this.config.TABLE.dividerWidth);

    // Column separators
    const xPositions = [
      this.columnWidths.serialNo,
      this.columnWidths.serialNo + this.columnWidths.name,
      this.columnWidths.serialNo + this.columnWidths.name + this.columnWidths.designation,
    ];

    xPositions.forEach((offset) => {
      this.doc
        .moveTo(x + offset, y)
        .lineTo(x + offset, y + height)
        .stroke();
    });

    // Date column dividers
    for (let i = 1; i < this.dateRange.length; i++) {
      const xPos =
        x +
        this.columnWidths.serialNo +
        this.columnWidths.name +
        this.columnWidths.designation +
        i * this.columnWidths.dayColumn;

      this.doc
        .moveTo(xPos, y)
        .lineTo(xPos, y + height)
        .stroke();
    }
  }

  /**
   * Helper: Draw text in a cell with proper alignment and wrapping
   */
  _drawCellText(text, x, y, width, height, align = 'left') {
    const padding = this.config.TABLE.cellPadding;
    const contentWidth = width - padding.left - padding.right;
    const contentHeight = height - padding.top - padding.bottom;

    // Calculate vertical offset for center alignment
    let verticalOffset = padding.top;
    if (this.config.ADVANCED.enableVerticalCentering) {
      const textHeight = this.doc.heightOfString(text, {
        width: contentWidth,
        size: this.doc.fontSize(),
      });
      const verticalGap = (contentHeight - textHeight) / 2;
      if (verticalGap > 0) {
        verticalOffset += verticalGap;
      } else {
        verticalOffset += this.config.SPACING.contentVerticalAlign;
      }
    } else {
      verticalOffset += this.config.SPACING.contentVerticalAlign;
    }

    this.doc.text(text, x + padding.left, y + verticalOffset, {
      width: contentWidth,
      height: contentHeight,
      align: align,
      lineGap: this.config.TABLE.lineGap,
    });
  }

  /**
   * Calculate optimal vertical position for cell content
   */
  _getVerticalCellPosition(cellHeight, contentHeight) {
    const padding = this.config.TABLE.cellPadding;
    const availableHeight = cellHeight - padding.top - padding.bottom;
    
    if (this.config.ADVANCED.enableVerticalCentering) {
      const verticalGap = (availableHeight - contentHeight) / 2;
      return padding.top + Math.max(verticalGap, this.config.SPACING.contentVerticalAlign);
    }
    return padding.top + this.config.SPACING.contentVerticalAlign;
  }

  /**
   * Calculate row height based on content
   */
  _calculateRowHeight(dayContents) {
    let maxHeight = this.config.TABLE.minRowHeight;
    const itemSpacing = 4; // Space between items (must match _drawContentCell)

    dayContents.forEach((content) => {
      if (content.type === 'text' && content.items && content.items.length > 0) {
        let contentHeight = this.config.TABLE.cellPadding.top + this.config.TABLE.cellPadding.bottom + 2; // +2 for top margin

        // Calculate height for all items
        content.items.forEach((item, idx) => {
          const truncatedItem =
            item.length > this.config.CONTENT.maxTextLength
              ? item.substring(0, this.config.CONTENT.maxTextLength - 3) + this.config.CONTENT.truncateEllipsis
              : item;

          const itemHeight = this.doc.heightOfString(truncatedItem, {
            width: this.columnWidths.dayColumn - this.config.TABLE.cellPadding.left - this.config.TABLE.cellPadding.right - 2,
            size: this.config.FONTS.cellContentSmall.size,
          });

          // Add spacing only between items, not after last one
          contentHeight += itemHeight + (idx < content.items.length - 1 ? itemSpacing : 0);
        });

        if (contentHeight > maxHeight) {
          maxHeight = Math.min(contentHeight, this.config.TABLE.maxRowHeight);
        }
      }
    });

    return maxHeight;
  }

  /**
   * Draw footer with page numbers
   */
  drawFooter() {
    const x = this.config.PAGE.margins.left;
    const y = this.pageHeight - this.config.PAGE.margins.bottom + 10;
    const width = this.pageWidth - this.config.PAGE.margins.left - this.config.PAGE.margins.right;

    this.doc
      .fillColor(this.config.COLORS.textAlt)
      .font(this.config.FONTS.footer.font)
      .fontSize(this.config.FONTS.footer.size)
      .text(`Page ${this.currentPage}`, x, y, { width, align: 'center' });
  }

  /**
   * Draw signature section
   */
  drawSignatures() {
    const x = this.config.PAGE.margins.left;
    const y = this.pageHeight - this.config.PAGE.margins.bottom - 40;
    const lineLength = this.config.HEADER_FOOTER.signatureLineLength;

    // Add signature heading
    if (this.config.ADVANCED.enableBetterSpacing) {
      this.doc
        .fillColor(this.config.COLORS.text)
        .font(this.config.FONTS.sectionTitle.font)
        .fontSize(this.config.FONTS.sectionTitle.size)
        .text('Authorized Signatures', x, y - 30);
    }

    // Left signature
    this.doc
      .strokeColor(this.config.COLORS.signature)
      .lineWidth(0.8)
      .moveTo(x, y - 15)
      .lineTo(x + lineLength, y - 15)
      .stroke();

    this.doc
      .fillColor(this.config.COLORS.signature)
      .font(this.config.FONTS.signature.font)
      .fontSize(this.config.FONTS.signature.size)
      .text('Dean, Research and Development', x, y - 10, { width: lineLength, align: 'left' });

    // Right signature
    const rightX = this.pageWidth - this.config.PAGE.margins.right - lineLength;

    this.doc
      .strokeColor(this.config.COLORS.signature)
      .lineWidth(0.8)
      .moveTo(rightX, y - 15)
      .lineTo(rightX + lineLength, y - 15)
      .stroke();

    this.doc
      .fillColor(this.config.COLORS.signature)
      .font(this.config.FONTS.signature.font)
      .fontSize(this.config.FONTS.signature.size)
      .text('Principal', rightX, y - 10, { width: lineLength, align: 'right' });
  }

  /**
   * Add a new page
   */
  addNewPage() {
    this.drawFooter();
    this.doc.addPage();
    this.currentPage++;
    this.currentY = this.config.PAGE.margins.top;
    this.drawTableHeader();
  }

  /**
   * Set analytics data for charts
   * @param {Object} data - Analytics data with staffStats, activityStats, dateStats
   */
  setAnalyticsData(data) {
    this.analyticsData = data;
  }

  /**
   * Draw analytics section with statistics boxes
   */
  drawAnalytics() {
    if (!this.analyticsData) return;

    // Check if we need a new page for analytics
    const threshold = this.pageHeight - this.config.PAGE.margins.bottom - 50;
    if (this.currentY + 200 > threshold) {
      this.drawFooter();
      this.doc.addPage();
      this.currentPage++;
      this.currentY = this.config.PAGE.margins.top;
    }

    this.currentY += 15;

    // Draw analytics title
    this.doc
      .fillColor(this.config.COLORS.title)
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('Analytics & Summary', this.config.PAGE.margins.left, this.currentY);

    // Draw divider
    this.doc
      .strokeColor(this.config.COLORS.divider)
      .lineWidth(1)
      .moveTo(this.config.PAGE.margins.left, this.currentY + 22)
      .lineTo(this.pageWidth - this.config.PAGE.margins.right, this.currentY + 22)
      .stroke();

    this.currentY += 35;

    // Draw statistics boxes
    const { staffStats, activityStats, dateStats } = this.analyticsData;
    const boxWidth = (this.pageWidth - this.config.PAGE.margins.left - this.config.PAGE.margins.right - 20) / 3;

    // Box 1: Staff Activity
    this._drawAnalyticsBox(
      this.config.PAGE.margins.left,
      this.currentY,
      boxWidth,
      120,
      'Staff Activity',
      staffStats.map(s => ({ label: s.name, value: `${s.taskCount} tasks` }))
    );

    // Box 2: Activity Breakdown
    const activityLabels = [
      { label: 'Papers', value: activityStats.paper || 0 },
      { label: 'Projects', value: activityStats.project || 0 },
      { label: 'Patents', value: activityStats.patent || 0 },
      { label: 'Books', value: activityStats.book || 0 },
    ];
    this._drawAnalyticsBox(
      this.config.PAGE.margins.left + boxWidth + 10,
      this.currentY,
      boxWidth,
      120,
      'Activity Types',
      activityLabels
    );

    // Box 3: Daily Stats
    const dailyStats = dateStats.slice(-3).map(d => ({ label: d.date, value: `${d.count} tasks` }));
    this._drawAnalyticsBox(
      this.config.PAGE.margins.left + (boxWidth + 10) * 2,
      this.currentY,
      boxWidth,
      120,
      'Latest Days',
      dailyStats
    );

    this.currentY += 130;
  }

  /**
   * Draw a statistics box with data
   */
  _drawAnalyticsBox(x, y, width, height, title, items) {
    // Draw box border
    this.doc
      .strokeColor(this.config.COLORS.border)
      .lineWidth(0.8)
      .rect(x, y, width, height)
      .stroke();

    // Draw box background
    this.doc.fillColor('#f9f9f9').rect(x, y, width, 25).fill();

    // Draw title
    this.doc
      .fillColor(this.config.COLORS.title)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(title, x + 5, y + 5, { width: width - 10 });

    // Draw items
    let itemY = y + 30;
    items.slice(0, 4).forEach((item) => {
      this.doc
        .fillColor(this.config.COLORS.text)
        .font('Helvetica')
        .fontSize(8)
        .text(`${item.label}:`, x + 8, itemY, { width: width - 50 });

      this.doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(item.value.toString(), x + width - 40, itemY);

      itemY += 18;
    });
  }

  /**
   * Deprecated - using box-based analytics instead
   */
  _drawStaffActivityChart() {}

  /**
   * Draw stacked bar chart for activity types
   */
  _drawActivityTypeChart(x, y, width, height) {
    const { activityStats } = this.analyticsData;
    if (!activityStats) return;

    const padding = 8;
    const chartX = x + padding;
    const chartY = y + padding;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2 - 20;

    // Chart title
    this.doc
      .fillColor(this.config.COLORS.text)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Activity Types', chartX, chartY, { width: chartWidth });

    const dataY = chartY + 18;
    const barHeight = 30;
    const barY = dataY + 15;
    const total = Object.values(activityStats).reduce((a, b) => a + b, 0);

    const typeColors = {
      paper: '#3498db',
      project: '#e74c3c',
      patent: '#2ecc71',
      book: '#f39c12'
    };

    let currentX = chartX;
    const types = ['paper', 'project', 'patent', 'book'];

    // Draw stacked bar
    types.forEach(type => {
      const count = activityStats[type] || 0;
      const percentage = total > 0 ? (count / total) * 100 : 0;
      const segmentWidth = (percentage / 100) * chartWidth;

      if (segmentWidth > 1) {
        this.doc
          .fillColor(typeColors[type])
          .rect(currentX, barY, segmentWidth, barHeight)
          .fill();
        currentX += segmentWidth;
      }
    });

    // Draw legend below
    const legendY = barY + barHeight + 10;
    let legendX = chartX;
    types.forEach((type) => {
      const count = activityStats[type] || 0;

      // Color box
      this.doc
        .fillColor(typeColors[type])
        .rect(legendX, legendY, 6, 6)
        .fill();

      // Label
      this.doc
        .fillColor(this.config.COLORS.text)
        .font('Helvetica')
        .fontSize(7)
        .text(`${type}:${count}`, legendX + 10, legendY, { width: chartWidth / 2 - 10 });

      legendX += chartWidth / 2;
    });
  }

  /**
   * Draw line chart for daily distribution
   */
  _drawDailyDistributionChart(x, y, width, height) {
    const { dateStats } = this.analyticsData;
    if (!dateStats || dateStats.length === 0) return;

    const padding = 8;
    const chartX = x + padding;
    const chartY = y + padding;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2 - 20;

    // Chart title
    this.doc
      .fillColor(this.config.COLORS.text)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Daily Distribution', chartX, chartY, { width: chartWidth });

    const dataY = chartY + 18;
    const pointSpacing = dateStats.length > 1 ? chartWidth / (dateStats.length - 1) : chartWidth / 2;
    const maxValue = Math.max(...dateStats.map(d => d.count), 1);

    // Draw line
    this.doc
      .strokeColor(this.config.COLORS.primary)
      .lineWidth(1.5);

    let isFirstPoint = true;
    dateStats.forEach((stat, i) => {
      const pointX = chartX + i * pointSpacing;
      const pointY = dataY + chartHeight - (stat.count / maxValue) * (chartHeight - 15);

      if (isFirstPoint) {
        this.doc.moveTo(pointX, pointY);
        isFirstPoint = false;
      } else {
        this.doc.lineTo(pointX, pointY);
      }
    });
    this.doc.stroke();

    // Draw data points
    dateStats.forEach((stat, i) => {
      const pointX = chartX + i * pointSpacing;
      const pointY = dataY + chartHeight - (stat.count / maxValue) * (chartHeight - 15);

      this.doc
        .fillColor(this.config.COLORS.primary)
        .circle(pointX, pointY, 2.5)
        .fill();
    });
  }

  /**
   * Finalize document
   */
  finalize() {
    // Draw analytics before signatures
    this.drawAnalytics();
    this.drawSignatures();
    this.drawFooter();
    this.doc.end();
  }

  /**
   * Get the document object
   */
  getDocument() {
    return this.doc;
  }

  /**
   * Get current Y position
   */
  getCurrentY() {
    return this.currentY;
  }

  /**
   * Set current Y position
   */
  setCurrentY(y) {
    this.currentY = y;
  }
}

module.exports = PDFReportGenerator;
