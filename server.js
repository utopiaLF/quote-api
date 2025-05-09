const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());

const path = require('path');

const db = require('./src/config/db.js');
const bcrypt = require('bcryptjs');

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/generate', (req, res)=>{
    const apiKey = uuid();
    const apiUsage = 0;
    const userLimit = 10;
    const userPackage = 'free';

    db.query('SELECT * from users WHERE apiKey = ?', [apiKey], (err, result)=>{
        if(err){
            return console.log('DB error');
        }

        if(result.length > 0) {
            res.json({
                message: 'User already exists, sorry. try again'
            })
        } else {
            db.query('INSERT INTO users (apiKey, apiUsage, userLimit, userPackage) VALUES(?, ?, ?, ?)', [apiKey, apiUsage, userLimit, userPackage], (err, result)=>{
                if(err) {
                    return console.log(err)
                } else {
                    res.json({
                        id: result.insertId,
                        key: apiKey
                    });
                }
            });
        }
    });
});

app.get('/api/quote', (req, res)=>{
    const apiKey = req.query.key;

    db.query('SELECT * FROM users WHERE apiKey = ?', [apiKey], (err, result)=>{
        if(err) {
            return console.log(err)
        }

        if(result.length > 0){
            db.query('SELECT * FROM users WHERE apiKey = ? AND apiUsage < userLimit', [apiKey], (err, result)=>{
                if(err) {
                    return console.log(err);
                }

                if(result.length > 0) {
                    db.query('UPDATE users SET apiUsage = apiUsage + 1 WHERE apiKey = ?', [apiKey], (err, result)=>{
                        if(err) {
                            return console.log(err)
                        }
        
                        res.json({
                            message: 'ok'
                        })
                    })
                } else {
                    res.json({
                        message: 'You reached the limit'
                    })
                }
            })
        }
    });
});

app.get('/api/getData', (req, res)=>{
    const key = req.query.key;

    if(!key) {
        return res.status(404).send('Key not found');
    }

    db.query('SELECT * FROM users WHERE apiKey = ?', [key], (err, result)=>{
        if(err) {
            return res.status(500).send('Some error');
        }

        res.json(result[0]);
    });
});

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
                return res.json({
                    msg: 'Login successful'
                });
            } else {
                console.log('Incorrect password')
                return res.status(401).json({
                    msg: 'Incorrect password'
                });
            }
        });
    });
});

app.listen(3000);