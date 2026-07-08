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
        // 1. Extrair o shorturl do link do TeraBox (ex: 1M3K-9DetfJW-u2tEYsRlNw)
        let shortUrl = '';
        if (urlParam.includes('/s/')) {
            shortUrl = urlParam.split('/s/')[1].split('?')[0];
        } else if (urlParam.includes('surl=')) {
            shortUrl = urlParam.split('surl=')[1].split('&')[0];
        } else {
            // Se já enviou só o código curto
            shortUrl = urlParam;
        }

        // Se o link do TeraBox começar com "1", a API deles frequentemente exige remover o primeiro caractere ou tratá-lo como 'surl=1...'
        // Vamos estruturar a requisição para a API pública de listagem do TeraBox
        const teraboxApiUrl = `https://www.terabox.com/share/list?app_id=250528&shorturl=${shortUrl}&root=1&page=1&num=100`;

        const fetchTeraBoxApi = (targetUrl) => {
            return new Promise((resolve, reject) => {
                const options = {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Referer': 'https://www.terabox.com/'
                    }
                };

                https.get(targetUrl, options, (response) => {
                    let data = '';
                    response.on('data', chunk => data += chunk);
                    response.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error("Resposta do TeraBox não é um JSON válido."));
                        }
                    });
                }).on('error', reject);
            });
        };

        const dadosTeraBox = await fetchTeraBoxApi(teraboxApiUrl);

        // Verificando se a API deles retornou a lista de arquivos (errno 0 significa sucesso)
        if (dadosTeraBox && dadosTeraBox.errno === 0 && dadosTeraBox.list) {
            
            // Mapeia a lista do TeraBox para o formato exato que o seu app.js espera receber
            const arquivosFormatados = dadosTeraBox.list.map(item => {
                return {
                    file_name: item.server_filename,
                    // O TeraBox não entrega o link direto mastigado aqui, ele dá caminhos de dlink. 
                    // Se dlink não existir, usamos o link de visualização padrão adaptado.
                    download_url: item.dlink || `https://www.terabox.com/sharing/common?surl=${shortUrl}`,
                    streaming_url: item.dlink || `https://www.terabox.com/sharing/common?surl=${shortUrl}`,
                    size: item.size ? `${(item.size / (1024 * 1024)).toFixed(2)} MB` : 'Desconhecido'
                };
            });

            return res.status(200).json({
                success: true,
                files: arquivosFormatados,
                message: 'Arquivos da pasta listados com sucesso.'
            });

        } else {
            // Caso a API falhe ou a pasta precise de senha (pwd)
            return res.status(200).json({
                success: false,
                error: `Não foi possível listar os arquivos. Resposta do TeraBox (Código ${dadosTeraBox?.errno || 'Desconhecido'}). Verifique se o link está ativo.`
            });
        }

    } catch (error) {
        console.error('Erro:', error);
        return res.status(500).json({
            success: false,
            error: `Erro ao processar os dados do TeraBox: ${error.message}`
        });
    }
};
