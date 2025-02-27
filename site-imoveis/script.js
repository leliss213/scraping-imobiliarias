// Função para carregar os imóveis do arquivo JSON
async function carregarImoveis() {
    try {
        const response = await fetch("imoveis.json"); // Lendo o arquivo JSON
        const imoveis = await response.json(); // Convertendo para objeto

        imoveis.sort((a, b) => {
            // Remove tudo que não for número
            let precoA = Number(a.preco.replace(/\D/g, "")); 
            let precoB = Number(b.preco.replace(/\D/g, ""));
    
            return precoA - precoB; // Ordena em ordem crescente
        });

        console.log(imoveis)

        const lista = document.getElementById("lista-imoveis");
        lista.innerHTML = ""; // Limpa a lista antes de adicionar os itens

        imoveis.forEach(imovel => {
            const card = document.createElement("div");
            card.classList.add("card");

            card.innerHTML = `
                <img src="${imovel.imagem}" alt="Imagem do imóvel">
                <div class="card-content">
                    <h3>${imovel.tipoImovel}</h3>
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