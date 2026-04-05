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
import { createProcessedPatternExportCanvas, downloadCanvasAsPng } from "@/lib/pattern-export";
import { getProcessedPatternStats } from "@/lib/pattern-stats";

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

  const usedColors = getProcessedPatternStats(processedData, palette, width * height);

  const totalBeads = usedColors.reduce((acc, curr) => acc + curr.count, 0);
  const [showLabels, setShowLabels] = React.useState(true);
  const [showImageLabels, setShowImageLabels] = React.useState(true);

  const handleDownloadPDF = async () => {
    await generatePDF(processedData, palette, width, height, "bead-pattern.pdf", showLabels, hideWhiteLabels);
  };

  const handleDownloadImage = () => {
    const canvas = createProcessedPatternExportCanvas(
      processedData,
      palette,
      width,
      height,
      40,
      showImageLabels,
      hideWhiteLabels
    );
    downloadCanvasAsPng(canvas, "bead-pattern.png");
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
                {usedColors.map((stat) => (
                  <tr key={stat.colorId} className="border-b border-black/5">
                    <td className="py-2 font-mono">{stat.colorId}</td>
                    <td className="py-2">
                      <div 
                        className="w-6 h-6 border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        style={{ backgroundColor: stat.color.hex }}
                      />
                    </td>
                    <td className="py-2">{stat.color.name}</td>
                    <td className="py-2 text-right font-mono font-bold">{stat.count}</td>
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
