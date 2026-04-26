import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { API_URL } from '../config';

const testimonials = [
  { name: 'Sarah K., MBA', text: 'The accuracy was uncanny. I didn\'t believe AI could know me this well.', role: 'Former Director of Something' },
  { name: 'Marcus T.', text: 'I finally have clarity on my career path. 10/10 would recommend.', role: 'Aspiring Thought Leader' },
  { name: 'Priya M., PhD', text: 'My therapist couldn\'t figure this out in 3 years. This did it in 30 seconds.', role: 'Professional Overthinker' },
];

const stats = [
  { value: '99.7%', label: 'Prediction Accuracy' },
  { value: '50,000+', label: 'Professionals Analyzed' },
  { value: '847', label: 'Career Trajectories' },
  { value: '4.9★', label: 'Average Rating' },
];

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to onboarding
  useEffect(() => {
    if (!loading && user) navigate('/result');
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">AI</div>
          <span className="font-semibold text-white">CareerPredict</span>
          <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full ml-1">Pro</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-400">
          <span className="hidden sm:block">Features</span>
          <span className="hidden sm:block">Pricing</span>
          <span className="hidden sm:block">Enterprise</span>
          <a href={`${API_URL}/auth/google`} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium">
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-sm text-indigo-400 mb-6">
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
          New: Quantum Personality Matrix v3.2 now available
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight mb-6">
          Discover Your True<br />
          <span className="text-indigo-400">Career Destiny</span>
        </h1>

        <p className="text-xl text-slate-400 mb-4 max-w-2xl mx-auto">
          Our proprietary AI analyzes your professional DNA across 847 career trajectories
          to reveal your optimal path with 99.7% accuracy.
        </p>

        <p className="text-sm text-slate-500 mb-10">Used by 50,000+ professionals worldwide. No credit card required.</p>

        <a
          href={`${API_URL}/auth/google`}
          className="inline-flex items-center gap-3 bg-white text-slate-900 font-semibold px-8 py-4 rounded-xl text-lg hover:bg-slate-100 transition-colors shadow-lg"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Analyze My Career Potential →
        </a>

        <p className="text-xs text-slate-600 mt-4">Takes 2 minutes. Results are permanent.</p>
      </section>

      {/* Stats bar */}
      <section className="border-y border-slate-800 bg-slate-900/50 py-8">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-sm text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-center mb-12">How CareerPredict Works</h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Answer 5 Questions', desc: 'Our AI asks targeted questions to map your professional DNA across key dimensions.' },
            { step: '02', title: 'Neural Analysis', desc: 'Our quantum personality matrix cross-references 847 career trajectories in real time.' },
            { step: '03', title: 'Your Destiny Revealed', desc: 'Receive a hyper-personalized AI-generated portrait of your true career path.' },
          ].map((item) => (
            <div key={item.step} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="text-indigo-400 text-xs font-mono mb-3">{item.step}</div>
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-slate-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fake accuracy graph */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold">Prediction Accuracy Over Time</h3>
              <p className="text-slate-500 text-sm">Compared to traditional career assessments</p>
            </div>
            <span className="text-indigo-400 font-bold text-lg">99.7%</span>
          </div>
          {/* Fake bar chart */}
          <div className="flex items-end gap-2 h-24">
            {[40, 55, 48, 62, 70, 65, 80, 75, 88, 85, 92, 99].map((h, i) => (
              <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, backgroundColor: i === 11 ? '#6366f1' : '#1e293b', border: '1px solid #334155' }}></div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-600 mt-2">
            <span>Jan</span><span>Dec</span>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-slate-900/50 border-t border-slate-800 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-12">What Professionals Are Saying</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="text-yellow-400 text-sm mb-3">★★★★★</div>
                <p className="text-slate-300 text-sm mb-4">"{t.text}"</p>
                <div className="text-xs text-slate-500">{t.name} · {t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Know Your Destiny?</h2>
        <p className="text-slate-400 mb-8">Join 50,000+ professionals who have unlocked their true potential.</p>
        <a
          href={`${API_URL}/auth/google`}
          className="inline-flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
        >
          Start Free Analysis →
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-10 text-center">
        <p className="text-slate-600 text-xs mb-6">
          © 2025 CareerPredict AI · Predictions are for entertainment purposes only. Results may vary. By “vary” we mean completely made up.
        </p>
        <div className="flex items-center justify-center gap-6 mb-5">
          <a href="https://www.linkedin.com/in/roy-carmelli/" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-400 transition-colors text-xs">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
          </a>
          <span className="text-slate-800">·</span>
          <a href="https://github.com/Royc4515" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-400 transition-colors text-xs">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            GitHub
          </a>
          <span className="text-slate-800">·</span>
          <a href="https://roy-carmelli-portfolio.vercel.app/" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-400 transition-colors text-xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Portfolio
          </a>
        </div>
        <p className="text-slate-700 text-xs">
          Built by{" "}
          <a href="https://www.linkedin.com/in/roy-carmelli/" target="_blank" rel="noopener noreferrer"
            className="text-slate-600 hover:text-slate-400 underline underline-offset-2 transition-colors">
            Roy Carmelli
          </a>
        </p>
      </footer>
    </div>
  );
}
