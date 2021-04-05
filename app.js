const express = require('express');
const NodeMail = require('nodemailer');

const User = require('./mongodb/schema/user.schema');
const Token = require('./mongodb/schema/token.schema');
const {
    registerProcedur,
    createToken,
    checkPassword,
    checkToken,
    generateTokenConfirmation
} = require('./utils/auth');
const Con = require('./connection');
const app = express();
require('dotenv/config');
const api_url = '/api/v1';

app.use(express.urlencoded({ extended: true }))
app.use(express.json());

app.post('/asd', (req, res) => {

    // let user = bcrypt.hashSync(req.body.username, 1)
    // let email = bcrypt.hashSync(req.body.email, 1)
    // let role = bcrypt.hashSync('basic', 1)

    let user = new Buffer.from(req.body.username).toString('base64');
    let email = new Buffer.from(req.body.email).toString('base64');
    let role = new Buffer.from('basic').toString('base64');
    let link = [user, email, role].join(':');
    // let data = link.split(":");
    res.end(`${link}`);
})

app.post(`${api_url}/login`, async (req, res) => {
    await Con.getConnection();
    let email = req.body.email;
    let pass = req.body.password;

    let user = await User.findOne({ email: email })
    if (!user) {
        return res.status(404).json({
            message: 'User Seems Doesnt Exists Yet',
            auth: false,
            accessToken: null,
            refreshToken: null,
        }).end();
    }
    if (!(checkPassword(pass, user['password']))) {
        return res.status(401).json({
            message: "Wrong Password",
            auth: false,
            accessToken: null,
            refreshToken: null
        }).end();
    }
    const UserData = {
        id: user['_id'],
        username: user['username'],
        email: user['email'],
        role: user['role']
    }

    const accessToken = createToken(UserData, process.env.ACC_TOKEN);
    const refreshToken = createToken(UserData, process.env.REF_TOKEN, { expiresIn: 8 * 3600 });

    res.status(200).json({
        message: 'Login Success',
        auth: true,
        accessToken: accessToken,
        refreshToken: refreshToken,
    })
    return res.end();
})

app.post(`${api_url}/confirmation/`, async (req, res) => {

})

app.post(`${api_url}/register`, registerProcedur, async (req, res) => {
    try {
        const db = await Con.getConnection();
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
        const session = await db.startSession();
        await session.startTransaction();

        const UserData = new User({
            username: req.data[0],
            email: req.data[1],
            password: req.data[2],
            role: 'basic',
            joinAt: Time,
        })

        await UserData.save();
        if (!UserData) {
            session.abortTransaction();
            return res.status(500).json({
                message: 'Somiething Wrong Please Try Again',
            }).end();
        }

        const DataUser = {
            username: UserData['username'],
            email: UserData['email'],
            role: UserData['role'],
        }

        const link = generateTokenConfirmation(DataUser);

        const TokenUser = new Token({
            _user: UserData['username'],
            token: link,
        })

        await TokenUser.save();
        if (!TokenUser) {
            session.abortTransaction();
            return res.status(500).json({
                message: 'Somiething Wrong Please Try Again',
            }).end();
        }

        const transporter =

            await session.commitTransaction

        // const AccToken = createToken(DataUser, process.env.ACC_TOKEN);
        // const RefToken = createToken(DataUser, process.env.REF_TOKEN, { expiresIn: 8 * 3600 });

        // return res.status(201).json({
        //     message: 'Success Register',
        //     auth: true,
        //     Access: AccToken,
        //     Refresh: RefToken
        // }).end();


    } catch (error) {
        await session.abortTransaction();
        return res.status(500).json({
            message: `${error}`,
            auth: false,
            token: null
        });
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
app.listen(process.env.PORT_RES);