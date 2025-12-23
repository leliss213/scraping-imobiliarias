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
        monitor: true, // mostra o progresso no console
        timeout: 2147483647 // Remove timeout
    });

    // Define a tarefa genérica do cluster
    // O cluster vai processar dois tipos de mensagens: 'DISCOVERY' e 'SCRAPE_PAGE'
    await cluster.task(async ({ page, data: taskData }) => {
        const { type, site, urlItem, pageNumber } = taskData;

        // Otimizacao: Bloquear recursos desnecessarios (imagens e fontes)
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (req.isInterceptResolutionHandled()) return;
            const resourceType = req.resourceType();
            if (['image', 'font'].includes(resourceType)) {
                req.abort().catch(err => console.log(`[WARN] Failed to abort request: ${err.message}`));
            } else {
                req.continue().catch(err => console.log(`[WARN] Failed to continue request: ${err.message}`));
            }
        });

        if (type === 'DISCOVERY') {
            console.log(`[DISCOVERY] Iniciando descoberta: ${site.nomeSite} - ${urlItem.tipo}`);
            try {
                const totalPages = await countPages(page, site, urlItem);
                console.log(`[DISCOVERY] ${site.nomeSite} - ${urlItem.tipo}: Encontradas ${totalPages} paginas.`);

                // Enfileira as paginas individuais
                for (let i = 1; i <= totalPages; i++) {
                    cluster.queue({
                        type: 'SCRAPE_PAGE',
                        site,
                        urlItem,
                        pageNumber: i
                    });
                }
            } catch (error) {
                console.error(`[DISCOVERY] Erro em ${site.nomeSite}: ${error.message}`);
                // Se der erro na descoberta, tenta rodar pelo menos a pagina 1
                cluster.queue({ type: 'SCRAPE_PAGE', site, urlItem, pageNumber: 1 });
            }

        } else if (type === 'SCRAPE_PAGE') {
            console.log(`[SCRAPE] Processando ${site.nomeSite} (${urlItem.tipo}) - Pagina ${pageNumber}`);
            try {
                const imoveis = await scrapePage(page, site, urlItem, pageNumber);
                listaImoveis.push(...imoveis);
                console.log(`[SCRAPE] ${site.nomeSite} - Pagina ${pageNumber}: ${imoveis.length} imoveis coletados.`);
            } catch (error) {
                console.error(`[SCRAPE] Erro ao processar ${site.nomeSite} Pagina ${pageNumber}: ${error.message}`);
            }
        }
    });

    // INICIO: Enfileira as tarefas de descoberta dos sites
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
    // Logica simples para adicionar parametro de pagina na URL
    // Se a URL ja tem parametros (?), usa &, senao usa ?
    // Precisaria de uma logica mais robusta baseada no padrao especifico de cada site,
    // mas vamos tentar usar heuristica baseada no sites.json ou padrao 'default'

    // Verificacao especifica baseada nas URLs do sites.json (heuristica)
    const urlObj = new URL(baseUrl);

    if (baseUrl.includes('karnoppimoveis')) {
        urlObj.searchParams.set('page', pageNumber);
        return urlObj.toString();
    }
    if (baseUrl.includes('borbaimoveis')) {
        urlObj.searchParams.set('pagina', pageNumber);
        return urlObj.toString();
    }
    if (baseUrl.includes('predilarimoveis')) {
        urlObj.searchParams.set('pagina', pageNumber);
        return urlObj.toString();
    }
    if (baseUrl.includes('imobel')) {
        if (baseUrl.match(/\/Busca\/\d+\//)) {
            return baseUrl.replace(/\/Busca\/\d+\//, `/Busca/${pageNumber}/`);
        }
    }
    if (baseUrl.includes('imoveismegha')) {
        // imoveismegha usa listaimoveis.php, mas nao vi parametro de pagina claro na url do json.
        // O json next button usa 'pagination'.
        // Se nao tiver parametro de pagina na URL, nao conseguimos paralelizar por URL.
        // Nesse caso, o Discovery retornaria 1 e faria sequencial? Nao, aqui estamos tentando paralelo.
        // Se nao suportar, retornamos a url original para a pagina 1 e so scrapeia a 1 :(
        // Vamos tentar adicionar &pagina=X como chute, ou manter original se page=1
        if (pageNumber > 1) return baseUrl + `&pagina=${pageNumber}`;
    }
    if (baseUrl.includes('dlimoveis')) {
        // dlimoveis url nao tem query page. pode ser path.
        // dlimoveis-rs.com.br/imovel/venda/todos/santa-cruz-do-sul
        // Se nao descobrirmos como paginar via URL, ficamos limitados.
        // Vamos tentar adicionar query param padrao
        if (pageNumber > 1) return baseUrl + `?pagina=${pageNumber}`;
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
            // A logica original contava o numero de botoes de paginacao?
            // "return document.querySelectorAll(site.nextButtonSelector.selector).length"
            // Isso geralmente conta quantos botoes de "proximo" ou botoes de pagina existem.
            // Se existirem 5 botoes numericos (1, 2, 3, 4, 5), retorna 5.

            // Logica especifica para dlimoveis (tipo 4)
            if (site.nextButtonSelector.tipoNextButton === 4) {
                const count = await page.evaluate(() => {
                    return document.querySelectorAll('.lista_imoveis_paginacao a').length;
                });
                // Dlimoveis mostra paginacao como 1, 2, 3... Se tiver 5 links, sao 5 paginas? Ou o ultimo é o total?
                // Vamos assumir que o maior numero encontrado nos links é o total
                const maxPage = await page.evaluate(() => {
                    const links = Array.from(document.querySelectorAll('.lista_imoveis_paginacao a'));
                    const numbers = links.map(a => parseInt(a.innerText)).filter(n => !isNaN(n));
                    return numbers.length > 0 ? Math.max(...numbers) : 1;
                });
                return maxPage;
            }

            // Para outros, tenta achar o maior numero na paginacao ou contar elementos
            // Karrnop, Borba, etc usam logica de "Next Button" para clicar. 
            // Para saber o TOTAL sem clicar, precisamos buscar o ultimo numero na paginacao.

            // Se nao conseguirmos determinar o total exato via DOM, 
            // podemos usar uma heuristica ou limitar (ex: assume 10 paginas e deixa falhar as vazias).
            // MAS, para segurança inicial, vamos tentar reusar a logica que conta elementos, 
            // porem isso no codigo original retornava "quantidadePaginas" que era usado no loop "while".

            // O codigo original fazia: quantidadePaginas = document.querySelectorAll(site.nextButtonSelector.selector).length
            // E usava isso como limite no loop "while" (se typeNextButton == 2).
            // Se typeNextButton != 2, ele ia clicando no "Next" infinitamente ate desabilitar.

            // Se o site requer clique no "Proximo" para descobrir a proxima pagina e nao mostra numeracao total (ex: Infinite Scroll ou Load More),
            // entao Page-Level Parallelism é impossivel sem pré-navegação profunda (que seria lenta).
            // Nesses casos, teremos que fazer crawling sequencial para esse site especifico?

            // DECISAO: Para simplificar e manter robustez no "Fan-Out", 
            // vamos implementar logica hibrida:
            // 1. Sites com parametro de URL explicito (Karnopp, Borba, Predilar): Extrair total da UI se possivel.
            //    Se nao conseguirmos extrair total, definimos um limite fixo "seguro" (ex: 20) e paramos quando vier vazio? 
            //    Isso desperdiça recursos mas paraleliza.

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
            }, site.containerSelector); // Passando container so pra ter argumento, nao usado na funcao avaliada assim

            // Se detectou paginas > 1, usamos.
            if (maxPageDetected > 1) return maxPageDetected;

            // Se nao detectou, retorna 1 e faz fallback (ou tentamos chutar?)
            // BorbaImoveis: tem pagina=21 na URL de exemplo. Entao tem muitas.
            // Se retornarmos 1, vai fazer só uma.
            // Hack: Se a URL tem "page=" ou "pagina=", retornamos um numero fixo alto (ex: 10) 
            // pois o scraper de pagina vai validar se tem imoveis. Se nao tiver, nao salva nada.
            // Isso garante paralelismo mesmo sem saber o total exato.

            if (item.base_url.includes('page=') || item.base_url.includes('pagina=')) {
                return 20; // Hard limit de tentativa
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

    // scroll do site para garantir carregamento de lazy load images se houver
    try {
        await scrollToEnd(page);
    } catch (e) { }

    const tipo_negocio = item.tipo === 'VENDA' ? 1 : 2;
    const imoveis = await coletarImoveis(page, site, tipo_negocio);

    return imoveis;
}

// Funcao para rolar ate o final da pagina carregando todos os elementos
async function scrollToEnd(page) {
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
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1s
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
            // Reduzi timeout para 5s, se nao carregou container em 5s, provavelmente a pagina esta vazia (fim da paginacao)
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

            let nomeSite = site.nomeSite
            let tipoImovel = el.querySelector(site.tipoImovelSelector)?.innerText.trim();

            if (site.infosImovel != null)
                var infosImovel = el.querySelector(site.infosImovelSelector)?.innerText.trim();

            let pathImovel = el.querySelector(site.hrefImovel)?.getAttribute('href');
            pathImovel = (pathImovel == null) ? el.querySelector(site.hrefImovel2)?.getAttribute('href') : pathImovel;

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