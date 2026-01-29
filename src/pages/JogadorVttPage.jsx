import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";
import fundoJogador from '../assets/fundo-jogador.jpg';
import sanchezImg from '../assets/sanchez.jpeg'; // Importação adicionada
import papiroImg from '../assets/papiro.png';     // Importação adicionada
import Bazar from '../components/Bazar';

export default function JogadorVttPage() {
  const [personagem, setPersonagem] = useState(null);
  const [missoes, setMissoes] = useState([]);
  const [sessoesAtivas, setSessoesAtivas] = useState([]);
  const [showMissionModal, setShowMissionModal] = useState(false);
  
  // --- NOVOS STATES PARA RESENHAS ---
  const [resenhas, setResenhas] = useState([]);
  const [showResenhasList, setShowResenhasList] = useState(false);
  const [viewResenha, setViewResenha] = useState(null);

  // --- CARREGAR DADOS DO PERSONAGEM ---
  useEffect(() => {
    const fetchChar = async () => {
      if (!auth.currentUser) return;
      const docRef = doc(db, "characters", auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPersonagem(docSnap.data());
      }
    };
    fetchChar();
  }, []);

  // --- CARREGAR MISSÕES, SESSÕES E RESENHAS ---
  useEffect(() => {
    if (!auth.currentUser || !personagem) return;

    // 1. Ouvir Missões Disponíveis
    const qMissoes = query(collection(db, "missoes"));
    const unsubMissoes = onSnapshot(qMissoes, (snap) => {
      setMissoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Ouvir Sessões onde o jogador foi incluído
    const qSessoes = query(collection(db, "sessoes"), where("participantes", "array-contains", personagem.name));
    const unsubSessoes = onSnapshot(qSessoes, (snap) => {
      const agora = new Date();
      const sessoesValidas = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => {
        const inicio = new Date(s.dataInicio);
        const fim = new Date(s.expiraEm);
        return agora >= inicio && agora <= fim; 
      });
      setSessoesAtivas(sessoesValidas);
    });

    // 3. Ouvir Resenhas endereçadas ao Personagem (NOVO)
    const qResenhas = query(collection(db, "resenhas"), where("destinatarios", "array-contains", personagem.name));
    const unsubResenhas = onSnapshot(qResenhas, (snap) => {
       // Ordenar por data (opcional, mas bom)
       const loadedResenhas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
       // Filtra apenas as que não expiraram (opcional, igual ao mestre)
       const agora = new Date();
       const validas = loadedResenhas.filter(r => new Date(r.expiraEm) > agora);
       setResenhas(validas);
    });

    return () => { unsubMissoes(); unsubSessoes(); unsubResenhas(); };
  }, [personagem]);

  // --- CANDIDATURA À MISSÃO ---
  const handleCandidatar = async (missao) => {
    if (!personagem) return;

    // Verifica se já é candidato
    const jaCandidato = missao.candidatos?.some(c => c.uid === auth.currentUser.uid);
    if (jaCandidato) return alert("Você já se candidatou para esta missão!");

    // Lógica de Líder: Se não houver candidatos, o primeiro é o líder
    const isLeader = !missao.candidatos || missao.candidatos.length === 0;

    const candidatoObj = {
      uid: auth.currentUser.uid,
      nome: personagem.name,
      classe: personagem.class,
      isLeader: isLeader,
      dataCandidatura: new Date().toISOString()
    };

    try {
      const missaoRef = doc(db, "missoes", missao.id);
      await updateDoc(missaoRef, {
        candidatos: arrayUnion(candidatoObj)
      });
      alert(isLeader ? "Você se candidatou e foi marcado como LÍDER DO GRUPO!" : "Candidatura realizada com sucesso!");
    } catch (erro) {
      console.error("Erro ao candidatar:", erro);
      alert("Falha ao enviar candidatura.");
    }
  };

  const enterVTT = (sessao) => {
    alert(`Entrando na sessão: ${sessao.missaoNome}\nBom jogo, ${personagem.name}!`);
  };

  if (!personagem) return <div className="loading-screen">Carregando Grimório...</div>;

  return (
    <div className="jogador-container">
      
      {/* 1. CAMADA DE FUNDO (Z-Index 0) */}
      <div 
        className="background-layer"
        style={{ backgroundImage: `url(${fundoJogador})` }}
      />
      
      {/* 2. CAMADA DE CONTEÚDO (Z-Index 10) */}
      <div className="content-layer">

        {/* HUD SUPERIOR: STATUS DO PERSONAGEM */}
        <div className="char-hud">
          <div className="char-avatar">
             <div className="avatar-circle"></div>
          </div>
          <div className="char-info">
             <h2 className="char-name">{personagem.name}</h2>
             <span className="char-meta">{personagem.race} // {personagem.class}</span>
          </div>
        </div>

        {/* ÁREA CENTRAL: SESSÕES ATIVAS */}
        {sessoesAtivas.length > 0 && (
          <div className="active-sessions-banner fade-in">
             <h3>SESSÃO EM ANDAMENTO!</h3>
             {sessoesAtivas.map(sessao => (
               <div key={sessao.id} className="session-entry-row">
                  <span>{sessao.missaoNome}</span>
                  <button className="btn-enter-session" onClick={() => enterVTT(sessao)}>ENTRAR AGORA</button>
               </div>
             ))}
          </div>
        )}

        {/* BOTÕES FLUTUANTES (CANTOS INFERIORES) */}
        
        {/* Botão Missões */}
        <button className="floating-mission-btn" onClick={() => setShowMissionModal(true)} title="Quadro de Missões">
            📜
        </button>

        {/* Botão Resenhas do Sanchez (NOVO - Só aparece se tiver resenhas) */}
        {resenhas.length > 0 && (
           <button className="floating-sanchez-btn" onClick={() => setShowResenhasList(true)} title="Crônicas do Sanchez">
               <div className="sanchez-icon-face" style={{backgroundImage: `url(${sanchezImg})`}}></div>
               <span className="notification-badge">{resenhas.length}</span>
           </button>
        )}

        <Bazar isMestre={false} /> 

        {/* MODAL DO QUADRO DE MISSÕES */}
        {showMissionModal && (
          <div className="ff-modal-overlay-flex" onClick={() => setShowMissionModal(false)}>
             <div className="ff-modal-content ff-card" onClick={e => e.stopPropagation()}>
                
                <div className="modal-header-row">
                  <h3 className="modal-title-ff">QUADRO DE CONTRATOS</h3>
                  <button className="btn-close-x" onClick={() => setShowMissionModal(false)}>✕</button>
                </div>

                <div className="missions-list-player">
                   {missoes.map(m => (
                     <div key={m.id} className={`mission-poster-player rank-${m.rank}`}>
                        <div className="mp-header">
                          <span className="mp-rank">{m.rank}</span>
                          <h4>{m.nome}</h4>
                        </div>
                        <div className="mp-details">
                          <p><strong>Local:</strong> {m.local}</p>
                          <p><strong>Recompensa:</strong> {m.gilRecompensa} Gil</p>
                          <p className="mp-desc">{m.descricaoMissao}</p>
                        </div>
                        
                        {m.candidatos && m.candidatos.length > 0 && (
                          <div className="candidates-box">
                             <small>Grupo em formação:</small>
                             <div className="cand-tags">
                               {m.candidatos.map((c, idx) => (
                                 <span key={idx} className={`cand-tag ${c.isLeader ? 'leader' : ''}`}>
                                   {c.isLeader && '👑'} {c.nome}
                                 </span>
                               ))}
                             </div>
                          </div>
                        )}

                        <button 
                          className="btn-candidatar" 
                          disabled={m.candidatos?.some(c => c.uid === auth.currentUser.uid)}
                          onClick={() => handleCandidatar(m)}
                        >
                          {m.candidatos?.some(c => c.uid === auth.currentUser.uid) ? "CANDIDATURA ENVIADA" : "ACEITAR CONTRATO"}
                        </button>
                     </div>
                   ))}
                   {missoes.length === 0 && <p style={{textAlign: 'center', padding: '20px'}}>Nenhum contrato disponível no momento.</p>}
                </div>
             </div>
          </div>
        )}

        {/* MODAL DE LISTA DE RESENHAS (NOVO) */}
        {showResenhasList && (
           <div className="ff-modal-overlay-flex" onClick={() => setShowResenhasList(false)}>
              <div className="ff-modal-content ff-card" style={{height: 'auto', maxHeight: '600px'}} onClick={e => e.stopPropagation()}>
                 <div className="modal-header-row">
                    <h3 className="modal-title-ff">CRÔNICAS RECEBIDAS</h3>
                    <button className="btn-close-x" onClick={() => setShowResenhasList(false)}>✕</button>
                 </div>
                 <div className="resenhas-list-container">
                    {resenhas.map(r => (
                       <div key={r.id} className="resenha-row-player" onClick={() => { setViewResenha(r); setShowResenhasList(false); }}>
                          <span className="r-icon">📩</span>
                          <div className="r-info">
                             <h4>{r.titulo}</h4>
                             <small>De: {r.mestre}</small>
                          </div>
                          <button className="btn-read-arrow">LER ➔</button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {/* MODAL DE LEITURA (PAPIRO) (NOVO - Igual ao MestrePage) */}
        {viewResenha && (
           <div className="papiro-overlay-full" onClick={() => setViewResenha(null)}>
              <div className="papiro-real-container" style={{backgroundImage: `url(${papiroImg})`}} onClick={e=>e.stopPropagation()}>
                 <div className="sanchez-oval-view-no-border" style={{backgroundImage: `url(${sanchezImg})`}}></div>
                 <h2 className="papiro-title-real">{viewResenha.titulo}</h2>
                 <p className="papiro-mestre-sub">Narrador: {viewResenha.mestre}</p>
                 <div className="papiro-body-real" dangerouslySetInnerHTML={{ __html: viewResenha.conteudo.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}></div>
                 <button className="papiro-close-btn" onClick={() => setViewResenha(null)}>FECHAR</button>
              </div>
           </div>
        )}

      </div>

      <style>{`
        /* ESTRUTURA DE CAMADAS (LAYERS) */
        .jogador-container { 
            position: relative; 
            width: 100vw; 
            height: 100vh; 
            overflow: hidden; 
            background: #000; 
            font-family: 'Cinzel', serif; 
            color: white; 
        }

        .background-layer {
            position: absolute;
            top: 0; 
            left: 0;
            width: 100%;
            height: 100%;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            z-index: 0; 
        }

        .content-layer {
            position: relative;
            z-index: 10; 
            width: 100%;
            height: 100%;
        }

        /* ESTILOS DA INTERFACE */
        .loading-screen { 
            width: 100vw; height: 100vh; background: #000; color: #ffcc00; 
            display: flex; align-items: center; justify-content: center; 
            font-size: 24px; font-family: 'Cinzel', serif; 
        }

        .char-hud { 
            position: absolute; top: 20px; left: 20px; 
            display: flex; align-items: center; gap: 15px; 
            background: rgba(0,0,0,0.8); padding: 15px 25px; 
            border-radius: 50px; border: 1px solid #ffcc00; 
            box-shadow: 0 0 15px rgba(255,204,0,0.3); 
            backdrop-filter: blur(5px);
        }

        .avatar-circle { 
            width: 60px; height: 60px; 
            background: #222; border-radius: 50%; border: 2px solid #fff; 
        }

        .char-info h2 { 
            margin: 0; font-size: 20px; color: #fff; 
            text-transform: uppercase; letter-spacing: 1px; 
        }

        .char-meta { font-size: 12px; color: #00f2ff; font-weight: bold; }

        .active-sessions-banner { 
            position: absolute; top: 120px; left: 50%; transform: translateX(-50%); 
            background: rgba(20, 0, 0, 0.9); border: 2px solid #f00; padding: 20px; 
            border-radius: 8px; text-align: center; box-shadow: 0 0 30px #f00; 
            animation: pulseRed 2s infinite;
        }

        .session-entry-row { display: flex; gap: 20px; align-items: center; margin-top: 10px; justify-content: center; }

        .btn-enter-session { 
            background: #f00; color: #fff; border: none; padding: 10px 20px; 
            font-weight: bold; cursor: pointer; font-family: 'Cinzel', serif; font-size: 16px; 
        }

        .btn-enter-session:hover { background: #fff; color: #f00; }

        @keyframes pulseRed { 0% { box-shadow: 0 0 10px #f00; } 50% { box-shadow: 0 0 30px #f00; } 100% { box-shadow: 0 0 10px #f00; } }

        /* BOTÕES FLUTUANTES */
        .floating-mission-btn {
            position: fixed; bottom: 30px; left: 30px;
            width: 70px; height: 70px;
            border-radius: 50%;
            border: 2px solid #ffcc00;
            background: #000;
            color: #fff;
            font-size: 30px;
            cursor: pointer;
            z-index: 999;
            box-shadow: 0 0 15px rgba(0,0,0,0.8);
            transition: transform 0.2s, box-shadow 0.2s;
            display: flex; align-items: center; justify-content: center;
        }

        .floating-mission-btn:hover { transform: scale(1.1); box-shadow: 0 0 25px #ffcc00; }

        /* NOVO BOTÃO SANCHEZ */
        .floating-sanchez-btn {
            position: fixed; bottom: 110px; left: 30px; /* Acima do botão de missão */
            width: 70px; height: 70px;
            border-radius: 50%;
            border: 2px solid #00f2ff;
            background: #000;
            cursor: pointer;
            z-index: 999;
            box-shadow: 0 0 15px rgba(0,242,255,0.5);
            transition: transform 0.2s;
            display: flex; align-items: center; justify-content: center;
            overflow: visible;
        }
        .floating-sanchez-btn:hover { transform: scale(1.1); box-shadow: 0 0 25px #00f2ff; }
        
        .sanchez-icon-face {
            width: 100%; height: 100%;
            border-radius: 50%;
            background-size: cover;
            background-position: center;
        }
        .notification-badge {
            position: absolute; top: -5px; right: -5px;
            background: #f00; color: #fff;
            border-radius: 50%; width: 24px; height: 24px;
            font-size: 12px; font-weight: bold;
            display: flex; align-items: center; justify-content: center;
            border: 2px solid #fff;
        }

        /* MODAIS */
        .ff-modal-overlay-flex {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.85); z-index: 99999;
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(10px);
        }

        .ff-modal-content {
            width: 600px; max-width: 95vw; max-height: 85vh;
            background: #0d0d15; border: 2px solid #ffcc00; padding: 25px;
            border-radius: 8px; box-shadow: 0 0 50px rgba(0,0,0,0.9);
            overflow-y: auto; display: flex; flex-direction: column;
        }

        .modal-header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #444; padding-bottom: 10px; margin-bottom: 15px; }
        .modal-title-ff { color: #ffcc00; margin: 0; font-size: 22px; letter-spacing: 2px; }
        .btn-close-x { background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; }
        .btn-close-x:hover { color: #f00; }

        .missions-list-player { display: grid; grid-template-columns: 1fr; gap: 15px; }
        .mission-poster-player { background: rgba(255,255,255,0.05); border: 1px solid #444; padding: 15px; border-radius: 4px; position: relative; }
        .mp-header { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 8px; }
        .mp-rank { font-size: 24px; font-weight: bold; color: #ffcc00; }
        .mp-details p { margin: 4px 0; font-size: 14px; color: #ccc; }
        .mp-desc { font-style: italic; color: #aaa; margin-top: 8px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        
        .btn-candidatar { width: 100%; margin-top: 15px; background: #00f2ff; color: #000; font-weight: bold; border: none; padding: 10px; cursor: pointer; transition: 0.3s; }
        .btn-candidatar:hover:not(:disabled) { background: #fff; box-shadow: 0 0 10px #00f2ff; }
        .btn-candidatar:disabled { background: #333; color: #666; cursor: not-allowed; }
        
        .candidates-box { margin-top: 10px; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; }
        .cand-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
        .cand-tag { font-size: 11px; padding: 2px 6px; background: #222; border: 1px solid #444; border-radius: 3px; color: #ddd; }
        .cand-tag.leader { border-color: #ffcc00; color: #ffcc00; }
        
        /* ESTILOS DA LISTA DE RESENHAS */
        .resenhas-list-container { display: flex; flex-direction: column; gap: 10px; }
        .resenha-row-player { display: flex; align-items: center; background: rgba(255,255,255,0.05); border: 1px solid #333; padding: 15px; border-radius: 4px; cursor: pointer; transition: 0.2s; }
        .resenha-row-player:hover { background: rgba(255,255,255,0.1); border-color: #ffcc00; }
        .r-icon { font-size: 24px; margin-right: 15px; }
        .r-info { flex: 1; }
        .r-info h4 { margin: 0; color: #ffcc00; font-size: 16px; }
        .r-info small { color: #aaa; }
        .btn-read-arrow { background: none; border: none; color: #00f2ff; font-weight: bold; cursor: pointer; }

        /* PAPIRO VIEW (Igual ao Mestre) */
        .papiro-overlay-full { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 100000; display: flex; align-items: center; justify-content: center; }
        .papiro-real-container { width: 1000px; height: 800px; max-width: 95vw; max-height: 95vh; background-size: 100% 100%; background-repeat: no-repeat; padding: 110px 160px; color: #3b2b1a; position: relative; display: flex; flex-direction: column; }
        .sanchez-oval-view-no-border { width: 110px; height: 110px; float: right; border-radius: 50%; background-size: cover; margin-left: 20px; mask-image: radial-gradient(circle, black 60%, transparent 100%); -webkit-mask-image: radial-gradient(circle, black 60%, transparent 100%); opacity: 0.9; }
        .papiro-title-real { border-bottom: 2px solid #3b2b1a; padding-bottom: 5px; margin-top: 0; font-size: 32px; font-weight: bold; }
        .papiro-mestre-sub { font-size: 14px; font-style: italic; opacity: 0.8; margin-top: 5px; }
        .papiro-body-real { margin-top: 25px; flex: 1; overflow-y: auto; line-height: 1.6; font-size: 18px; padding-right: 10px; scrollbar-width: none; -ms-overflow-style: none; }
        .papiro-body-real::-webkit-scrollbar { display: none; }
        .papiro-close-btn { position: absolute; bottom: 45px; right: 110px; background: #3b2b1a; color: #f4e4bc; border: none; padding: 8px 20px; cursor: pointer; font-weight: bold; font-size: 13px; border-radius: 2px; }

        .fade-in { animation: fadeIn 1s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}