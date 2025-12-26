const { Cluster } = require('puppeteer-cluster');
const sites = require('./sites.json');
const converterPlanilha = require('./converterPlanilha');
const fs = require('fs');

(async () => {
    let listaImoveis = [];

    // Inicia o cluster
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: 25, // Máximo de sites abertos simultaneamente
        puppeteerOptions: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        },
        timeout: 2147483647 // Remove timeout
    });

    // Define a tarefa genérica do cluster
    // O cluster vai tratar dois tipos de tarefas: 'DISCOVERY' e 'SCRAPE_PAGE'
    // 'DISCOVERY' é para descobrir quantas paginas existem
    // 'SCRAPE_PAGE' é para coletar os imoveis de uma pagina
    await cluster.task(async ({ page, data: taskData }) => {
        const { type, site, urlItem, pageNumber } = taskData;

        // Bloquear recursos desnecessarios (imagens e fontes)
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (req.isInterceptResolutionHandled()) return;
            const resourceType = req.resourceType();
            if (['image', 'font'].includes(resourceType)) {
                req.abort().catch(err => console.warn(`Failed to abort request: ${err.message}`));
            } else {
                req.continue().catch(err => console.warn(`Failed to continue request: ${err.message}`));
            }
        });

        if (type === 'DISCOVERY') {
            console.log(`${type} Iniciando descoberta: ${site.nomeSite} - ${urlItem.tipo}`);
            try {
                const totalPages = await countPages(page, site, urlItem);
                console.log(`${type} ${site.nomeSite} - ${urlItem.tipo}: Encontradas ${totalPages} paginas.`);

                // Enfileira as paginas individuais
                for (let i = 1; i <= totalPages; i++) {
                    cluster.queue({
                        type: 'SCRAPE_PAGE',
                        site,
                        urlItem,
                        pageNumber: i,
                        maxKnownPages: totalPages // Informa ate onde ja sabemos que existe
                    });
                }
            } catch (error) {
                console.error(`${type} Erro em ${site.nomeSite}: ${error.message}`);
                // Se der erro na descoberta, tenta rodar pelo menos a pagina 1
                cluster.queue({ type: 'SCRAPE_PAGE', site, urlItem, pageNumber: 1 });
            }

        } else if (type === 'SCRAPE_PAGE') {
            const { maxKnownPages = 1 } = taskData;
            console.log(`${type} ${site.nomeSite} (${urlItem.tipo}) - Pagina ${pageNumber}`);
            try {
                const imoveis = await scrapePage(page, site, urlItem, pageNumber);

                if (imoveis.length > 0) {
                    listaImoveis.push(...imoveis);
                    console.log(`${type} ${site.nomeSite} - Pagina ${pageNumber}: ${imoveis.length} imoveis coletados.`);

                    // PAGINACAO RECURSIVA:
                    // Se estivermos na ultima pagina conhecida (ou alem dela), e encontramos imoveis,
                    // tentamos a proxima pagina.
                    const maxKnown = maxKnownPages || 1;
                    if (site.nomeSite !== 'imobel' && pageNumber >= maxKnown && pageNumber < 200) {
                        console.log(`${type} ${site.nomeSite} - Encontrados imoveis na pagina limite (${pageNumber}). Buscando pag ${pageNumber + 1}...`);
                        cluster.queue({
                            type: 'SCRAPE_PAGE',
                            site,
                            urlItem,
                            pageNumber: pageNumber + 1,
                            maxKnownPages: maxKnown
                        });
                    }
                } else {
                    if (pageNumber > 1) {
                        console.log(`${type} ${site.nomeSite} - Pagina ${pageNumber} vazia. Fim da paginacao.`);
                    }
                }

            } catch (error) {
                console.error(`${type} Erro ao processar ${site.nomeSite} Pagina ${pageNumber}: ${error.message}`);
            }
        }
    });

    // Enfileira as tarefas de descoberta dos sites
    for (const site of sites) {
        if (site.enabled === false) continue;

        if (site.url_venda) {
            cluster.queue({ type: 'DISCOVERY', site, urlItem: { base_url: site.url_venda, tipo: 'VENDA' } });
        }
        if (site.url_aluguel) {
            cluster.queue({ type: 'DISCOVERY', site, urlItem: { base_url: site.url_aluguel, tipo: 'ALUGUEL' } });
        }
    }

    await cluster.idle();
    await cluster.close();

    // Remover duplicatas usando linkImovel como chave unica
    const uniqueImoveis = new Map();
    listaImoveis.forEach(imovel => {
        // Se nao tiver link, usa um hash improvisado (localizacao + preco)
        const key = imovel.linkImovel || `${imovel.localizacao}-${imovel.preco}-${imovel.nomeSite}`;
        if (!uniqueImoveis.has(key)) {
            uniqueImoveis.set(key, imovel);
        }
    });
    listaImoveis = Array.from(uniqueImoveis.values());

    console.log(`Total de imoveis unicos processados: ${listaImoveis.length}`);

    // Ordena a lista de imoveis por preco
    listaImoveis.sort((a, b) => { return a.preco - b.preco; });

    const dataDir = "data";
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const jsonData = JSON.stringify(listaImoveis, null, 2);
    fs.writeFileSync(`${dataDir}/imoveis.json`, jsonData, "utf-8");

    try {
        converterPlanilha(listaImoveis)
    } catch (error) {
        console.error(`Erro ao converter para planilha:`, error);
    }

    console.log("Scraping finalizado com sucesso.");
    process.exit(0);
})();

