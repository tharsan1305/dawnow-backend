const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI, { family: 4 });
        console.log('Connected to DB');

        const users = await User.find().select('username email role isActive');
        console.log('Total Users:', users.length);
        users.forEach(u => {
            console.log(`- ${u.username} | Role: ${u.role} | Active: ${u.isActive} | ID: ${u._id}`);
        });

        const admin = await User.findOne({ role: 'admin' });
        if (admin) {
            console.log('Admin user found:', admin.username);
        } else {
            console.log('NO ADMIN USER FOUND');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUsers();
