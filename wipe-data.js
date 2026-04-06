const mongoose = require('mongoose');
require('dotenv').config();

const wipeData = async () => {
    try {
        console.log('--- Database Cleanup Started ---');
        console.log('Connecting to:', process.env.MONGODB_URI.split('@')[1] || 'DB');
        
        await mongoose.connect(process.env.MONGODB_URI);

        const collections = [
            { name: 'TaskEntry', model: require('./src/models/TaskEntry') },
            { name: 'DailyLog', model: require('./src/models/DailyLog') },
            { name: 'Document', model: require('./src/models/Document') },
            { name: 'Notification', model: require('./src/models/Notification') },
            { name: 'PwdRequest', model: require('./src/models/PwdRequest') },
            // Add any other activity models here
        ];

        for (const col of collections) {
            const count = await col.model.countDocuments();
            await col.model.deleteMany({});
            console.log(`✅ Deleted ${count} records from ${col.name}`);
        }

        // --- Clear physical files ---
        const fs = require('fs');
        const path = require('path');
        const uploadDirs = [
            path.join(__dirname, 'uploads', 'pdfs'),
            path.join(__dirname, 'uploads', 'documents'),
            path.join(__dirname, 'uploads'), // Root uploads
        ];

        uploadDirs.forEach(dir => {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                files.forEach(file => {
                    const filePath = path.join(dir, file);
                    if (fs.lstatSync(filePath).isFile()) {
                        fs.unlinkSync(filePath);
                        console.log(`🗑️ Deleted file: ${file}`);
                    }
                });
            }
        });

        console.log('\n--- CLEANUP COMPLETE ---');
        console.log('Note: User accounts (Admin/Staff) were preserved.');
        process.exit(0);
    } catch (err) {
        console.error('Cleanup Failed:', err.message);
        process.exit(1);
    }
};

wipeData();
