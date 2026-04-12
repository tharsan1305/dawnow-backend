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
            sender: senderId,
            receiver: receiverId,
            message,
            senderRole
        });

        // Populate sender info for the frontend
        const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender', 'name profileImage staffId department');

        // Emit via Socket.IO
        if (global.io) {
            // Send to receiver's specific room
            global.io.to(`user_${receiverId}`).emit('new_message', populatedMessage);
            
            // If sender is staff, also notify admins
            if (senderRole === 'staff') {
                global.io.to('admin').emit('admin_notification', {
                    type: 'chat',
                    senderName: req.user.name,
                    message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
                });
            }
        }

        res.status(201).json(populatedMessage);
    } catch (err) {
        console.error('[CHAT ERROR]', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get conversation between current user and another
// @route   GET /api/messages/:otherId
// @access  Private
const getConversation = async (req, res) => {
    try {
        const userId = req.user._id;
        const { otherId } = req.params;

        const messages = await Message.find({
            $or: [
                { sender: userId, receiver: otherId },
                { sender: otherId, receiver: userId }
            ]
        })
        .sort({ createdAt: 1 })
        .populate('sender', 'name profileImage staffId department');

        // Mark as read
        await Message.updateMany(
            { receiver: userId, sender: otherId, isRead: false },
            { isRead: true }
        );

        res.json(messages);
    } catch (err) {
        console.error('[CHAT ERROR]', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all conversations for admin
// @route   GET /api/messages/admin/list
// @access  Private (Admin)
const getAdminConversations = async (req, res) => {
    try {
        const adminId = req.user._id;

        // Find all staff who have messaged or received messages from admin
        // This is a bit complex: find unique sender/receivers that are not the admin
        const staffIds = await Message.find({
            $or: [{ sender: adminId }, { receiver: adminId }]
        }).distinct('sender receiver');

        const filteredStaffIds = staffIds.filter(id => id.toString() !== adminId.toString());

        const staffList = await User.find({ _id: { $in: filteredStaffIds } })
            .select('name department profileImage staffId isActive');

        // For each staff, get the last message and unread count
        const results = await Promise.all(staffList.map(async (s) => {
            const lastMsg = await Message.findOne({
                $or: [
                    { sender: s._id, receiver: adminId },
                    { sender: adminId, receiver: s._id }
                ]
            }).sort({ createdAt: -1 });

            const unreadCount = await Message.countDocuments({
                sender: s._id,
                receiver: adminId,
                isRead: false
            });

            return {
                staff: s,
                lastMessage: lastMsg,
                unreadCount
            };
        }));

        // Sort results by last message time
        results.sort((a, b) => (b.lastMessage?.createdAt || 0) - (a.lastMessage?.createdAt || 0));

        res.json(results);
    } catch (err) {
        console.error('[CHAT ERROR]', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get unread count for current user
// @route   GET /api/messages/unread/count
// @access  Private
const getUnreadTotal = async (req, res) => {
    try {
        const count = await Message.countDocuments({
            receiver: req.user._id,
            isRead: false
        });
        res.json({ count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    sendMessage,
    getConversation,
    getAdminConversations,
    getUnreadTotal
};
