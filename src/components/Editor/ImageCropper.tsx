import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { PixelButton } from "@/components/PixelUI";
import getCroppedImg from "@/lib/cropUtils";
import { Check, X, ZoomIn, ZoomOut, Crop } from "lucide-react";
import { cn } from "@/lib/utils";

// 添加全局样式确保裁剪框控制点可见
const injectStyles = () => {
  if (!document.getElementById('cropper-override-styles')) {
    const style = document.createElement('style');
    style.id = 'cropper-override-styles';
    style.textContent = `
      .react-easy-crop {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
      }
      .react-easy-crop-container {
        position: absolute !important;
        width: 100% !important;
        height: 100% !important;
      }
      /* 确保控制点可见 */
      .react-easy-crop-crop-area {
        border: 2px solid rgba(255, 255, 255, 0.5) !important;
      }
      /* 控制点样式 */
      .react-easy-crop-handle {
        position: absolute !important;
        width: 24px !important;
        height: 24px !important;
        background: #fff !important;
        border: 3px solid rgba(59, 130, 246, 0.8) !important;
        border-radius: 50% !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4) !important;
        z-index: 100 !important;
        pointer-events: auto !important;
        display: block !important;
        opacity: 1 !important;
      }
      /* 四个角的控制点 */
      .react-easy-crop-handle-nw {
        top: -12px !important;
        left: -12px !important;
        cursor: nw-resize !important;
      }
      .react-easy-crop-handle-ne {
        top: -12px !important;
        right: -12px !important;
        cursor: ne-resize !important;
      }
      .react-easy-crop-handle-sw {
        bottom: -12px !important;
        left: -12px !important;
        cursor: sw-resize !important;
      }
      .react-easy-crop-handle-se {
        bottom: -12px !important;
        right: -12px !important;
        cursor: se-resize !important;
      }
      /* 四条边的控制点（自由模式） */
      .react-easy-crop-handle-n {
        top: -12px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        cursor: n-resize !important;
      }
      .react-easy-crop-handle-e {
        right: -12px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        cursor: e-resize !important;
      }
      .react-easy-crop-handle-s {
        bottom: -12px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        cursor: s-resize !important;
      }
      .react-easy-crop-handle-w {
        left: -12px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        cursor: w-resize !important;
      }
    `;
    document.head.appendChild(style);
  }
};

interface ImageCropperProps {
  imageSrc: string | null;
  open: boolean;
  onClose: () => void;
  onComplete: (croppedImage: HTMLImageElement) => void;
}

type AspectRatio = '16:9' | '1:1' | '4:3' | '3:4' | '9:16';

interface AspectRatioOption {
  value: AspectRatio;
  label: string;
  ratio: number;
  description: string;
}

const ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '16:9', label: '16:9', ratio: 16 / 9, description: '宽屏：适合横幅、海报、电脑壁纸' },
  { value: '1:1', label: '1:1', ratio: 1, description: '正方形：适合头像、Instagram 等平台' },
  { value: '4:3', label: '4:3', ratio: 4 / 3, description: '横向：适合横版图片、照片' },
  { value: '3:4', label: '3:4', ratio: 3 / 4, description: '纵向：适合竖版图片、照片' },
  { value: '9:16', label: '9:16', ratio: 9 / 16, description: '竖屏：适合手机竖屏、短视频' },
];

export function ImageCropper({ imageSrc, open, onClose, onComplete }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');

  // 注入样式
  useEffect(() => {
    if (open) {
      injectStyles();
    }
  }, [open]);

  // 当切换比例时重置 zoom
  const handleAspectRatioChange = (newRatio: AspectRatio) => {
    setAspectRatio(newRatio);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (imageSrc && croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
        onComplete(croppedImage);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const currentRatio = ASPECT_RATIOS.find(r => r.value === aspectRatio)?.ratio || 1;
  const currentDescription = ASPECT_RATIOS.find(r => r.value === aspectRatio)?.description || '';

  return (
    <Dialog open={open} onOpenChange={(val) => {
      // 只在用户明确关闭时才触发 onClose
      if (!val && open) {
        onClose();
      }
    }}>
      <DialogContent
        className="max-w-[800px] w-full h-[80vh] flex flex-col p-0 gap-0 border-4 border-black"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-4 border-b-4 border-black bg-muted shrink-0">
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Crop className="w-5 h-5" />
            裁切与缩放
          </DialogTitle>
        </DialogHeader>

        <div className="relative flex-1 bg-black/90 overflow-hidden" style={{ minHeight: 0 }}>
          {imageSrc && (
            <div className="absolute inset-0">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={currentRatio}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                showGrid={true}
                objectFit="contain"
                minZoom={1}
                maxZoom={3}
                cropShape="rect"
                restrictPosition={false}
              />
            </div>
          )}
        </div>

        <div className="p-4 bg-background border-t-4 border-black flex flex-col gap-4 shrink-0">
          {/* 比例选择 */}
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <Crop className="w-4 h-4" />
              裁切比例
            </div>
            <div className="flex gap-2 flex-wrap">
              {ASPECT_RATIOS.map((ratio) => (
                <PixelButton
                  key={ratio.value}
                  variant={aspectRatio === ratio.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAspectRatioChange(ratio.value)}
                  className={cn(
                    "min-w-[60px]",
                    aspectRatio === ratio.value && "ring-2 ring-black ring-offset-2"
                  )}
                >
                  {ratio.label}
                </PixelButton>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentDescription}
            </p>
            <p className="text-xs text-muted-foreground italic">
              💡 提示：拖动四角调整裁剪框大小，拖动中心移动位置
            </p>
          </div>

          {/* 缩放控制 */}
          <div className="space-y-2">
            <div className="text-sm font-medium">缩放</div>
            <div className="flex items-center gap-4">
              <ZoomOut className="w-5 h-5 text-muted-foreground" />
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(v) => setZoom(v[0])}
                className="flex-1"
              />
              <ZoomIn className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground w-12 text-right">{Math.round(zoom * 100)}%</span>
            </div>
          </div>

          <DialogFooter className="flex-row gap-4 justify-end pt-2">
            <PixelButton variant="ghost" onClick={onClose}>
              <X className="mr-2 w-4 h-4" /> 取消
            </PixelButton>
            <PixelButton onClick={handleConfirm}>
              <Check className="mr-2 w-4 h-4" /> 确认使用
            </PixelButton>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}