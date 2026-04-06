const TaskEntry = require('../models/TaskEntry');
const User = require('../models/User');
const DailyLog = require('../models/DailyLog');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
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
const cleanCellText = (text, maxLength = 240) => {
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
    // Strip newlines, tabs, and carriage returns
    text = text.replace(/[\r\n\t]+/g, ' ');
    // Strip excessive whitespaces
    text = text.replace(/\s{2,}/g, ' ');
    text = text.trim();
    
    // Final check for AI-like sentences
    if (text.toLowerCase().includes("got it") && text.toLowerCase().includes("let me correct")) return '';
    
    // Truncate to maxLength
    return text.length > maxLength
        ? text.substring(0, maxLength) + '...'
        : text;
};

// Smart Sentence Generator for Activities
const generateSmartSentence = (task) => {
    const paperTitle = task.paperTitle ? `"${task.paperTitle.trim()}"` : '';
    const journalName = task.journalName ? `"${task.journalName.trim()}"` : '""';
    const impactFactor = task.impactFactor ? `"${task.impactFactor.trim()}"` : '""';
    const paperStatus = (task.paperStatus || 'Prepared').charAt(0).toUpperCase() + (task.paperStatus || 'Prepared').slice(1).toLowerCase();
    
    const patentTitle = task.patentTitle ? `"${task.patentTitle.trim()}"` : '';
    const patentAppNo = task.applicationNumber || task.patentAppNo ? `"${(task.applicationNumber || task.patentAppNo).trim()}"` : '""';
    const patentPageNo = task.pageNumber || task.patentPageNo ? `"${(task.pageNumber || task.patentPageNo).trim()}"` : '""';
    const patentType = task.patentType ? task.patentType.trim() : 'Utility/Design';
    const patentDate = task.filingDate ? `on "${task.filingDate.trim()}" ` : '';
    
    const projectName = task.projectName ? `"${task.projectName.trim()}"` : '';
    const fundingAgency = task.fundingAgency ? `"${task.fundingAgency.trim()}"` : '""';
    const grantAmount = task.fundingAmount || task.grantAmount ? `"${(task.fundingAmount || task.grantAmount).trim()}"` : '""';

    const bookTitle = task.bookTitle ? `"${task.bookTitle.trim()}"` : '';
    const bookStatus = (task.bookStatus || 'Prepared').charAt(0).toUpperCase() + (task.bookStatus || 'Prepared').slice(1).toLowerCase();
    const publisherName = task.publisherName ? `"${task.publisherName.trim()}"` : '""';
    const isbnNumber = task.isbnNumber ? `"${task.isbnNumber.trim()}"` : '""';

    const activityTitle = task.activityTitle ? `"${task.activityTitle.trim()}"` : '';
    const organizedBy = task.organizedBy ? `"${task.organizedBy.trim()}"` : '""'; 
    const isConference = task.activityType && task.activityType.toLowerCase().includes('conference');

    // Paper sentence template
    if (paperTitle) {
        return `First Paper entitled ${paperTitle} has been ${paperStatus} to the SCI indexed journal ${journalName} which has the impact factor of ${impactFactor}.`;
    }
    
    // Patent sentence template
    if (patentTitle) {
        return `First has Prepared a "${patentType}" patent entitled ${patentTitle} ${patentDate}of application No.${patentAppNo} with page No.${patentPageNo} under Indian Patent Publication.`;
    }
    
    // Project/Funding sentence template
    if (projectName) {
        return `First has Prepared a Funded project entitled ${projectName} to ${fundingAgency} for grant of Rs. ${grantAmount}.`;
    }

    // Book Chapter
    if (bookTitle) {
        return `First Book Chapter entitled ${bookTitle} has been ${bookStatus} in ${publisherName} with ISBN No.${isbnNumber}.`;
    }

    // Conference
    if (activityTitle && isConference) {
        return `First has Presented a paper entitled ${activityTitle} at ${organizedBy} held at "Institution".`;
    }
    
    // Other/General Activity
    if (activityTitle) {
        return activityTitle;
    }
    
    return '';
};


// Helper: DD.MM.YYYY format using dots
const formatDate = (date) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
};

