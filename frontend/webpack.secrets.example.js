const {EnvironmentPlugin} = require('webpack');

module.exports = [new EnvironmentPlugin({
  MATICVIGIL_API_KEY: '123456',
  ALCHEMY_API_KEY: '123456',
  BACKEND_URL: 'http://127.0.0.1:3000'
})];
