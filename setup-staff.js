const mongoose = require('mongoose');
require('dotenv').config();
const dns = require('dns');

// Fix for network blocking
dns.setServers(['8.8.8.8', '8.8.4.4']);

const User = require('./src/models/User');
const TaskEntry = require('./src/models/TaskEntry');
const bcrypt = require('bcryptjs');

const staffListData = [
  { name: 'Dr. T. Arun Kumar', department: 'CFRD', username: 'arun', staffId: 'CFRD-01' },
  { name: 'Dr. A. Surendar', department: 'CFRD', username: 'surendar', staffId: 'CFRD-02' },
  { name: 'Mr. P. Tharsan', department: 'CFRD', username: 'tharsan', staffId: 'CFRD-03' }
];

async function seedAndClean() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // 1. Delete admin's fake reports ("the nexoracrew")
    // Let's find CFRD Administrator user
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
        console.log('Found admin ID:', adminUser._id);
        const { deletedCount } = await TaskEntry.deleteMany({ staff: adminUser._id });
        console.log(`Deleted ${deletedCount} reports submitted incorrectly by CFRD Administrator.`);
    }

    // 2. We don't overwrite if staff users already exist! But let's check.
    for (const s of staffListData) {
        const exists = await User.findOne({ username: s.username });
        if (!exists) {
            console.log(`Creating account for ${s.username}...`);
            await User.create({
                ...s,
                email: `${s.username}@jjcet.ac.in`,
                password: `${s.username}@123`,
                role: 'staff'
            });
        } else {
            console.log(`Account ${s.username} already exists.`);
            // if role is not staff, fix it
            if(exists.role !== 'staff') {
                exists.role = 'staff';
                await exists.save();
                console.log(`Updated role to staff for ${s.username}`);
            }
        }
    }
    
    // Also delete exactly "the nexoracrew" as requested just in case
    const nexoraRes = await TaskEntry.deleteMany({
       $or: [
           { 'summaryCorrection': { $regex: /nexoracrew/i } },
           { 'activityTitle': { $regex: /nexoracrew/i } }
       ] 
    });
    console.log(`Deleted additional nexoracrew entries: ${nexoraRes.deletedCount}`);

    console.log('Done.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

seedAndClean();
