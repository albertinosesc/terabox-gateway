// ===== Variáveis =====
let livros = [];
let indiceEditando = -1;
let ultimoImportados = [];
let ultimoIgnorados = [];

// ===== Carregar dados do dados.js (global) =====
function carregarDados() {
    if (typeof dadosLivros !== 'undefined') {
        livros = JSON.parse(JSON.stringify(dadosLivros));
        console.log(`Admin carregou ${livros.length} livros do dados.js`);
    } else {
        console.warn('dadosLivros não encontrado. Usando array vazio.');
        livros = [];
    }
    renderizarTabelaAdmin();
}

// ===== Renderizar tabela =====
function renderizarTabelaAdmin() {
    const tbody = document.getElementById('tabelaAdmin');
    if (!tbody) return;
    if (livros.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Nenhum livro cadastrado.</td></tr>';
        return;
    }
    let html = '';
    livros.forEach((livro, idx) => {
        html += `
            <tr>
                <td>${livro.numero}</td>
                <td>${livro.tipo}</td>
                <td>${livro.instrumento}</td>
                <td>${livro.autor}</td>
                <td>${livro.titulo}</td>
                <td>
                    <button class="btn-edit" onclick="editarLivro(${idx})">✏️</button>
                    <button class="btn-delete" onclick="excluirLivro(${idx})">🗑️</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ===== Salvar (individual) – UM ALERTA =====
function salvarLivro() {
    const numero = document.getElementById('txtNumero').value.trim();
    const tipo = document.getElementById('txtTipo').value.trim();
    const instrumento = document.getElementById('txtInstrumento').value.trim();
    const autor = document.getElementById('txtAutor').value.trim();
    const titulo = document.getElementById('txtTitulo').value.trim();
    const arquivo = document.getElementById('txtArquivo').value.trim() || `pdf/${numero}.pdf`;

    if (!numero || !tipo || !instrumento || !autor || !titulo) {
        alert('❌ Preencha todos os campos obrigatórios.');
        return;
    }

    const novoLivro = { numero, tipo, instrumento, autor, titulo, arquivo };

    if (indiceEditando === -1) {
        livros.push(novoLivro);
        alert(`✅ "${titulo}" adicionado com sucesso!`);
    } else {
        livros[indiceEditando] = novoLivro;
        alert(`✅ "${titulo}" atualizado com sucesso!`);
        indiceEditando = -1;
        document.getElementById('btnSalvar').textContent = 'Salvar';
    }

    renderizarTabelaAdmin();
    limparFormulario();
}

// ===== Editar =====
function editarLivro(idx) {
    const livro = livros[idx];
    document.getElementById('txtNumero').value = livro.numero;
    document.getElementById('txtTipo').value = livro.tipo;
    document.getElementById('txtInstrumento').value = livro.instrumento;
    document.getElementById('txtAutor').value = livro.autor;
    document.getElementById('txtTitulo').value = livro.titulo;
    document.getElementById('txtArquivo').value = livro.arquivo;
    indiceEditando = idx;
    document.getElementById('btnSalvar').textContent = 'Atualizar';
    
    // Marca que o arquivo foi modificado manualmente (para não sobrescrever)
    window.arquivoModificado = true;
}

// ===== Excluir um livro =====
function excluirLivro(idx) {
    const titulo = livros[idx].titulo;
    if (confirm(`⚠️ Tem certeza que deseja excluir "${titulo}"?`)) {
        livros.splice(idx, 1);
        alert(`🗑️ "${titulo}" excluído.`);
        renderizarTabelaAdmin();
        if (indiceEditando === idx) {
            limparFormulario();
            indiceEditando = -1;
            document.getElementById('btnSalvar').textContent = 'Salvar';
        }
    }
}

// ===== Limpar formulário =====
function limparFormulario() {
    document.getElementById('txtNumero').value = '';
    document.getElementById('txtTipo').value = '';
    document.getElementById('txtInstrumento').value = '';
    document.getElementById('txtAutor').value = '';
    document.getElementById('txtTitulo').value = '';
    document.getElementById('txtArquivo').value = '';
    indiceEditando = -1;
    document.getElementById('btnSalvar').textContent = 'Salvar';
    window.arquivoModificado = false; // Reseta o flag
}

// ===== EXPORTAR JSON =====
function exportarJSON() {
    if (livros.length === 0) {
        alert('❌ Nenhum livro para exportar.');
        return;
    }
    let json = '[\n';
    livros.forEach((livro, index) => {
        json += JSON.stringify(livro);
        if (index < livros.length - 1) {
            json += ',\n';
        } else {
            json += '\n';
        }
    });
    json += ']';
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'livros.json';
    link.click();
    URL.revokeObjectURL(link.href);
    alert(`📥 JSON exportado com ${livros.length} livros.`);
}

// ===== APAGAR TODOS =====
function apagarTodos() {
    if (livros.length === 0) {
        alert('ℹ️ A lista já está vazia.');
        return;
    }
    if (confirm(`⚠️ Tem certeza que deseja EXCLUIR TODOS os ${livros.length} livros?\nEsta ação não pode ser desfeita.`)) {
        livros = [];
        renderizarTabelaAdmin();
        alert('🗑️ Todos os livros foram removidos da lista.');
    }
}

// ===== RESETAR DADOS =====
function resetarDados() {
    if (livros.length === 0) {
        if (!confirm('⚠️ A lista está vazia. Deseja recarregar os dados originais?')) return;
    } else {
        if (!confirm('⚠️ Isso vai recarregar os dados originais do arquivo dados.js.\nTodas as alterações não salvas serão perdidas.\nContinuar?')) return;
    }
    carregarDados();
    alert('✅ Dados recarregados do arquivo original.');
}

// ===== Importação em lote =====
function importarLote() {
    const textarea = document.getElementById('txtLote');
    const feedback = document.getElementById('feedbackLote');
    const linhas = textarea.value.split('\n').filter(line => line.trim() !== '');
    
    if (linhas.length === 0) {
        feedback.className = 'feedback error';
        feedback.textContent = '❌ Nenhuma linha para importar.';
        return;
    }

    let importados = [];
    let ignorados = [];

    linhas.forEach((linha, index) => {
        const linhaNormalizada = linha.replace(/[–—]/g, '-');
        const partes = linhaNormalizada.split(' - ').map(p => p.trim());
        if (partes.length >= 5) {
            const [numero, tipo, instrumento, autor, ...resto] = partes;
            const titulo = resto.join(' - ');
            const arquivo = `pdf/${numero}.pdf`;

            const existe = livros.some(l => l.numero === numero);
            if (!existe) {
                livros.push({ numero, tipo, instrumento, autor, titulo, arquivo });
                importados.push({ numero, tipo, instrumento, autor, titulo, arquivo });
            } else {
                ignorados.push({ linha: linha, motivo: 'Número já existe' });
            }
        } else {
            ignorados.push({ linha: linha, motivo: 'Formato inválido' });
        }
    });

    ultimoImportados = importados;
    ultimoIgnorados = ignorados;

    renderizarTabelaAdmin();

    let mensagem = '';
    if (importados.length > 0) {
        mensagem += `✅ ${importados.length} livro(s) importado(s). `;
    }
    if (ignorados.length > 0) {
        mensagem += `⚠️ ${ignorados.length} linha(s) ignoradas.`;
    }
    if (importados.length === 0 && ignorados.length === 0) {
        mensagem = 'Nenhuma alteração.';
    }

    feedback.className = 'feedback success';
    feedback.innerHTML = mensagem;

    const detalhesDiv = document.getElementById('detalhesImportacao');
    if (ignorados.length > 0) {
        let html = '<h4>Linhas ignoradas:</h4><ul>';
        ignorados.forEach(item => {
            html += `<li><strong>${item.linha}</strong> — ${item.motivo}</li>`;
        });
        html += '</ul>';
        detalhesDiv.innerHTML = html;
        detalhesDiv.style.display = 'block';
    } else {
        detalhesDiv.innerHTML = '';
        detalhesDiv.style.display = 'none';
    }

    document.getElementById('btnBaixarRelatorio').style.display = 'inline-block';
}

// ===== Baixar relatório em TXT =====
function baixarRelatorio() {
    if (ultimoImportados.length === 0 && ultimoIgnorados.length === 0) {
        alert('ℹ️ Nenhuma importação recente para gerar relatório.');
        return;
    }
    let texto = '=== RELATÓRIO DE IMPORTAÇÃO ===\n\n';
    texto += `Data: ${new Date().toLocaleString()}\n\n`;

    if (ultimoImportados.length > 0) {
        texto += `📥 LIVROS IMPORTADOS (${ultimoImportados.length}):\n`;
        texto += 'Número - Tipo - Instrumento - Autor - Título\n';
        ultimoImportados.forEach(l => {
            texto += `${l.numero} - ${l.tipo} - ${l.instrumento} - ${l.autor} - ${l.titulo}\n`;
        });
        texto += '\n';
    }

    if (ultimoIgnorados.length > 0) {
        texto += `⚠️ LINHAS IGNORADAS (${ultimoIgnorados.length}):\n`;
        ultimoIgnorados.forEach(item => {
            texto += `- ${item.linha} (Motivo: ${item.motivo})\n`;
        });
        texto += '\n';
    }

    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'relatorio_importacao.txt';
    link.click();
    URL.revokeObjectURL(link.href);
    alert('📄 Relatório baixado com sucesso.');
}

// ===== ATUALIZAÇÃO AUTOMÁTICA DO CAMPO ARQUIVO =====
function atualizarArquivoAutomatico() {
    const numero = document.getElementById('txtNumero').value.trim();
    const arquivoInput = document.getElementById('txtArquivo');
    // Só atualiza se o usuário ainda não tiver modificado manualmente
    if (!window.arquivoModificado) {
        arquivoInput.value = numero ? `pdf/${numero}.pdf` : '';
    }
}

// ===== Inicialização =====
document.addEventListener('DOMContentLoaded', () => {
    carregarDados();

    // Inicializa o flag de controle
    window.arquivoModificado = false;

    // Campos do formulário
    const txtNumero = document.getElementById('txtNumero');
    const txtArquivo = document.getElementById('txtArquivo');

    // Quando digitar no número, atualiza o arquivo automaticamente (se não modificado)
    txtNumero.addEventListener('input', atualizarArquivoAutomatico);

    // Quando o usuário digitar no campo arquivo, marca como modificado
    txtArquivo.addEventListener('input', () => {
        window.arquivoModificado = true;
    });

    // Quando limpar o formulário, reseta o flag
    document.getElementById('btnLimpar').addEventListener('click', () => {
        window.arquivoModificado = false;
        limparFormulario();
    });

    // Botões
    document.getElementById('btnSalvar').addEventListener('click', salvarLivro);
    document.getElementById('btnExportar').addEventListener('click', exportarJSON);
    document.getElementById('btnApagarTodos').addEventListener('click', apagarTodos);
    document.getElementById('btnResetar').addEventListener('click', resetarDados);
    document.getElementById('btnImportarLote').addEventListener('click', importarLote);
    document.getElementById('btnLimparLote').addEventListener('click', () => {
        document.getElementById('txtLote').value = '';
        document.getElementById('feedbackLote').className = 'feedback';
        document.getElementById('feedbackLote').textContent = '';
        document.getElementById('detalhesImportacao').innerHTML = '';
        document.getElementById('detalhesImportacao').style.display = 'none';
        document.getElementById('btnBaixarRelatorio').style.display = 'none';
        ultimoImportados = [];
        ultimoIgnorados = [];
    });
    document.getElementById('btnBaixarRelatorio').addEventListener('click', baixarRelatorio);
});