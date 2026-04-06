require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({}).select('+password');
        const info = users.map(u => ({
            username: u.username,
            role: u.role,
            isActive: u.isActive,
            passwordHashExists: !!u.password
        }));
        console.log(JSON.stringify(info, null, 2));
        process.exit(0);
    } catch (err) {
        process.error(err);
        process.exit(1);
    }
}
checkUsers();