// Funcao para construir URL paginada
function buildPagedUrl(baseUrl, pageNumber) {
    // Se a URL ja tem parametros (?), usa &, senao usa ?
    // Verificacao especifica baseada nas URLs do sites.json
    const urlObj = new URL(baseUrl);

    if (baseUrl.includes('karnoppimoveis')) {
        urlObj.searchParams.set('page', pageNumber);
        return urlObj.toString();
    }
    if (baseUrl.includes('borbaimoveis')) {
        urlObj.searchParams.set('pagina', pageNumber);
        return urlObj.toString();
    }
    if (baseUrl.includes('jetlar')) {
        urlObj.searchParams.set('pagina', pageNumber);
        return urlObj.toString();
    }
    if (baseUrl.includes('predilarimoveis')) {
        urlObj.searchParams.set('pagina', pageNumber);
        return urlObj.toString();
    }
    if (baseUrl.includes('imobel')) {
        return baseUrl;
    }
    if (baseUrl.includes('imoveismegha')) {
        if (pageNumber > 1) return baseUrl + `&pagina=${pageNumber}`;
    }
    if (baseUrl.includes('dlimoveis')) {
        if (pageNumber > 1) return baseUrl + `?pag=${pageNumber}`;
    }

    // Default: tenta setar 'page'
    if (pageNumber > 1) {
        if (baseUrl.includes('?')) {
            return baseUrl + `&page=${pageNumber}`;
        } else {
            return baseUrl + `?page=${pageNumber}`;
        }
    }

    return baseUrl;
}

// Funcao de descoberta: Acessa a primeira pagina e conta quantas paginas existem
async function countPages(page, site, item) {
    if (site.nomeSite === 'imobel') return 1;

    try {
        await page.goto(item.base_url, { waitUntil: 'networkidle2', timeout: 60000 });
    } catch (e) {
        console.error(`Erro acesso inicial discovery: ${e.message}`);
        return 1;
    }

    let quantidadePaginas = 1;
    try {
        if (site.nextButtonSelector && site.nextButtonSelector.selector) {
            // Tenta pegar o numero de paginas.

            // Logica especifica para dlimoveis (tipo 4)
            if (site.nextButtonSelector.tipoNextButton === 4) {
                const count = await page.evaluate(() => {
                    return document.querySelectorAll('.lista_imoveis_paginacao a').length;
                });

                const maxPage = await page.evaluate(() => {
                    const links = Array.from(document.querySelectorAll('.lista_imoveis_paginacao a'));
                    const numbers = links.map(a => parseInt(a.innerText)).filter(n => !isNaN(n));
                    return numbers.length > 0 ? Math.max(...numbers) : 1;
                });
                return maxPage;
            }

            // Vamos tentar extrair o max page number dos links de paginacao comuns
            const maxPageDetected = await page.evaluate((selector) => {
                // Tenta encontrar elementos de paginacao comuns
                const elements = document.querySelectorAll('.pagination a, .pages a, ul.pagination li a');
                let max = 1;
                elements.forEach(el => {
                    const num = parseInt(el.innerText);
                    if (!isNaN(num) && num > max) max = num;
                });
                return max;
            }, site.containerSelector);

            // Se detectou paginas > 1, retorna.
            if (maxPageDetected > 1) return maxPageDetected;

            if (item.base_url.includes('page=') || item.base_url.includes('pagina=')) {
                // Se tem indicio de paginacao na URL mas nao achamos o numero, 
                // retorna 1 e deixa a paginacao recursiva (do SCRAPE_PAGE) descobrir as proximas.
                return 1;
            }

        }
    } catch (e) { }

    return quantidadePaginas;
}

