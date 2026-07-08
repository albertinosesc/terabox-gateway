// ===== URL da sua API Vercel (terabox-gateway) =====
const API_TERABOX = "https://terabox-gateway-d0zp5k43m-albertinos-projects.vercel.app/api";

// ===== URL da pasta no TeraBox =====
const PASTA_TERABOX = "https://1024terabox.com/s/1M3K-9DetfJW-u2tEYsRlNw";

// ===== Cache para armazenar os arquivos da pasta =====
let cacheArquivosTeraBox = null;

let livros = [];
let resultadosFiltrados = [];
let ordenacao = { campo: 'numero', direcao: 'asc' };
let autorSelecionado = null;
let instrumentoSelecionado = null;

// ===== Função para listar arquivos da pasta TeraBox =====
async function listarArquivosTeraBox() {
    // Se já tiver em cache, retorna
    if (cacheArquivosTeraBox) {
        return cacheArquivosTeraBox;
    }

    const apiUrl = `${API_TERABOX}?url=${encodeURIComponent(PASTA_TERABOX)}`;
    
    try {
        const resposta = await fetch(apiUrl);
        const dados = await resposta.json();
        
        if (dados.success && dados.files && dados.files.length > 0) {
            // Mapeia os arquivos para um formato mais fácil de usar
            cacheArquivosTeraBox = dados.files.map(arquivo => ({
                nome: arquivo.file_name,
                link: arquivo.streaming_url || arquivo.download_url,
                tamanho: arquivo.size
            }));
            console.log(`✅ ${cacheArquivosTeraBox.length} arquivos encontrados na pasta.`);
            return cacheArquivosTeraBox;
        } else {
            console.error("❌ Erro ao listar arquivos:", dados.error || "Resposta inválida");
            return [];
        }
    } catch (erro) {
        console.error("❌ Erro na requisição:", erro);
        return [];
    }
}

// ===== Função para abrir PDF (com suporte a TeraBox) =====
async function abrirPDF(caminho) {
    // Se já for uma URL completa (não TeraBox)
    if (caminho.startsWith('http://') || caminho.startsWith('https://')) {
        window.open(caminho, '_blank');
        return;
    }

    // Busca a lista de arquivos da pasta TeraBox
    const arquivos = await listarArquivosTeraBox();
    
    // Procura o arquivo pelo nome
    const arquivo = arquivos.find(a => a.nome === caminho);
    
    if (arquivo) {
        window.open(arquivo.link, '_blank');
    } else {
        alert(`❌ Arquivo "${caminho}" não encontrado na pasta TeraBox.`);
    }
}

// ===== Carregar dados (agora a partir da variável global) =====
function carregarDados() {
    if (typeof dadosLivros !== 'undefined') {
        livros = dadosLivros;
    } else {
        console.warn('dadosLivros não encontrado. Usando array vazio.');
        livros = [];
    }
    resultadosFiltrados = [...livros];
    ordenarPor('numero');
    mostrarPagina('inicio');
}

// ===== Navegação =====
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

// ===== Página Início =====
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
        <p style="color:#666;">Use o menu ao lado para navegar.</p>
    `;
}

// ===== Página Biblioteca =====
function renderizarTabela() {
    const container = document.getElementById('biblioteca');
    container.innerHTML = `
        <h1>📖 Biblioteca</h1>
        <div class="search-bar">
            <input type="text" id="pesquisa" placeholder="Buscar por número, autor, instrumento, tipo ou título..." oninput="filtrarEBuscar()">
            <select id="filtroTipo" onchange="filtrarEBuscar()">
                <option value="todos">Todos</option>
                <option value="PDF">PDF</option>
                <option value="LIVRO">Livro</option>
                <option value="REVISTA">Revista</option>
                <option value="ARTIGO">Artigo</option>
                <option value="DISSERTAÇÃO">Dissertação</option>
                <option value="MONOGRAFIA">Monografia</option>
                <option value="FOLHETO">Folheto</option>
            </select>
            <select id="ordenar" onchange="alterarOrdenacao()">
                <option value="numero">Número</option>
                <option value="autor">Autor</option>
                <option value="titulo">Título</option>
                <option value="instrumento">Instrumento</option>
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
            const campos = [livro.numero, livro.autor, livro.instrumento, livro.tipo, livro.titulo];
            return campos.some(campo => campo.toLowerCase().includes(termo));
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
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
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
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;">Nenhum livro encontrado.</td></tr>';
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

