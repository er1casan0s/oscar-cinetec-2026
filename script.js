const SUPABASE_URL = 'https://bvhwrlqbpzsbsahewgpu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rRGz1qgqfACjQgTadb2s_w_3OthW1SX';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let listaDeCurtas = []; // Variável global

// --- FUNÇÕES DE TEMA E NAVEGAÇÃO ---
function alternarTema() {
    document.body.classList.toggle('light-theme');
}

function sair() {
    window.location.reload(); // Recarrega a página e volta pra tela de senha
}

function toggleSenha() {
    const inputSenha = document.getElementById('input-senha');
    const botaoOlho = document.querySelector('.toggle-senha');
    if (inputSenha.type === 'password') {
        inputSenha.type = 'text';
        botaoOlho.innerHTML = '👁';
    } else {
        inputSenha.type = 'password';
        botaoOlho.innerHTML = '👁';
    }
}

// Função para verificar se a tecla Enter foi pressionada
function verificarEnter(event) {
    if (event.key === "Enter" || event.keyCode === 13) {
        event.preventDefault();
        verificarSenha();
    }
}

function verificarSenha() {
    const senha = document.getElementById('input-senha').value;
    
    // 1. SENHA DE VOTANTE
    if (senha === "cinetecclose") {
        document.getElementById('tela-senha').style.display = 'none';
        document.getElementById('tela-votacao').style.display = 'block';
        carregarCurtas();
    } 
    // 2. SENHA DE ADMIN
    else if (senha === "@admin2026") {
        window.location.href = "admin.html";
    } 
    // 3. SENHAS DE DIRETOR
    else if (senha.startsWith("gp@")) {
        localStorage.setItem('codigoAcessoDiretor', senha);
        window.location.href = "diretor.html";
    } 
    // 4. SENHA ERRADA
    else {
        document.getElementById('erro-senha').style.display = 'block';
    }
}

// --- CARREGAR CURTAS E MONTAR CARDS ---
async function carregarCurtas() {
    const { data: curtas, error } = await supabaseClient.from('curtas').select('*');
    if (error) { alert("Erro ao carregar curtas: " + error.message); return; }

    listaDeCurtas = curtas; 

    // Preenche os selects do formulário de votação
    const selects = ['melhor_fotografia', 'melhor_roteiro', 'curta_ator', 'curta_atriz', 'melhor_curta'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        select.innerHTML = '<option value="">Selecione um curta...</option>';
        curtas.forEach(curta => {
            select.innerHTML += `<option value="${curta.id}">${curta.nome}</option>`;
        });
    });

    // Em vez de criar os cards aqui, chamamos a função que aplica os filtros
    aplicarFiltros(); 
}            

// --- FUNÇÃO PARA FILTRAR E ORDENAR OS CARDS ---
function aplicarFiltros() {
    const generoFiltro = document.getElementById('filtro-genero').value;
    const ordem = document.getElementById('ordem-classificacao').value;
    const containerCards = document.getElementById('lista-cards');

    // 1. Começa com a lista completa de curtas
    let curtasFiltrados = [...listaDeCurtas];

    // 2. Filtra por Gênero
    if (generoFiltro !== 'todos') {
        curtasFiltrados = curtasFiltrados.filter(curta => 
            curta.genero && curta.genero.includes(generoFiltro)
        );
    }

    // 3. Ordena a lista
    curtasFiltrados.sort((a, b) => {
        if (ordem === 'alfabetica') {
            return a.nome.localeCompare(b.nome); // A-Z
        } else if (ordem === 'alfabetica-inversa') {
            return b.nome.localeCompare(a.nome); // Z-A
        } else if (ordem === 'edicao') {
            return b.id - a.id; // Mais recentes primeiro
        }
        return 0;
    });

    // 4. Renderiza os cards na tela
    containerCards.innerHTML = ''; 

    if (curtasFiltrados.length === 0) {
        containerCards.innerHTML = '<div class="sem-curtas" style="grid-column: 1 / -1;">Nenhum curta encontrado com esse filtro.</div>';
        return;
    }

    curtasFiltrados.forEach(curta => {
        const imagemCapa = curta.link_capa ? curta.link_capa : 'https://via.placeholder.com/300x450/111/d4a356?text=Sem+Capa';
        
        containerCards.innerHTML += `
            <div class="card-filme">
                <img src="${imagemCapa}" onclick="window.open('${curta.link_video}', '_blank')" style="cursor: pointer;">
                
                <div class="card-filme-info">
                    <h4>${curta.nome}</h4>
                    
                    <!-- [NOVO] Sinopse no Card de Votação -->
                    <p style="font-style: italic; margin-bottom: 10px; font-size: 0.85rem; color: var(--text-main);">
                        ${curta.sinopse || 'Sinopse não informada.'}
                    </p>
                    
                    <p><strong>Direção:</strong> ${curta.direcao || 'Não informada'}</p>
                    <p><strong>Elenco:</strong> ${curta.elenco || 'Não informado'}</p>
                    <p><strong>Gênero:</strong> ${curta.genero || 'Não informado'}</p>
                    
                    <a href="${curta.link_video}" target="_blank" class="btn-assistir">▶ Assistir no YouTube</a>
                </div>
            </div>
        `;
    });
}

