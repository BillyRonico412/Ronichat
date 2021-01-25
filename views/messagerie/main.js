const socket = io()

// Fonction permettant de scroller tout en bas (à utiliser pour les messages)
const scrollBottom = scrollLimite => {
    // Scroll limite : A partir de quel limite, on scroll
    if (window.scrollY > document.body.scrollHeight - scrollLimite - 400)
        setTimeout(() => window.scrollTo({
            top: document.body.scrollHeight + 1000,
            left: 0,
            behavior: "smooth"
        }), 500)
}

// Fonctions permettant de faire sonner une notification
const notification = () => {
    document.getElementById('audio-notif').play()
}

// Fonction permettant d'arranger les dates recuperer depuis la base de données
const arrangeDate = date => {
    const dateArrange = new Date(date)
    const tabJourSemaine = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    const tabMois = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']
    const finMois = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    const finMoisBissextile = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

    const jourSemaine = tabJourSemaine[dateArrange.getDay() - 1]
    const jour = dateArrange.getDate()
    const mois = tabMois[dateArrange.getMonth()]
    const annee = dateArrange.getFullYear()
    const auj = new Date()

    if (
        dateArrange.getDate() === auj.getDate() &&
        dateArrange.getMonth() === auj.getMonth() &&
        dateArrange.getFullYear() === auj.getFullYear()
    ) return `${dateArrange.getHours()} : ${dateArrange.getMinutes()} : ${dateArrange.getSeconds()}`

    if (
        (
            dateArrange.getDate() === auj.getDate() - 1 &&
            dateArrange.getMonth() === auj.getMonth() &&
            dateArrange.getFullYear() === auj.getFullYear()
        ) || (
            auj.getFullYear() == dateArrange.getFullYear() &&
            auj.getDate() == 1 && auj.getFullYear() % 4 === 0 &&
            auj.getMonth() - 1 == dateArrange.getMonth() &&
            dateArrange.getDate() == finMoisBissextile[dateArrange.getMonth]
        ) || (
            auj.getFullYear() == dateArrange.getFullYear() &&
            auj.getDate() == 1 && auj.getFullYear() % 4 !== 0 &&
            auj.getMonth() - 1 == dateArrange.getMonth() &&
            dateArrange.getDate() == finMois[dateArrange.getMonth]
        ) || (
            auj.getDate() == 1 && dateArrange.getDate() == 31 &&
            auj.getMonth() == 0 && dateArrange.getMonth() == 11 &&
            auj.getFullYear() - 1 === dateArrange.getFullYear()
        )
    ) return `Hier`

    return `${jourSemaine} ${jour}-${mois}-${annee}`
}

// Fonction permettant d'arranger les dates sur les bulles des messages 
const arrangeDateBulle = (date) => {
    const dateArrange = new Date(date)

    const heure = dateArrange.getHours()
    const min = dateArrange.getMinutes()
    const seconde = dateArrange.getSeconds()

    return `${heure}:${min}:${seconde}`
}
// Composant permettant de modeliser une bulle de message
const bulleMsg = {
    name: 'bulle-msg',
    template: `
    <div :class="['msg', 'd-flex', envoieOuRecoie ? 'justify-content-end' : 'justify-content-start']">
        <div class="bulle-msg d-inline-block my-2" @click="afficheDate = !afficheDate">
            <div
                class="bulle-msg-header border-bottom px-4 py-2 d-flex align-items-center rounded-top text-white"
                :class="envoieOuRecoie ? 'bg-primary' : 'bg-secondary'">
                <i class="fas fa-user me-2"></i>
                <strong class="me-auto"> {{ username }}</strong>
                <small class="ms-4">{{ arrangeDate(dateReception) }}</small>
            </div>
            <div class="bulle-msg-body px-4 py-3 border-bottom border-start border-end rounded-bottom bg-light">
                {{ message }}
            </div>
            <transition name="date-bulle">
                <div class="bulle-msg-footer text-end px-2" v-if="afficheDate">
                    <small class="text-white">{{ arrangeDateBulle(dateReception) }}</small>
                </div>
            </transition>
        </div>
    </div>
    `,
    props: {
        username: String,
        dateReception: String,
        message: String,
        envoieOuRecoie: Boolean // true envoie, false reception
    }, methods: {
        arrangeDate, arrangeDateBulle
    }, data() {
        return {
            afficheDate: false
        }
    }
}

