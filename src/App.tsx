import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import {
  FileText,
  Scale,
  History as HistoryIcon,
  ShieldCheck,
  Sun,
  Moon,
  Globe,
  LogIn,
  User,
  LogOut,
  BookOpen,
  Settings,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentExplainer } from './components/DocumentExplainer';
import { LawExplainer } from './components/LawExplainer';
import { History } from './components/History';
import { Auth } from './components/Auth';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { LocalizationProvider, useLocalization, LanguageCode } from './services/localization';
import { isMobileViewport, isStandaloneApp } from './services/mobile';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorScreen error={this.state.error} />;
    }

    return this.props.children;
  }
}

function ErrorScreen({ error }: { error: Error | null }) {
  const { t } = useLocalization();

  return (
    <div className="flex min-h-screen items-center justify-center bg-red-50 p-6">
      <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-8 shadow-xl">
        <h2 className="serif mb-4 text-2xl font-bold text-red-600">{t('app.error.title')}</h2>
        <p className="mb-6 text-sm text-gray-600">{error?.message || 'Something went wrong.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="w-full rounded-xl bg-red-600 py-3 font-bold text-white transition-colors hover:bg-red-700"
        >
          {t('app.error.reload')}
        </button>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<'docs' | 'law' | 'history'>('law');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('lawchat-theme') as 'light' | 'dark') || 'light');
  const [language, setLanguage] = useState<LanguageCode>(() => (localStorage.getItem('lawchat-language') as LanguageCode) || 'en');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) setShowAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('lawchat-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('lawchat-language', language);
  }, [language]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <LocalizationProvider language={language}>
      <ErrorBoundary>
        {!isAuthReady ? (
          <div className={`flex min-h-screen items-center justify-center ${theme === 'dark' ? 'bg-charcoal-deep' : 'bg-beige-pale'}`}>
            <div className="flex flex-col items-center gap-4">
              <div className={`flex h-12 w-12 animate-spin items-center justify-center rounded-xl text-white ${theme === 'dark' ? 'bg-silver-glowing glow-silver' : 'bg-gold-brushed glow-gold'}`}>
                <Scale size={24} />
              </div>
              <LoadingText theme={theme} />
            </div>
          </div>
        ) : (
          <AppContent
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            theme={theme}
            setTheme={setTheme}
            language={language}
            setLanguage={setLanguage}
            isReadingMode={isReadingMode}
            setIsReadingMode={setIsReadingMode}
            selectedHistory={selectedHistory}
            setSelectedHistory={setSelectedHistory}
            user={user}
            showAuth={showAuth}
            setShowAuth={setShowAuth}
            handleLogout={handleLogout}
          />
        )}
      </ErrorBoundary>
    </LocalizationProvider>
  );
}

function LoadingText({ theme }: { theme: string }) {
  const { t } = useLocalization();
  return <p className={`animate-pulse text-sm font-bold ${theme === 'dark' ? 'text-silver-glowing' : 'text-gold-brushed'}`}>{t('app.initializing')}</p>;
}