// @desc    Generate PDF report (Weekly Grid Format)
// @route   GET /api/reports/pdf
// @access  Private (Admin)
const generatePDF = async (req, res) => {
    try {
        let { dept, from, to } = req.query;

        // Default to current week (Mon-Sat) if no range provided
        if (!from || !to) {
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // get Monday
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

        // Fetch staff
        const staffQuery = { role: 'staff' };
        if (dept) staffQuery.department = dept;
        const staffList = await User.find(staffQuery).sort({ name: 1 });

        // Fetch logs and tasks for all staff in range
        const [logs, tasks] = await Promise.all([
            DailyLog.find({ date: { $gte: startDate, $lte: endDate } }),
            TaskEntry.find({ date: { $gte: startDate, $lte: endDate } })
        ]);

        // Create PDF document (Landscape)
        const doc = new PDFDocument({ 
            layout: 'landscape', 
            margin: 30,
            size: 'A4'
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=CFRD_Weekly_Report_${new Date().toISOString().split('T')[0]}.pdf`);

        doc.pipe(res);

        const pageWidth = doc.page.width;
        const logoPath = path.join(__dirname, '..', '..', '..', 'dawnow-frontend', 'public', 'images', 'logo-jjcet.jpg');

        // --- Header Section Drawing Function (to reuse for new pages) ---
        const drawHeader = (doc, currentY) => {
            const pageWidth = doc.page.width;
            const logoPath = path.join(__dirname, '..', '..', '..', 'dawnow-frontend', 'public', 'images', 'logo-jjcet.jpg');
            
            // Header row background (White for logo area just in case)
            doc.fillColor('#ffffff').rect(0, 0, pageWidth, 105).fill();
            
            // JJCET Logo at Top Center (on every page header)
            if (fs.existsSync(logoPath)) {
                const logoWidth = 180;
                const logoX = (pageWidth - logoWidth) / 2;
                doc.image(logoPath, logoX, 15, { width: logoWidth });
            }

            // Title Line
            doc.fillColor('#1B5E20').fontSize(11).font('Helvetica-Bold');
            const reportTitle = `Center for Research and Development - Weekly Report (${formatDate(startDate)} to ${formatDate(endDate)})`;
            doc.text(reportTitle, 30, 80, { align: 'center', width: pageWidth - 60 });
            
            currentY = 105;

            const infoColsWidth = 25; // S.No
            const nameColWidth = 90;
            const desigColWidth = 80;
            const availableDaySpace = pageWidth - 60 - infoColsWidth - nameColWidth - desigColWidth;
            const dayColWidth = availableDaySpace / dateRange.length;
            const tableActualWidth = pageWidth - 60;

            // Header row background (Dark green)
            doc.rect(30, currentY, tableActualWidth, 30)
               .fillAndStroke('#1B5E20', '#1B5E20');
            
            doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');

            // Header Column Texts
            doc.text('S.No', 30, currentY + 11, { width: infoColsWidth, align: 'center' });
            doc.text('Name', 30 + infoColsWidth, currentY + 11, { width: nameColWidth, align: 'center' });
            doc.text('Designation', 30 + infoColsWidth + nameColWidth, currentY + 11, { width: desigColWidth, align: 'center' });

            dateRange.forEach((date, i) => {
                const x = 30 + infoColsWidth + nameColWidth + desigColWidth + (i * dayColWidth);
                doc.text(formatDate(date), x, currentY + 11, { width: dayColWidth, align: 'center' });
            });

            // Header Bottom Thick Border
            doc.strokeColor('#1B5E20').lineWidth(1)
               .moveTo(30, currentY + 30).lineTo(pageWidth - 30, currentY + 30).stroke();

            return currentY + 30;
        };

        let pageNumber = 1;
        // Footer function for each page
        const drawFooter = (doc) => {
            const footerY = doc.page.height - 30;
            doc.fillColor('#000000').fontSize(9).font('Helvetica');
            doc.text(`Page ${pageNumber}`, 30, footerY, { align: 'center', width: pageWidth - 60 });
            pageNumber++;
        };

        const drawSignatures = (doc) => {
            const sigY = doc.page.height - 60;
            doc.strokeColor('#000000').lineWidth(0.5);
            doc.moveTo(30, sigY - 5).lineTo(200, sigY - 5).stroke();
            doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
            doc.text('Dean, Research and Development', 30, sigY, { align: 'left', lineBreak: false });
            
            doc.moveTo(pageWidth - 200, sigY - 5).lineTo(pageWidth - 30, sigY - 5).stroke();
            doc.text('Principal', pageWidth - 200, sigY, { align: 'right', width: 170, lineBreak: false });
        };

        // Initial Header
        currentY = drawHeader(doc, 0);

        // --- Layout Selection ---
        diffDays = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24));
        const isMonthly = diffDays > 7;

        if (!isMonthly) {
            // --- WEEKLY GRID FORMAT (Existing) ---

            const infoColsWidth = 25;
            const nameColWidth = 90;
            const desigColWidth = 80;
            const availableDaySpace = pageWidth - 60 - infoColsWidth - nameColWidth - desigColWidth;
            const dayColWidth = availableDaySpace / dateRange.length;
            const tableActualWidth = pageWidth - 60;

            staffList.forEach((staff, sIdx) => {
                const rowContents = [];
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

                    // Handle leave override from TaskEntry
                    const leaveTask = dayTasks.find(t => t.leaveType && t.leaveType.trim() !== '');
                    if (leaveTask) {
                        rowContents.push({ type: 'leave', leaveType: leaveTask.leaveType });
                        return;
                    }

                    if (dayLog && dayLog.isLeaveDay) {
                        rowContents.push({ type: 'leave', leaveType: 'Leave' });
                        return;
                    }

                    let items = [];

                    if (dayLog && dayLog.workDone && dayLog.workDone.trim() !== '') {
                        let cleaned = cleanCellText(dayLog.workDone);
                        if (cleaned.length > 3) items.push(cleaned);
                    }
                    
                    dayTasks.forEach(task => {
                        const smartSentence = generateSmartSentence(task);
                        if (smartSentence) {
                            items.push(smartSentence);
                        } else {
                            if (task.paperTitle) items.push(`Paper: ${cleanCellText(String(task.paperTitle))}`);
                            if (task.projectName) items.push(`Project: ${cleanCellText(String(task.projectName))}`);
                            if (task.patentTitle) items.push(`Patent: ${cleanCellText(String(task.patentTitle))}`);
                            if (task.bookTitle) items.push(`Book: ${cleanCellText(String(task.bookTitle))}`);
                            if (task.activityTitle) items.push(`Activity: ${cleanCellText(String(task.activityTitle))}`);
                        }
                    });

                    items = items.filter((v, i, a) => v && a.indexOf(v) === i);
                    rowContents.push(items.length > 0 ? { type: 'text', items } : { type: 'empty' });
                });

                let maxRowHeight = 40; 
                rowContents.forEach(content => {
                    if (content.type === 'text') {
                        let textHeight = 10;
                        if (content.items.length > 0) {
                            content.items.forEach((it, idx) => {
                                textHeight += doc.heightOfString(`${idx + 1}. ${it}`, { width: dayColWidth - 4, size: 7.5 }) + 3;
                            });
                        }
                        if (textHeight + 10 > maxRowHeight) maxRowHeight = textHeight + 10;
                    }
                });

                // Auto-expand row height, do NOT limit to 150. Ensure we trigger page break if it's too big.

                // Page break check
                if (currentY + maxRowHeight > doc.page.height - 80) {
                    drawFooter(doc);
                    doc.addPage();
                    currentY = 50;
                    currentY = drawHeader(doc, currentY);
                }

                const rowColor = (sIdx % 2 === 0) ? '#FFFFFF' : '#EBF5FB'; 
                doc.fillColor(rowColor).rect(30, currentY, tableActualWidth, maxRowHeight).fill();
                doc.strokeColor('#1B5E20').lineWidth(0.3).rect(30, currentY, tableActualWidth, maxRowHeight).stroke();
                
                doc.strokeColor('#cbd5e1').lineWidth(0.3);
                doc.moveTo(30 + infoColsWidth, currentY).lineTo(30 + infoColsWidth, currentY + maxRowHeight).stroke();
                doc.moveTo(30 + infoColsWidth + nameColWidth, currentY).lineTo(30 + infoColsWidth + nameColWidth, currentY + maxRowHeight).stroke();
                doc.moveTo(30 + infoColsWidth + nameColWidth + desigColWidth, currentY).lineTo(30 + infoColsWidth + nameColWidth + desigColWidth, currentY + maxRowHeight).stroke();

                doc.fillColor('#000000');
                const nameY = currentY + (maxRowHeight / 2) - 4.5;
                doc.font('Helvetica').fontSize(8).text(`${sIdx + 1}`, 30, nameY, { width: infoColsWidth, align: 'center' });
                let staffName = staff.name || 'Staff';
                if (!staffName.toLowerCase().startsWith('dr.')) staffName = `Dr. ${staffName}`;
                doc.font('Helvetica-Bold').fontSize(8).text(staffName, 30 + infoColsWidth + 3, nameY, { width: nameColWidth - 6 });
                doc.font('Helvetica').fontSize(7.5).text(`${staff.designation || 'Staff'}\n(${staff.department || 'CFRD'})`, 30 + infoColsWidth + nameColWidth, nameY - 4, { width: desigColWidth, align: 'center' });

                dateRange.forEach((_, i) => {
                    const colX = 30 + infoColsWidth + nameColWidth + desigColWidth + (i * dayColWidth);
                    const content = rowContents[i];
                    if (content.type === 'text') {
                        let itemY = currentY + 7;
                        
                        // Render Research Items
                        content.items.forEach((item, idx) => {
                            const itemHeight = doc.heightOfString(`${idx + 1}. ${item}`, { width: dayColWidth - 4, size: 7.5 });
                            
                            doc.font('Helvetica').fontSize(7.5).text(`${idx + 1}. ${item}`, colX + 2, itemY, { width: dayColWidth - 4 });
                            itemY += itemHeight + 3;
                        });
                    } else if (content.type === 'leave') {
                        doc.fillColor('#fff7ed').rect(colX, currentY, dayColWidth, maxRowHeight).fill();
                        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#f97316').text(content.leaveType, colX + 2, currentY + (maxRowHeight/2) - 4, { width: dayColWidth - 4, align: 'center' });
                        doc.fillColor('#000000');
                    } else {
                        doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#ef4444').text('Not Entered', colX, currentY + (maxRowHeight/2) - 4, { width: dayColWidth, align: 'center' });
                        doc.fillColor('#000000');
                    }
                    doc.strokeColor('#cbd5e1').moveTo(colX, currentY).lineTo(colX, currentY + maxRowHeight).stroke();
                });
                currentY += maxRowHeight;
            });
        } else {
            // --- MONTHLY LIST FORMAT (New) ---
            currentY = 145;
            
            staffList.forEach((staff, sIdx) => {
                // Staff Header Row
                if (currentY + 60 > doc.page.height - 50) { doc.addPage(); currentY = 50; }
                
                doc.fillColor('#fce4ec').rect(30, currentY, pageWidth - 60, 25).fill();
                doc.strokeColor('#000000').lineWidth(0.5).rect(30, currentY, pageWidth - 60, 25).stroke();
                
                let staffName = staff.name || 'Staff';
                if (!staffName.toLowerCase().startsWith('dr.')) staffName = `Dr. ${staffName}`;
                doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10)
                   .text(`${sIdx + 1}. ${staffName} - ${staff.designation || 'Staff'} (${staff.department || 'CFRD'})`, 40, currentY + 7);
                
                currentY += 25;

                // Create a sub-table for dates
                dateRange.forEach((date, dIdx) => {
                    const dayLog = logs.find(l => {
                        const lDate = new Date(l.date);
                        return lDate.getDate() === date.getDate() && lDate.getMonth() === date.getMonth() && lDate.getFullYear() === date.getFullYear() && l.staff.toString() === staff._id.toString();
                    });

                    const dayTasks = tasks.filter(t => {
                        const tDate = new Date(t.date);
                        return tDate.getDate() === date.getDate() && tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear() && t.staff.toString() === staff._id.toString();
                    });

                    let items = [];
                    let workloads = [];

                    if (dayLog && dayLog.isLeaveDay) items = ['Leave'];
                    else {
                        if (dayLog && dayLog.workDone) {
                            let cleaned = cleanCellText(dayLog.workDone);
                            if (cleaned.length > 3) items.push(cleaned);
                        }
                        dayTasks.forEach(task => {
                            const smartSentence = generateSmartSentence(task);
                            if (smartSentence) {
                                items.push(smartSentence);
                            } else {
                                if (task.paperTitle) items.push(`Paper: ${cleanCellText(String(task.paperTitle))}`);
                                if (task.projectName) items.push(`Project: ${cleanCellText(String(task.projectName))}`);
                                if (task.patentTitle) items.push(`Patent: ${cleanCellText(String(task.patentTitle))}`);
                                if (task.bookTitle) items.push(`Book: ${cleanCellText(String(task.bookTitle))}`);
                                if (task.activityTitle) items.push(`Activity: ${cleanCellText(String(task.activityTitle))}`);
                            }

                            for (let i = 1; i <= 5; i++) {
                                const wVal = task[`additionalWorkload${i}`];
                                if (wVal && wVal.trim() !== '') {
                                    workloads.push(cleanCellText(wVal));
                                }
                            }
                        });
                    }

                    if (items.length === 0 && workloads.length === 0) return; 

                    let contentText = items.map((it, i) => items[0] === 'Leave' ? 'LEAVE' : `${i + 1}. ${it}`).join('\n');
                    if (workloads.length > 0 && items[0] !== 'Leave') {
                        contentText += (contentText ? `\n─────────────────────\n` : '') + `Additional Workload:\n` + workloads.map(w => `- ${w}`).join('\n');
                    }
                    const contentHeight = Math.max(20, doc.heightOfString(contentText, { width: pageWidth - 160, size: 8 }) + 10);

                    if (currentY + contentHeight > doc.page.height - 50) {
                        doc.addPage();
                        currentY = 50;
                        // Repeat staff name on new page if continuing
                        doc.fillColor('#fdf2f8').rect(30, currentY, pageWidth - 60, 20).fill();
                        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9).text(`${staffName} (continued...)`, 40, currentY + 5);
                        currentY += 20;
                    }

                    // Draw entry row
                    doc.fillColor(dIdx % 2 === 0 ? '#ffffff' : '#f8fafc').rect(30, currentY, pageWidth - 60, contentHeight).fill();
                    doc.strokeColor('#cbd5e1').lineWidth(0.2).rect(30, currentY, pageWidth - 60, contentHeight).stroke();

                    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8).text(formatDate(date), 40, currentY + 6);
                    
                    if (items[0] === 'Leave') {
                        doc.fillColor('#f97316').text('LEAVE', 110, currentY + 6);
                    } else {
                        doc.fillColor('#334155').font('Helvetica').fontSize(8).text(contentText, 110, currentY + 6, { width: pageWidth - 160 });
                    }

                    currentY += contentHeight;
                });
                
                currentY += 15; // Space between staff members
            });
        }

        // --- ADD ANALYTICS PAGE ---
        doc.addPage();
        currentY = 30;

        doc.fillColor('#ffffff').rect(0, 0, pageWidth, 110).fill();

        // Custom Analytics Header (with logo)
        if (fs.existsSync(logoPath)) {
            const logoWidth = 200;
            const logoX = (pageWidth - logoWidth) / 2;
            doc.image(logoPath, logoX, currentY, { width: logoWidth });
            currentY += 80;
        }

        doc.fillColor('#1B5E20').fontSize(14).font('Helvetica-Bold')
           .text('Weekly Report - Activity Analytics', 30, currentY, { align: 'center', width: pageWidth - 60 });
        currentY += 40;

        // Calculate Analytics Data
        const staffActivityCounts = {};
        const paperStats = { submitted: 0, accepted: 0, published: 0 };
        const departmentCounts = {};

        staffList.forEach(staff => {
            staffActivityCounts[staff._id.toString()] = { name: staff.name, total: 0 };
            if (staff.department && !departmentCounts[staff.department]) {
                departmentCounts[staff.department] = 0;
            }
        });

        tasks.forEach(task => {
            const staffId = task.staff ? task.staff.toString() : null;
            if (staffId && staffActivityCounts[staffId]) {
                staffActivityCounts[staffId].total++;
                
                const staff = staffList.find(s => s._id.toString() === staffId);
                if (staff && staff.department) {
                    departmentCounts[staff.department] = (departmentCounts[staff.department] || 0) + 1;
                }

                if (task.paperTitle) {
                    const status = (task.paperStatus || '').toLowerCase();
                    if (status === 'submitted') paperStats.submitted++;
                    else if (status === 'accepted') paperStats.accepted++;
                    else if (status === 'published') paperStats.published++;
                }
            }
        });

        // 1. Total Activities per Staff (Horizontal Bar Chart)
        doc.fillColor('#EBF5FB').rect(30, currentY, pageWidth - 60, 20).fill();
        doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold').text('Total Activities per Staff Member', 40, currentY + 5);
        currentY += 30;

        const chartX = 180;
        const maxBarWidth = pageWidth - chartX - 60;
        let maxAct = 1;
        Object.values(staffActivityCounts).forEach(s => { if (s.total > maxAct) maxAct = s.total; });

        Object.keys(staffActivityCounts).forEach((staffId, idx) => {
            const data = staffActivityCounts[staffId];
            if (data.total === 0) return; // Skip zero activity for chart

            const barWidth = (data.total / maxAct) * maxBarWidth;
            const rowY = currentY + (idx * 20);

            if (rowY > doc.page.height - 60) {
                drawFooter(doc);
                doc.addPage();
                currentY = 40;
            }

            doc.fillColor('#475569').fontSize(8).font('Helvetica').text(data.name.substring(0, 30), 40, rowY + 5);
            doc.fillColor('#2E7D32').rect(chartX, rowY + 2, barWidth, 12).fill();
            doc.fillColor('#1e293b').fontSize(8).font('Helvetica-Bold').text(data.total, chartX + barWidth + 5, rowY + 5);
        });

        currentY += (Object.keys(staffActivityCounts).filter(id => staffActivityCounts[id].total > 0).length * 20) + 40;

        // 2. Papers Submitted vs Accepted (Bar Chart)
        if (currentY > doc.page.height - 150) { 
            drawFooter(doc);
            doc.addPage(); 
            currentY = 40; 
        }
        
        doc.fillColor('#E8F5E9').rect(30, currentY, pageWidth - 60, 20).fill();
        doc.fillColor('#1B5E20').fontSize(10).font('Helvetica-Bold').text('Papers: Submitted vs Accepted', 40, currentY + 5);
        currentY += 35;

        const stats = [
            { label: 'Submitted', value: paperStats.submitted, color: '#1565C0' },
            { label: 'Accepted', value: paperStats.accepted, color: '#1976D2' },
            { label: 'Published', value: paperStats.published, color: '#1E88E5' }
        ];

        stats.forEach((stat, i) => {
            const barWidth = (stat.value / Math.max(paperStats.submitted + paperStats.accepted + paperStats.published, 1)) * maxBarWidth * 2;
            const rowY = currentY + (i * 25);
            doc.fillColor('#475569').fontSize(9).text(stat.label, 40, rowY + 5);
            doc.fillColor(stat.color).rect(chartX, rowY + 2, Math.max(barWidth, 5), 15).fill();
            doc.fillColor('#1e293b').text(stat.value, chartX + Math.max(barWidth, 5) + 5, rowY + 5);
        });

        currentY += 100;

        // 3. Department-wise Activity Count
        if (currentY > doc.page.height - 150) { 
            drawFooter(doc);
            doc.addPage(); 
            currentY = 40; 
        }

        doc.fillColor('#EBF5FB').rect(30, currentY, pageWidth - 60, 20).fill();
        doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold').text('Department-wise Distribution', 40, currentY + 5);
        currentY += 35;

        Object.keys(departmentCounts).forEach((dept, i) => {
            const count = departmentCounts[dept];
            const barWidth = (count / Math.max(tasks.length, 1)) * maxBarWidth * 2;
            const rowY = currentY + (i * 25);
            doc.fillColor('#475569').fontSize(9).text(dept, 40, rowY + 5);
            doc.fillColor('#00695C').rect(chartX, rowY + 2, Math.max(barWidth, 5), 15).fill();
            doc.fillColor('#1e293b').text(count, chartX + Math.max(barWidth, 5) + 5, rowY + 5);
        });

        // Final Signatures on Analytics Page
        drawSignatures(doc);
        drawFooter(doc);

        doc.end();

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
                    const smartSentence = generateSmartSentence(task);
                    if (smartSentence) {
                        items.push(smartSentence);
                    } else {
                        if (task.paperTitle) items.push(`Paper: ${task.paperTitle}`);
                        if (task.projectName) items.push(`Project: ${task.projectName}`);
                        if (task.patentTitle) items.push(`Patent: ${task.patentTitle}`);
                        if (task.bookTitle) items.push(`Book: ${task.bookTitle}`);
                        if (task.activityTitle) items.push(`Activity: ${task.activityTitle}`);
                        
                        for (let i = 1; i <= 5; i++) {
                            if (task[`additionalWorkload${i}`] && task[`additionalWorkload${i}`].trim() !== '') {
                                items.push(task[`additionalWorkload${i}`].trim());
                            }
                        }
                        
                        if (task.dynamicAnswers && typeof task.dynamicAnswers === 'object') {
                            Object.values(task.dynamicAnswers).forEach(val => {
                                if (val && typeof val === 'string' && val.trim() !== '') {
                                    items.push(val.trim());
                                } else if (Array.isArray(val) && val.length > 0) {
                                    items.push(val.join(', '));
                                }
                            });
                        }
                    }
                });

                items = items.filter((v, i, a) => v && a.indexOf(v) === i);
                const workloads = [];
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

module.exports = { generatePDF, generateExcel, generateAnalyticsPDF };