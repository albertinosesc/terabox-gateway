// ============================================================
// CONFIGURAÇÕES GERAIS E CONFIGURAÇÃO DO TERABOX
// ============================================================

// ===== URL da pasta pública no TeraBox =====
const PASTA_TERABOX = "https://1024terabox.com/s/1EaAWWSXZGqcaoe10BjpZRw";

// ===== Cache para armazenar os arquivos da pasta =====
let cacheArquivosTeraBox = null;

// ===== Variáveis de Controle do Sistema =====
let livros = [];
let resultadosFiltrados = [];
let ordenacao = { campo: 'numero', direcao: 'asc' };
let autorSelecionado = null;
let instrumentoSelecionado = null;

// ============================================================
// FUNÇÕES DE INTEGRAÇÃO COM O TERABOX (BACKEND NO FRONT)
// ============================================================

// ===== Função para listar arquivos da pasta TeraBox direto pelo Navegador =====
async function listarArquivosTeraBox() {
    if (cacheArquivosTeraBox) {
        return cacheArquivosTeraBox;
    }

    try {
        console.log("🔄 Sincronizando tabela com a pasta do TeraBox...");
        
        // Extrai o código único do seu link (EaAWWSXZGqcaoe10BjpZRw)
        const shortUrl = PASTA_TERABOX.split('/s/')[1].split('?')[0];
        
        let surlParam = shortUrl;
        if (surlParam.startsWith('1')) {
            surlParam = surlParam.substring(1);
        }

        // Endpoint WAP (móvel) oficial do TeraBox - mais leve e aberto para navegadores comuns
        const apiUrl = `https://www.terabox.com/wap/share/filelist?surl=${surlParam}`;
        
        // Faz a requisição usando o IP real do usuário (evita bloqueio de datacenter)
        const resposta = await fetch(apiUrl);
        const html = await resposta.text();
        
        let dadosArquivos = null;

        // Tenta capturar a lista de arquivos estruturada injetada no HTML do TeraBox
        const regexLista = /fnList\s*=\s*(\[.+?\]);/s;
        const match = html.match(regexLista);

        if (match) {
            dadosArquivos = JSON.parse(match[1]);
        } else {
            // Fallback: Tenta o padrão secundário de estado global do site
            const regexEstadoAlt = /window\.__INITIAL_STATE__\s*=\s*({.+?});/s;
            const matchAlt = html.match(regexEstadoAlt);
            if (matchAlt) {
                const estado = JSON.parse(matchAlt[1]);
                dadosArquivos = estado?.shareList?.list || estado?.fileList?.list;
            }
        }
        
        if (dadosArquivos && dadosArquivos.length > 0) {
            cacheArquivosTeraBox = dadosArquivos.map(arquivo => ({
                nome: arquivo.server_filename || arquivo.filename,
                link: arquivo.dlink || `https://www.terabox.com/sharing/common?surl=${surlParam}`,
                tamanho: arquivo.size ? `${(arquivo.size / (1024 * 1024)).toFixed(2)} MB` : 'Desconhecido'
            }));
            
            console.log(`✅ ${cacheArquivosTeraBox.length} arquivos mapeados com sucesso do TeraBox.`);
            return cacheArquivosTeraBox;
        } else {
            console.warn("⚠️ O TeraBox ocultou os dados estruturais. Ativando modo de abertura por redirecionamento direto.");
            return [];
        }
    } catch (erro) {
        console.error("❌ Falha na conexão direta com o ecossistema TeraBox:", erro);
        return [];
    }
}

// ===== Função Inteligente para abrir os PDFs =====
async function abrirPDF(caminho) {
    if (caminho.startsWith('http://') || caminho.startsWith('https://')) {
        window.open(caminho, '_blank');
        return;
    }

    const arquivos = await listarArquivosTeraBox();
    const arquivo = arquivos.find(a => a.nome === caminho);
    
    if (arquivo && arquivo.link) {
        window.open(arquivo.link, '_blank');
    } else {
        // Fallback de Segurança: Se o arquivo exato não for mapeado em tempo real, abre a pasta geral para o usuário buscar
        console.log(`Redirecionando de forma segura para a pasta de arquivos para buscar por: ${caminho}`);
        window.open(PASTA_TERABOX, '_blank');
    }
}

