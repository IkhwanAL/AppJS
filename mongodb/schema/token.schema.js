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
        default: Date.now(),
        index: {
            unique: true,
            expires: 30 * 60
        }
    }
})

module.exports = Mongoose.model('Token', TokenSchema, 'Tokens');