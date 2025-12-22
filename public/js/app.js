document.addEventListener("DOMContentLoaded", () => {
    carregarImoveis();

    // Input de busca
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        filtrarImoveis(termo);
    });

    // Botão de atualização da lista de imóveis
    const btnUpdate = document.getElementById('btnUpdate');
    btnUpdate.addEventListener('click', async () => {
        if (!confirm("Isso irá iniciar o scraper e pode demorar alguns minutos. O navegador irá abrir e fechar sozinho. Deseja continuar?")) return;

        btnUpdate.disabled = true;
        btnUpdate.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Atualizando...';

        try {
            const res = await fetch('/api/scrape', { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                alert("Atualização concluída! A página será recarregada.");
                window.location.reload();
            } else {
                throw new Error(data.error || "Erro desconhecido");
            }
        } catch (error) {
            alert("Erro ao atualizar: " + error.message);
            btnUpdate.disabled = false;
            btnUpdate.innerHTML = '<i class="fa-solid fa-sync"></i> Tentar Novamente';
        }
    });

    // Lógica do tema do site
    const btnThemeToggle = document.getElementById('btnThemeToggle');
    const iconTheme = btnThemeToggle.querySelector('i');
    const body = document.body;

    // Salva o modo do tema
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        iconTheme.classList.replace('fa-moon', 'fa-sun');
    }

    btnThemeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');

        if (isDark) {
            iconTheme.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            iconTheme.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('theme', 'light');
        }
    });

    // Modal de configurações dos sites
    const modal = document.getElementById('settingsModal');
    const settingsContainer = document.getElementById('sitesConfigContainer');
    let currentSitesConfig = [];

    document.getElementById('btnSettings').addEventListener('click', async () => {
        modal.classList.remove('hidden');
        settingsContainer.innerHTML = '<div class="loading-spinner">Carregando...</div>';

        try {
            const res = await fetch('/api/sites');
            currentSitesConfig = await res.json();

            settingsContainer.innerHTML = '';
            currentSitesConfig.forEach((site, index) => {
                const div = document.createElement('div');
                div.className = 'site-config-item';
                div.innerHTML = `
                    <div class="site-config-header">
                        <label class="site-config-label">${site.nomeSite}</label>
                        <div class="site-checkbox-wrapper">
                            <input type="checkbox" id="enabled-${index}" ${site.enabled !== false ? 'checked' : ''} data-index="${index}" class="site-checkbox">
                            <label for="enabled-${index}" class="site-checkbox-label">Ativo</label>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:0.5rem;">
                        <input type="text" value="${site.url_venda || ''}" data-index="${index}" data-type="venda" placeholder="URL Venda" class="site-url-input">
                        <input type="text" value="${site.url_aluguel || ''}" data-index="${index}" data-type="aluguel" placeholder="URL Aluguel" class="site-url-input">
                    </div>
                `;
                settingsContainer.appendChild(div);
            });
        } catch (e) {
            settingsContainer.innerHTML = `<p style="color:red">Erro ao carregar: ${e.message}</p>`;
        }
    });

    document.getElementById('btnCloseSettings').addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    document.getElementById('btnSaveSettings').addEventListener('click', async () => {
        // Update URLs
        const inputs = settingsContainer.querySelectorAll('.site-url-input');
        inputs.forEach(input => {
            const index = input.getAttribute('data-index');
            const type = input.getAttribute('data-type');

            if (type === 'venda') {
                currentSitesConfig[index].url_venda = input.value;
            } else if (type === 'aluguel') {
                currentSitesConfig[index].url_aluguel = input.value;
            }
        });

        // Update Enabled State
        const checkboxes = settingsContainer.querySelectorAll('.site-checkbox');
        checkboxes.forEach(chk => {
            const index = chk.getAttribute('data-index');
            currentSitesConfig[index].enabled = chk.checked;
        });

        try {
            const res = await fetch('/api/sites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentSitesConfig)
            });
            if (res.ok) {
                alert('Configurações salvas!');
                modal.classList.add('hidden');
                // Opcional: Recarregar stats
            } else {
                throw new Error('Erro ao salvar');
            }
        } catch (e) {
            alert(e.message);
        }
    });
});

