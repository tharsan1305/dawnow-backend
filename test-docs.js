const axios = require('axios');
require('dotenv').config();

const test = async () => {
    try {
        // We'll need a token. I'll try to find one or simulate a request.
        // Actually, I'll just check the database directly to see what Document.find() returns.
        const mongoose = require('mongoose');
        await mongoose.connect(process.env.MONGODB_URI);
        const Document = require('./src/models/Document');
        const docs = await Document.find().populate('staff', 'name department staffId');
        console.log('Is Array:', Array.isArray(docs));
        console.log('Length:', docs.length);
        console.log('First Item (keys):', docs[0] ? Object.keys(docs[0].toObject()) : 'None');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

test();
