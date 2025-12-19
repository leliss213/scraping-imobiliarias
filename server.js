const express = require('express');
const path = require('path');
const open = require('open');
const fs = require('fs');
// const sites = require('./sites'); // REMOVIDO: Usaremos leitura dinamica do JSON
const { exec } = require('child_process');

const sitesFilePath = path.join(__dirname, 'sites.json');

const app = express();
app.use(express.json()); // Habilita parsing de JSON no body
const PORT = process.env.PORT || 3000;

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

// Retorna a contagem de sites
app.get('/api/sites-count', (req, res) => {
    try {
        const sites = JSON.parse(fs.readFileSync(sitesFilePath, 'utf8'));
        res.json({ count: sites.length });
    } catch (error) {
        res.status(500).json({ count: 0 });
    }
});

// GET: Retorna a lista de sites (para edição)
app.get('/api/sites', (req, res) => {
    try {
        const sites = JSON.parse(fs.readFileSync(sitesFilePath, 'utf8'));
        res.json(sites);
    } catch (error) {
        res.status(500).json({ error: "Erro ao ler sites.json" });
    }
});

// POST: Salva atualizações nos sites
app.post('/api/sites', (req, res) => {
    try {
        const newSites = req.body;

        if (!Array.isArray(newSites)) {
            return res.status(400).json({ error: "Dados inválidos." });
        }

        fs.writeFileSync(sitesFilePath, JSON.stringify(newSites, null, 4), 'utf8');
        res.json({ message: "Configuração salva com sucesso!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao salvar sites.json" });
    }
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
    console.log(`Servidor rodando na porta ${PORT}`);

    try {
        await open(`http://localhost:${PORT}`);
    } catch (e) {
        console.log("Não foi possível abrir o navegador automaticamente.");
    }
});
