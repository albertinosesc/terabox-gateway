const https = require('https');

module.exports = async (req, res) => {
    // Cabeçalhos CORS
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
        // 1. Extrair o shorturl de forma precisa
        let shortUrl = '';
        if (urlParam.includes('/s/')) {
            shortUrl = urlParam.split('/s/')[1].split('?')[0];
        } else if (urlParam.includes('surl=')) {
            shortUrl = urlParam.split('surl=')[1].split('&')[0];
        } else {
            shortUrl = urlParam;
        }

        // Tratamento crucial para o TeraBox: Se o shorturl começar com '1', 
        // a API deles muitas vezes espera o parâmetro sem o '1' inicial no campo surl.
        let surlParam = shortUrl;
        if (surlParam.startsWith('1') && surlParam.length > 20) {
            surlParam = surlParam.substring(1);
        }

        // Nova URL da API deles com os parâmetros que o front-end oficial utiliza para evitar o erro 105
        const teraboxApiUrl = `https://www.terabox.com/share/list?app_id=250528&shorturl=${shortUrl}&surl=${surlParam}&root=1&page=1&num=100&dir=`;

        const fetchTeraBoxApi = (targetUrl) => {
            return new Promise((resolve, reject) => {
                const options = {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                        'Referer': `https://www.terabox.com/sharing/common?surl=${surlParam}`,
                        // O cookie simula uma sessão anônima ativa para evitar o bloqueio por robôs
                        'Cookie': 'PANWEB=1; lang=pt;'
                    }
                };

                https.get(targetUrl, options, (response) => {
                    let data = '';
                    response.on('data', chunk => data += chunk);
                    response.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error("A resposta do servidor do TeraBox não pôde ser lida estruturalmente."));
                        }
                    });
                }).on('error', reject);
            });
        };

        const dadosTeraBox = await fetchTeraBoxApi(teraboxApiUrl);

        // Se o errno for 0, a leitura foi um sucesso total
        if (dadosTeraBox && dadosTeraBox.errno === 0 && dadosTeraBox.list) {
            
            const arquivosFormatados = dadosTeraBox.list.map(item => {
                return {
                    file_name: item.server_filename,
                    // Garante um link alternativo viável caso o dlink direto temporário venha em branco
                    download_url: item.dlink || `https://www.terabox.com/sharing/common?surl=${surlParam}`,
                    streaming_url: item.dlink || `https://www.terabox.com/sharing/common?surl=${surlParam}`,
                    size: item.size ? `${(item.size / (1024 * 1024)).toFixed(2)} MB` : 'Desconhecido'
                };
            });

            return res.status(200).json({
                success: true,
                files: arquivosFormatados,
                message: 'Arquivos listados com sucesso.'
            });

        } else {
            // Tratamento amigável caso retorne outro erro específico do servidor deles
            return res.status(200).json({
                success: false,
                error: `TeraBox retornou o código de erro ${dadosTeraBox?.errno || 'Desconhecido'}. Certifique-se de que a pasta não possui senha e está pública.`
            });
        }

    } catch (error) {
        console.error('Erro:', error);
        return res.status(500).json({
            success: false,
            error: `Erro na comunicação interna: ${error.message}`
        });
    }
};
