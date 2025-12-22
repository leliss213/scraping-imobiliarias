const puppeteer = require('puppeteer');
const sites = require('./sites.json');  // Importa a lista de sites do JSON
const converterPlanilha = require('./converterPlanilha');
const fs = require('fs');

// Loop atraves da lista de sites e realiza o scraping para cada um
(async () => {
    let listaImoveis = [];

    for (const site of sites) {

        if (site.enabled === false) {
            console.log(`Pulou site desabilitado: ${site.nomeSite}`);
            continue;
        }

        try {
            console.log(`Iniciando scraping: ${site.nomeSite}`);
            const imoveis = await iniciarScraping(site);
            listaImoveis = listaImoveis.concat(imoveis);
        } catch (error) {
            console.error(`Erro ao processar o site ${site.url}:`, error);
        }
    }

    // Ordena a lista de imoveis por preco
    listaImoveis.sort((a, b) => a.preco - b.preco);

    const dataDir = "data";
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const jsonData = JSON.stringify(listaImoveis.sort(), null, 2);
    fs.writeFileSync(`${dataDir}/imoveis.json`, jsonData, "utf-8");

    try {
        converterPlanilha(listaImoveis)
    } catch (error) {
        console.error(`Erro ao converter para planilha:`, error);
    }

    console.log("Scraping finalizado com sucesso.");
    process.exit(0);

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

    // Otimizacao: Bloquear recursos desnecessarios (imagens e fontes)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'font'].includes(resourceType)) {
            req.abort();
        } else {
            req.continue();
        }
    });

    var listaImoveis = []

    const urls = [];
    if (site.url_venda) urls.push({ url: site.url_venda, tipo: 'VENDA' });
    if (site.url_aluguel) urls.push({ url: site.url_aluguel, tipo: 'ALUGUEL' });

    for (const item of urls) {
        console.log(`--- Iniciando ${item.tipo}: ${item.url} ---`);
        var imoveis = []
        var contadorPaginas = 1

        // Acessa o site
        await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 60000 });

        const quantidadePaginas = await page.evaluate((site) => { return document.querySelectorAll(site.nextButtonSelector.selector).length }, site)

        while (true) {

            // Rola a pagina ate carregar todos os imoveis
            await scrollToEnd(page);

            if (site.containerSelector) {
                await page.waitForSelector(site.containerSelector, { timeout: 15000 });
            }

            // Coleta os imoveis
            const tipo_negocio = item.tipo === 'VENDA' ? 1 : 2;
            imoveis = await coletarImoveis(page, site, tipo_negocio);

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

            const nextButton = await page.$(selectorNextButton);
            const nextButtonDisabled = nextButton ? await page.evaluate(el => el.getAttribute('aria-disabled') === 'true', nextButton) : true;
            var nextButtonSelectorVariable = `${selectorNextButton}:nth-of-type(${contadorPaginas + 1}) a`

            if (typeNextButton === 2) {
                if (contadorPaginas === quantidadePaginas) {
                    break;
                }
            } else {
                if (!nextButton || nextButtonDisabled) {
                    break;
                }
            }

            if (typeNextButton === 2) {
                await page.click(nextButtonSelectorVariable);
            } else {
                // Check for disabled state on parent LI (Bootstrap common pattern)
                const isLiDisabled = await page.evaluate(el => el.closest('li')?.classList.contains('disabled'), nextButton);
                if (isLiDisabled) {
                    console.log("[DEBUG] Parent LI is disabled. Breaking.");
                    break;
                }

                try {
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
                        page.click(selectorNextButton)
                    ]);
                } catch (e) {
                    console.log(`[WARNING] Navigation timeout or click failed: ${e.message}`);
                    console.log("[INFO] Tenting fallback com click JS...");
                    try {
                        await page.evaluate(el => el.click(), nextButton);
                        // Espera um pouco para garantir que a ação surta efeito
                        await new Promise(r => setTimeout(r, 3000));
                    } catch (jsErr) {
                        console.log(`[ERROR] Fallback JS click também falhou: ${jsErr.message}`);
                        break;
                    }
                }
            }

            await waitForScrollEnd(page);

            contadorPaginas++
        }
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

async function coletarImoveis(page, site, tipo_negocio) {

    const imoveis = await page.evaluate((site, tipo_negocio) => {
        let lista = [];
        var elementos = document.querySelectorAll(site.containerSelector);
        console.log(`[${site.nomeSite}] Elementos encontrados: ${elementos.length}`);

        elementos.forEach(el => {

            let localizacao = el.querySelector(site.localizacaoSelector)?.innerText.trim();
            let preco = el.querySelector(site.precoSelector)?.innerText.trim();

            if (site.imagemSelector != null) {
                const imgEl = el.querySelector(site.imagemSelector);
                if (imgEl) {
                    var imagem = imgEl.src;

                    // Se a imagem nao for encontrada, tenta buscar pelo background-image
                    if (!imagem) {
                        const bgImage = window.getComputedStyle(imgEl).backgroundImage;
                        if (bgImage && bgImage !== 'none') {
                            // Regex para remover lixo do css
                            imagem = bgImage.replace(/^url\(['"]?(.+?)['"]?\)$/, '$1');

                            // Se o caminho da imagem começar com '/' concatena com a URL base
                            if (imagem.startsWith('/')) {
                                const baseUrl = site.hostImovel || new URL(site.url).origin;
                                imagem = baseUrl + imagem;
                            }
                        }
                    }
                }
            }

            let nomeSite = site.nomeSite
            let tipoImovel = el.querySelector(site.tipoImovelSelector)?.innerText.trim();

            if (site.infosImovel != null)
                var infosImovel = el.querySelector(site.infosImovelSelector)?.innerText.trim();

            let pathImovel = el.querySelector(site.hrefImovel)?.getAttribute('href');
            pathImovel = (pathImovel == null) ? el.querySelector(site.hrefImovel2)?.getAttribute('href') : pathImovel;

            // monta o link do imovel
            if (pathImovel != null)
                var linkImovel = (site.hostImovel == null) ? pathImovel : site.hostImovel + pathImovel;

            if (preco || localizacao || linkImovel) {
                lista.push({ localizacao, preco, tipoImovel, infosImovel, nomeSite, linkImovel, imagem, tipo_negocio });
            }

        });

        return lista;

    }, site, tipo_negocio);

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