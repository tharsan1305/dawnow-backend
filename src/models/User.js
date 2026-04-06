const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    staffId: {
        type: String,
        required: [true, 'Staff ID is required'],
        unique: true,
        trim: true
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        trim: true
    },
    designation: {
        type: String,
        default: 'Assistant Professor',
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        select: false
    },
    role: {
        type: String,
        enum: ['staff', 'admin'],
        default: 'staff'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    qualification: {
        type: String,
        trim: true
    },
    experience: {
        type: String,
        trim: true
    },
    joinDate: {
        type: Date
    },
    profileImage: {
        type: String,
        default: ''
    },
    totalScore: {
        type: Number,
        default: 0
    },
    badges: [String]
}, {
    timestamps: true
});

// Pre-save hook to hash password
userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function (plainPassword) {
    return await bcrypt.compare(plainPassword, this.password);
};

// Override toJSON to exclude password
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    return user;
};

module.exports = mongoose.model('User', userSchema);
