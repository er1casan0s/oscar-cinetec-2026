const SUPABASE_URL = 'https://bvhwrlqbpzsbsahewgpu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rRGz1qgqfACjQgTadb2s_w_3OthW1SX';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const codigoAcesso = localStorage.getItem('codigoAcessoDiretor');
if (!codigoAcesso) {
    alert("Acesso negado. Faça login primeiro.");
    window.location.href = "index.html";
}

let meuCurta = null; // Variável que vai guardar o curta deste diretor

function alternarTema() { document.body.classList.toggle('light-theme'); }

// --- FUNÇÃO PRINCIPAL: VERIFICA SE O DIRETOR JÁ TEM CURTA ---
async function verificarMeuCurta() {
    // Busca no banco apenas o curta que tem o 'criado_por' igual ao código de acesso
    const { data: curtas, error } = await supabaseClient
        .from('curtas')
        .select('*')
        .eq('criado_por', codigoAcesso);

    if (error) return alert("Erro ao carregar: " + error.message);

    if (curtas.length > 0) {
        // Se achou, o diretor já cadastrou. Mostra a área "Meu Curta"
        meuCurta = curtas[0];
        document.getElementById('area-cadastro').style.display = 'none';
        document.getElementById('area-meu-curta').style.display = 'block';
        
        // Monta o card do curta do diretor
        document.getElementById('card-meu-curta').innerHTML = `
            <div class="card-filme">
                <img src="${meuCurta.link_capa}">
                <div class="card-filme-info">
                    <h4>${meuCurta.nome}</h4>
                    <p><strong>Direção:</strong> ${meuCurta.direcao}</p>
                    <p><strong>Gênero:</strong> ${meuCurta.genero}</p>
                    <a href="${meuCurta.link_video}" target="_blank" class="btn-assistir">▶ Ver no YouTube</a>
                </div>
            </div>
        `;
    } else {
        // Se não achou, mostra a área de cadastro
        document.getElementById('area-cadastro').style.display = 'block';
        document.getElementById('area-meu-curta').style.display = 'none';
    }

    carregarOutrosCurtas(); // Carrega os curtas dos outros diretores
    return true;
}

// --- CADASTRAR O PRIMEIRO CURTA ---
document.getElementById('form-diretor').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nome = document.getElementById('nome_curta').value.trim();
    const video = document.getElementById('link_video').value.trim();
    const direcao = document.getElementById('direcao').value.trim();
    const checkboxesMarcados = document.querySelectorAll('.genero-checkbox:checked');
    const genero = Array.from(checkboxesMarcados).map(cb => cb.value).join(', ');
    const elenco = document.getElementById('elenco').value.trim();
    const arquivoCapa = document.getElementById('capa_arquivo').files[0];

    if (!arquivoCapa) return alert("Selecione uma capa!");

    try {
        const nomeArquivo = `${Date.now()}-${arquivoCapa.name.replace(/\s/g, '_')}`;
        const { error: uploadError } = await supabaseClient.storage.from('capas').upload(nomeArquivo, arquivoCapa);
        if (uploadError) throw new Error(uploadError.message);

        const { data: urlData } = supabaseClient.storage.from('capas').getPublicUrl(nomeArquivo);

        const { error: dbError } = await supabaseClient.from('curtas').insert([{ 
            nome: nome, link_video: video, link_capa: urlData.publicUrl,
            direcao: direcao, genero: genero, elenco: elenco, criado_por: codigoAcesso
        }]);

        if (dbError) throw new Error(dbError.message);

        alert("Curta cadastrado com sucesso!");
        verificarMeuCurta(); // Recarrega a tela para mostrar o curta recém-criado

    } catch (error) {
        alert("Erro: " + error.message);
    }
});

