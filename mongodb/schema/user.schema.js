const Mongoose = require('mongoose');

const userSchema = new Mongoose.Schema({
    username: {
        type: String,
        requied: true,
    },
    email: {
        type: String,
        required: true,
        index: true
    },
    password: {
        type: String,
        min: 8,
        required: true
    },
    role: {
        type: String,
        default: 'basic'
    },
    joinAt: {
        type: Date,
        required: true,
        default: new Date().getTime(),
    },
    isVerified: {
        type: Boolean,
        default: false,
    }
})

module.exports = Mongoose.model('User', userSchema, 'Users');