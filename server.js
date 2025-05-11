const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());

const path = require('path');

const db = require('./src/config/db.js');
const bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// app.get('/api/generate', (req, res)=>{
//     const apiKey = uuid();
//     const apiUsage = 0;
//     const userLimit = 10;
//     const userPlan = 'free';

//     db.query('SELECT * from users WHERE apiKey1 = ?', [apiKey], (err, result)=>{
//         if(err){
//             return console.log('DB error');
//         }

//         if(result.length > 0) {
//             res.json({
//                 message: 'apiKey already exists, sorry. try again'
//             })
//         } else {
//             db.execute('INSERT INTO users (plan, apiCalls, apiLimit, apiKey1) VALUES(?, ?, ?, ?)', [userPlan, apiUsage, userLimit, apiKey], (err, result)=>{
//                 if(err) {
//                     return console.log(err)
//                 } else {
//                     res.json({
//                         id: result.insertId,
//                         key: apiKey
//                     });
//                 }
//             });
//         }
//     });
// });

// app.get('/api/quote', (req, res)=>{
//     const apiKey = req.query.key;

//     db.query('SELECT * FROM users WHERE apiKey = ?', [apiKey], (err, result)=>{
//         if(err) {
//             return console.log(err)
//         }

//         if(result.length > 0){
//             db.query('SELECT * FROM users WHERE apiKey = ? AND apiUsage < userLimit', [apiKey], (err, result)=>{
//                 if(err) {
//                     return console.log(err);
//                 }

//                 if(result.length > 0) {
//                     db.query('UPDATE users SET apiUsage = apiUsage + 1 WHERE apiKey = ?', [apiKey], (err, result)=>{
//                         if(err) {
//                             return console.log(err)
//                         }
        
//                         res.json({
//                             message: 'ok'
//                         })
//                     })
//                 } else {
//                     res.json({
//                         message: 'You reached the limit'
//                     })
//                 }
//             })
//         }
//     });
// });

// app.get('/api/getData', (req, res)=>{
//     const key = req.query.key;

//     if(!key) {
//         return res.status(404).send('Key not found');
//     }

//     db.query('SELECT * FROM users WHERE apiKey = ?', [key], (err, result)=>{
//         if(err) {
//             return res.status(500).send('Some error');
//         }

//         res.json(result[0]);
//     });
// });

const authToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if(!token) {
        return res.status(501).send('Token not found')
    }

    jwt.verify(token, JWT_SECRET, (err, user)=>{
        if(err) return res.sendStatus(403);
        req.user = user
        next();
    })
}

app.get('/reg', (req, res)=>{
    const { email, username, password } = req.query;

    if(!email || !username || !password) {
        return res.status(400).send('You missed something in params');
    }

    db.execute('SELECT * FROM users WHERE username = ?', [username], (err, result)=>{
        if(err){
            return console.log(err);
        }

        if(result.length === 0){
            bcrypt.hash(password, 10, (err, hashedPassword)=>{
                if(err){
                    return console.log('Some error in hashing')
                }

                db.execute('INSERT INTO users (email, username, password) VALUES(?, ?, ?)', [email, username, hashedPassword], (err, result)=>{
                    if(err) {
                        return console.log(err);
                    }
            
                    res.send(`Account created | Email: ${email}, username: ${username}`);
                })
            })
        } else {
            res.send('Username already exists')
        }
    })

})

app.post('/login', (req, res)=>{
    const { username, password } = req.body;

    if(!username || !password) {
        return res.status(400).json( {msg: 'You missed something in params'});
    }

    db.execute('SELECT * FROM users WHERE username = ?', [username], (err, result)=>{
        console.log('DB query finished:', result);
        if(err) {
            return res.status(500).json( {msg: 'Some error in DB'});
        }

        if(result.length === 0) {
            return res.status(404).json( {msg: 'User not found'});
        }

        const user = result[0];
        bcrypt.compare(password, user.password, (err, isMatch)=>{
            if(err) {
                return res.status(500).json( {msg: 'Some error in hashing'});
            }

            if(isMatch) {
                console.log('Login successful')

                const paylod = {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }

                const token = jwt.sign(paylod, JWT_SECRET, { expiresIn: '1d'});

                return res.json({
                    msg: 'Login successful',
                    token: token
                });

            } else {
                return res.status(401).json({msg: 'Incorrect password' });
            }
        });
    });
});

app.get('/protected', authToken, (req, res) => {
    res.json({
        id: req.user.id,
        username: req.user.username,
        email: req.user.email
    })
})

app.listen(3000, ()=>{
    console.log('http://localhost:3000')
});