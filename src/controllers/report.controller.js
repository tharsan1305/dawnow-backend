const TaskEntry = require('../models/TaskEntry');
const User = require('../models/User');
const DailyLog = require('../models/DailyLog');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const PDFReportGenerator = require('../utils/PDFReportGenerator');
const PerPersonReportGenerator = require('../utils/PerPersonReportGenerator');
const path = require('path');
const fs = require('fs');

// Helper to get dates in range
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

// Enhanced text cleaning with AI text removal
const cleanCellText = (text, maxLength = 3000) => {
    if (!text || typeof text !== 'string') return '';
    
    // AI response patterns to remove
    const aiPatterns = [
        /got it[\s\S]*?let me correct/i,
        /here'?s?[\s\S]*?first/i,
        /i'?ll[\s\S]*?for you/i,
        /sure[\s\S]*?here'?s/i,
        /certainly[\s\S]*?here'/i,
        /of course[\s\S]*?here'/i,
        /great[\s\S]*?let'/i,
        /let me[\s\S]*?for you/i,
        /please[\s\S]*?find/i,
        /as requested[\s\S]*?here/i,
        /based on[\s\S]*?recommend/i,
        /i think[\s\S]*?would/i,
        /let'?s[\s\S]*?make/i,
        /i have[\s\S]*?ready/i,
        /but let me correct one important thing first/i,
        /✓|✔|✗|✘/g,
        /[Ø=ÛÜM\u00D8\u00DC\u00DB]/g,
        /\u00D8/g,  // Ø
        /\u00DC/g,  // Ü
        /\u00DB/g,  // Û
    ];
    
    aiPatterns.forEach(pattern => {
        text = text.replace(pattern, '');
    });
    
    // Strip URLs
    text = text.replace(/https?:\/\/[^\s]+/g, '');
    
    // Preserve single newlines but strip tabs and carriage returns
    text = text.replace(/[\r\t]+/g, ' ');
    // Normalize newlines (remove excessive empty lines)
    text = text.replace(/\n{3,}/g, '\n\n');
    
    // Strip excessive whitespaces (horizontal only)
    text = text.replace(/[ \t]{2,}/g, ' ');
    text = text.trim();
    
    // FINAL CHECK for technical error residue
    const badPatterns = [
        /ReferenceError:/i,
        /tasks is not defined/i,
        /undefined/i,
        /\[object Object\]/i,
        /n:\\CFRD/i,
        /routes\.js/i
    ];
    
    for (const bad of badPatterns) {
        if (bad.test(text)) return '';
    }

    // Truncate to maxLength (increased to handle full content)
    return text.length > maxLength
        ? text.substring(0, maxLength) + '...'
        : text;
};

