const https = require('https');

module.exports = async (req, res) => {
    // Cabeçalhos CORS para o seu painel do GitHub Pages
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

    try {
        // 1. Extrai o código identificador único da URL fornecida
        let shortUrl = '';
        if (urlParam.includes('/s/')) {
            shortUrl = urlParam.split('/s/')[1].split('?')[0];
        } else if (urlParam.includes('surl=')) {
            shortUrl = urlParam.split('surl=')[1].split('&')[0];
        } else {
            shortUrl = urlParam;
        }

        // Se o shorturl começar com '1', removemos o '1' para compor o parâmetro surl padrão
        let surlKey = shortUrl;
        if (surlKey.startsWith('1') && surlKey.length > 20) {
            surlKey = surlKey.substring(1);
        }

        // 2. Aponta para a rota mobile (WAP), que entrega o estado dos arquivos direto no HTML estrutural sem travas
        const wapUrl = `https://www.terabox.com/wap/share/filelist?surl=${surlKey}`;

        const fetchPageHtml = (targetUrl) => {
            return new Promise((resolve, reject) => {
                const options = {
                    headers: {
                        // Simula um celular antigo/comum para forçar o TeraBox a entregar o HTML limpo simplificado
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9'
                    }
                };

                https.get(targetUrl, options, (response) => {
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        return resolve(fetchPageHtml(response.headers.location));
                    }
                    let data = '';
                    response.on('data', chunk => data += chunk);
                    response.on('end', () => resolve(data));
                }).on('error', reject);
            });
        };

        const html = await fetchPageHtml(wapUrl);

        // 3. O TeraBox Mobile injeta a lista em uma variável global chamada 'fnList' ou dentro do '__INITIAL_STATE__' da versão wap
        // Vamos capturar a string JSON de arquivos que fica na tag de script
        const regexLista = /fnList\s*=\s*(\[.+?\]);/s;
        let match = html.match(regexLista);
        let dadosArquivos = null;

        if (match) {
            dadosArquivos = JSON.parse(match[1]);
        } else {
            // Fallback para o padrão alternativo do estado inicial móvel
            const regexEstadoAlt = /window\.__INITIAL_STATE__\s*=\s*({.+?});/s;
            const matchAlt = html.match(regexEstadoAlt);
            if (matchAlt) {
                const estado = JSON.parse(matchAlt[1]);
                dadosArquivos = estado?.shareList?.list || estado?.fileList?.list;
            }
        }

        if (dadosArquivos && dadosArquivos.length > 0) {
            // Formata a resposta perfeitamente para o seu front-end (app.js) preencher a tabela musical
            const arquivosFormatados = dadosArquivos.map(item => {
                return {
                    file_name: item.server_filename || item.filename || 'arquivo.pdf',
                    download_url: item.dlink || `https://www.terabox.com/sharing/common?surl=${surlKey}`,
                    streaming_url: item.dlink || `https://www.terabox.com/sharing/common?surl=${surlKey}`,
                    size: item.size ? `${(item.size / (1024 * 1024)).toFixed(2)} MB` : 'Desconhecido'
                };
            });

            return res.status(200).json({
                success: true,
                files: arquivosFormatados,
                message: 'Lista de arquivos sincronizada com sucesso através do canal WAP.'
            });
        }

        return res.status(200).json({
            success: false,
            error: 'O TeraBox bloqueou a listagem ou a pasta está vazia. Certifique-se de que o link é público.'
        });

    } catch (error) {
        console.error('Erro na extração WAP:', error);
        return res.status(500).json({
            success: false,
            error: `Erro interno ao ler dados remotos: ${error.message}`
        });
    }
};
