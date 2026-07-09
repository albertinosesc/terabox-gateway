// ============================================================
// ===== SISTEMA DE EXPORTAÇÃO DE TRÊS FORMATOS =====
// ============================================================

// 1º FORMATO: Arquivo .json puro estruturado
function exportarJSONNativo() {
    if (livros.length === 0) {
        alert('❌ Nenhum livro para exportar.');
        return;
    }
    let json = '[\n';
    livros.forEach((livro, index) => {
        json += "  " + JSON.stringify(livro);
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
    alert(`📥 JSON Nativo (.json) exportado com ${livros.length} livros.`);
}

// 2º FORMATO: Arquivo .txt limpo separado por hífens
function exportarTXTPadrao() {
    if (livros.length === 0) {
        alert('❌ Nenhum livro para exportar.');
        return;
    }
    let texto = '';
    livros.forEach(l => {
        let contaLetra = '';
        if (l.conta && l.conta.startsWith('CONTA_')) {
            contaLetra = " - " + l.conta.replace('CONTA_', '');
        }
        texto += `${l.numero} - ${l.tipo} - ${l.instrumento} - ${l.autor} - ${l.titulo}${contaLetra}\n`;
    });

    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lista_livros_padrao.txt';
    link.click();
    URL.revokeObjectURL(link.href);
    alert(`📥 Lista TXT Padrão (.txt) exportada com ${livros.length} livros.`);
}

// 3º FORMATO: Arquivo .txt contendo a estrutura de texto em bloco JSON
function exportarTXTFormatoJson() {
    if (livros.length === 0) {
        alert('❌ Nenhum livro para exportar.');
        return;
    }
    let textoJson = '[\n';
    livros.forEach((livro, index) => {
        textoJson += "  " + JSON.stringify(livro);
        if (index < livros.length - 1) {
            textoJson += ',\n';
        } else {
            textoJson += '\n';
        }
    });
    textoJson += ']';

    const blob = new Blob([textoJson], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'backup_estrutura_json.txt';
    link.click();
    URL.revokeObjectURL(link.href);
    alert(`📥 Texto em formato JSON (.txt) exportado com ${livros.length} livros.`);
}

// ===== Outras funções administrativas mantidas =====
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

function resetarDados() {
    if (livros.length === 0) {
        if (!confirm('⚠️ A lista está vazia. Deseja recarregar os dados originais?')) return;
    } else {
        if (!confirm('⚠️ Isso vai recarregar os dados originais do arquivo dados.js.\nTodas as alterações não salvas serão perdidas.\nContinuar?')) return;
    }
    carregarDados();
    alert('✅ Dados recarregados do arquivo original.');
}

// ===== Inicialização Geral Atualizada com os 3 Eventos =====
document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    window.arquivoModificado = false;

    const txtNumero = document.getElementById('txtNumero');
    const txtArquivo = document.getElementById('txtArquivo');

    txtNumero.addEventListener('input', atualizarArquivoAutomatico);
    txtArquivo.addEventListener('input', () => {
        window.arquivoModificado = true;
    });

    document.getElementById('btnLimpar').addEventListener('click', () => {
        window.arquivoModificado = false;
        limparFormulario();
    });

    // Mapeamento dos botões salvadores e restauradores
    document.getElementById('btnSalvar').addEventListener('click', salvarLivro);
    document.getElementById('btnApagarTodos').addEventListener('click', apagarTodos);
    document.getElementById('btnResetar').addEventListener('click', resetarDados);
    document.getElementById('btnImportarLote').addEventListener('click', importarLote);
    
    // ATRIBUIÇÃO DOS EVENTOS AOS 3 NOVOS BOTÕES DE SAÍDA
    document.getElementById('btnExportarJSON').addEventListener('click', exportarJSONNativo);
    document.getElementById('btnExportarTXTPadrao').addEventListener('click', exportarTXTPadrao);
    document.getElementById('btnExportarTXTJson').addEventListener('click', exportarTXTFormatoJson);
    
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
});// admin.js - Gerenciador Otimizado com campo Conta e Relatórios Avançados

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
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">Nenhum livro cadastrado.</td></tr>';
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
                <td style="font-family: monospace; font-weight: bold; color: #2b6cb0;">${livro.conta || 'PADRAO'}</td>
                <td>
                    <button class="btn-edit" onclick="editarLivro(${idx})">✏️</button>
                    <button class="btn-delete" onclick="excluirLivro(${idx})">🗑️</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ===== Salvar (individual) =====
function salvarLivro() {
    const numero = document.getElementById('txtNumero').value.trim();
    const tipo = document.getElementById('txtTipo').value.trim();
    const instrumento = document.getElementById('txtInstrumento').value.trim();
    const autor = document.getElementById('txtAutor').value.trim();
    const titulo = document.getElementById('txtTitulo').value.trim();
    const letraConta = document.getElementById('txtLetraConta').value.trim().toUpperCase();
    const arquivo = document.getElementById('txtArquivo').value.trim() || `pdf/${numero}.pdf`;

    if (!numero || !tipo || !instrumento || !autor || !titulo) {
        alert('❌ Preencha todos os campos obrigatórios.');
        return;
    }

    const novoLivro = { numero, tipo, instrumento, autor, titulo, arquivo };

    if (letraConta) {
        novoLivro.conta = `CONTA_${letraConta}`;
    }

    if (indiceEditando === -1) {
        livros.push(novoLivro);
        alert(`✅ "${titulo}" adicionado com sucesso!`);
    } else {
        livros[indiceEditando] = novoLivro;
        alert(`✅ "${titulo}" atualizado com sucesso!`);
        indiceEditando = -1;
        document.getElementById('btnSalvar').textContent = '💾 Salvar';
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
    
    if (livro.conta && livro.conta.startsWith('CONTA_')) {
        document.getElementById('txtLetraConta').value = livro.conta.replace('CONTA_', '');
    } else {
        document.getElementById('txtLetraConta').value = '';
    }

    indiceEditando = idx;
    document.getElementById('btnSalvar').textContent = '🔄 Atualizar';
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
            document.getElementById('btnSalvar').textContent = '💾 Salvar';
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
    document.getElementById('txtLetraConta').value = '';
    document.getElementById('txtArquivo').value = '';
    indiceEditando = -1;
    document.getElementById('btnSalvar').textContent = '💾 Salvar';
    window.arquivoModificado = false;
}

// ============================================================
// ===== SISTEMA DE EXPORTAÇÃO DE TRÊS FORMATOS =====
// ============================================================

// 1º FORMATO: Arquivo .json puro estruturado
function exportarJSONNativo() {
    if (livros.length === 0) {
        alert('❌ Nenhum livro para exportar.');
        return;
    }
    let json = '[\n';
    livros.forEach((livro, index) => {
        json += "  " + JSON.stringify(livro);
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
    alert(`📥 JSON Nativo (.json) exportado com ${livros.length} livros.`);
}

// 2º FORMATO: Arquivo .txt limpo separado por hífens
function exportarTXTPadrao() {
    if (livros.length === 0) {
        alert('❌ Nenhum livro para exportar.');
        return;
    }
    let texto = '';
    livros.forEach(l => {
        let contaLetra = '';
        if (l.conta && l.conta.startsWith('CONTA_')) {
            contaLetra = " - " + l.conta.replace('CONTA_', '');
        }
        texto += `${l.numero} - ${l.tipo} - ${l.instrumento} - ${l.autor} - ${l.titulo}${contaLetra}\n`;
    });

    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lista_livros_padrao.txt';
    link.click();
    URL.revokeObjectURL(link.href);
    alert(`📥 Lista TXT Padrão (.txt) exportada com ${livros.length} livros.`);
}

// 3º FORMATO: Arquivo .txt contendo a estrutura de texto em bloco JSON
function exportarTXTFormatoJson() {
    if (livros.length === 0) {
        alert('❌ Nenhum livro para exportar.');
        return;
    }
    let textoJson = '[\n';
    livros.forEach((livro, index) => {
        textoJson += "  " + JSON.stringify(livro);
        if (index < livros.length - 1) {
            textoJson += ',\n';
        } else {
            textoJson += '\n';
        }
    });
    textoJson += ']';

    const blob = new Blob([textoJson], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'backup_estrutura_json.txt';
    link.click();
    URL.revokeObjectURL(link.href);
    alert(`📥 Texto em formato JSON (.txt) exportado com ${livros.length} livros.`);
}

// ===== Apagar todos e Resetar originais =====
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

// ===== Resetar para dados.js =====
function resetarDados() {
    if (livros.length === 0) {
        if (!confirm('⚠️ A lista está vazia. Deseja recarregar os dados originais?')) return;
    } else {
        if (!confirm('⚠️ Isso vai recarregar os dados originais do arquivo dados.js.\nTodas as alterações não salvas serão perdidas.\nContinuar?')) return;
    }
    carregarDados();
    alert('✅ Dados recarregados do arquivo original.');
}

// ===== Importação em lote com mapa visual coloridom =====
function importarLote() {
    const textarea = document.getElementById('txtLote');
    const feedback = document.getElementById('feedbackLote');
    const detalhesDiv = document.getElementById('detalhesImportacao');
    const linhas = textarea.value.split('\n').filter(line => line.trim() !== '');
    
    if (linhas.length === 0) {
        feedback.className = 'feedback error';
        feedback.textContent = '❌ Nenhuma linha para importar.';
        return;
    }

    let importados = [];
    let ignorados = [];
    let htmlFeedbackVisual = '<h4>🔍 Validação e Sinalização das Linhas:</h4>';

    linhas.forEach((linha) => {
        const linhaNormalizada = linha.replace(/[–—]/g, '-');
        const partes = linhaNormalizada.split(' - ').map(p => p.trim());
        
        if (partes.length >= 5) {
            const numero = partes[0];
            const tipo = partes[1];
            const instrumento = partes[2];
            const autor = partes[3];
            let titulo = partes[4];
            let letraConta = partes[5] ? partes[5].toUpperCase() : '';

            if (partes.length > 6) {
                letraConta = partes[partes.length - 1].toUpperCase();
                titulo = partes.slice(4, partes.length - 1).join(' - ');
            }

            const arquivo = `pdf/${numero}.pdf`;
            const existe = livros.some(l => l.numero === numero);

            if (!existe) {
                const itemLivro = { numero, tipo, instrumento, autor, titulo, arquivo };
                
                if (letraConta && letraConta.length <= 3) {
                    itemLivro.conta = `CONTA_${letraConta}`;
                }

                livros.push(itemLivro);
                importados.push(itemLivro);
                
                htmlFeedbackVisual += `<div class="linha-marcada sucesso">🔹 [OK] ${linha}</div>`;
            } else {
                const motivo = 'Número identificador (ID) já cadastrado no sistema';
                ignorados.push({ linha: linha, motivo: motivo });
                htmlFeedbackVisual += `<div class="linha-marcada erro">❌ [REJEITADO: ${motivo}] ${linha}</div>`;
            }
        } else {
            const motivo = 'Formato estrutural inválido (Mínimo de 5 campos divididos por " - ")';
            ignorados.push({ linha: linha, motivo: motivo });
            htmlFeedbackVisual += `<div class="linha-marcada erro">❌ [REJEITADO: ${motivo}] ${linha}</div>`;
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
        mensagem += `⚠️ ${ignorados.length} linha(s) ignorada(s).`;
    }

    feedback.className = 'feedback success';
    feedback.innerHTML = mensagem;

    detalhesDiv.innerHTML = htmlFeedbackVisual;
    detalhesDiv.style.display = 'block';

    document.getElementById('btnBaixarRelatorio').style.display = 'inline-block';
}

// ===== Baixar relatório de erros em TXT =====
function baixarRelatorio() {
    if (ultimoImportados.length === 0 && ultimoIgnorados.length === 0) {
        alert('ℹ️ Nenhuma importação recente para gerar relatório.');
        return;
    }
    let texto = '=========================================\n';
    texto += '   RELATÓRIO DE IMPORTAÇÃO DETALHADO\n';
    texto += '=========================================\n';
    texto += `Gerado em: ${new Date().toLocaleString()}\n\n`;

    texto += `📊 RESUMO DE EXECUÇÃO:\n`;
    texto += `   - Importações bem-sucedidas: ${ultimoImportados.length}\n`;
    texto += `   - Registros rejeitados/ignorados: ${ultimoIgnorados.length}\n`;
    texto += `   - Total de linhas processadas: ${ultimoImportados.length + ultimoIgnorados.length}\n\n`;

    texto += '-----------------------------------------\n';
    texto += `⚠️ LINHAS DETALHADAS QUE FORAM REJEITADAS (${ultimoIgnorados.length})\n`;
    texto += '-----------------------------------------\n';
    if (ultimoIgnorados.length === 0) {
        texto += 'Nenhum erro ou arquivo rejeitado nesta rodada.\n';
    } else {
        ultimoIgnorados.forEach((item, idx) => {
            texto += `[OCORRÊNCIA REJEITADA #${idx + 1}]\n`;
            texto += `Linha enviada: ${item.linha}\n`;
            texto += `Motivo do descarte: ${item.motivo}\n`;
            texto += `-----------------------------------------\n`;
        });
    }
    texto += '\n';

    texto += '-----------------------------------------\n';
    texto += `📥 ARQUIVOS INSERIDOS COM SUCESSO (${ultimoImportados.length})\n`;
    texto += '-----------------------------------------\n';
    ultimoImportados.forEach(l => {
        texto += `Nº: ${l.numero} | Tipo: ${l.tipo} | Instrumento: ${l.instrumento} | Autor: ${l.autor} | Título: ${l.titulo} | Conta: ${l.conta || 'PADRAO'}\n`;
    });

    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'relatorio_importacao_detalhado.txt';
    link.click();
    URL.revokeObjectURL(link.href);
    alert('📄 Relatório completo gravado e baixado como TXT.');
}

// ===== ATUALIZAÇÃO AUTOMÁTICA DO CAMPO ARQUIVO =====
function atualizarArquivoAutomatico() {
    const numero = document.getElementById('txtNumero').value.trim();
    const arquivoInput = document.getElementById('txtArquivo');
    if (!window.arquivoModificado) {
        arquivoInput.value = numero ? `pdf/${numero}.pdf` : '';
    }
}

// ===== Inicialização Geral =====
document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    window.arquivoModificado = false;

    const txtNumero = document.getElementById('txtNumero');
    const txtArquivo = document.getElementById('txtArquivo');

    txtNumero.addEventListener('input', atualizarArquivoAutomatico);
    txtArquivo.addEventListener('input', () => {
        window.arquivoModificado = true;
    });

    document.getElementById('btnLimpar').addEventListener('click', () => {
        window.arquivoModificado = false;
        limparFormulario();
    });

    document.getElementById('btnSalvar').addEventListener('click', salvarLivro);
    document.getElementById('btnApagarTodos').addEventListener('click', apagarTodos);
    document.getElementById('btnResetar').addEventListener('click', resetarDados);
    document.getElementById('btnImportarLote').addEventListener('click', importarLote);
    
    // Vinculação dos 3 novos botões de saída
    document.getElementById('btnExportarJSON').addEventListener('click', exportarJSONNativo);
    document.getElementById('btnExportarTXTPadrao').addEventListener('click', exportarTXTPadrao);
    document.getElementById('btnExportarTXTJson').addEventListener('click', exportarTXTFormatoJson);
    
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
