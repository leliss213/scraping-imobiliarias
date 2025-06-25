# scraping-imobiliarias

## Descrição do Projeto

Este projeto consiste em um scraper web para coletar dados de imóveis de diversas imobiliárias. Ele automatiza o processo de navegação em sites de imóveis, extrai informações como localização, preço, tipo de imóvel e links, e organiza esses dados em formatos JSON e Excel para fácil análise e visualização. O projeto também inclui um mini-site local para exibir os imóveis raspados.

## Funcionalidades

* **Scraping Multi-Site:** Coleta informações de imóveis de múltiplas plataformas de imobiliárias configuradas.
* **Extração de Dados Detalhados:** Extrai localização, preço, tipo de imóvel, nome do site, link direto para o imóvel e imagem.
* **Tratamento de Paginação:** Navega automaticamente por múltiplas páginas de resultados.
* **Exportação de Dados:** Salva os dados coletados em um arquivo JSON (`imoveis.json`) e converte para um arquivo Excel (`imoveis.xlsx`).
* **Visualização Local:** Inclui um site estático simples para exibir os imóveis raspados em um formato amigável.

## Tecnologias Utilizadas

* **Node.js:** Ambiente de execução JavaScript.
* **Puppeteer:** Biblioteca Node.js para controlar navegadores Chromium headless ou completos, permitindo o scraping web.
* **`xlsx`:** Biblioteca para manipulação de arquivos Excel.
* **HTML, CSS, JavaScript:** Para o site de visualização local dos dados.

## Estrutura do Projeto

* `scraper.js`: O script principal que orquestra o processo de scraping, navegando pelos sites e coletando os dados.
* `converterPlanilha.js`: Um módulo responsável por converter os dados JSON raspados para um arquivo Excel (.xlsx).
* `sites.js`: Contém a configuração e os seletores CSS para cada site de imobiliária a ser raspado, permitindo fácil adição ou modificação de novas fontes.
* `imoveis.json`: Arquivo onde os dados dos imóveis são salvos em formato JSON após o scraping.
* `imoveis.xlsx - Imóveis.csv`: O arquivo CSV gerado a partir dos dados raspados (um exemplo é `imoveis.xlsx - Imóveis.csv`).
* `site-imoveis/`:
    * `index.html`: A página HTML principal para exibir os imóveis coletados.
    * `script.js`: O script JavaScript para carregar os dados de `imoveis.json` e renderizá-los no `index.html`.
    * `style.css`: O arquivo CSS para estilizar o site de visualização dos imóveis.

## Como Configurar e Executar

1.  **Pré-requisitos:**
    * Node.js (versão 14 ou superior recomendada)
    * npm (gerenciador de pacotes do Node.js)

2.  **Instalação das Dependências:**
    Navegue até o diretório raiz do projeto e instale as dependências necessárias:
    ```bash
    npm install puppeteer xlsx
    ```

3.  **Executar o Scraper:**
    Para iniciar o processo de coleta de dados, execute o seguinte comando:
    ```bash
    node scraper.js
    ```
    Este comando irá navegar pelos sites configurados em `sites.js`, coletar os dados e salvá-los em `imoveis.json` e `imoveis.xlsx`.

4.  **Visualizar os Imóveis Localmente:**
    Após a execução do scraper, você pode visualizar os imóveis coletados abrindo o arquivo `site-imoveis/index.html` em seu navegador web. O arquivo `script.js` dentro da pasta `site-imoveis` irá carregar e exibir os dados de `imoveis.json` na página.

## Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.
