const express = require('express');
const NodeMail = require('nodemailer');

const User = require('./mongodb/schema/user.schema');
const Token = require('./mongodb/schema/token.schema');
const {
    registerProcedur,
    createToken,
    checkPassword,
    checkToken,
} = require('./utils/auth');
const {
    encrypt,
    decrypt
} = require('./utils/crypt');

const Con = require('./connection');
const app = express();
require('dotenv/config');
const api_url = '/api/v1';

app.use(express.urlencoded({ extended: true }))
app.use(express.json());

app.post(`${api_url}/login`, async (req, res) => {
    try {
        await Con.getConnection();
        let email = req.body.email;
        let pass = req.body.password;

        let user = await User.findOne({ email: email })
        if (!user) {
            return res.status(404).json({
                message: 'User Seems Doesnt Exists Yet',
                auth: false,
            }).end();
        }
        if (user.isVerified == false) {
            return res.status(403).json({
                message: 'User Is Not Verified Yet'
            }).end();
        }
        if (!(checkPassword(pass, user['password']))) {
            return res.status(401).json({
                message: "Wrong Password",
                auth: false,
            }).end();
        }
        const UserData = {
            id: user['_id'],
            username: user['username'],
            email: user['email'],
            role: user['role']
        }

        const accessToken = createToken(UserData, process.env.ACC_TOKEN); // Accessing File or Data
        // For Creating Token purpose only
        const refreshToken = createToken(UserData, process.env.REF_TOKEN, { expiresIn: 8 * 3600 });

        res.status(200).json({
            message: 'Login Success',
            auth: true,
            accessToken: accessToken,
            refreshToken: refreshToken,
        })
        return res.end();
    } catch (error) {
        return res.status(500).json({
            message: 'Server Error Please Try again in a Few Minutes',
            auth: false,
        })
    }

})

app.post(`/confirmation/:token`, async (req, res) => {
    try {
        if (!req.params.token) {
            return res.status(401).json({
                message: 'There is No Token to Verified',
                auth: false,
            }).end();
        }

        await Con.getConnection();
        let decryptToken = decrypt(req.params.token).split(':');

        const findUser = await Token.findOne({ _user: decryptToken[0] });
        if (!findUser) {
            return res.status(404).json({
                message: "The Token You Provided is Expired"
            })
        }
        const UserData = await User.findOne({ username: decryptToken[0], email: decryptToken[1] });

        if (UserData.isVerified == true) {
            return res.status(404).json({
                message: 'User is Already Verified',
            }).end();
        }

        UserData.isVerified = true;
        await UserData.save();

        const DataUser = {
            username: decryptToken[0],
            email: decryptToken[1],
            role: decryptToken[2],
        }

        const AccToken = createToken(DataUser, process.env.ACC_TOKEN);
        const RefToken = createToken(DataUser, process.env.REF_TOKEN, { expiresIn: 8 * 3600 });

        return res.status(201).json({
            message: 'Success Register',
            auth: true,
            Access: AccToken,
            Refresh: RefToken
        }).end();

    } catch (error) {
        return res.status(500).json({
            message: `${error}`,
            auth: false,
        }).end();
    }
})

app.post(`${api_url}/createNewLinkVerified`, async (req, res) => {
    var db = await Con.getConnection();
    try {
        if (!req.body) {
            return res.status(400).json({
                message: "please Provide an Email"
            }).end();
        }

        const email = req.body.email;

        let isThereASameEmail = await User.findOne({ email });
        if (!isThereASameEmail) {
            return res.status(404).json({
                message: 'Email is Not Registered Yet',
            }).end();
        }
        let DataUser = [
            isThereASameEmail['username'],
            isThereASameEmail['email'],
            isThereASameEmail['role']
        ].join(':');
        const Link = encrypt(DataUser.toString());

        var session = await db.startSession();
        // console.log(session)
        await session.startTransaction();

        const DataToken = new Token({
            _user: isThereASameEmail['username'],
            token: Link,
            createdAt: Date.now()
        })

        await DataToken.save({ session });

        const transport = NodeMail.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            type: 'login',
            auth: {
                user: 'ikhwanal235@gmail.com',
                pass: process.env.APP_PASS
            }
        })

        const mailOptions = {
            from: 'no-reply@gmail.com',
            subject: 'Renew Email Verification',
            html: `This is Link Verfication
                    http://${req.hostname}:${process.env.PORT_RES}/confirmation/${Link}`,
            to: email
        };

        const result = transport.sendMail(mailOptions);
        if (!result) {
            throw new Error('Failed To Send Link Verification to Email');
        }
        await session.commitTransaction();
        // db.endSession();
        return res.status(201).json({
            message: 'Renew Link Success',
            link: `http://${req.hostname}:${process.env.PORT_RES}/confirmation/${Link}`
        }).end();

    } catch (error) {
        await session.abortTransaction();
        // session.endSession();
        return res.status(500).json({
            message: "Server Error:" + error,
        }).end();
    } finally {
        session.endSession();
    }
})

