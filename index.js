let fs = require('fs');

const SEMANA = require('./config/semana');
const DESTINATION_PATH = `./SEMANA ${SEMANA}`;
const CLUSTERS = require('./config/clusters');
const LOJAS = require('./config/lojas');

const count_POR_ESTADO = {
    "RJ": 1,
    "SP": 1,
    "MG": 1,
    "ES": 1
}

const count_POR_LOJA = {};

let copiedFiles = 0;

function resetAll() {
    if (fs.existsSync('./erro.txt')) {
        fs.unlinkSync('./erro.txt');
    };

    if (fs.existsSync(`./SEMANA ${SEMANA}`)) {
        fs.writeFileSync('./erro.txt', 'DIRETÓRIO DESSA SEMANA JÁ EXISTENTE. LEMBRE-SE DE ALTERAR A SEMANA ANTES DE EXECUTAR O SCRIPT.');
    };
}

function execute() {
    const allPhotos = fs.readdirSync('./photos');

    allPhotos.forEach(filename => {
        var substring = filename.substring(filename.lastIndexOf('-') + 1).split('.')[0];
        var fileExtension = filename.substring(filename.lastIndexOf('.') + 1);

        var has_ = substring.includes('_')

        let rule = {
            type: undefined,
            cluster: undefined
        };

        const { cod_siac, isSpecific } = checkIfSpecific(filename);
        if (isSpecific) {
            rule.type = "OFERTA_ESPECÍFICA";
            rule.cluster = cod_siac;
        } else if (!has_ || !!Number(substring.split('_')[1])) {
            rule.type = "POR_ESTADO";
            rule.cluster = has_ ? substring.split('_')[0] : substring; // ex. RJ
        } else {
            rule.type = "POR_REGIÃO";
            rule.cluster = substring.split('_')[1]; // ex. RL
        };

        if (!fs.existsSync(DESTINATION_PATH)) {
            fs.mkdirSync(DESTINATION_PATH);
        };

        applyRule(filename, rule, fileExtension);
    });

    const time = new Date();
    fs.writeFileSync(`./final_report-${SEMANA}.txt`, `\n\n=> NO TOTAL FORAM COPIADOS ${copiedFiles} ARQUIVOS COM SUCESSO.\n${time.getHours()}:${time.getMinutes()} `,
        { flag: 'a' });
};

function checkIfSpecific(filename) {
    let isSpecific = false;
    let cod_siac;

    for (var i = 0; i < LOJAS.length; i++) {
        const label = LOJAS[i].nome.toUpperCase();
        if (filename.toUpperCase().indexOf(label) !== -1) {
            isSpecific = true;
            cod_siac = LOJAS[i].cod_siac;
            break;
        };
    };

    return {
        isSpecific,
        cod_siac
    }
};

function copyAndReport({ cluster, count, fileExtension, filename }) {
    var copyFilename = `${DESTINATION_PATH}/S${SEMANA}L${cluster}F${count}.${fileExtension}`;
    fs.copyFileSync(`./photos/${filename}`, copyFilename);
    count += 1;

    var content = `Inicial: ${filename} - Final: ${copyFilename}\n`
    fs.writeFileSync(`./final_report-${SEMANA}.txt`, content, {
        flag: 'a'
    })
    copiedFiles += 1;
}

function applyRule(filename, rule, fileExtension) {
    var errorMessage = 'Não foi possível copiar o arquivo ';
    let report;

    if (rule.type === 'OFERTA_ESPECÍFICA') {
        if (!count_POR_LOJA[rule.cluster]) {
            count_POR_LOJA[rule.cluster] = 1;
        };

        try {
            copyAndReport({ cluster: rule.cluster, count: count_POR_LOJA[rule.cluster], filename, fileExtension });
            return;
        } catch (error) {
            report = errorMessage + filename + '\n';
            fs.writeFileSync('./erro.txt', report, { flag: 'a' });

            return;
        };
    };

    if (rule.type === 'POR_ESTADO') {
        try {
            copyAndReport({ cluster: rule.cluster, count: count_POR_ESTADO[rule.cluster], filename, fileExtension });
            return;
        } catch (error) {
            report = errorMessage + filename + '\n';
            fs.writeFileSync('./erro.txt', report, { flag: 'a' });

            return;
        }
    }

    if (rule.type === "POR_REGIÃO") {
        CLUSTERS[rule.cluster].forEach(cod_siac => {
            let idx;
            if (count_POR_LOJA[cod_siac]) {
                idx = count_POR_LOJA[cod_siac];
            } else {
                idx = 1
            }

            try {
                copyAndReport({ cluster: cod_siac, count: idx, filename, fileExtension });
                return;
            } catch (error) {
                report = errorMessage + filename + '\n';
                fs.writeFileSync('./erro.txt', report, { flag: 'a' });
                return;
            };
        });

        return;
    };
};

resetAll();
execute();