// ============================================================
// LOGICA DE CARREGAMENTO E RENDERIZAÇÃO DA BIBLIOTECA
// ============================================================

// ===== Carregar dados iniciais =====
function carregarDados() {
    if (typeof dadosLivros !== 'undefined') {
        livros = dadosLivros;
    } else {
        console.warn('Variável dadosLivros não foi injetada no escopo global. Iniciando array vazia.');
        livros = [];
    }
    resultadosFiltrados = [...livros];
    ordenarPor('numero');
    mostrarPagina('inicio');
    
    // Deixa pré-carregando em background a lista de links do TeraBox
    listarArquivosTeraBox();
}

// ===== Controle de Navegação das Abas =====
function mostrarPagina(pagina) {
    document.querySelectorAll('.pagina').forEach(el => el.style.display = 'none');
    document.getElementById(pagina).style.display = 'block';
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    document.querySelector(`.sidebar a[data-pagina="${pagina}"]`)?.classList.add('active');

    if (pagina === 'biblioteca') renderizarTabela();
    else if (pagina === 'autores') renderizarAutores();
    else if (pagina === 'instrumentos') renderizarInstrumentos();
    else if (pagina === 'estatisticas') renderizarEstatisticas();
    else if (pagina === 'inicio') renderizarInicio();
}

// ===== Aba Início =====
function renderizarInicio() {
    const total = livros.length;
    const autores = new Set(livros.map(l => l.autor));
    const instrumentos = new Set(livros.map(l => l.instrumento));
    const tipos = new Set(livros.map(l => l.tipo));

    document.getElementById('inicio').innerHTML = `
        <h1>📚 Biblioteca Musical</h1>
        <div class="card-grid">
            <div class="card"><h3>${total}</h3><p>Total de Livros</p></div>
            <div class="card"><h3>${autores.size}</h3><p>Total de Autores</p></div>
            <div class="card"><h3>${instrumentos.size}</h3><p>Total de Instrumentos</p></div>
            <div class="card"><h3>${tipos.size}</h3><p>Total de Tipos</p></div>
        </div>
        <p style="color:#666; margin-top: 20px;">Use o menu lateral para navegar e explorar o acervo.</p>
    `;
}

// ===== Aba Biblioteca Principal =====
function renderizarTabela() {
    const container = document.getElementById('biblioteca');
    container.innerHTML = `
        <h1>📖 Biblioteca</h1>
        <div class="search-bar">
            <input type="text" id="pesquisa" placeholder="Buscar por título, autor, número..." oninput="filtrarEBuscar()">
            <select id="filtroTipo" onchange="filtrarEBuscar()">
                <option value="todos">Todos os Tipos</option>
                <option value="PDF">PDF</option>
                <option value="LIVRO">Livro</option>
                <option value="REVISTA">Revista</option>
                <option value="ARTIGO">Artigo</option>
                <option value="DISSERTAÇÃO">Dissertação</option>
                <option value="MONOGRAFIA">Monografia</option>
                <option value="FOLHETO">Folheto</option>
            </select>
            <select id="ordenar" onchange="alterarOrdenacao()">
                <option value="numero">Ordenar por: Número</option>
                <option value="autor">Ordenar por: Autor</option>
                <option value="titulo">Ordenar por: Título</option>
                <option value="instrumento">Ordenar por: Instrumento</option>
            </select>
            <button onclick="exportarTXT()">📤 Exportar TXT</button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Número</th><th>Tipo</th><th>Instrumento</th><th>Autor</th><th>Título</th><th>Ação</th></tr>
                </thead>
                <tbody id="corpoTabela"></tbody>
            </table>
        </div>
    `;
    filtrarEBuscar();
}

function filtrarEBuscar() {
    const termo = document.getElementById('pesquisa')?.value?.toLowerCase() || '';
    const filtroTipo = document.getElementById('filtroTipo')?.value || 'todos';
    const campo = document.getElementById('ordenar')?.value || 'numero';

    let filtrados = livros.filter(livro => {
        if (filtroTipo !== 'todos' && livro.tipo !== filtroTipo) return false;
        if (termo) {
            const campos = [
                String(livro.numero), 
                livro.autor, 
                livro.instrumento, 
                livro.tipo, 
                livro.titulo
            ];
            return campos.some(c => c && String(c).toLowerCase().includes(termo));
        }
        return true;
    });

    ordenarPor(campo, filtrados);
    resultadosFiltrados = filtrados;
    renderizarLinhas(filtrados);
}

