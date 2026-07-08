const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

module.exports = async (req, res) => {
    // Cabeçalhos CORS para o seu painel do GitHub Pages conseguir acessar
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const urlParam = req.query.url;
    if (!urlParam) {
        return res.status(400).json({ success: false, error: 'Parâmetro "url" é obrigatório' });
    }

    let browser = null;

    try {
        // Configura o Chromium para rodar no ambiente limitado da Vercel
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        
        // Configura um User-Agent idêntico ao de um usuário comum
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

        let dadosArquivos = null;

        // Escuta em segundo plano todas as requisições de rede que a página fizer
        page.on('response', async (response) => {
            const url = response.url();
            // Intercepta o momento exato em que o TeraBox busca a lista de arquivos da pasta
            if (url.includes('/share/list') || url.includes('/share/selectlist')) {
                try {
                    const json = await response.json();
                    if (json && json.errno === 0 && json.list) {
                        dadosArquivos = json.list;
                    }
                } catch (e) {
                    // Ignora falhas de parse de respostas que não forem JSON
                }
            }
        });

        // Abre a página do TeraBox e espera até 30 segundos pelo carregamento da rede
        await page.goto(urlParam, { waitUntil: 'networkidle2', timeout: 30000 });

        // Caso a rede demore, dá um fôlego extra de 2 segundos para o JS injetar os dados
        if (!dadosArquivos) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        await browser.close();

        if (dadosArquivos && dadosArquivos.length > 0) {
            // Formata a resposta exatamente do jeito que a tabela do seu app.js precisa ler
            const arquivosFormatados = dadosArquivos.map(item => {
                // Captura o código curto do link enviado para criar um link alternativo viável
                const shortUrl = urlParam.split('/s/')[1]?.split('?')[0] || '';
                return {
                    file_name: item.server_filename,
                    download_url: item.dlink || `https://www.terabox.com/sharing/common?surl=${shortUrl}`,
                    streaming_url: item.dlink || `https://www.terabox.com/sharing/common?surl=${shortUrl}`,
                    size: item.size ? `${(item.size / (1024 * 1024)).toFixed(2)} MB` : 'Desconhecido'
                };
            });

            return res.status(200).json({
                success: true,
                files: arquivosFormatados,
                message: 'Arquivos interceptados com sucesso via Browser Serverless.'
            });
        }

        return res.status(200).json({
            success: false,
            error: 'O navegador abriu a página, mas o TeraBox escondeu a lista de arquivos. Verifique se o link não expirou.'
        });

    } catch (error) {
        if (browser !== null) {
            await browser.close();
        }
        console.error('Erro no Navegador Virtual:', error);
        return res.status(500).json({
            success: false,
            error: `Falha na emulação do navegador: ${error.message}`
        });
    }
};
