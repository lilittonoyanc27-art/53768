import React from 'react';
import { Question } from './types.ts';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Eye } from 'lucide-react';

interface RoscoWheelProps {
  questions: Question[];
  currentIndex: number;
  onSelectLetter: (index: number) => void;
  timeRemaining: number;
  isRunning: boolean;
  onToggleTimer: () => void;
  onResetGame: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
}

export const RoscoWheel: React.FC<RoscoWheelProps> = ({
  questions,
  currentIndex,
  onSelectLetter,
  timeRemaining,
  isRunning,
  onToggleTimer,
  onResetGame,
  soundOn,
  onToggleSound,
}) => {
  const total = questions.length;
  // Radius percentage from center (50, 50)
  const radius = 41.5;

  const correctCount = questions.filter((q) => q.status === 'correct').length;
  const incorrectCount = questions.filter((q) => q.status === 'incorrect').length;
  const remainingCount = questions.filter((q) => q.status === 'unanswered' || q.status === 'passed').length;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemaining <= 120 && timeRemaining > 0;

  return (
    <div className="relative w-full max-w-[540px] aspect-square mx-auto flex items-center justify-center p-2 select-none">
      {/* Background radial studio ambient glow */}
      <div className="absolute inset-4 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
      <div className="absolute inset-14 rounded-full border border-blue-500/20 pointer-events-none" />
      <div className="absolute inset-20 rounded-full border border-blue-400/10 pointer-events-none" />

      {/* The 27 Rosco Letter Badges */}
      {questions.map((q, index) => {
        // Calculate angle: A starts at top (-90 degrees) and rotates clockwise
        const angleDeg = (index * 360) / total - 90;
        const angleRad = (angleDeg * Math.PI) / 180;
        const x = 50 + radius * Math.cos(angleRad);
        const y = 50 + radius * Math.sin(angleRad);
        const isActive = index === currentIndex;

        let bgColor = 'bg-gradient-to-b from-blue-500 to-blue-700 border-blue-300/60 text-white shadow-blue-500/40';
        let statusBadge = null;

        if (q.status === 'correct') {
          bgColor = 'bg-gradient-to-b from-emerald-400 to-emerald-600 border-emerald-200 text-white shadow-emerald-500/60';
          statusBadge = '✓';
        } else if (q.status === 'incorrect') {
          bgColor = 'bg-gradient-to-b from-red-500 to-red-700 border-red-300 text-white shadow-red-500/60';
          statusBadge = '✕';
        } else if (q.status === 'passed') {
          bgColor = 'bg-gradient-to-b from-amber-400 to-amber-600 border-amber-200 text-white shadow-amber-500/50';
          statusBadge = '⋯';
        }

        return (
          <button
            key={q.letter}
            onClick={() => onSelectLetter(index)}
            aria-label={`Letter ${q.letter}, status: ${q.status}`}
            title={`Տառ ${q.letter} (${q.categoryLabelArm}) - ${q.status}`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center font-extrabold cursor-pointer transition-all duration-300 border-2 shadow-lg ${bgColor} ${
              isActive
                ? 'w-10 h-10 sm:w-12 sm:h-12 z-20 scale-125 ring-4 ring-cyan-300 rosco-active-glow shadow-cyan-400/80 brightness-110'
                : 'w-7 h-7 sm:w-9 sm:h-9 z-10 hover:scale-110 hover:brightness-125'
            }`}
          >
            <span className={`${isActive ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'} tracking-wider drop-shadow`}>
              {q.letter}
            </span>

            {/* Small status indicator mark on the badge */}
            {statusBadge && !isActive && (
              <span className="absolute -bottom-1 -right-1 text-[8px] sm:text-[10px] w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-slate-900 border border-white/50 flex items-center justify-center font-bold">
                {statusBadge}
              </span>
            )}

            {/* Eye icon tag if answer was inspected without failing */}
            {q.revealedAnswer && q.status !== 'correct' && q.status !== 'incorrect' && (
              <span className="absolute -top-1 -right-1 text-[9px] w-3 h-3 rounded-full bg-indigo-600 border border-white/70 flex items-center justify-center" title="Պատասխանը դիտված է">
                <Eye className="w-2 h-2 text-white" />
              </span>
            )}
          </button>
        );
      })}

      {/* Center of the Rosco: Timer, Score Badges, and Current Target */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center p-3 sm:p-5 rounded-full bg-slate-950/70 border border-blue-500/30 backdrop-blur-md shadow-2xl max-w-[240px] sm:max-w-[270px] aspect-square w-full">
        {/* TV Show Contestant Style Letter Header */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-blue-900/80 text-blue-200 border border-blue-400/30">
            {questions[currentIndex]?.category === 'football' ? '⚽ Ֆուտբոլ' : '✈️ Ճամփորդություն'}
          </span>
          <span className="text-xs text-blue-300 font-mono font-medium">
            #{currentIndex + 1}/27
          </span>
        </div>

        {/* Large Active Letter */}
        <div className="flex items-baseline justify-center gap-1 my-0.5">
          <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-200 to-indigo-300 drop-shadow-sm">
            {questions[currentIndex]?.letter}
          </span>
        </div>

        {/* Countdown Timer Display (30:00) */}
        <div className={`font-mono text-2xl sm:text-3xl font-black tracking-tight my-1 transition-colors ${
          isLowTime ? 'text-red-400 animate-pulse' : 'text-white'
        }`}>
          {formatTime(timeRemaining)}
        </div>

        {/* Score Badges exactly styled like the TV show (Green Aciertos & Red Fallos) */}
        <div className="flex items-center justify-center gap-3 my-1.5">
          {/* Green Acertadas */}
          <div className="flex items-center gap-1 bg-emerald-950/80 border border-emerald-500/50 rounded-full px-2.5 py-0.5 text-emerald-300 text-xs sm:text-sm font-bold shadow-sm shadow-emerald-900/50" title="Ճիշտ պատասխաններ">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>{correctCount}</span>
            <span className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-normal">ճիշտ</span>
          </div>

          {/* Red/Orange Fallos */}
          <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/50 rounded-full px-2.5 py-0.5 text-red-300 text-xs sm:text-sm font-bold shadow-sm shadow-red-900/50" title="Սխալներ">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span>{incorrectCount}</span>
            <span className="text-[10px] uppercase tracking-wider text-red-400/80 font-normal">սխալ</span>
          </div>
        </div>

        {/* Remaining info */}
        {/* Remaining info */}
        <p className="text-[11px] text-slate-400 mb-1.5">
          Մնացել է՝ <strong className="text-blue-300">{remainingCount}</strong> հարց
        </p>

        {/* Dedicated Separate Start / Pause Button in Center */}
        <div className="w-full flex flex-col items-center gap-1.5 mt-0.5">
          <button
            onClick={onToggleTimer}
            className={`w-full max-w-[170px] py-1.5 px-3 rounded-full text-xs font-black shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isRunning
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-amber-500/30'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/40 animate-pulse'
            }`}
            title={isRunning ? 'Դադարեցնել ժամանակը' : 'Սկսել 30 րոպեի հետհաշվարկը'}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>ԴԱԴԱՐ (ПАУЗА)</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>ՍԿՍԵԼ / НАЧАТЬ</span>
              </>
            )}
          </button>

          {/* Quick Sound & Reset Icons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSound}
              className="p-1 rounded-full border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title={soundOn ? 'Անջատել ձայնը' : 'Միացնել ձայնը'}
            >
              {soundOn ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3 text-slate-500" />}
            </button>

            <button
              onClick={onResetGame}
              className="p-1 rounded-full border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Զրոյացնել ժամանակը (30:00)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