function ordenarPor(campo, lista = null) {
    const dados = lista || livros;
    const direcao = (ordenacao.campo === campo && ordenacao.direcao === 'asc') ? 'desc' : 'asc';
    ordenacao.campo = campo;
    ordenacao.direcao = direcao;

    dados.sort((a, b) => {
        let valA = a[campo] || '';
        let valB = b[campo] || '';
        if (campo === 'numero') {
            valA = parseInt(valA) || 0;
            valB = parseInt(valB) || 0;
        } else {
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
        }
        if (valA < valB) return direcao === 'asc' ? -1 : 1;
        if (valA > valB) return direcao === 'asc' ? 1 : -1;
        return 0;
    });
}

function renderizarLinhas(lista) {
    const tbody = document.getElementById('corpoTabela');
    if (!tbody) return;
    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;">Nenhum livro ou partitura encontrados.</td></tr>';
        return;
    }
    let html = '';
    lista.forEach(livro => {
        html += `<tr>
            <td>${livro.numero}</td>
            <td>${livro.tipo}</td>
            <td>${livro.instrumento}</td>
            <td>${livro.autor}</td>
            <td>${livro.titulo}</td>
            <td><button class="btn-pdf" onclick="abrirPDF('${livro.arquivo}')">📄 Abrir PDF</button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function alterarOrdenacao() {
    filtrarEBuscar();
}

// ===== Função de Exportação de Relatórios =====
function exportarTXT() {
    if (resultadosFiltrados.length === 0) {
        alert('Não existem resultados filtrados para exportação.');
        return;
    }
    let texto = 'Número - Tipo - Instrumento - Autor - Título\n';
    resultadosFiltrados.forEach(l => {
        texto += `${l.numero} - ${l.tipo} - ${l.instrumento} - ${l.autor} - ${l.titulo}\n`;
    });
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'exportacao_biblioteca.txt';
    link.click();
    URL.revokeObjectURL(link.href);
}

// ===== Aba Autores =====
function renderizarAutores() {
    const container = document.getElementById('autores');
    const mapa = new Map();
    livros.forEach(l => mapa.set(l.autor, (mapa.get(l.autor) || 0) + 1));
    const lista = Array.from(mapa.entries()).sort((a, b) => b[1] - a[1]);

    let html = '<h1>✍️ Autores</h1><div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px;">';
    lista.forEach(([autor, qtd]) => {
        html += `<span class="list-item" onclick="filtrarPorAutor('${autor.replace(/'/g, "\\'")}')"><span>${autor}</span> <small>(${qtd})</small></span>`;
    });
    html += '</div><div id="livrosPorAutor" style="margin-top:20px;"></div>';
    container.innerHTML = html;
}

function filtrarPorAutor(autor) {
    const filtrados = livros.filter(l => l.autor === autor);
    const div = document.getElementById('livrosPorAutor');
    if (!div) return;
    if (filtrados.length === 0) {
        div.innerHTML = '<p>Nenhum livro deste autor encontrado.</p>';
        return;
    }
    let html = `<h3>Livros de ${autor} (${filtrados.length})</h3><div class="table-container"><table><thead><tr><th>Número</th><th>Tipo</th><th>Instrumento</th><th>Título</th><th>Ação</th></tr></thead><tbody>`;
    filtrados.forEach(l => {
        html += `<tr><td>${l.numero}</td><td>${l.tipo}</td><td>${l.instrumento}</td><td>${l.titulo}</td><td><button class="btn-pdf" onclick="abrirPDF('${l.arquivo}')">📄 Abrir</button></td></tr>`;
    });
    html += '</tbody></table></div>';
    div.innerHTML = html;
}

