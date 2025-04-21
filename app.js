const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());
const {v4: uuid} = require('uuid');
const mysql = require('mysql2');
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'quotegram'
});

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
                            message: 'You used api one time'
                        })
                    })
                } else {
                    res.json({
                        message: 'Limit is reached'
                    })
                }
            })
        }
    });
});

app.listen(3000);