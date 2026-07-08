const https = require('https');
const http = require('http');

module.exports = async (req, res) => {
    // Configuração manual e limpa de CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const url = req.query.url;
    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'Parâmetro "url" é obrigatório'
        });
    }

    try {
        const fetchPage = (targetUrl) => {
            return new Promise((resolve, reject) => {
                const client = targetUrl.startsWith('https') ? https : http;
                
                const options = {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                };

                client.get(targetUrl, options, (response) => {
                    // Trata redirecionamentos automáticos do TeraBox
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        return resolve(fetchPage(response.headers.location));
                    }

                    let data = '';
                    response.on('data', chunk => data += chunk);
                    response.on('end', () => resolve(data));
                }).on('error', reject);
            });
        };

        const html = await fetchPage(url);

        const patterns = [
            /"download_url":"([^"]+)"/,
            /"downloadUrl":"([^"]+)"/,
            /"url":"([^"]+)"/,
            /https:\/\/[^\s"']+\.(?:terabox|1024terabox)\.com[^\s"']*/
        ];

        let linkEncontrado = null;
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) {
                linkEncontrado = match[1] || match[0];
                break;
            }
        }

        if (linkEncontrado) {
            const linkLimpo = linkEncontrado.replace(/\\/g, '');
            const nomeArquivo = linkLimpo.split('/').pop() || 'arquivo.pdf';

            return res.status(200).json({
                success: true,
                files: [{
                    file_name: nomeArquivo,
                    download_url: linkLimpo,
                    streaming_url: linkLimpo,
                    size: 'Desconhecido'
                }],
                message: 'Arquivo encontrado com sucesso.'
            });
        } else {
            return res.status(200).json({
                success: false,
                error: 'Link de download direto não encontrado no HTML estrutural.'
            });
        }

    } catch (error) {
        console.error('Erro:', error);
        return res.status(500).json({
            success: false,
            error: `Erro interno no servidor: ${error.message}`
        });
    }
};
