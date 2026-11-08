import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_QUESTIONS, isAnswerMatch } from './questionsData.ts';
import { Question, QuestionStatus } from './types.ts';
import { RoscoWheel } from './RoscoWheel.tsx';
import {
  playCorrectSound,
  playIncorrectSound,
  playPassSound,
  playRevealSound,
  playVictorySound,
  speakSpanish,
  setSoundEnabled,
} from './audioUtils.ts';
import { launchConfetti } from './confetti.ts';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Volume1,
  Eye,
  CheckCircle2,
  XCircle,
  FastForward,
  HelpCircle,
  Trophy,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Send,
  Languages,
  Info,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const TOTAL_GAME_TIME = 30 * 60; // 30 minutes in seconds = 1800s

export default function App() {
  const [questions, setQuestions] = useState<Question[]>(() =>
    INITIAL_QUESTIONS.map((q) => ({ ...q }))
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(TOTAL_GAME_TIME);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(true);
  const [gameCompleted, setGameCompleted] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [alwaysShowTranslation, setAlwaysShowTranslation] = useState<boolean>(false);
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'game' | 'list'>('game');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'football' | 'travel'>('all');
  const [inputFeedback, setInputFeedback] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync sound settings
  useEffect(() => {
    setSoundEnabled(soundOn);
  }, [soundOn]);

  // Format MM:SS helper
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 30-Minute Timer interval - runs ONLY when isRunning is true!
  useEffect(() => {
    let timer: number | undefined;
    if (isRunning && !gameCompleted && timeRemaining > 0) {
      timer = window.setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsRunning(false);
            setGameCompleted(true);
            setShowSummaryModal(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, gameCompleted, timeRemaining]);

  // Check if all 27 questions are resolved
  useEffect(() => {
    if (gameCompleted) return;
    const allResolved = questions.every(
      (q) => q.status === 'correct' || q.status === 'incorrect'
    );
    if (allResolved) {
      setIsRunning(false);
      setGameCompleted(true);
      setShowSummaryModal(true);
      playVictorySound();
      launchConfetti();
    }
  }, [questions, gameCompleted]);

  const currentQ = questions[currentIndex] || questions[0];

  // Helper to find next unsolved index after current
  const getNextUnsolvedIndex = (fromIndex: number): number => {
    const total = questions.length;
    for (let step = 1; step <= total; step++) {
      const idx = (fromIndex + step) % total;
      if (questions[idx].status === 'unanswered' || questions[idx].status === 'passed') {
        return idx;
      }
    }
    return fromIndex;
  };

  // Helper to find previous index
  const getPrevIndex = (fromIndex: number): number => {
    return (fromIndex - 1 + questions.length) % questions.length;
  };

  // Dedicated separate Start / Pause Timer Toggle
  const handleToggleTimer = () => {
    if (!isRunning) {
      playCorrectSound(); // pleasant acoustic feedback when starting
    }
    setIsRunning((prev) => !prev);
  };

  // Reset timer back to 30:00 (stops timer)
  const handleResetTimer = () => {
    setIsRunning(false);
    setTimeRemaining(TOTAL_GAME_TIME);
  };

  // Reset entire game and timer
  const handleResetGame = () => {
    setIsRunning(false);
    setTimeRemaining(TOTAL_GAME_TIME);
    setQuestions(INITIAL_QUESTIONS.map((q) => ({ ...q })));
    setCurrentIndex(0);
    setGameCompleted(false);
    setShowSummaryModal(false);
    setTypedAnswer('');
    setInputFeedback(null);
  };

  // Toggle reveal Armenian translation on Spanish question click
  const handleToggleArmenianTranslation = (id: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, revealedArmenianQuestion: !q.revealedArmenianQuestion } : q
      )
    );
  };

  // Reveal Answer - WITHOUT penalizing or marking as incorrect!
  const handleRevealAnswer = () => {
    playRevealSound();
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === currentIndex ? { ...q, revealedAnswer: true } : q
      )
    );
  };

  // Mark answer as Correct (Acierto -> Green)
  const handleMarkCorrect = () => {
    playCorrectSound();
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === currentIndex ? { ...q, status: 'correct', revealedAnswer: true } : q
      )
    );
    setTypedAnswer('');
    setInputFeedback(null);
    goToNextQuestion();
  };

  // Mark answer as Incorrect (Fallo -> Red)
  const handleMarkIncorrect = () => {
    playIncorrectSound();
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === currentIndex ? { ...q, status: 'incorrect', revealedAnswer: true } : q
      )
    );
    setTypedAnswer('');
    setInputFeedback(null);
    goToNextQuestion();
  };

  // Pasapalabra (Pass to next unanswered/passed question)
  const handlePasapalabra = () => {
    playPassSound();
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === currentIndex && q.status === 'unanswered' ? { ...q, status: 'passed' } : q
      )
    );
    setTypedAnswer('');
    setInputFeedback(null);
    goToNextQuestion();
  };

  const goToNextQuestion = () => {
    const nextIdx = getNextUnsolvedIndex(currentIndex);
    setCurrentIndex(nextIdx);
  };

  // Check typed user answer (optional feature for typing practice)
  const handleCheckTypedAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!typedAnswer.trim()) return;

    const matched = isAnswerMatch(
      typedAnswer,
      currentQ.spanishAnswer,
      currentQ.armenianAnswer
    );

    if (matched) {
      setInputFeedback('🎉 Ճիշտ է! (¡Correcto!)');
      handleMarkCorrect();
    } else {
      setInputFeedback('⚠️ Չհամընկավ: Ստուգեք կամ դիտեք պատասխանը:');
      // Do not mark incorrect automatically unless user confirms
    }
  };

  const correctCount = questions.filter((q) => q.status === 'correct').length;
  const incorrectCount = questions.filter((q) => q.status === 'incorrect').length;
  const passedCount = questions.filter((q) => q.status === 'passed').length;
  const unansweredCount = questions.filter((q) => q.status === 'unanswered').length;

  const scorePercentage = Math.round((correctCount / questions.length) * 100);

  const filteredQuestions = questions.filter((q) => {
    if (categoryFilter === 'all') return true;
    return q.category === categoryFilter;
  });

  return (
    <div className="min-h-screen text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top TV Show Navigation Header */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-blue-900/40 px-3 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/30 flex items-center justify-center font-black text-white text-lg tracking-wider">
              <span>P</span>
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-cyan-200 to-white flex items-center gap-1.5">
                PASAPALABRA <span className="text-xs px-2 py-0.5 rounded bg-blue-900/60 border border-blue-500/40 text-blue-300 font-medium">Էլ Ռոսկո</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block">
                27 հարց՝ ֆուտբոլ և ճանապարհորդություն ⚽✈️ (Իսպաներեն / Հայերեն)
              </p>
            </div>
          </div>

          {/* Right Header Navigation / Controls */}
          <div className="flex items-center gap-2">
            {/* Dedicated Separate Timer Start/Pause Button in Header */}
            <button
              onClick={handleToggleTimer}
              className={`px-3 py-1.5 rounded-lg font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg transition-all cursor-pointer ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30'
                  : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/50 ring-2 ring-emerald-300/40 animate-pulse'
              }`}
              title={isRunning ? 'Դադարեցնել ժամանակը (Пауза)' : 'Սկսել 30 րոպեի հետհաշվարկը (Начать)'}
            >
              {isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span className="font-mono">{formatTime(timeRemaining)}</span>
                  <span className="hidden sm:inline">• ԴԱԴԱՐ</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>▶️ ՍԿՍԵԼ / НАЧАТЬ ({formatTime(timeRemaining)})</span>
                </>
              )}
            </button>

            {/* View Switcher: Game or Full List */}
            <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('game')}
                className={`px-2.5 py-1 rounded-md transition ${
                  activeTab === 'game'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🎮 Խաղ
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={`px-2.5 py-1 rounded-md transition ${
                  activeTab === 'list'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📋 27 Հարց
              </button>
            </div>

            {/* Rules Modal Button */}
            <button
              onClick={() => setShowRulesModal(true)}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
              title="Կանոններ և հրահանգներ"
            >
              <HelpCircle className="w-4 h-4 text-cyan-300" />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundOn(!soundOn)}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
              title={soundOn ? 'Անջատել ձայնը' : 'Միացնել ձայնը'}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Restart button */}
            <button
              onClick={handleResetGame}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition"
              title="Վերսկսել խաղը"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Վերսկսել</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col justify-center">
        {activeTab === 'list' ? (
          /* Full 27 Questions Study & Review List Mode */
          <div className="w-full max-w-4xl mx-auto bg-slate-900/80 border border-blue-900/40 rounded-2xl p-4 sm:p-6 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  27 Հարցերի Ցանկ (Fútbol y Viajes)
                </h2>
                <p className="text-xs text-slate-400">
                  Դիտեք հարցերը, լսեք իսպաներեն արտասանությունը և բացեք թարգմանությունները։
                </p>
              </div>

              {/* Category Filter */}
              <div className="flex gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1 rounded-md transition ${
                    categoryFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Բոլորը (27)
                </button>
                <button
                  onClick={() => setCategoryFilter('football')}
                  className={`px-3 py-1 rounded-md transition ${
                    categoryFilter === 'football' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⚽ Ֆուտբոլ (14)
                </button>
                <button
                  onClick={() => setCategoryFilter('travel')}
                  className={`px-3 py-1 rounded-md transition ${
                    categoryFilter === 'travel' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ✈️ Ճամփորդություն (13)
                </button>
              </div>
            </div>

            {/* List of 27 Questions */}
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              {filteredQuestions.map((q) => {
                const isItemArmenianRevealed = alwaysShowTranslation || q.revealedArmenianQuestion;

                return (
                  <div
                    key={q.id}
                    className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 hover:border-blue-500/40 transition group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-300 border border-blue-400/40 flex items-center justify-center font-black text-sm">
                          {q.letter}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          #{q.id} • {q.category === 'football' ? '⚽ Ֆուտբոլ' : '✈️ Ճամփորդություն'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => speakSpanish(q.spanishQuestion)}
                          className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-cyan-300 transition text-xs flex items-center gap-1"
                          title="Լսել իսպաներեն արտասանությունը"
                        >
                          <Volume1 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Լսել</span>
                        </button>
                        <button
                          onClick={() => {
                            setCurrentIndex(q.id - 1);
                            setActiveTab('game');
                          }}
                          className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
                        >
                          Խաղալ այս տառը
                        </button>
                      </div>
                    </div>

                    {/* Spanish Question (Click to toggle Armenian translation) */}
                    <div
                      onClick={() => handleToggleArmenianTranslation(q.id)}
                      className="cursor-pointer bg-blue-950/20 hover:bg-blue-900/30 p-2.5 rounded-lg border border-blue-900/30 transition mb-2"
                      title="Սեղմեք՝ հայերեն թարգմանությունը բացելու համար"
                    >
                      <p className="text-sm sm:text-base font-semibold text-white">
                        {q.spanishQuestion}
                      </p>
                      <span className="text-[11px] text-cyan-400/90 font-medium mt-1 inline-flex items-center gap-1">
                        👆 Սեղմեք՝ հայերեն թարգմանության համար (Ver en armenio)
                      </span>
                    </div>

                    {/* Armenian Translation */}
                    {isItemArmenianRevealed && (
                      <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-lg p-2.5 mb-2 text-indigo-200 text-sm">
                        <span className="text-xs font-bold text-indigo-400 block mb-0.5">🇦🇲 Հայերեն թարգմանություն:</span>
                        {q.armenianQuestion}
                      </div>
                    )}

                    {/* Answer Reveal Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                      {q.revealedAnswer ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-emerald-400">✅ Պատասխան՝</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold">
                            🇪🇸 {q.spanishAnswer}
                          </span>
                          <span className="text-slate-400">—</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 font-bold">
                            🇦🇲 {q.armenianAnswer}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setQuestions((prev) =>
                              prev.map((item) => (item.id === q.id ? { ...item, revealedAnswer: true } : item))
                            );
                            playRevealSound();
                          }}
                          className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Տեսնել պատասխանը (Ver respuesta)</span>
                        </button>
                      )}

                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        q.status === 'correct'
                          ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                          : q.status === 'incorrect'
                          ? 'bg-red-900/60 text-red-300 border border-red-500/40'
                          : q.status === 'passed'
                          ? 'bg-amber-900/60 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {q.status === 'correct'
                          ? 'Ճիշտ'
                          : q.status === 'incorrect'
                          ? 'Սխալ'
                          : q.status === 'passed'
                          ? 'Բաց թողնված'
                          : 'Չլուծված'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Main Interactive Pasapalabra Game View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center max-w-6xl mx-auto w-full">
            {/* Left/Top: Authentic TV Show Circular Rosco Wheel (27 letters) */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center">
              <RoscoWheel
                questions={questions}
                currentIndex={currentIndex}
                onSelectLetter={(idx) => {
                  setCurrentIndex(idx);
                  setTypedAnswer('');
                  setInputFeedback(null);
                }}
                timeRemaining={timeRemaining}
                isRunning={isRunning}
                onToggleTimer={handleToggleTimer}
                onResetGame={handleResetGame}
                soundOn={soundOn}
                onToggleSound={() => setSoundOn(!soundOn)}
              />

              {/* Rosco Legend Helper */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[11px] sm:text-xs text-slate-400 mt-2 px-3 py-1.5 rounded-full bg-slate-950/60 border border-slate-800/80">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Չլուծված
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Պասապալաբրա
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Ճիշտ ({correctCount})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Սխալ ({incorrectCount})
                </span>
              </div>
            </div>

            {/* Right/Bottom: Active Question Interactive Card */}
            <div className="lg:col-span-6 flex flex-col gap-3">
              {/* Dedicated Separate Timer Controller Banner */}
              <div
                className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 transition-all ${
                  isRunning
                    ? 'bg-blue-950/70 border-blue-500/50 shadow-lg shadow-blue-950/50'
                    : 'bg-gradient-to-r from-emerald-950/50 via-slate-900 to-teal-950/40 border-emerald-500/60 shadow-xl shadow-emerald-950/60 ring-1 ring-emerald-400/40'
                }`}
              >
                <div className="flex items-center gap-3 text-left w-full sm:w-auto">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                      isRunning ? 'bg-blue-600/30 text-blue-300' : 'bg-emerald-500/20 text-emerald-400 animate-pulse'
                    }`}
                  >
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xl sm:text-2xl font-black text-white">
                        {formatTime(timeRemaining)}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isRunning
                            ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/50'
                            : 'bg-amber-900/80 text-amber-300 border border-amber-500/50 animate-pulse'
                        }`}
                      >
                        {isRunning ? '🟢 ԺԱՄԱՆԱԿԸ ԳՆՈՒՄ Է' : '🔴 ԺԱՄԱՆԱԿԸ ԿԱՆԳՆԱԾ Է'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {isRunning
                        ? '30 րոպեի հետհաշվարկը միացված է'
                        : 'Ժամանակը գնում է ՄԻԱՅՆ առանձին «ՍԿՍԵԼ / НАЧАТЬ» կոճակով'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Separate Dedicated START/PAUSE Button */}
                  <button
                    onClick={handleToggleTimer}
                    className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                      isRunning
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/40'
                        : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/60 ring-2 ring-emerald-300/60 scale-102 hover:scale-105 active:scale-98 animate-pulse'
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" />
                        <span>ԴԱԴԱՐ (ПАУЗА)</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>▶️ ՍԿՍԵԼ / НАЧАТЬ (30:00)</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleResetTimer}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title="Զրոյացնել ժամանակը 30:00"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-4 sm:p-6 backdrop-blur-xl shadow-2xl shadow-blue-950/60 relative overflow-hidden">
                {/* Background ambient corner glow */}
                <div className="absolute top-0 right-0 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

                {/* Question Header & Letter Indicator */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center font-black text-white text-xl shadow-md shadow-blue-500/30">
                      {currentQ.letter}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                          ՏԱՌ {currentQ.letter} • ՀԱՐՑ #{currentQ.id}
                        </span>
                        <span className="text-[11px] px-2 py-0.2 rounded-full bg-blue-900/60 text-blue-200 border border-blue-400/30">
                          {currentQ.category === 'football' ? '⚽ Ֆուտբոլ' : '✈️ Ճամփորդություն'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {currentQ.status === 'correct'
                          ? '✅ Ճիշտ է լուծված'
                          : currentQ.status === 'incorrect'
                          ? '❌ Սխալ է պատասխանվել'
                          : currentQ.status === 'passed'
                          ? '🟡 Բաց է թողնված (Պասապալաբրա)'
                          : '🔵 Ընթացիկ հարց'}
                      </p>
                    </div>
                  </div>

                  {/* Navigation Arrows for Previous / Next Letter */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setCurrentIndex(getPrevIndex(currentIndex));
                        setTypedAnswer('');
                        setInputFeedback(null);
                      }}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="Նախորդ տառը"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setCurrentIndex(getNextUnsolvedIndex(currentIndex));
                        setTypedAnswer('');
                        setInputFeedback(null);
                      }}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="Հաջորդ տառը"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Spanish Question Card (CLICK TO REVEAL ARMENIAN TRANSLATION) */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1">
                      <span>🇪🇸 Իսպաներեն հարց</span>
                      <span className="text-[10px] text-slate-400 lowercase font-normal">(սեղմեք ներքևի քարտի վրա)</span>
                    </span>

                    <button
                      onClick={() => speakSpanish(currentQ.spanishQuestion)}
                      className="text-xs px-2 py-1 rounded bg-blue-950 border border-blue-800/80 text-cyan-300 hover:bg-blue-900/60 transition flex items-center gap-1"
                      title="Լսել իսպաներենով"
                    >
                      <Volume1 className="w-3.5 h-3.5" />
                      <span>Լսել</span>
                    </button>
                  </div>

                  {/* Clickable Spanish Question container */}
                  <div
                    onClick={() => handleToggleArmenianTranslation(currentQ.id)}
                    className="group cursor-pointer bg-gradient-to-br from-blue-950/40 via-slate-900/90 to-blue-900/20 border-2 border-blue-500/40 hover:border-cyan-400/80 rounded-xl p-4 transition-all duration-200 shadow-md relative"
                    title="Սեղմեք այստեղ՝ հայերեն թարգմանությունը բացելու կամ փակելու համար"
                  >
                    <p className="text-base sm:text-lg font-bold text-white leading-relaxed group-hover:text-cyan-100 transition">
                      {currentQ.spanishQuestion}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-blue-900/50 flex items-center justify-between text-xs text-cyan-400 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Languages className="w-3.5 h-3.5 text-cyan-300" />
                        <span>👆 Սեղմեք այստեղ՝ հայերեն թարգմանության համար</span>
                      </span>
                      {currentQ.revealedArmenianQuestion || alwaysShowTranslation ? (
                        <span className="text-slate-400 flex items-center gap-0.5 text-[11px]">
                          Թաքցնել <ChevronUp className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="text-cyan-300 flex items-center gap-0.5 text-[11px]">
                          Բացել <ChevronDown className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Armenian Translation Box (Smooth reveal on click) */}
                {(currentQ.revealedArmenianQuestion || alwaysShowTranslation) && (
                  <div className="bg-indigo-950/40 border border-indigo-400/40 rounded-xl p-3.5 mb-3 text-indigo-100 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                        <span>🇦🇲 Հայերեն թարգմանություն:</span>
                      </span>
                      <span className="text-[10px] text-indigo-400/80 bg-indigo-900/50 px-2 py-0.5 rounded">
                        Հայերեն
                      </span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold leading-relaxed">
                      {currentQ.armenianQuestion}
                    </p>
                  </div>
                )}

                {/* Dedicated VIEW ANSWER Button & Reveal Box */}
                <div className="mt-2 pt-2 border-t border-slate-800">
                  {/* Dedicated Answer button */}
                  {!currentQ.revealedAnswer ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800 mb-3">
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-300 block">
                          Ցանկանու՞մ եք տեսնել ճիշտ պատասխանը:
                        </span>
                        <span className="text-[11px] text-slate-400">
                          (Պատասխանը դիտելը <strong className="text-cyan-300">ՉԻ ՀԱՇՎՎՈՒՄ</strong> որպես սխալ!)
                        </span>
                      </div>

                      {/* Dedicated Show Answer Button */}
                      <button
                        onClick={handleRevealAnswer}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Eye className="w-4 h-4 text-cyan-200" />
                        <span>ՏԵՍՆԵԼ ՊԱՏԱՍԽԱՆԸ (VER RESPUESTA)</span>
                      </button>
                    </div>
                  ) : (
                    /* Revealed Answer Card (Both Spanish & Armenian) */
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/40 via-slate-950 to-indigo-950/30 border border-emerald-500/40 mb-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>ՃԻՇՏ ՊԱՏԱՍԽԱՆ (RESPUESTA CORRECTA):</span>
                        </span>
                        <button
                          onClick={() => speakSpanish(currentQ.spanishAnswer)}
                          className="text-[11px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 transition flex items-center gap-1"
                        >
                          <Volume1 className="w-3 h-3" />
                          <span>Լսել</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                        <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-semibold mb-0.5">🇪🇸 Իսպաներեն:</span>
                          <span className="text-base font-black text-emerald-300">
                            {currentQ.spanishAnswer}
                          </span>
                        </div>
                        <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-semibold mb-0.5">🇦🇲 Հայերեն:</span>
                          <span className="text-base font-black text-indigo-300">
                            {currentQ.armenianAnswer}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-2 text-center">
                        Այժմ ընտրեք արդյունքը ներքևի կոճակներով՝
                      </p>
                    </div>
                  )}

                  {/* Optional Typed Input Field (Allows typing or testing answer) */}
                  <form onSubmit={handleCheckTypedAnswer} className="flex gap-2 mb-3">
                    <input
                      ref={inputRef}
                      type="text"
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      placeholder="Գրեք պատասխանը իսպաներեն կամ հայերեն..."
                      className="flex-1 bg-slate-950/80 border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none transition"
                    />
                    <button
                      type="submit"
                      disabled={!typedAnswer.trim()}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-semibold text-xs flex items-center gap-1.5 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Ստուգել</span>
                    </button>
                  </form>

                  {/* Input feedback message */}
                  {inputFeedback && (
                    <div className="text-xs font-semibold text-cyan-300 mb-2 px-2 py-1 rounded bg-cyan-950/40 border border-cyan-800/40 text-center animate-in fade-in">
                      {inputFeedback}
                    </div>
                  )}

                  {/* 3 Main TV Show Action Buttons: Correct / Pasapalabra / Incorrect */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {/* PASAPALABRA (Skip/Next) */}
                    <button
                      onClick={handlePasapalabra}
                      className="py-3 px-2 rounded-xl bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-amber-600/30 transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer"
                      title="Բաց թողնել և անցնել հաջորդին"
                    >
                      <FastForward className="w-4 h-4" />
                      <span>ՊԱՍԱՊԱԼԱԲՐԱ</span>
                    </button>

                    {/* CORRECT */}
                    <button
                      onClick={handleMarkCorrect}
                      className="py-3 px-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/30 transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer"
                      title="Հաշվել որպես ճիշտ (+1)"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ՃԻՇՏ Է (+1)</span>
                    </button>

                    {/* INCORRECT */}
                    <button
                      onClick={handleMarkIncorrect}
                      className="py-3 px-2 rounded-xl bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-red-600/30 transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer"
                      title="Հաշվել որպես սխալ"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>ՍԽԱԼ Է</span>
                    </button>
                  </div>
                </div>

                {/* Additional footer options: Always show translation toggle */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={alwaysShowTranslation}
                      onChange={(e) => setAlwaysShowTranslation(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Միշտ բացել հայերեն թարգմանությունները</span>
                  </label>

                  <button
                    onClick={() => setShowSummaryModal(true)}
                    className="text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    Ամփոփել արդյունքը
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Summary / Completion Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-blue-500/40 rounded-2xl max-w-lg w-full p-6 text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-600 text-slate-950 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-yellow-500/30">
              <Trophy className="w-9 h-9" />
            </div>

            <h3 className="text-2xl font-black text-white mb-1">
              Խաղի Արդյունքները (El Rosco)
            </h3>
            <p className="text-xs text-blue-300 mb-4">
              27 հարց խաղի համար՝ ֆուտբոլ և ճանապարհորդություն ⚽✈️
            </p>

            {/* Score Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-center">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-emerald-500/30">
                <span className="text-xl font-black text-emerald-400">{correctCount}</span>
                <span className="text-[11px] text-slate-400 block font-medium">Ճիշտ (Aciertos)</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-red-500/30">
                <span className="text-xl font-black text-red-400">{incorrectCount}</span>
                <span className="text-[11px] text-slate-400 block font-medium">Սխալ (Fallos)</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/30">
                <span className="text-xl font-black text-amber-400">{passedCount}</span>
                <span className="text-[11px] text-slate-400 block font-medium">Պասապալաբրա</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-blue-500/30">
                <span className="text-xl font-black text-cyan-400">{unansweredCount}</span>
                <span className="text-[11px] text-slate-400 block font-medium">Չպատասխանված</span>
              </div>
            </div>

            {/* Progress Percentage */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 mb-5">
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Ճշգրտության տոկոս՝</span>
                <span className="text-cyan-300">{scorePercentage}% ({correctCount}/27)</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 via-emerald-400 to-cyan-400 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${scorePercentage}%` }}
                />
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                Վերադառնալ խաղին
              </button>
              <button
                onClick={() => {
                  setShowSummaryModal(false);
                  handleResetGame();
                  setIsRunning(true);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Սկսել նորից (30 րոպե)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules / Instructions Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-blue-500/40 rounded-2xl max-w-lg w-full p-6 text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-xl bg-blue-600/30 text-cyan-300 flex items-center justify-center mx-auto mb-3 border border-blue-400/40">
              <Sparkles className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-black text-white mb-1">
              Խաղի Կանոններ (Pasapalabra: El Rosco)
            </h3>
            <p className="text-xs text-blue-300 mb-4">
              27 հարցեր ֆուտբոլի և ճանապարհորդության թեմայով ⚽✈️
            </p>

            <div className="space-y-3 text-left text-xs sm:text-sm text-slate-300 mb-6 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div className="flex items-start gap-2.5">
                <span className="text-emerald-400 font-bold">1.</span>
                <p>
                  <strong>Ժամանակաչափ (30 րոպե)՝</strong> Ժամանակը սկսում է գնալ <strong>ՄԻԱՅՆ</strong> առանձին <span className="text-emerald-300 font-bold">«ՍԿՍԵԼ / НАЧАТЬ»</span> կոճակը սեղմելուց հետո։
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-cyan-400 font-bold">2.</span>
                <p>
                  <strong>Հայերեն թարգմանություն՝</strong> Սեղմեք իսպաներեն հարցի վրա՝ հայերեն թարգմանությունն անմիջապես տեսնելու համար։
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-indigo-400 font-bold">3.</span>
                <p>
                  <strong>Պատասխանի դիտում՝</strong> Կարող եք սեղմել <span className="text-indigo-300 font-bold">«Տեսնել պատասխանը»</span> կոճակը՝ առանց որևէ տուգանքի կամ սխալ հաշվվելու։
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-amber-400 font-bold">4.</span>
                <p>
                  <strong>Պասապալաբրա՝</strong> Եթե դեռ վստահ չեք, սեղմեք «Պասապալաբրա» և անցեք հաջորդ տառին։ Դուք կարող եք վերադառնալ այս հարցին ավելի ուշ։
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowRulesModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                Փակել
              </button>
              {!isRunning && (
                <button
                  onClick={() => {
                    setShowRulesModal(false);
                    setIsRunning(true);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Սկսել ժամանակը (30:00)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="text-center py-2 px-4 text-[11px] text-slate-500 border-t border-slate-900 bg-slate-950/60">
        Pasapalabra • 27 հարց ֆուտբոլի և ճանապարհորդության թեմայով • Իսպաներեն / Հայերեն • 30 րոպե
      </footer>
    </div>
  );
}
