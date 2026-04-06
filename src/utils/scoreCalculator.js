const ScoreRule = require('../models/ScoreRule');

const calculateTaskScore = async (task) => {
    const rules = await ScoreRule.find({ isActive: true });
    let totalPoints = 0;

    const getPoints = (key) => {
        const rule = rules.find(r => r.activity === key);
        return rule ? rule.points : 0;
    };

    // --- NEW SCHEMA LOGIC ---

    // Papers
    if (task.paperTitle && task.paperTitle.trim() !== '') {
        const status = (task.paperStatus || '').toLowerCase();
        const jType = (task.journalType || '').toUpperCase();

        if (status === 'published' || status.includes('accept')) {
            if (jType.includes('SCI')) totalPoints += getPoints('paper_sci');
            else if (jType.includes('SCOPUS')) totalPoints += getPoints('paper_scopus');
            else totalPoints += getPoints('paper_published');
        } else if (status === 'submitted' || status.includes('review')) {
            totalPoints += getPoints('paper_submitted');
        }
    }

    // Projects
    if (task.projectName && task.projectName.trim() !== '') {
        const pStatus = (task.projectStatus || '').toLowerCase();
        if (pStatus === 'granted' || pStatus === 'ongoing' || pStatus === 'completed') {
            totalPoints += getPoints('funded_granted');
        } else if (pStatus === 'submitted') {
            totalPoints += getPoints('funded_submitted');
        }
    }

    // Patents
    if (task.patentTitle && task.patentTitle.trim() !== '') {
        // Assume granted if filed? Or check specific status if added.
        // For now, if a title exists, we award filed points.
        totalPoints += getPoints('patent_filed');
    }

    // Books
    if (task.bookTitle && task.bookTitle.trim() !== '') {
        const bStatus = (task.bookStatus || '').toLowerCase();
        if (bStatus === 'published' || bStatus === 'completed') {
            totalPoints += getPoints('book_published');
        }
    }

    // Activities
    if (task.activityTitle && task.activityTitle.trim() !== '') {
        const act = task.activityType || '';
        if (act.includes('FDP') || act.includes('Workshop')) {
            totalPoints += getPoints('fdp_attended');
        } else if (act.includes('Guest Lecture')) {
            totalPoints += getPoints('guest_lecture');
        } else if (act.includes('Conference')) {
            totalPoints += getPoints('conference_organized');
        } else if (act.includes('Keynote')) {
            totalPoints += getPoints('keynote');
        }
    }

    // --- OLD SCHEMA FALLBACK (Only if new fields are missing) ---
    if (totalPoints === 0) {
        if (task.papers && Array.isArray(task.papers)) {
            task.papers.forEach(paper => {
                if (paper.published) {
                    if (paper.isSCI) totalPoints += getPoints('paper_sci');
                    else if (paper.isScopus) totalPoints += getPoints('paper_scopus');
                    else totalPoints += getPoints('paper_published');
                } else if (paper.submitted) {
                    totalPoints += getPoints('paper_submitted');
                }
            });
        }

        if (task.funded && Array.isArray(task.funded)) {
            task.funded.forEach(f => {
                if (f.gotGranted) totalPoints += getPoints('funded_granted');
                else if (f.submitted) totalPoints += getPoints('funded_submitted');
            });
        }

        if (task.patents && Array.isArray(task.patents)) {
            task.patents.forEach(p => {
                if (p.granted) totalPoints += getPoints('patent_granted');
                else if (p.filed) totalPoints += getPoints('patent_filed');
            });
        }

        if (task.books && Array.isArray(task.books)) {
            task.books.forEach(b => {
                if (b.published) totalPoints += getPoints('book_published');
            });
        }
    }

    return totalPoints;
};

module.exports = { calculateTaskScore };