function AppContent({
  activeTab,
  setActiveTab,
  theme,
  setTheme,
  language,
  setLanguage,
  isReadingMode,
  setIsReadingMode,
  selectedHistory,
  setSelectedHistory,
  user,
  showAuth,
  setShowAuth,
  handleLogout,
}: any) {
  const { t } = useLocalization();
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const mobileViewport = isMobileViewport();
  const standaloneApp = isStandaloneApp();

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ms', name: 'Bahasa Malaysia' },
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'tl', name: 'Tagalog' },
    { code: 'kel', name: 'Dialek Kelantan' },
    { code: 'swk', name: 'Dialek Sarawak' },
  ];

  const mobileNavItems = [
    { id: 'docs', label: t('nav.docs'), icon: <FileText size={18} /> },
    { id: 'law', label: t('nav.lawchat'), icon: <Scale size={18} /> },
    { id: 'history', label: t('nav.history'), icon: <HistoryIcon size={18} /> },
  ] as const;

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-500 selection:bg-gold-brushed/20 ${theme === 'dark' ? 'dark bg-charcoal-deep text-off-white' : 'bg-beige-pale text-cocoa-deep'} ${standaloneApp ? 'standalone-shell' : ''}`}
    >
      <AnimatePresence>
        {showAuth && !user && <Auth theme={theme} onSuccess={() => setShowAuth(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showMobileSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-black/40 md:hidden" onClick={() => setShowMobileSettings(false)}>
            <motion.div
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`absolute right-4 bottom-24 left-4 rounded-[32px] border p-5 shadow-2xl ${theme === 'dark' ? 'border-white/10 bg-slate-rich' : 'border-gold-brushed/10 bg-cream-soft'}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-50">Mobile settings</p>
                  <h3 className="serif text-xl font-bold">LawChat</h3>
                </div>
                <button onClick={() => setShowMobileSettings(false)} className={`rounded-full p-2 ${theme === 'dark' ? 'bg-white/5 text-off-white' : 'bg-cocoa-deep/5 text-cocoa-deep'}`}>
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => setIsReadingMode(!isReadingMode)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold ${
                    isReadingMode
                      ? 'bg-gold-brushed text-white shadow-lg glow-gold'
                      : theme === 'dark'
                        ? 'bg-white/5 text-off-white'
                        : 'bg-cocoa-deep/5 text-cocoa-deep'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <BookOpen size={16} />
                    {t('nav.readingMode')}
                  </span>
                  <span className="text-xs opacity-70">{isReadingMode ? 'ON' : 'OFF'}</span>
                </button>

                <div className="space-y-2">
                  <div className={`flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-off-white/50' : 'text-cocoa-deep/50'}`}>
                    <Globe size={12} />
                    {t('nav.language')}
                  </div>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                    className={`w-full rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:outline-none ${theme === 'dark' ? 'bg-white/5 text-off-white focus:ring-silver-glowing/20' : 'bg-white text-cocoa-deep focus:ring-gold-brushed/20'}`}
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code} className="text-black">
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={`flex rounded-full p-1 ${theme === 'dark' ? 'border border-white/5 bg-charcoal-deep' : 'border border-gold-brushed/20 bg-white/80'}`}>
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-xs font-bold ${theme === 'light' ? 'bg-gold-brushed text-white glow-gold' : 'text-cocoa-deep/50'}`}
                  >
                    <Sun size={12} />
                    {t('nav.theme.light')}
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-xs font-bold ${theme === 'dark' ? 'bg-silver-glowing text-charcoal-deep glow-silver' : 'text-off-white/50'}`}
                  >
                    <Moon size={12} />
                    {t('nav.theme.dark')}
                  </button>
                </div>

                {user ? (
                  <div className="space-y-2">
                    <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold ${theme === 'dark' ? 'bg-white/10 text-off-white' : 'bg-cocoa-deep/5 text-cocoa-deep'}`}>
                      <User size={16} />
                      <span className="truncate">{user.displayName || user.email}</span>
                    </div>
                    <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500 transition-all hover:bg-red-500/20">
                      <LogOut size={16} />
                      {t('nav.logout')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowMobileSettings(false);
                      setShowAuth(true);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold ${theme === 'dark' ? 'bg-white/5 text-off-white' : 'bg-cocoa-deep/5 text-cocoa-deep'}`}
                  >
                    <LogIn size={16} />
                    {t('nav.login')}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-h-screen">
        <aside className={`sidebar hidden h-screen w-72 flex-col sticky top-0 transition-all duration-500 md:flex ${theme === 'dark' ? 'sidebar-dark' : 'sidebar-light'}`}>
          <div className={`border-b p-6 ${theme === 'dark' ? 'border-white/5' : 'border-cocoa-deep/5'}`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${theme === 'dark' ? 'bg-silver-glowing glow-silver' : 'bg-gold-brushed glow-gold'}`}>
                <Scale size={22} />
              </div>
              <h1 className={`serif text-xl font-bold ${theme === 'dark' ? 'text-off-white' : 'text-cocoa-deep'}`}>{t('law.title')}</h1>
            </div>
          </div>

          <nav className="flex-1 space-y-3 p-6">
            <SidebarButton active={activeTab === 'docs'} onClick={() => setActiveTab('docs')} icon={<FileText size={20} />} label={t('nav.docs')} theme={theme} />
            <SidebarButton active={activeTab === 'law'} onClick={() => setActiveTab('law')} icon={<Scale size={20} />} label={t('nav.lawchat')} theme={theme} />
            <SidebarButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<HistoryIcon size={20} />} label={t('nav.history')} theme={theme} />
          </nav>

          <div className={`space-y-4 border-t p-4 ${theme === 'dark' ? 'border-white/5' : 'border-cocoa-deep/5'}`}>
            <button
              onClick={() => setIsReadingMode(!isReadingMode)}
              className={`w-full rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                isReadingMode
                  ? 'bg-gold-brushed text-white shadow-lg glow-gold scale-105'
                  : theme === 'dark'
                    ? 'bg-white/5 text-off-white/60 hover:bg-white/10 hover:text-off-white'
                    : 'bg-cocoa-deep/5 text-cocoa-deep/60 hover:bg-cocoa-deep/10 hover:text-cocoa-deep'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-left">
                  <BookOpen size={16} />
                  <div>
                    <div>{t('nav.readingMode')}</div>
                    <div className={`text-[8px] font-medium opacity-60 ${isReadingMode ? 'text-white' : ''}`}>{t('nav.readingMode.desc')}</div>
                  </div>
                </div>
                <div className={`relative h-4 w-8 rounded-full transition-all ${isReadingMode ? 'bg-white/30' : 'bg-black/10'}`}>
                  <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${isReadingMode ? 'left-4.5' : 'left-0.5'}`} />
                </div>
              </div>
            </button>

            <div className="space-y-2">
              <div className={`flex items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-off-white/50' : 'text-cocoa-deep/50'}`}>
                <Globe size={12} />
                {t('nav.language')}
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className={`w-full rounded-xl px-3 py-2 text-xs font-bold transition-all focus:ring-2 focus:outline-none ${theme === 'dark' ? 'border-white/10 bg-white/5 text-off-white focus:ring-silver-glowing/20' : 'border-cocoa-deep/10 bg-cream-soft text-cocoa-deep focus:ring-gold-brushed/20'}`}
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code} className="text-black">
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={`flex rounded-full p-1 transition-all ${theme === 'dark' ? 'border border-white/5 bg-slate-rich' : 'border border-gold-brushed/20 bg-cream-soft'}`}>
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-[10px] font-bold transition-all ${theme === 'light' ? 'bg-gold-brushed text-white shadow-md glow-gold scale-105' : 'text-cocoa-deep/40 hover:text-cocoa-deep'}`}
              >
                <Sun size={12} />
                {theme === 'light' ? `${t('nav.theme.light')}: ON` : t('nav.theme.light')}
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-[10px] font-bold transition-all ${theme === 'dark' ? 'bg-silver-glowing text-charcoal-deep shadow-md glow-silver scale-105' : 'text-off-white/40 hover:text-off-white'}`}
              >
                <Moon size={12} />
                {theme === 'dark' ? `${t('nav.theme.dark')}: ON` : t('nav.theme.dark')}
              </button>
            </div>

            {user ? (
              <div className="space-y-2">
                <div className={`flex items-center gap-3 rounded-xl px-4 py-2 text-xs font-bold ${theme === 'dark' ? 'bg-white/10 text-off-white' : 'bg-cocoa-deep/5 text-cocoa-deep'}`}>
                  <User size={16} />
                  <span className="truncate">{user.displayName || user.email}</span>
                </div>
                <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl bg-red-500/10 px-4 py-2 text-xs font-bold text-red-500 transition-all hover:bg-red-500/20">
                  <LogOut size={16} />
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-2 text-xs font-bold transition-all ${theme === 'dark' ? 'bg-white/5 text-off-white hover:bg-white/10' : 'bg-cocoa-deep/5 text-cocoa-deep hover:bg-cocoa-deep/10'}`}
              >
                <LogIn size={16} />
                {t('nav.login')}
              </button>
            )}

            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'bg-silver-glowing/10 text-silver-glowing' : 'bg-gold-brushed/10 text-gold-brushed'}`}>
              <ShieldCheck size={14} />
              {t('nav.grounded')}
            </div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className={`safe-top sticky top-0 z-50 flex items-center justify-between border-b px-4 py-4 backdrop-blur-md transition-all duration-500 md:hidden ${theme === 'dark' ? 'border-white/5 bg-charcoal-deep/80' : 'border-cocoa-deep/5 bg-beige-pale/80'}`}>
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${theme === 'dark' ? 'bg-silver-glowing glow-silver' : 'bg-gold-brushed glow-gold'}`}>
                <Scale size={18} />
              </div>
              <div>
                <h1 className={`serif text-lg font-bold ${theme === 'dark' ? 'text-off-white' : 'text-cocoa-deep'}`}>{t('law.title')}</h1>
                <p className={`text-[10px] uppercase tracking-[0.25em] ${theme === 'dark' ? 'text-off-white/40' : 'text-cocoa-deep/40'}`}>{standaloneApp ? 'Installed app' : 'Mobile mode'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {user && <div className={`rounded-full px-3 py-1 text-[10px] font-bold ${theme === 'dark' ? 'bg-white/5 text-off-white/70' : 'bg-white/70 text-cocoa-deep/70'}`}>{user.displayName?.split(' ')[0] || 'User'}</div>}
              <button onClick={() => setShowMobileSettings(true)} className={`rounded-full p-2 ${theme === 'dark' ? 'bg-white/5 text-off-white' : 'bg-white/70 text-cocoa-deep'}`} aria-label="Open mobile settings">
                <Settings size={18} />
              </button>
            </div>
          </header>

          <main className={`flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 ${mobileViewport ? 'pb-28' : ''}`}>
            {!user && activeTab === 'history' ? (
              <div className="flex h-full flex-col items-center justify-center space-y-6 text-center">
                <div className={`flex h-20 w-20 items-center justify-center rounded-full ${theme === 'dark' ? 'bg-silver-glowing/10 text-silver-glowing' : 'bg-gold-brushed/10 text-gold-brushed'}`}>
                  <ShieldCheck size={40} />
                </div>
                <div className="max-w-sm">
                  <h3 className={`serif mb-2 text-xl font-bold ${theme === 'dark' ? 'text-off-white' : 'text-cocoa-deep'}`}>{t('history.login_required')}</h3>
                  <p className={`text-sm opacity-60 ${theme === 'dark' ? 'text-off-white' : 'text-cocoa-deep'}`}>{t('history.login_desc')}</p>
                </div>
                <button
                  onClick={() => setShowAuth(true)}
                  className={`rounded-2xl px-8 py-3 text-sm font-bold transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-silver-glowing text-charcoal-deep shadow-lg shadow-silver-glowing/20' : 'bg-gold-brushed text-white shadow-lg shadow-gold-brushed/20'}`}
                >
                  {t('history.sign_in_btn')}
                </button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  {activeTab === 'docs' && <DocumentExplainer language={language} theme={theme} isReadingMode={isReadingMode} initialHistory={selectedHistory?.type === 'doc' ? selectedHistory : null} />}
                  {activeTab === 'law' && <LawExplainer language={language} theme={theme} isReadingMode={isReadingMode} initialHistory={selectedHistory?.type === 'law' ? selectedHistory : null} />}
                  {activeTab === 'history' && (
                    <History
                      theme={theme}
                      onSelectItem={(item: any) => {
                        setSelectedHistory(item);
                        setActiveTab(item.type === 'doc' ? 'docs' : 'law');
                      }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </main>

          {mobileViewport && (
            <nav className={`safe-bottom fixed right-4 bottom-4 left-4 z-50 grid grid-cols-3 gap-2 rounded-[28px] border p-2 shadow-2xl backdrop-blur-md md:hidden ${theme === 'dark' ? 'border-white/10 bg-slate-rich/90' : 'border-gold-brushed/10 bg-cream-soft/90'}`}>
              {mobileNavItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex flex-col items-center gap-1 rounded-[20px] px-3 py-3 text-[11px] font-bold transition-all ${
                      active
                        ? theme === 'dark'
                          ? 'bg-silver-glowing text-charcoal-deep glow-silver'
                          : 'bg-gold-brushed text-white glow-gold'
                        : theme === 'dark'
                          ? 'text-off-white/60'
                          : 'text-cocoa-deep/60'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          <footer className={`px-6 py-4 text-center opacity-40 ${theme === 'dark' ? 'text-off-white' : 'text-cocoa-deep'} ${mobileViewport ? 'pb-24 md:pb-4' : ''}`}>
            <p className="text-[10px] font-medium">{t('footer.disclaimer')}</p>
          </footer>
        </div>
      </div>
    </div>
  );
}

function SidebarButton({ active, onClick, icon, label, theme }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; theme: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-base font-bold transition-all ${
        active
          ? theme === 'dark'
            ? 'border border-white/5 bg-slate-rich text-silver-glowing shadow-lg glow-silver'
            : 'border border-gold-brushed/20 bg-cream-soft text-gold-brushed shadow-lg glow-gold'
          : theme === 'dark'
            ? 'text-off-white/50 hover:bg-white/5 hover:text-off-white'
            : 'text-cocoa-deep/50 hover:bg-cocoa-deep/5 hover:text-cocoa-deep'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default App;
