function renderizarAuditoria() {
    const container = document.getElementById('auditoria');
    
    // Define as faixas de 500 em 500 conforme a sua nova organização no OneDrive
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
        { nome: "Pasta 4501 - 5000", inicio: 4501, fim: 5000 }
        // Se passar de 5000, basta continuar adicionando as próximas faixas aqui (+500)
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
