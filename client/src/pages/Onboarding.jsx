import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const questions = [
  {
    id: 'strength',
    question: "What's your biggest work strength?",
    options: [
      'Strategic thinking',
      'Raw creativity',
      "I just don't quit",
      'I know people who know people',
    ],
  },
  {
    id: 'monday_vibe',
    question: 'How do you handle Mondays?',
    options: [
      'IV drip of coffee',
      'Quiet suffering',
      'Every day feels the same',
      'I genuinely love Mondays (liar)',
    ],
  },
  {
    id: 'coworker_desc',
    question: 'Coworkers would describe you as...',
    options: [
      'The reliable one',
      'A visionary (probably)',
      'Wait, you have coworkers?',
      'The one who orders food',
    ],
  },
  {
    id: 'five_year_goal',
    question: 'Your 5-year plan?',
    options: [
      'CEO or bust',
      'Laptop from a beach',
      'To still be employed',
      'Plans are a social construct',
    ],
  },
  {
    id: 'desired_field',
    question: 'What field are you actually targeting?',
    options: [
      'Tech & Startups',
      'Creative Arts & Media',
      'Finance & Business',
      'I just want to go viral',
    ],
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const current = questions[step];
  const progress = ((step) / questions.length) * 100;

  function handleSelect(option) {
    setSelected(option);
  }

  async function handleNext() {
    if (!selected) return;

    const newAnswers = { ...answers, [current.id]: selected };
    setAnswers(newAnswers);

    if (step < questions.length - 1) {
      setStep(step + 1);
      setSelected(null);
    } else {
      // All questions answered — submit to backend then go to loading
      // Store answers in sessionStorage so Loading page can submit
      sessionStorage.setItem('onboarding_answers', JSON.stringify(newAnswers));
      navigate('/loading');
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">AI</div>
          <span className="font-semibold text-sm">CareerPredict</span>
        </div>
        <div className="text-sm text-slate-500">
          Analyzing: <span className="text-slate-300">{user?.name}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-800">
        <div
          className="h-1 bg-indigo-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  i <= step ? 'bg-indigo-500' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>

          <div className="text-xs text-indigo-400 font-mono mb-3 uppercase tracking-widest">
            Question {step + 1} of {questions.length}
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold mb-8 leading-snug">
            {current.question}
          </h2>

          <div className="space-y-3">
            {current.options.map((option) => (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-150 ${
                  selected === option
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white'
                }`}
              >
                <span className="text-sm">{option}</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={!selected}
            className={`mt-8 w-full py-4 rounded-xl font-semibold text-sm transition-all duration-150 ${
              selected
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            {step < questions.length - 1 ? 'Continue →' : 'Analyze My Career →'}
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-slate-700 pb-6">
        Powered by Quantum Personality Matrix™ · 99.7% Accurate
      </div>
    </div>
  );
}
