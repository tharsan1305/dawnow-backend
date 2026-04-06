const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Please provide username/email and password' });
        }

        // Find user by username OR email (case-insensitive for username/email)
        const user = await User.findOne({
            $or: [
                { username: { $regex: new RegExp('^' + username + '$', 'i') } },
                { email: { $regex: new RegExp('^' + username + '$', 'i') } }
            ]
        }).select('+password');

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(401).json({ message: 'Account is deactivated. Contact admin.' });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(user._id);

        // Remove password from output
        const userWithoutPassword = user.toJSON();

        res.json({
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const updates = { ...req.body };

        // Handle profile image upload
        if (req.file) {
            // Store the relative path to the image
            const filePath = req.file.path.replace(/\\/g, '/');
            updates.profileImage = `/${filePath}`;
        }

        // Avoid password update via this route
        delete updates.password;
        delete updates.role;
        delete updates.staffId;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { login, getMe, updateProfile };
