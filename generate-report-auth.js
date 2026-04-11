#!/usr/bin/env node

/**
 * Generate PDF Report with Authentication
 * This script:
 * 1. Logs in as admin to get auth token
 * 2. Generates a properly formatted PDF report
 * 3. Saves it to: g:\java apache maven file\
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = 'localhost:5000';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'Admin@12345';

// Get current week dates
const now = new Date();
const day = now.getDay();
const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
const monday = new Date(now.setDate(diff));
monday.setHours(0, 0, 0, 0);

const saturday = new Date(monday);
saturday.setDate(monday.getDate() + 5);
saturday.setHours(23, 59, 59, 999);

console.log('\n📊 PDF Report Generator');
console.log('='.repeat(50));
console.log(`📅 Period: ${monday.toLocaleDateString()} to ${saturday.toLocaleDateString()}`);
console.log('='.repeat(50));

// Step 1: Login to get token
console.log('\n🔐 Authenticating...');

const loginData = JSON.stringify({
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD
});

const loginOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
    }
};

const loginReq = http.request(loginOptions, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 200) {
            try {
                const response = JSON.parse(data);
                const token = response.token;
                console.log('✅ Authentication successful');
                
                // Step 2: Generate PDF with token
                generatePDF(token);
            } catch (err) {
                console.error('❌ Error parsing login response:', err.message);
                process.exit(1);
            }
        } else {
            console.error(`❌ Login failed (HTTP ${res.statusCode}):`, data);
            process.exit(1);
        }
    });
});

loginReq.on('error', (error) => {
    console.error(`❌ Login request error: ${error.message}`);
    console.error('Make sure the backend server is running on port 5000');
    process.exit(1);
});

loginReq.write(loginData);
loginReq.end();

// Generate PDF
function generatePDF(token) {
    console.log('\n📝 Generating PDF report...');

    const query = new URLSearchParams({
        from: monday.toISOString(),
        to: saturday.toISOString()
    });

    const pdfOptions = {
        hostname: 'localhost',
        port: 5000,
        path: `/api/reports/pdf?${query.toString()}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/pdf'
        }
    };

    const pdfReq = http.request(pdfOptions, (res) => {
        if (res.statusCode !== 200) {
            console.error(`❌ PDF Generation failed (HTTP ${res.statusCode})`);
            let errorData = '';
            res.on('data', chunk => errorData += chunk);
            res.on('end', () => {
                console.error('Response:', errorData);
                process.exit(1);
            });
            return;
        }

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().split('T')[0] + '_' + 
                         new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        const filename = `CFRD-Weekly-Report_${timestamp}.pdf`;
        const outputDir = 'g:\\java apache maven file';
        
        // Ensure directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const outputPath = path.join(outputDir, filename);

        const file = fs.createWriteStream(outputPath);
        res.pipe(file);

        file.on('finish', () => {
            file.close();
            const stats = fs.statSync(outputPath);
            console.log('\n✅ PDF Generated Successfully!');
            console.log('📁 Location:', outputPath);
            console.log('📏 Size:', (stats.size / 1024).toFixed(2), 'KB');
            console.log('\n' + '='.repeat(50));
            process.exit(0);
        });

        file.on('error', (err) => {
            fs.unlink(outputPath, () => {});
            console.error(`❌ Error writing file: ${err.message}`);
            process.exit(1);
        });
    });

    pdfReq.on('error', (error) => {
        console.error(`❌ PDF request error: ${error.message}`);
        process.exit(1);
    });

    pdfReq.end();
}
