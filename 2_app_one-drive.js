let livros = [];
let resultadosFiltrados = [];
let ordenacao = { campo: 'numero', direcao: 'asc' };
let autorSelecionado = null;
let instrumentoSelecionado = null;

// ============================================================
// CONFIGURAÇÃO DO ONEDRIVE
// ============================================================
const LINK_PASTA_ONEDRIVE = "https://sescba-my.sharepoint.com/personal/ba7918_sescbahia_com_br/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fba7918%5Fsescbahia%5Fcom%5Fbr%2FDocuments%2FNBM%2Fpdf&ga=1";

// ===== Função auxiliar para calcular o nome da pasta com base no número =====
function obterPastaFaixa(numero) {
    const num = parseInt(numero, 10);
    if (isNaN(num)) return '1-999'; // Fallback padrão

    const inicio = Math.floor(num / 1000) * 1000;
    const fim = inicio + 999;

    // Se estiver na faixa de 0 a 999, o nome da pasta no seu OneDrive é "1-999"
    if (inicio === 0) {
        return '1-999';
    }

    return `${inicio}-${fim}`;
}

// ===== Abrir PDF direcionando para a subpasta correta no OneDrive Sesc =====
function abrirPDF(caminho) {
    if (caminho.startsWith('http://') || caminho.startsWith('https://')) {
        window.open(caminho, '_blank');
        return;
    }

    // 1. Extrai apenas o nome do arquivo (ex: "pdf/2.pdf" ou "2.pdf" vira "2.pdf")
    const nomeArquivo = caminho.split('/').pop();

    // 2. Descobre a subpasta correspondente (ex: "1-999", "1000-1999")
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
    document.getElementById(pagina).style.display = 'block';
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    document.querySelector(`.sidebar a[data-pagina="${pagina}"]`)?.classList.add('active');

    if (pagina === 'biblioteca') renderizarTabela();
    else if (pagina === 'autores') renderizarAutores();
    else if (pagina === 'instrumentos') renderizarInstrumentos();
    else if (pagina === 'estatisticas') renderizarEstatisticas();
    else if (pagina === 'auditoria') renderizarAuditoria(); // <--- Adicionado aqui!
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


// ============================================================
// PÁGINA DE AUDITORIA DE FALTANTES POR FAIXA
// ============================================================

function renderizarAuditoria() {
    const container = document.getElementById('auditoria');
    
    // Define as faixas de milhar que você utiliza
    const faixas = [
        { nome: "0001 - 0999 (Pasta 1-999)", inicio: 1, fim: 999 },
        { nome: "1000 - 1999", inicio: 1000, fim: 1999 },
        { nome: "2000 - 2999", inicio: 2000, fim: 2999 },
        { nome: "3000 - 3999", inicio: 3000, fim: 3999 },
        { nome: "4000 - 4999", inicio: 4000, fim: 4999 },
        { nome: "5000 - 5999", inicio: 5000, fim: 5999 },
        { nome: "6000 - 6999", inicio: 6000, fim: 6999 },
        { nome: "7000 - 7999", inicio: 7000, fim: 7999 },
        { nome: "8000 - 8999", inicio: 8000, fim: 8999 },
        { nome: "9000 - 9999", inicio: 9000, fim: 9999 }
    ];

    let html = `
        <h1>🔍 Auditoria de Arquivos Faltantes</h1>
        <p style="color:#666; margin-bottom:20px;">Clique em uma faixa para verificar quais números do intervalo ainda não foram cadastrados.</p>
        <div class="card-grid">
    `;

    faixas.forEach((f, index) => {
        // Conta quantos livros cadastrados existem nessa faixa
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

    // 1. Cria um conjunto (Set) com todos os números já cadastrados
    const numerosCadastrados = new Set(livros.map(l => parseInt(l.numero, 10)));

    // 2. Varre o intervalo e descobre quais estão faltando
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

    // Formata os números faltantes com zeros à esquerda (ex: 002, 015)
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
