import React, { useState, useEffect, useRef } from 'react';
import { simMatch, simSeason, simCareer } from './engine/index';
import { createDefaultPlayer } from './engine/player';
import { Player, LogType } from './engine/types';

interface LogEntry {
  message: string;
  type: LogType;
  id: number;
}

const App: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [player, setPlayer] = useState<Player | null>(null);
  
  // UI States
  const [isSimulating, setIsSimulating] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [careerSeasons, setCareerSeasons] = useState(3);
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPlayer(createDefaultPlayer());
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = async (message: string, type: LogType = LogType.INFO) => {
    setLogs(prev => [...prev, { message, type, id: Date.now() + Math.random() }]);
    // No artificial delay needed for batch processing, UI updates naturally
  };

  // --- ACTIONS ---
  const handleMatch = async () => {
    if (isSimulating || !player) return;
    setIsSimulating(true);
    try {
      const updated = await simMatch(addLog, player);
      setPlayer({ ...updated }); // Spread to force re-render
    } catch(e) { console.error(e); }
    setIsSimulating(false);
  };

  const handleSeason = async () => {
    if (isSimulating || !player) return;
    setIsSimulating(true);
    try {
      const updated = await simSeason(addLog, player);
      setPlayer({ ...updated });
    } catch(e) { console.error(e); }
    setIsSimulating(false);
  };

  const handleCareer = async () => {
    if (isSimulating || !player) return;
    setIsSimulating(true);
    try {
      const updated = await simCareer(addLog, player, careerSeasons);
      setPlayer({ ...updated });
    } catch(e) { console.error(e); }
    setIsSimulating(false);
  };

  const confirmReset = () => {
    setPlayer(createDefaultPlayer());
    setLogs([]);
    addLog("⚠️ Carrera reiniciada con éxito.", LogType.INFO);
    setShowResetModal(false);
  };

  // --- HELPERS ---
  const getLogColor = (type: LogType) => {
    switch (type) {
      case LogType.MATCH: return 'text-blue-300';
      case LogType.SEASON: return 'text-yellow-300 font-bold border-t border-gray-700 pt-2 mt-2';
      case LogType.INJURY: return 'text-red-400 font-bold';
      case LogType.AWARD: return 'text-amber-400 font-extrabold';
      default: return 'text-gray-300';
    }
  };

  const getTotalGoals = () => {
    if (!player) return 0;
    const past = player.carrera.historial.resumenesTemporadas.reduce((acc, s) => acc + s.stats.goles, 0);
    return past + player.carrera.estadisticasTemporada.goles;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 font-sans relative">
      
      {/* LOADER OVERLAY */}
      {isSimulating && (
        <div className="absolute inset-0 bg-black/70 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-emerald-400 font-bold text-xl animate-pulse">Simulando...</div>
        </div>
      )}

      {/* RESET MODAL */}
      {showResetModal && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-6 rounded-lg border border-red-500/50 shadow-2xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-white mb-2">¿Reiniciar Carrera?</h3>
            <p className="text-gray-400 mb-6 text-sm">Perderás todo el progreso actual. Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowResetModal(false)} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600">Cancelar</button>
              <button onClick={confirmReset} className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 font-bold">Confirmar Reset</button>
            </div>
          </div>
        </div>
      )}

      <header className="max-w-7xl mx-auto mb-6 flex justify-between items-center border-b border-gray-700 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-emerald-500">Football RPG <span className="text-xs text-gray-500 align-top">v2.0</span></h1>
        </div>
        {player && (
           <div className="text-right">
             <div className="text-white font-bold">{player.personal.nombre}</div>
             <div className="text-xs text-emerald-400">{player.carrera.club} | Temp {player.carrera.temporada}</div>
           </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: CONTROLS (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
            <h2 className="text-xs font-bold text-gray-500 uppercase mb-4">Centro de Mando</h2>
            
            <button onClick={handleMatch} disabled={isSimulating} className="w-full btn-action mb-2 bg-blue-600 hover:bg-blue-500">
              ⚽ Simular 1 Partido
            </button>
            
            <button onClick={handleSeason} disabled={isSimulating} className="w-full btn-action mb-4 bg-indigo-600 hover:bg-indigo-500">
              📅 {player?.carrera.estadisticasTemporada.partidosJugados === 0 ? "Simular Temporada" : "Terminar Temporada"}
            </button>
            
            <div className="bg-gray-900 p-3 rounded mb-4">
              <label className="text-xs text-gray-400 block mb-1">Multitemporada</label>
              <div className="flex gap-2">
                <select 
                  value={careerSeasons} 
                  onChange={(e) => setCareerSeasons(Number(e.target.value))}
                  className="bg-gray-700 text-white text-sm rounded px-2 py-1 flex-1"
                >
                  <option value={2}>2 Temp</option>
                  <option value={3}>3 Temp</option>
                  <option value={4}>4 Temp</option>
                  <option value={5}>5 Temp</option>
                </select>
                <button onClick={handleCareer} disabled={isSimulating} className="btn-action bg-emerald-600 hover:bg-emerald-500 flex-1 text-xs">
                  ▶ Go
                </button>
              </div>
            </div>

            <button onClick={() => setShowResetModal(true)} disabled={isSimulating} className="w-full btn-action bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-900">
              ⚠️ Reset Carrera
            </button>
          </div>

          {/* MINI INFO */}
          {player && (
             <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
               <div className="text-xs text-gray-400 uppercase mb-2">Estado Actual</div>
               <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Edad: <span className="text-white">{player.personal.edad}</span></div>
                  <div>Media: <span className="text-blue-400">{player.carrera.estadisticasTemporada.valoracionMedia.toFixed(1)}</span></div>
                  <div>Goles Tot: <span className="text-green-400">{getTotalGoals()}</span></div>
                  <div>Jornada: <span className="text-yellow-400">{player.carrera.estadisticasTemporada.partidosJugados}</span></div>
               </div>
             </div>
          )}
        </div>

        {/* CENTER: LOGS (6 cols) */}
        <div className="lg:col-span-6 h-[600px] flex flex-col bg-black rounded-lg border border-gray-800 overflow-hidden shadow-2xl">
          <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex justify-between items-center">
            <span className="text-xs font-mono text-gray-500">SIMULATION LOG</span>
            <span className="text-xs text-gray-600">{logs.length} events</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs md:text-sm space-y-1 scrollbar-thin scrollbar-thumb-gray-800">
             {logs.length === 0 && <div className="text-gray-600 text-center mt-20">Esperando órdenes...</div>}
             {logs.map((log) => (
                <div key={log.id} className={`${getLogColor(log.type)}`}>
                  {log.type === LogType.MATCH && <span className="text-gray-600 mr-2">➜</span>}
                  {log.message}
                </div>
             ))}
             <div ref={logsEndRef} />
          </div>
        </div>

        {/* RIGHT: HISTORY/STATS (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
           <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 h-full overflow-y-auto max-h-[600px]">
             <h2 className="text-xs font-bold text-gray-500 uppercase mb-4 sticky top-0 bg-gray-800 pb-2">Historial Temporadas</h2>
             
             {player?.carrera.historial.resumenesTemporadas.length === 0 && (
               <div className="text-sm text-gray-500 italic">Aún no se ha completado ninguna temporada.</div>
             )}

             <div className="space-y-4">
               {player?.carrera.historial.resumenesTemporadas.map((s) => (
                 <div key={s.temporada} className="bg-gray-900 p-3 rounded border border-gray-800 text-sm">
                    <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-1">
                       <span className="font-bold text-yellow-500">Temp {s.temporada}</span>
                       <span className="text-gray-400">{s.club}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-center mb-2">
                       <div className="bg-gray-800 rounded p-1">
                          <div className="text-xs text-gray-500">Goles</div>
                          <div className="text-white font-bold">{s.stats.goles}</div>
                       </div>
                       <div className="bg-gray-800 rounded p-1">
                          <div className="text-xs text-gray-500">Asist</div>
                          <div className="text-white font-bold">{s.stats.asistencias}</div>
                       </div>
                       <div className="bg-gray-800 rounded p-1">
                          <div className="text-xs text-gray-500">Pos</div>
                          <div className="text-blue-400 font-bold">{s.posicionLiga}º</div>
                       </div>
                    </div>
                    {s.premios.length > 0 && (
                      <div className="text-xs text-amber-400 mt-1">
                        🏆 {s.premios.join(", ")}
                      </div>
                    )}
                 </div>
               ))}
             </div>
           </div>
        </div>

      </main>

      <style>{`
        .btn-action {
          @apply text-white font-bold py-3 px-4 rounded shadow transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm;
        }
      `}</style>
    </div>
  );
};

export default App;