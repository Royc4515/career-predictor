import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

export default function Result() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const MAX_RETRIES = 5;

  useEffect(() => {
    // Try sessionStorage first (fresh from onboarding), then fall back to API
    const cached = sessionStorage.getItem('career_result');
    if (cached) {
      setResult(JSON.parse(cached));
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/user/result`, { credentials: 'include' })
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
      }, 8000);
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
    const url = window.location.origin;
    const text = `The AI figured me out. Apparently my true career destiny is: "${result?.careerTitle}" 😂 Try it yourself → ${url}`;
    if (navigator.share) {
      navigator.share({ text, url });
    } else {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
  }

  async function handleDownload() {
    if (!result?.imageUrl) return;
    try {
      const res = await fetch(result.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `career-predict-${result.careerTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Could not download image. Try right-clicking the image instead.');
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
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>Report for <span className="text-slate-300">{user?.name}</span></span>
          <a href={`${API_URL}/auth/logout`} className="text-slate-500 hover:text-slate-300 transition-colors">Sign Out</a>
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
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-5 mb-4">
          <div className="text-xs text-indigo-400 font-mono uppercase tracking-widest mb-2">Optimal Career Path</div>
          <h2 className="text-2xl font-bold text-white">{careerTitle}</h2>
        </div>

        {/* AI caption */}
        {result.caption && (
          <p className="text-slate-400 text-sm italic mb-8 px-1">"{result.caption}"</p>
        )}

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
            onClick={handleDownload}
            className="flex-1 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white py-3 rounded-xl text-sm font-medium transition-colors"
          >
            Download Image
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

        <div className="flex items-center justify-center gap-5 mt-5">
          <a href="https://www.linkedin.com/in/roy-carmelli/" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-700 hover:text-slate-400 transition-colors text-xs">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
          </a>
          <span className="text-slate-800">·</span>
          <a href="https://github.com/Royc4515" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-700 hover:text-slate-400 transition-colors text-xs">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            GitHub
          </a>
          <span className="text-slate-800">·</span>
          <a href="https://roy-carmelli-portfolio.vercel.app/" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-700 hover:text-slate-400 transition-colors text-xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Portfolio
          </a>
        </div>
        <p className="text-center text-xs text-slate-800 mt-3">Built by Roy Carmelli</p>
      </div>
    </div>
  );
}
