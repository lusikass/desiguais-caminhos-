import { useState, useEffect } from 'react';
import { STATIC, COURSE_DATA, PROBABILITIES } from './data';
import { Trial, PreQuestionnaire, Choice, Phase } from './types';
import AdminPortal from './components/AdminPortal';
import ConsentScene from './components/ConsentScene';
import PreQuestionnaireScene from './components/PreQuestionnaireScene';
import RouletteScene from './components/RouletteScene';
import GamePhasesScene from './components/GamePhasesScene';
import SisuSuspenseScene from './components/SisuSuspenseScene';
import PostQuestionnaireScene from './components/PostQuestionnaireScene';
import ThanksScene from './components/ThanksScene';
import { generateAIPhase, generateAIVerdict } from './ai';
import { Sparkles, BarChart2 } from 'lucide-react';

export default function App() {
  // Config & State
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('bauhaus_api_key') || '');
  const [aiModel, setAiModel] = useState<string>(() => localStorage.getItem('bauhaus_ai_model') || 'deepseek-v4-flash');
  const [trials, setTrials] = useState<Trial[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('bauhaus_trials') || '[]');
    } catch {
      return [];
    }
  });

  const [activeScene, setActiveScene] = useState<'consent' | 'pre' | 'roulette' | 'game' | 'suspense' | 'post' | 'thanks'>('consent');
  const [adminOpen, setAdminOpen] = useState(false);

  // Participant Data
  const [trialId] = useState<string>(() => `PART_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  const [preData, setPreData] = useState<PreQuestionnaire>({ p1: '', p2: '', p3: '' });
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [race, setRace] = useState<string>('');
  const [comorbidity, setComorbidity] = useState<string>('');
  const [stats, setStats] = useState({ c: 0, e: 0, r: 0 });
  const [phases, setPhases] = useState<Phase[]>([]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [choiceHistory, setChoiceHistory] = useState<any[]>([]);
  const [finalVerdict, setFinalVerdict] = useState<string>('');
  const [course, setCourse] = useState({ name: '', desc: '' });
  const [startTime] = useState<number>(() => Date.now());

  const handlePathReveal = async (key: string, gen: string, rc: string, com: string) => {
    const origin = STATIC[key];
    setSelectedPath(key);
    setGender(gen);
    setRace(rc);
    setComorbidity(com);

    // Dynamic Intersectional Modifiers
    const baseStats = { ...origin.stats };

    // 1. Gender modifiers
    if (gen === 'Feminino') baseStats.e += 8;
    if (gen === 'Trans/Não-binário') { baseStats.c -= 5; baseStats.e += 15; baseStats.r -= 5; }

    // 2. Race modifiers
    if (rc === 'Branco') { baseStats.c += 5; baseStats.r += 5; }
    if (rc === 'Pardo') { baseStats.c -= 3; baseStats.e += 5; baseStats.r -= 3; }
    if (rc === 'Preto') { baseStats.c -= 8; baseStats.e += 12; baseStats.r -= 8; }
    if (rc === 'Indígena') { baseStats.c -= 10; baseStats.e += 10; baseStats.r -= 10; }

    // 3. Comorbidity modifiers
    if (com === 'Deficiência Visual') { baseStats.c -= 5; baseStats.e += 18; baseStats.r -= 5; }
    if (com === 'Deficiência Auditiva') { baseStats.c -= 5; baseStats.e += 16; baseStats.r -= 5; }
    if (com === 'TDAH / TEA') { baseStats.c -= 5; baseStats.e += 20; baseStats.r -= 8; }
    if (com === 'Deficiência Física') { baseStats.c -= 5; baseStats.e += 14; baseStats.r -= 5; }

    // Clamp stats
    baseStats.c = Math.min(Math.max(Math.round(baseStats.c), 0), 100);
    baseStats.e = Math.min(Math.max(Math.round(baseStats.e), 0), 100);
    baseStats.r = Math.min(Math.max(Math.round(baseStats.r), 0), 100);

    setStats(baseStats);
    setPhaseIndex(0);
    setChoiceHistory([]);

    if (apiKey && apiKey.trim().length > 0) {
      const aiPhase = await generateAIPhase(apiKey, aiModel, origin.name, key, 0, origin.phases.length, baseStats, []);
      if (aiPhase) {
        const updated = [...origin.phases];
        updated[0] = aiPhase;
        setPhases(updated);
      } else {
        setPhases(origin.phases);
      }
    } else {
      setPhases(origin.phases);
    }

    setActiveScene('game');
  };

  const handleChoicePicked = async (choice: Choice, consequence: string | null) => {
    const nextIdx = phaseIndex + 1;
    const currentOrigin = STATIC[selectedPath];

    const updatedHistory = [
      ...choiceHistory,
      {
        phase: phaseIndex,
        choice: choice.n,
        delta: choice.m,
        tag: phases[phaseIndex]?.tag || 'Etapa',
        consequence
      }
    ];
    setChoiceHistory(updatedHistory);

    const newStats = {
      c: Math.min(Math.max(Math.round(stats.c + (choice.m.c || 0)), 0), 100),
      e: Math.min(Math.max(Math.round(stats.e + (choice.m.e || 0)), 0), 100),
      r: Math.min(Math.max(Math.round(stats.r + (choice.m.r || 0)), 0), 100),
    };
    setStats(newStats);

    if (nextIdx >= currentOrigin.phases.length) {
      setActiveScene('suspense');
      return;
    }

    if (apiKey && apiKey.trim().length > 0) {
      const aiPhase = await generateAIPhase(
        apiKey,
        aiModel,
        currentOrigin.name,
        selectedPath,
        nextIdx,
        currentOrigin.phases.length,
        newStats,
        updatedHistory
      );
      if (aiPhase) {
        const updated = [...phases];
        updated[nextIdx] = aiPhase;
        setPhases(updated);
      }
    }

    setPhaseIndex(nextIdx);
  };

  const handleSisuProcess = async () => {
    const courseProbabilities = PROBABILITIES[selectedPath] || PROBABILITIES.C;
    const courseKeys = Object.keys(courseProbabilities);

    const total = Object.values(courseProbabilities).reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    let finalCourseKey = courseKeys[courseKeys.length - 1];

    for (const [opt, w] of Object.entries(courseProbabilities)) {
      rand -= w;
      if (rand <= 0) {
        finalCourseKey = opt;
        break;
      }
    }

    const matchedCourse = {
      name: finalCourseKey,
      desc: COURSE_DATA[finalCourseKey] || 'Curso conquistado pelo candidato após avaliação de nota de corte.'
    };
    setCourse(matchedCourse);

    if (apiKey && apiKey.trim().length > 0) {
      const aiVerdict = await generateAIVerdict(
        apiKey,
        aiModel,
        STATIC[selectedPath]?.name || 'Origem Diversa',
        choiceHistory,
        stats
      );
      if (aiVerdict) {
        setFinalVerdict(aiVerdict);
      } else {
        setFinalVerdict('Seu histórico ilustra de forma nítida os desafios e gargalos que separam o ponto de partida individual dos resultados coletivos.');
      }
    } else {
      setFinalVerdict(`Trajetória social concluída com sucesso. Suas decisões ajudaram a moldar o resultado, porém seu ponto de partida de "${STATIC[selectedPath]?.name || 'Origem Diversa'}" foi determinante para definir as possibilidades e exaustão acumulada.`);
    }

    setActiveScene('post');
  };

  const handleFinishExperiment = (post: any) => {
    const currentOrigin = STATIC[selectedPath];
    const durationInSeconds = Math.floor((Date.now() - startTime) / 1000);

    const fullTrial: Trial = {
      id: trialId,
      timestamp: new Date().toISOString(),
      pre: preData,
      post,
      game: {
        path: currentOrigin?.name || 'Origem Desconhecida',
        pathKey: selectedPath,
        gender,
        race,
        comorbidity,
        aiMode: !!(apiKey && apiKey.trim().length > 0),
        choices: choiceHistory,
        finalStats: stats,
        course: course,
        verdict: finalVerdict
      },
      duration: durationInSeconds
    };

    const updatedTrials = [...trials, fullTrial];
    setTrials(updatedTrials);
    localStorage.setItem('bauhaus_trials', JSON.stringify(updatedTrials));

    setActiveScene('thanks');
  };

  const restartSimulation = () => {
    window.location.reload();
  };

  useEffect(() => {
    localStorage.setItem('bauhaus_trials', JSON.stringify(trials));
  }, [trials]);

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-sans flex flex-col justify-between pb-4 select-none">
      {/* Visual Header Top Bar */}
      <div className="h-2 bg-gradient-to-r from-[#c0392b] via-[#e8b84b] to-[#2c5f8a] border-b border-black select-none pointer-events-none" />

      {/* Dynamic Mobile/Desktop Stats HUD */}
      {selectedPath && (activeScene === 'game' || activeScene === 'post') && (
        <div className="bg-[#1e1e1e] border-b-2 border-black sticky top-0 z-40 px-4 md:px-8 py-3 flex flex-col md:flex-row justify-between items-stretch gap-3 md:items-center text-white select-text">
          <div className="flex flex-col">
            <span className="font-mono text-[9px] font-bold tracking-widest text-[#e8b84b] uppercase select-none leading-none">
              Trajetória Ativa
            </span>
            <span className="font-bold font-sans text-sm md:text-base leading-tight uppercase tracking-tight mt-0.5 select-none">
              {STATIC[selectedPath]?.name || 'Pesquisa Ativa'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 flex-1 max-w-xl md:justify-end select-none">
            <div className="flex flex-col gap-1 flex-1 min-w-[110px]">
              <div className="flex justify-between items-center text-[10px] font-mono tracking-wider font-bold uppercase select-none">
                <span className="text-[#7fb3d4]">Capital Cultural</span>
                <span>{stats.c}/100</span>
              </div>
              <div className="w-full h-2 bg-white/20 border border-black/30 overflow-hidden">
                <div className="h-full bg-[#7fb3d4] transition-all duration-500" style={{ width: `${stats.c}%` }} />
              </div>
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-[110px]">
              <div className="flex justify-between items-center text-[10px] font-mono tracking-wider font-bold uppercase select-none">
                <span className="text-[#c0392b]">Exaustão</span>
                <span>{stats.e}/100</span>
              </div>
              <div className="w-full h-2 bg-white/20 border border-black/30 overflow-hidden">
                <div className="h-full bg-[#c0392b] transition-all duration-500" style={{ width: `${stats.e}%` }} />
              </div>
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-[110px]">
              <div className="flex justify-between items-center text-[10px] font-mono tracking-wider font-bold uppercase select-none">
                <span className="text-[#e8b84b]">Rede Social</span>
                <span>{stats.r}/100</span>
              </div>
              <div className="w-full h-2 bg-white/20 border border-black/30 overflow-hidden">
                <div className="h-full bg-[#e8b84b] transition-all duration-500" style={{ width: `${stats.r}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Container */}
      <header className="max-w-6xl w-full mx-auto px-4 pt-6 md:pt-8 flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-black pb-4 select-text">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none text-black uppercase">
            Caminhos <span className="text-[#c0392b]">Desiguais</span>
          </h1>
          <p className="font-mono text-xs font-bold tracking-wider text-[#6b6560] uppercase mt-1">
            Lab. Comportamento Social & Mobilidade • v12.0
          </p>
          <div className="inline-flex items-center gap-2 bg-black text-[#e8b84b] border border-[#e8b84b] font-mono text-[9px] font-black uppercase tracking-widest px-2.5 py-1 mt-2.5 select-none animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-[#e8b84b]" />
            IA DeepSeek: {apiKey ? 'Ativa' : 'Inativa (Modo Estático)'}
          </div>
        </div>

        <button
          onClick={() => setAdminOpen(true)}
          className="flex items-center gap-2 font-mono font-bold text-[11px] bg-black text-white hover:bg-[#2c5f8a] border-2 border-black px-4 py-2 uppercase tracking-wider transform hover:-translate-y-0.5 transition cursor-pointer select-none"
        >
          <BarChart2 className="w-4 h-4" /> Admin / Dados da Pesquisa
        </button>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-4 py-6 md:py-10 flex flex-col flex-1">
        {activeScene === 'consent' && (
          <ConsentScene
            onAccept={() => setActiveScene('pre')}
            onReject={() => window.location.reload()}
            onOpenAdmin={() => setAdminOpen(true)}
            aiActive={!!apiKey}
          />
        )}

        {activeScene === 'pre' && (
          <PreQuestionnaireScene
            onSave={(data) => {
              setPreData(data);
              setActiveScene('roulette');
            }}
          />
        )}

        {activeScene === 'roulette' && (
          <RouletteScene
            onSpinEnd={(key, gen, rc, com) => handlePathReveal(key, gen, rc, com)}
          />
        )}

        {activeScene === 'game' && phases[phaseIndex] && (
          <GamePhasesScene
            phaseIndex={phaseIndex}
            totalPhases={phases.length}
            currentPhase={phases[phaseIndex]}
            stats={stats}
            originName={STATIC[selectedPath]?.name || ''}
            onChoicePicked={handleChoicePicked}
            aiActive={!!(apiKey && apiKey.trim().length > 0)}
            apiKey={apiKey}
            aiModel={aiModel}
          />
        )}

        {activeScene === 'suspense' && (
          <SisuSuspenseScene
            onComplete={handleSisuProcess}
          />
        )}

        {activeScene === 'post' && (
          <PostQuestionnaireScene
            finalStats={stats}
            course={course}
            originName={STATIC[selectedPath]?.name || ''}
            verdict={finalVerdict}
            onFinish={handleFinishExperiment}
          />
        )}

        {activeScene === 'thanks' && (
          <ThanksScene
            trialId={trialId}
            onRestart={restartSimulation}
          />
        )}
      </main>

      {/* Visual Footer */}
      <footer className="max-w-6xl w-full mx-auto px-4 border-t border-[#c8bfb0] pt-4 flex flex-col sm:flex-row justify-between items-center gap-2 font-mono text-[10px] text-[#6b6560] tracking-wider uppercase select-none">
        <span>ID do Participante: <strong className="text-black">{trialId}</strong></span>
        <span>Motor IA: <strong className="text-black">{apiKey ? 'DeepSeek Habilitado' : 'Simulação Estática'}</strong></span>
      </footer>

      {/* Admin / Config Portal */}
      {adminOpen && (
        <AdminPortal
          apiKey={apiKey}
          setApiKey={setApiKey}
          aiModel={aiModel}
          setAiModel={setAiModel}
          trials={trials}
          setTrials={setTrials}
          onClose={() => setAdminOpen(false)}
        />
      )}
    </div>
  );
}
