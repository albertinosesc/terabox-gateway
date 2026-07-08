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
        // Normaliza a URL de compartilhamento padrão para garantir que caia no visualizador web
        let targetUrl = urlParam;
        if (!targetUrl.startsWith('http')) {
            targetUrl = `https://1024terabox.com/s/${targetUrl}`;
        }

        const fetchHtml = (url) => {
            return new Promise((resolve, reject) => {
                const options = {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9'
                    }
                };
                https.get(url, options, (response) => {
                    // Segue redirecionamentos se houver
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        return resolve(fetchHtml(response.headers.location));
                    }
                    let data = '';
                    response.on('data', chunk => data += chunk);
                    response.on('end', () => resolve(data));
                }).on('error', reject);
            });
        };

        const html = await fetchHtml(targetUrl);

        // Procura pelo estado injetado que contém a lista de arquivos da pasta pública
        const stateRegex = /window\.__INITIAL_STATE__\s*=\s*({.+?});/s;
        const match = html.match(stateRegex);

        if (!match) {
            // Tentativa secundária caso use outro padrão de atribuição
            const altRegex = /__INITIAL_STATE__\s*=\s*({.+?});/s;
            const altMatch = html.match(altRegex);
            if (!altMatch) {
                return res.status(200).json({
                    success: false,
                    error: 'Não foi possível rastrear os dados estruturais da página. Verifique se o link ainda é válido.'
                });
            }
            match = altMatch;
        }

        const estadoObj = JSON.parse(match[1]);
        
        // Caminho dos arquivos dentro do objeto de estado estrutural do TeraBox
        const listaArquivos = estadoObj?.shareList?.list || estadoObj?.fileList?.list || [];

        if (listaArquivos && listaArquivos.length > 0) {
            const arquivosFormatados = listaArquivos.map(item => {
                // Monta uma URL alternativa funcional usando os identificadores locais capturados do estado
                const shareId = estadoObj?.shareList?.shareid || '';
                const uk = item.uk || '';
                
                return {
                    file_name: item.server_filename,
                    download_url: item.dlink || `https://www.terabox.com/sharing/common?surl=${urlParam.split('/s/')[1] || ''}`,
                    streaming_url: item.dlink || `https://www.terabox.com/sharing/common?surl=${urlParam.split('/s/')[1] || ''}`,
                    size: item.size ? `${(item.size / (1024 * 1024)).toFixed(2)} MB` : 'Desconhecido'
                };
            });

            return res.status(200).json({
                success: true,
                files: arquivosFormatados,
                message: 'Arquivos extraídos do estado da página com sucesso.'
            });
        }

        // Se encontrou o estado mas a lista está vazia, o link pode estar protegido ou expirado
        return res.status(200).json({
            success: false,
            error: 'Nenhum arquivo listado nesta pasta. O conteúdo pode ser privado ou exigir senha.'
        });

    } catch (error) {
        console.error('Erro na extração:', error);
        return res.status(500).json({
            success: false,
            error: `Erro ao analisar os dados do servidor: ${error.message}`
        });
    }
};
