// ============================================================
// API para extrair links do TeraBox (Node.js)
// ============================================================

module.exports = async (req, res) => {
    // ===== Configurar CORS manualmente (fallback) =====
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // ===== Responder preflight (OPTIONS) =====
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ===== Obter a URL da query string =====
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'Parâmetro "url" é obrigatório. Exemplo: ?url=https://1024terabox.com/s/...'
        });
    }

    try {
        // ===== Fazer requisição para o TeraBox =====
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
            }
        });

        const html = await response.text();

        // ===== Extrair links do HTML =====
        // Padrões de URL do TeraBox
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
            // Limpa o link (remove barras invertidas)
            const linkLimpo = linkEncontrado.replace(/\\/g, '');
            
            // Tenta extrair o nome do arquivo
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
                error: 'Não foi possível extrair o link do arquivo. Verifique se o link é público.'
            });
        }

    } catch (error) {
        console.error('Erro na API:', error);
        return res.status(500).json({
            success: false,
            error: `Erro interno: ${error.message}`
        });
    }
};
