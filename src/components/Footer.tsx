import { Heart, Code, Coffee } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Informações do Projeto */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Criador de Pôsteres</h3>
            <p className="text-sm text-muted-foreground">
              Ferramenta gratuita para dividir imagens em múltiplas páginas 
              e criar pôsteres impressos de alta qualidade.
            </p>
          </div>

          {/* Recursos */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Recursos</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Code className="h-3 w-3" />
                Múltiplos formatos de papel
              </li>
              <li className="flex items-center gap-2">
                <Code className="h-3 w-3" />
                Orientação personalizável
              </li>
              <li className="flex items-center gap-2">
                <Code className="h-3 w-3" />
                Export em PDF alta qualidade
              </li>
            </ul>
          </div>

          {/* Sobre */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Sobre</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>Feito com</span>
              <Heart className="h-3 w-3 text-red-500 fill-current" />
              <span>e muito</span>
              <Coffee className="h-3 w-3 text-amber-600" />
            </div>
            <p className="text-xs text-muted-foreground">
              © 2024 Criador de Pôsteres. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};