const SUPABASE_URL = 'https://bvhwrlqbpzsbsahewgpu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rRGz1qgqfACjQgTadb2s_w_3OthW1SX';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const codigoAcesso = localStorage.getItem('codigoAcessoDiretor');
if (!codigoAcesso) {
    alert("Acesso negado. Faça login primeiro.");
    window.location.href = "index.html";
}

let meuCurta = null;

function alternarTema() { document.body.classList.toggle('light-theme'); }

// --- FUNÇÃO PRINCIPAL ---
async function verificarMeuCurta() {
    // [ALTERAÇÃO] Verificação da Data Limite
    const dataLimiteSalva = localStorage.getItem('cinetec_data_limite');
    const agora = new Date();
    let bloqueado = false;

    if (dataLimiteSalva) {
        const dataLimite = new Date(dataLimiteSalva);
        if (agora > dataLimite) {
            bloqueado = true;
        }
    }

    const { data: curtas, error } = await supabaseClient
        .from('curtas')
        .select('*')
        .eq('criado_por', codigoAcesso);

    if (error) return alert("Erro ao carregar: " + error.message);

    if (curtas.length > 0) {
        meuCurta = curtas[0];
        document.getElementById('area-cadastro').style.display = 'none';
        document.getElementById('area-meu-curta').style.display = 'block';
        
        document.getElementById('card-meu-curta').innerHTML = `
            <div class="card-filme">
                <img src="${meuCurta.link_capa}">
                <div class="card-filme-info">
                    <h4>${meuCurta.nome}</h4>
                    <!-- [NOVO] Sinopse no Card do Diretor -->
                    <p style="font-style: italic; font-size: 0.85rem;">${meuCurta.sinopse || 'Sinopse não informada.'}</p>
                    <p><strong>Direção:</strong> ${meuCurta.direcao}</p>
                    <p><strong>Gênero:</strong> ${meuCurta.genero}</p>
                    <a href="${meuCurta.link_video}" target="_blank" class="btn-assistir">▶ Ver no YouTube</a>
                </div>
            </div>
        `;

        // [ALTERAÇÃO] Esconder botões se a data limite expirou
        const divBotoes = document.getElementById('botoes-acao-diretor'); 
        if (bloqueado) {
            if (divBotoes) divBotoes.style.display = 'none';
            document.getElementById('card-meu-curta').innerHTML += `<p style="text-align:center; color:#ff4d4d; margin-top:10px; font-weight:bold;">⚠️ Prazo de edição encerrado.</p>`;
        } else {
            if (divBotoes) divBotoes.style.display = 'flex';
        }

    } else {
        document.getElementById('area-cadastro').style.display = 'block';
        document.getElementById('area-meu-curta').style.display = 'none';

        if (bloqueado) {
            document.getElementById('area-cadastro').style.display = 'none';
            alert("O prazo para cadastrar novos curtas foi encerrado.");
        }
    }

    carregarOutrosCurtas();
    return true;
}

// --- CADASTRAR O PRIMEIRO CURTA ---
document.getElementById('form-diretor').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const dataLimiteSalva = localStorage.getItem('cinetec_data_limite');
    if (dataLimiteSalva && new Date() > new Date(dataLimiteSalva)) {
        return alert("O prazo de cadastro expirou.");
    }

    const nome = document.getElementById('nome_curta').value.trim();
    const sinopse = document.getElementById('sinopse').value.trim(); // <-- [NOVO] Captura a sinopse
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

        // [ALTERAÇÃO] Envia a sinopse para o banco
        const { error: dbError } = await supabaseClient.from('curtas').insert([{ 
            nome: nome, 
            sinopse: sinopse, // <-- [NOVO]
            link_video: video, 
            link_capa: urlData.publicUrl,
            direcao: direcao, 
            genero: genero, 
            elenco: elenco, 
            criado_por: codigoAcesso
        }]);

        if (dbError) throw new Error(dbError.message);

        alert("Curta cadastrado com sucesso!");
        verificarMeuCurta();

    } catch (error) {
        alert("Erro: " + error.message);
    }
});

