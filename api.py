import json
import re
import requests
from urllib.parse import urlparse, parse_qs
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Habilita CORS para todas as rotas

# ============================================================
# FUNÇÕES PARA EXTRAIR LINKS DO TERABOX
# ============================================================

def extract_terabox_info(url):
    """
    Extrai informações de um link do TeraBox.
    Retorna um dicionário com os dados do arquivo ou pasta.
    """
    try:
        # Headers para simular um navegador
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }

        # Faz a requisição para o link do TeraBox
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        html = response.text

        # Tenta extrair o link direto do JavaScript
        # Procura por padrões comuns de links de download do TeraBox
        patterns = [
            r'"download_url":"([^"]+)"',
            r'"downloadUrl":"([^"]+)"', 
            r'"url":"([^"]+)"',
            r'https://[^\s]+\.terabox\.com/[^\s]+',
            r'https://[^\s]+\.1024terabox\.com/[^\s]+'
        ]

        for pattern in patterns:
            matches = re.findall(pattern, html)
            if matches:
                # Pega o primeiro link encontrado
                link = matches[0].replace('\\/', '/')
                # Verifica se é um link válido
                if link.startswith('http'):
                    return {
                        'success': True,
                        'download_url': link,
                        'streaming_url': link,
                        'file_name': extract_filename_from_url(link) or 'arquivo.pdf'
                    }

        # Se não encontrou link direto, tenta extrair da página
        # Procura por URLs no formato do TeraBox
        terabox_links = re.findall(r'https://[^\s"\'<>]+\.(?:terabox|1024terabox)\.com[^\s"\'<>]*', html)
        if terabox_links:
            return {
                'success': True,
                'download_url': terabox_links[0],
                'streaming_url': terabox_links[0],
                'file_name': 'arquivo.pdf'
            }

        # Se não encontrou nada, retorna erro
        return {
            'success': False,
            'error': 'Não foi possível extrair o link do arquivo. Pode ser que o link não seja público.'
        }

    except requests.exceptions.RequestException as e:
        return {
            'success': False,
            'error': f'Erro ao acessar o link: {str(e)}'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Erro inesperado: {str(e)}'
        }

def extract_filename_from_url(url):
    """Extrai o nome do arquivo da URL"""
    # Tenta extrair o nome do arquivo da URL
    match = re.search(r'/([^/]+\.pdf)$', url)
    if match:
        return match.group(1)
    return None

# ============================================================
# ROTAS DA API
# ============================================================

@app.route('/api', methods=['GET', 'OPTIONS'])
def get_terabox_info():
    """
    Endpoint principal da API.
    Recebe um link do TeraBox e retorna as informações do arquivo.
    """
    # Responde a requisições OPTIONS (preflight CORS)
    if request.method == 'OPTIONS':
        return '', 200

    # Obtém a URL da query string
    url_param = request.args.get('url')
    if not url_param:
        return jsonify({
            'success': False,
            'error': 'Parâmetro "url" é obrigatório. Exemplo: ?url=https://1024terabox.com/s/...'
        }), 400

    # Extrai as informações
    result = extract_terabox_info(url_param)

    # Formata a resposta para ser compatível com o esperado pelo front-end
    if result.get('success'):
        # Tenta criar uma resposta no formato esperado pelo front-end
        files = []
        if result.get('download_url'):
            files.append({
                'file_name': result.get('file_name', 'arquivo.pdf'),
                'download_url': result.get('download_url'),
                'streaming_url': result.get('streaming_url', result.get('download_url')),
                'size': 'Desconhecido'
            })
        
        return jsonify({
            'success': True,
            'files': files,
            'message': 'Arquivo encontrado com sucesso.'
        })
    else:
        return jsonify({
            'success': False,
            'error': result.get('error', 'Erro desconhecido ao processar o link.')
        }), 500

@app.route('/', methods=['GET'])
def home():
    """Página inicial da API com instruções"""
    return jsonify({
        'name': 'TeraBox Gateway API',
        'version': '1.0.0',
        'description': 'API para extrair links diretos do TeraBox',
        'endpoints': {
            '/api': 'GET - Parâmetro: url (link do TeraBox)',
        },
        'example': '/api?url=https://1024terabox.com/s/SEU_LINK_AQUI'
    })

# ============================================================
# INICIALIZAÇÃO
# ============================================================

if __name__ == '__main__':
    app.run(debug=True, port=5000)
