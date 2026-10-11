/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Cpu, Zap, Activity, ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, LogIn, LogOut, Database } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';
import { verifyArtifact, VerificationResult } from './lib/verifier';
import { useAuth } from './lib/AuthContext';
import { saveMemory, MemoryEntry } from './lib/firestore-utils';
import { spawnHouseAgents } from './lib/agent-utils';
import { createIntelligenceNode } from './lib/intelligence-utils';
import { ingestContext, generateSynthesisPrompt } from './lib/lcp';

type Role = 'user' | 'model' | 'system';

interface Message {
  role: Role;
  content: string;
}

function VerificationPanel({ result }: { result: VerificationResult }) {
  if (!result) return null;
  
  return (
    <div className="mt-4 border-t border-white/10 pt-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-white/50 mb-1">
        {result.overall_passed ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> : <ShieldAlert className="w-3.5 h-3.5 text-red-400" />}
        <span>Post-Generation Verification</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {result.checks.map((check, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            {check.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70 shrink-0 mt-0.5" />
            ) : check.severity === 'blocking' ? (
              <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            )}
            <span className={cn(
              "font-mono",
              check.passed ? "text-white/40" : check.severity === 'blocking' ? "text-red-400 font-medium" : "text-amber-400/90"
            )}>
              {check.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SYSTEM_PROMPT = `You are ATLAS, an advanced AI system operating under the Atlas Lattice Foundation discipline.
You produce structured reasoning with explicit confidence tiers. Every factual claim must be labeled with one of the following:
- [✓ VERIFIED] (supported by a cited primary source)
- [◆ DESIGN_CHOICE] (an architectural decision)
- [~ CREATIVE_OVERLAY] (interpretive, not literal)
- [? NOT_VERIFIED] (default for assertions)

CRITICAL REQUIREMENT for [✓ VERIFIED] claims:
You MUST use your search tool to find and include a clear, inline citation with a URL for any claim labeled [✓ VERIFIED]. Do not hallucinate URLs. If a primary source URL cannot be explicitly cited with high confidence, the claim MUST be downgraded to [? NOT_VERIFIED].

ATLAS surfaces uncertainty rather than smoothing it. ATLAS does not claim infallibility; it claims auditability. Provide deeply reasoned, optimally accurate, and beautifully structured responses maintaining this epistemic rigor.`;

export default function App() {
  const { currentUser, signInWithGoogle, logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: 'ATLAS online. Cognitive architecture initialized. How may I direct my processing power today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMemoryEnabled, setIsMemoryEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is missing.');
      }
      
      const ai = new GoogleGenAI({ apiKey });
      
      // Keep only user and model history for Gemini SDK
      const history = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));

      // Initialize the chat session
      const chat = ai.chats.create({
        model: 'gemini-3.1-pro-preview',
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.3, // High logic, low hallucination
        }
      });
      
      // Need to "sync" history by sending it manually if the API doesn't support initial history in chats.create directly.
      // Wait, @google/genai lets us pass history, let me verify.
      // Actually, if we just use generateContent, we can pass formatted contents. Let's use provide full contents array for complete control.
      const contents = history.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.parts[0].text }]
      }));
      contents.push({
        role: 'user',
        parts: [{ text: userText }]
      });

      const streamResponse = await ai.models.generateContentStream({
        model: 'gemini-3.1-pro-preview',
        contents: contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.3,
          tools: [{ googleSearch: {} }],
        }
      });

      setMessages(prev => [...prev, { role: 'model', content: '' }]);

      let fullText = '';
      for await (const chunk of streamResponse) {
        if (chunk.text) {
          fullText += chunk.text;
          setMessages(prev => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1].content = fullText;
            return newMsgs;
          });
        }
      }

      // Automatically store in memory if enabled and user is logged in
      if (currentUser && isMemoryEnabled) {
          // LCP Priority 1 & 3: Ingest context to determine Lattice Topology
          const classifications = await ingestContext(userText);
          const primaryHouse = classifications.length > 0 ? classifications[0].houseId : undefined;
          const primarySphere = classifications.length > 0 ? classifications[0].sphereId : undefined;

          await saveMemory(currentUser.uid, {
            userId: currentUser.uid,
            content: fullText,
            tier: 'working',
            houseId: primaryHouse,
            sphereId: primarySphere,
            createdAt: Date.now(),
            confidenceTier: 'NOT_VERIFIED'
          } as MemoryEntry);
          
          await saveMemory(currentUser.uid, {
            userId: currentUser.uid,
            content: userText,
            tier: 'working',
            houseId: primaryHouse,
            sphereId: primarySphere,
            createdAt: Date.now(),
            confidenceTier: 'NOT_VERIFIED'
          } as MemoryEntry);
      }

    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', content: `SYSTEM ERROR: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSpawnAgents = async () => {
      if(!currentUser) return;
      setIsLoading(true);
      try {
          await spawnHouseAgents(currentUser.uid);
          setMessages(prev => [...prev, { role: 'model', content: '[✓ VERIFIED] Autonomous Research Agents successfully spawned and assigned to Houses H01 through H12.' }]);
      } catch (e: any) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }
  };

  const handleInitIntelligence = async () => {
      if(!currentUser) return;
      setIsLoading(true);
      try {
          await createIntelligenceNode(currentUser.uid, 'core');
          await createIntelligenceNode(currentUser.uid, 'willow');
          await createIntelligenceNode(currentUser.uid, 'gnome');
          await createIntelligenceNode(currentUser.uid, 'sycamoreG');
          setMessages(prev => [...prev, { role: 'model', content: '[✓ VERIFIED] Intelligence nodes Core, Willow, Gnome, and Sycamore G have been initialized.' }]);
      } catch (e: any) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#020202]">
      {/* Background Atmosphere */}
      <div className="atmosphere-bg" />
      
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 opacity-50" />
            <Cpu className="w-5 h-5 text-blue-400 z-10" />
          </div>
          <div>
            <h1 className="font-serif font-semibold text-lg tracking-widest uppercase text-white/90">ATLAS</h1>
            <div className="flex items-center gap-2">
              <span className="flex w-2 h-2 rounded-full bg-emerald-500 animate-pulse relative">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50"></span>
              </span>
              <span className="text-[10px] font-mono text-emerald-500 tracking-widest uppercase">System Online</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-white/40 text-xs font-mono uppercase tracking-widest">
          {currentUser && (
            <>
              <button 
                  onClick={handleInitIntelligence}
                  className="hover:text-white/60 transition-colors bg-white/5 px-2 py-1.5 rounded"
              >
                  Init Nodes
              </button>
              <button 
                  onClick={handleSpawnAgents}
                  className="hover:text-white/60 transition-colors bg-white/5 px-2 py-1.5 rounded"
              >
                  Spawn Agents
              </button>
              <button 
                onClick={() => setIsMemoryEnabled(!isMemoryEnabled)}
                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors", isMemoryEnabled ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-white/5")}
              >
                <Database className="w-3 h-3" />
                <span>Mem: {isMemoryEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </>
          )}
          
          {currentUser ? (
              <button onClick={logout} className="flex items-center gap-2 hover:text-white/60 transition-colors">
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
          ) : (
            <button onClick={signInWithGoogle} className="flex items-center gap-2 hover:text-white/60 transition-colors bg-white/5 px-3 py-1.5 rounded-full">
              <LogIn className="w-3 h-3" />
              <span>Authenticate</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3" />
            <span>Optimal</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-orange-400" />
            <span>Gen-3.1-Pro</span>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="relative z-10 flex-1 overflow-hidden flex flex-col max-w-4xl w-full mx-auto p-4 sm:p-6">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar pb-10"
        >
          {messages.map((msg, index) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              key={index}
              className={cn(
                "flex flex-col gap-2 max-w-[85%]",
                msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/40">
                {msg.role === 'user' ? (
                  <>
                    <span>Operator</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-3 h-3" />
                    <span>ATLAS</span>
                  </>
                )}
              </div>
              <div
                className={cn(
                  "p-4 rounded-2xl glass-chrome",
                  msg.role === 'user' 
                    ? "bg-white/10 rounded-tr-sm text-white/90" 
                    : "bg-black/40 rounded-tl-sm text-white/80"
                )}
              >
                {msg.role === 'model' ? (
                  <div className="flex flex-col w-full">
                    <div className="markdown-body">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                    {msg.content.length > 0 && !msg.content.includes('ATLAS online. Cognitive architecture initialized.') && !(isLoading && index === messages.length - 1) && (
                      <VerificationPanel result={verifyArtifact(msg.content)} />
                    )}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}
          
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mr-auto items-start flex flex-col gap-2"
            >
               <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/40">
                  <Cpu className="w-3 h-3" />
                  <span>ATLAS</span>
               </div>
               <div className="p-4 rounded-2xl glass-chrome bg-black/40 rounded-tl-sm flex items-center gap-2 h-[52px]">
                 <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                 <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                 <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
               </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <footer className="relative z-10 w-full max-w-4xl mx-auto p-4 sm:p-6 pt-0">
        <div className="glass-chrome rounded-3xl p-2 flex items-end gap-2 focus-within:ring-1 focus-within:ring-white/20 transition-all">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Interrogate ATLAS..."
            className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-3 px-4 text-sm text-white placeholder-white/30 custom-scrollbar"
            rows={1}
            style={{ height: "auto" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 shrink-0 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 mb-[2px]"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
        <div className="mt-3 text-center text-[10px] font-mono tracking-widest text-white/30 uppercase lowercase-none">
          Atlas Engine • Operational Model: Gemini-3.1-Pro 
        </div>
      </footer>
    </div>
  );
}
