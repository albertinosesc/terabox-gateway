// admin.js - Gerenciador Avançado com Destaque no Campo e Três Exportações

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
        document.getElementById('btnSalvar').textContent = '💾 Salvar Individual';
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
            document.getElementById('btnSalvar').textContent = '💾 Salvar Individual';
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
    document.getElementById('btnSalvar').textContent = '💾 Salvar Individual';
    window.arquivoModificado = false;
}

// ============================================================
// ===== VALIDAÇÃO E SINALIZAÇÃO NO PRÓPRIO CAMPO (DIV) =====
// ============================================================

function validarLoteNoCampo() {
    const campo = document.getElementById('txtLote');
    const feedback = document.getElementById('feedbackLote');
    
    // Obtém o texto bruto digitado ou colado de forma limpa
    const textoPuro = campo.innerText || campo.textContent;
    const linhas = textoPuro.split('\n').filter(line => line.trim() !== '');
    
    if (linhas.length === 0) {
        feedback.className = 'feedback error';
        feedback.textContent = '❌ Nenhuma linha para validar.';
        return;
    }

    let novoConteudoHTML = "";
    let contagemErros = 0;

    linhas.forEach((linha) => {
        // Remove rótulos visuais de validações anteriores se houver
        const linhaLimpa = linha.replace(/❌ \[REJEITADO.*?\]\s*/g, "").replace(/🔹 \[OK\]\s*/g, "").trim();
        if (!linhaLimpa) return;

        const linhaNormalizada = linhaLimpa.replace(/[–—]/g, '-');
        const partes = linhaNormalizada.split(' - ').map(p => p.trim());
        
        if (partes.length >= 5) {
            const numero = partes[0];
            const existe = livros.some(l => l.numero === numero);

            if (!existe) {
                // Linha Correta -> Destaque Verde Seguro
                novoConteudoHTML += `<div style="background: #e2f0d9; color: #385723; padding: 4px 8px; margin: 3px 0; border-radius: 4px; font-family: monospace;">🔹 [OK] ${linhaLimpa}</div>`;
            } else {
                // Linha com ID Duplicado -> Destaque Vermelho/Laranja
                contagemErros++;
                novoConteudoHTML += `<div style="background: #fce4d6; color: #c65911; padding: 4px 8px; margin: 3px 0; border-radius: 4px; font-family: monospace;">❌ [REJEITADO: ID Já Existe] ${linhaLimpa}</div>`;
            }
        } else {
            // Linha sem os 5 campos -> Destaque Amarelo Alerta
            contagemErros++;
            novoConteudoHTML += `<div style="background: #fff2cc; color: #b25900; padding: 4px 8px; margin: 3px 0; border-radius: 4px; font-family: monospace;">❌ [REJEITADO: Estrutura Incompleta] ${linhaLimpa}</div>`;
        }
    });

    campo.innerHTML = novoConteudoHTML;
    feedback.className = contagemErros > 0 ? 'feedback error' : 'feedback success';
    feedback.textContent = contagemErros > 0 ? `⚠️ Análise concluída: detectadas ${contagemErros} falhas. Corrija-as diretamente no campo acima antes de importar.` : `✅ Tudo pronto! Todas as linhas estão corretas para a inclusão.`;
}

// ===== IMPORTAÇÃO DO LOTE =====
function importarLote() {
    const campo = document.getElementById('txtLote');
    const feedback = document.getElementById('feedbackLote');
    
    const textoPuro = campo.innerText || campo.textContent;
    const linhas = textoPuro.split('\n').filter(line => line.trim() !== '');
    
    if (linhas.length === 0) {
        feedback.className = 'feedback error';
        feedback.textContent = '❌ Insira registros ou execute a validação primeiro.';
        return;
    }

    let importados = [];
    let ignorados = [];

    linhas.forEach((linha) => {
        const linhaLimpa = linha.replace(/❌ \[REJEITADO.*?\]\s*/g, "").replace(/🔹 \[OK\]\s*/g, "").trim();
        if (!linhaLimpa) return;

        const linhaNormalizada = linhaLimpa.replace(/[–—]/g, '-');
        const partes = linhaNormalizada.split(' - ').map(p => p.trim());
        
        if (partes.length >= 5) {
            const numero = partes[0];
            const tipo = partes[1];
            const instrumento = partes[2];
            const autor = partes[3];
            let titulo = partes[4];
            let letraConta = partes[5] ? partes[5].toUpperCase() : '';

            if (partes.length > 6) {
                letraConta =             partes[partes.length - 1].toUpperCase();
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
            } else {
                ignorados.push({ linha: linhaLimpa, motivo: 'O ID numérico já existe na planilha' });
            }
        } else {
            ignorados.push({ linha: linhaLimpa, motivo: 'Número de campos insuficiente (mínimo de 5 hífens esperados)' });
        }
    });

    ultimoImportados = importados;
    ultimoIgnorados = ignorados;

    renderizarTabelaAdmin();

    feedback.className = 'feedback success';
    feedback.innerHTML = `✅ Operação finalizada! ${importados.length} livros adicionados. ${ignorados.length} linhas ignoradas.`;
    document.getElementById('btnBaixarRelatorio').style.display = 'inline-block';
}

