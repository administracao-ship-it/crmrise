const http = require('http');

async function testApi() {
  console.log("🚀 Iniciando Testes de API do CRM Rise...");
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/leads',
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => { data += chunk; });
    
    res.on('end', () => {
      console.log(`\n✅ Status Code (GET /api/leads): ${res.statusCode}`);
      if (res.statusCode === 200) {
        const leads = JSON.parse(data);
        console.log(`📊 Total de leads encontrados: ${leads.length}`);
      } else {
        console.error("❌ Erro ao buscar leads:", data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Falha na requisição: ${e.message}`);
  });

  req.end();
}

testApi();