// --- ABRIR TELA DE EDIÇÃO ---
function abrirEdicao() {
    if (!meuCurta) return;

    const dataLimiteSalva = localStorage.getItem('cinetec_data_limite');
    if (dataLimiteSalva && new Date() > new Date(dataLimiteSalva)) {
        return alert("O prazo de edição expirou.");
    }
    
    document.getElementById('area-meu-curta').style.display = 'none';
    document.getElementById('area-edicao').style.display = 'block';

    document.getElementById('edit_nome').value = meuCurta.nome;
    document.getElementById('edit_sinopse').value = meuCurta.sinopse || ''; // <-- [NOVO] Preenche a sinopse
    document.getElementById('edit_video').value = meuCurta.link_video;
    document.getElementById('edit_direcao').value = meuCurta.direcao;
    document.getElementById('edit_elenco').value = meuCurta.elenco;

    const generosSalvos = meuCurta.genero ? meuCurta.genero.split(', ') : [];
    document.querySelectorAll('.genero-checkbox').forEach(cb => {
        cb.checked = generosSalvos.includes(cb.value);
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicaoDiretor() {
    document.getElementById('area-edicao').style.display = 'none';
    document.getElementById('area-meu-curta').style.display = 'block';
}

// --- SALVAR A EDIÇÃO ---
document.getElementById('form-edicao').addEventListener('submit', async (e) => {
    e.preventDefault();

    const dataLimiteSalva = localStorage.getItem('cinetec_data_limite');
    if (dataLimiteSalva && new Date() > new Date(dataLimiteSalva)) {
        return alert("O prazo de edição expirou.");
    }

    const nome = document.getElementById('edit_nome').value.trim();
    const sinopse = document.getElementById('edit_sinopse').value.trim(); // <-- [NOVO]
    const video = document.getElementById('edit_video').value.trim();
    const direcao = document.getElementById('edit_direcao').value.trim();
    const checkboxesMarcados = document.querySelectorAll('.genero-checkbox:checked');
    const genero = Array.from(checkboxesMarcados).map(cb => cb.value).join(', ');
    const elenco = document.getElementById('edit_elenco').value.trim();
    const arquivoCapa = document.getElementById('edit_capa').files[0];

    if (!meuCurta || !meuCurta.id) return alert("Erro: Curta não encontrado.");

    try {
        let linkCapaPublica = meuCurta.link_capa;

        if (arquivoCapa) {
            const nomeArquivo = `${Date.now()}-${arquivoCapa.name.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabaseClient.storage.from('capas').upload(nomeArquivo, arquivoCapa);
            if (uploadError) throw new Error("Erro no upload: " + uploadError.message);
            const { data: urlData } = supabaseClient.storage.from('capas').getPublicUrl(nomeArquivo);
            linkCapaPublica = urlData.publicUrl;
        }

        // [ALTERAÇÃO] Atualiza a sinopse no banco
        const { error: dbError } = await supabaseClient.from('curtas')
            .update({ 
                nome: nome, 
                sinopse: sinopse, // <-- [NOVO]
                link_video: video, 
                link_capa: linkCapaPublica,
                direcao: direcao, 
                genero: genero, 
                elenco: elenco 
            })
            .eq('id', meuCurta.id);

        if (dbError) throw new Error("Erro ao salvar: " + dbError.message);

        meuCurta.nome = nome;
        meuCurta.sinopse = sinopse; // <-- [NOVO]
        meuCurta.link_video = video;
        meuCurta.link_capa = linkCapaPublica;
        meuCurta.direcao = direcao;
        meuCurta.genero = genero;
        meuCurta.elenco = elenco;

        alert("Alterações salvas com sucesso!");
        document.getElementById('form-edicao').reset();
        
        document.getElementById('area-edicao').style.display = 'none';
        document.getElementById('area-meu-curta').style.display = 'block';
        
        await verificarMeuCurta(); 

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
});

// --- LISTAR OUTROS CURTAS ---
async function carregarOutrosCurtas() {
    const { data: curtas } = await supabaseClient.from('curtas').select('*');
    const container = document.getElementById('lista-cards-diretor');
    container.innerHTML = '';

    if (!curtas) return;

    curtas.forEach(curta => {
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

function baixarCapaDiretor() {
    const linkOriginal = document.getElementById('link-download-capa-diretor');
    const urlImagem = linkOriginal.href;
    const nomeArquivo = linkOriginal.getAttribute('download');

    const linkTemporario = document.createElement('a');
    linkTemporario.href = urlImagem;
    linkTemporario.download = nomeArquivo;
    
    document.body.appendChild(linkTemporario);
    linkTemporario.click();
    document.body.removeChild(linkTemporario);
}

// --- FUNÇÃO PARA EXCLUIR O PRÓPRIO CURTA ---
async function excluirMeuCurta() {
    const dataLimiteSalva = localStorage.getItem('cinetec_data_limite');
    if (dataLimiteSalva && new Date() > new Date(dataLimiteSalva)) {
        return alert("O prazo para exclusão expirou. O curta não pode mais ser apagado.");
    }

    if (!meuCurta || !meuCurta.id) return alert("Erro: Nenhum curta encontrado para excluir.");

    const confirmacao = confirm("ATENÇÃO: Tem certeza que deseja excluir o seu curta? Essa ação não pode ser desfeita e ele sairá da votação.");
    
    if (confirmacao) {
        try {
            const { error } = await supabaseClient
                .from('curtas')
                .delete()
                .eq('id', meuCurta.id)
                .eq('criado_por', codigoAcesso);

            if (error) throw new Error(error.message);

            alert("Seu curta foi excluído com sucesso!");
            
            meuCurta = null;
            document.getElementById('area-meu-curta').style.display = 'none';
            document.getElementById('area-edicao').style.display = 'none';
            verificarMeuCurta(); 

        } catch (error) {
            alert("Erro ao excluir o curta: " + error.message);
        }
    }
}

// Inicializa
verificarMeuCurta();
