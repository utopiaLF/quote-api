const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());

const path = require('path');

const db = require('./src/config/db.js');
const bcrypt = require('bcryptjs');


app.use(express.static(path.join(__dirname, 'public')));

async function testDbConnection() {
    try {
      const [rows] = await db.query('SELECT 1'); // Run a simple query to check the connection
      console.log('Database connection successful:', rows); // If successful, log the result
    } catch (error) {
      console.error('Error connecting to the database:', error.message); // If an error occurs, log it
    }
  }
  
  testDbConnection();


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

app.get('/login', (req, res)=>{
    console.log('login triggered');
    
    const { username, password } = req.query;

    if(!username || !password) {
        return res.status(500).send('You missed something in params');
    }

    db.execute('SELECT * FROM users WHERE username = ?', [username], (err, result)=>{
        console.log('DB query finished:', result);
        if(err) {
            return res.status(500).send('Some error in DB');
        }

        if(result.length === 0) {
            return res.status(404).send('User not found');
        }

        const user = result[0];
        bcrypt.compare(password, user.password, (err, isMatch)=>{
            if(err) {
                return res.status(500).send('Some error in hashing');
            }

            if(isMatch) {
                console.log('Login successful')
                return res.send('Login successful');
            } else {
                console.log('Incorrect password')
                return res.status(401).send('Incorrect password');
            }
        });
    });
});

app.listen(3000);