// Composant permettant de representé un message 
const message = {
    template: `
    <li class="list-group-item py-3 message" :class="{'bg-warning': !!nonVue}" style="cursor: pointer" @click="$emit('click-message', username)">
        <div class="d-flex w-100">
            <strong class="fs-5">{{ username }} </strong>
            <small class="ms-auto badge bg-secondary text-white pt-2">{{ arrangeDate(dateReception) }}</small>
        </div>
        <div class="text-truncate d-flex">
            <span v-if="envoie" class="me-1"> Vous: </span> <span> {{ message }} </span>
            <span class="ms-auto badge bg-primary my-1" v-if="!!nonVue"> {{ nonVue }} </span>
        </div>
    </li>
    `,
    props: {
        username: String,
        dateReception: String,
        message: String,
        envoie: { type: Boolean, default: false }, // true envoie, false reception
        nonVue: Number
    },
    methods: {
        arrangeDate
    },
}

// Vue model
const vm = new Vue({
    el: '#app',
    components: {
        bulleMsg, message
    },
    data: {
        boiteOuMessage: true, // true: boite de reception , false : messages
        username: '', // Username de notre utilisateur
        allUsernamesOnline: [], // La liste de tout les usernames en ligne
        textMessage: '',
        destinationMessage: '', // Destination de notre message
        listMessageGeneral: [], // Liste message dans la discussion générale
        listMessagePrive: [], // Liste message privé chargé en fonction de la destination message
        allUsernames: [], // Tout les usernames
        allLastMessages: [], // Les derniers messages
        generalOuPrive: true, // Boolean pour indiquer si on est sur général ou privé
        listLastMessage: [], // Listes des derniers messages
        boolEcriture: false
    },

    computed: {
        allUsernamesNotOnline() {
            return this.allUsernames.filter(unUsername => (
                !this.allUsernamesOnline.includes(unUsername.username)
            ))
        },
        lastMessageGeneral() {
            return this.listMessageGeneral.length === 0 ? '' : this.listMessageGeneral[this.listMessageGeneral.length - 1]
        },

        nbreMessageNonVue() {
            let result = 0
            this.listLastMessage.forEach(lastMessage => result += lastMessage.nonVue)
            return result
        }
    },

    methods: {

        // Fonction permettant de faire une deconnexion
        deconnexion() {
            Cookies.remove('token')
            document.location.reload()
        },

        updateLastMessage() {
            let result = []
            for (username in this.allLastMessages) {
                this.allLastMessages[username]['message'].nonVue = this.allLastMessages[username].nonVue
                result[this.allLastMessages[username]['index']] = this.allLastMessages[username]['message']
            }
            this.listLastMessage = result
        },

        // Fonction permettant d'ouvrir un message perso ou générale
        ouvrirMessage(username2) {
            this.destinationMessage = username2
            this.boiteOuMessage = false
            this.$refs.closeModalAmisEnLigne.click()
            if (this.destinationMessage === 'Tchat Général')
                this.generalOuPrive = true
            else {
                this.generalOuPrive = false

                // Mettre un vue à tout les messages
                axios.put('/api/messagerie/vue/' + this.destinationMessage)
                    .then(result => {
                        if (result.data) {
                            this.allLastMessages[username2]['nonVue'] = 0
                            this.updateLastMessage()
                        }
                    })

                // Recuperer tout les messages de l'username2
                axios.get('/api/messagerie/message/' + this.destinationMessage)
                    .then(res => {
                        if (res.data.status === 'success')
                            this.listMessagePrive = res.data.result
                        else console.log(res.data.message)
                    })
            }
            scrollBottom(1000000)
        },

        // Fonction permettant d'nevoyer un message (privé ou général)
        envoieMessage() {
            if (this.destinationMessage === 'Tchat Général') {
                if (this.textMessage.trim() !== '') {
                    socket.emit('send-message-general', this.textMessage.trim())
                    this.textMessage = ''
                }
            } else {
                if (this.textMessage.trim() !== '') {
                    socket.emit('send-message-prive', this.textMessage.trim(), this.destinationMessage)
                    this.textMessage = ''
                }
            }
        },

        ecriture() {
            if (!this.generalOuPrive)
                socket.emit('ecriture', this.destinationMessage)
        }
    },


    created() {

        // Rechargement des cookies au chargement de la page 
        axios.get('/api/authentification/connexion')
            .then(res => console.log('Session refresh'))
            .catch(err => console.log(err))

        // Rechargement des cookies tout les 5 min
        setInterval(() => axios.get('/api/authentification/connexion')
            .then(res => console.log('Session refresh'))
            .catch(err => console.log(err)), 300000
        )

        // Recuperer tout les users
        axios.get('/api/messagerie/users')
            .then(res => {
                if (res.data.status === 'success')
                    this.allUsernames = res.data.result
                else console.log(res.data.message)
            })
            .catch(err => console.log(err))

        // Recuperation des discussions générales
        axios.get('/api/messagerie/discussion')
            .then(res => {
                if (res.data.status === 'success')
                    this.listMessageGeneral = res.data.result
                else console.log(res.data.message)
            })

        // Gestion des sockets

        // Envoyer le token au serveur pour la reconnaissance de notre username
        socket.emit('connecter', Cookies.get('token'))

        // Resolution de nom et chargement de tout les usernames
        socket.on('username-resolu', (username, allUsernamesOnline) => {
            this.username = username
            this.allUsernamesOnline = allUsernamesOnline
        })

        // Recuperer tout les derniers messages de l'username
        socket.on('tout-les-derniers-messages', allLastMessages => {
            this.allLastMessages = allLastMessages
            this.updateLastMessage()
        })

        // Erreur, utilisateur non deconnecter
        socket.on('user-deja-connecter', () => {
            console.log('user deja utilise')
            window.location.href = '/erreur'
        })

        // Nouvelle utilisateur connécté
        socket.on('new-user', (username, allUsernamesOnline) => {
            this.allUsernamesOnline = allUsernamesOnline
        })

        //  Nouvelle utilisateur déconnécté
        socket.on('left-user', (username, allUsernamesOnline) => {
            this.allUsernamesOnline = allUsernamesOnline
        })

        // On a envoyé un nouveau message dans la dicussion générale
        socket.on('confirm-message-general', message => {
            this.listMessageGeneral.push(message)
            scrollBottom(1000000)
        })

        // On a recu un nouveau message dans la discussion générale
        socket.on('new-message-general', message => {
            this.listMessageGeneral.push(message)
            scrollBottom(300)
            notification()
        })

        // Receeption d'un nouveau message
        socket.on('new-message-prive', (message, username2) => {
            // Raffraichir les lastMessages

            // Username 2 a déja un message
            let indexUsername2 = this.allLastMessages[username2] !== undefined ?
                this.allLastMessages[username2]['index'] :
                Infinity

            for (let username in this.allLastMessages)
                if (this.allLastMessages[username]['index'] < indexUsername2)
                    this.allLastMessages[username]['index']++

            let nonVue = 1

            if (this.username === message.pseudoRecoie) {
                // Faut mettre à jour nos Vues
                // On est pas sur username 2

                if (this.destinationMessage !== username2 || this.boiteOuMessage) {
                    if (this.allLastMessages[username2])
                        nonVue = this.allLastMessages[username2]['nonVue'] + 1
                }
                else {
                    axios.put('/api/messagerie/vue/' + this.destinationMessage)
                    nonVue = 0
                }

            }

            this.allLastMessages[username2] = { message, index: 0, nonVue }

            // Raffraichier les messages
            if (!this.boiteOuMessage && this.destinationMessage === username2) {
                this.listMessagePrive.push(message)
                scrollBottom(300)
                notification()
            }

            this.updateLastMessage()
        })

        socket.on('confirmation-message-prive', message => {
            this.listMessagePrive.push(message)
            scrollBottom(1000000)
            this.updateLastMessage()
        })

        var timeOutEcriture;

        socket.on('ecriture', username2 => {
            if (!this.boiteOuMessage && this.destinationMessage === username2) {
                this.boolEcriture = true
                clearTimeout(timeOutEcriture)
                timeOutEcriture = setTimeout(() => {
                    this.boolEcriture = false
                }, 500)
                scrollBottom(300)
            }

        })
    },
})