require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({}).select('+password');
        console.log(`Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`- Username: ${u.username}, Role: ${u.role}, Active: ${u.isActive}, PasswordHash: ${u.password.substring(0, 10)}...`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUsers();
