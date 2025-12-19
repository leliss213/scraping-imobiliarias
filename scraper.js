const puppeteer = require('puppeteer');
const sites = require('./sites');  // Importa a lista de sites com os parametros
const converterPlanilha = require('./converterPlanilha');
const fs = require('fs');

// Loop atraves da lista de sites e realiza o scraping para cada um
(async () => {
    let listaImoveis = [];

    for (const site of sites) {
        console.log(`Iniciando scraping para o site: ${site.url}`);
        const imoveis = await iniciarScraping(site);
        listaImoveis = listaImoveis.concat(imoveis);
    }

    listaImoveis.sort((a, b) => a.preco - b.preco);

    const jsonData = JSON.stringify(listaImoveis.sort(), null, 2);
    fs.writeFileSync("imoveis.json", jsonData, "utf-8");

    converterPlanilha(listaImoveis)

})();

// Funcao principal para iniciar o scraping
async function iniciarScraping(site) {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });
    const page = await browser.newPage();
    var listaImoveis = []
    var imoveis = []

    var contadorPaginas = 1

    // Acessa o site
    await page.goto(site.url, { waitUntil: 'networkidle2', timeout: 60000 });

    const quantidadePaginas = await page.evaluate((site) => { return document.querySelectorAll(site.nextButtonSelector.selector).length }, site)

    while (true) {

        // Rola a pagina ate carregar todos os imoveis
        await scrollToEnd(page);

        console.log(site.hrefImovel)
        console.log(site.hrefImovel2)

        if (site.hrefImovel) {
            await page.waitForSelector(site.hrefImovel, { timeout: 10000 });
        }

        // Coleta os imoveis
        imoveis = await coletarImoveis(page, site);
        listaImoveis = listaImoveis.concat(imoveis)

        var selectorNextButton = site.nextButtonSelector.selector
        var typeNextButton = site.nextButtonSelector.tipoNextButton

        console.log(`Contador: ${contadorPaginas}`)

        if (typeNextButton === 4) {

            var qntdNode = await page.evaluate(() => {
                return document.querySelectorAll('.lista_imoveis_paginacao a').length;
            });

            selectorNextButton = selectorNextButton + `:nth-of-type(${qntdNode})`
        }

        console.log(selectorNextButton)

        const nextButton = await page.$(selectorNextButton);
        const nextButtonDisabled = nextButton ? await page.evaluate(el => el.getAttribute('aria-disabled') === 'true', nextButton) : true;
        var nextButtonSelectorVariable = `${selectorNextButton}:nth-of-type(${contadorPaginas + 1}) a`

        if (typeNextButton === 2) {
            if (contadorPaginas === quantidadePaginas) {
                break;
            }
        } else {
            if (!nextButton || nextButtonDisabled) {
                console.log(!nextButton)
                console.log(nextButtonDisabled)
                break;
            }
        }

        if (typeNextButton === 2) {
            await page.click(nextButtonSelectorVariable);
        } else {
            await page.click(selectorNextButton)
        }

        // Aguarda a nova pagina carregar antes de rolar
        if (typeNextButton != 4) {
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
        }

        await waitForScrollEnd(page);

        contadorPaginas++

    }

    await browser.close();
    return listaImoveis;
}

// Funcao para rolar ate o final da pagina carregando todos os elementos
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

// Funcao para coletar imoveis a partir dos seletores especificos
async function coletarImoveis(page, site) {

    const imoveis = await page.evaluate((site) => {

        let lista = [];
        let elementos = document.querySelectorAll(site.containerSelector);

        elementos.forEach(el => {

            let localizacao = el.querySelector(site.localizacaoSelector)?.innerText.trim();
            let preco = el.querySelector(site.precoSelector)?.innerText.trim();

            if (site.imagemSelector != null)
                var imagem = el.querySelector(site.imagemSelector)?.src;

            let nomeSite = site.nomeSite
            let tipoImovel = el.querySelector(site.tipoImovelSelector)?.innerText.trim();

            if (site.infosImovel != null)
                var infosImovel = el.querySelector(site.infosImovelSelector)?.innerText.trim();

            let pathImovel = el.querySelector(site.hrefImovel)?.getAttribute('href');
            pathImovel = (pathImovel == null) ? el.querySelector(site.hrefImovel2)?.getAttribute('href') : pathImovel;

            // monta o link do imovel
            if (pathImovel != null)
                var linkImovel = site.hostImovel + pathImovel

            if (preco || localizacao || linkImovel) {
                lista.push({ localizacao, preco, tipoImovel, infosImovel, nomeSite, linkImovel, imagem });
            }

        });

        return lista;

    }, site);

    return imoveis;

}

//funcao para esperar o evento de scroll da pagina acabar quando troca de pagina
async function waitForScrollEnd(page, timeout = 5000) {
    let lastPosition = await page.evaluate(() => window.scrollY);
    let startTime = Date.now();

    while (true) {
        await new Promise(resolve => setTimeout(resolve, 300)); // Espera um pouco entre verificaçoes

        let newPosition = await page.evaluate(() => window.scrollY);

        if (newPosition === lastPosition) break; // Se a posicao nao mudou, o scroll terminou

        lastPosition = newPosition;

        // Se demorar demais, sai do loop
        if (Date.now() - startTime > timeout) {
            console.warn("Tempo limite atingido para esperar o scroll.");
            break;
        }
    }
}