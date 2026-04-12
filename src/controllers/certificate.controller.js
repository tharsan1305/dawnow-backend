const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const TaskEntry = require('../models/TaskEntry');
const User = require('../models/User');
const Certificate = require('../models/Certificate');

// @desc    Generate or get existing certificate
// @route   GET /api/certificates/:staffId/:month/:year
const getMonthlyCertificate = async (req, res) => {
    try {
        const { staffId, month, year } = req.params;
        const staff = await User.findById(staffId);
        if (!staff) return res.status(404).json({ message: 'Staff not found' });

        // Check if exists
        let cert = await Certificate.findOne({ staff: staffId, month: parseInt(month), year: parseInt(year) });
        
        if (cert) {
            const filePath = path.join(__dirname, '../../', cert.pdfPath);
            if (fs.existsSync(filePath)) {
                return res.download(filePath, `Certificate_${staff.name.replace(/\s/g, '_')}_${month}_${year}.pdf`);
            }
        }

        // Generate new
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of month
        
        const tasks = await TaskEntry.find({
            staff: staffId,
            date: { $gte: startDate, $lte: endDate },
            status: 'approved'
        });

        const stats = {
            workingDays: 26, // Can be dynamic, but user suggested 'out of 6 working days' (Wait, 6 per week?)
            submittedDays: 0,
            papers: 0,
            projects: 0,
            patents: 0,
            books: 0
        };

        const uniqueDays = new Set();
        tasks.forEach(t => {
            uniqueDays.add(new Date(t.date).toDateString());
            if (t.paperTitle) stats.papers++;
            if (t.projectName) stats.projects++;
            if (t.patentTitle) stats.patents++;
            if (t.bookTitle) stats.books++;
        });
        
        stats.submittedDays = uniqueDays.size;

        // Simple Rating logic
        let rating = 'Poor';
        const percent = (stats.submittedDays / stats.workingDays) * 100;
        if (percent >= 90) rating = 'Excellent';
        else if (percent >= 75) rating = 'Good';
        else if (percent >= 50) rating = 'Average';

        // Ensure directories exist
        const certsDir = path.join(__dirname, '../../uploads/certificates');
        if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

        const fileName = `cert_${staffId}_${month}_${year}.pdf`;
        const filePath = path.join(certsDir, fileName);
        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        // Pipe its output to a file
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // --- PDF Generation ---
        
        // Header
        doc.fillColor('#16a34a').fontSize(24).text('CENTER FOR RESEARCH AND DEVELOPMENT', { align: 'center' });
        doc.fillColor('#1f2937').fontSize(18).text('JJ COLLEGE OF ENGINEERING AND TECHNOLOGY', { align: 'center' });
        doc.moveDown(1.5);
        
        doc.fillColor('#1f2937').fontSize(20).text('MONTHLY PERFORMANCE CERTIFICATE', { align: 'center', underline: true });
        doc.moveDown();
        
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        doc.fontSize(14).text(`Month: ${monthNames[month - 1]} ${year}`, { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(16).text('This is to certify that ', { continued: true })
           .font('Helvetica-Bold').text(`${staff.name}`);
        
        doc.font('Helvetica').fontSize(14).moveDown(0.5);
        doc.text(`Department: ${staff.department} | Designation: ${staff.designation || 'Staff Member'}`);
        doc.moveDown();
        
        doc.text(`has successfully submitted research reports for `);
        doc.font('Helvetica-Bold').text(`${stats.submittedDays} out of ${stats.workingDays} working days`, { continued: true });
        doc.font('Helvetica').text(` in ${monthNames[month - 1]} ${year}.`);
        
        doc.moveDown(2);
        doc.fontSize(16).font('Helvetica-Bold').text('Research Activities:');
        doc.font('Helvetica').fontSize(14).moveDown(0.5);
        doc.text(`- Papers Submitted: ${stats.papers}`);
        doc.text(`- Projects: ${stats.projects}`);
        doc.text(`- Patents Filed: ${stats.patents}`);
        doc.text(`- Book Chapters: ${stats.books}`);
        
        doc.moveDown(2);
        doc.fontSize(16).text('Performance Rating: ', { continued: true })
           .font('Helvetica-Bold').fillColor(rating === 'Excellent' || rating === 'Good' ? '#16a34a' : (rating === 'Average' ? '#f59e0b' : '#dc2626'))
           .text(rating);
        
        doc.moveDown(4);
        
        const bottomY = doc.y;
        doc.fillColor('#1f2937').font('Helvetica').fontSize(12).text('_________________', 100, bottomY);
        doc.text('Dean, R&D', 115, bottomY + 15);
        
        doc.text('_________________', 400, bottomY);
        doc.text('Principal', 425, bottomY + 15);

        // Finalize PDF file
        doc.end();

        writeStream.on('finish', async () => {
            // Save to DB
            cert = await Certificate.create({
                staff: staffId,
                month,
                year,
                stats,
                rating,
                pdfPath: `uploads/certificates/${fileName}`
            });
            res.download(filePath, `Certificate_${staff.name.replace(/\s/g, '_')}_${monthNames[month-1]}.pdf`);
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getMonthlyCertificate };
