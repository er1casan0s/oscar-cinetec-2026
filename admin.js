const SUPABASE_URL = 'https://bvhwrlqbpzsbsahewgpu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rRGz1qgqfACjQgTadb2s_w_3OthW1SX';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const senhaAdmin = prompt("Digite a senha de administrador:");
if (senhaAdmin !== "@admin2026") {
    alert("Acesso negado!");
    window.location.href = "index.html";
}

let listaDeCurtas = [];
let meuGrafico = null; // Variável para guardar a instância do gráfico

function alternarTema() {
    document.body.classList.toggle('light-theme');
}

function mudarAba(idAba, botaoClicado) {
    document.querySelectorAll('.admin-section').forEach(secao => secao.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(idAba).classList.add('active');
    botaoClicado.classList.add('active');
    
    if(idAba === 'aba-votos') carregarVotos();
    if(idAba === 'aba-graficos') carregarGraficos(); // <-- ADICIONADO AQUI
}

async function carregarCurtasAdmin() {
    const { data: curtas, error } = await supabaseClient.from('curtas').select('*');
    if(error) return alert("Erro ao carregar curtas: " + error.message);

    listaDeCurtas = curtas;
    const tbody = document.querySelector('#tabela-curtas tbody');
    tbody.innerHTML = '';

            curtas.forEach(curta => {
        // Verifica se o curta foi criado por um diretor ou pelo admin
        const quemCriou = curta.criado_por ? curta.criado_por : "Admin";

        tbody.innerHTML += `
            <tr>
                <td><img src="${curta.link_capa}" onerror="this.src='https://via.placeholder.com/60x40/111/d4a356?text=S/C'"></td>
                <td>${curta.nome}</td>
                <td>${curta.genero || '-'}</td>
                <td style="color: #d4a356; font-weight: bold;">${quemCriou}</td> <!-- MOSTRA QUEM CRIOU -->
                <td>
                    <button class="btn-excluir" style="background: #031d4e; color: #d4a356; border: 1px solid #d4a356;" onclick="prepararEdicao(${curta.id})">Editar</button>
                    <button class="btn-excluir" onclick="excluirCurta(${curta.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
        return true;
}

// --- FUNÇÃO PARA PREPARAR A EDIÇÃO ---
function prepararEdicao(id) {
    const curta = listaDeCurtas.find(c => c.id === id);
    if (!curta) return;

    document.getElementById('titulo-form-curta').innerText = "Editando Curta";
    document.getElementById('btn-cadastrar').innerText = "Salvar Alterações";
    document.getElementById('btn-cancelar-edicao').style.display = "block";

    document.getElementById('curta_id_editando').value = curta.id;
    document.getElementById('nome_curta').value = curta.nome;
    document.getElementById('link_video').value = curta.link_video;
    document.getElementById('direcao').value = curta.direcao || '';
    document.getElementById('genero').value = curta.genero || '';
    document.getElementById('elenco').value = curta.elenco || '';
    document.getElementById('capa_arquivo').value = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- FUNÇÃO PARA CANCELAR A EDIÇÃO ---
function cancelarEdicao() {
    document.getElementById('form-admin').reset();
    document.getElementById('curta_id_editando').value = '';
    document.getElementById('titulo-form-curta').innerText = "Cadastrar Novo Curta";
    document.getElementById('btn-cadastrar').innerText = "Cadastrar Curta";
    document.getElementById('btn-cancelar-edicao').style.display = "none";
    document.getElementById('capa_arquivo').required = true;
}

// --- LÓGICA DE CADASTRO E EDIÇÃO (SALVAR) ---
document.getElementById('form-admin').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const idEditando = document.getElementById('curta_id_editando').value;
    const estaEditando = idEditando !== '';

    const nome = document.getElementById('nome_curta').value.trim();
    const video = document.getElementById('link_video').value.trim();
    const direcao = document.getElementById('direcao').value.trim();
    const genero = document.getElementById('genero').value;
    const elenco = document.getElementById('elenco').value.trim();
    const inputArquivo = document.getElementById('capa_arquivo');
    const arquivoCapa = inputArquivo.files[0];

    if (!estaEditando && !arquivoCapa) {
        alert("Por favor, selecione uma imagem de capa antes de cadastrar.");
        return;
    }

    const curtaExistente = listaDeCurtas.find(c => c.nome.toLowerCase() === nome.toLowerCase() && c.id != idEditando);
    if (curtaExistente) {
        alert("Erro: Já existe outro curta cadastrado com esse nome!");
        return;
    }

    try {
        let linkCapaPublica = null;

        if (arquivoCapa) {
            const nomeArquivo = `${Date.now()}-${arquivoCapa.name.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabaseClient.storage.from('capas').upload(nomeArquivo, arquivoCapa);
            if (uploadError) throw new Error("Erro no upload: " + uploadError.message);

            const { data: urlData } = supabaseClient.storage.from('capas').getPublicUrl(nomeArquivo);
            linkCapaPublica = urlData.publicUrl;
        }

        const dadosCurta = {
            nome: nome, link_video: video, direcao: direcao, genero: genero, elenco: elenco
        };
        
        if (linkCapaPublica) {
            dadosCurta.link_capa = linkCapaPublica;
        }

        if (estaEditando) {
            const { error: dbError } = await supabaseClient.from('curtas').update(dadosCurta).eq('id', idEditando);
            if (dbError) throw new Error("Erro ao editar: " + dbError.message);
            alert("Curta editado com sucesso!");
        } else {
            const { error: dbError } = await supabaseClient.from('curtas').insert([dadosCurta]);
            if (dbError) throw new Error("Erro ao cadastrar: " + dbError.message);
            alert("Curta cadastrado com sucesso!");
        }

        cancelarEdicao();
        carregarCurtasAdmin();

    } catch (error) {
        alert(error.message);
    }
});

async function excluirCurta(id) {
    if(!confirm("Tem certeza que deseja excluir este curta?")) return;
    const { error } = await supabaseClient.from('curtas').delete().eq('id', id);
    if (error) alert("Erro ao excluir. Pode haver votos vinculados a ele.");
    else { alert("Curta excluído!"); carregarCurtasAdmin(); }
}

async function carregarVotos() {
    const tbody = document.querySelector('#tabela-votos tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Carregando votos...</td></tr>';

    try {
        if (listaDeCurtas.length === 0) {
            const { data: curtasData } = await supabaseClient.from('curtas').select('*');
            if (curtasData) listaDeCurtas = curtasData;
        }

        const { data: votos, error } = await supabaseClient.from('votos').select('*');
        if(error) throw new Error("Erro ao buscar votos: " + error.message);

        tbody.innerHTML = '';

        if (votos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum voto registrado ainda.</td></tr>';
            return;
        }

        const getNomeCurta = (id) => {
            const curta = listaDeCurtas.find(c => c.id === id);
            return curta ? curta.nome : "Desconhecido";
        };

        votos.forEach(voto => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${voto.matricula}</strong></td>
                    <td>${getNomeCurta(voto.melhor_fotografia)}</td>
                    <td>${getNomeCurta(voto.melhor_roteiro)}</td>
                    <td>${voto.melhor_ator} <br><small style="color:#d4a356">(${getNomeCurta(voto.curta_ator)})</small></td>
                    <td>${voto.melhor_atriz} <br><small style="color:#d4a356">(${getNomeCurta(voto.curta_atriz)})</small></td>
                    <td><strong>${getNomeCurta(voto.melhor_curta)}</strong></td>
                </tr>
            `;
        });

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: red;">Erro: ${error.message}</td></tr>`;
        console.error(error);
    }
}

// --- NOVA FUNÇÃO: CARREGAR GRÁFICOS E QUANTITATIVOS ---
async function carregarGraficos() {
    if (listaDeCurtas.length === 0) await carregarCurtasAdmin();

    const { data: votos, error } = await supabaseClient.from('votos').select('*');
    if(error) return alert("Erro ao carregar dados para o gráfico: " + error.message);

    let contagemMelhorCurta = {};
    let contagemFotografia = {};
    let contagemRoteiro = {};
    
    // Agora as chaves vão ser compostas: "Nome do Ator (Nome do Curta)"
    let contagemAtor = {}; 
    let contagemAtriz = {};

    listaDeCurtas.forEach(c => contagemMelhorCurta[c.nome] = 0);

    const getNome = (id) => {
        const curta = listaDeCurtas.find(c => c.id === id);
        return curta ? curta.nome : "Desconhecido";
    };

    votos.forEach(voto => {
        const nomeCurta = getNome(voto.melhor_curta);
        if(contagemMelhorCurta[nomeCurta] !== undefined) contagemMelhorCurta[nomeCurta]++;

        const fotografia = getNome(voto.melhor_fotografia);
        contagemFotografia[fotografia] = (contagemFotografia[fotografia] || 0) + 1;

        const roteiro = getNome(voto.melhor_roteiro);
        contagemRoteiro[roteiro] = (contagemRoteiro[roteiro] || 0) + 1;

        // JUNTA O NOME DO ATOR COM O NOME DO FILME
        if (voto.melhor_ator) {
            const nomeDoCurtaDoAtor = getNome(voto.curta_ator);
            const chaveAtor = `${voto.melhor_ator} (${nomeDoCurtaDoAtor})`;
            contagemAtor[chaveAtor] = (contagemAtor[chaveAtor] || 0) + 1;
        }

        // JUNTA O NOME DA ATRIZ COM O NOME DO FILME
        if (voto.melhor_atriz) {
            const nomeDoCurtaDaAtriz = getNome(voto.curta_atriz);
            const chaveAtriz = `${voto.melhor_atriz} (${nomeDoCurtaDaAtriz})`;
            contagemAtriz[chaveAtriz] = (contagemAtriz[chaveAtriz] || 0) + 1;
        }
    });

    // Desenhar o Gráfico de Melhor Curta (continua igual)
    const ctx = document.getElementById('graficoMelhorCurta').getContext('2d');
    if (meuGrafico) meuGrafico.destroy();

    meuGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(contagemMelhorCurta),
            datasets: [{
                label: 'Quantidade de Votos',
                data: Object.values(contagemMelhorCurta),
                backgroundColor: '#d4a356',
                borderColor: '#f37321',
                borderWidth: 2,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#fff', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.1)' } },
                x: { ticks: { color: '#fff' }, grid: { display: false } }
            }
        }
    });

    // Preencher as listas quantitativas
    const preencherLista = (idElemento, objetoContagem) => {
        const ul = document.getElementById(idElemento);
        ul.innerHTML = '';
        const arrayOrdenado = Object.entries(objetoContagem).sort((a, b) => b[1] - a[1]);
        
        arrayOrdenado.forEach(([nome, qtd]) => {
            if(qtd > 0) ul.innerHTML += `<li>${nome} <span>${qtd} voto(s)</span></li>`;
        });

        if(ul.innerHTML === '') ul.innerHTML = '<li>Nenhum voto registrado.</li>';
    };

    preencherLista('lista-fotografia', contagemFotografia);
    preencherLista('lista-roteiro', contagemRoteiro);
    preencherLista('lista-ator', contagemAtor);   // Vai mostrar "Ator (Curta)"
    preencherLista('lista-atriz', contagemAtriz); // Vai mostrar "Atriz (Curta)"
}

// Inicializa
carregarCurtasAdmin();