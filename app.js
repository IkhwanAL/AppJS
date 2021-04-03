const express = require('express');
const User = require('./mongodb/schema/user.schema');
const { registerProcedur, createToken } = require('./utils/auth');
const Con = require('./connection');
const app = express();
require('dotenv/config');
const api_url = '/api/v1';

app.use(express.urlencoded({ extended: true }))
app.use(express.json());

app.post(`${api_url}/login`, async (req, res) => {
    let db = await Con.getConnection();
    let email = req.data[0];
    let pass = req.data[1];


})

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

        // console.log(date)

        await UserData.save();
        if (UserData) {
            const Data = {
                username: req.data[0],
                email: req.data[1],
                role: 'basic',
            }
            const accessToken = createToken(Data, process.env.ACC_TOKEN);
            const refreshToken = createToken(Data, process.env.REF_TOKEN, { expiresIn: 4 * 3600 });

            res.status(201).send({
                message: 'Success',
                auth: true,
                accessToken: accessToken,
                refreshToken: refreshToken,
            })
        }

        res.end();
    } catch (error) {
        res.status(500).json({
            message: `${error}`,
            auth: false,
            token: null
        });
    }
})

app.listen(process.env.PORT_RES);