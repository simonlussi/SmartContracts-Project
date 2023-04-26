const { EnvironmentPlugin } = require('webpack');

module.exports = [
  new EnvironmentPlugin({
    ALCHEMY_API_KEY: 'ALCHEMY_API_KEY_HERE',
  })];