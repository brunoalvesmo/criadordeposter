import { useState, useRef, useCallback } from "react";
import { Upload, Download, Grid, Image as ImageIcon, Settings, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const PosterCreator = () => {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [gridConfig, setGridConfig] = useState<GridConfig>({ horizontal: 2, vertical: 2 });
  const [previewData, setPreviewData] = useState<string[]>([]);
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);
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

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const maxWidth = pageWidth - 2 * margin;
    const maxHeight = pageHeight - 2 * margin;

    for (let i = 0; i < previewData.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      // Adicionar número da página
      pdf.setFontSize(12);
      pdf.text(`Página ${i + 1} de ${previewData.length}`, margin, margin);
      
      // Calcular posição e tamanho da imagem
      const imgData = previewData[i];
      const aspectRatio = imageData!.width / gridConfig.horizontal / (imageData!.height / gridConfig.vertical);
      
      let imgWidth, imgHeight;
      if (aspectRatio > maxWidth / maxHeight) {
        imgWidth = maxWidth;
        imgHeight = maxWidth / aspectRatio;
      } else {
        imgHeight = maxHeight - 20; // Espaço para o texto
        imgWidth = imgHeight * aspectRatio;
      }

      const x = (pageWidth - imgWidth) / 2;
      const y = margin + 20;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      
      // Adicionar linha guia opcional
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.1);
      pdf.rect(x - 2, y - 2, imgWidth + 4, imgHeight + 4);
    }

    pdf.save(`poster-${gridConfig.horizontal}x${gridConfig.vertical}.pdf`);
    toast.success("PDF gerado e baixado!");
  }, [previewData, gridConfig, imageData]);

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

              <div className="p-4 bg-accent rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Grid className="h-4 w-4" />
                  <span className="font-medium">Total de Páginas</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {gridConfig.horizontal * gridConfig.vertical}
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