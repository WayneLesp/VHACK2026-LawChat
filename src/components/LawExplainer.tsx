import React, { useState, useRef } from 'react';
import { MessageSquare, Scale, FileSearch, ShieldAlert, Send, Mic, Camera, ChevronRight, Share2, BookOpen, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { askLaw, analyzeContract } from '../services/gemini';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useLocalization } from '../services/localization';
import { getCaptureInputProps } from '../services/mobile';

export const LawExplainer: React.FC<{ 
  language: string, 
  theme: string, 
  isReadingMode: boolean,
  initialHistory?: any
}> = ({ language, theme, isReadingMode: globalReadingMode, initialHistory }) => {
  const { t } = useLocalization();

  const CATEGORIES = React.useMemo(() => [
    { id: 'tenancy', name: t('cat.tenancy'), icon: '🏠', desc: t('cat.tenancy.desc') },
    { id: 'employment', name: t('cat.employment'), icon: '💼', desc: t('cat.employment.desc') },
    { id: 'consumer', name: t('cat.consumer'), icon: '🛒', desc: t('cat.consumer.desc') },
    { id: 'family', name: t('cat.family'), icon: '👨‍👩‍👧', desc: t('cat.family.desc') },
    { id: 'accidents', name: t('cat.accidents'), icon: '🚗', desc: t('cat.accidents.desc') },
    { id: 'welfare', name: t('cat.welfare'), icon: '🤝', desc: t('cat.welfare.desc') },
  ], [t]);

  const [mode, setMode] = useState<'chat' | 'contract'>('chat');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [contractResult, setContractResult] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [readingText, setReadingText] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  React.useEffect(() => {
    if (initialHistory) {
      setChatHistory([
        { role: 'user', text: initialHistory.query },
        { role: 'ai', text: initialHistory.response }
      ]);
      setMode('chat');
    }
  }, [initialHistory]);

  const startReadingMode = (text: string) => {
    setReadingText(text);
    setIsNarrating(true);
    setHighlightIndex(-1);
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'en' ? 'en-US' : (language === 'ms' ? 'ms-MY' : 'id-ID');
    utterance.rate = 0.9; // Slightly slower for clarity
    
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        // Find the word index
        const textBefore = text.substring(0, event.charIndex);
        const wordsBefore = textBefore.trim().split(/\s+/);
        setHighlightIndex(textBefore.trim() === '' ? 0 : wordsBefore.length);
      }
    };
    
    utterance.onend = () => {
      setHighlightIndex(-1);
    };
    
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopReadingMode = () => {
    window.speechSynthesis.cancel();
    setIsNarrating(false);
    setReadingText('');
    setHighlightIndex(-1);
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'en' ? 'en-US' : (language === 'ms' ? 'ms-MY' : 'id-ID');
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
    };

    recognition.start();
  };

  const handleChat = async (e?: React.FormEvent, customQuery?: string) => {
    e?.preventDefault();
    const messageToSend = customQuery || query;
    if (!messageToSend.trim()) return;

    setQuery('');
    setChatHistory(prev => [...prev, { role: 'user', text: messageToSend }]);
    setLoading(true);
    setMode('chat');

    try {
      const response = await askLaw(messageToSend, language, globalReadingMode);
      setChatHistory(prev => [...prev, { role: 'ai', text: response || '' }]);
      
      if (globalReadingMode && response) {
        startReadingMode(response);
      }

      // Save to Firestore if logged in
      if (auth.currentUser) {
        await addDoc(collection(db, 'history'), {
          userId: auth.currentUser.uid,
          type: 'law',
          query: messageToSend,
          response: response || '',
          timestamp: serverTimestamp(),
          language
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (cat: typeof CATEGORIES[0]) => {
    setActiveCategory(cat.id);
    handleChat(undefined, `Tell me about ${cat.name} rights in Malaysia.`);
  };

  const clearChat = () => {
    setChatHistory([]);
    setActiveCategory(null);
    setMode('chat');
  };

  const handleContractUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        setLoading(true);
        try {
          const dataUrl = reader.result as string;
          const extractedMimeType = dataUrl.split(':')[1].split(';')[0];
          const base64Data = dataUrl.split(',')[1];
          const data = await analyzeContract(base64Data, extractedMimeType, language);
          setContractResult(data);
          setMode('contract');
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      {/* Reading Mode Overlay */}
      <AnimatePresence>
        {isNarrating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 bg-[#F5F2EA] flex flex-col items-center justify-center p-8 md:p-20"
          >
            <button 
              onClick={stopReadingMode}
              className="absolute top-8 right-8 p-4 text-cocoa-deep/40 hover:text-cocoa-deep transition-colors"
            >
              <XCircle size={48} />
            </button>
            
            <div className="max-w-4xl w-full space-y-12 overflow-y-auto max-h-[80vh] pr-4 custom-scrollbar">
              <div className="flex items-center gap-4 text-cocoa-deep/60">
                <BookOpen size={32} />
                <span className="text-sm font-bold uppercase tracking-widest">{t('nav.readingMode')}</span>
              </div>
              
              <div className="text-4xl md:text-5xl font-serif leading-relaxed text-cocoa-deep">
                {readingText.split(/\s+/).map((word, i) => (
                  <span 
                    key={i} 
                    className={`inline-block mr-3 transition-colors duration-200 rounded px-1 ${
                      i === highlightIndex ? 'bg-gold-brushed text-white shadow-lg scale-110' : ''
                    }`}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-8">
              <div className="flex items-center gap-2 text-cocoa-deep/40">
                <div className="w-2 h-2 rounded-full bg-gold-brushed animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest">Narrating...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`max-w-7xl mx-auto space-y-8 pb-10 p-6 md:p-8 rounded-[40px] transition-all duration-500 ${theme === 'dark' ? 'bg-slate-rich border border-white/5' : 'bg-cream-soft border border-gold-brushed/10 shadow-xl'}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className={`text-2xl font-bold serif ${theme === 'dark' ? 'text-off-white' : 'text-cocoa-deep'}`}>{t('law.title')}</h2>
          <p className={`text-sm ${theme === 'dark' ? 'text-off-white/60' : 'text-cocoa-deep/60'} font-medium`}>{t('law.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar (Beside Chat) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="space-y-2">
            <h3 className={`text-[10px] font-bold uppercase tracking-widest px-2 ${theme === 'dark' ? 'text-off-white/40' : 'text-cocoa-deep/40'}`}>{t('law.quick_topics')}</h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              {CATEGORIES.map((cat) => (
                <button 
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group ${
                    activeCategory === cat.id 
                      ? (theme === 'dark' ? 'bg-silver-glowing text-charcoal-deep border-silver-glowing glow-silver' : 'bg-gold-brushed text-white border-gold-brushed glow-gold') 
                      : (theme === 'dark' ? 'bg-charcoal-deep border-white/5 text-off-white hover:border-silver-glowing/30 hover:bg-white/5' : 'bg-cream-soft border-gold-brushed/10 text-cocoa-deep hover:border-gold-brushed/30 hover:bg-beige-pale')
                  }`}
                >
                  <span className={`text-xl transition-transform ${activeCategory === cat.id ? '' : 'group-hover:scale-110'}`}>{cat.icon}</span>
                  <div>
                    <p className="text-sm font-bold">{cat.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className={`text-[10px] font-bold uppercase tracking-widest px-2 ${theme === 'dark' ? 'text-off-white/40' : 'text-cocoa-deep/40'}`}>{t('law.tools')}</h3>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => cameraInputRef.current?.click()}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left group ${
                  mode === 'contract' 
                    ? (theme === 'dark' ? 'bg-silver-glowing text-charcoal-deep border-silver-glowing' : 'bg-gold-brushed text-white border-gold-brushed') 
                    : (theme === 'dark' ? 'bg-white/5 border-white/10 text-off-white hover:bg-white/10' : 'bg-gold-brushed/5 border-gold-brushed/10 text-gold-brushed hover:bg-gold-brushed/10')
                }`}
              >
                <Camera size={18} />
                <p className="text-xs font-bold">{t('law.snap_contract')}</p>
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                  theme === 'dark' 
                    ? 'bg-white/5 border-white/10 text-off-white hover:bg-white/10' 
                    : 'bg-white border border-gold-brushed/10 text-cocoa-deep hover:bg-gold-brushed/5'
                }`}
              >
                <FileSearch size={18} />
                <p className="text-xs font-bold">Upload contract file</p>
              </button>
              <button 
                onClick={clearChat}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                  theme === 'dark' 
                    ? 'bg-white/5 border-white/10 text-off-white hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500' 
                    : 'bg-white border border-cocoa-deep/5 text-cocoa-deep hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                }`}
              >
                <MessageSquare size={18} />
                <p className="text-xs font-bold">{t('law.new_chat')}</p>
              </button>
            </div>
          </div>
          <input type="file" ref={cameraInputRef} onChange={handleContractUpload} className="hidden" {...getCaptureInputProps('camera')} />
          <input type="file" ref={fileInputRef} onChange={handleContractUpload} className="hidden" {...getCaptureInputProps('gallery')} />
        </div>

        {/* Main Interaction Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {mode === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className={`card min-h-137.5 flex flex-col shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-charcoal-deep border-white/5' : 'bg-cream-soft border-gold-brushed/10'}`}>
                  <div className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto max-h-150">
                    {chatHistory.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-silver-glowing/10 text-silver-glowing' : 'bg-gold-brushed/10 text-gold-brushed'}`}>
                          <MessageSquare size={40} />
                        </div>
                        <div className="space-y-2 max-w-sm">
                          <p className="font-bold text-xl serif">{t('law.welcome.title')}</p>
                          <p className="text-sm font-medium">{t('law.welcome.desc')}<br/>{t('law.welcome.example')}</p>
                        </div>
                      </div>
                    )}
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-5 rounded-3xl shadow-sm relative group ${
                          msg.role === 'user' 
                            ? (theme === 'dark' ? 'bg-silver-glowing text-charcoal-deep rounded-tr-none glow-silver' : 'bg-gold-brushed text-white rounded-tr-none glow-gold') 
                            : (theme === 'dark' ? 'bg-slate-rich text-off-white rounded-tl-none border border-white/5' : 'bg-beige-pale text-cocoa-deep rounded-tl-none border border-gold-brushed/5')
                        }`}>
                          <div className={`prose prose-sm max-w-none ${theme === 'dark' ? 'prose-invert' : 'prose-brand'}`}>
                            <Markdown>{msg.text}</Markdown>
                          </div>
                          {msg.role === 'ai' && (
                            <div className="absolute -right-12 top-0 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => startReadingMode(msg.text)}
                                className={`p-2 rounded-full transition-all ${
                                  theme === 'dark' ? 'bg-white/5 text-silver-glowing hover:bg-white/10' : 'bg-gold-brushed/5 text-gold-brushed hover:bg-gold-brushed/10'
                                }`}
                                title="Reading Mode"
                              >
                                <BookOpen size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className={`p-5 rounded-3xl rounded-tl-none border flex items-center gap-3 ${theme === 'dark' ? 'bg-slate-rich border-white/5 text-off-white' : 'bg-beige-pale border-gold-brushed/5 text-cocoa-deep'}`}>
                          <Loader2 className={`w-5 h-5 animate-spin ${theme === 'dark' ? 'text-silver-glowing' : 'text-gold-brushed'}`} />
                          <span className="text-sm font-bold">{t('law.thinking')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <form onSubmit={handleChat} className={`p-6 border-t flex gap-3 ${theme === 'dark' ? 'bg-slate-rich border-white/5' : 'bg-beige-pale border-gold-brushed/5'}`}>
                    <div className="relative">
                      <button 
                        type="button" 
                        onClick={startSpeechRecognition}
                        className={`p-3 transition-all rounded-full ${
                          isRecording 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : (theme === 'dark' ? 'text-off-white/40 hover:text-silver-glowing hover:bg-white/5' : 'text-cocoa-deep/40 hover:text-gold-brushed hover:bg-gold-brushed/5')
                        }`}
                      >
                        <Mic size={24} />
                      </button>
                      {isRecording && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute bottom-full mb-3 left-0 whitespace-nowrap bg-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg z-50"
                        >
                          {t('law.mic_note')}
                          <div className="absolute top-full left-4 border-8 border-transparent border-t-red-500" />
                        </motion.div>
                      )}
                    </div>
                    <input 
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t('law.placeholder')}
                      className={`flex-1 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 shadow-inner transition-all ${
                        theme === 'dark' 
                          ? 'bg-charcoal-deep border-white/10 text-off-white focus:ring-silver-glowing/20' 
                          : 'bg-cream-soft border-cocoa-deep/10 text-cocoa-deep focus:ring-gold-brushed/20'
                      }`}
                    />
                    <button 
                      disabled={loading || !query.trim()}
                      className={`p-4 rounded-2xl disabled:opacity-50 transition-all active:scale-90 shadow-xl ${
                        theme === 'dark' 
                          ? 'bg-silver-glowing text-charcoal-deep shadow-silver-glowing/20' 
                          : 'bg-gold-brushed text-white shadow-gold-brushed/20'
                      }`}
                    >
                      <Send size={24} />
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {mode === 'contract' && contractResult && (
              <motion.div 
                key="contract"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className={`card p-8 space-y-6 ${theme === 'dark' ? 'bg-slate-rich border-white/5' : 'bg-cream-soft border-gold-brushed/10'}`}>
                  <div className={`flex items-center gap-3 border-b pb-4 ${theme === 'dark' ? 'border-white/5' : 'border-gold-brushed/10'}`}>
                    <ShieldAlert className={theme === 'dark' ? 'text-silver-glowing' : 'text-gold-brushed'} />
                    <h3 className="text-xl font-bold">{t('law.contractAnalysis')}</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {contractResult.flags?.map((flag: any, i: number) => (
                      <div key={i} className={`p-5 rounded-3xl border-l-8 transition-all hover:scale-[1.01] ${
                        flag.isIllegal 
                          ? (theme === 'dark' ? 'bg-red-500/10 border-red-500' : 'bg-red-50 border-red-500') 
                          : (theme === 'dark' ? 'bg-silver-glowing/10 border-silver-glowing' : 'bg-gold-brushed/5 border-gold-brushed')
                      }`}>
                        <p className="font-bold text-[10px] uppercase tracking-widest mb-2">{flag.isIllegal ? t('law.illegalClause') : t('law.unfairClause')}</p>
                        <p className={`font-serif italic text-lg mb-3 ${theme === 'dark' ? 'text-off-white' : 'text-cocoa-deep'}`}>"{flag.clause}"</p>
                        <p className={`text-sm font-medium leading-relaxed ${theme === 'dark' ? 'text-off-white/70' : 'text-cocoa-deep/70'}`}>{flag.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`card p-10 space-y-6 relative overflow-hidden shadow-2xl ${
                  theme === 'dark' 
                    ? 'bg-silver-glowing text-charcoal-deep glow-silver' 
                    : 'bg-gold-brushed text-cocoa-deep glow-gold'
                }`}>
                  <div className="absolute top-0 right-0 p-12 opacity-10">
                    <Scale size={160} />
                  </div>
                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-3xl font-bold serif">{t('law.knowYourRights')}</h3>
                      <button className={`p-3 rounded-full transition-colors ${theme === 'dark' ? 'bg-charcoal-deep/10 hover:bg-charcoal-deep/20' : 'bg-white/20 hover:bg-white/30'}`}>
                        <Share2 size={24} />
                      </button>
                    </div>
                    <div className={`prose prose-lg max-w-none ${theme === 'dark' ? 'text-charcoal-deep' : 'text-cocoa-deep'}`}>
                      <Markdown>{contractResult.rightsSummary}</Markdown>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">{t('law.source')}</p>
                  </div>
                </div>

                <button 
                  onClick={() => { setContractResult(null); setMode('chat'); }}
                  className={`w-full py-6 font-bold text-sm uppercase tracking-widest transition-all hover:opacity-80 ${theme === 'dark' ? 'text-silver-glowing' : 'text-gold-brushed'}`}
                >
                  {t('law.analyzeAnother')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
    </>
  );
};

function Loader2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
