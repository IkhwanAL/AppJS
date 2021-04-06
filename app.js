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
    if(user.isVerified == false){
        return res.status(403).json({
            message: 'User Is Not Verified Yet'
        }).redirect('').end();
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

app.post(`${api_url}/confirmation/:token`, async (req, res) => {
    try {
        // console.log("im in")
        if(!req.params.token){
            return res.status(401).json({
                message: 'There is No Token to Verified',
                auth: false,
            }).end();
        }

        await Con.getConnection();
        const token = req.params.token.toString().split(":");
        let decodedToken = [];
        
        for(let i  = 0; i < token.length; i++){
            let result = new Buffer.from(token[i], 'base64').toString('ascii');
            decodedToken.push(result);
        }
        
        const findUser = await Token.findOne({_user: decodedToken[0]});
        // console.log(findUser)
        if(!findUser){
            return res.status(404).json({
                message: "The Token You Provided is Expired"
            })
        }
        const UserData = await User.findOne({username: decodedToken[0], email: decodedToken[1]});

        if(UserData.isVerified == true){
            return res.status(404).json({
                message: 'User is ALready Verified',
            }).end();
        }

        UserData.isVerified = true;
        await UserData.save();
        
        const DataUser = {
            username: decodedToken[0],
            email: decodedToken[1],
            role: decodedToken[2],
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

app.post(`${api_url}/register`, registerProcedur, async (req, res) => {
    try {
        var db = await Con.getConnection();
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
        var session = await db.startSession();
        // console.log(session)
        session.startTransaction();

        const UserData = new User({
            username: req.data[0],
            email: req.data[1],
            password: req.data[2],
            role: 'basic',
            joinAt: Time,
        })

        await UserData.save({session});
        if (!UserData) {
            // await session.abortTransaction();
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

        await TokenUser.save({session});
        if (!TokenUser) {
            // await session.abortTransaction();
            return res.status(500).json({
                message: 'Something Wrong Please Try Again',
            }).end();
        }

        const transporter = NodeMail.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            type: 'login',
            auth: {
                user: 'ikhwanal235@gmail.com',
                pass: 'axuxzetoogawjrfw'
            }
        })

        const mailOptions = {
            from: 'ikhwanal235@gmail.com',
            subject: 'Email Verification',
            html: `This is Verification: 
                http://${req.hostname}:${process.env.PORT_RES}${api_url}/confirmation/${link}`,
            to: `${UserData['email']}`
        }
        const result = transporter.sendMail(mailOptions);
        if(result) {
            await session.commitTransaction();
            return res.status(201).json({
                message: "Email Verification Has Been Sent Please Check your Gmail",
                link: `http://${req.hostname}:${process.env.PORT_RES}${api_url}/confirmation/${link}`,
                token: null,
            }).end();
        }

    } catch (error) {
        await session.abortTransaction();
        return res.status(500).json({
            message: `${error}`,
            auth: false,
            token: null
        });
    } finally{
        await session.endSession();
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