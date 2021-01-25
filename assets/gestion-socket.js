const jwt = require('jsonwebtoken')
const config = require('./config.json')
const striptags = require('striptags')

// Permet de reconnaitre l'username avec le token
const reconnaitreUsername = token => jwt.verify(token, config.jwt.key)

// Permet de savoir si un username est deja pris ou pas
const usernameDejaPris = (username, tabUsername) => {
    for (let socketid in tabUsername)
        if (tabUsername[socketid] === username)
            return true
    return false
}

const getUsernames = tabUsernameConnecter => {
    let usernames = []
    for (socketId in tabUsernameConnecter)
        usernames.push(tabUsernameConnecter[socketId])
    return usernames
}

let tabUsernameConnecter = {}

module.exports = db => socket => {

    const Messagerie = require('./messagerie')(db)

    let username = ''

    // Reconnaitre l'username de l'utilisateur en cours et 
    // le rajouter à la liste des personnes connecter

    socket.on('connecter', async token => {
        username = reconnaitreUsername(token).username
        if (!usernameDejaPris(username, tabUsernameConnecter)) {

            // Joindre tout les users au rooms users
            socket.join('users')

            // Le rajouter au tableau
            tabUsernameConnecter[socket.id] = username
            console.log(username + ' vient de se connecter !')

            // Envoyer la liste des usernames connécté
            socket.emit('username-resolu', username, getUsernames(tabUsernameConnecter))
            socket.to('users').emit('new-user', username, getUsernames(tabUsernameConnecter))

            // Recuperer tout les messages de l'username
            socket.emit('tout-les-derniers-messages', await Messagerie.getAllLastMessageByUser(username))
        }
        else socket.emit('user-deja-connecter') // user deja conecter

    })

    // Reception d'un message générale
    socket.on('send-message-general', textMessage => {
        textMessage = striptags(textMessage)
        if (textMessage.trim() !== '') {
            db.query(
                'INSERT INTO discussion (username, message) VALUES (?, ?)',
                [tabUsernameConnecter[socket.id], textMessage.trim()]
            )
                .then(() => db.query('SELECT * FROM discussion ORDER BY id DESC LIMIT 1 '))
                .then(result => {
                    socket.to('users').emit('new-message-general', result[0])
                    socket.emit('confirm-message-general', result[0])
                })
                .catch(err => console.log(err))
        }
    })

    // Deconnexion d'utilisateur
    socket.on('disconnect', () => {
        delete tabUsernameConnecter[socket.id]
        socket.to('users').emit('left-user', username, getUsernames(tabUsernameConnecter))
        console.log(username + ' vient de se deconnecter !')
    })

    // Reception d'un message privé
    socket.on('send-message-prive', (textMessage, username2) => {
        textMessage = striptags(textMessage).trim()
        if (textMessage !== '') {
            // Verification de l'username
            db.query('SELECT username FROM users WHERE username = ?', [username2.trim()])
                .then(result => {
                    if (result.length === 1) return db.query(
                        'INSERT INTO message (pseudoEnvoie, pseudoRecoie, textMessage, dateMessage) VALUES (?, ?, ?, ?)',
                        [username, username2.trim(), textMessage, require('moment')().format('YYYY-MM-DD HH:mm:ss')]
                    )
                })
                .then(() => {
                    // Reconnaitre si l'utilisateur connécté
                    let socketIdUser2 = 0
                    for (let socketId in tabUsernameConnecter)
                        if (tabUsernameConnecter[socketId] === username2.trim())
                            socketIdUser2 = socketId
                    if (socketIdUser2 !== 0) {
                        // Envoyer un evenement newMessage à l'utilisateur
                        return db.query(`
                            SELECT * FROM message WHERE 
                            ( pseudoEnvoie = ? AND pseudoRecoie = ? ) OR  
                            ( pseudoEnvoie = ? AND pseudoRecoie = ? ) ORDER BY dateMessage DESC LIMIT 1`,
                            [username, username2.trim(), username2.trim(), username]
                        )
                    }
                })
                .then(result => {
                    if (result) {
                        let socketIdUser2 = 0
                        for (let socketId in tabUsernameConnecter)
                            if (tabUsernameConnecter[socketId] === username2.trim())
                                socketIdUser2 = socketId
                        console.log(tabUsernameConnecter[socketIdUser2])
                        socket.to(socketIdUser2).emit('new-message-prive', result[0], username)
                        socket.emit('confirmation-message-prive', result[0])
                    }
                })
                .catch(err => console.log(err))
        }
    })

    socket.on('ecriture', username2 => {
        let socketIdUser2 = 0
        console.log('Ecriture à ' + username2)
        for (let socketId in tabUsernameConnecter)
            if (tabUsernameConnecter[socketId] === username2.trim())
                socketIdUser2 = socketId

        socket.to(socketIdUser2).emit('ecriture', username)
    })
}



