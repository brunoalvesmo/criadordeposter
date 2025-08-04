import { useState, useRef, useCallback } from "react";
import { Upload, Download, Grid, Image as ImageIcon, Settings, Eye, RotateCcw, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface GridConfig {
  horizontal: number;
  vertical: number;
}

interface ImageData {
  file: File;
  url: string;
  width: number;
  height: number;
}

type PaperFormat = 'a4' | 'letter' | 'a3' | 'tabloid';
type Orientation = 'portrait' | 'landscape';

const PAPER_FORMATS = {
  a4: { width: 210, height: 297, name: 'A4' },
  letter: { width: 216, height: 279, name: 'Carta (Letter)' },
  a3: { width: 297, height: 420, name: 'A3' },
  tabloid: { width: 279, height: 432, name: 'Tabloid' }
};

export const PosterCreator = () => {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [gridConfig, setGridConfig] = useState<GridConfig>({ horizontal: 2, vertical: 2 });
  const [previewData, setPreviewData] = useState<string[]>([]);
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);
  const [paperFormat, setPaperFormat] = useState<PaperFormat>('a4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [showGuideLines, setShowGuideLines] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error("Formato não suportado. Use PNG, JPEG ou WebP.");
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      setImageData({
        file,
        url,
        width: img.naturalWidth,
        height: img.naturalHeight
      });
      toast.success("Imagem carregada com sucesso!");
    };
    
    img.src = url;
  }, []);

  const generatePreview = useCallback(async () => {
    if (!imageData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = imageData.url;

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const totalCols = gridConfig.horizontal;
    const totalRows = gridConfig.vertical;
    
    // Calcular o tamanho de cada pedaço
    const pieceWidth = imageData.width / totalCols;
    const pieceHeight = imageData.height / totalRows;
    
    canvas.width = pieceWidth;
    canvas.height = pieceHeight;

    const pieces: string[] = [];

    for (let row = 0; row < totalRows; row++) {
      for (let col = 0; col < totalCols; col++) {
        ctx.clearRect(0, 0, pieceWidth, pieceHeight);
        
        // Desenhar o pedaço da imagem
        ctx.drawImage(
          img,
          col * pieceWidth, row * pieceHeight, pieceWidth, pieceHeight,
          0, 0, pieceWidth, pieceHeight
        );

        pieces.push(canvas.toDataURL('image/png'));
      }
    }

    setPreviewData(pieces);
    toast.success("Pré-visualização gerada!");
  }, [imageData, gridConfig]);

  const generatePDF = useCallback(async () => {
    if (!previewData.length) {
      toast.error("Gere a pré-visualização primeiro!");
      return;
    }

    const paperConfig = PAPER_FORMATS[paperFormat];
    const isLandscape = orientation === 'landscape';
    
    // Configurar o PDF com formato e orientação
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: [paperConfig.width, paperConfig.height]
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = pageWidth - 2 * margin;
    const maxHeight = pageHeight - 2 * margin;

    // Informações do grid para as marcações
    const totalCols = gridConfig.horizontal;
    const totalRows = gridConfig.vertical;

    for (let i = 0; i < previewData.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      // Calcular posição no grid (qual linha e coluna)
      const col = i % totalCols;
      const row = Math.floor(i / totalCols);

      // Cabeçalho com informações
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Página ${i + 1} de ${previewData.length}`, margin, margin - 5);
      pdf.text(`Grid: ${col + 1},${row + 1} | ${paperConfig.name} ${orientation === 'portrait' ? 'Retrato' : 'Paisagem'}`, pageWidth - 60, margin - 5);
      
      // Calcular posição e tamanho da imagem
      const imgData = previewData[i];
      const aspectRatio = imageData!.width / gridConfig.horizontal / (imageData!.height / gridConfig.vertical);
      
      let imgWidth, imgHeight;
      const availableHeight = maxHeight - 25; // Espaço para cabeçalho e instruções
      
      if (aspectRatio > maxWidth / availableHeight) {
        imgWidth = maxWidth;
        imgHeight = maxWidth / aspectRatio;
      } else {
        imgHeight = availableHeight;
        imgWidth = availableHeight * aspectRatio;
      }

      const x = (pageWidth - imgWidth) / 2;
      const y = margin + 15;

      // Adicionar imagem
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      
      // Adicionar linhas guia se habilitadas
      if (showGuideLines) {
        pdf.setDrawColor(150, 150, 150);
        pdf.setLineWidth(0.2);
        
        // Borda principal
        pdf.rect(x - 3, y - 3, imgWidth + 6, imgHeight + 6);
        
        // Marcações de corte nos cantos
        const markSize = 5;
        pdf.setLineWidth(0.3);
        
        // Canto superior esquerdo
        pdf.line(x - 8, y - 3, x - 3, y - 3);
        pdf.line(x - 3, y - 8, x - 3, y - 3);
        
        // Canto superior direito
        pdf.line(x + imgWidth + 3, y - 8, x + imgWidth + 3, y - 3);
        pdf.line(x + imgWidth + 3, y - 3, x + imgWidth + 8, y - 3);
        
        // Canto inferior esquerdo
        pdf.line(x - 8, y + imgHeight + 3, x - 3, y + imgHeight + 3);
        pdf.line(x - 3, y + imgHeight + 3, x - 3, y + imgHeight + 8);
        
        // Canto inferior direito
        pdf.line(x + imgWidth + 3, y + imgHeight + 3, x + imgWidth + 8, y + imgHeight + 3);
        pdf.line(x + imgWidth + 3, y + imgHeight + 8, x + imgWidth + 3, y + imgHeight + 3);
        
        // Linha central para alinhamento
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.1);
        pdf.line(pageWidth / 2, y - 5, pageWidth / 2, y + imgHeight + 5);
        pdf.line(x - 5, pageHeight / 2, x + imgWidth + 5, pageHeight / 2);
      }

      // Instruções na parte inferior
      pdf.setFontSize(8);
      pdf.setTextColor(120);
      const instructions = `Posição: Coluna ${col + 1}, Linha ${row + 1} | Cole as páginas seguindo a ordem numérica`;
      pdf.text(instructions, pageWidth / 2, pageHeight - 5, { align: 'center' });
    }

    const filename = `poster-${gridConfig.horizontal}x${gridConfig.vertical}-${paperFormat}-${orientation}.pdf`;
    pdf.save(filename);
    toast.success("PDF gerado e baixado!");
  }, [previewData, gridConfig, imageData, paperFormat, orientation, showGuideLines]);

  const dragHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find(file => 
        ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      );
      
      if (imageFile) {
        const event = { target: { files: [imageFile] } } as any;
        handleFileSelect(event);
      }
    }
  };

  const gridStyle = {
    gridTemplateColumns: `repeat(${gridConfig.horizontal}, 1fr)`
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-background via-accent/20 to-background">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Criador de Pôsteres
          </h1>
          <p className="text-muted-foreground text-lg">
            Divida sua imagem em múltiplas páginas para criar pôsteres impressos
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload da Imagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                {...dragHandlers}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  Clique aqui ou arraste uma imagem
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  PNG, JPEG, WebP até 10MB
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              {imageData && (
                <div className="space-y-2">
                  <img
                    src={imageData.url}
                    alt="Preview"
                    className="w-full h-48 object-contain rounded-lg border"
                  />
                  <p className="text-sm text-muted-foreground">
                    {imageData.width} × {imageData.height} pixels
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuration Section */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuração
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="horizontal">Páginas Horizontais</Label>
                  <Input
                    id="horizontal"
                    type="number"
                    min="1"
                    max="10"
                    value={gridConfig.horizontal}
                    onChange={(e) => setGridConfig(prev => ({
                      ...prev,
                      horizontal: parseInt(e.target.value) || 1
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="vertical">Páginas Verticais</Label>
                  <Input
                    id="vertical"
                    type="number"
                    min="1"
                    max="10"
                    value={gridConfig.vertical}
                    onChange={(e) => setGridConfig(prev => ({
                      ...prev,
                      vertical: parseInt(e.target.value) || 1
                    }))}
                  />
                </div>
              </div>

              {/* Configurações de Impressão */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  <Label className="font-medium">Configurações de Impressão</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="paperFormat">Formato do Papel</Label>
                    <Select value={paperFormat} onValueChange={(value: PaperFormat) => setPaperFormat(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAPER_FORMATS).map(([key, format]) => (
                          <SelectItem key={key} value={key}>
                            {format.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="orientation">Orientação</Label>
                    <Select value={orientation} onValueChange={(value: Orientation) => setOrientation(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-4 border border-current"></div>
                            Retrato
                          </div>
                        </SelectItem>
                        <SelectItem value="landscape">
                          <div className="flex items-center gap-2">
                            <RotateCcw className="h-3 w-3" />
                            Paisagem
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="guidelines">Linhas Guia</Label>
                    <p className="text-xs text-muted-foreground">
                      Adicionar marcações para recorte e montagem
                    </p>
                  </div>
                  <Switch
                    id="guidelines"
                    checked={showGuideLines}
                    onCheckedChange={setShowGuideLines}
                  />
                </div>
              </div>

              <div className="p-4 bg-accent rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Grid className="h-4 w-4" />
                  <span className="font-medium">Total de Páginas</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {gridConfig.horizontal * gridConfig.vertical}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {PAPER_FORMATS[paperFormat].name} • {orientation === 'portrait' ? 'Retrato' : 'Paisagem'}
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={generatePreview}
                  disabled={!imageData}
                  className="w-full"
                  variant="outline"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Gerar Pré-visualização
                </Button>
                
                <Button
                  onClick={generatePDF}
                  disabled={!previewData.length}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview Section */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Pré-visualização
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewData.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-2" style={gridStyle}>
                    {previewData.map((piece, index) => (
                      <div
                        key={index}
                        className="relative aspect-square border-2 border-border rounded-lg overflow-hidden cursor-pointer hover:border-primary transition-colors"
                        onClick={() => setSelectedPreview(index)}
                      >
                        <img
                          src={piece}
                          alt={`Página ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <span className="text-white text-xs font-medium">
                            Página {index + 1}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {selectedPreview !== null && (
                    <div className="space-y-2">
                      <Label>Página {selectedPreview + 1} - Ampliada</Label>
                      <img
                        src={previewData[selectedPreview]}
                        alt={`Página ${selectedPreview + 1} ampliada`}
                        className="w-full border rounded-lg"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Grid className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Gere a pré-visualização para ver como ficará seu pôster</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};