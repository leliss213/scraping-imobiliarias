// sites.js
module.exports = [
    // {
    //     url: 'https://www.karnoppimoveis.com.br/venda?address=%5B%7B%22label%22%3A%22Santa+Cruz+do+Sul+-+RS%22%2C%22value%22%3A%7B%22city%22%3A8079%2C%22state%22%3A23%7D%7D%5D&sort=2&page=1&price_range=%7B%22min%22%3A3500100%2C%22max%22%3A30000000%7D',
    //     containerSelector: '.carousel-card_content__QNF2s',
    //     localizacaoSelector: '.vertical-property-card_neighborhood__YZK9N',
    //     precoSelector: '.contracts_priceNumber__WhudD',
    //     imagemSelector: '.image-gallery-image',
    //     tipoImovelSelector: '.vertical-property-card_row__wxJn4 > span',
    //     infosImovelSelector: '.vertical-property-card_characteristics__UxtL9 span',
    //     nomeSite: 'karnoppimoveis',
    //     hostImovel: 'https://www.karnoppimoveis.com.br',
    //     hrefImovel: '.carousel-card_topContent__8bSr2 > a',
    //     hrefImovel2: '.image-gallery-center > a',
    // },
    // {
    //     url: 'https://www.borbaimoveis.com.br/venda?address=%5B%7B%22label%22%3A%22Santa+Cruz+do+Sul+-+RS%22%2C%22value%22%3A%7B%22city%22%3A8079%2C%22state%22%3A23%7D%7D%5D&property_type=%5B%2212%22%2C%2218%22%2C%2213%22%2C%2220%22%2C%2217%22%2C%2228%22%5D&price_range=%7B%22min%22%3A3500100%2C%22max%22%3A30000000%7D&sort=2&page=1',
    //     containerSelector: '.carousel-card_fullWidth__QE1sX',
    //     localizacaoSelector: '.vertical-property-card_neighborhood__YZK9N',
    //     precoSelector: '.contracts_priceNumber__WhudD',
    //     imagemSelector: '.image-gallery-image',
    //     tipoImovelSelector: '.vertical-property-card_type__wZ3CC',
    //     infosImovelSelector: '.vertical-property-card_characteristics__UxtL9 > span',
    //     nomeSite: 'borbaimoveis',
    //     hostImovel: 'https://www.borbaimoveis.com.br',
    //     hrefImovel: '.image-gallery-center > a',
    //     hrefImovel2: '.carousel-card_topContent__8bSr2 > a'
    // },
    // {
    //     url: 'https://www.creditoreal.com.br/vendas/santa-cruz-do-sul-rs?filters=%7B%22valueType%22%3Atrue%2C%22cityState%22%3A%22Santa+Cruz+Do+Sul_RS%22%2C%22finalValue%22%3A300000%2C%22initialValue%22%3A35001%2C%22neighborhoods%22%3A%5B%22Avenida%22%2C%22Centro%22%2C%22Germ%C3%A2nia%22%2C%22Goi%C3%A1s%22%2C%22Independ%C3%AAncia%22%2C%22Jardim+Universit%C3%A1rio%22%2C%22Renascen%C3%A7a%22%2C%22Santo+In%C3%A1cio%22%2C%22Universit%C3%A1rio%22%2C%22Vila+Verena%22%5D%7D&cityState=santa-cruz-do-sul-rs&orderBy=2&page=1',
    //     containerSelector: '.iJQgSL',
    //     localizacaoSelector: '.iVkwIY',
    //     precoSelector: '.lpgNWQ',
    //     imagemSelector: '.imJANe > img',
    //     tipoImovelSelector: '.imovel-type',
    //     infosImovelSelector: '.gzMWnN > div',
    //     nomeSite: 'creditoreal',
    //     hostImovel: 'https://www.creditoreal.com.br',
    //     hrefImovel: '.iJQgSL',
    //     hrefImovel2: '.eqXkQT .iJQgSL'
    // },
    // {
    //     url: 'https://www.imobel.com.br/Imoveis/Busca/1/1?carteira=V&cidade=5&bairro%5B%5D=76&bairro%5B%5D=10&bairro%5B%5D=29&bairro%5B%5D=174&bairro%5B%5D=56&bairro%5B%5D=15&bairro%5B%5D=19&bairro%5B%5D=3436&valor_l=1&valor_v=3&dormitorios=0&garagem=0&banheiro=0&area=0&codigo=',
    //     containerSelector: '.lista .col-md-4',
    //     localizacaoSelector: '.imovel-bairro',
    //     precoSelector: '.imovel-valor',
    //     imagemSelector: '.foto-imovel',
    //     tipoImovelSelector: '.imovel-tipo',
    //     infosImovelSelector: '.area',
    //     nomeSite: 'imobel',
    //     hostImovel: 'https://www.imobel.com.br/',
    //     hrefImovel: '.ajax',
    //     hrefImovel2: '.ajax'
    // },
    {
        url: 'https://imoveismegha.com.br/conteudos/imoveis/listaimoveis.php?pagina=1&id_cidade=1&valorinicial=35.001,00&valorfinal=300.000,00&id_opcao=1',
        containerSelector: '.row .col-sm-6',
        localizacaoSelector: '.info .text p:nth-of-type(2)',
        precoSelector: '.info .text p:nth-of-type(3) span',
        imagemSelector: null,
        tipoImovelSelector: '.info .text p',
        infosImovelSelector: null,
        nomeSite: 'imoveismegha',
        hostImovel: '.margin-bottom a',
        hrefImovel: '.ajax',
        hrefImovel2: '.ajax'
    }

];
//document.querySelectorAll('.spc-ver .row').length
col-sm-6 margin-bottom