require('dotenv').config();
const mongoose = require('mongoose');
const Document = require('./src/models/Document');

const checkDocs = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const docs = await Document.find().populate('staff', 'name staffId');
        console.log(`Found ${docs.length} documents.`);
        docs.forEach(d => {
            console.log(`- Title: ${d.title}, Path: ${d.filePath}, Staff: ${d.staff?.name} (${d.staff?.staffId})`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkDocs();
