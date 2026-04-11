const express = require('express');
const router = express.Router();
const {
    getCutoffTime,
    updateCutoffTime,
    getHolidays,
    addHoliday,
    deleteHoliday,
    bulkApproveToday
} = require('../controllers/settings.controller');
const { protect, isAdmin } = require('../middleware/auth');

router.use(protect);

router.get('/cutoff-time', getCutoffTime);
router.put('/cutoff-time', isAdmin, updateCutoffTime);

router.get('/holidays', getHolidays);
router.post('/holidays', isAdmin, addHoliday);
router.delete('/holidays/:id', isAdmin, deleteHoliday);

router.post('/bulk-approve-today', isAdmin, bulkApproveToday);

module.exports = router;
