// Função para carregar os imóveis do arquivo JSON
async function carregarImoveis() {
    try {
        const response = await fetch("imoveis.json"); // Lendo o arquivo JSON
        const imoveis = await response.json(); // Convertendo para objeto

        const lista = document.getElementById("lista-imoveis");
        lista.innerHTML = ""; // Limpa a lista antes de adicionar os itens

        imoveis.forEach(imovel => {
            const card = document.createElement("div");
            card.classList.add("card");

            card.innerHTML = `
                <img src="${imovel.imagem}" alt="Imagem do imóvel">
                <div class="card-content">
                    <h3>${imovel.localizacao}</h3>
                    <p>${imovel.localizacao}</p>
                    <p class="preco">${imovel.preco}</p>
                    <a href=${imovel.linkImovel} target="_blank">Ver Detalhes</a>
                </div>
            `;

            lista.appendChild(card);
        });
    } catch (error) {
        console.error("Erro ao carregar imóveis:", error);
    }
}

// Carregar imóveis ao abrir a página
document.addEventListener("DOMContentLoaded", carregarImoveis);