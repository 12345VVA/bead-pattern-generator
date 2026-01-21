import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, FileImage, FileText } from "lucide-react";
import type { ProcessedResult } from "@/lib/image-processing";
import type { BeadColor } from "@/lib/colors";
import { generatePDF } from "@/lib/pdf-generator";
import { PixelButton } from "@/components/PixelUI";

interface ExportDialogProps {
  processedData: ProcessedResult | null;
  palette: BeadColor[];
  width: number;
  height: number;
  hideWhiteLabels: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({
  processedData,
  palette,
  width,
  height,
  hideWhiteLabels,
  open,
  onOpenChange
}: ExportDialogProps) {
  if (!processedData) return null;

  const usedColors = Array.from(processedData.colorCounts.entries())
    .map(([id, count]) => {
      const color = palette.find(c => c.id === id);
      return { ...color!, count };
    })
    .sort((a, b) => b.count - a.count);

  const totalBeads = usedColors.reduce((acc, curr) => acc + curr.count, 0);
  const [showLabels, setShowLabels] = React.useState(true);
  const [showImageLabels, setShowImageLabels] = React.useState(true);

  const handleDownloadPDF = async () => {
    await generatePDF(processedData, palette, width, height, "bead-pattern.pdf", showLabels, hideWhiteLabels);
  };

  const handleDownloadImage = () => {
    const canvas = document.createElement("canvas");
    const pixelSize = 40; // High resolution export
    const displayWidth = width * pixelSize;
    const displayHeight = height * pixelSize;
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) return;

    // Draw Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Draw Pixels
    const pixels = processedData.pixels;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        if (a < 10) continue;

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);

        // Draw Labels
        if (showImageLabels && processedData.beadGrid) {
           const beadId = processedData.beadGrid[y * width + x];
           if (beadId) {
             // Check Hide White Labels
             if (hideWhiteLabels) {
               const color = palette.find(c => c.id === beadId);
               if (color && (
                 color.name.toLowerCase() === "white" ||
                 color.name === "白色" ||
                 color.name === "极浅灰" ||
                 color.hex.toLowerCase() === "#ffffff" ||
                 color.hex.toLowerCase() === "#fbfbfb" ||
                 color.id === "H02" // MARD 极浅灰（作为白色使用）
               )) {
                 continue;
               }
             }

             const brightness = (r * 299 + g * 587 + b * 114) / 1000;
             ctx.fillStyle = brightness > 128 ? "#000000" : "#FFFFFF";
             ctx.font = `bold ${pixelSize * 0.35}px sans-serif`;
             ctx.textAlign = "center";
             ctx.textBaseline = "middle";
             ctx.fillText(beadId, x * pixelSize + pixelSize / 2, y * pixelSize + pixelSize / 2);
           }
        }
      }
    }

    // Draw Grid (High Res)
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    for (let x = 0; x <= width; x++) {
       if (x % 5 === 0) continue;
       ctx.moveTo(x * pixelSize, 0);
       ctx.lineTo(x * pixelSize, displayHeight);
    }
    for (let y = 0; y <= height; y++) {
       if (y % 5 === 0) continue;
       ctx.moveTo(0, y * pixelSize);
       ctx.lineTo(displayWidth, y * pixelSize);
    }
    ctx.stroke();

    // 5x5 Grid
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    for (let x = 0; x <= width; x+=5) {
       ctx.moveTo(x * pixelSize, 0);
       ctx.lineTo(x * pixelSize, displayHeight);
    }
    for (let y = 0; y <= height; y+=5) {
       ctx.moveTo(0, y * pixelSize);
       ctx.lineTo(displayWidth, y * pixelSize);
    }
    ctx.stroke();

    const link = document.createElement("a");
    link.download = "bead-pattern.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] border-4 border-black bg-background p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 border-b-4 border-black bg-muted">
          <DialogTitle className="font-display text-2xl">导出图纸</DialogTitle>
          <DialogDescription>
            预览材料清单并下载制作图纸。
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center text-sm font-mono">
             <span>尺寸: {width} x {height}</span>
             <span>总豆数: {totalBeads}</span>
             <span>颜色数: {usedColors.length}</span>
          </div>

          <ScrollArea className="h-[300px] border-4 border-black p-4 bg-white/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black/10 text-left">
                  <th className="pb-2">编号</th>
                  <th className="pb-2">颜色</th>
                  <th className="pb-2">名称</th>
                  <th className="pb-2 text-right">数量</th>
                </tr>
              </thead>
              <tbody>
                {usedColors.map((color) => (
                  <tr key={color.id} className="border-b border-black/5">
                    <td className="py-2 font-mono">{color.id}</td>
                    <td className="py-2">
                      <div 
                        className="w-6 h-6 border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        style={{ backgroundColor: color.hex }}
                      />
                    </td>
                    <td className="py-2">{color.name}</td>
                    <td className="py-2 text-right font-mono font-bold">{color.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>

          <div className="grid grid-cols-1 gap-4 pt-2">
            <div className="flex items-center space-x-2">
               <Switch id="show-image-labels" checked={showImageLabels} onCheckedChange={setShowImageLabels} />
               <Label htmlFor="show-image-labels" className="font-bold">在 PNG 图片中显示色号</Label>
            </div>
            <div className="flex items-center space-x-2">
               <Switch id="show-labels" checked={showLabels} onCheckedChange={setShowLabels} />
               <Label htmlFor="show-labels" className="font-bold">在 PDF 格子中显示色号</Label>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t-4 border-black bg-muted flex-col sm:flex-row gap-4">
          <PixelButton onClick={handleDownloadImage} variant="outline" className="w-full sm:w-auto">
            <FileImage className="mr-2 h-4 w-4" /> PNG 图片
          </PixelButton>
          <PixelButton onClick={handleDownloadPDF} className="w-full sm:w-auto">
            <FileText className="mr-2 h-4 w-4" /> PDF 图纸
          </PixelButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
