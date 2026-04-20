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
    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-6 text-center animate-in fade-in duration-1000">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Intelixencia Notarial Argentina
        </div>
        
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Bienvenido, <span className="text-primary">{userName}</span>
        </h1>
        
        <p className="mb-10 text-lg text-muted-foreground leading-relaxed">
          OfiSolve es su asistente inteligente para la gestión notarial. Optimice la redacción de escrituras, 
          certificaciones y consultas normativas con precisión jurídica total.
        </p>

        {/* Action Cards */}
        <div className="mb-12 grid gap-6 sm:grid-cols-2">
          <Card 
            className="group relative cursor-pointer overflow-hidden border-border/50 bg-card/50 p-6 transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5"
            onClick={onNewTramite}
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="mb-2 font-bold">Nuevo Trámite</h3>
            <p className="text-sm text-muted-foreground">Inicie una certificación o escritura de inmediato.</p>
            <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
          </Card>

          <Card 
            className="group relative cursor-pointer overflow-hidden border-border/50 bg-card/50 p-6 transition-all hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5"
            onClick={onExploreKnowledge}
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 transition-transform group-hover:scale-110">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="mb-2 font-bold">Biblioteca Legal</h3>
            <p className="text-sm text-muted-foreground">Consulte normativas y artículos del CCyCN.</p>
            <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
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
