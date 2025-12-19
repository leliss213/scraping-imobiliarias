# Scraping Imobiliárias

Projeto de web scraping para coletar dados de sites de imobiliárias e exportar para Excel/JSON.

## Pré-requisitos

- [Node.js](https://nodejs.org/) instalado.

## Como Iniciar

1.  **Instale as dependências:**
    Abra o terminal na pasta do projeto e execute:
    ```bash
    npm install
    ```

2.  **Execute o Scraper:**
    Para coletar os dados dos sites configurados e gerar os arquivos `imoveis.json` e `imoveis.xlsx`:
    ```bash
    npm run scrape
    ```

3.  **Visualize os Resultados:**
    - Os dados serão salvos em `imoveis.xlsx` (Excel) e `imoveis.json`.
    - Para visualizar a interface web, você precisará de um servidor local (para evitar bloqueios de segurança). Se tiver o pacote `serve` ou similar:
      ```bash
      npx serve .
      ```
      Se não tiver, abra o arquivo `index.html` (note que a leitura do JSON pode falhar se aberto diretamente sem servidor).

## Estrutura do Projeto

- `scraper.js`: Script principal que controla a raspagem.
- `sites.js`: Configuração dos sites a serem raspados (seletores CSS, URLs).
- `converterPlanilha.js`: Utilitário para salvar em Excel.
- `site-imoveis/`: Frontend simples para visualização.
