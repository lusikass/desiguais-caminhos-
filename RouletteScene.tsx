import { useEffect, useState } from 'react';
import { ArrowRight, Shuffle, Sparkles, User, ShieldAlert } from 'lucide-react';

interface RouletteSceneProps {
  onSpinEnd: (pathKey: string, gender: string, race: string, comorbidity: string) => void;
}

export default function RouletteScene({ onSpinEnd }: RouletteSceneProps) {
  const [spinning, setSpinning] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [race, setRace] = useState<string>('');
  const [comorbidity, setComorbidity] = useState<string>('');
  const [revealReady, setRevealReady] = useState(false);

  const options = [
    { k: 'A', name: 'Elite Herdeira', color: 'text-[#2c5f8a]', desc: 'Origem privilegiada de alta renda e conexões sociais sólidas.' },
    { k: 'B', name: 'Classe Média Alta', color: 'text-[#2c5f8a]', desc: 'Boa infraestrutura educacional e apoio familiar constante.' },
    { k: 'C', name: 'Base Vulnerável', color: 'text-[#c0392b]', desc: 'Recursos escassos, trabalho juvenil precoce e desafios constantes.' },
    { k: 'D', name: 'Classe Média Baixa', color: 'text-[#e8b84b]', desc: 'Sustento moderado, conciliação entre estudos e apoio familiar.' },
    { k: 'E', name: 'Classe Baixa Extrema', color: 'text-[#c0392b]', desc: 'Barreiras severas de sobrevivência, baixa infraestrutura escolar.' }
  ];

  const genderOptions = ['Masculino', 'Feminino', 'Trans/Não-binário'];
  const raceOptions = ['Branco', 'Pardo', 'Preto', 'Indígena', 'Amarelo'];
  const comorbidityOptions = [
    'Nenhuma',
    'Deficiência Visual',
    'Deficiência Auditiva',
    'TDAH / TEA',
    'Deficiência Física'
  ];

  useEffect(() => {
    // 1. Origem socioeconomic draw weights
    const keys = ['A', 'B', 'C', 'D', 'E'];
    const weights = [10, 20, 35, 25, 10];

    const pickWeighted = () => {
      const total = weights.reduce((a, b) => a + b, 0);
      let rand = Math.random() * total;
      for (let i = 0; i < keys.length; i++) {
        rand -= weights[i];
        if (rand <= 0) return keys[i];
      }
      return keys[keys.length - 1];
    };

    // 2. Race weights (Brazilian demographic estimates for higher contrast)
    const raceWeights = [43, 47, 9, 0.5, 0.5]; // Branco, Pardo, Preto, Indígena, Amarelo
    const pickRace = () => {
      const total = raceWeights.reduce((a, b) => a + b, 0);
      let rand = Math.random() * total;
      for (let i = 0; i < raceOptions.length; i++) {
        rand -= raceWeights[i];
        if (rand <= 0) return raceOptions[i];
      }
      return raceOptions[raceOptions.length - 1];
    };

    // 3. Gender weights (simple balance with trans representation)
    const genderWeights = [48.5, 49.5, 2.0];
    const pickGender = () => {
      const total = genderWeights.reduce((a, b) => a + b, 0);
      let rand = Math.random() * total;
      for (let i = 0; i < genderOptions.length; i++) {
        rand -= genderWeights[i];
        if (rand <= 0) return genderOptions[i];
      }
      return genderOptions[genderOptions.length - 1];
    };

    // 4. Comorbidities weights (majority has none, some have conditions)
    const comWeights = [85, 3, 3, 6, 3];
    const pickComorbidity = () => {
      const total = comWeights.reduce((a, b) => a + b, 0);
      let rand = Math.random() * total;
      for (let i = 0; i < comorbidityOptions.length; i++) {
        rand -= comWeights[i];
        if (rand <= 0) return comorbidityOptions[i];
      }
      return comorbidityOptions[comorbidityOptions.length - 1];
    };

    setSelectedKey(pickWeighted());
    setRace(pickRace());
    setGender(pickGender());
    setComorbidity(pickComorbidity());

    // Roll/Spin effects
    const timeout = setTimeout(() => {
      setSpinning(false);
      setRevealReady(true);
    }, 3200);

    return () => clearTimeout(timeout);
  }, []);

  const currentOption = options.find(o => o.k === selectedKey) || options[0];

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#fdfaf4] border-4 border-black p-6 md:p-10 shadow-[8px_8px_0px_#1e1e1e] flex flex-col items-center justify-center text-center gap-6 animate-fadeIn min-h-[460px]">
      <div className="flex flex-col items-center">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#6b6560]">
          Sorteio de Identidade & Condição Social
        </p>
        <p className="text-sm font-sans font-medium text-black max-w-md mt-1 leading-relaxed">
          O ponto de partida é determinado por múltiplas dimensões que moldam os desafios de mobilidade social.
        </p>
      </div>

      <div className="relative w-40 h-40 flex items-center justify-center select-none">
        {spinning ? (
          <>
            <div className="absolute inset-0 border-8 border-black border-t-[#c0392b] border-r-[#e8b84b] border-b-[#2c5f8a] rounded-full animate-spin" />
            <div className="absolute inset-4 border-4 border-black border-dashed rounded-full animate-ping opacity-40" />
            <Shuffle className="w-10 h-10 text-black animate-pulse" />
          </>
        ) : (
          <div className="flex items-center justify-center w-full h-full border-8 border-black bg-white rounded-full text-5xl font-black text-black select-none animate-bounce">
            {selectedKey}
          </div>
        )}
      </div>

      {revealReady && (
        <div className="flex flex-col items-center gap-4 animate-scaleUp w-full">
          <div className="flex flex-col items-center border-2 border-black p-4 bg-white w-full shadow-[4px_4px_0_#1e1e1e]">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#6b6560]">
              Sua Origem Socioeconômica:
            </span>
            <h3 className={`text-2xl md:text-3xl font-black uppercase tracking-tight mt-1 ${currentOption.color}`}>
              {currentOption.name}
            </h3>
            <p className="text-xs font-sans font-bold text-neutral-600 max-w-md mt-1 leading-normal border-b-2 border-black/10 pb-2 mb-2 w-full">
              {currentOption.desc}
            </p>

            {/* Intersectional Demographics Revealed */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left mt-1">
              <div className="bg-[#f4f1ea] border border-black p-2.5 flex flex-col justify-between">
                <span className="font-mono text-[9px] font-bold text-[#6b6560] uppercase tracking-wider block">
                  Identidade de Gênero
                </span>
                <span className="font-black text-base uppercase text-[#c0392b] mt-0.5 break-words flex items-center gap-1.5 leading-tight">
                  <User className="w-3.5 h-3.5 flex-shrink-0" />
                  {gender}
                </span>
              </div>

              <div className="bg-[#f4f1ea] border border-black p-2.5 flex flex-col justify-between">
                <span className="font-mono text-[9px] font-bold text-[#6b6560] uppercase tracking-wider block">
                  Raça / Etnia
                </span>
                <span className="font-black text-base uppercase text-[#2c5f8a] mt-0.5 break-words flex items-center gap-1.5 leading-tight">
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                  {race}
                </span>
              </div>

              <div className="bg-[#f4f1ea] border border-black p-2.5 flex flex-col justify-between">
                <span className="font-mono text-[9px] font-bold text-[#6b6560] uppercase tracking-wider block">
                  Comorbidades / Deficiências
                </span>
                <span className="font-black text-base uppercase text-black mt-0.5 break-words flex items-center gap-1.5 leading-tight">
                  <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                  {comorbidity}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSpinEnd(selectedKey, gender, race, comorbidity)}
            className="flex items-center justify-center gap-2 bg-black text-white border-4 border-black font-black uppercase text-sm tracking-widest px-8 py-3.5 hover:bg-[#c0392b] transform hover:-translate-y-1 hover:shadow-[4px_4px_0_#1e1e1e] active:translate-y-0.5 transition cursor-pointer mt-1"
          >
            Prosseguir Trajetória <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
