const fs = require("fs");
const xlsx = require("xlsx");

async function converterPlanilha(imoveis) {

    const workbook = xlsx.utils.book_new(); // Cria um novo arquivo Excel
    const worksheet = xlsx.utils.json_to_sheet(imoveis); // Converte JSON para uma planilha

    // Adiciona a planilha ao arquivo
    xlsx.utils.book_append_sheet(workbook, worksheet, "Imóveis")

    // Salva o arquivo .xlsx
    xlsx.writeFile(workbook, "data/imoveis.xlsx")

    console.log("Arquivo Excel 'imoveis.xlsx' criado com sucesso!")
}

module.exports = converterPlanilha;