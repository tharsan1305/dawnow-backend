/**
 * Seed Script for Sample Questions
 * Run: node src/utils/seedQuestions.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Question = require('../models/Question');

const sampleQuestions = [
    // Paper Section
    {
        questionText: 'Paper Title',
        type: 'text',
        section: 'paper',
        label: 'Paper Title',
        placeholder: 'Enter the paper title',
        required: true,
        order: 1,
        isActive: true
    },
    {
        questionText: 'Journal/Conference Name',
        type: 'text',
        section: 'paper',
        label: 'Journal/Conference',
        placeholder: 'Enter journal or conference name',
        required: true,
        order: 2,
        isActive: true
    },
    {
        questionText: 'Paper Status',
        type: 'mcq',
        section: 'paper',
        label: 'Status',
        options: ['Under Review', 'Revision', 'Accepted', 'Published'],
        required: true,
        order: 3,
        isActive: true
    },
    {
        questionText: 'Impact Factor',
        type: 'number',
        section: 'paper',
        label: 'Impact Factor',
        placeholder: 'Enter journal impact factor',
        required: false,
        order: 4,
        isActive: true
    },

    // Project Section
    {
        questionText: 'Project Title',
        type: 'text',
        section: 'project',
        label: 'Project Title',
        placeholder: 'Enter project title',
        required: true,
        order: 1,
        isActive: true
    },
    {
        questionText: 'Funding Agency',
        type: 'text',
        section: 'project',
        label: 'Funding Agency',
        placeholder: 'Enter funding agency name',
        required: true,
        order: 2,
        isActive: true
    },
    {
        questionText: 'Grant Amount (in Lakhs)',
        type: 'number',
        section: 'project',
        label: 'Grant Amount',
        placeholder: 'Enter amount in lakhs',
        required: true,
        order: 3,
        isActive: true
    },
    {
        questionText: 'Project Status',
        type: 'mcq',
        section: 'project',
        label: 'Status',
        options: ['Sanctioned', 'In Progress', 'Completed', 'Extended'],
        required: true,
        order: 4,
        isActive: true
    },

    // Patent Section
    {
        questionText: 'Patent Title',
        type: 'text',
        section: 'patent',
        label: 'Patent Title',
        placeholder: 'Enter patent title',
        required: true,
        order: 1,
        isActive: true
    },
    {
        questionText: 'Patent Application Number',
        type: 'text',
        section: 'patent',
        label: 'Application No.',
        placeholder: 'Enter application number',
        required: false,
        order: 2,
        isActive: true
    },
    {
        questionText: 'Patent Type',
        type: 'mcq',
        section: 'patent',
        label: 'Type',
        options: ['Design', 'Utility', 'Provisional'],
        required: true,
        order: 3,
        isActive: true
    },

    // Book Section
    {
        questionText: 'Book Title',
        type: 'text',
        section: 'book',
        label: 'Book Title',
        placeholder: 'Enter book title',
        required: true,
        order: 1,
        isActive: true
    },
    {
        questionText: 'Publisher Name',
        type: 'text',
        section: 'book',
        label: 'Publisher',
        placeholder: 'Enter publisher name',
        required: true,
        order: 2,
        isActive: true
    },
    {
        questionText: 'ISBN Number',
        type: 'text',
        section: 'book',
        label: 'ISBN',
        placeholder: 'Enter ISBN number',
        required: false,
        order: 3,
        isActive: true
    },

    // Activity Section
    {
        questionText: 'Activity Type',
        type: 'mcq',
        section: 'activity',
        label: 'Type',
        options: ['FDP', 'Workshop', 'Seminar', 'Conference', 'Guest Lecture', 'Webinar'],
        required: true,
        order: 1,
        isActive: true
    },
    {
        questionText: 'Activity Name',
        type: 'text',
        section: 'activity',
        label: 'Name',
        placeholder: 'Enter activity name',
        required: true,
        order: 2,
        isActive: true
    },
    {
        questionText: 'Organizer',
        type: 'text',
        section: 'activity',
        label: 'Organizer',
        placeholder: 'Who organized this activity?',
        required: true,
        order: 3,
        isActive: true
    },
    {
        questionText: 'Role',
        type: 'mcq',
        section: 'activity',
        label: 'Your Role',
        options: ['Participant', 'Organizer', 'Resource Person', 'Chairperson', 'Keynote Speaker'],
        required: true,
        order: 4,
        isActive: true
    },
    {
        questionText: 'Is this an international event?',
        type: 'yesno',
        section: 'activity',
        label: 'International?',
        required: true,
        order: 5,
        isActive: true
    },

    // Additional Section
    {
        questionText: 'Any other achievements or activities this month?',
        type: 'textarea',
        section: 'additional',
        label: 'Other Achievements',
        placeholder: 'Describe any other achievements or activities...',
        required: false,
        order: 1,
        isActive: true
    },
    {
        questionText: 'Publications this month',
        type: 'number',
        section: 'additional',
        label: 'Publication Count',
        placeholder: '0',
        required: false,
        order: 2,
        isActive: true
    },
    {
        questionText: 'Student guidance/mentoring',
        type: 'textarea',
        section: 'additional',
        label: 'Student Mentorship',
        placeholder: 'List students mentored or guided...',
        required: false,
        order: 3,
        isActive: true
    },
    {
        questionText: 'Administrative responsibilities completed',
        type: 'checkbox',
        section: 'additional',
        label: 'Admin Tasks',
        options: ['Department Duties', 'Committee Work', 'Examination Duties', 'Admission Duties', 'Research Cell Duties'],
        required: false,
        order: 4,
        isActive: true
    },

    // General Section
    {
        questionText: 'Working from home?',
        type: 'yesno',
        section: 'general',
        label: 'WFH',
        required: false,
        order: 1,
        isActive: true
    },
    {
        questionText: 'Leave taken this month',
        type: 'number',
        section: 'general',
        label: 'Leave Days',
        placeholder: '0',
        required: false,
        order: 2,
        isActive: true
    },
    {
        questionText: 'Any concerns or suggestions?',
        type: 'textarea',
        section: 'general',
        label: 'Suggestions',
        placeholder: 'Share your concerns or suggestions...',
        required: false,
        order: 3,
        isActive: true
    }
];

async function seedQuestions() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dawnow';
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Clear existing questions
        console.log('Clearing existing questions...');
        await Question.deleteMany({});

        // Insert sample questions
        console.log('Inserting sample questions...');
        const insertedQuestions = await Question.insertMany(sampleQuestions);
        console.log(`Successfully inserted ${insertedQuestions.length} questions`);

        // Group by section for display
        const grouped = {};
        insertedQuestions.forEach(q => {
            if (!grouped[q.section]) {
                grouped[q.section] = [];
            }
            grouped[q.section].push(q.label || q.questionText);
        });

        console.log('\nQuestions by section:');
        Object.entries(grouped).forEach(([section, questions]) => {
            console.log(`\n${section.toUpperCase()} (${questions.length}):`);
            questions.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
        });

        console.log('\n✅ Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding questions:', error);
        process.exit(1);
    }
}

seedQuestions();
