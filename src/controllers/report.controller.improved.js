/**
 * IMPROVED Report Controller
 * Uses PDFReportGenerator for professional, properly formatted PDF reports
 * 
 * Key improvements:
 * - Clean separation of concerns
 * - Proper alignment and formatting
 * - Intelligent page breaks
 * - Professional styling
 * - Error handling
 */

const TaskEntry = require('../models/TaskEntry');
const User = require('../models/User');
const DailyLog = require('../models/DailyLog');
const PDFReportGenerator = require('../utils/PDFReportGenerator');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// ==================== HELPER FUNCTIONS ====================

/**
 * Get all dates between start and end date
 */
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

/**
 * Format date as DD.MM.YYYY
 */
const formatDate = (date) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
};

/**
 * Clean and sanitize cell text
 */
const cleanCellText = (text, maxLength = 500) => {
  if (!text || typeof text !== 'string') return '';

  // Remove AI response patterns
  const aiPatterns = [
    /got it[\s\S]*?let me correct/i,
    /here'?s?[\s\S]*?first/i,
    /i'?ll[\s\S]*?for you/i,
    /sure[\s\S]*?here'?s/i,
  ];

  let cleaned = text;
  aiPatterns.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, '');
  });

  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');

  // Normalize whitespace
  cleaned = cleaned.replace(/[\r\t]+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
  cleaned = cleaned.trim();

  // Truncate if needed
  return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + '...' : cleaned;
};

/**
 * Generate activity sentences from task
 */
const getTaskSentences = (task) => {
  const sentences = [];

  // Paper
  if (task.paperTitle) {
    const text = `Paper "${task.paperTitle}" submitted to journal "${task.journalName || 'N/A'}" (IF: ${task.impactFactor || 'N/A'})`;
    sentences.push(text);
  }

  // Project
  if (task.projectName) {
    const text = `Project "${task.projectName}" - ${task.projectStatus || 'Active'} (Grant: Rs. ${task.fundingAmount || 'N/A'})`;
    sentences.push(text);
  }

  // Patent
  if (task.patentTitle) {
    const text = `Patent "${task.patentTitle}" filed (App. No. ${task.applicationNumber || 'N/A'})`;
    sentences.push(text);
  }

  // Book
  if (task.bookTitle) {
    const text = `Book Chapter "${task.bookTitle}" - ${task.bookStatus || 'Prepared'}`;
    sentences.push(text);
  }

  // Additional workload
  for (let i = 1; i <= 5; i++) {
    if (task[`additionalWorkload${i}`]) {
      sentences.push(task[`additionalWorkload${i}`]);
    }
  }

  return sentences;
};

/**
 * Format day content for display
 */
const formatDayContent = (dayLog, dayTasks) => {
  const items = [];

  // Check for leave
  const leaveTask = dayTasks.find((t) => t.leaveType && t.leaveType.trim() !== '');
  if (leaveTask) {
    return {
      type: 'leave',
      leaveType: leaveTask.leaveType,
      items: [],
    };
  }

  if (dayLog && dayLog.isLeaveDay) {
    return {
      type: 'leave',
      leaveType: 'Leave',
      items: [],
    };
  }

  // Add daily log content
  if (dayLog && dayLog.workDone && dayLog.workDone.trim() !== '') {
    const cleaned = cleanCellText(dayLog.workDone, 150);
    if (cleaned.length > 3) items.push(cleaned);
  }

  // Add task content
  dayTasks.forEach((task) => {
    const sentences = getTaskSentences(task);
    items.push(...sentences);
  });

  // Deduplicate
  const uniqueItems = [...new Set(items)];

  if (uniqueItems.length === 0) {
    return { type: 'empty', items: [] };
  }

  return { type: 'text', items: uniqueItems };
};

// ==================== MAIN PDF GENERATION ====================

/**
 * Generate PDF Report (IMPROVED VERSION)
 * @route   GET /api/reports/pdf
 * @access  Private (Admin/Staff)
 */
