import type { BeadColor } from '@/lib/colors';

// 豆子区域类型
export interface BeadRegion {
    x: number;
    y: number;
    width: number;
    height: number;
    color: { r: number; g: number; b: number };
    matchedColor?: BeadColor;
    gridX: number; // 网格X坐标
    gridY: number; // 网格Y坐标
}

// 颜色统计类型
export interface ColorStat {
    colorId: string;
    count: number;
    color: BeadColor;
    percentage: number;
}
