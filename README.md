# SmartContract Project

Mini-project to learn about smart-contracts

## Version 1: Base

- connexion a metamask correct (gestion de changement de compte, ajout network, check network, ...)
- afficher le compte, le solde (MATIC & BUSD), le total supply, check allowance of a spender
- permettre d'envoyer des tokens, approve, transferFrom, burn, mint
- si owner: transferOwnership, renounceOwnership
- bouton refresh + refresh automatique toutes les minutes

## Version 2: Historique

- utilisation d'event via function "getPastEvents" (ou equivalent ethers.js)
- afficher les 10 dernieres actions effectuée sur ce token (approved, transfer)
- afficher les 10 dernieres actions effectuée sur ce token (approved, transfer) par l'utilisateur actif
- voir l'allowance actuelle de l'utilisateur, lorsque celles-ci sont non-nulle de toutes les autres address que l'utilisateur a apprové
- mettre un bouton refresh + refresh automatique toutes les minutes (pour refresh les info de v1 + les event de la v2)

## Version 3: Utilisation du backend
- passer sur une vm (ou bien en localhost sur l'ordi) avec un backend. le front ne fait plus de requete a la blockchain (à par pour valider un transfer metamask), il doit s'appuyer 100% sur le backend pour toutes les données à afficher
- le backend analyse et entretien une base de donnée sur toutes les donnée du contract (balance des compte, toutes les allowances, liste des transfers, ...)
- au demarrage du backend celui ci regarde la db et va aller l'updater.
- toutes les 30 minutes celui ci s'update (1min en mode dev eventuellement...)
- REST api sur le backend: 
- une commande api pour clear la db (DELETE /all)
- plusieurs commande GET pour obtenir les données (allowance, liste des transfers, ... )
- pas de commande POST/PUT, le backend s'update tout seul. ce n'est pas grave si les données ne sont pas a jour et sont en retard de 30min.
- fais partir de l'update au demarrage et a chaque minute
- analyse du volume journalier des transfer d'BUSD, via le listing des pasts event "transfer"
- graph du volume dans le front (nombre de transfer et quantité transférée chaque jour)

## Frontend

The Frontend is in the `frontend`sub-directory

## Backend

The backend is available in the `backend` sub-directory

### Development

Move into the frontend directory

create `webpack.secrets.dev.js` and `webpack.secrets.prod.js` and put the Backend URL (in dev: should be http://127.0.0.1:3000) (refer to `webpack.secrets.example.js`) 

Move into the backend directory

create `.env.dev` and `.env.prod` and put the API key for the RPC Providers and the update intervall  (refer to `.env.example`) 

From the main directory run:
- start: `make build-dev`
- stop: `make stop-dev`
- clean database: `make clean`

### Production

From the main directory run:
- start: `make build`
- stop: `make stop`
- clean database: `make clean`

### Documentation and tutorial

- Tailwind [Link here](https://tailwindcss.com/docs/installation)
- Combining tailwind ans sass loader [Link here](https://stackoverflow.com/questions/55606865/combining-tailwind-css-with-sass-using-webpack)
- Detect MetaMask account change [Link here](https://stackoverflow.com/questions/70663898/my-dapp-doesnt-detect-when-an-user-change-their-metamask-account)
- useState not refélecting changes [Link here](https://stackoverflow.com/questions/54069253/the-usestate-set-method-is-not-reflecting-a-change-immediately)
- React hooks [Link here](https://legacy.reactjs.org/docs/hooks-reference.html#useeffect)
- MetaMask switch network [Link here](https://ethereum.stackexchange.com/questions/117156/how-to-ask-the-metamask-user-to-switch-its-network)
- Ethers.js [Video](https://www.youtube.com/watch?v=yk7nVp5HTCk&t=1470s) [Github code](https://github.com/dappuniversity/ethers_examples/tree/master/examples)
- MetaMask and EthersJS [Link here](https://www.youtube.com/watch?v=swZRo6LFrCw)
- Ethereum/React Todo List #1 [Video](https://www.youtube.com/watch?v=AiWkkj8lSTc)
- Ethereum/React Todo List #2 [Video](https://www.youtube.com/watch?v=mmI5CpMw3gU)
- Master Ethers.js for Blockchain Step-by-Step [Video](https://www.youtube.com/watch?v=yk7nVp5HTCk)
- Error thrown upon changing network [Link here](https://github.com/Uniswap/web3-react/issues/127)
- Ethers equivalent of web3 getPastEvents [Link here](https://github.com/ethers-io/ethers.js/issues/52)
- Ethers queryFilter iterate through blocks [Link here](https://ethereum.stackexchange.com/questions/107590/contract-queryfilterfilter-giving-me-errors-in-ethers-js)


