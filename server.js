const express = require('express');
const path = require('path');
const open = require('open');
const fs = require('fs');
const sites = require('./sites');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;

// Serve arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rota específica para o JSON de imóveis (que está na raiz)
app.get('/imoveis.json', (req, res) => {
    const jsonPath = path.join(__dirname, 'imoveis.json');
    if (fs.existsSync(jsonPath)) {
        res.sendFile(jsonPath);
    } else {
        res.status(404).json({ error: "Arquivo imoveis.json não encontrado. Execute o scraper primeiro." });
    }
});

app.get('/api/sites-count', (req, res) => {
    res.json({ count: sites.length });
});

// Endpoint para executar o scraper
app.post('/api/scrape', (req, res) => {
    console.log("Recebida solicitação de scraping...");

    // Executa o comando npm run scrape
    exec('npm run scrape', (error, stdout, stderr) => {
        if (error) {
            console.error(`Erro ao executar scraper: ${error.message}`);
            return res.status(500).json({ error: error.message, details: stderr });
        }
        if (stderr) {
            console.log(`Scraper stderr: ${stderr}`);
        }
        console.log(`Scraper stdout: ${stdout}`);

        res.json({ message: "Scraping concluído com sucesso!", output: stdout });
    });
});

app.listen(PORT, async () => {
    // Abre o navegador automaticamente
    await open(`http://localhost:${PORT}`);
});
