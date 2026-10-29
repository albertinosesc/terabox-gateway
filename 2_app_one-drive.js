// app.js - Versão Otimizada com Busca Direta no OneDrive e Blocos de 500 (Sesc Bahia)

let livros = [];
let resultadosFiltrados = [];
let ordenacao = { campo: 'numero', direcao: 'asc' };
let autorSelecionado = null;
let instrumentoSelecionado = null;

// ============================================================
// CONFIGURAÇÃO DO ONEDRIVE
// ============================================================
const LINK_PASTA_ONEDRIVE = "https://sescba-my.sharepoint.com/personal/ba7918_sescbahia_com_br/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fba7918%5Fsescbahia%5Fcom%5Fbr%2FDocuments%2FNBM%2Fpdf&ga=1";

// ===== Função auxiliar para calcular o nome da pasta em blocos de 500 =====
function obterPastaFaixa(numero) {
    const num = parseInt(numero, 10);
    if (isNaN(num)) return '1-500'; // Fallback padrão

    const tamanhoBloco = 500;
    const inicio = Math.floor((num - 1) / tamanhoBloco) * tamanhoBloco + 1;
    const fim = inicio + tamanhoBloco - 1;

    return `${inicio}-${fim}`;
}

// ===== Abrir PDF direcionando para a subpasta correta no OneDrive Sesc =====
function abrirPDF(caminho) {
    if (caminho.startsWith('http://') || caminho.startsWith('https://')) {
        window.open(caminho, '_blank');
        return;
    }

    // 1. Extrai apenas o nome do arquivo (ex: "pdf/002.pdf" ou "002.pdf" vira "002.pdf")
    const nomeArquivo = caminho.split('/').pop();

    // 2. Descobre a subpasta correspondente baseada no número (ex: "1-500", "501-1000")
    const numeroApenas = nomeArquivo.replace(/\D/g, ''); 
    const subpasta = obterPastaFaixa(numeroApenas);

    // 3. Caminho base da pasta no seu OneDrive institucional
    const caminhoBase = '%2Fpersonal%2Fba7918%5Fsescbahia%5Fcom%5Fbr%2FDocuments%2FNBM%2Fpdf';
    
    // 4. Monta o ID exato apontando para dentro da subpasta e do arquivo
    const caminhoPastaSub = `${caminhoBase}%2F${encodeURIComponent(subpasta)}`;
    const idCompletoArquivo = `${caminhoPastaSub}%2F${encodeURIComponent(nomeArquivo)}`;

    // 5. URL estruturada do OneDrive corporativo para forçar a abertura correta
    const urlDiretaOneDrive = `https://sescba-my.sharepoint.com/personal/ba7918_sescbahia_com_br/_layouts/15/onedrive.aspx?id=${idCompletoArquivo}&parent=${caminhoPastaSub}&ga=1`;

    window.open(urlDiretaOneDrive, '_blank');
}

// ===== Carregar dados (a partir da variável global dados.js) =====
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

// ===== Navegação SPA =====
function mostrarPagina(pagina) {
    document.querySelectorAll('.pagina').forEach(el => el.style.display = 'none');
    const elPagina = document.getElementById(pagina);
    if (elPagina) elPagina.style.display = 'block';

    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    const linkSidebar = document.querySelector(`.sidebar a[data-pagina="${pagina}"]`);
    if (linkSidebar) linkSidebar.classList.add('active');

    if (pagina === 'biblioteca') renderizarTabela();
    else if (pagina === 'autores') renderizarAutores();
    else if (pagina === 'instrumentos') renderizarInstrumentos();
    else if (pagina === 'estatisticas') renderizarEstatisticas();
    else if (pagina === 'auditoria') renderizarAuditoria();
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
        <p style="color:#666; margin-top:20px;">Use o menu ao lado para navegar e pesquisar partituras.</p>
    `;
}

// ===== Página Biblioteca =====
function renderizarTabela() {
    const container = document.getElementById('biblioteca');
    if (!container) return;

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
            return campos.some(campo => campo && String(campo).toLowerCase().includes(termo));
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
            <td><button class="btn-pdf" onclick="abrirPDF('${livro.arquivo}')">📄 Abrir no OneDrive</button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function alterarOrdenacao() {
    filtrarEBuscar();
}

function exportarTXT() {
    if (resultadosFiltrados.length === 0) {
        alert('Nenhum resultado para exportar.');
        return;
    }
    let texto = 'Número - Tipo - Instrumento - Autor - Título\n';
    resultadosFiltrados.forEach(l => {
        texto += `${l.numero} - ${l.tipo} - ${l.instrumento} - ${l.autor} - ${l.titulo}\n`;
    });
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'exportacao_livros.txt';
    link.click();
    URL.revokeObjectURL(link.href);
}

// ===== Página Autores =====
function renderizarAutores() {
    const container = document.getElementById('autores');
    if (!container) return;

    const mapa = new Map();
    livros.forEach(l => mapa.set(l.autor, (mapa.get(l.autor) || 0) + 1));
    const lista = Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    let html = '<h1>✍️ Autores</h1>';
    html += '<div class="planilha-grid">';
    lista.forEach(([autor, qtd]) => {
        html += `<span class="list-item" onclick="filtrarPorAutor('${autor.replace(/'/g, "\\'")}')"><span>${autor}</span> <small>(${qtd})</small></span>`;
    });
    html += '</div>';
    html += '<div id="livrosPorAutor" style="margin-top: 30px; width: 100%;"></div>';
    
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
    if (!container) return;

    const mapa = new Map();
    livros.forEach(l => mapa.set(l.instrumento, (mapa.get(l.instrumento) || 0) + 1));
    const lista = Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    let html = '<h1>🎸 Instrumentos</h1>';
    html += '<div class="planilha-grid">';
    lista.forEach(([inst, qtd]) => {
        html += `<span class="list-item" onclick="filtrarPorInstrumento('${inst.replace(/'/g, "\\'")}')"><span>${inst}</span> <small>(${qtd})</small></span>`;
    });
    html += '</div>';
    html += '<div id="livrosPorInstrumento" style="margin-top: 30px; width: 100%;"></div>';
    
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
    if (!container) return;

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

