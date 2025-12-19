# 🏠 Imóveis Scraper

**Central definitiva para monitoramento de imóveis.**

Este projeto é uma aplicação que centraliza anúncios de múltiplas imobiliárias em um único painel. Ele utiliza **Web Scraping** para coletar dados automaticamente e apresenta tudo em uma interface bonita, responsiva e fácil de usar.

---

## ✨ Funcionalidades

*   **🕵️ Scraper Inteligente**: Coleta dados (preço, localização, fotos, detalhes) de diversos sites imobiliários automaticamente.
*   **📊 Dashboard Centralizado**: Visualize todos os imóveis em um só lugar.
*   **🔍 Busca e Filtros**: Encontre exatamente o que procura filtrando por bairro, cidade, preço ou site.
*   **🌙 Dark Mode**: Interface com tema escuro/claro persistente.
*   **⚙️ Configuração Visual**: Edite as URLs de busca das imobiliárias diretamente pelo navegador.
*   **🔄 Atualização em Background**: O scraper roda de forma silenciosa e atualiza os dados.
*   **📄 Exportação**: Gera automaticamente uma planilha Excel com os dados coletados.

---

## 🚀 Como Rodar o Projeto

Você pode rodar localmente com Node.js ou usar Docker.

### Opção 1: Rodando Localmente (Node.js)

1.  **Pré-requisitos**: Node.js instalado.
2.  **Instale as dependências**:
    ```bash
    npm install
    ```
3.  **Inicie o servidor**:
    ```bash
    npm start
    ```
4.  O navegador abrirá automaticamente em `http://localhost:3000`.

### Opção 2: Rodando com Docker (Recomendado)

Se você não quer configurar ambiente Node/Chrome, use o Docker:

1.  **Comando único**:
    ```bash
    docker-compose up --build
    ```
2.  Acesse `http://localhost:3000`.

## 📖 Como Usar

### 1. Atualizar Imóveis
Ao abrir pela primeira vez, a lista pode estar vazia ou desatualizada.
*   Clique no botão **"Atualizar Imóveis"** no topo.
*   O sistema iniciará o scraper em segundo plano.
*   Aguarde alguns instantes (o botão ficará carregando). A página recarregará sozinha com os novos dados.

### 2. Configurar Sites (URLs)
Quer mudar a busca (ex: mudar de 'Aluguel' para 'Venda' ou mudar a cidade)?
*   Clique no ícone de **Engrenagem** (⚙️).
*   Uma janela abrirá listando todos os sites monitorados.
*   Cole a nova URL de busca do site da imobiliária (filtre no site deles e copie a URL do navegador).
*   Clique em **"Salvar Configurações"**.

### 3. Visualização
*   **Modo Escuro**: Clique no ícone da **Lua** (🌙) para alternar o tema.
*   **Busca**: Digite no campo de pesquisa para filtrar por qualquer texto (bairro, valor, site).
*   **Carregar Mais**: A lista exibe 120 imóveis por vez. Role até o fim e clique em "Carregar Mais" para ver o restante.

---

## 🛠️ Tecnologias Utilizadas

*   **Frontend**: HTML5, CSS3, JavaScript.
*   **Backend**: Node.js, Express.
*   **Scraping**: Puppeteer (Headless Chrome).
*   **Dados**: JSON (armazenamento local) e XLSX (SheetJS).
*   **Infra**: Docker & Docker Compose.

---

## 📂 Estrutura de Arquivos

*   `server.js`: Servidor API e estático.
*   `scraper.js`: Motor de coleta de dados.
*   `sites.json`: Configuração dos sites e seletores.
*   `public/`: Arquivos do Frontend (HTML, CSS, JS).
*   `imoveis.json`: Banco de dados local dos imóveis.

---