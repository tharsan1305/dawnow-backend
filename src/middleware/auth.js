const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect middleware - verify JWT token
const protect = async (req, res, next) => {
    let token;

    // Check Authorization header first
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Fallback: check query string (for PDF downloads via window.open)
    if (!token && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({ message: 'User not found' });
        }

        if (!req.user.isActive) {
            return res.status(401).json({ message: 'Account is deactivated' });
        }

        next();
    } catch (error) {
        console.error(error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

// Staff middleware - verify role is staff
const isStaff = (req, res, next) => {
    if (req.user && req.user.role === 'staff') {
        next();
    } else {
        return res.status(403).json({ message: 'Access denied. Staff only.' });
    }
};

// Admin middleware - verify role is admin
const isAdmin = (req, res, next) => {
    console.log('DEBUG: isAdmin Check - User:', req.user?._id, 'Role:', req.user?.role);
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        console.log('DEBUG: isAdmin Rejected - Reason: Role is not admin');
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};

module.exports = { protect, isStaff, isAdmin };
