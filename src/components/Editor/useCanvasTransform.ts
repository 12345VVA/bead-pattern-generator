import { useState, useEffect, useRef, useCallback } from "react";

export interface CanvasTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface UseCanvasTransformOptions {
  minScale?: number;
  maxScale?: number;
  scaleStep?: number;
  disableDragOnCanvas?: boolean; // 是否禁用点击 canvas 时的拖动（用于编辑模式）
}

export interface UseCanvasTransformReturn {
  transform: CanvasTransform;
  isDragging: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  updateScale: (newScale: number) => void;
  updateTranslate: (x: number, y: number) => void;
  resetTransform: () => void;
  handleWheel: (e: WheelEvent) => void;
  handleMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseUp: () => void;
  handleMouseLeave: () => void;
}

export function useCanvasTransform(
  options: UseCanvasTransformOptions = {}
): UseCanvasTransformReturn {
  const {
    minScale = 0.1,
    maxScale = 5,
    scaleStep = 0.2,
    disableDragOnCanvas = false, // 默认允许拖动
  } = options;

  const [transform, setTransform] = useState<CanvasTransform>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // 更新缩放
  const updateScale = useCallback((newScale: number) => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(minScale, Math.min(maxScale, newScale)),
    }));
  }, [minScale, maxScale]);

  // 更新平移
  const updateTranslate = useCallback((x: number, y: number) => {
    setTransform(prev => ({
      ...prev,
      translateX: x,
      translateY: y,
    }));
  }, []);

  // 重置变换
  const resetTransform = useCallback(() => {
    setTransform({
      scale: 1,
      translateX: 0,
      translateY: 0,
    });
  }, []);

  // 鼠标滚轮缩放
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -scaleStep : scaleStep;
    updateScale(transform.scale + delta);
  }, [transform.scale, scaleStep, updateScale]);

  // 鼠标按下开始拖动
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) { // 左键
      // 如果启用了禁用拖动选项，检查是否点击在 canvas 元素上
      if (disableDragOnCanvas) {
        const isClickingCanvas = (e.target as HTMLElement).tagName === 'CANVAS';
        if (isClickingCanvas) {
          // 如果点击的是 canvas，不启动拖动
          // 由调用者决定是否需要处理编辑模式的画布交互
          return;
        }
      }

      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - transform.translateX,
        y: e.clientY - transform.translateY,
      };
    }
  }, [transform.translateX, transform.translateY, disableDragOnCanvas]);

  // 鼠标移动
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      updateTranslate(newX, newY);
    }
  }, [isDragging, updateTranslate]);

  // 鼠标释放
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 鼠标离开容器
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 全局鼠标释放事件
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  // 添加滚轮事件监听器（非被动模式）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  return {
    transform,
    isDragging,
    containerRef,
    updateScale,
    updateTranslate,
    resetTransform,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  };
}
