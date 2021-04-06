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
        defautl: Date.now(),
        expires: 30 * 60,
    }
})

module.exports = Mongoose.model('Token', TokenSchema, 'Tokens');