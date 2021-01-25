const jwt = require('jsonwebtoken')
const config = require('./config.json')
const reconnaitreUsername = token => jwt.verify(token, config.jwt.key)

module.exports = db => class {

    // Methodes permettant de recuperer tout les usernames de notre application
    static getAllUsername() {
        return new Promise(next => {
            db.query('SELECT username FROM users')
                .then(result => next(result))
                .catch(err => next(err))
        })
    }

    // Methodes permettant de recuperer tout les discussions générales
    static getMessageGeneral() {
        return new Promise(next => {
            db.query('SELECT * FROM discussion')
                .then(result => next(result))
                .catch(err => next(err))
        })
    }

    // Recuperer tout les derniers messages d'un username
    static getAllLastMessageByUser(username) {
        return new Promise(next => {
            // Recuperer tout les messages envoyés ou réçus
            db.query(
                'SELECT * FROM message WHERE (pseudoEnvoie = ? OR pseudoRecoie = ?) ORDER BY dateMessage DESC',
                [username, username]
            )
                .then(result => {
                    // Recuperer tout les utilisateurs avec qui on est en contact
                    
                    let otherUsers = []
                    let lastMessages = {}
                    let nbreNonVue = {}
                    result.forEach(message => {
                        if (message.pseudoEnvoie == username) {
                            if (!otherUsers.includes(message.pseudoRecoie))
                                otherUsers.push(message.pseudoRecoie)
                        }
                        else {
                            if (message.vue === 0)
                                if (nbreNonVue[message.pseudoEnvoie])
                                    nbreNonVue[message.pseudoEnvoie]++
                                else nbreNonVue[message.pseudoEnvoie] = 1
                            if (!otherUsers.includes(message.pseudoEnvoie))
                                otherUsers.push(message.pseudoEnvoie)
                        }
                    })

                    // Recuperer les messages de chaque utilisateur
                    otherUsers.forEach((user, index) => {
                        let messagesUser = result.filter(message => (
                            message.pseudoEnvoie === user || message.pseudoRecoie === user
                        ))
                        lastMessages[user] = { message: messagesUser[0], index, nonVue: nbreNonVue[user] || 0 }
                    })
                    
                    next(lastMessages)

                })

                .catch(err => next(err))
        })
    }

    static getMessage(token, username2) {
        // Recupere le message de notre utilisateur avec le pseudo 
        return new Promise(next => {
            const username1 = reconnaitreUsername(token).username

            // Verification de l'username2
            db.query('SELECT username FROM users WHERE username = ?', username2.trim())
                .then(result => {
                    if (result.length === 0) next(new Error('not exist user'))
                    else return db.query(`
                        SELECT * FROM message WHERE 
                            ( pseudoEnvoie = ? AND pseudoRecoie = ? ) OR  
                            ( pseudoEnvoie = ? AND pseudoRecoie = ? )`,
                        [username1.trim(), username2.trim(), username2.trim(), username1.trim()]
                    )
                })
                .then(result => next(result))
                .catch(err => next(err))
        })
    }

    static updateVue(token, username2) {
        // Mettre un vue à tout les messages échangés entre username2 et nous
        return new Promise(next => {
            const username1 = reconnaitreUsername(token).username
            db.query('SELECT username FROM users WHERE username = ?', username2.trim())
                .then(result => {
                    if (result.length === 0) next(new Error('not exist user'))
                    else return db.query(`
                        UPDATE message SET vue = 1 WHERE 
                        ( pseudoEnvoie = ? AND pseudoRecoie = ? ) AND vue = 0
                    `, [username2.trim(), username1])
                })
                .then(result => next(true))
                .catch(err => next(false))
        })
    }
}   