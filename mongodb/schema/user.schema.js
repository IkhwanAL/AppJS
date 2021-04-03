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
        required: true,
        default: 'basic'
    },
    joinAt: {
        type: Date,
        default: new Date().getTime(),
    }
})

module.exports = Mongoose.model('User', userSchema);