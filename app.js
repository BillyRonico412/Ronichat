// Connexion à la base de données 
const config = require('./assets/config.json')
const mysql = require('promise-mysql')

mysql.createConnection(config.dbInfo)
    .then(db => {

        // Fonction de base 
        const checkAndSend = result => {
            if (result instanceof Error)
                return { status: 'error', message: result.message }
            return { status: 'success', result }
        }

        // Chargement des modules
        const express = require('express')
        const bodyParser = require('body-parser')

        // Constantes globales
        const app = express()
        const server = require('http').Server(app)
        const io = require('socket.io')(server)

        // Middleware
        app.use(require('morgan')('dev'))
        app.use('/static', express.static('views'))
        app.use(require('cookie-parser')())
        app.use(bodyParser.json())
        app.use(bodyParser.urlencoded({ extended: true }))

        // Routage pour authentification
        const Authentification = require('./assets/authentification')(db)
        const connexionRoute = express.Router()
        app.use(config.routeAPI + '/authentification', connexionRoute)

        connexionRoute.route('/connexion')
            .get(Authentification.refresh)
            .post(Authentification.connexion)

        connexionRoute.route('/creer-compte')
            .post(Authentification.creerCompte)

        // Routage pour message
        const Messagerie = require('./assets/messagerie')(db)
        const messagerieRoute = express.Router()
        app.use(config.routeAPI + '/messagerie', messagerieRoute)

        // Middleware de verification de token
        messagerieRoute.use((req, res, next) => {
            if (req.cookies.token && Authentification.verifyToken(req.cookies.token)) next()
            else res.status(400).end()
        })

        // Recuperation de tout les messages dans la discussion générale
        messagerieRoute.route('/discussion')
            .get(async (req, res) => res.json(checkAndSend(await Messagerie.getMessageGeneral())))

        // Recuperation de tout les users
        messagerieRoute.route('/users')
            .get(async (req, res) => res.json(checkAndSend(await Messagerie.getAllUsername())))

        // Recuperation des messages entre user1 et user2
        messagerieRoute.route('/message/:username2')
            .get(async (req, res) => res.json(checkAndSend(
                await Messagerie.getMessage(req.cookies.token, req.params.username2)
            )))

        messagerieRoute.route('/vue/:username2')
            .put(async (req, res) => res.json(
                await Messagerie.updateVue(req.cookies.token, req.params.username2))
                )

        // Routage synchrone
        app.get('/', (req, res) => {
            if (!req.cookies.token || !Authentification.verifyToken(req.cookies.token))
                res.redirect('/authentification')
            else res.sendFile(__dirname + '/views/messagerie/index.html')
        })

        // Accès à la page d'authentification
        app.get('/authentification', (req, res) => {
            if (!req.cookies.token || !Authentification.verifyToken(req.cookies.token))
                res.sendFile(__dirname + '/views/authentification/index.html')
            else res.redirect('/')
        })

        // Acces à notre favicon
        app.get('/favicon.ico', (req, res) => {
            res.sendFile(__dirname + '/favicon.ico')
        })

        // Accès à notre page d'érreur
        app.get('/erreur', (req, res) => {
            res.sendFile(__dirname + '/views/erreur.html')
        })

        // Gestion de nos sockets

        const gestionSocket = require('./assets/gestion-socket')
        io.on('connection', gestionSocket(db))

        // Ecouter notre serveur
        server.listen(config.port, '0.0.0.0', () => {
            console.log('Listen to localhost:' + config.port)
        })

    })

    .catch(err => console.log(err))