// ===== GERAÇÃO DE RELATÓRIO TXT DE IMPORTAÇÃO =====
function baixarRelatorio() {
    if (ultimoImportados.length === 0 && ultimoIgnorados.length === 0) {
        alert('ℹ️ Nenhuma atividade de importação recente.');
        return;
    }
    let texto = '=========================================\n';
    texto += '     RELATÓRIO DE IMPORTAÇÃO DE LOTES\n';
    texto += '=========================================\n';
    texto += `Executado em: ${new Date().toLocaleString()}\n\n`;
    texto += `📊 RESUMO:\n`;
    texto += `   - Sucessos: ${ultimoImportados.length}\n`;
    texto += `   - Rejeitados/Ignorados: ${ultimoIgnorados.length}\n\n`;

    texto += '-----------------------------------------\n';
    texto += `⚠️ REGISTROS IGNORADOS E MOTIVOS (${ultimoIgnorados.length})\n`;
    texto += '-----------------------------------------\n';
    if (ultimoIgnorados.length === 0) {
        texto += 'Nenhum registro foi rejeitado.\n';
    } else {
        ultimoIgnorados.forEach((item, idx) => {
            texto += `Item Falho #${idx + 1}\n`;
            texto += `Linha: ${item.linha}\n`;
            texto += `Motivo: ${item.motivo}\n`;
            texto += '-----------------------------------------\n';
        });
    }
    texto += '\n-----------------------------------------\n';
    texto += `📥 REGISTROS IMPORTADOS COM SUCESSO (${ultimoImportados.length})\n`;
    texto += '-----------------------------------------\n';
    ultimoImportados.forEach(l => {
        texto += `${l.numero} - ${l.tipo} - ${l.instrumento} - ${l.autor} - ${l.titulo} - ${l.conta || 'PADRAO'}\n`;
    });

    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'relatorio_importacao_lote.txt';
    link.click();
    URL.revokeObjectURL(link.href);
}

// ============================================================
// ===== SISTEMA DE TRÊS FORMATOS DE SAÍDA SOLICITADOS =====
// ============================================================

// 1º FORMATO: Arquivo estruturado nativo (.json)
function exportarJSONNativo() {
    if (livros.length === 0) {
        alert('❌ Base de dados vazia.');
        return;
    }
    let json = '[\n';
    livros.forEach((livro, index) => {
        json += "  " + JSON.stringify(livro);
        if (index < livros.length - 1) json += ',\n';
        else json += '\n';
    });
    json += ']';
    
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'livros.json';
    link.click();
    URL.revokeObjectURL(link.href);
}

// 2º FORMATO: Listagem limpa com separadores por hífens (.txt)
function exportarTXTPadrao() {
    if (livros.length === 0) {
        alert('❌ Base de dados vazia.');
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
}

// 3º FORMATO: Estrutura JSON salva em arquivo de texto (.txt)
function exportarTXTFormatoJson() {
    if (livros.length === 0) {
        alert('❌ Base de dados vazia.');
        return;
    }
    let textoJson = '[\n';
    livros.forEach((livro, index) => {
        textoJson += "  " + JSON.stringify(livro);
        if (index < livros.length - 1) textoJson += ',\n';
        else textoJson += '\n';
    });
    textoJson += ']';

    const blob = new Blob([textoJson], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'backup_estrutura_json.txt';
    link.click();
    URL.revokeObjectURL(link.href);
}

// ===== Controle Global de Exclusões =====
function apagarTodos() {
    if (livros.length === 0) return;
    if (confirm(`⚠️ Tem certeza que deseja DELETAR todos os ${livros.length} livros cadastrados?`)) {
        livros = [];
        renderizarTabelaAdmin();
    }
}

function resetarDados() {
    if (confirm('⚠️ Deseja perder as alterações atuais e recarregar os dados do arquivo dados.js?')) {
        carregarDados();
    }
}

function atualizarArquivoAutomatico() {
    const numero = document.getElementById('txtNumero').value.trim();
    const arquivoInput = document.getElementById('txtArquivo');
    if (!window.arquivoModificado) {
        arquivoInput.value = numero ? `pdf/${numero}.pdf` : '';
    }
}

// ===== Inicialização e Eventos =====
document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    window.arquivoModificado = false;

    document.getElementById('txtNumero').addEventListener('input', atualizarArquivoAutomatico);
    document.getElementById('txtArquivo').addEventListener('input', () => { window.arquivoModificado = true; });
    
    document.getElementById('btnLimpar').addEventListener('click', () => {
        window.arquivoModificado = false;
        limparFormulario();
    });

    // Eventos de Inclusão e Lote
    document.getElementById('btnSalvar').addEventListener('click', salvarLivro);
    document.getElementById('btnValidarLote').addEventListener('click', validarLoteNoCampo);
    document.getElementById('btnImportarLote').addEventListener('click', importarLote);
    document.getElementById('btnBaixarRelatorio').addEventListener('click', baixarRelatorio);
    
    document.getElementById('btnLimparLote').addEventListener('click', () => {
        document.getElementById('txtLote').innerHTML = '';
        document.getElementById('feedbackLote').className = 'feedback';
        document.getElementById('feedbackLote').textContent = '';
        document.getElementById('btnBaixarRelatorio').style.display = 'none';
        ultimoImportados = [];
        ultimoIgnorados = [];
    });

    // Eventos de Exportações Tríplices e Manutenção
    document.getElementById('btnExportarJSON').addEventListener('click', exportarJSONNativo);
    document.getElementById('btnExportarTXTPadrao').addEventListener('click', exportarTXTPadrao);
    document.getElementById('btnExportarTXTJson').addEventListener('click', exportarTXTFormatoJson);
    document.getElementById('btnApagarTodos').addEventListener('click', apagarTodos);
    document.getElementById('btnResetar').addEventListener('click', resetarDados);
});
