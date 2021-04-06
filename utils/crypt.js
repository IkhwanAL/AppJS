'use strict';
const crypto = require('crypto');
require('dotenv/config');

const ENCRYPTION_KEY = process.env.KEY_CRYPT;
const ivLength = 16;

function encrypt(text) {
    try {
        // console.log(text);
        let iv = crypto.randomBytes(ivLength);

        let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let encryptedResult = cipher.update(text);

        encryptedResult = Buffer.concat([encryptedResult, cipher.final()]);

        return `${iv.toString('hex')}?${encryptedResult.toString('hex')}`;
    } catch (error) {
        console.log(error);
    }
}

function decrypt(encryptCode) {
    let text = encryptCode.split("?");
    let iv = Buffer.from(text.shift(), 'hex'); // Take Front List
    let encryptText = Buffer.from(text.join("?"), 'hex');

    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decryptResult = decipher.update(encryptText);
    // console.log(decryptResult);
    decryptResult = Buffer.concat([decryptResult, decipher.final()]);

    return decryptResult.toString();
}

module.exports = {
    encrypt,
    decrypt
}