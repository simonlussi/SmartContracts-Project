const {EnvironmentPlugin} = require('webpack');

module.exports = [new EnvironmentPlugin({
  MATICVIGIL_API_KEY: '123456',
  ALCHEMY_API_KEY: '123456',
})];
