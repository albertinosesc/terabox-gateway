const https = require('https');

module.exports = async (req, res) => {
    // Cabeçalhos CORS obrigatorios para o seu app.js
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
        // Usando um gateway público especializado em extrair dados do TeraBox que burla o Cloudflare deles
        // Passamos o link original que você configurou no app.js
        const gatewayUrl = `https://terabox-dl.qtcloud.workers.dev/api/get-info?shareurl=${encodeURIComponent(urlParam)}`;

        const fetchGateway = (url) => {
            return new Promise((resolve, reject) => {
                https.get(url, (response) => {
                    let data = '';
                    response.on('data', chunk => data += chunk);
                    response.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error("Falha ao processar resposta do gateway de extração."));
                        }
                    });
                }).on('error', reject);
            });
        };

        const r = await fetchGateway(gatewayUrl);

        // Se o gateway conseguiu descriptografar e listar os arquivos da pasta
        if (r && (r.list || r.list?.length > 0)) {
            
            // Formatamos a resposta no formato EXATO que a sua tabela no app.js espera receber
            const arquivosFormatados = r.list.map(item => {
                return {
                    file_name: item.filename || item.server_filename || 'arquivo.pdf',
                    download_url: item.download_link || item.dlink || urlParam,
                    streaming_url: item.download_link || item.dlink || urlParam,
                    size: item.size ? item.size : 'Desconhecido'
                };
            });

            return res.status(200).json({
                success: true,
                files: arquivosFormatados,
                message: 'Arquivos sincronizados e listados com sucesso.'
            });

        } else {
            // Se o primeiro gateway falhar, tentamos o fallback usando o parser alternativo de link direto
            const fallbackUrl = `https://api.terabox.app/api?url=${encodeURIComponent(urlParam)}`;
            const fallbackResponse = await fetchGateway(fallbackUrl).catch(() => null);

            if (fallbackResponse && fallbackResponse.success) {
                return res.status(200).json(fallbackResponse);
            }

            return res.status(200).json({
                success: false,
                error: 'O TeraBox bloqueou a requisição nesta região. Verifique se a pasta continua pública no site.'
            });
        }

    } catch (error) {
        console.error('Erro na rota de extração:', error);
        return res.status(500).json({
            success: false,
            error: `Erro ao processar bypass do TeraBox: ${error.message}`
        });
    }
};
