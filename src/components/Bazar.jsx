import React, { useState } from 'react';

export default function Bazar({ mode }) {
  // mode: 'mestre' (gerencia) ou 'jogador' (compra)
  return (
    <div className="bazar-box">
      <h4>BAZAR DE ITENS</h4>
      {/* Aqui vai o mapeamento de itens do Firestore */}
      {mode === 'mestre' && <button>ADICIONAR ITEM</button>}
      
      <style>{`
        .bazar-box { border: 1px dashed #555; padding: 15px; margin-top: 20px; }
        h4 { font-size: 12px; color: #00f2ff; margin-bottom: 10px; }
      `}</style>
    </div>
  );
}