let allImoveis = [];
let filteredImoveis = [];
let sitesCount = 0;
let currentPage = 1;
const ITEMS_PER_PAGE = 60;

async function carregarImoveis() {
    const lista = document.getElementById("lista-imoveis");

    try {

        try {
            const sitesRes = await fetch("/api/sites-count");
            if (sitesRes.ok) {
                const sitesData = await sitesRes.json();
                sitesCount = sitesData.count;
            }
        } catch (e) {
            console.error("Erro ao buscar contagem de sites", e);
        }

        const response = await fetch(`/imoveis.json?t=${new Date().getTime()}`);

        if (!response.ok) throw new Error("Erro ao carregar JSON");

        allImoveis = await response.json();

        // Ordenação padrão por preço (menor para maior)
        allImoveis.sort((a, b) => {
            const pA = parsePrice(a.preco);
            const pB = parsePrice(b.preco);
            return pA - pB;
        });

        filteredImoveis = [...allImoveis];

        renderizarImoveis(filteredImoveis);
        atualizarStats(filteredImoveis.length, sitesCount);

    } catch (error) {
        console.error(error);
        lista.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--accent-color);">
                <i class="fa-solid fa-triangle-exclamation fa-3x"></i>
                <p>Não foi possível carregar os imóveis. Verifique se o arquivo <code>imoveis.json</code> existe na raiz.</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}

function parsePrice(priceStr) {
    if (!priceStr) return 0;
    // Remove R$, pontos e substitui virgula por ponto
    const clean = priceStr.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
}

