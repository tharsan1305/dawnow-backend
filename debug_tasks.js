const mongoose = require('mongoose');
const TaskEntry = require('./src/models/TaskEntry');
const User = require('./src/models/User');
require('dotenv').config();

const dns = require('dns');
// Fix for network blocking DB connections
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGO_URI, { family: 4 });
        console.log('Connected to DB');

        const total = await TaskEntry.countDocuments();
        const pending = await TaskEntry.countDocuments({ status: 'pending' });
        const approved = await TaskEntry.countDocuments({ status: 'approved' });
        
        console.log(`Total Tasks: ${total}`);
        console.log(`Pending: ${pending}`);
        console.log(`Approved: ${approved}`);

        const latest = await TaskEntry.find().sort({ createdAt: -1 }).limit(5).populate('staff', 'name');
        console.log('Latest 5 entries:');
        latest.forEach(t => {
            console.log(`- ${t.staff?.name || 'Unknown'} | Date: ${t.date.toISOString()} | Status: ${t.status}`);
            console.log(`  Paper: "${t.paperTitle}", JournalType: "${t.journalType}", Status: "${t.paperStatus}"`);
            console.log(`  Project: "${t.projectName}", ProjectStatus: "${t.projectStatus}"`);
            console.log(`  Workloads: ${t.additionalWorkload1}, ...`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
