import React from 'react';
import { 
  Sparkles, 
  FileText, 
  Search, 
  Users, 
  ArrowRight,
  ShieldCheck,
  BrainCircuit,
  Zap
} from 'lucide-react';
import { Button } from './ui/button';
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
    <div className="flex flex-col items-center justify-center p-6 text-center animate-premium-in min-h-[400px]">

      <div className="relative z-10 max-w-2xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
          <ShieldCheck className="h-3 w-3" />
          Sistema Notarial Soberano
        </div>
        
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50">
          Panel de Trabajo, <span className="text-primary">{userName}</span>
        </h1>
        
        <p className="mb-10 text-base text-slate-500 leading-relaxed max-w-lg mx-auto dark:text-slate-400">
          Gestione sus trámites con inteligencia artificial especializada. 
          Redacción de escrituras, validación de identidad y consultas normativas en un solo entorno seguro.
        </p>

        {/* Action Cards */}
        <div className="mb-12 grid gap-4 sm:grid-cols-2 max-w-xl mx-auto w-full">
          <Card 
            className="group relative cursor-pointer overflow-hidden border-border bg-white p-8 transition-all hover:border-primary/50 hover:shadow-md active:scale-[0.98] dark:bg-slate-900/50 dark:border-slate-800"
            onClick={onNewTramite}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100 transition-colors group-hover:bg-primary/10 group-hover:text-primary dark:bg-slate-800/50 dark:ring-slate-700">
              <FileText className="h-7 w-7" />
            </div>
            <h3 className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-200">Iniciar Nuevo Trámite</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Comience una nueva certificación o acta.</p>
          </Card>

          <Card 
            className="group relative cursor-pointer overflow-hidden border-border bg-white p-8 transition-all hover:border-blue-500/50 hover:shadow-md active:scale-[0.98] dark:bg-slate-900/50 dark:border-slate-800"
            onClick={onExploreKnowledge}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600 dark:bg-slate-800/50 dark:ring-slate-700">
              <Search className="h-7 w-7" />
            </div>
            <h3 className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-200">Biblioteca Legal</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Normativas y artículos del CCyCN.</p>
          </Card>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Seguridad Notarial
          </div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-purple-500" />
            RAG Local (sin nubes)
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Respuesta Instantánea
          </div>
        </div>
      </div>
    </div>
  );
};
