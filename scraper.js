const puppeteer = require('puppeteer');
const sites = require('./sites');  // Importa a lista de sites com os parâmetros
const converterPlanilha = require('./converterPlanilha')

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
            
            // monta o link do imovel
            if(pathImovel != null)
                var linkImovel = site.hostImovel + pathImovel
            else
                var linkImovel = site.hostImovel

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
    var listaImoveis = []
    var imoveis = []

    var contadorPaginas = 1

    // Acessa o site
    await page.goto(site.url, { waitUntil: 'networkidle2', timeout: 60000 });

    const quantidadePaginas = await page.evaluate((site) => {return document.querySelectorAll(site.nextButtonSelector.selector).length}, site)
    console.log(`QUANTIDADE: ${quantidadePaginas}`)

    while(true){

        // Rola a página até carregar todos os imóveis
        await scrollToEnd(page);

        // Coleta os imóveis
        imoveis = await coletarImoveis(page, site);
        listaImoveis = listaImoveis.concat(imoveis)

        var selectorVariavel = ""
        
        if(site.nextButtonSelector.tipoNextButton === 2){
            selectorVariavel = `${site.nextButtonSelector.selector}:nth-of-type(${contadorPaginas})`
        }else{
            selectorVariavel = site.nextButtonSelector.selector
        }

        console.log(`QUANTIDADE: ${quantidadePaginas}`)

        const nextButton = await page.$(selectorVariavel);
        const nextButtonDisabled = nextButton ? await page.evaluate(el => el.getAttribute('aria-disabled') === 'true', nextButton) : true;

        if(site.nextButtonSelector.tipoNextButton === 2){
            if(contadorPaginas === quantidadePaginas){
                break;
            }
        }else{
            if(!nextButton || nextButtonDisabled || contadorPaginas === quantidadePaginas){
                console.log(!nextButton)
                console.log(nextButtonDisabled)
                break;
            }
        }

        await page.click(site.nextButtonSelector.selector);

        // Aguarda a nova página carregar antes de rolar
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

        await waitForScrollEnd(page);

        contadorPaginas++
        
    }

    await browser.close();

    return listaImoveis;
}

async function waitForScrollEnd(page, timeout = 5000) {
    let lastPosition = await page.evaluate(() => window.scrollY);
    let startTime = Date.now();

    while (true) {
        await new Promise(resolve => setTimeout(resolve, 300)); // Espera um pouco entre verificações

        let newPosition = await page.evaluate(() => window.scrollY);

        if (newPosition === lastPosition) break; // Se a posição não mudou, o scroll terminou

        lastPosition = newPosition;

        if (Date.now() - startTime > timeout) {
            console.warn("Tempo limite atingido para esperar o scroll.");
            break; // Se demorar demais, sai do loop
        }
    }
}


// Loop através da lista de sites e realiza o scraping para cada um
(async () => {
    let listaImoveis = [];

    for (const site of sites) {
        console.log(`Iniciando scraping para o site: ${site.url}`);
        const imoveis = await iniciarScraping(site);
        listaImoveis = listaImoveis.concat(imoveis);
    }

    converterPlanilha(listaImoveis)
    
})();
