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
    // Se a tecla pressionada for "Enter" (código 13)
    if (event.key === "Enter" || event.keyCode === 13) {
        // Impede o comportamento padrão do navegador (que seria recarregar a página)
        event.preventDefault();
        
        // Chama a função que já valida a senha
        verificarSenha();
    }
}

function verificarSenha() {
    const senha = document.getElementById('input-senha').value;
    
    // 1. SENHA DE VOTANTE
    if (senha === "oscar@2026") {
        document.getElementById('tela-senha').style.display = 'none';
        document.getElementById('tela-votacao').style.display = 'block';
        carregarCurtas();
    } 
    // 2. SENHA DE ADMIN
    else if (senha === "@admin2026") {
        window.location.href = "admin.html";
    } 
    // 3. SENHAS DE DIRETOR (Verifica se começa com "gp@")
    else if (senha.startsWith("gp@")) {
        // Guarda a senha no navegador para a página do diretor saber quem é
        localStorage.setItem('codigoAcessoDiretor', senha);
        window.location.href = "diretor.html"; // Redireciona
    } 
    // 4. SENHA ERRADA
    else {
        document.getElementById('erro-senha').style.display = 'block';
    }
}



// --- CARREGAR CURTAS E MONTAR CARDS ---
async function carregarCurtas() {
    // Busca os curtas no banco de dados
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

    // Preenche a galeria de cards
    const containerCards = document.getElementById('lista-cards');
    containerCards.innerHTML = ''; 

    // Se não houver curtas cadastrados, mostra "Em Breve"
    if (curtas.length === 0) {
        containerCards.innerHTML = '<div class="sem-curtas" style="grid-column: 1 / -1;">Em Breve...</div>';
        return;
    }

    // Cria os cards para cada curta
    curtas.forEach(curta => {
        // Se não tiver capa, usa uma imagem padrão
        const imagemCapa = curta.link_capa ? curta.link_capa : 'https://via.placeholder.com/300x450/111/d4a356?text=Sem+Capa';
        
        containerCards.innerHTML += `
            <div class="card-filme">
                <!-- A imagem tem um clique que abre o vídeo, e o CSS cuida do formato de pôster -->
                <img src="${imagemCapa}" onclick="window.open('${curta.link_video}', '_blank')" style="cursor: pointer;">
                
                <div class="card-filme-info">
                    <h4>${curta.nome}</h4>
                    
                    <!-- Dados do Filme -->
                    <p><strong>Direção:</strong> ${curta.direcao || 'Não informada'}</p>
                    <p><strong>Elenco:</strong> ${curta.elenco || 'Não informado'}</p>
                    <p><strong>Gênero:</strong> ${curta.genero || 'Não informado'}</p>
                    
                    <!-- Botão para assistir -->
                    <a href="${curta.link_video}" target="_blank" class="btn-assistir">▶ Assistir no YouTube</a>
                </div>
            </div>
        `;
    });
}

// --- MOSTRAR / ESCONDER FILMES ---
function mostrarFilmes() {
    document.getElementById('galeria-curtas').style.display = 'block';
    document.getElementById('linha-divisoria').style.display = 'none'; // Esconde a linha para dar destaque
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
    const matricula = document.getElementById('matricula').value.trim;
     if (matricula === "") {
        alert("Por favor, digite sua matrícula.");
         return;
     }
    
    const voto = {
        matricula: matricula,
        melhor_fotografia: document.getElementById('melhor_fotografia').value,
        melhor_roteiro: document.getElementById('melhor_roteiro').value,
        melhor_ator: document.getElementById('melhor_ator_select').value, // Pega o valor do select
        curta_ator: document.getElementById('curta_ator').value,
        melhor_atriz: document.getElementById('melhor_atriz_select').value, // Pega o valor do select
        curta_atriz: document.getElementById('curta_atriz').value,
        melhor_curta: document.getElementById('melhor_curta').value
    };
    const { error } = await supabaseClient.from('votos').insert([voto]);

    if (error) {
        if (error.code === '23505') alert("Esta matrícula já registrou um voto!");
        else alert("Erro ao enviar voto: " + error.message);
    } else {
        // Esconde a tela de votação e mostra a tela de Obrigado
        document.getElementById('area-votacao-form').style.display = 'none';
        document.getElementById('tela-obrigado').style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});


// Função para forçar o download da imagem em qualquer dispositivo
function baixarCapa() {
    const linkOriginal = document.getElementById('link-download-capa');
    const urlImagem = linkOriginal.href;
    const nomeArquivo = linkOriginal.getAttribute('download');

    // Cria um link temporário invisível na página
    const linkTemporario = document.createElement('a');
    linkTemporario.href = urlImagem;
    linkTemporario.download = nomeArquivo;
    
    // Adiciona o link ao corpo da página, clica nele e depois remove
    document.body.appendChild(linkTemporario);
    linkTemporario.click();
    document.body.removeChild(linkTemporario);
}


// Função única para carregar atores e atrizes
function carregarNomesDoElenco(tipo) {
    // Descobre se é ator ou atriz baseado no que foi clicado
    const idCurta = document.getElementById(`curta_${tipo}`).value;
    const selectNomes = document.getElementById(`melhor_${tipo}_select`);
    const inputOculto = document.getElementById(`nome_${tipo}`);

    // Limpa a lista de nomes antiga
    selectNomes.innerHTML = `<option value="">Selecione o ${tipo === 'ator' ? 'Ator' : 'Atriz'}...</option>`;
    inputOculto.value = "";

    if (!idCurta) return; // Se não escolheu curta, para aqui

    // Procura o curta na lista que foi carregada do banco de dados
    const curta = listaDeCurtas.find(c => c.id == idCurta);
    
    // Se o curta existe e tem elenco cadastrado
    if (curta && curta.elenco) {
        // Separa os nomes pelas vírgulas
        const nomes = curta.elenco.split(',').map(nome => nome.trim());
        
        nomes.forEach(nomeCompleto => {
            if (nomeCompleto !== "") { 
                // O SEGREDO ESTÁ AQUI: Se tiver um traço "-", ele separa o nome do ator
                let nomeExibicao = nomeCompleto;
                
                if (nomeCompleto.includes('-')) {
                    // Pega a parte depois do traço (o nome do ator) e tira os espaços
                    nomeExibicao = nomeCompleto.split('-')[1].trim();
                }

                // Coloca o nome do ator na lista
                selectNomes.innerHTML += `<option value="${nomeExibicao}">${nomeExibicao}</option>`;
            }
        });
    }
}