// --- MOSTRAR / ESCONDER FILMES ---
function mostrarFilmes() {
    document.getElementById('galeria-curtas').style.display = 'block';
    document.getElementById('linha-divisoria').style.display = 'none';
    document.getElementById('galeria-curtas').scrollIntoView({ behavior: 'smooth' });
}

function esconderFilmes() {
    document.getElementById('galeria-curtas').style.display = 'none';
    document.getElementById('linha-divisoria').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- ENVIAR VOTO ---
document.getElementById('form-voto').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const matricula = document.getElementById('matricula').value.trim(); 
    
    if (matricula === "") {
        alert("Por favor, digite sua matrícula.");
        return;
    }

    // --- [NOVO] Verifica se pelo menos uma categoria foi preenchida ---
    const votouFotografia = document.getElementById('melhor_fotografia').value !== "";
    const votouRoteiro = document.getElementById('melhor_roteiro').value !== "";
    const votouAtor = document.getElementById('melhor_ator_select').value !== "";
    const votouAtriz = document.getElementById('melhor_atriz_select').value !== "";
    const votouCurta = document.getElementById('melhor_curta').value !== "";

    if (!votouFotografia && !votouRoteiro && !votouAtor && !votouAtriz && !votouCurta) {
        alert("Você precisa votar em pelo menos uma categoria!");
        return;
    }
    // ------------------------------------------------------------------
    
    const voto = {
        matricula: matricula,
        melhor_fotografia: document.getElementById('melhor_fotografia').value || null, // Se vazio, envia null
        melhor_roteiro: document.getElementById('melhor_roteiro').value || null,
        melhor_ator: document.getElementById('melhor_ator_select').value || null,
        curta_ator: document.getElementById('curta_ator').value || null,
        melhor_atriz: document.getElementById('melhor_atriz_select').value || null,
        curta_atriz: document.getElementById('curta_atriz').value || null,
        melhor_curta: document.getElementById('melhor_curta').value || null
    };
    
    const { error } = await supabaseClient.from('votos').insert([voto]);

    if (error) {
        if (error.code === '23505') alert("Esta matrícula já registrou um voto!");
        else alert("Erro ao enviar voto: " + error.message);
    } else {
        document.getElementById('area-votacao-form').style.display = 'none';
        document.getElementById('tela-obrigado').style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

// Função para forçar o download da imagem
function baixarCapa() {
    const linkOriginal = document.getElementById('link-download-capa');
    const urlImagem = linkOriginal.href;
    const nomeArquivo = linkOriginal.getAttribute('download');

    const linkTemporario = document.createElement('a');
    linkTemporario.href = urlImagem;
    linkTemporario.download = nomeArquivo;
    
    document.body.appendChild(linkTemporario);
    linkTemporario.click();
    document.body.removeChild(linkTemporario);
}

// Função única para carregar atores e atrizes
// Função única para carregar atores e atrizes
function carregarNomesDoElenco(tipo) {
    const idCurta = document.getElementById(`curta_${tipo}`).value;
    const selectNomes = document.getElementById(`melhor_${tipo}_select`);
    const inputOculto = document.getElementById(`nome_${tipo}`);

    // Limpa a lista
    selectNomes.innerHTML = `<option value="">Selecione o ${tipo === 'ator' ? 'Ator' : 'Atriz'}...</option>`;
    inputOculto.value = "";

    // Se não escolheu o curta, para aqui
    if (!idCurta) return; 

    // Procura o curta na lista
    const curta = listaDeCurtas.find(c => c.id == idCurta);
    
    // Se o curta existe e tem elenco cadastrado
    if (curta && curta.elenco) {
        // O SEGREDO ESTÁ AQUI: Separa os nomes por vírgula E também por ponto e vírgula (caso o aluno tenha digitado errado)
        const nomesBrutos = curta.elenco.split(/,|;/); 
        
        nomesBrutos.forEach(nomeCompleto => {
            const nomeLimpo = nomeCompleto.trim();
            if (nomeLimpo !== "") { 
                // Adiciona o nome na lista
                selectNomes.innerHTML += `<option value="${nomeLimpo}">${nomeLimpo}</option>`;
            }
        });
    } else {
        // Se o curta não tiver elenco cadastrado, avisa o usuário
        selectNomes.innerHTML += `<option value="">Elenco não cadastrado</option>`;
    }
}
