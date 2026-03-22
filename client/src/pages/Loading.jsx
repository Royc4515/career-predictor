import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

const steps = [
  'Connecting to career neural network...',
  'Analyzing your professional DNA...',
  'Cross-referencing 847 career trajectories...',
  'Applying quantum personality matrix...',
  'Generating your destiny...',
  'Finalizing report...',
];

export default function Loading() {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const submitted = useRef(false);
  const apiDone = useRef(false);

  // Submit onboarding answers to backend
  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;

    const answers = JSON.parse(sessionStorage.getItem('onboarding_answers') || '{}');

    fetch(`${API_URL}/api/user/onboarding`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answers),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Server error');
        return res.json();
      })
      .then((data) => {
        sessionStorage.setItem('career_result', JSON.stringify(data));
        apiDone.current = true;
      })
      .catch(() => setError('Something went wrong analyzing your career. Please try again.'));
  }, []);

  // Animate the progress bar over ~7 seconds
  useEffect(() => {
    const duration = 7000;
    const interval = 50;
    const increment = 100 / (duration / interval);
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= 100) {
        current = 100;
        clearInterval(timer);
        setDone(true);
      }
      setProgress(Math.min(current, 100));
    }, interval);

    return () => clearInterval(timer);
  }, []);

  // Cycle through step labels
  useEffect(() => {
    const stepDuration = 7000 / steps.length;
    const timer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    }, stepDuration);
    return () => clearInterval(timer);
  }, []);

  // Navigate to result once animation is done AND API has responded
  useEffect(() => {
    if (!done || error) return;
    const check = setInterval(() => {
      if (apiDone.current) {
        clearInterval(check);
        setTimeout(() => navigate('/result'), 400);
      }
    }, 200);
    return () => clearInterval(check);
  }, [done, error, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6">
        <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center font-bold text-sm mb-6">!</div>
        <h2 className="text-xl font-semibold mb-2">Analysis Failed</h2>
        <p className="text-slate-400 text-sm mb-8 text-center max-w-md">{error}</p>
        <button
          onClick={() => navigate('/onboarding')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-16">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-sm">AI</div>
        <span className="font-semibold">CareerPredict</span>
      </div>

      <div className="w-full max-w-md text-center">
        {/* Spinner */}
        <div className="flex justify-center mb-10">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-indigo-400">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-2">AI Analysis in Progress</h2>
        <p className="text-slate-400 text-sm mb-8">Please do not close this window.</p>

        {/* Step text */}
        <div className="h-5 mb-6">
          <p className="text-indigo-400 text-sm font-mono animate-pulse">
            {steps[stepIndex]}
          </p>
        </div>

        {/* Progress bar */}
        <div className="bg-slate-800 rounded-full h-2 mb-3 overflow-hidden">
          <div
            className="h-2 bg-indigo-500 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-slate-500">
          <span>Processing</span>
          <span>{Math.round(progress)}%</span>
        </div>

        {/* Fake metrics */}
        <div className="mt-10 grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Trajectories', value: Math.round(progress * 8.47) },
            { label: 'Data Points', value: Math.round(progress * 143.2) },
            { label: 'Confidence', value: `${Math.min(Math.round(progress * 0.997), 99)}%` },
          ].map((m) => (
            <div key={m.label} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-white font-bold text-lg tabular-nums">{m.value}</div>
              <div className="text-slate-500 text-xs mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-16 text-xs text-slate-700">
        CareerPredict Neural Engine v4.2.1 · Quantum Matrix Active
      </p>
    </div>
  );
}