// Smart Sentence Generator for Activities - Returns an array of sentences
const getTaskSentences = (task) => {
    const sentences = [];
    
    const paperTitle = task.paperTitle ? `"${task.paperTitle.trim()}"` : '';
    const journalName = task.journalName ? `"${task.journalName.trim()}"` : '""';
    const impactFactor = task.impactFactor ? `"${task.impactFactor.trim()}"` : '""';
    const paperStatus = (task.paperStatus || 'Prepared').charAt(0).toUpperCase() + (task.paperStatus || 'Prepared').slice(1).toLowerCase();
    
    if (paperTitle) {
        sentences.push(`Paper entitled ${paperTitle} has been ${paperStatus} to the SCI indexed journal ${journalName} which has the impact factor of ${impactFactor}.`);
    }

    const projectName = task.projectName ? `"${task.projectName.trim()}"` : '';
    const fundingAgency = task.fundingAgency ? `"${task.fundingAgency.trim()}"` : '""';
    const grantAmount = task.fundingAmount || task.grantAmount ? `"${(task.fundingAmount || task.grantAmount).trim()}"` : '""';
    const projectStatus = task.projectStatus || 'Prepared';

    if (projectName) {
        sentences.push(`Funded project entitled ${projectName} to ${fundingAgency} for grant of Rs. ${grantAmount} (Status: ${projectStatus}).`);
    }

    const patentTitle = task.patentTitle ? `"${task.patentTitle.trim()}"` : '';
    const patentAppNo = task.applicationNumber || task.patentAppNo ? `"${(task.applicationNumber || task.patentAppNo).trim()}"` : '""';
    const patentPageNo = task.pageNumber || task.patentPageNo ? `"${(task.pageNumber || task.patentPageNo).trim()}"` : '""';
    const patentType = task.patentType ? task.patentType.trim() : 'Utility/Design';
    const patentDate = task.filingDate ? `on "${task.filingDate.trim()}" ` : '';

    if (patentTitle) {
        sentences.push(`Prepared a "${patentType}" patent entitled ${patentTitle} ${patentDate}of application No.${patentAppNo} with page No.${patentPageNo} under Indian Patent Publication.`);
    }

    const bookTitle = task.bookTitle ? `"${task.bookTitle.trim()}"` : '';
    const bookStatus = (task.bookStatus || 'Prepared').charAt(0).toUpperCase() + (task.bookStatus || 'Prepared').slice(1).toLowerCase();
    const publisherName = task.publisherName ? `"${task.publisherName.trim()}"` : '""';
    const isbnNumber = task.isbnNumber ? `"${task.isbnNumber.trim()}"` : '""';

    if (bookTitle) {
        sentences.push(`Book Chapter entitled ${bookTitle} has been ${bookStatus} in ${publisherName} with ISBN No.${isbnNumber}.`);
    }

    const activityTitle = task.activityTitle ? `"${task.activityTitle.trim()}"` : '';
    const organizedBy = task.organizedBy ? `"${task.organizedBy.trim()}"` : '""'; 
    const isConference = task.activityType && task.activityType.toLowerCase().includes('conference');

    if (activityTitle) {
        if (isConference) {
            sentences.push(`Presented a paper entitled ${activityTitle} at ${organizedBy} held at "Institution".`);
        } else {
            sentences.push(activityTitle);
        }
    }

    // Include additional workloads if present
    for (let i = 1; i <= 5; i++) {
        const val = task[`additionalWorkload${i}`];
        if (val && val.trim()) {
            sentences.push(val.trim());
        }
    }
    
    return sentences;
};


// Helper: DD.MM.YYYY format using dots
const formatDate = (date) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
};

// Helper: Format content for a single day cell
const formatDayContent = (dayLog, dayTasks) => {
    // Check for admin correction first - this overrides auto-generation
    const correctionTask = dayTasks.find(t => t.summaryCorrection && t.summaryCorrection.trim() !== '');
    if (correctionTask) {
        // Split by newlines if it's stored as a block but displayed as a list
        const items = correctionTask.summaryCorrection.split('\n').filter(s => s.trim() !== '');
        return { type: 'text', items, isCorrection: true };
    }

    // Handle leave
    const leaveTask = dayTasks.find(t => t.leaveType && t.leaveType.trim() !== '');
    if (leaveTask) {
        return { type: 'leave', leaveType: leaveTask.leaveType };
    }
    if (dayLog && dayLog.isLeaveDay) {
        return { type: 'leave', leaveType: 'Leave' };
    }

    // Gather all content
    let items = [];
    if (dayLog && dayLog.workDone && dayLog.workDone.trim() !== '') {
        let cleaned = cleanCellText(dayLog.workDone);
        if (cleaned.length > 3) items.push(cleaned);
    }

    dayTasks.forEach(task => {
        const sentences = getTaskSentences(task);
        if (sentences.length > 0) {
            items.push(...sentences);
        }
    });

    // Deduplicate
    items = items.filter((v, i, a) => v && a.indexOf(v) === i);

    return items.length > 0 ? { type: 'text', items } : { type: 'empty' };
};

