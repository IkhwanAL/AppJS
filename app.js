const express = require('express');
const User = require('./mongodb/schema/user.schema');
const { registerProcedur, createToken, checkPassword } = require('./utils/auth');
const Con = require('./connection');
const { create } = require('./mongodb/schema/user.schema');
const app = express();
require('dotenv/config');
const api_url = '/api/v1';

app.use(express.urlencoded({ extended: true }))
app.use(express.json());

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
    const refreshToken = createToken(UserData, process.env.REF_TOKEN, { expiresIn: 4 * 3600 });

    res.status(200).json({
        message: 'Login Success',
        auth: true,
        accessToken: accessToken,
        refreshToken: refreshToken,
    })
    return res.end();
})

// function()

app.post(`${api_url}/register`, registerProcedur, async (req, res) => {
    try {
        await Con.getConnection();
        const Time = new Date().getTime();

        const UserData = new User({
            username: req.data[0],
            email: req.data[1],
            password: req.data[2],
            role: 'basic',
            joinAt: Time,
        })

        const isThereASameUser = await User.findOne({ username: req.data[0] });
        const isThereASameEmail = await User.findOne({ email: req.data[1] })
        console.log(isThereASameUser)
        console.log(isThereASameEmail)
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

        await UserData.save();
        const DataUser = {
            username: UserData['username'],
            email: UserData['email'],
            role: UserData['role'],
        }

        const AccToken = createToken(DataUser, process.env.ACC_TOKEN);
        const RefToken = createToken({ username: UserData['username'] }, process.env.REF_TOKEN, { expiresIn: 12 * 3600 });

        return res.status(201).json({
            message: 'Success Register',
            auth: true,
            Access: AccToken,
            Refresh: RefToken
        }).end();

    } catch (error) {
        res.status(500).json({
            message: `${error}`,
            auth: false,
            token: null
        });
    }
})

app.post(`${api_url}/logout`, async (req, res) => {

})
app.listen(process.env.PORT_RES);