const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv/config');

/**
 * 
 * @param {Object} dataUser
 * @param {Object} options Secret token and jwt option, Secret token Cannot Be Defautt
 * 
 */
function createToken(dataUser, token, option = { expiresIn: 10 * 60 }) {
    if (!(typeof dataUser === 'object' && typeof dataUser !== 'function')) {
        throw new Error("Data User is Not An Object")
    }
    if (token == null) {
        throw new Error('Token Secret Cannot Be Null');
    }

    const tokenString = jwt.sign(dataUser, token, option);
    return tokenString;
}

/**
 * 
 * @param {String} token 
 * @returns decoded Token
 */

function checkToken(token, secretKey) {
    token = token.toString();
    try {
        const decoded = jwt.verify(token, secretKey);
        return decoded;
    } catch (err) {
        throw err.name;
    }
}

/**
 * 
 * @param {Stirng} user 
 */
function checkUsername(user) {
    if (user == null) throw new Error("Username is Empty");
    if (/^['"?\%]$/gi.test(user)) throw new Error("Cannot Use those Symbol in Username");
    return user;
}
/**
 * 
 * @param {Request Client} req 
 * @param {Respond Client} res 
 * @param {Callback} next 
 */
function registerProcedur(req, res, next) {
    if (!req.body) {
        return res.status(400).json({
            auth: false,
            message: 'Body Form is Empty'
        })
    }

    try {
        const user = checkUsername(req.body.username);
        const email = emailFormat(req.body.email);
        let pass = passwordFormat(req.body.password);

        pass = hash(pass);

        req.data = [user, email, pass];
        next();
    } catch (err) {
        res.status(400).json({
            auth: false,
            message: `${err}`,
            token: null
        })
    }
    //Connection MongoDB
}
/**
 * 
 * @param {String} email
 * Check Email if its Correct with the format  
 * @returns email
 */

function emailFormat(email) {
    if (email == null) throw new Error('Email Column is Empty');
    email = email.toString();
    if (!(/^[\w\.\-]+@([\w-]+\.)+[\w-]{2,4}$/g.test(email))) {
        throw new Error('Email Format is Wrong');
    }
    return email;
}

/**
 * 
 * @param {String} password 
 * Check Password if its Correct with the format
 * @returns 
 */
function passwordFormat(password) {
    password = password.toString();
    if (password.length < 8) {
        throw new Error('Password Length Min 8')
    }
    if (!(/(?=[A-Z])/g.test(password))) {
        throw new Error('At Least One Upper Case');
    }
    if (!(/(?=[0-9])/g.test(password))) {
        throw new Error('At Least One Number');
    }
    if (!(/(?=[\.\[\]\(\)!@#$%^&*\{\\-\\_\\+=|?\/\}])+/g.test(password))) {
        throw new Error('At Least One Symbol');
    }

    return password;
}

function createSalt(num = 8) {
    try {
        if (num < 0) {
            throw new Error('Salt Number Must greater than 1')
        }
        const salt = bcrypt.genSaltSync(num);
        return salt;
    } catch (error) {
        return error;
    }
}

function hash(password) {
    try {
        if (password == null) {
            throw new Error('Password Mus Not empty');
        }
        const hashPassword = bcrypt.hashSync(password, createSalt());
        return hashPassword;
    } catch (error) {
        return error
    }

}

function checkPassword(password, passwordHash) {
    try {
        if (passwordHash == null && password == null) throw new Error("Password Is Empty")
        const verify = bcrypt.compareSync(password, passwordHash);
        return verify;
    } catch (error) {
        return error;
    }
}

module.exports = {
    registerProcedur,
    createToken,
    checkToken,
    emailFormat,
    passwordFormat,
    checkPassword
}