const generatePDF = async (req, res) => {
  try {
    let { dept, from, to } = req.query;

    // Default to current week (Mon-Sat) if no range provided
    if (!from || !to) {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      monday.setHours(0, 0, 0, 0);

      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);
      saturday.setHours(23, 59, 59, 999);

      if (!from) from = monday.toISOString();
      if (!to) to = saturday.toISOString();
    }

    const startDate = new Date(from);
    const endDate = new Date(to);
    const dateRange = getDatesInRange(startDate, endDate);

    // ========== FETCH DATA FROM DATABASE ==========
    const staffQuery = { role: 'staff' };
    if (dept) staffQuery.department = dept;

    const staffList = await User.find(staffQuery).sort({ name: 1 });

    if (staffList.length === 0) {
      return res.status(404).json({ message: 'No staff members found' });
    }

    // Fetch logs and tasks in parallel
    const [logs, tasks] = await Promise.all([
      DailyLog.find({ date: { $gte: startDate, $lte: endDate } }),
      TaskEntry.find({ date: { $gte: startDate, $lte: endDate } }),
    ]);

    // ========== INITIALIZE PDF GENERATOR ==========
    const generator = new PDFReportGenerator();
    const doc = generator.createDocument();

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=CFRD_Weekly_Report_${new Date().toISOString().split('T')[0]}.pdf`
    );

    // ========== DRAW REPORT STRUCTURE ==========

    // 1. Calculate column widths
    generator.calculateColumnWidths(dateRange);

    // 2. Draw title
    const titleText = 'Center for Research and Development';
    const subtitleText = `Weekly Report (${formatDate(startDate)} to ${formatDate(endDate)})`;
    generator.drawTitle(titleText, subtitleText);

    // 3. Draw table header
    generator.drawTableHeader();

    // ========== DRAW DATA ROWS ==========
    staffList.forEach((staff, staffIndex) => {
      // Prepare day contents for this staff member
      const dayContents = [];

      dateRange.forEach((date) => {
        // Find log and tasks for this date
        const dayLog = logs.find((l) => {
          const lDate = new Date(l.date);
          return (
            lDate.getDate() === date.getDate() &&
            lDate.getMonth() === date.getMonth() &&
            lDate.getFullYear() === date.getFullYear() &&
            l.staff.toString() === staff._id.toString()
          );
        });

        const dayTasks = tasks.filter((t) => {
          const tDate = new Date(t.date);
          return (
            tDate.getDate() === date.getDate() &&
            tDate.getMonth() === date.getMonth() &&
            tDate.getFullYear() === date.getFullYear() &&
            t.staff.toString() === staff._id.toString()
          );
        });

        // Format content for this day
        const content = formatDayContent(dayLog, dayTasks);
        dayContents.push(content);
      });

      // Draw the row
      generator.drawTableRow({
        sNo: staffIndex + 1,
        name: staff.name,
        designation: `${staff.designation || 'Staff'} / ${staff.department || 'CFRD'}`,
        dayContents: dayContents,
        isOdd: staffIndex % 2 === 1,
      });
    });

    // ========== PREPARE ANALYTICS DATA ==========
    const staffStats = staffList.map((staff) => {
      const staffTasks = tasks.filter((t) => t.staff.toString() === staff._id.toString());
      return {
        name: staff.name,
        taskCount: staffTasks.length,
      };
    });

    // Count activity types
    const activityStats = {
      paper: tasks.filter((t) => t.paperTitle).length,
      project: tasks.filter((t) => t.projectName).length,
      patent: tasks.filter((t) => t.patentTitle).length,
      book: tasks.filter((t) => t.bookTitle).length,
    };

    // Count tasks per date
    const dateStats = dateRange.map((date) => {
      const dailyTasks = tasks.filter((t) => {
        const tDate = new Date(t.date);
        return (
          tDate.getDate() === date.getDate() &&
          tDate.getMonth() === date.getMonth() &&
          tDate.getFullYear() === date.getFullYear()
        );
      });
      return {
        date: formatDate(date),
        count: dailyTasks.length,
      };
    });

    // Set analytics data and finalize
    generator.setAnalyticsData({
      staffStats,
      activityStats,
      dateStats,
    });

    // ========== FINALIZE PDF ==========
    generator.finalize();

    // Pipe document to response
    doc.pipe(res);

  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({
      message: 'Error generating PDF',
      error: error.message,
    });
  }
};

/**
 * Generate Excel Report
 * @route   GET /api/reports/excel
 * @access  Private (Admin/Staff)
 */
const generateExcel = async (req, res) => {
  try {
    let { dept, from, to } = req.query;

    if (!from || !to) {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));

      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);

      from = monday.toISOString();
      to = saturday.toISOString();
    }

    const startDate = new Date(from);
    const endDate = new Date(to);
    const dateRange = getDatesInRange(startDate, endDate);

    // Fetch data
    const staffQuery = { role: 'staff' };
    if (dept) staffQuery.department = dept;

    const staffList = await User.find(staffQuery).sort({ name: 1 });
    const [logs, tasks] = await Promise.all([
      DailyLog.find({ date: { $gte: startDate, $lte: endDate } }),
      TaskEntry.find({ date: { $gte: startDate, $lte: endDate } }),
    ]);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Weekly Report');

    // Set column widths
    worksheet.columns = [
      { header: 'S.No', key: 'sno', width: 10 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Designation', key: 'designation', width: 30 },
      ...dateRange.map((date) => ({
        header: formatDate(date),
        key: `date_${date.getTime()}`,
        width: 35,
      })),
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B5E20' } };

    // Add data rows
    staffList.forEach((staff, staffIndex) => {
      const rowData = {
        sno: staffIndex + 1,
        name: staff.name,
        designation: `${staff.designation} / ${staff.department}`,
      };

      dateRange.forEach((date) => {
        const dayLog = logs.find((l) => {
          const lDate = new Date(l.date);
          return (
            lDate.getDate() === date.getDate() &&
            lDate.getMonth() === date.getMonth() &&
            lDate.getFullYear() === date.getFullYear() &&
            l.staff.toString() === staff._id.toString()
          );
        });

        const dayTasks = tasks.filter((t) => {
          const tDate = new Date(t.date);
          return (
            tDate.getDate() === date.getDate() &&
            tDate.getMonth() === date.getMonth() &&
            tDate.getFullYear() === date.getFullYear() &&
            t.staff.toString() === staff._id.toString()
          );
        });

        const content = formatDayContent(dayLog, dayTasks);
        const contentText =
          content.type === 'leave'
            ? content.leaveType
            : content.items.join(' | ');

        rowData[`date_${date.getTime()}`] = contentText || 'No task recorded';
      });

      const row = worksheet.addRow(rowData);
      row.alignment = { vertical: 'top', wrapText: true };
    });

    // Response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=CFRD_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Excel Generation Error:', error);
    res.status(500).json({
      message: 'Error generating Excel',
      error: error.message,
    });
  }
};

/**
 * Get Report Data (JSON)
 * @route   GET /api/reports/data
 * @access  Private (Admin/Staff)
 */
const getReportData = async (req, res) => {
  try {
    let { dept, from, to } = req.query;

    if (!from || !to) {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));

      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);

      from = monday.toISOString();
      to = saturday.toISOString();
    }

    const startDate = new Date(from);
    const endDate = new Date(to);
    const dateRange = getDatesInRange(startDate, endDate);

    // Fetch data
    const staffQuery = { role: 'staff' };
    if (dept) staffQuery.department = dept;

    const staffList = await User.find(staffQuery).sort({ name: 1 });
    const [logs, tasks] = await Promise.all([
      DailyLog.find({ date: { $gte: startDate, $lte: endDate } }),
      TaskEntry.find({ date: { $gte: startDate, $lte: endDate } }),
    ]);

    // Prepare response
    const reportData = {
      period: {
        from: formatDate(startDate),
        to: formatDate(endDate),
      },
      dates: dateRange.map((date) => formatDate(date)),
      staff: staffList.map((staff, staffIndex) => {
        const dayContents = [];

        dateRange.forEach((date) => {
          const dayLog = logs.find((l) => {
            const lDate = new Date(l.date);
            return (
              lDate.getDate() === date.getDate() &&
              lDate.getMonth() === date.getMonth() &&
              lDate.getFullYear() === date.getFullYear() &&
              l.staff.toString() === staff._id.toString()
            );
          });

          const dayTasks = tasks.filter((t) => {
            const tDate = new Date(t.date);
            return (
              tDate.getDate() === date.getDate() &&
              tDate.getMonth() === date.getMonth() &&
              tDate.getFullYear() === date.getFullYear() &&
              t.staff.toString() === staff._id.toString()
            );
          });

          dayContents.push(formatDayContent(dayLog, dayTasks));
        });

        return {
          sNo: staffIndex + 1,
          name: staff.name,
          designation: `${staff.designation} / ${staff.department}`,
          dayContents: dayContents,
        };
      }),
    };

    res.json(reportData);

  } catch (error) {
    console.error('Report Data Error:', error);
    res.status(500).json({
      message: 'Error fetching report data',
      error: error.message,
    });
  }
};

// ==================== EXPORTS ====================

module.exports = {
  generatePDF,
  generateExcel,
  getReportData,
};