async function scrapePage(page, site, item, pageNumber) {
    const url = buildPagedUrl(item.base_url, pageNumber);

    try {
        // Timeout menor para paginas individuais para falhar rapido se travar
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    } catch (e) {
        console.error(`Erro acesso ${url}: ${e.message}`);
        return [];
    }

    // scroll do site para garantir carregamento
    try {
        // JetLar precisa de mais tempo para carregar os cards via lazy load
        const scrollDelay = (site.nomeSite === 'jetlar') ? 3000 : 1000;

        // Se for jetlar, espera um pouco antes de começar o scroll
        if (site.nomeSite === 'jetlar') {
            await new Promise(r => setTimeout(r, 5000));
        }

        await scrollToEnd(page, scrollDelay);
    } catch (e) {
        console.error(`Erro scroll ${url}: ${e.message}`);
    }

    const tipo_negocio = item.tipo === 'VENDA' ? 1 : 2;
    const imoveis = await coletarImoveis(page, site, tipo_negocio);

    return imoveis;
}

// Funcao para rolar ate o final da pagina carregando todos os elementos
async function scrollToEnd(page, scrollDelay = 1000) {
    let previousHeight = 0;
    let newHeight = 0;
    try {
        newHeight = await page.evaluate(() => document.body.scrollHeight);
    } catch (e) { return; }

    let retries = 0;

    // Scroll mais rapido para paginas individuais
    while (newHeight > previousHeight) {
        previousHeight = newHeight;
        try {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(resolve => setTimeout(resolve, scrollDelay));
            newHeight = await page.evaluate(() => document.body.scrollHeight);
        } catch (e) { break; }

        if (newHeight === previousHeight) {
            retries++;
            if (retries > 2) break;
        } else {
            retries = 0;
        }
    }
}

async function coletarImoveis(page, site, tipo_negocio) {
    // Verifica se container existe
    if (site.containerSelector) {
        try {
            // espera o container carregar
            await page.waitForSelector(site.containerSelector, { timeout: 9000 });
        } catch (e) {
            return [];
        }
    }

    const imoveis = await page.evaluate((site, tipo_negocio) => {
        let lista = [];
        var elementos = document.querySelectorAll(site.containerSelector);

        elementos.forEach(el => {
            let localizacao = el.querySelector(site.localizacaoSelector)?.innerText.trim();
            let preco = el.querySelector(site.precoSelector)?.innerText.trim();
            let nomeSite = site.nomeSite
            let tipoImovel = el.querySelector(site.tipoImovelSelector)?.innerText.trim();

            // lógica para pegar a url da imagem
            if (site.imagemSelector != null) {
                const imgEl = el.querySelector(site.imagemSelector);
                if (imgEl) {
                    var imagem = imgEl.src;
                    if (!imagem) {
                        const bgImage = window.getComputedStyle(imgEl).backgroundImage;
                        if (bgImage && bgImage !== 'none') {
                            imagem = bgImage.replace(/^url\(['"]?(.+?)['"]?\)$/, '$1');
                            if (imagem.startsWith('/')) {
                                const baseUrl = site.hostImovel || window.location.origin;
                                imagem = baseUrl + imagem;
                            }
                        }
                    }
                }
            }

            if (site.infosImovel != null)
                var infosImovel = el.querySelector(site.infosImovelSelector)?.innerText.trim();

            let pathImovel = el.querySelector(site.hrefImovel)?.getAttribute('href');
            pathImovel = (pathImovel == null) ? el.querySelector(site.hrefImovel2)?.getAttribute('href') : pathImovel;

            if (pathImovel != null)
                var linkImovel = (site.hostImovel == null) ? pathImovel : site.hostImovel + pathImovel;

            let precoInvalido = !preco || !/\d/.test(preco);

            if (!imagem && precoInvalido) return;

            if (preco || localizacao || linkImovel) {
                lista.push({ localizacao, preco, tipoImovel, infosImovel, nomeSite, linkImovel, imagem, tipo_negocio });
            }
        });

        return lista;
    }, site, tipo_negocio);

    return imoveis;
}