const Mongoose = require('mongoose');
require('dotenv/config');
let _db;

async function createConnection() {
    try {
        const URL = process.env.URL_STRING;
        const db = new Mongoose.connect(URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
        });
        return db;
    } catch (error) {
        throw error;
    }
}

// Singleton Pattern

async function getConnection() {
    try {
        if (_db) {
            return _db;
        }
        _db = await createConnection();
        return _db;
    } catch (error) {
        throw error;
    }
}

function closeConnection() {
    Mongoose.connection.close();
}

module.exports = {
    getConnection,
    closeConnection,
}