app.post(`${api_url}/register`, registerProcedur, async (req, res) => {
    var db = await Con.getConnection();
    var session = await db.startSession();
    try {
        const Time = new Date().getTime();

        const isThereASameUser = await User.findOne({ username: req.data[0] });
        const isThereASameEmail = await User.findOne({ email: req.data[1] })

        if (isThereASameUser) {
            return res.status(409).json({
                message: 'User Already Exists',
                auth: false,
            }).end()
        }
        if (isThereASameEmail) {
            return res.status(409).json({
                message: 'Email Already Exists',
                auth: false,
            }).end();
        }

        // Transaction Start
        session.startTransaction();

        const UserData = new User({
            username: req.data[0],
            email: req.data[1],
            password: req.data[2],
            role: 'basic',
            joinAt: Time,
        })

        await UserData.save({ session });

        const DataUser = [
            UserData['username'],
            UserData['email'],
            UserData['role'],
        ].join(':');

        const link = encrypt(DataUser);

        const TokenUser = new Token({
            _user: UserData['username'],
            token: link,
            createdAt: Date.now(),
        })

        await TokenUser.save({ session });

        const transporter = NodeMail.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            type: 'login',
            auth: {
                user: 'ikhwanal235@gmail.com',
                pass: process.env.APP_PASS
            }
        })

        const mailOptions = {
            from: 'no-reply@gmail.com',
            subject: 'Email Verification',
            html: `This is Verification: 
                http://${req.hostname}:${process.env.PORT_RES}/confirmation/${link}`,
            to: `${UserData['email']}`
        }
        const result = transporter.sendMail(mailOptions);
        if (result) {
            await session.commitTransaction();
            return res.status(201).json({
                message: "Email Verification Has Been Sent Please Check your Gmail",
                link: `http://${req.hostname}:${process.env.PORT_RES}/confirmation/${link}`,
            }).end();
        }

    } catch (error) {
        await session.abortTransaction();
        return res.status(500).json({
            message: `${error}`,
            auth: false,
            token: null
        });
    } finally {
        session.endSession();
    }
});

app.post(`${api_url}/newToken`, (req, res) => {
    try {
        if (!req.headers.authorization) {
            return res.status(401).json({
                message: "Access Forbidden",
            }).end();
        }
        const checkTokenRef = checkToken(req.headers.authorization.split(" ")[1], process.env.REF_TOKEN);
        if (!checkTokenRef) {
            return res.status(401).json({
                message: "No Token Provided",
            }).end();
        }

        const DataUser = {
            username: checkTokenRef['username'],
            email: checkTokenRef['email'],
            role: checkTokenRef['role']
        }
        const AccToken = createToken(DataUser, process.env.ACC_TOKEN);
        const RefToken = createToken(DataUser, process.env.REF_TOKEN, { expiresIn: 8 * 3600 });

        return res.status(201).json({
            message: "Token is Been Refreshed",
            Access: AccToken,
            RefToken: RefToken
        }).end()
    } catch (error) {
        res.status(401).json({
            message: `${error}`,
        })
    }


})

app.delete(`${api_url}/logout`, (req, res) => {
    if (!req.headers.authorization) {
        return res.status(404).json({
            message: 'Your Not Login',
            Access: null,
            Refresh: null,
        }).end();
    }
    return res.status(202).json({
        auth: false,
        Access: null,
        Refresh: null,
        message: 'Logout Successfully'
    }).end();
})
app.listen(process.env.PORT || 3000);