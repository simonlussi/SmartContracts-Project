# SmartContract Project

Mini-project to learn about smart-contracts

## Version 1: Basis
- connexion a metamask correct (gestion de changement de compte, ajout network, check network, ...) --> OK
- afficher le compte, le solde (MATIC & BUSD), le total supply, check allowance of a spender
- permettre d'envoyer des tokens, approve, transferFrom, burn, mint
- si owner: transferOwnership, renounceOwnership
- bouton refresh + refresh automatique toutes les minutes

## Development

create two file (based on the example file `webpack.secrets.example.js`) and input your ALCHEMY_API_KEY for the mumbai polygon network.
The files are :
1. `webpack.secrets.dev.js`
2. `webpack.secrets.prod.js` 

- install: `npm install`
- develop: `npm start`
- lint: `npm run lint`

### Development documentation and tutorial

- Tailwind [link](https://tailwindcss.com/docs/installation)
- Combining tailwind ans sass loader[https://stackoverflow.com/questions/55606865/combining-tailwind-css-with-sass-using-webpack]
- Detect MetaMask account change[https://stackoverflow.com/questions/70663898/my-dapp-doesnt-detect-when-an-user-change-their-metamask-account]
- useState not refélecting changes[https://stackoverflow.com/questions/54069253/the-usestate-set-method-is-not-reflecting-a-change-immediately]
- React hooks[https://legacy.reactjs.org/docs/hooks-reference.html#useeffect]
- MetaMask switch network[https://ethereum.stackexchange.com/questions/117156/how-to-ask-the-metamask-user-to-switch-its-network]
- Ethers.js (video)[https://www.youtube.com/watch?v=yk7nVp5HTCk&t=1470s] (code)[https://github.com/dappuniversity/ethers_examples/tree/master/examples]
- MetaMask and EthersJS[https://www.youtube.com/watch?v=swZRo6LFrCw]

## Production

- build: `npm run build`
- serve: `npm run serve`
