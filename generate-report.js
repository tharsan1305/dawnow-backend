#!/usr/bin/env node

/**
 * Generate Weekly PDF Report
 * Run this script to generate a properly formatted PDF report
 * Outputs to: g:\java apache maven file\CFRD-Weekly-Report_*.pdf
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Get date range (current week: Monday to Saturday)
const now = new Date();
const day = now.getDay();
const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
const monday = new Date(now.setDate(diff));
monday.setHours(0, 0, 0, 0);

const saturday = new Date(monday);
saturday.setDate(monday.getDate() + 5);
saturday.setHours(23, 59, 59, 999);

const from = monday.toISOString();
const to = saturday.toISOString();

console.log('📊 Generating PDF Report...');
console.log(`📅 Date Range: ${monday.toLocaleDateString()} to ${saturday.toLocaleDateString()}`);

// Build query URL
const query = new URLSearchParams({
    from: from,
    to: to
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: `/api/reports/pdf?${query.toString()}`,
    method: 'GET',
    headers: {
        // You may need to add auth token if required
        'Authorization': `Bearer ${process.env.AUTH_TOKEN || ''}`
    }
};

const req = http.request(options, (res) => {
    if (res.statusCode !== 200) {
        console.error(`❌ Error: HTTP ${res.statusCode}`);
        console.error('Response:', res.headers);
        return;
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `CFRD-Weekly-Report_${timestamp}.pdf`;
    const outputPath = path.join('g:\\java apache maven file', filename);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const file = fs.createWriteStream(outputPath);
    res.pipe(file);

    file.on('finish', () => {
        file.close();
        console.log(`✅ PDF Generated Successfully!`);
        console.log(`📁 Location: ${outputPath}`);
        console.log(`📏 Size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
        process.exit(0);
    });

    file.on('error', (err) => {
        fs.unlink(outputPath, () => {}); // Delete on error
        console.error(`❌ Error writing file: ${err.message}`);
        process.exit(1);
    });
});

req.on('error', (error) => {
    console.error(`❌ Request Error: ${error.message}`);
    console.error('Make sure the backend server is running on port 5000');
    process.exit(1);
});

req.end();