// ===== Exportar TXT =====
function exportarTXT() {
    if (resultadosFiltrados.length === 0) {
        alert('Nenhum resultado para exportar.');
        return;
    }
    let texto = 'Número - Tipo - Instrumento - Autor - Título\n';
    resultadosFiltrados.forEach(l => {
        texto += `${l.numero} - ${l.tipo} - ${l.instrumento} - ${l.autor} - ${l.titulo}\n`;
    });
    const blob = new Blob([texto], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'exportacao_livros.txt';
    link.click();
    URL.revokeObjectURL(link.href);
}

// ===== Página Autores =====
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
        div.innerHTML = '<p>Nenhum livro encontrado.</p>';
        return;
    }
    let html = `<h3>Livros de ${autor} (${filtrados.length})</h3><div class="table-container"><table><thead><tr><th>Número</th><th>Tipo</th><th>Instrumento</th><th>Título</th><th>Ação</th></tr></thead><tbody>`;
    filtrados.forEach(l => {
        html += `<tr><td>${l.numero}</td><td>${l.tipo}</td><td>${l.instrumento}</td><td>${l.titulo}</td><td><button class="btn-pdf" onclick="abrirPDF('${l.arquivo}')">📄 Abrir</button></td></tr>`;
    });
    html += '</tbody></table></div>';
    div.innerHTML = html;
}

// ===== Página Instrumentos =====
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
        div.innerHTML = '<p>Nenhum livro encontrado.</p>';
        return;
    }
    let html = `<h3>Livros de ${instrumento} (${filtrados.length})</h3><div class="table-container"><table><thead><tr><th>Número</th><th>Tipo</th><th>Autor</th><th>Título</th><th>Ação</th></tr></thead><tbody>`;
    filtrados.forEach(l => {
        html += `<tr><td>${l.numero}</td><td>${l.tipo}</td><td>${l.autor}</td><td>${l.titulo}</td><td><button class="btn-pdf" onclick="abrirPDF('${l.arquivo}')">📄 Abrir</button></td></tr>`;
    });
    html += '</tbody></table></div>';
    div.innerHTML = html;
}

// ===== Página Estatísticas =====
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
        <h1>📊 Estatísticas</h1>
        <div class="card-grid">
            <div class="card"><h3>${total}</h3><p>Total de Livros</p></div>
            <div class="card"><h3>${autores.size}</h3><p>Total de Autores</p></div>
            <div class="card"><h3>${instrumentos.size}</h3><p>Total de Instrumentos</p></div>
            <div class="card"><h3>${tipos.size}</h3><p>Total de Tipos</p></div>
        </div>
        <div class="stat-grid">
            <div class="stat-card"><h4>🎸 Livros por Instrumento</h4><ul>${sortedInst.map(([inst, qtd]) => `<li><span>${inst}</span><span>${qtd}</span></li>`).join('')}</ul></div>
            <div class="stat-card"><h4>📂 Livros por Tipo</h4><ul>${sortedTip.map(([tipo, qtd]) => `<li><span>${tipo}</span><span>${qtd}</span></li>`).join('')}</ul></div>
            <div class="stat-card"><h4>🏆 Autores com mais livros (Top 10)</h4><ul>${sortedAut.map(([autor, qtd]) => `<li><span>${autor}</span><span>${qtd}</span></li>`).join('')}</ul></div>
        </div>
    `;
}

// ===== Inicialização =====
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
