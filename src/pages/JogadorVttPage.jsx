import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, arrayUnion, getDocs } from "firebase/firestore";
import fundoJogador from '../assets/fundo-jogador.jpg';
import Bazar from '../components/Bazar';

export default function JogadorVttPage() {
  const [personagem, setPersonagem] = useState(null);
  const [missoes, setMissoes] = useState([]);
  const [sessoesAtivas, setSessoesAtivas] = useState([]);
  const [showMissionModal, setShowMissionModal] = useState(false);
  
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

  // --- CARREGAR MISSÕES E SESSÕES ---
  useEffect(() => {
    if (!auth.currentUser || !personagem) return;

    // 1. Ouvir Missões Disponíveis
    const qMissoes = query(collection(db, "missoes"));
    const unsubMissoes = onSnapshot(qMissoes, (snap) => {
      setMissoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Ouvir Sessões onde o jogador foi incluído
    // O Mestre adiciona o NOME do personagem ou UID no array 'participantes'
    const qSessoes = query(collection(db, "sessoes"), where("participantes", "array-contains", personagem.name));
    const unsubSessoes = onSnapshot(qSessoes, (snap) => {
      const agora = new Date();
      const sessoesValidas = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => {
        const inicio = new Date(s.dataInicio);
        const fim = new Date(s.expiraEm);
        return agora >= inicio && agora <= fim; // Só mostra se estiver no horário
      });
      setSessoesAtivas(sessoesValidas);
    });

    return () => { unsubMissoes(); unsubSessoes(); };
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
    // Aqui redirecionaria para a rota do VTT real
    alert(`Entrando na sessão: ${sessao.missaoNome}\nBom jogo, ${personagem.name}!`);
    // navigate(`/vtt/${sessao.id}`);
  };

  if (!personagem) return <div className="loading-screen">Carregando Grimório...</div>;

  return (
    <div className="jogador-container">
      <div className="jogador-bg" style={{backgroundImage: `url(${fundoJogador})`}}></div>
      
      {/* HUD SUPERIOR: STATUS DO PERSONAGEM */}
      <div className="char-hud">
        <div className="char-avatar">
           {/* Imagem do personagem ou placeholder da classe */}
           <div className="avatar-circle">{personagem.name.charAt(0)}</div>
        </div>
        <div className="char-info">
           <h2 className="char-name">{personagem.name}</h2>
           <span className="char-meta">{personagem.race} // {personagem.class}</span>
        </div>
      </div>

      {/* ÁREA CENTRAL: SESSÕES ATIVAS (Prioridade) */}
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

      {/* BOTÕES INFERIORES */}
      <div className="bottom-dock">
        <button className="dock-btn mission-btn" onClick={() => setShowMissionModal(true)}>
           📜 QUADRO DE MISSÕES
        </button>
        <div className="dock-spacer"></div>
        {/* O Bazar já tem seu botão flutuante, mas podemos integrá-lo aqui se quiser, ou deixar ele renderizar seu próprio botão */}
        <Bazar isMestre={false} /> 
      </div>

      {/* MODAL DO QUADRO DE MISSÕES */}
      {showMissionModal && (
        <div className="ff-modal-overlay-fixed" onClick={() => setShowMissionModal(false)}>
           <div className="ff-modal-scrollable ff-card" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title-ff">QUADRO DE CONTRATOS</h3>
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
                      
                      {/* Lista de Candidatos */}
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
                 {missoes.length === 0 && <p>Nenhum contrato disponível no momento.</p>}
              </div>
              <button className="btn-close-modal" onClick={() => setShowMissionModal(false)}>FECHAR QUADRO</button>
           </div>
        </div>
      )}

      <style>{`
        .jogador-container { width: 100vw; height: 100vh; position: relative; overflow: hidden; font-family: 'Cinzel', serif; color: white; }
        .jogador-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; z-index: -1; }
        
        .char-hud { position: absolute; top: 20px; left: 20px; display: flex; align-items: center; gap: 15px; background: rgba(0,0,0,0.7); padding: 15px 25px; border-radius: 50px; border: 1px solid #ffcc00; box-shadow: 0 0 15px rgba(255,204,0,0.3); }
        .avatar-circle { width: 60px; height: 60px; background: #222; border-radius: 50%; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #ffcc00; }
        .char-info h2 { margin: 0; font-size: 20px; color: #fff; text-transform: uppercase; letter-spacing: 1px; }
        .char-meta { font-size: 12px; color: #00f2ff; font-weight: bold; }

        .active-sessions-banner { position: absolute; top: 120px; left: 50%; transform: translateX(-50%); background: rgba(20, 0, 0, 0.9); border: 2px solid #f00; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 0 30px #f00; animation: pulseRed 2s infinite; }
        .session-entry-row { display: flex; gap: 20px; align-items: center; margin-top: 10px; justify-content: center; }
        .btn-enter-session { background: #f00; color: #fff; border: none; padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Cinzel', serif; font-size: 16px; }
        .btn-enter-session:hover { background: #fff; color: #f00; }
        @keyframes pulseRed { 0% { box-shadow: 0 0 10px #f00; } 50% { box-shadow: 0 0 30px #f00; } 100% { box-shadow: 0 0 10px #f00; } }

        .bottom-dock { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; gap: 30px; align-items: flex-end; }
        .dock-btn { background: linear-gradient(to top, #3a2205, #5c3a0b); border: 2px solid #ffcc00; color: #ffcc00; padding: 15px 30px; font-size: 18px; font-weight: bold; cursor: pointer; border-radius: 8px; font-family: 'Cinzel', serif; text-shadow: 0 2px 0 #000; box-shadow: 0 5px 15px rgba(0,0,0,0.5); transition: 0.2s; }
        .dock-btn:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(255, 204, 0, 0.3); color: #fff; border-color: #fff; }
        
        /* Estilos do Modal de Missões (Player) */
        .missions-list-player { display: grid; grid-template-columns: 1fr; gap: 15px; margin-top: 20px; }
        .mission-poster-player { background: rgba(255,255,255,0.05); border: 1px solid #444; padding: 15px; border-radius: 4px; position: relative; }
        .mp-header { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 8px; }
        .mp-rank { font-size: 24px; font-weight: bold; color: #ffcc00; }
        .mp-details p { margin: 4px 0; font-size: 14px; color: #ccc; }
        .mp-desc { font-style: italic; color: #aaa; margin-top: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .btn-candidatar { width: 100%; margin-top: 15px; background: #00f2ff; color: #000; font-weight: bold; border: none; padding: 10px; cursor: pointer; transition: 0.3s; }
        .btn-candidatar:hover:not(:disabled) { background: #fff; box-shadow: 0 0 10px #00f2ff; }
        .btn-candidatar:disabled { background: #333; color: #666; cursor: not-allowed; }
        
        .candidates-box { margin-top: 10px; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; }
        .cand-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
        .cand-tag { font-size: 11px; padding: 2px 6px; background: #222; border: 1px solid #444; border-radius: 3px; color: #ddd; }
        .cand-tag.leader { border-color: #ffcc00; color: #ffcc00; }
        
        .btn-close-modal { width: 100%; background: #333; color: #fff; border: 1px solid #555; padding: 12px; margin-top: 20px; cursor: pointer; font-weight: bold; }
        .btn-close-modal:hover { background: #444; }
      `}</style>
    </div>
  );
}