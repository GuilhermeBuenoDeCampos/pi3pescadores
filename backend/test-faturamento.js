const jwt = require('./src/utils/jwt');
const http = require('http');

// Generate a valid JWT with admin role
const token = jwt.sign({
  sub: 'a2344976-c2ba-47c1-a582-03c356240a20',
  tipo_usuario: 'admin',
  nome: 'Test Admin',
});

console.log('Generated JWT token');
console.log('Token:', token.substring(0, 50) + '...');

// Verify the token works
try {
  const decoded = jwt.verify(token);
  console.log('Token verified:', decoded.tipo_usuario, decoded.sub);
} catch (e) {
  console.error('Token verify failed:', e.message);
  process.exit(1);
}

// Make HTTP request to the faturamento endpoints
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/faturamento-completo/' + path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  const endpoints = ['resumo', 'por-metodo-pagamento', 'por-categoria', 'top-produtos', 'comparativo-anual', 'meta-realizado'];

  for (const ep of endpoints) {
    try {
      console.log(`\n=== Testing /api/faturamento-completo/${ep} ===`);
      const result = await makeRequest(ep);
      console.log(`Status: ${result.status}`);
      if (result.status === 200) {
        const parsed = JSON.parse(result.body);
        console.log('Success! Data keys:', Object.keys(parsed.data || {}).join(', '));
        console.log('Preview:', JSON.stringify(parsed.data).substring(0, 200));
      } else {
        console.log('Body:', result.body.substring(0, 300));
      }
    } catch (err) {
      console.error('Request error:', err.message);
    }
  }
}

runTests().then(() => {
  console.log('\nDone');
});
