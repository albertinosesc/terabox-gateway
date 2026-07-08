module.exports = async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'Parâmetro "url" é obrigatório' });
    }

    try {
        // Faz uma requisição para o TeraBox e extrai o link direto
        const response = await fetch(url);
        const html = await response.text();
        
        // Tenta extrair o link direto do HTML
        const match = html.match(/https:\/\/[^\s"']+\.(?:terabox|1024terabox)\.com[^\s"']*/);
        if (match) {
            return res.json({
                success: true,
                download_url: match[0],
                file_name: 'arquivo.pdf'
            });
        } else {
            return res.status(404).json({ error: 'Link não encontrado' });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
