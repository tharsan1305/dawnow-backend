const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Send a message
// @route   POST /api/messages
// @access  Private (Staff/Admin)
const sendMessage = async (req, res) => {
    try {
        const { receiverId, message } = req.body;
        const senderId = req.user._id;
        const senderRole = req.user.role;

        const newMessage = await Message.create({
            senderId,
            receiverId,
            message,
            senderRole
        });

        // Populate sender and receiver info
        const populatedMessage = await Message.findById(newMessage._id)
            .populate('senderId', 'name profileImage staffId department')
            .populate('receiverId', 'name profileImage staffId department');

        // Emit via Socket.IO
        if (global.io) {
            // 1. Send to the specific user's room
            global.io.to(`user_${receiverId}`).emit('receive_message', populatedMessage);
            
            // 2. Also emit a generic 'new_message' for layout badges/notifications
            global.io.to(`user_${receiverId}`).emit('new_message', populatedMessage);
            
            // 3. For admins, also emit to 'admin' room if needed
            const receiver = await User.findById(receiverId);
            if (receiver && receiver.role === 'admin') {
                global.io.to('admin').emit('new_message', populatedMessage);
                global.io.to('admin').emit('receive_message', populatedMessage);
            }
        }

        res.status(201).json(populatedMessage);
    } catch (err) {
        console.error('[CHAT ERROR]', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get conversation between current user and another
// @route   GET /api/messages/:userId
const getConversation = async (req, res) => {
    try {
        const userId = req.user._id;
        const otherId = req.params.userId;

        const messages = await Message.find({
            $or: [
                { senderId: userId, receiverId: otherId },
                { senderId: otherId, receiverId: userId }
            ]
        })
        .sort({ createdAt: 1 })
        .populate('senderId', 'name profileImage staffId department')
        .populate('receiverId', 'name profileImage staffId department');

        // Mark as read
        await Message.updateMany(
            { receiverId: userId, senderId: otherId, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        res.json(messages);
    } catch (err) {
        console.error('[CHAT ERROR]', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Mark all messages from a user as read
// @route   PUT /api/messages/read/:userId
const markAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const senderId = req.params.userId;

        await Message.updateMany(
            { receiverId: userId, senderId, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get all staff conversations with unread count (Admin only)
// @route   GET /api/messages/conversations
const getAdminConversations = async (req, res) => {
    try {
        const adminId = req.user._id;

        // Find all unique users who have messaged or received messages from this admin
        const messages = await Message.find({
            $or: [{ senderId: adminId }, { receiverId: adminId }]
        }).lean();

        const uniqueUserIds = new Set();
        messages.forEach(m => {
            if (m.senderId.toString() !== adminId.toString()) uniqueUserIds.add(m.senderId.toString());
            if (m.receiverId.toString() !== adminId.toString()) uniqueUserIds.add(m.receiverId.toString());
        });

        const staffList = await User.find({ _id: { $in: Array.from(uniqueUserIds) } })
            .select('name department profileImage staffId isActive');

        const results = await Promise.all(staffList.map(async (s) => {
            const lastMsg = await Message.findOne({
                $or: [
                    { senderId: s._id, receiverId: adminId },
                    { senderId: adminId, receiverId: s._id }
                ]
            }).sort({ createdAt: -1 });

            const unreadCount = await Message.countDocuments({
                senderId: s._id,
                receiverId: adminId,
                isRead: false
            });

            return {
                staff: s,
                lastMessage: lastMsg,
                unreadCount
            };
        }));

        results.sort((a, b) => (b.lastMessage?.createdAt || 0) - (a.lastMessage?.createdAt || 0));

        res.json(results);
    } catch (err) {
        console.error('[CHAT ERROR]', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get unread count from admin (Staff only)
// @route   GET /api/messages/unread-count
const getUnreadTotal = async (req, res) => {
    try {
        const count = await Message.countDocuments({
            receiverId: req.user._id,
            isRead: false
        });
        res.json({ count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get the support admin profile (Staff access)
// @route   GET /api/messages/support-admin
const getSupportAdmin = async (req, res) => {
    try {
        const admin = await User.findOne({ role: 'admin' }).select('name department profileImage staffId isActive');
        if (!admin) {
            return res.status(404).json({ message: 'No support admin found' });
        }
        res.json(admin);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getSupportAdmin,
    sendMessage,
    getConversation,
    getAdminConversations,
    getUnreadTotal,
    markAsRead
};