// ============================================================
// PÁGINA DE AUDITORIA DE FALTANTES POR FAIXA (Blocos de 500)
// ============================================================
function renderizarAuditoria() {
    const container = document.getElementById('auditoria');
    if (!container) return;
    
  // Define as faixas de 500 em 500 até 10.000
    const faixas = [
        { nome: "Pasta 1 - 500", inicio: 1, fim: 500 },
        { nome: "Pasta 501 - 1000", inicio: 501, fim: 1000 },
        { nome: "Pasta 1001 - 1500", inicio: 1001, fim: 1500 },
        { nome: "Pasta 1501 - 2000", inicio: 1501, fim: 2000 },
        { nome: "Pasta 2001 - 2500", inicio: 2001, fim: 2500 },
        { nome: "Pasta 2501 - 3000", inicio: 2501, fim: 3000 },
        { nome: "Pasta 3001 - 3500", inicio: 3001, fim: 3500 },
        { nome: "Pasta 3501 - 4000", inicio: 3501, fim: 4000 },
        { nome: "Pasta 4001 - 4500", inicio: 4001, fim: 4500 },
        { nome: "Pasta 4501 - 5000", inicio: 4501, fim: 5000 },
        { nome: "Pasta 5001 - 5500", inicio: 5001, fim: 5500 },
        { nome: "Pasta 5501 - 6000", inicio: 5501, fim: 6000 },
        { nome: "Pasta 6001 - 6500", inicio: 6001, fim: 6500 },
        { nome: "Pasta 6501 - 7000", inicio: 6501, fim: 7000 },
        { nome: "Pasta 7001 - 7500", inicio: 7001, fim: 7500 },
        { nome: "Pasta 7501 - 8000", inicio: 7501, fim: 8000 },
        { nome: "Pasta 8001 - 8500", inicio: 8001, fim: 8500 },
        { nome: "Pasta 8501 - 9000", inicio: 8501, fim: 9000 },
        { nome: "Pasta 9001 - 9500", inicio: 9001, fim: 9500 },
        { nome: "Pasta 9501 - 10000", inicio: 9501, fim: 10000 }
    ];

    let html = `
        <h1>🔍 Auditoria de Arquivos Faltantes (Blocos de 500)</h1>
        <p style="color:#666; margin-bottom:20px;">Clique em uma faixa para verificar quais números do intervalo ainda não foram cadastrados.</p>
        <div class="card-grid">
    `;

    faixas.forEach((f) => {
        const cadastradosNaFaixa = livros.filter(l => {
            const num = parseInt(l.numero, 10);
            return num >= f.inicio && num <= f.fim;
        }).length;

        const totalEsperado = (f.fim - f.inicio) + 1;
        const faltantes = totalEsperado - cadastradosNaFaixa;

        html += `
            <div class="card" style="cursor:pointer;" onclick="verificarFaltantes(${f.inicio}, ${f.fim}, '${f.nome}')">
                <h3>📁 ${f.nome}</h3>
                <p>Cadastrados: <strong>${cadastradosNaFaixa}</strong> / ${totalEsperado}</p>
                <p style="color: ${faltantes > 0 ? '#d9534f' : '#5cb85c'}; font-weight:bold; margin-top:5px;">
                    Faltando: ${faltantes} números
                </p>
            </div>
        `;
    });

    html += `</div><div id="resultadoAuditoria" style="margin-top: 30px; width: 100%;"></div>`;
    container.innerHTML = html;
}

function verificarFaltantes(inicio, fim, nomeFaixa) {
    const divResultado = document.getElementById('resultadoAuditoria');
    if (!divResultado) return;

    const numerosCadastrados = new Set(livros.map(l => parseInt(l.numero, 10)));

    let ausentes = [];
    for (let i = inicio; i <= fim; i++) {
        if (!numerosCadastrados.has(i)) {
            ausentes.push(i);
        }
    }

    if (ausentes.length === 0) {
        divResultado.innerHTML = `<h3>Faixa: ${nomeFaixa}</h3><p style="color:green; font-weight:bold; padding:15px;">Parabéns! Nenhum número está faltando nesta faixa.</p>`;
        return;
    }

    let listaHtml = ausentes.map(n => `<span style="background:#f0f0f0; padding:5px 10px; margin:3px; display:inline-block; border-radius:4px; font-family:monospace;">${String(n).padStart(3, '0')}</span>`).join(' ');

    divResultado.innerHTML = `
        <div style="background:#fff; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
            <h3>📊 Relatório de Faltantes - Faixa: ${nomeFaixa}</h3>
            <p style="margin: 10px 0;">Total de números ausentes: <strong>${ausentes.length}</strong></p>
            <div style="max-height: 250px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; background:#fafafa;">
                ${listaHtml}
            </div>
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
