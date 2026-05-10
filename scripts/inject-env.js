const fs = require('fs');
const path = require('path');

const token = process.env.MAPBOX_TOKEN;

if (!token) {
  console.error('ERROR: Falta la variable de entorno MAPBOX_TOKEN.');
  process.exit(1);
}

if (!token.startsWith('pk.')) {
  console.error('ERROR: Para frontend usa un Mapbox public token que empiece con pk.');
  process.exit(1);
}

const files = [
  path.join(__dirname, '..', 'src', 'environments', 'environment.production.ts')
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/__MAPBOX_TOKEN__/g, token);
  fs.writeFileSync(file, content, 'utf8');
}

console.log('Mapbox token inyectado para build de producción.');