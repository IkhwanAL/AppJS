const Mongoose = require('mongoose');

const TokenSchema = new Mongoose.Schema({
    _user: {
        type: String,
        required: true,
        ref: 'Users'
    },
    token: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now,
        // expires: '1m',
    }
})

TokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 15 * 60 })

module.exports = Mongoose.model('Token', TokenSchema, 'Tokens');