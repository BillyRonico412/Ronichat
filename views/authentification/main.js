
const controleUsername = username => /^[a-z A-Z]{3,30}$/.test(username)
const controleMdp = mdp => /^[a-z A-Z0-9]{3,30}$/.test(mdp)

Cookies.remove('token')

const vm = new Vue({
    el: '#app',
    data: {
        username: '',
        motDePasse: '',
        usernameCreer: '',
        mdpCreer: '',
        mdpConfirmation: '',
        booleanErreurCreation: false,
        erreurCreation: '',
        booleanErreurConnexion: false,
        erreurConnexion: ''
    },
    methods: {
        creerCompte() {

            if (!controleUsername(this.usernameCreer)) {
                this.erreurCreation = 'L\'username doit être une suite de chaine alphabétique sans caractère spéciaux'
                this.afficheErreurCreation()
            }
            else if (!controleMdp(this.mdpCreer)) {
                this.erreurCreation = 'Le mot de passe doit être une suite de chaine alphanumérique sans caractère spéciaux'
                this.afficheErreurCreation()
            }
            else if (this.mdpCreer !== this.mdpConfirmation) {
                this.erreurCreation = 'Le mot de passe et la confirmation ne correspond pas'
                this.afficheErreurCreation()
            }

            else {
                // Tout est bon, on peut envoyer la requête
                axios.post('/api/authentification/creer-compte', {
                    username: this.usernameCreer,
                    motDePasse: this.mdpCreer
                })
                    .then(() => {
                        this.$refs.closeModalButton.click()
                        this.username = this.usernameCreer
                        this.motDePasse = this.mdpCreer
                        this.usernameCreer = ''
                        this.mdpCreer = ''
                    })
                    .catch(err => {
                        if (err.message === 'Request failed with status code 400') {
                            this.erreurCreation = 'Username déja utilisé !!!'
                            this.afficheErreurCreation()
                        }
                    })
            }

        },
        connexion() {
            axios.post('/api/authentification/connexion', {
                username: this.username, 
                motDePasse: this.motDePasse
            }).then(res => {
                document.location.href = '/'
            }).catch(err => {
                if (err.message === 'Request failed with status code 400') {
                    this.erreurConnexion = 'Username ou mot de passe absent!'
                    this.afficheErreurConnexion()
                } else if (err.message === 'Request failed with status code 401') {
                    this.erreurConnexion = 'Username ou mot de passe incorect!'
                    this.afficheErreurConnexion()
                }
            })
        },
        afficheErreurCreation() {
            this.booleanErreurCreation = true
            setTimeout(() => this.booleanErreurCreation = false, 3000)
        },
        afficheErreurConnexion() {
            this.booleanErreurConnexion = true
            setTimeout(() => this.booleanErreurConnexion = false, 3000)
        },
        controleUsername, controleMdp
    },
})