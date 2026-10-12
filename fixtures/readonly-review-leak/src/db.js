const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

function loadDbConfig(env = 'production') {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'config', 'database.yml'), 'utf8');
  return yaml.load(raw)[env];
}

module.exports = { loadDbConfig };
