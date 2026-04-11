require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const DailyLog = require('./src/models/DailyLog');
const connectDB = require('./src/config/db');

const clearData = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');
        
        await User.deleteMany({ role: 'staff' });
        await DailyLog.deleteMany({});
        
        console.log('✅ Cleared all staff and daily logs');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

clearData();
