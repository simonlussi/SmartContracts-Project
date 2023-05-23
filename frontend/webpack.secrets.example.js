const {EnvironmentPlugin} = require('webpack');

module.exports = [new EnvironmentPlugin({
  BACKEND_URL: 'http://127.0.0.1:3000'
})];
