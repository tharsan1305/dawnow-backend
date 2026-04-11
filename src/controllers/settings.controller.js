const SystemSetting = require('../models/SystemSetting');
const TaskEntry = require('../models/TaskEntry');

// @desc    Get cutoff time
// @route   GET /api/settings/cutoff-time
const getCutoffTime = async (req, res) => {
    try {
        const setting = await SystemSetting.findOne({ key: 'autoApprovalCutoffTime' });
        res.json({ value: setting ? setting.value : '17:00' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update cutoff time
// @route   PUT /api/settings/cutoff-time
const updateCutoffTime = async (req, res) => {
    try {
        const { value } = req.body;
        const setting = await SystemSetting.findOneAndUpdate(
            { key: 'autoApprovalCutoffTime' },
            { value },
            { upsert: true, new: true }
        );
        res.json(setting);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get holidays
// @route   GET /api/settings/holidays
const getHolidays = async (req, res) => {
    try {
        const setting = await SystemSetting.findOne({ key: 'holidays' });
        res.json(setting ? setting.value : []);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Add holiday
// @route   POST /api/settings/holidays
const addHoliday = async (req, res) => {
    try {
        const holiday = req.body;
        let setting = await SystemSetting.findOne({ key: 'holidays' });
        if (!setting) {
            setting = await SystemSetting.create({ key: 'holidays', value: [] });
        }
        setting.value.push({ ...holiday, id: Date.now().toString() });
        setting.markModified('value');
        await setting.save();
        res.status(201).json(setting.value);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Remove holiday
// @route   DELETE /api/settings/holidays/:id
const deleteHoliday = async (req, res) => {
    try {
        let setting = await SystemSetting.findOne({ key: 'holidays' });
        if (setting) {
            setting.value = setting.value.filter(h => h.id !== req.params.id);
            setting.markModified('value');
            await setting.save();
        }
        res.json(setting ? setting.value : []);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Bulk approve today's pending
// @route   POST /api/settings/bulk-approve-today
const bulkApproveToday = async (req, res) => {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const result = await TaskEntry.updateMany(
            {
                status: 'pending',
                date: { $gte: startOfDay, $lte: endOfDay }
            },
            {
                $set: {
                    status: 'approved',
                    approvalType: 'manual',
                    approvedBy: req.user._id,
                    approvedAt: now
                }
            }
        );
        res.json({ success: true, count: result.modifiedCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getCutoffTime,
    updateCutoffTime,
    getHolidays,
    addHoliday,
    deleteHoliday,
    bulkApproveToday
};
