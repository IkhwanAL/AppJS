'use strict';
const crypto = require('crypto');
require('dotenv/config');

const ENCRYPTION_KEY = process.env.KEY_CRYPT;
const ivLength = 16;

function encrypt(text) {
    try {
        let iv = crypto.randomBytes(ivLength);
        // console.log(iv.length);
        let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let encryptedResult = cipher.update(text);

        encryptedResult = Buffer.concat([encryptedResult, cipher.final()]);

        return `${iv.toString('hex')}+${encryptedResult.toString('hex')}`;
    } catch (error) {
        console.log(error);
    }
}

function decrypt(encryptCode) {
    let text = encryptCode.split("+");
    console.log(text);
    let iv = Buffer.from(text[0], 'hex'); // Take Front List
    let encryptText = Buffer.from(text[1], 'hex');

    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decryptResult = decipher.update(encryptText);

    decryptResult = Buffer.concat([decryptResult, decipher.final()]);

    return decryptResult.toString();
}

module.exports = {
    encrypt,
    decrypt
}