// --- ABRIR TELA DE EDIÇÃO ---
function abrirEdicao() {
    if (!meuCurta) return;

    
    // Esconde a área do card e mostra a área do formulário de edição
    document.getElementById('area-meu-curta').style.display = 'none';
    document.getElementById('area-edicao').style.display = 'block';

    // Preenche os campos com os dados atuais
    document.getElementById('edit_nome').value = meuCurta.nome;
    document.getElementById('edit_video').value = meuCurta.link_video;
    document.getElementById('edit_direcao').value = meuCurta.direcao;
    document.getElementById('edit_genero').value = meuCurta.genero;
    document.getElementById('edit_elenco').value = meuCurta.elenco;

    // Marca os checkboxes corretos baseado no que está salvo
    const generosSalvos = meuCurta.genero ? meuCurta.genero.split(', ') : [];
    document.querySelectorAll('.genero-checkbox').forEach(cb => {
        cb.checked = generosSalvos.includes(cb.value);
    });
    
    // Rola a tela para cima para o usuário ver o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- CANCELAR A EDIÇÃO ---
function cancelarEdicaoDiretor() {
    // Esconde o formulário e mostra o card de volta
    document.getElementById('area-edicao').style.display = 'none';
    document.getElementById('area-meu-curta').style.display = 'block';
}


// --- SALVAR A EDIÇÃO (O que ele alterou fica salvo) ---
document.getElementById('form-edicao').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Pega os valores dos campos
    const nome = document.getElementById('edit_nome').value.trim();
    const video = document.getElementById('edit_video').value.trim();
    const direcao = document.getElementById('edit_direcao').value.trim();
    const checkboxesMarcados = document.querySelectorAll('.genero-checkbox:checked');
    const genero = Array.from(checkboxesMarcados).map(cb => cb.value).join(', ');
    const elenco = document.getElementById('edit_elenco').value.trim();
    const arquivoCapa = document.getElementById('edit_capa').files[0];

    if (!meuCurta || !meuCurta.id) {
        return alert("Erro: Curta não encontrado.");
    }

    try {
        let linkCapaPublica = meuCurta.link_capa;

        // Se escolheu nova imagem, faz o upload
        if (arquivoCapa) {
            const nomeArquivo = `${Date.now()}-${arquivoCapa.name.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabaseClient.storage.from('capas').upload(nomeArquivo, arquivoCapa);
            if (uploadError) throw new Error("Erro no upload: " + uploadError.message);
            const { data: urlData } = supabaseClient.storage.from('capas').getPublicUrl(nomeArquivo);
            linkCapaPublica = urlData.publicUrl;
        }

        // Atualiza no banco
        const { error: dbError } = await supabaseClient.from('curtas')
            .update({ 
                nome: nome, 
                link_video: video, 
                link_capa: linkCapaPublica,
                direcao: direcao, 
                genero: genero, 
                elenco: elenco 
            })
            .eq('id', meuCurta.id);

        if (dbError) throw new Error("Erro ao salvar: " + dbError.message);

        // 1. Atualiza a variável local com os novos dados para o card ser desenhado certo
        meuCurta.nome = nome;
        meuCurta.link_video = video;
        meuCurta.link_capa = linkCapaPublica;
        meuCurta.direcao = direcao;
        meuCurta.genero = genero;
        meuCurta.elenco = elenco;

        alert("Alterações salvas com sucesso!");
        document.getElementById('form-edicao').reset();
        
        // 2. ESCONDE A TELA DE EDIÇÃO E MOSTRA A TELA DO CARD NOVAMENTE
        document.getElementById('area-edicao').style.display = 'none';
        document.getElementById('area-meu-curta').style.display = 'block';
        
        // 3. Recarrega as informações do card e da lista de baixo
        await verificarMeuCurta(); 

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
});


// --- LISTAR OUTROS CURTAS (Apenas para visualização) ---
async function carregarOutrosCurtas() {
    const { data: curtas } = await supabaseClient.from('curtas').select('*');
    const container = document.getElementById('lista-cards-diretor');
    container.innerHTML = '';

    if (!curtas) return;

    curtas.forEach(curta => {
        // Se for o curta dele, pula (para não aparecer duplicado)
        if (curta.criado_por === codigoAcesso) return;

        const imagemCapa = curta.link_capa ? curta.link_capa : 'https://via.placeholder.com/300x450/111/d4a356?text=Sem+Capa';
        
        container.innerHTML += `
            <div class="card-filme">
                <img src="${imagemCapa}">
                <div class="card-filme-info">
                    <h4>${curta.nome}</h4>
                    <p><strong>Direção:</strong> ${curta.direcao}</p>
                    <p><strong>Gênero:</strong> ${curta.genero}</p>
                </div>
            </div>
        `;
    });
}

// --- FUNÇÃO PARA BAIXAR A CAPA DO INSTAGRAM ---
function baixarCapaDiretor() {
    // Pega o link configurado no HTML
    const linkOriginal = document.getElementById('link-download-capa-diretor');
    const urlImagem = linkOriginal.href;
    const nomeArquivo = linkOriginal.getAttribute('download');

    // Cria um link temporário invisível
    const linkTemporario = document.createElement('a');
    linkTemporario.href = urlImagem;
    linkTemporario.download = nomeArquivo;
    
    // Simula o clique para baixar e remove o link depois
    document.body.appendChild(linkTemporario);
    linkTemporario.click();
    document.body.removeChild(linkTemporario);
}


// --- FUNÇÃO PARA EXCLUIR O PRÓPRIO CURTA ---
async function excluirMeuCurta() {
    // Verifica se o curta existe
    if (!meuCurta || !meuCurta.id) {
        return alert("Erro: Nenhum curta encontrado para excluir.");
    }

    // Pede confirmação (para não apagar sem querer)
    const confirmacao = confirm("ATENÇÃO: Tem certeza que deseja excluir o seu curta? Essa ação não pode ser desfeita e ele sairá da votação.");
    
    if (confirmacao) {
        try {
            // Apaga no banco de dados apenas se o ID bater e for criado por ele
            const { error } = await supabaseClient
                .from('curtas')
                .delete()
                .eq('id', meuCurta.id)
                .eq('criado_por', codigoAcesso);

            if (error) throw new Error(error.message);

            alert("Seu curta foi excluído com sucesso!");
            
            // Limpa a variável e recarrega a tela. O sistema vai ver que ele não tem mais curta
            // e vai voltar para a tela de cadastro inicial.
            meuCurta = null;
            document.getElementById('area-meu-curta').style.display = 'none';
            document.getElementById('area-edicao').style.display = 'none';
            verificarMeuCurta(); 

        } catch (error) {
            alert("Erro ao excluir o curta: " + error.message);
        }
    }
}

// Inicializa verificando se ele já tem curta
verificarMeuCurta();
// Inicializa verificando se ele já tem curta
verificarMeuCurta();