// ===== Aba Instrumentos =====
function renderizarInstrumentos() {
    const container = document.getElementById('instrumentos');
    const mapa = new Map();
    livros.forEach(l => mapa.set(l.instrumento, (mapa.get(l.instrumento) || 0) + 1));
    const lista = Array.from(mapa.entries()).sort((a, b) => b[1] - a[1]);

    let html = '<h1>🎸 Instrumentos</h1><div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px;">';
    lista.forEach(([inst, qtd]) => {
        html += `<span class="list-item" onclick="filtrarPorInstrumento('${inst.replace(/'/g, "\\'")}')"><span>${inst}</span> <small>(${qtd})</small></span>`;
    });
    html += '</div><div id="livrosPorInstrumento" style="margin-top:20px;"></div>';
    container.innerHTML = html;
}

function filtrarPorInstrumento(instrumento) {
    const filtrados = livros.filter(l => l.instrumento === instrumento);
    const div = document.getElementById('livrosPorInstrumento');
    if (!div) return;
    if (filtrados.length === 0) {
        div.innerHTML = '<p>Nenhum livro registrado para este instrumento.</p>';
        return;
    }
    let html = `<h3>Livros de ${instrumento} (${filtrados.length})</h3><div class="table-container"><table><thead><tr><th>Número</th><th>Tipo</th><th>Autor</th><th>Título</th><th>Ação</th></tr></thead><tbody>`;
    filtrados.forEach(l => {
        html += `<tr><td>${l.numero}</td><td>${l.tipo}</td><td>${l.autor}</td><td>${l.titulo}</td><td><button class="btn-pdf" onclick="abrirPDF('${l.arquivo}')">📄 Abrir</button></td></tr>`;
    });
    html += '</tbody></table></div>';
    div.innerHTML = html;
}

// ===== Aba Estatísticas Gerais =====
function renderizarEstatisticas() {
    const container = document.getElementById('estatisticas');
    const total = livros.length;
    const autores = new Set(livros.map(l => l.autor));
    const instrumentos = new Set(livros.map(l => l.instrumento));
    const tipos = new Set(livros.map(l => l.tipo));

    const mapInst = new Map();
    livros.forEach(l => mapInst.set(l.instrumento, (mapInst.get(l.instrumento)||0)+1));
    const sortedInst = Array.from(mapInst.entries()).sort((a,b)=>b[1]-a[1]);

    const mapTip = new Map();
    livros.forEach(l => mapTip.set(l.tipo, (mapTip.get(l.tipo)||0)+1));
    const sortedTip = Array.from(mapTip.entries()).sort((a,b)=>b[1]-a[1]);

    const mapAut = new Map();
    livros.forEach(l => mapAut.set(l.autor, (mapAut.get(l.autor)||0)+1));
    const sortedAut = Array.from(mapAut.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10);

    container.innerHTML = `
        <h1>📊 Estatísticas do Acervo</h1>
        <div class="card-grid">
            <div class="card"><h3>${total}</h3><p>Total de Livros</p></div>
            <div class="card"><h3>${autores.size}</h3><p>Total de Autores</p></div>
            <div class="card"><h3>${instrumentos.size}</h3><p>Total de Instrumentos</p></div>
            <div class="card"><h3>${tipos.size}</h3><p>Total de Tipos</p></div>
        </div>
        <div class="stat-grid">
            <div class="stat-card"><h4>🎸 Livros por Instrumento</h4><ul>${sortedInst.map(([inst, qtd]) => `<li><span>${inst}</span><span>${qtd}</span></li>`).join('')}</ul></div>
            <div class="stat-card"><h4>📂 Livros por Tipo</h4><ul>${sortedTip.map(([tipo, qtd]) => `<li><span>${tipo}</span><span>${qtd}</span></li>`).join('')}</ul></div>
            <div class="stat-card"><h4>🏆 Autores com mais títulos (Top 10)</h4><ul>${sortedAut.map(([autor, qtd]) => `<li><span>${autor}</span><span>${qtd}</span></li>`).join('')}</ul></div>
        </div>
    `;
}

// ============================================================
// INICIALIZAÇÃO DO ECOSSISTEMA DOM
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.sidebar a').forEach(link => {
        link.addEventListener('click', (e) => {
            const pagina = link.dataset.pagina;
            if (pagina) {
                e.preventDefault();
                mostrarPagina(pagina);
            }
        });
    });
    carregarDados();
});
