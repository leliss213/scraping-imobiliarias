const puppeteer = require('puppeteer');
const sites = require('./sites');  // Importa a lista de sites com os parâmetros

// Função para rolar até o final da página
async function scrollToEnd(page) {
    let previousHeight = 0;
    let newHeight = await page.evaluate(() => document.body.scrollHeight);

    while (newHeight > previousHeight) {
        previousHeight = newHeight;
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(resolve => setTimeout(resolve, 2000)); // Espera carregar novos itens
        newHeight = await page.evaluate(() => document.body.scrollHeight);
    }
}

// Função para coletar imóveis a partir dos seletores específicos
async function coletarImoveis(page, site) {

    const imoveis = await page.evaluate((site) => {
        let lista = [];
        let elementos = document.querySelectorAll(site.containerSelector);

        elementos.forEach(el => {

            let localizacao = el.querySelector(site.localizacaoSelector)?.innerText.trim() || 'Localizacao nao encontrada';
            let preco = el.querySelector(site.precoSelector)?.innerText.trim() || 'Preco nao disponivel';

            if(site.imagemSelector != null)
                var imagem = el.querySelector(site.imagemSelector)?.src || 'Imagem nao encontrada';

            let nomeSite = site.nomeSite
            let tipoImovel = el.querySelector(site.tipoImovelSelector)?.innerText.trim() || 'Tipo do imovel nao encontrado';

            if(site.infosImovel != null)
                var infosImovel = el.querySelector(site.infosImovelSelector)?.innerText.trim() || '';

            let pathImovel = el.querySelector(site.hrefImovel)?.getAttribute('href');
            pathImovel = (pathImovel == null) ? el.querySelector(site.hrefImovel2)?.getAttribute('href') : pathImovel;
            
            let linkImovel = site.hostImovel + pathImovel
            lista.push({ localizacao, preco, imagem, nomeSite, tipoImovel, infosImovel, linkImovel });
            
        });

        return lista;
    }, site);

    return imoveis;
}

// Função principal para iniciar o scraping
async function iniciarScraping(site) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Acessa o site
    await page.goto(site.url, { waitUntil: 'networkidle2', timeout: 60000 });

    //await page.waitForSelector(site.hrefImovel, { timeout: 15000 });
    //await page.waitForSelector(site.hrefImovel2, { timeout: 15000 });

    // Rola a página até carregar todos os imóveis
    await scrollToEnd(page);

    // Coleta os imóveis
    const imoveis = await coletarImoveis(page, site);

    await browser.close();

    return imoveis;
}

// Loop através da lista de sites e realiza o scraping para cada um
(async () => {
    let listaImoveis = [];

    for (const site of sites) {
        console.log(`Iniciando scraping para o site: ${site.url}`);
        const imoveis = await iniciarScraping(site);
        listaImoveis = listaImoveis.concat(imoveis);
    }

    console.log(listaImoveis)
})();
