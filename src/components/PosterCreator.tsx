import { useState, useRef, useCallback } from "react";
import { Upload, Download, Grid, Image as ImageIcon, Settings, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    
    // Configurar o PDF com formato e orientação
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: [paperConfig.width, paperConfig.height]
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 5; // Margem mínima para impressão
    const maxWidth = pageWidth - 2 * margin;
    const maxHeight = pageHeight - 2 * margin;

    // Informações do grid
    const totalCols = gridConfig.horizontal;
    const totalRows = gridConfig.vertical;

    for (let i = 0; i < previewData.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      // Calcular posição no grid (qual linha e coluna)
      const col = i % totalCols;
      const row = Math.floor(i / totalCols);
      
      // Calcular posição e tamanho da imagem para ocupar o máximo da página
      const imgData = previewData[i];
      const aspectRatio = imageData!.width / gridConfig.horizontal / (imageData!.height / gridConfig.vertical);
      
      let imgWidth, imgHeight;
      
      // Maximizar o uso da página
      if (aspectRatio > maxWidth / maxHeight) {
        imgWidth = maxWidth;
        imgHeight = maxWidth / aspectRatio;
      } else {
        imgHeight = maxHeight;
        imgWidth = maxHeight * aspectRatio;
      }

      // Centralizar a imagem na página
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;

      // Adicionar imagem ocupando o máximo da página
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);

      // Adicionar informações discretas no canto
      pdf.setFontSize(8);
      pdf.setTextColor(120);
      pdf.text(`${i + 1}/${previewData.length}`, pageWidth - 15, 10);
      pdf.text(`${col + 1},${row + 1}`, pageWidth - 15, 18);
    }

    const filename = `poster-${gridConfig.horizontal}x${gridConfig.vertical}-${paperFormat}-${orientation}.pdf`;
    pdf.save(filename);
    toast.success("PDF gerado e baixado!");
  }, [previewData, gridConfig, imageData, paperFormat, orientation]);

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
                  <Settings className="h-4 w-4" />
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
                <p className="text-xs text-success mt-1 font-medium">
                  Imagem maximizada em cada página
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
                    {previewData.map((piece, index) => {
                      // Calcular proporção da página baseada no formato e orientação
                      const paperConfig = PAPER_FORMATS[paperFormat];
                      const pageWidth = orientation === 'portrait' ? paperConfig.width : paperConfig.height;
                      const pageHeight = orientation === 'portrait' ? paperConfig.height : paperConfig.width;
                      const pageAspectRatio = pageWidth / pageHeight;
                      
                      return (
                        <div
                          key={index}
                          className="relative border-2 border-border rounded-lg overflow-hidden cursor-pointer hover:border-primary transition-colors bg-white"
                          style={{ aspectRatio: pageAspectRatio }}
                          onClick={() => setSelectedPreview(index)}
                        >
                          {/* Simular papel */}
                          <div className="absolute inset-1 bg-white border border-gray-200 rounded flex items-center justify-center">
                            <img
                              src={piece}
                              alt={`Página ${index + 1}`}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          
                          {/* Overlay com informações */}
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-medium mb-1">
                              Página {index + 1}
                            </span>
                            <span className="text-white text-xs">
                              {PAPER_FORMATS[paperFormat].name} - {orientation === 'portrait' ? 'Retrato' : 'Paisagem'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
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