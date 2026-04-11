const mongoose = require('mongoose');
require('dotenv').config();
const dns = require('dns');

// Fix for network blocking DB connections
dns.setServers(['8.8.8.8', '8.8.4.4']);

const TaskEntry = require('./src/models/TaskEntry');

const garbagePhrases = [
  'Copy this prompt', 'ChatGPT', 'Copilot', 'Ethan submits',
  'FINAL UNDERSTANDING', 'HOW TO USE THIS', 'frontend download button fix',
  'Full HTML template', 'upgrade your full system', 'add analytics page like last page',
  'exact report system', 'perfect prompt', 'paste into',
  'NEXORACTE', 'ReferenceError', 'sneaky ones',
  'RESULT YOU WILL GET', 'Got you da', "I'll upgrade",
  'appears in row', 'next level', 'Admin clicks generate',
  '24SC043', '24sc043', 'proper table + styling',
  'It sounds silly, but since nodemon',
  'Write and execute a backend script',
  'FIX 2 — PDF content not getting cut',
  'getCellText function',
  'rowPageBreak',
  'slice(0, 4)'
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    const tasks = await TaskEntry.find({});
    let deletedCount = 0;
    
    for (const task of tasks) {
      const text = JSON.stringify(task).toLowerCase();
      let isGarbage = false;
      
      for (const phrase of garbagePhrases) {
        if (text.includes(phrase.toLowerCase())) {
          isGarbage = true;
          break;
        }
      }
      
      const summary = task.summaryCorrection || '';
      const activity = task.activityTitle || '';
      
      if (!isGarbage && summary.trim().length > 0 && summary.trim().length < 8) isGarbage = true;
      if (!isGarbage && activity.trim().length > 0 && activity.trim().length < 8) isGarbage = true;
      
      if (isGarbage) {
        await TaskEntry.findByIdAndDelete(task._id);
        deletedCount++;
      }
    }
    console.log(`Deleted ${deletedCount} garbage tasks`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