// @desc    Generate PDF report (Weekly Grid Format with Analytics)
// @route   GET /api/reports/pdf
// @access  Private (Admin)
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

        // Fetch data
        const staffQuery = { role: 'staff' };
        if (dept) staffQuery.department = dept;
        const staffList = await User.find(staffQuery).sort({ name: 1 });

        const [logs, tasks] = await Promise.all([
            DailyLog.find({ date: { $gte: startDate, $lte: endDate } }),
            TaskEntry.find({ date: { $gte: startDate, $lte: endDate } })
        ]);

        // Initialize PDF Generator
        const generator = new PDFReportGenerator();
        const doc = generator.createDocument();

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=CFRD_Weekly_Report_${new Date().toISOString().split('T')[0]}.pdf`
        );

        // Calculate column widths
        generator.calculateColumnWidths(dateRange);

        // Draw title
        const titleText = 'Center for Research and Development';
        const subtitleText = `Weekly Report (${formatDate(startDate)} to ${formatDate(endDate)})`;
        generator.drawTitle(titleText, subtitleText);

        // Draw table header
        generator.drawTableHeader();

        // Draw data rows
        staffList.forEach((staff, staffIndex) => {
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

                const content = formatDayContent(dayLog, dayTasks);
                dayContents.push(content);
            });

            // Draw row
            generator.drawTableRow({
                sNo: staffIndex + 1,
                name: staff.name,
                designation: `${staff.designation || 'Staff'} / ${staff.department || 'CFRD'}`,
                dayContents: dayContents,
                isOdd: staffIndex % 2 === 1,
            });
        });

        // Prepare analytics
        const staffStats = staffList.map((staff) => {
            const staffTasks = tasks.filter((t) => t.staff.toString() === staff._id.toString());
            return {
                name: staff.name,
                taskCount: staffTasks.length,
            };
        });

        const activityStats = {
            paper: tasks.filter((t) => t.paperTitle).length,
            project: tasks.filter((t) => t.projectName).length,
            patent: tasks.filter((t) => t.patentTitle).length,
            book: tasks.filter((t) => t.bookTitle).length,
        };

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

        // Set analytics and finalize
        generator.setAnalyticsData({
            staffStats,
            activityStats,
            dateStats,
        });

        generator.finalize();

        // Pipe document to response
        doc.pipe(res);

    } catch (error) {
        console.error('PDF Generation Error:', error);
        res.status(500).json({ message: 'Server error generating PDF' });
    }
};

// @desc    Generate Excel report (Weekly Grid Format)
// @route   GET /api/reports/excel
// @access  Private (Admin)
const generateExcel = async (req, res) => {
    try {
        let { dept, from, to } = req.query;

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

        const staffQuery = { role: 'staff' };
        if (dept) staffQuery.department = dept;
        const staffList = await User.find(staffQuery).sort({ name: 1 });

        const [logs, tasks] = await Promise.all([
            DailyLog.find({ date: { $gte: startDate, $lte: endDate } }),
            TaskEntry.find({ date: { $gte: startDate, $lte: endDate } })
        ]);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Weekly Report');

        // Header Title Area
        const totalCols = 3 + dateRange.length;
        sheet.mergeCells(1, 1, 1, totalCols);
        sheet.getRow(1).height = 100; // Increased height for logo

        const diffDaysExcel = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24));
        const reportTypeLabelExcel = (diffDaysExcel > 7) ? 'Monthly Report' : 'Weekly Report';

        const titleCell = sheet.getCell(1, 1);
        titleCell.value = `Center for Research and Development - ${reportTypeLabelExcel}`;
        titleCell.font = { bold: true, size: 14 };
        titleCell.alignment = { horizontal: 'center', vertical: 'bottom' };

        // Add Logo centered in the top area
        const logoPath = path.join(__dirname, '..', '..', '..', 'dawnow-frontend', 'public', 'images', 'logo-jjcet.jpg');
        if (fs.existsSync(logoPath)) {
            const logo = workbook.addImage({
                filename: logoPath,
                extension: 'jpeg',
            });
            // Better centering: (totalCols - columns_spanned) / 2
            // We'll span it centrally
            const startCol = Math.max(0, (totalCols / 2) - 1.5);
            sheet.addImage(logo, {
                tl: { col: startCol, row: 0.1 },
                ext: { width: 300, height: 95 }
            });
        }

        sheet.mergeCells(2, 1, 2, totalCols);
        const rangeCell = sheet.getCell(2, 1);
        rangeCell.value = `(${startDate.toLocaleDateString('en-GB')} to ${endDate.toLocaleDateString('en-GB')})`;
        rangeCell.font = { bold: true, size: 11 };
        rangeCell.alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getRow(2).height = 25;

        // Table Header Row
        const headerItems = ['S.No', 'Name', 'Designation', ...dateRange.map(d => d.toLocaleDateString('en-GB'))];
        const headerRow = sheet.addRow(headerItems);
        
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF87171' }
            };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Data Rows
        staffList.forEach((staff, sIdx) => {
            const staffLogs = logs.filter(l => l.staff.toString() === staff._id.toString());
            const rowData = [
                sIdx + 1,
                staff.name || 'Unknown Staff',
                (staff.designation || 'Staff') + (staff.department ? ` (${staff.department})` : '')
            ];

            dateRange.forEach(date => {
                const dayLog = logs.find(l => {
                    const lDate = new Date(l.date);
                    return lDate.getDate() === date.getDate() && 
                           lDate.getMonth() === date.getMonth() && 
                           lDate.getFullYear() === date.getFullYear() &&
                           l.staff.toString() === staff._id.toString();
                });
                
                const dayTasks = tasks.filter(t => {
                    const tDate = new Date(t.date);
                    return tDate.getDate() === date.getDate() && 
                           tDate.getMonth() === date.getMonth() && 
                           tDate.getFullYear() === date.getFullYear() &&
                           t.staff.toString() === staff._id.toString();
                });

                if (dayLog && dayLog.isLeaveDay) {
                    rowData.push('Leave');
                    return;
                }

                let items = [];
                if (dayLog && dayLog.workDone && dayLog.workDone.trim() !== '') {
                    items.push(dayLog.workDone.trim());
                }

                dayTasks.forEach(task => {
                    const sentences = getTaskSentences(task);
                    if (sentences.length > 0) {
                        items.push(...sentences);
                    }
                });

                items = items.filter((v, i, a) => v && a.indexOf(v) === i);
                const workloads = [];
                // Workloads are already in items via getTaskSentences, 
                // but if we need them separately for the footer of the cell:
                dayTasks.forEach(task => {
                    for (let i = 1; i <= 5; i++) {
                        const w = task[`additionalWorkload${i}`];
                        if (w && w.trim() !== '') workloads.push(w.trim());
                    }
                });

                if (items.length > 0) {
                    let cellText = items.map((item, idx) => `${idx + 1}. ${item}`).join('\n\n');
                    if (workloads.length > 0) {
                        cellText += `\n\nAdditional Workload:\n` + workloads.map(w => `- ${w}`).join('\n');
                    }
                    rowData.push(cellText);
                } else if (workloads.length > 0) {
                    rowData.push(`Additional Workload:\n` + workloads.map(w => `- ${w}`).join('\n'));
                } else {
                    rowData.push('Not Entered');
                }
            });

            const row = sheet.addRow(rowData);
            const bgColor = sIdx % 2 === 0 ? 'FFE3F2FD' : 'FFE8F5E9';
            
            row.eachCell((cell, colIdx) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: bgColor }
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { vertical: 'middle', wrapText: true };
                
                if (cell.value === 'Not Entered') {
                    cell.font = { italic: true, color: { argb: 'FFEF4444' } };
                }
            });
        });

        // Column widths
        sheet.getColumn(1).width = 5;
        sheet.getColumn(2).width = 25;
        sheet.getColumn(3).width = 20;
        for (let i = 4; i <= totalCols; i++) {
            sheet.getColumn(i).width = 35;
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=CFRD_Weekly_Report_${new Date().getTime()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Excel Generation Error:', error);
        res.status(500).json({ message: 'Server error generating Excel' });
    }
};

// @desc    Generate Analytics PDF report
// @route   GET /api/reports/analytics-pdf
// @access  Private (Admin)
const generateAnalyticsPDF = async (req, res) => {
    try {
        // Gathering Analytics Data (Reflecting ALL submissions as requested)
        const [allTasks, topPerformers] = await Promise.all([
            TaskEntry.find({}).populate('staff'),
            User.find({ role: 'staff' }).sort({ totalScore: -1 }).limit(10).select('name department totalScore')
        ]);

        const overview = {
            sciPapersAccepted: 0,
            sciPapersPublished: 0,
            scopusPapersAccepted: 0,
            scopusPapersPublished: 0,
            patentPublished: 0,
            patentGrant: 0,
            conferencePapersAccepted: 0,
            conferencePapersPublished: 0,
            bookChaptersAccepted: 0,
            bookChaptersPublished: 0,
            fundingApplied: 0,
            fundingReceived: 0
        };

        allTasks.forEach(task => {
            const paperStatus = (task.paperStatus || '').toLowerCase();
            const journalType = (task.journalType || '').toUpperCase();
            const projectStatus = (task.projectStatus || '').toLowerCase();
            const patentType = (task.patentType || '').toLowerCase();
            const bookStatus = (task.bookStatus || '').toLowerCase();

            if (task.paperTitle && task.paperTitle.trim() !== '') {
                if (journalType.includes('SCI')) {
                    if (paperStatus === 'published') overview.sciPapersPublished++;
                    else if (paperStatus === 'accepted') overview.sciPapersAccepted++;
                } else if (journalType.includes('SCOPUS')) {
                    if (paperStatus === 'published') overview.scopusPapersPublished++;
                    else if (paperStatus === 'accepted') overview.scopusPapersAccepted++;
                } else if (journalType.includes('CONFERENCE')) {
                    if (paperStatus === 'published') overview.conferencePapersPublished++;
                    else if (paperStatus === 'accepted') overview.conferencePapersAccepted++;
                }
            }

            if (task.patentTitle && task.patentTitle.trim() !== '') {
                if (patentType === 'published') overview.patentPublished++;
                else if (patentType === 'granted') overview.patentGrant++;
            }

            if (task.bookTitle && task.bookTitle.trim() !== '') {
                if (bookStatus === 'published') overview.bookChaptersPublished++;
                else if (bookStatus === 'accepted' || bookStatus === 'completed') overview.bookChaptersAccepted++;
            }

            if (task.projectName && task.projectName.trim() !== '') {
                if (projectStatus === 'submitted' || projectStatus === 'applied') overview.fundingApplied++;
                else if (projectStatus === 'approved' || projectStatus === 'completed' || projectStatus === 'granted' || projectStatus === 'received') overview.fundingReceived++;
            }
        });

        const doc = new PDFDocument({ 
            layout: 'portrait', 
            margin: 40,
            size: 'A4'
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=CFRD_Analytics_Report_${new Date().getTime()}.pdf`);

        doc.pipe(res);

        // --- Header (Template Mirror) ---
        const pageWidth = doc.page.width;
        const logoPath = path.join(__dirname, '..', '..', '..', 'dawnow-frontend', 'public', 'images', 'logo-jjcet.jpg');

        let currentY = 20;

        if (fs.existsSync(logoPath)) {
            const logoWidth = 280;
            const logoX = (pageWidth - logoWidth) / 2;
            doc.image(logoPath, logoX, currentY, { width: logoWidth });
            currentY += 85; 
        }
        
        doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold')
            .text('Center for Research and Development - Analytics Report', 40, currentY + 15, { align: 'center', width: pageWidth - 80 });
        
        doc.fontSize(10).font('Helvetica').fillColor('#64748b')
            .text(`Report Generated On: ${new Date().toLocaleDateString('en-GB')}`, 40, currentY + 35, { align: 'center', width: pageWidth - 80 });

        currentY += 70;

        // --- Stats Overview ---
        doc.fillColor('#fce4ec').rect(40, currentY, pageWidth - 80, 25).fill();
        doc.fillColor('#d32f2f').fontSize(11).font('Helvetica-Bold').text('Research Output Overview', 50, currentY + 7);
        currentY += 40;

        const colWidth = (pageWidth - 100) / 4;
        
        const drawGridItem = (label, sublabel, accepted, published, x, y) => {
            doc.fillColor('#475569').fontSize(7).font('Helvetica-Bold').text(label.toUpperCase(), x, y);
            doc.fillColor('#94a3b8').fontSize(6).font('Helvetica').text(sublabel.toUpperCase(), x, y + 10);
            doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text(`${accepted}`, x, y + 20);
            doc.fillColor('#94a3b8').fontSize(10).font('Helvetica').text('/', x + 18, y + 21);
            doc.fillColor('#16a34a').fontSize(14).font('Helvetica-Bold').text(`${published}`, x + 25, y + 20);
        };

        const drawSingleItem = (label, value, x, y) => {
            doc.fillColor('#475569').fontSize(7).font('Helvetica-Bold').text(label.toUpperCase(), x, y);
            doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text(value.toString(), x, y + 20);
        };

        // Row 1
        drawGridItem('sci papers', 'accepted / published', overview.sciPapersAccepted, overview.sciPapersPublished, 50, currentY);
        drawGridItem('Scopus paper', 'accepted / published', overview.scopusPapersAccepted, overview.scopusPapersPublished, 50 + colWidth, currentY);
        drawSingleItem('patent published', overview.patentPublished, 50 + (colWidth * 2), currentY);
        drawSingleItem('patent grant', overview.patentGrant, 50 + (colWidth * 3), currentY);

        currentY += 45;
        doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(50, currentY).lineTo(pageWidth - 50, currentY).stroke();
        currentY += 15;

        // Row 2
        drawGridItem('conference paper', 'accepted / published', overview.conferencePapersAccepted, overview.conferencePapersPublished, 50, currentY);
        drawGridItem('book/book chapter', 'accepted / published', overview.bookChaptersAccepted, overview.bookChaptersPublished, 50 + colWidth, currentY);
        drawSingleItem('funding Applied', overview.fundingApplied, 50 + (colWidth * 2), currentY);
        drawSingleItem('Funding received', overview.fundingReceived || 'nil', 50 + (colWidth * 3), currentY);

        currentY += 50;

        // --- Top Performers List ---
        doc.fillColor('#fce4ec').rect(40, currentY, pageWidth - 80, 25).fill();
        doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold').text('Current Top Research Performers', 50, currentY + 7);
        currentY += 35;

        // Table Header
        doc.fillColor('#f1f5f9').rect(40, currentY, pageWidth - 80, 20).fill();
        doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
        doc.text('Rank', 50, currentY + 6);
        doc.text('Name', 100, currentY + 6);
        doc.text('Department', 280, currentY + 6);
        doc.text('Score', 480, currentY + 6);
        currentY += 20;

        topPerformers.forEach((p, i) => {
            doc.fillColor(i % 2 === 0 ? '#ffffff' : '#f8fafc').rect(40, currentY, pageWidth - 80, 25).fill();
            doc.fillColor('#334155').fontSize(9).font('Helvetica');
            doc.text(`${i + 1}`, 50, currentY + 8);
            
            const staffName = p.name || 'Unknown Staff';
            const displayName = staffName.toLowerCase().includes('dr.') ? staffName : `Dr. ${staffName}`;
            doc.font('Helvetica-Bold').text(displayName, 100, currentY + 8);
            
            doc.font('Helvetica').text(p.department || 'General', 280, currentY + 8);
            
            doc.fillColor('#16a34a').font('Helvetica-Bold').text(`${p.totalScore} pts`, 480, currentY + 8);
            currentY += 25;
        });

        // --- Footer ---
        const footerY = doc.page.height - 50;
        doc.fontSize(8).fillColor('#94a3b8').text('This is a computer-generated report from DAW NOW Portal.', 40, footerY, { align: 'center', width: pageWidth - 80 });

        doc.end();
    } catch (error) {
        console.error('Analytics PDF Error:', error);
        res.status(500).json({ message: 'Server error generating Analytics PDF' });
    }
};

