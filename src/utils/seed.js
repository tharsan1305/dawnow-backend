require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const Question = require('../models/Question');
const connectDB = require('../config/db');

const seed = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        // Check if admin already exists
        const adminExists = await User.findOne({ username: process.env.ADMIN_USERNAME });

        if (adminExists) {
            console.log('Admin user already exists. Skipping seed.');
        } else {
            // Create admin user
            const adminUser = await User.create({
                name: 'CFRD Administrator',
                staffId: 'ADMIN-001',
                department: 'Administration',
                designation: 'System Administrator',
                email: process.env.ADMIN_EMAIL || 'admin@jjcet.ac.in',
                username: process.env.ADMIN_USERNAME || 'admin',
                password: process.env.ADMIN_PASSWORD || 'Admin@12345',
                role: 'admin',
                isActive: true,
                joinDate: new Date()
            });

            console.log('Admin user created successfully:');
            console.log(`  Username: ${adminUser.username}`);
            console.log(`  Password: ${process.env.ADMIN_PASSWORD || 'Admin@12345'}`);
        }

        // Seed default questions
        const questionsCount = await Question.countDocuments();

        if (questionsCount === 0) {
            const defaultQuestions = [
                { text: 'Number of journal publications this month', answerType: 'number', category: 'Research', order: 1 },
                { text: 'Number of conference papers presented', answerType: 'number', category: 'Research', order: 2 },
                { text: 'Number of students guided for projects', answerType: 'number', category: 'Teaching', order: 3 },
                { text: 'Number of workshops/seminars attended', answerType: 'number', category: 'Other', order: 4 },
                { text: 'Any administrative responsibilities completed?', answerType: 'yesno', category: 'Administrative', order: 5 },
                { text: 'Any community service activities?', answerType: 'yesno', category: 'Other', order: 6 }
            ];

            await Question.insertMany(defaultQuestions);
            console.log('Default questions seeded successfully');
        } else {
            console.log('Questions already exist. Skipping question seed.');
        }

        // Seed default ScoreRules
        const ScoreRule = require('../models/ScoreRule');
        const rulesCount = await ScoreRule.countDocuments();

        if (rulesCount === 0) {
            const defaultRules = [
                { label: "SCI Paper Published", activity: "paper_sci", points: 10, description: "SCI Paper Published" },
                { label: "Scopus Paper Published", activity: "paper_scopus", points: 7, description: "Scopus Paper Published" },
                { label: "Paper Published (Other)", activity: "paper_published", points: 5, description: "Paper Published (other)" },
                { label: "Paper Submitted", activity: "paper_submitted", points: 1, description: "Paper Submitted" },
                { label: "Patent Granted", activity: "patent_granted", points: 15, description: "Patent Granted" },
                { label: "Patent Filed", activity: "patent_filed", points: 5, description: "Patent Filed" },
                { label: "Funded Project Granted", activity: "funded_granted", points: 12, description: "Funded Project Granted" },
                { label: "Funded Project Submitted", activity: "funded_submitted", points: 2, description: "Funded Project Submitted" },
                { label: "Book Published", activity: "book_published", points: 8, description: "Book Published" },
                { label: "FDP/Workshop Attended", activity: "fdp_attended", points: 2, description: "FDP/Workshop Attended" },
                { label: "Guest Lecture Delivered", activity: "guest_lecture", points: 3, description: "Guest Lecture Delivered" },
                { label: "Conference Organized", activity: "conference_organized", points: 5, description: "Conference Organized" },
                { label: "Acted as Keynote Speaker", activity: "keynote", points: 4, description: "Keynote Speaker" }
            ];

            await ScoreRule.insertMany(defaultRules);
            console.log('Default score rules seeded successfully');
        } else {
            console.log('Score rules already exist. Skipping score rules seed.');
        }

        console.log('\nSeed completed successfully!');
        console.log('You can now start the server with: npm run dev');

        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error.message);
        process.exit(1);
    }
};

seed();
