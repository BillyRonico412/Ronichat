const jwt = require('jsonwebtoken')
const config = require('./config.json')

const controleUsername = username => /^[a-z A-Z]{3,30}$/.test(username)
const controleMdp = mdp => /^[a-z A-Z0-9]{3,30}$/.test(mdp)

module.exports = db => class {

    // ? Connexion

    static connexion(req, res) {
        const { username, motDePasse } = req.body
        if (!username || !motDePasse)
            res.status(400).end()
        else db.query(
            'SELECT * FROM users WHERE username = ?', [username.trim()]
        ).then(result => {
            if (result.length === 0 || result[0].username !== username.trim() || result[0].motDePasse !== motDePasse)
                res.status(401).end()
            else {
                const token = jwt.sign({ username }, config.jwt.key, {
                    algorithm: 'HS256',
                    expiresIn: config.jwt.expirationSecond
                })
                res.cookie('token', token, {
                    maxAge: config.jwt.expirationSecond * 1000
                }).end()
            }
        }).catch(err => console.log(err))
    }

    // ? Refresh

    static refresh(req, res) {
        const token = req.cookies.token
        if (!token) return res.status(401).end()
        let payload
        try {
            payload = jwt.verify(token, config.jwt.key)
        } catch (e) {
            if (e instanceof jwt.JsonWebTokenError)
                return res.status(401).end()
            else return res.status(400).end()
        }

        const newToken = jwt.sign({ username: payload.username }, config.jwt.key, {
            algorithm: 'HS256',
            expiresIn: config.jwt.expirationSecond
        })
        res.cookie('token', newToken, {
            maxAge: config.jwt.expirationSecond * 1000, secure: true
        })
        res.end()
    }

    // ? Creer-compte

    static creerCompte(req, res) {
        const { username, motDePasse } = req.body
        if (!username || !motDePasse || !controleUsername(username) || !controleMdp(motDePasse))
            res.status(400).end()
        else db.query('SELECT * FROM users WHERE username = ?', [username.trim()])
            .then(result => {
                if (result.length === 0)
                    return db.query('INSERT INTO users(username, motDePasse) VALUES (?, ?)', [
                        username.trim(), motDePasse.trim()
                    ])
                else res.status(400).end()
            })
            .then(() => res.end())
            .catch(err => console.log(err))
    }

    static verifyToken(token) {
        try {
            jwt.verify(token, config.jwt.key)
        } catch (e) {
            return false
        }
        return true
    }

}

