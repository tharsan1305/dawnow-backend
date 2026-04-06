const Comment = require('../models/Comment');

// @desc    Get comments for a task
// @route   GET /api/comments/:taskId
// @access  Private
const getComments = async (req, res) => {
    try {
        const comments = await Comment.find({ taskEntry: req.params.taskId })
            .populate('author', 'name role')
            .sort({ createdAt: 1 });
        res.json(comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Add a comment
// @route   POST /api/comments/:taskId
// @access  Private
const postComment = async (req, res) => {
    try {
        const { message } = req.body;
        const author = req.user._id;
        const role = req.user.role;

        const comment = await Comment.create({
            taskEntry: req.params.taskId,
            author,
            role,
            message
        });

        res.status(201).json(comment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private
const deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });
        
        if (comment.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await comment.deleteOne();
        res.json({ message: 'Comment deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getComments, postComment, deleteComment };
