const puppeteer = require('puppeteer');
const TaskEntry = require('../models/TaskEntry');
const User = require('../models/User');
const DailyLog = require('../models/DailyLog');

const normalizeDateKey = (date) => {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
};

const getDatesInRange = (startDate, endDate) => {
  const dates = [];
  let current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const formatDateLabel = (date) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
};

const cleanCellText = (text) => {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.replace(/https?:\/\/[^\s]+/g, '');
  cleaned = cleaned.replace(/[\r\t]+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
  cleaned = cleaned.trim();

  return cleaned;
};

const getTaskSentences = (task) => {
  const sentences = [];

  if (!task || typeof task !== 'object') return sentences;

  if (task.paperTitle) {
    sentences.push(`Paper: ${task.paperTitle.trim()} submitted to ${task.journalName || 'N/A'} (IF: ${task.impactFactor || 'N/A'})`);
  }
  if (task.projectName) {
    sentences.push(`Project: ${task.projectName.trim()} — ${task.projectStatus || 'Active'} (Grant: Rs. ${task.fundingAmount || 'N/A'})`);
  }
  if (task.patentTitle) {
    sentences.push(`Patent: ${task.patentTitle.trim()} filed (App. No. ${task.applicationNumber || 'N/A'})`);
  }
  if (task.bookTitle) {
    sentences.push(`Book Chapter: ${task.bookTitle.trim()} — ${task.bookStatus || 'Prepared'}`);
  }

  for (let idx = 1; idx <= 5; idx += 1) {
    const workload = task[`additionalWorkload${idx}`];
    if (workload && workload.toString().trim()) {
      sentences.push(workload.toString().trim());
    }
  }

  return sentences.filter(Boolean);
};

const escapeHtml = (value) => {
  if (value === null || value === undefined) return '-';
  return value
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const buildDailyCell = (dailyLog, dailyTasks) => {
  if (dailyTasks.some((task) => task.leaveType && task.leaveType.toString().trim())) {
    const leaveType = dailyTasks.find((task) => task.leaveType && task.leaveType.toString().trim()).leaveType;
    return leaveType ? `Leave (${escapeHtml(leaveType)})` : 'Leave';
  }

  if (dailyLog && dailyLog.isLeaveDay) {
    return 'Leave';
  }

  const lines = [];
  if (dailyLog && dailyLog.workDone && dailyLog.workDone.toString().trim()) {
    const cleaned = cleanCellText(dailyLog.workDone);
    if (cleaned) lines.push(cleaned);
  }

  dailyTasks.forEach((task) => {
    const taskSentences = getTaskSentences(task);
    taskSentences.forEach((sentence) => lines.push(sentence));
  });

  const uniqueLines = [...new Set(lines.map((line) => line.trim()))].filter(Boolean);
  if (uniqueLines.length === 0) {
    return '-';
  }

  return uniqueLines.map((value, index) => `${index + 1}. ${value}`).join('\n\n');
};

const buildWeeklyReportData = async ({ from, to, dept }) => {
  const startDate = new Date(from);
  const endDate = new Date(to);
  const dateRange = getDatesInRange(startDate, endDate);

  const staffQuery = { role: 'staff' };
  if (dept) staffQuery.department = dept;

  const [staffList, logs, tasks] = await Promise.all([
    User.find(staffQuery).sort({ name: 1 }),
    DailyLog.find({ date: { $gte: startDate, $lte: endDate } }),
    TaskEntry.find({ date: { $gte: startDate, $lte: endDate } }),
  ]);

  const logMap = new Map();
  logs.forEach((log) => {
    const key = `${log.staff?.toString() || 'unknown'}|${normalizeDateKey(log.date)}`;
    logMap.set(key, log);
  });

  const taskMap = new Map();
  tasks.forEach((task) => {
    const key = `${task.staff?.toString() || 'unknown'}|${normalizeDateKey(task.date)}`;
    const list = taskMap.get(key) || [];
    list.push(task);
    taskMap.set(key, list);
  });

  const dateHeaders = dateRange.map((date) => formatDateLabel(date));

  const rows = staffList.map((staff, index) => {
    const daily = dateRange.map((date) => {
      const key = `${staff._id.toString()}|${normalizeDateKey(date)}`;
      const dailyLog = logMap.get(key);
      const dailyTasks = taskMap.get(key) || [];
      return buildDailyCell(dailyLog, dailyTasks);
    });

    return {
      sNo: index + 1,
      name: staff.name || 'Unknown',
      designation: `${staff.designation || 'Staff'}${staff.department ? ` / ${staff.department}` : ''}`,
      daily,
    };
  });

  return {
    title: 'Center for Research and Development',
    subtitle: `Weekly Report (${formatDateLabel(startDate)} to ${formatDateLabel(endDate)})`,
    dateHeaders,
    rows,
    period: {
      from: formatDateLabel(startDate),
      to: formatDateLabel(endDate),
    },
  };
};

const buildWeeklyReportHtml = ({ title, subtitle, dateHeaders, rows }) => {
  const dateColumns = dateHeaders
    .map((dateLabel) => `<th>${escapeHtml(dateLabel)}</th>`)
    .join('');

  const rowHtml = rows
    .map((row, rowIndex) => {
      const cells = row.daily
        .map((cell) => {
          const safe = escapeHtml(cell === '-' ? '-' : cell);
          const paragraphs = safe.split('\n\n').map((line) => `<div class="cell-line">${line}</div>`).join('');
          return `<td><div class="cell-body">${paragraphs}</div></td>`;
        })
        .join('');

      return `
        <tr class="${rowIndex % 2 === 0 ? 'row-even' : 'row-odd'}">
          <td>${row.sNo}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.designation)}</td>
          ${cells}
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title)}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 24mm 16mm 20mm 16mm;
        }

        html, body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', 'Calibri', 'Arial', sans-serif;
          color: #222;
          background: #fff;
        }

        body {
          font-size: 11px;
          line-height: 1.4;
        }

        header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          padding: 0 16px;
          text-align: center;
          margin-bottom: 8px;
        }

        .report-title {
          margin: 0;
          font-size: 18px;
          letter-spacing: 0.05em;
          font-weight: 700;
          color: #0f172a;
        }

        .report-subtitle {
          margin: 4px 0 0;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
        }

        .divider {
          margin: 12px auto 0;
          width: 220px;
          height: 2px;
          background: #2563eb;
          border-radius: 1px;
        }

        footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 8px 16px;
          font-size: 10px;
          color: #475569;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #cbd5e1;
          background: #ffffff;
        }

        .footer-left,
        .footer-right {
          width: 33%;
        }

        .footer-center {
          width: 34%;
          text-align: center;
          font-style: italic;
        }

        .footer-page::after {
          content: "Page " counter(page) " of " counter(pages);
        }

        .table-container {
          margin-top: 105px;
          margin-bottom: 48px;
          width: 100%;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 10.5px;
        }

        thead {
          display: table-header-group;
        }

        tbody {
          display: table-row-group;
        }

        tr {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        th,
        td {
          border: 1px solid #94a3b8;
          padding: 8px;
          vertical-align: top;
          word-wrap: break-word;
          white-space: pre-wrap;
        }

        th {
          background: #e2e8f0;
          color: #0f172a;
          text-align: left;
          font-weight: 700;
          font-size: 11px;
        }

        td {
          background: #ffffff;
          color: #334155;
          font-size: 10px;
        }

        .row-odd td {
          background: #f8fafc;
        }

        td:first-child,
        th:first-child {
          width: 4%;
          text-align: center;
        }

        td:nth-child(2),
        th:nth-child(2) {
          width: 16%;
        }

        td:nth-child(3),
        th:nth-child(3) {
          width: 18%;
        }

        th:nth-child(n+4),
        td:nth-child(n+4) {
          width: calc((100% - 38%) / ${dateHeaders.length});
        }

        .cell-body {
          white-space: pre-wrap;
          word-break: break-word;
        }

        .cell-line {
          margin-bottom: 0.35rem;
        }

        .no-data {
          color: #64748b;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <header>
        <div class="report-title">${escapeHtml(title)}</div>
        <div class="report-subtitle">${escapeHtml(subtitle)}</div>
        <div class="divider"></div>
      </header>

      <footer>
        <div class="footer-left">Dean, Research and Development</div>
        <div class="footer-center footer-page"></div>
        <div class="footer-right" style="text-align:right;">Principal</div>
      </footer>

      <main class="table-container">
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Name</th>
              <th>Designation</th>
              ${dateColumns}
            </tr>
          </thead>
          <tbody>
            ${rowHtml}
          </tbody>
        </table>
      </main>
    </body>
    </html>
  `;
};

const renderHtmlToPdf = async (html) => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.emulateMediaType('screen');

  const pdfBuffer = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '24mm', right: '16mm', bottom: '20mm', left: '16mm' },
    preferCSSPageSize: true,
  });

  await browser.close();
  return pdfBuffer;
};

const generateWeeklyHtmlPdf = async (req, res) => {
  try {
    let { from, to, dept } = req.query;

    if (!from || !to) {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);
      saturday.setHours(23, 59, 59, 999);
      from = from || monday.toISOString();
      to = to || saturday.toISOString();
    }

    const reportData = await buildWeeklyReportData({ from, to, dept });
    const html = buildWeeklyReportHtml(reportData);
    const pdfBuffer = await renderHtmlToPdf(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=CFRD_Weekly_Report_${reportData.period.from.replace(/\./g, '-')}_${reportData.period.to.replace(/\./g, '-')}.pdf`
    );

    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Weekly HTML PDF Error:', error);
    return res.status(500).json({ message: 'Unable to generate weekly report PDF', error: error.message });
  }
};

module.exports = {
  generateWeeklyHtmlPdf,
};
