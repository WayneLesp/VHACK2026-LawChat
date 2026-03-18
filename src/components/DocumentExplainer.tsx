import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, FileText, ArrowRight, Loader2, CheckCircle2, Download, Share2, MessageSquare, Send, X, AlertCircle, ShieldCheck, Mic, BookOpen, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { explainDocument, chatWithDocument } from '../services/gemini';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useLocalization } from '../services/localization';
import { getCaptureInputProps } from '../services/mobile';

export const DocumentExplainer: React.FC<{ 
  language: string, 
  theme: string, 
  isReadingMode: boolean,
  initialHistory?: any
}> = ({ language, theme, isReadingMode: globalReadingMode, initialHistory }) => {
  const { t } = useLocalization();
  const [file, setFile] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', parts: {text: string}[]}[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [readingText, setReadingText] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (initialHistory) {
      setResult({ fullMarkdown: initialHistory.response });
      setShowAnalysis(true);
    }
  }, [initialHistory]);

  const startReadingMode = (text: string) => {
    setReadingText(text);
    setIsNarrating(true);
    setHighlightIndex(-1);
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'en' ? 'en-US' : (language === 'ms' ? 'ms-MY' : 'id-ID');
    utterance.rate = 0.9;
    
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
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
      setChatInput(transcript);
    };

    recognition.start();
  };

  const loadingMessages = React.useMemo(() => [
    t('docs.loading.1'),
    t('docs.loading.2'),
    t('docs.loading.3'),
    t('docs.loading.4')
  ], [t]);

  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 2000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const extractedMimeType = dataUrl.split(':')[1].split(';')[0];
        setFile(dataUrl);
        setMimeType(extractedMimeType);
        processDocument(dataUrl, extractedMimeType);
      };
      reader.readAsDataURL(file);
    }
  };

  const processDocument = async (base64: string, currentMimeType: string) => {
    setLoading(true);
    setError(null);
    try {
      const base64Data = base64.split(',')[1];
      const data = await explainDocument(base64Data, currentMimeType, language);
      setResult(data);
      setShowAnalysis(true);

      // Save to Firestore if logged in
      if (auth.currentUser) {
        await addDoc(collection(db, 'history'), {
          userId: auth.currentUser.uid,
          type: 'doc',
          query: 'Document Analysis',
          response: data.fullMarkdown || '',
          timestamp: serverTimestamp(),
          language
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "无法连接到 Gemini API。请检查您的网络连接或稍后再试。");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !file || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', parts: [{ text: userMessage }] }]);
    setChatLoading(true);

    try {
      const base64Data = file.split(',')[1];
      const response = await chatWithDocument(
        userMessage, 
        base64Data, 
        mimeType, 
        chatHistory.map(h => ({ role: h.role, parts: h.parts })), 
        language,
        globalReadingMode
      );
      
      const aiMsg = { role: 'model' as const, parts: [{ text: response || '' }] };
      setChatHistory(prev => [...prev, aiMsg]);
      
      if (globalReadingMode && response) {
        startReadingMode(response);
      }
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: "抱歉，处理您的问题时出现了错误。请稍后再试。" }] }]);
    } finally {
      setChatLoading(false);
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
          <h2 className={`text-2xl font-bold serif ${theme === 'dark' ? 'text-off-white' : 'text-cocoa-deep'}`}>{t('docs.title')}</h2>
          <p className={`text-sm ${theme === 'dark' ? 'text-off-white/60' : 'text-cocoa-deep/60'} font-medium`}>{t('docs.subtitle')}</p>
        </div>
      </div>

      {!showAnalysis && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => cameraInputRef.current?.click()}
            className={`card p-8 md:p-12 flex flex-col items-center justify-center gap-4 transition-all group border-2 ${
              theme === 'dark' 
                ? 'bg-charcoal-deep border-white/5 hover:border-silver-glowing/30 hover:bg-white/5' 
                : 'bg-cream-soft border-gold-brushed/10 hover:border-gold-brushed/30 hover:bg-beige-pale'
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner ${
              theme === 'dark' ? 'bg-silver-glowing/10 text-silver-glowing' : 'bg-gold-brushed/10 text-gold-brushed'
            }`}>
              <Camera size={32} />
            </div>
            <div className="text-center space-y-1">
              <p className={`font-bold text-xl ${theme === 'dark' ? 'text-off-white' : 'text-cocoa-deep'}`}>{t('docs.snapPhoto')}</p>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-off-white/60' : 'text-cocoa-deep/60'}`}>{t('docs.snapPhotoDesc')}</p>
            </div>
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className={`card p-8 md:p-12 flex flex-col items-center justify-center gap-4 transition-all group border-2 ${
              theme === 'dark' 
                ? 'bg-charcoal-deep border-white/5 hover:border-silver-glowing/30 hover:bg-white/5' 
                : 'bg-cream-soft border-gold-brushed/10 hover:border-gold-brushed/30 hover:bg-beige-pale'
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner ${
              theme === 'dark' ? 'bg-silver-glowing/10 text-silver-glowing' : 'bg-gold-brushed/10 text-gold-brushed'
            }`}>
              <Upload size={32} />
            </div>
            <div className="text-center space-y-1">
              <p className={`font-bold text-xl ${theme === 'dark' ? 'text-off-white' : 'text-cocoa-deep'}`}>{t('docs.uploadFile')}</p>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-off-white/60' : 'text-cocoa-deep/60'}`}>{t('docs.uploadFileDesc')}</p>
            </div>
          </button>
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileUpload}
            className="hidden"
            {...getCaptureInputProps('camera')}
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            {...getCaptureInputProps('gallery')}
          />
        </div>
      )}

      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`fixed inset-0 z-100 flex items-center justify-center p-6 backdrop-blur-xl ${
              theme === 'dark' ? 'bg-charcoal-deep/80' : 'bg-beige-pale/80'
            }`}
          >
            <div className="text-center space-y-8">
              <div className={`w-24 h-24 mx-auto rounded-3xl animate-spin flex items-center justify-center text-white shadow-2xl ${
                theme === 'dark' ? 'bg-silver-glowing glow-silver' : 'bg-gold-brushed glow-gold'
              }`}>
                <Loader2 size={48} />
              </div>
              <div className="space-y-4">
                <p className={`text-3xl font-bold serif ${theme === 'dark' ? 'text-off-white' : 'text-cocoa-deep'}`}>{loadingMessages[loadingStep]}</p>
                <p className={`text-lg font-medium animate-pulse ${theme === 'dark' ? 'text-silver-glowing' : 'text-gold-brushed'}`}>{t('docs.loadingTime')}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="card p-6 bg-red-50 border-red-100 flex items-center gap-4 text-red-600">
          <AlertCircle size={24} />
          <div className="flex-1">
            <p className="font-bold">{t('docs.errorTitle')}</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      )}

      <AnimatePresence>
        {showAnalysis && result && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-charcoal-deep/60 backdrop-blur-md z-100 flex items-center justify-center p-4 md:p-8"
          >
            <div className={`w-full max-w-[95vw] md:max-w-7xl h-full max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col border transition-all duration-500 ${
              theme === 'dark' ? 'bg-charcoal-deep border-white/10' : 'bg-beige-pale border-gold-brushed/20'
            }`}>
              {/* Header */}
              <div className={`p-8 border-b flex items-center justify-between shadow-lg transition-all ${
                theme === 'dark' ? 'bg-slate-rich border-white/5 text-off-white' : 'bg-gold-brushed border-gold-brushed/10 text-white'
              }`}>
                <div className="flex items-center gap-4">
                  <FileText size={32} />
                  <h3 className="text-2xl font-bold tracking-tight serif">{t('docs.reportTitle')}</h3>
                </div>
                <button 
                  onClick={() => { setShowAnalysis(false); setResult(null); setFile(null); setChatHistory([]); }}
                  className={`p-3 rounded-full transition-all hover:rotate-90 ${
                    theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-white/20 hover:bg-white/30'
                  }`}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Left Side: Analysis Content */}
                <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12 border-r border-brand-cream dark:border-white/10">
                  <div className="space-y-12">
                    {Object.entries(result).filter(([k]) => k !== 'fullMarkdown').map(([key, value]) => (
                      <section key={key} className={`card p-10 space-y-6 transition-all hover:scale-[1.01] ${
                        theme === 'dark' ? 'bg-slate-rich border-white/5 shadow-none' : 'bg-cream-soft border-gold-brushed/10 shadow-xl'
                      }`}>
                        <div className={`flex items-center gap-4 border-b pb-4 ${theme === 'dark' ? 'border-white/5' : 'border-gold-brushed/10'}`}>
                          <div className={`w-3 h-8 rounded-full ${theme === 'dark' ? 'bg-silver-glowing' : 'bg-gold-brushed'}`} />
                          <span className={`text-xl font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-silver-glowing' : 'text-gold-brushed'}`}>
                            {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                          </span>
                        </div>
                        <div className={`prose prose-lg max-w-none leading-relaxed ${theme === 'dark' ? 'prose-invert text-off-white/80' : 'text-cocoa-deep/80'}`}>
                          <Markdown>{String(value)}</Markdown>
                        </div>
                      </section>
                    ))}
                  </div>

                  <div className={`p-10 rounded-4xl border-2 border-dashed text-center space-y-4 ${
                    theme === 'dark' ? 'bg-silver-glowing/5 border-silver-glowing/20' : 'bg-gold-brushed/5 border-gold-brushed/20'
                  }`}>
                    <ShieldCheck className={`mx-auto ${theme === 'dark' ? 'text-silver-glowing' : 'text-gold-brushed'}`} size={48} />
                    <p className={`text-lg font-bold serif ${theme === 'dark' ? 'text-off-white' : 'text-cocoa-deep'}`}>
                      {t('docs.disclaimer')}
                    </p>
                  </div>
                </div>

                {/* Right Side: Follow-up Chat */}
                <div className={`w-full md:w-112.5 flex flex-col transition-all ${
                  theme === 'dark' ? 'bg-charcoal-deep border-white/5' : 'bg-cream-soft border-gold-brushed/10'
                }`}>
                  <div className={`p-6 border-b flex items-center gap-3 ${theme === 'dark' ? 'border-white/5' : 'border-gold-brushed/10'}`}>
                    <MessageSquare className={theme === 'dark' ? 'text-silver-glowing' : 'text-gold-brushed'} />
                    <h4 className={`font-bold text-lg serif ${theme === 'dark' ? 'text-off-white' : 'text-cocoa-deep'}`}>{t('docs.followUp')}</h4>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {chatHistory.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 opacity-40">
                        <MessageSquare size={40} />
                        <p className="text-xs font-bold">{t('docs.followUpDesc')}</p>
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
                            <Markdown>{msg.parts[0].text}</Markdown>
                          </div>
                          {msg.role === 'model' && (
                            <div className="absolute -right-12 top-0 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => startReadingMode(msg.parts[0].text)}
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
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className={`p-5 rounded-3xl rounded-tl-none border flex items-center gap-3 ${theme === 'dark' ? 'bg-slate-rich border-white/5 text-off-white' : 'bg-beige-pale border-gold-brushed/5 text-cocoa-deep'}`}>
                          <Loader2 className={`w-5 h-5 animate-spin ${theme === 'dark' ? 'text-silver-glowing' : 'text-gold-brushed'}`} />
                          <span className="text-sm font-bold">{t('docs.thinking')}</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className={`p-6 border-t flex gap-3 ${theme === 'dark' ? 'bg-slate-rich border-white/5' : 'bg-beige-pale border-gold-brushed/5'}`}>
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
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={t('docs.placeholder')}
                      className={`flex-1 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 shadow-inner transition-all ${
                        theme === 'dark' 
                          ? 'bg-charcoal-deep border-white/10 text-off-white focus:ring-silver-glowing/20' 
                          : 'bg-cream-soft border-cocoa-deep/10 text-cocoa-deep focus:ring-gold-brushed/20'
                      }`}
                    />
                    <button 
                      disabled={chatLoading || !chatInput.trim()}
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
};