function renderizarImoveis(imoveis, page = 1) {
    const lista = document.getElementById("lista-imoveis");

    // Se for primeira página, limpa. Se não, appenda.
    if (page === 1) {
        lista.innerHTML = "";
        currentPage = 1;
    }

    if (imoveis.length === 0) {
        lista.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Nenhum imóvel encontrado.</p>`;
        removeLoadMoreButton();
        return;
    }

    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginatedItems = imoveis.slice(start, end);

    paginatedItems.forEach(imovel => {
        // Campos atualizados conforme pedido do usuario (nomeSite, tipoImovel, infosImovel, linkImovel)
        const precoFormatado = imovel.preco !== 'N/A' ? imovel.preco : 'Consulte';

        const card = document.createElement("article");
        card.classList.add("card");

        // Fallback imagem
        const imgUrl = imovel.imagem || 'assets/no-image.svg';

        card.innerHTML = `
            <div class="card-image">
                <span class="badge-site">${imovel.nomeSite || imovel.site || 'Site'}</span>
                <img src="${imgUrl}" alt="Foto do imóvel" onError="this.src='assets/no-image.svg'">
            </div>
            
            <div class="card-content">
                <div class="card-type">
                    <i class="fa-regular fa-building"></i> ${imovel.tipoImovel || imovel.tipo || 'Imóvel'}
                </div>
                
                <div class="card-price">
                    ${precoFormatado}
                </div>
                
                <div class="card-location">
                    <i class="fa-solid fa-location-dot"></i> ${imovel.localizacao || 'Localização não informada'}
                </div>

                <div class="card-infos">
                    <i class="fa-solid fa-circle-info"></i>
                    <span>${imovel.infosImovel || imovel.infos || 'Detalhes no site'}</span>
                </div>

                <div class="btn-wrapper">
                    <a href="${imovel.linkImovel || imovel.link}" target="_blank">
                        Ver no Site <i class="fa-solid fa-external-link-alt"></i>
                    </a>
                </div>
            </div>
        `;

        lista.appendChild(card);
    });

    // Gerenciar botão "Carregar Mais"
    updateLoadMoreButton(imoveis.length, end);
}

function updateLoadMoreButton(totalItems, currentCount) {
    removeLoadMoreButton();

    if (currentCount < totalItems) {
        const main = document.querySelector('main');
        const btn = document.createElement('button');
        btn.id = 'btnLoadMore';
        btn.className = 'btn-view';
        btn.style.width = '200px';
        btn.style.margin = '2rem auto';
        btn.innerHTML = 'Carregar Mais Imóveis';
        btn.onclick = () => {
            currentPage++;
            renderizarImoveis(filteredImoveis, currentPage);
        };
        // Adiciona ao final do main
        main.appendChild(btn);
    }
}

function removeLoadMoreButton() {
    const btn = document.getElementById('btnLoadMore');
    if (btn) btn.remove();
}

// Event Listeners para filtros de preço
const minPriceInput = document.getElementById('minPrice');
const maxPriceInput = document.getElementById('maxPrice');
const filterVendaInput = document.getElementById('filterVenda');
const filterAluguelInput = document.getElementById('filterAluguel');

[minPriceInput, maxPriceInput, filterVendaInput, filterAluguelInput].forEach(input => {
    input.addEventListener('input', () => filtrarImoveis());
});

// Atualiza o listener de busca para chamar a função sem argumentos
searchInput.addEventListener('input', () => filtrarImoveis());

function filtrarImoveis() {
    const termo = document.getElementById('searchInput').value.toLowerCase();
    const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice').value) || Infinity;

    // Toggle States
    const showVenda = document.getElementById('filterVenda').checked;
    const showAluguel = document.getElementById('filterAluguel').checked;

    // Se ambos DESMARCADOS, mostra TUDO (behaviour requested: "mostra tudo, tanto aluguel quanto compra")
    const showAll = (!showVenda && !showAluguel);

    filteredImoveis = allImoveis.filter(imovel => {
        // Filtro de Texto
        const campos = [
            imovel.nomeSite,
            imovel.tipoImovel,
            imovel.localizacao,
            imovel.infosImovel,
            imovel.preco
        ].map(v => v ? v.toLowerCase() : '').join(' ');

        const matchesText = campos.includes(termo);

        // Filtro de Preço
        const precoNumerico = parsePrice(imovel.preco);
        const matchesPrice = (precoNumerico >= minPrice) && (precoNumerico <= maxPrice);

        // Filtro Tipo de Negócio (1=Venda, 2=Aluguel)
        // Se showAll=true, ignora o filtro de tipo.
        // Se nao, verifica se o tipo do imovel bate com algum checkbox marcado.
        // Se imovel.tipo_negocio for undefined (legado), assumimos que aparece se Venda estiver marcado (default) ou mostra se showAll.

        let matchesType = false;
        if (showAll) {
            matchesType = true;
        } else {
            const tipo = imovel.tipo_negocio || 1; // Default to Venda if missing
            if (tipo === 1 && showVenda) matchesType = true;
            if (tipo === 2 && showAluguel) matchesType = true;
        }

        return matchesText && matchesPrice && matchesType;
    });

    // Atualiza Stats com o total filtrado
    atualizarStats(filteredImoveis.length, sitesCount);

    // Renderiza pagina 1
    renderizarImoveis(filteredImoveis, 1);
}

function atualizarStats(totalImoveis, totalSites) {
    const statsContainer = document.getElementById('statsBar');

    const displaySites = totalSites > 0 ? totalSites : '?';

    statsContainer.innerHTML = `
        <div class="stat-tag"><i class="fa-solid fa-home"></i> ${totalImoveis} Imóveis Exibidos</div>
        <div class="stat-tag"><i class="fa-solid fa-globe"></i> ${displaySites} Imobiliárias Rastreáveis</div>
        <div class="stat-tag"><i class="fa-solid fa-clock"></i> Data: ${new Date().toLocaleDateString()}</div>
    `;
}