// @desc    Generate a colorful, per-person research summary report
// @route   GET /api/reports/staff-summary
// @access  Private (Admin)
const generateStaffSummaryPDF = async (req, res) => {
    try {
        const { dept, staffId } = req.query;
        
        // Fetch staff and their tasks
        const staffQuery = { role: 'staff' };
        if (staffId) staffQuery._id = staffId;
        else if (dept) staffQuery.department = dept;
        
        const staffList = await User.find(staffQuery).sort({ department: 1, name: 1 });
        
        const tasks = await TaskEntry.find({}).populate('staff');

        const doc = new PDFDocument({ 
            layout: 'portrait', 
            margin: 40,
            size: 'A4',
            bufferPages: true 
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=CFRD_Staff_Performance_Report_${new Date().getTime()}.pdf`);

        doc.pipe(res);

        const pageWidth = doc.page.width;
        const logoPath = path.join(__dirname, '..', '..', '..', 'dawnow-frontend', 'public', 'images', 'logo-jjcet.jpg');

        // Color Palette
        const colors = {
            primary: '#1a237e',   // Deep Blue
            secondary: '#1b5e20', // Forest Green
            accent: '#f57c00',    // Orange
            paper: '#2196f3',     // Blue
            project: '#4caf50',   // Green
            patent: '#ff9800',    // Amber
            book: '#9c27b0',      // Purple
            bg: '#f8fafc'         // Light Grey
        };

        // --- Multi-page logic for Staff ---
        for (let i = 0; i < staffList.length; i++) {
            const staff = staffList[i];
            const staffTasks = tasks.filter(t => t.staff && t.staff._id.toString() === staff._id.toString());

            if (i > 0) doc.addPage();

            let currentY = 30;

            // Page Header with Logo
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, (pageWidth - 200) / 2, currentY, { width: 200 });
                currentY += 65;
            }

            // Staff Banner
            doc.fillColor(colors.primary).rect(40, currentY, pageWidth - 80, 70, 8).fill();
            doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text(staff.name || 'Staff Member', 60, currentY + 15);
            doc.fontSize(10).font('Helvetica').text(`${staff.designation || 'Faculty'} | Department of ${staff.department || 'General'}`, 60, currentY + 35);
            doc.fontSize(11).font('Helvetica-Bold').text(`Total Research Score: ${staff.totalScore || 0} Points`, 60, currentY + 50);
            
            currentY += 85;

            // Stats row (Colorful Cards)
            const cardWidth = (pageWidth - 110) / 4;
            const drawMetricCard = (label, value, color, x, y) => {
                doc.fillColor(color).rect(x, y, cardWidth, 50, 5).fill();
                doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold').text(label.toUpperCase(), x + 5, y + 10, { width: cardWidth - 10, align: 'center' });
                doc.fontSize(16).text(value.toString(), x + 5, y + 25, { width: cardWidth - 10, align: 'center' });
            };

            const staffStats = {
                papers: staffTasks.filter(t => !!t.paperTitle).length,
                projects: staffTasks.filter(t => !!t.projectName).length,
                patents: staffTasks.filter(t => !!t.patentTitle).length,
                activities: staffTasks.filter(t => !!t.activityTitle).length
            };

            drawMetricCard('Papers', staffStats.papers, colors.paper, 40, currentY);
            drawMetricCard('Projects', staffStats.projects, colors.project, 40 + cardWidth + 10, currentY);
            drawMetricCard('Patents', staffStats.patents, colors.patent, 40 + (cardWidth + 10) * 2, currentY);
            drawMetricCard('Activities', staffStats.activities, colors.book, 40 + (cardWidth + 10) * 3, currentY);

            currentY += 70;

            // --- Individual Activity Timeline ---
            doc.fillColor(colors.primary).fontSize(12).font('Helvetica-Bold').text('Recent Research Contributions', 40, currentY);
            doc.strokeColor(colors.primary).lineWidth(1).moveTo(40, currentY + 15).lineTo(150, currentY + 15).stroke();
            currentY += 25;

            if (staffTasks.length === 0) {
                doc.fillColor('#94a3b8').fontSize(10).font('Helvetica-Oblique').text('No research activities recorded for this period.', 40, currentY);
                currentY += 20;
            } else {
                staffTasks.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10).forEach(task => {
                    const sentences = getTaskSentences(task);
                    if (sentences.length > 0) {
                        // Check for page overflow
                        if (currentY > doc.page.height - 100) {
                            doc.addPage();
                            currentY = 40;
                        }

                        // Activity Box
                        const boxHeight = (sentences.length * 14) + 20;
                        doc.fillColor('#f1f5f9').rect(40, currentY, pageWidth - 80, boxHeight, 3).fill();
                        
                        // Date indicator
                        doc.fillColor(colors.primary).fontSize(8).font('Helvetica-Bold').text(new Date(task.date).toLocaleDateString('en-GB'), 50, currentY + 8);
                        
                        doc.fillColor('#334155').fontSize(9).font('Helvetica').text(sentences.join(' '), 50, currentY + 20, { width: pageWidth - 110 });
                        
                        // Status Badge
                        const statusColor = task.status === 'approved' ? '#16a34a' : (task.status === 'rejected' ? '#ef4444' : '#f59e0b');
                        doc.fillColor(statusColor).rect(pageWidth - 100, currentY + 5, 50, 12, 6).fill();
                        doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold').text(task.status.toUpperCase(), pageWidth - 100, currentY + 8, { width: 50, align: 'center' });

                        currentY += boxHeight + 10;
                    }
                });
            }

            // Footer for page
            doc.fontSize(8).fillColor('#94a3b8').text(`Faculty Performance Report - ${staff.name} | JJCET`, 40, doc.page.height - 30, { align: 'center' });
        }

        doc.end();
    } catch (error) {
        console.error('Staff Summary PDF Error:', error);
        res.status(500).json({ message: 'Server error generating Staff Summary PDF' });
    }
};

// @desc    Bulk update report corrections
// @route   POST /api/reports/bulk-update
// @access  Private (Admin)
const bulkUpdateReport = async (req, res) => {
    try {
        console.log('Bulk update received:', JSON.stringify(req.body).substring(0, 200));
        const { edits, academicYear = '2025-26' } = req.body;
        
        if (!edits || !Array.isArray(edits)) {
            return res.status(400).json({ message: 'Invalid edits data' });
        }

        const parseDate = (dateValue) => {
            if (!dateValue) return new Date();
            const parsed = new Date(dateValue);
            if (isNaN(parsed.getTime())) {
                if (typeof dateValue === 'string' && dateValue.includes('.')) {
                    const parts = dateValue.split('.');
                    if (parts.length === 3) {
                        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                    }
                }
                return new Date();
            }
            return parsed;
        };

        const operations = edits.map(edit => {
            const { staffId, date, content } = edit;
            const targetDate = parseDate(date);
            targetDate.setHours(0, 0, 0, 0);
            
            return {
                updateOne: {
                    filter: { staff: staffId, date: targetDate },
                    update: { 
                        $set: { 
                            summaryCorrection: content, 
                            status: 'approved',
                            academicYear,
                            staff: staffId,
                            date: targetDate
                        } 
                    },
                    upsert: true
                }
            };
        });
        
        if (operations.length > 0) {
            await TaskEntry.bulkWrite(operations);
        }

        res.json({ success: true, message: 'Report updated successfully' });
    } catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({ message: error.message });
    }
};
// @route   GET /api/reports/weekly-matrix
// @access  Private (Admin)
const getWeeklyMatrix = async (req, res) => {
    try {
        const getWeekRange = () => {
            const now = new Date();
            const day = now.getDay();
            const monday = new Date(now);
            monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
            monday.setHours(0, 0, 0, 0);
            const saturday = new Date(monday);
            saturday.setDate(monday.getDate() + 5);
            saturday.setHours(23, 59, 59, 999);
            return { start: monday, end: saturday };
        };

        const allStaff = await User.find({ role: 'staff' });
        const { start, end } = getWeekRange();
        
        const allReports = await TaskEntry.find({
            date: { $gte: start, $lte: end }
        }).populate('staff');

        const matrix = allStaff.map(staff => {
            const staffReports = allReports.filter(r => 
                r.staff?._id?.toString() === staff._id.toString() || r.staff?.toString() === staff._id.toString()
            );
            return { staff, reports: staffReports };
        });

        res.json(matrix);
    } catch (error) {
        console.error('Weekly Matrix Error:', error);
        res.status(500).json({ message: 'Server error fetching matrix' });
    }
};

const generateStaffMonthlyPDF = async (req, res) => {
    try {
        const { staffId, month, year } = req.query;
        if (!staffId || !month || !year) {
            return res.status(400).json({ message: 'Missing staffId, month or year' });
        }

        const staff = await User.findById(staffId).populate('staffProfile');
        if (!staff) return res.status(404).json({ message: 'Staff not found' });

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const tasks = await TaskEntry.find({
            staff: staffId,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 });

        const generator = new PerPersonReportGenerator(staff, month, year, tasks);
        const doc = generator.generate();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Report_${staff.name.replace(/\s+/g, '_')}_${month}_${year}.pdf`);
        doc.pipe(res);
    } catch (error) {
        console.error('PDF Generation Error:', error);
        res.status(500).json({ message: 'Error generating PDF' });
    }
};

module.exports = {
    generatePDF,
    generateExcel,
    generateAnalyticsPDF,
    generateStaffSummaryPDF,
    bulkUpdateReport,
    getWeeklyMatrix,
    generateStaffMonthlyPDF
};