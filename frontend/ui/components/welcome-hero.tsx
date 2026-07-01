import React from 'react';
import { 
  FileText, 
  Search, 
  ShieldCheck,
  BrainCircuit,
  Activity,
  FolderOpen
} from 'lucide-react';
import { Card } from './ui/card';

interface WelcomeHeroProps {
  onNewTramite?: () => void;
  onExploreKnowledge?: () => void;
  userName?: string;
}

export const WelcomeHero: React.FC<WelcomeHeroProps> = ({ 
  onNewTramite, 
  onExploreKnowledge,
  userName = "Escribano" 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Encabezado Premium */}
      <div className="text-center mb-12 relative z-10 w-full max-w-3xl">
        <div className="mb-6 mx-auto inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 backdrop-blur-sm ring-1 ring-slate-900/10 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10 transition-all hover:bg-slate-900/10 dark:hover:bg-white/10">
          <ShieldCheck className="h-3 w-3 text-primary" />
          <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Sistema Notarial Soberano</span>
        </div>
        
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          Bienvenido, <span className="text-primary font-serif italic">{userName}</span>
        </h1>
        
        <p className="text-sm md:text-base text-slate-500 leading-relaxed max-w-xl mx-auto dark:text-slate-400 font-medium">
          El centro de comando inteligente para su escribanía. Todo el poder de la Inteligencia Artificial procesando documentos y normativas de forma local, rápida y segura.
        </p>
        </div>
    </div>
  );
};
