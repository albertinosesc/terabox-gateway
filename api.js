// ============================================================
// API para extrair links do TeraBox (Node.js)
// ============================================================

module.exports = async (req, res) => {
    // CORS
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
        const https = require('https');
        const http = require('http');

        const fetchPage = (url) => {
            return new Promise((resolve, reject) => {
                const client = url.startsWith('https') ? https : http;
                client.get(url, (response) => {
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

            return res.json({
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
            return res.status(404).json({
                success: false,
                error: 'Link não encontrado. Verifique se o link é público.'
            });
        }

    } catch (error) {
        console.error('Erro:', error);
        return res.status(500).json({
            success: false,
            error: `Erro: ${error.message}`
        });
    }
};
