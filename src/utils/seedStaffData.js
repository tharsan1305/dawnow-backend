require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const DailyLog = require('../models/DailyLog');
const connectDB = require('../config/db');

const seedStaffData = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        // Clear old data first
        await User.deleteMany({ role: 'staff' });
        await DailyLog.deleteMany({});
        console.log('✅ Cleared old data');
        
        // Create sample staff members
            const staffMembers = [
                {
                    name: 'Dr. Rajesh Kumar',
                    staffId: 'STAFF-001',
                    department: 'Computer Science',
                    designation: 'Associate Professor',
                    email: 'rajesh@jjcet.ac.in',
                    username: 'rajesh.kumar',
                    password: 'Staff@12345',
                    role: 'staff',
                    isActive: true,
                    joinDate: new Date()
                },
                {
                    name: 'Dr. Priya Singh',
                    staffId: 'STAFF-002',
                    department: 'Electronics',
                    designation: 'Assistant Professor',
                    email: 'priya@jjcet.ac.in',
                    username: 'priya.singh',
                    password: 'Staff@12345',
                    role: 'staff',
                    isActive: true,
                    joinDate: new Date()
                },
                {
                    name: 'Dr. Amit Patel',
                    staffId: 'STAFF-003',
                    department: 'Mechanical',
                    designation: 'Associate Professor',
                    email: 'amit@jjcet.ac.in',
                    username: 'amit.patel',
                    password: 'Staff@12345',
                    role: 'staff',
                    isActive: true,
                    joinDate: new Date()
                }
            ];

            const createdStaff = await User.insertMany(staffMembers);
            console.log(`✅ Created ${createdStaff.length} staff members`);

            // Create sample daily logs for current week
            const now = new Date();
            // Set to Friday 06.04.2026 start
            const friday = new Date(2026, 3, 6); // April 6, 2026 (Friday)
            friday.setHours(0, 0, 0, 0);

            const dailyLogs = [];
            
            for (let staffIdx = 0; staffIdx < createdStaff.length; staffIdx++) {
                const staff = createdStaff[staffIdx];
                
                // Create logs for 6 days (Friday to Wednesday)
                for (let i = 0; i < 6; i++) {
                    const logDate = new Date(friday);
                    logDate.setDate(logDate.getDate() + i);

                    const activities = [
                        'Paper entitled "Check for Circular Dependencies" has been Revision to the SCI indexed journal "123" which has the impact factor of "".',
                        'Funded project entitled "It sounds silly, but since nodemon is watching your files, ensure both the controller and the route files are saved."',
                        'Prepared a "Filed" patent entitled "3. Watch for Typos (Case Sensitivity)" of application No."2430" with page No."" under Indian Patent Publication.',
                        '"THE HEXORACTE W" - The error ReferenceError: generateStaffSummaryPDF is not defined means that while you are trying to use that function in your routes file, the Java...',
                        'Paper entitled "hello" has been Revision to the SCI indexed journal with impact factor.',
                        'Funded project entitled "currendre skills" to "bubble" for grant of Rs."" (Status: Approved).'
                    ];

                    dailyLogs.push({
                        staff: staff._id,
                        date: logDate,
                        workDone: activities[Math.floor(Math.random() * activities.length)],
                        isLeaveDay: false
                    });
                }
            }

            await DailyLog.insertMany(dailyLogs);
            console.log(`✅ Created ${dailyLogs.length} daily log entries`);
            console.log('\n✅ Sample data seeded successfully!');
        } else {
            console.log(`ℹ️  Staff members already exist (${staffCount} found)`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error.message);
        process.exit(1);
    }
};

seedStaffData();
