import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Result() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const MAX_RETRIES = 3;

  useEffect(() => {
    // Try sessionStorage first (fresh from onboarding), then fall back to API
    const cached = sessionStorage.getItem('career_result');
    if (cached) {
      setResult(JSON.parse(cached));
      setLoading(false);
      return;
    }

    fetch('/api/user/result', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => { setResult(data); setLoading(false); })
      .catch(() => { setLoading(false); navigate('/onboarding'); });
  }, [navigate]);

  // Retry image on error, up to MAX_RETRIES times with 5s intervals
  const retryTimer = useRef(null);
  function handleImageError() {
    if (retryCount < MAX_RETRIES) {
      retryTimer.current = setTimeout(() => {
        setRetryCount((n) => n + 1);
      }, 5000);
    } else {
      setImageFailed(true);
      setImageLoaded(true);
    }
  }
  useEffect(() => () => clearTimeout(retryTimer.current), []);

  // Build image URL with cache-bust on retry
  const imageUrlWithRetry = result?.imageUrl
    ? retryCount > 0
      ? `${result.imageUrl}&_r=${retryCount}`
      : result.imageUrl
    : null;

  function handleTryAgain() {
    sessionStorage.removeItem('career_result');
    sessionStorage.removeItem('onboarding_answers');
    navigate('/onboarding');
  }

  function handleShare() {
    const text = `The AI figured me out. Apparently my true career destiny is: "${result?.careerTitle}" 😂 Try it yourself →`;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Loading your destiny...</div>
      </div>
    );
  }

  if (!result) return null;

  const { careerTitle, stats } = result;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-xs">AI</div>
          <span className="font-semibold text-sm">CareerPredict</span>
        </div>
        <div className="text-sm text-slate-500">
          Report for <span className="text-slate-300">{user?.name}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Report badge */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-400 font-mono uppercase tracking-widest">Analysis Complete · 99.7% Confidence</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold mb-2 leading-tight">
          Your Career Destiny
        </h1>
        <p className="text-slate-400 mb-10 text-sm">Based on your professional DNA profile</p>

        {/* Career title */}
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-5 mb-8">
          <div className="text-xs text-indigo-400 font-mono uppercase tracking-widest mb-2">Optimal Career Path</div>
          <h2 className="text-2xl font-bold text-white">{careerTitle}</h2>
        </div>

        {/* AI-generated image */}
        <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-8 aspect-square">
          {!imageLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
              <span className="text-slate-500 text-xs">
                {retryCount > 0 ? `Retrying visualization... (${retryCount}/${MAX_RETRIES})` : 'Rendering AI visualization...'}
              </span>
            </div>
          )}
          {imageFailed ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="text-5xl mb-2">🤖</div>
              <p className="text-slate-400 text-sm">AI visualization temporarily unavailable</p>
              <p className="text-slate-500 text-xs">The neural rendering engine is overloaded.<br/>Your career destiny remains unchanged.</p>
            </div>
          ) : (
            <img
              key={retryCount}
              src={imageUrlWithRetry}
              alt={careerTitle}
              className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              onError={handleImageError}
            />
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white mb-1">{stats.happiness}<span className="text-sm text-slate-500">/100</span></div>
            <div className="text-xs text-slate-500">Career Happiness Score</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-sm font-bold text-white mb-1 leading-tight">{stats.salary}</div>
            <div className="text-xs text-slate-500">Salary Potential</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-sm font-bold text-white mb-1 leading-tight">{stats.outlook}</div>
            <div className="text-xs text-slate-500">Career Outlook</div>
          </div>
        </div>

        {/* Fake detailed analysis */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
          <h3 className="font-semibold mb-4 text-sm">Detailed Analysis</h3>
          <div className="space-y-3">
            {[
              { label: 'Professional DNA Match', value: 97 },
              { label: 'Market Viability', value: Math.max(10, stats.happiness - 5) },
              { label: 'Passion Alignment', value: Math.min(99, stats.happiness + 20) },
              { label: 'Long-term Stability', value: Math.max(5, stats.happiness - 15) },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="text-slate-300">{item.value}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-1.5 bg-indigo-500 rounded-full"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white py-3 rounded-xl text-sm font-medium transition-colors"
          >
            Share Result
          </button>
          <button
            onClick={handleTryAgain}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-sm font-medium transition-colors"
          >
            Try Again →
          </button>
        </div>

        <p className="text-center text-xs text-slate-700 mt-8">
          CareerPredict AI · Results are 99.7% accurate and completely made up.
        </p>
      </div>
    </div>
  );
}
