// 增强的色号接口，支持多品牌映射
export interface BeadColor {
  id: string;
  name: string;
  hex: string;
  brand: string;
}

// 新增：品牌色号映射接口
export interface BrandMapping {
  [brandCode: string]: string; // 品牌代码 -> 色号
}

// 新增：颜色映射接口（perler-beads 风格）
export interface ColorMapping {
  hex: string;
  brands: BrandMapping;
  name?: string;
}

// 新增：支持的完整品牌列表
export const SUPPORTED_BRANDS = {
  // 西方品牌
  PERLER: 'Perler',
  HAMA_MIDI: 'Hama Midi',
  HAMA_MINI: 'Hama Mini',
  ARTKAL_S: 'Artkal S',
  ARTKAL_R: 'Artkal R',
  ARTKAL_C: 'Artkal C',
  ARTKAL_A: 'Artkal A',
  NABBI: 'Nabbi',
  MARD: 'MARD',
  // 国产品牌
  COCO: 'COCO',
  MANMAN: '漫漫',
  PANPAN: '盼盼',
  MIXIAOWO: '咪小窝',
  // 特殊系列
  PERLER_MINI: 'Perler Mini',
  ARTKAL_SPECIAL: 'Artkal Special',
} as const;

export type BrandCode = keyof typeof SUPPORTED_BRANDS;

// ============ 原有 Perler 色号（优化版）============
export const PERLER_COLORS: BeadColor[] = [
  { id: "P01", name: "White", hex: "#FFFFFF", brand: "Perler" },
  { id: "P02", name: "Cream", hex: "#EFE8B9", brand: "Perler" },
  { id: "P03", name: "Yellow", hex: "#F2C300", brand: "Perler" },
  { id: "P04", name: "Orange", hex: "#F37F00", brand: "Perler" },
  { id: "P05", name: "Red", hex: "#C70D2D", brand: "Perler" },
  { id: "P06", name: "Bubblegum", hex: "#E36F8E", brand: "Perler" },
  { id: "P07", name: "Purple", hex: "#784B97", brand: "Perler" },
  { id: "P08", name: "Dark Blue", hex: "#1A3581", brand: "Perler" },
  { id: "P09", name: "Light Blue", hex: "#2E7BB5", brand: "Perler" },
  { id: "P10", name: "Green", hex: "#356B3A", brand: "Perler" },
  { id: "P11", name: "Light Green", hex: "#52B974", brand: "Perler" },
  { id: "P12", name: "Brown", hex: "#4E3629", brand: "Perler" },
  { id: "P13", name: "Grey", hex: "#878888", brand: "Perler" },
  { id: "P14", name: "Black", hex: "#1D1D1B", brand: "Perler" },
  { id: "P17", name: "Clear", hex: "#E8EAE6", brand: "Perler" },
  { id: "P18", name: "Prickly Pear", hex: "#B6D53E", brand: "Perler" },
  { id: "P19", name: "Sand", hex: "#D4B48A", brand: "Perler" },
  { id: "P20", name: "Rust", hex: "#8C3423", brand: "Perler" },
  { id: "P21", name: "Light Brown", hex: "#95623C", brand: "Perler" },
  { id: "P22", name: "Peach", hex: "#F6C198", brand: "Perler" },
  { id: "P23", name: "Tan", hex: "#C79373", brand: "Perler" },
  { id: "P24", name: "Parrot Green", hex: "#007F3A", brand: "Perler" },
  { id: "P25", name: "Pastel Green", hex: "#7DD199", brand: "Perler" },
  { id: "P26", name: "Pastel Lavender", hex: "#9577B5", brand: "Perler" },
  { id: "P27", name: "Pastel Yellow", hex: "#FDF07B", brand: "Perler" },
  { id: "P28", name: "Pastel Blue", hex: "#63A4D6", brand: "Perler" },
  { id: "P30", name: "Pastel Pink", hex: "#F0AAB8", brand: "Perler" },
  { id: "P33", name: "Cheddar", hex: "#F8A12E", brand: "Perler" },
  { id: "P35", name: "Hot Coral", hex: "#FF4E50", brand: "Perler" },
  { id: "P36", name: "Raspberry", hex: "#A5214D", brand: "Perler" },
  { id: "P38", name: "Kiwi Lime", hex: "#6CC24A", brand: "Perler" },
  { id: "P39", name: "Dark Green", hex: "#004726", brand: "Perler" },
  { id: "P42", name: "Toothpaste", hex: "#86C8B8", brand: "Perler" },
  { id: "P45", name: "Dark Grey", hex: "#464749", brand: "Perler" },
  { id: "P48", name: "Light Grey", hex: "#B8B9B9", brand: "Perler" },
  { id: "P49", name: "Plum", hex: "#783669", brand: "Perler" },
  { id: "P52", name: "Butterscotch", hex: "#D2883E", brand: "Perler" },
  { id: "P54", name: "Forest", hex: "#224226", brand: "Perler" },
  { id: "P58", name: "Toothpaste", hex: "#97D4C6", brand: "Perler" },
  { id: "P59", name: "Hot Coral", hex: "#FF4C45", brand: "Perler" },
  { id: "P60", name: "Plum", hex: "#9C4278", brand: "Perler" },
  { id: "P61", name: "Kiwi Lime", hex: "#73C63A", brand: "Perler" },
  { id: "P62", name: "Turquoise", hex: "#008BB0", brand: "Perler" },
  { id: "P63", name: "Blush", hex: "#F78D79", brand: "Perler" },
  { id: "P70", name: "Apricot", hex: "#FBB466", brand: "Perler" },
  { id: "P79", name: "Light Pink", hex: "#F3C5D6", brand: "Perler" },
  { id: "P80", name: "Pink", hex: "#EB4E84", brand: "Perler" },
  { id: "P81", name: "Magenta", hex: "#C71D64", brand: "Perler" },
  { id: "P82", name: "Neon Yellow", hex: "#EAEC2D", brand: "Perler" },
  { id: "P83", name: "Neon Orange", hex: "#FF7315", brand: "Perler" },
  { id: "P84", name: "Neon Pink", hex: "#F6469C", brand: "Perler" },
  { id: "P85", name: "Neon Blue", hex: "#008CD0", brand: "Perler" },
  { id: "P86", name: "Neon Green", hex: "#00A854", brand: "Perler" },
  { id: "P88", name: "Cocoa", hex: "#633A34", brand: "Perler" },
  { id: "P90", name: "Butter Cream", hex: "#F0E498", brand: "Perler" },
  { id: "P91", name: "Slate Blue", hex: "#3C5086", brand: "Perler" },
  { id: "P92", name: "Shamrock", hex: "#00824B", brand: "Perler" },
  { id: "P93", name: "Blueberry Creme", hex: "#7CA4D6", brand: "Perler" },
  { id: "P96", name: "Cranapple", hex: "#83192C", brand: "Perler" },
  { id: "P97", name: "Evergreen", hex: "#33554A", brand: "Perler" },
];

export const HAMA_MIDI_COLORS: BeadColor[] = [
  { id: "H01", name: "White", hex: "#FFFFFF", brand: "Hama Midi" },
  { id: "H02", name: "Cream", hex: "#F5ECCB", brand: "Hama Midi" },
  { id: "H03", name: "Yellow", hex: "#FEC803", brand: "Hama Midi" },
  { id: "H04", name: "Orange", hex: "#F07406", brand: "Hama Midi" },
  { id: "H05", name: "Red", hex: "#CD0E28", brand: "Hama Midi" },
  { id: "H06", name: "Pink", hex: "#FF8AA5", brand: "Hama Midi" },
  { id: "H07", name: "Purple", hex: "#633887", brand: "Hama Midi" },
  { id: "H08", name: "Blue", hex: "#18458D", brand: "Hama Midi" },
  { id: "H09", name: "Light Blue", hex: "#3F8FCA", brand: "Hama Midi" },
  { id: "H10", name: "Green", hex: "#0F7F41", brand: "Hama Midi" },
  { id: "H11", name: "Light Green", hex: "#5AB379", brand: "Hama Midi" },
  { id: "H12", name: "Brown", hex: "#4E3227", brand: "Hama Midi" },
  { id: "H17", name: "Grey", hex: "#85898A", brand: "Hama Midi" },
  { id: "H18", name: "Black", hex: "#000000", brand: "Hama Midi" },
  { id: "H20", name: "Reddish Brown", hex: "#863023", brand: "Hama Midi" },
  { id: "H21", name: "Light Brown", hex: "#9C6239", brand: "Hama Midi" },
  { id: "H22", name: "Dark Red", hex: "#911827", brand: "Hama Midi" },
  { id: "H26", name: "Flesh", hex: "#F7BE98", brand: "Hama Midi" },
  { id: "H27", name: "Beige", hex: "#D5AD81", brand: "Hama Midi" },
  { id: "H28", name: "Dark Green", hex: "#1C412C", brand: "Hama Midi" },
  { id: "H29", name: "Claret", hex: "#A8364D", brand: "Hama Midi" },
  { id: "H30", name: "Burgundy", hex: "#5C2028", brand: "Hama Midi" },
  { id: "H31", name: "Turquoise", hex: "#2E8B98", brand: "Hama Midi" },
];

export const ARTKAL_S_COLORS: BeadColor[] = [
  { id: "S01", name: "White", hex: "#FFFFFF", brand: "Artkal S" },
  { id: "S02", name: "Black", hex: "#000000", brand: "Artkal S" },
  { id: "S03", name: "Red", hex: "#C8102E", brand: "Artkal S" },
  { id: "S04", name: "Orange", hex: "#FF671F", brand: "Artkal S" },
  { id: "S05", name: "Yellow", hex: "#FCD116", brand: "Artkal S" },
  { id: "S06", name: "Green", hex: "#009B48", brand: "Artkal S" },
  { id: "S07", name: "Blue", hex: "#003087", brand: "Artkal S" },
  { id: "S08", name: "Purple", hex: "#4F2C1D", brand: "Artkal S" },
  { id: "S09", name: "Pink", hex: "#FFC0CB", brand: "Artkal S" },
  { id: "S10", name: "Grey", hex: "#808080", brand: "Artkal S" },
  // A simplified list for demonstration
];

// ============ MARD 完整色号系统（221 种颜色）============
export const MARD_COLORS: BeadColor[] = [
  // A 系列 - 黄色/橙色系 (33个)
  { id: "A01", name: "浅黄1", hex: "#FAF5CD", brand: "MARD" },
  { id: "A02", name: "浅黄2", hex: "#FCFED6", brand: "MARD" },
  { id: "A03", name: "浅黄3", hex: "#FCFF92", brand: "MARD" },
  { id: "A04", name: "黄色1", hex: "#F7EC5C", brand: "MARD" },
  { id: "A05", name: "黄色2", hex: "#F0D83A", brand: "MARD" },
  { id: "A06", name: "橙色1", hex: "#FDA951", brand: "MARD" },
  { id: "A07", name: "橙色2", hex: "#FA8C4F", brand: "MARD" },
  { id: "A08", name: "橙色3", hex: "#FBDA4D", brand: "MARD" },
  { id: "A09", name: "橙色4", hex: "#F79D5F", brand: "MARD" },
  { id: "A10", name: "橙色5", hex: "#F47E38", brand: "MARD" },
  { id: "A11", name: "红橙1", hex: "#FEDB99", brand: "MARD" },
  { id: "A12", name: "红橙2", hex: "#FDA276", brand: "MARD" },
  { id: "A13", name: "红橙3", hex: "#FEC667", brand: "MARD" },
  { id: "A14", name: "红橙4", hex: "#F75842", brand: "MARD" },
  { id: "A15", name: "黄色4", hex: "#FBF65E", brand: "MARD" },
  { id: "A16", name: "黄色5", hex: "#FEFF97", brand: "MARD" },
  { id: "A17", name: "黄色6", hex: "#FDE173", brand: "MARD" },
  { id: "A18", name: "橙色6", hex: "#FCBF80", brand: "MARD" },
  { id: "A19", name: "红色1", hex: "#FD7E77", brand: "MARD" },
  { id: "A20", name: "黄色7", hex: "#F9D66E", brand: "MARD" },
  { id: "A21", name: "黄色8", hex: "#FAE393", brand: "MARD" },
  { id: "A22", name: "黄色9", hex: "#EDF878", brand: "MARD" },
  { id: "A23", name: "米棕1", hex: "#E4C8BA", brand: "MARD" },
  { id: "A24", name: "黄色10", hex: "#F3F6A9", brand: "MARD" },
  { id: "A25", name: "橙色7", hex: "#FFD785", brand: "MARD" },
  { id: "A26", name: "橙色8", hex: "#FFC734", brand: "MARD" },

  // B 系列 - 绿色系 (33个)
  { id: "B01", name: "青柠绿1", hex: "#DFF13B", brand: "MARD" },
  { id: "B02", name: "亮绿1", hex: "#64F343", brand: "MARD" },
  { id: "B03", name: "亮绿2", hex: "#A1F586", brand: "MARD" },
  { id: "B04", name: "青柠绿2", hex: "#5FDF34", brand: "MARD" },
  { id: "B05", name: "翠绿1", hex: "#39E158", brand: "MARD" },
  { id: "B06", name: "翠绿2", hex: "#64E0A4", brand: "MARD" },
  { id: "B07", name: "森林绿1", hex: "#3EAE7C", brand: "MARD" },
  { id: "B08", name: "森林绿2", hex: "#1D9B54", brand: "MARD" },
  { id: "B09", name: "深绿1", hex: "#2A5037", brand: "MARD" },
  { id: "B10", name: "薄荷绿1", hex: "#9AD1BA", brand: "MARD" },
  { id: "B11", name: "橄榄绿1", hex: "#627032", brand: "MARD" },
  { id: "B12", name: "深绿2", hex: "#1A6E3D", brand: "MARD" },
  { id: "B13", name: "黄绿1", hex: "#C8E87D", brand: "MARD" },
  { id: "B14", name: "黄绿2", hex: "#ABE84F", brand: "MARD" },
  { id: "B15", name: "深绿3", hex: "#305335", brand: "MARD" },
  { id: "B16", name: "薄荷绿2", hex: "#C0ED9C", brand: "MARD" },
  { id: "B17", name: "橄榄绿2", hex: "#9EB33E", brand: "MARD" },
  { id: "B18", name: "黄绿3", hex: "#E6ED4F", brand: "MARD" },
  { id: "B19", name: "蓝绿1", hex: "#26B78E", brand: "MARD" },
  { id: "B20", name: "薄荷绿3", hex: "#CBECCF", brand: "MARD" },
  { id: "B21", name: "蓝绿2", hex: "#18616A", brand: "MARD" },
  { id: "B22", name: "深蓝绿1", hex: "#0A4241", brand: "MARD" },
  { id: "B23", name: "橄榄绿3", hex: "#343B1A", brand: "MARD" },
  { id: "B24", name: "黄绿4", hex: "#E8FAA6", brand: "MARD" },
  { id: "B25", name: "蓝绿3", hex: "#4E846D", brand: "MARD" },
  { id: "B26", name: "棕绿1", hex: "#907C35", brand: "MARD" },
  { id: "B27", name: "灰绿1", hex: "#D0E0AF", brand: "MARD" },
  { id: "B28", name: "蓝绿4", hex: "#9EE5BB", brand: "MARD" },
  { id: "B29", name: "黄绿5", hex: "#C6DF5F", brand: "MARD" },
  { id: "B30", name: "黄绿6", hex: "#E3FBB1", brand: "MARD" },
  { id: "B31", name: "黄绿7", hex: "#B4E691", brand: "MARD" },
  { id: "B32", name: "橄榄绿4", hex: "#92AD60", brand: "MARD" },

  // C 系列 - 蓝色系 (33个)
  { id: "C01", name: "浅青1", hex: "#F0FEE4", brand: "MARD" },
  { id: "C02", name: "青蓝8", hex: "#ABF8FE", brand: "MARD" },
  { id: "C03", name: "天蓝1", hex: "#A2E0F7", brand: "MARD" },
  { id: "C04", name: "天蓝2", hex: "#44CDFB", brand: "MARD" },
  { id: "C05", name: "天蓝3", hex: "#06AADF", brand: "MARD" },
  { id: "C06", name: "天蓝4", hex: "#54A7E9", brand: "MARD" },
  { id: "C07", name: "天蓝5", hex: "#3977CA", brand: "MARD" },
  { id: "C08", name: "天蓝6", hex: "#0F52BD", brand: "MARD" },
  { id: "C09", name: "深蓝1", hex: "#3349C3", brand: "MARD" },
  { id: "C10", name: "青蓝1", hex: "#3CBCE3", brand: "MARD" },
  { id: "C11", name: "青蓝2", hex: "#2ADED3", brand: "MARD" },
  { id: "C12", name: "深蓝2", hex: "#1E334E", brand: "MARD" },
  { id: "C13", name: "浅蓝1", hex: "#CDE7FE", brand: "MARD" },
  { id: "C14", name: "浅蓝2", hex: "#D5FCF7", brand: "MARD" },
  { id: "C15", name: "青蓝3", hex: "#21C5C4", brand: "MARD" },
  { id: "C16", name: "深蓝3", hex: "#1858A2", brand: "MARD" },
  { id: "C17", name: "天蓝7", hex: "#02D1F3", brand: "MARD" },
  { id: "C18", name: "深蓝4", hex: "#213244", brand: "MARD" },
  { id: "C19", name: "青蓝4", hex: "#18869D", brand: "MARD" },
  { id: "C20", name: "天蓝8", hex: "#1A70A9", brand: "MARD" },
  { id: "C21", name: "浅蓝3", hex: "#BCDDFC", brand: "MARD" },
  { id: "C22", name: "青蓝5", hex: "#6BB1BB", brand: "MARD" },
  { id: "C23", name: "浅蓝4", hex: "#C8E2FD", brand: "MARD" },
  { id: "C24", name: "天蓝9", hex: "#7EC5F9", brand: "MARD" },
  { id: "C25", name: "青蓝6", hex: "#A9E8E0", brand: "MARD" },
  { id: "C26", name: "青蓝7", hex: "#42ADCF", brand: "MARD" },
  { id: "C27", name: "浅蓝5", hex: "#D0DEF9", brand: "MARD" },
  { id: "C28", name: "灰蓝1", hex: "#BDCEE8", brand: "MARD" },
  { id: "C29", name: "深蓝5", hex: "#364A89", brand: "MARD" },

  // D 系列 - 紫色系 (27个)
  { id: "D01", name: "浅紫1", hex: "#ACB7EF", brand: "MARD" },
  { id: "D02", name: "浅紫2", hex: "#868DD3", brand: "MARD" },
  { id: "D03", name: "蓝紫1", hex: "#3554AF", brand: "MARD" },
  { id: "D04", name: "深蓝紫1", hex: "#162D7B", brand: "MARD" },
  { id: "D05", name: "紫红1", hex: "#B34EC6", brand: "MARD" },
  { id: "D06", name: "紫红2", hex: "#B37BDC", brand: "MARD" },
  { id: "D07", name: "紫罗兰1", hex: "#8758A9", brand: "MARD" },
  { id: "D08", name: "浅紫3", hex: "#E3D2FE", brand: "MARD" },
  { id: "D09", name: "浅紫4", hex: "#D5B9F4", brand: "MARD" },
  { id: "D10", name: "深紫1", hex: "#301A49", brand: "MARD" },
  { id: "D11", name: "浅紫5", hex: "#BEB9E2", brand: "MARD" },
  { id: "D12", name: "粉紫1", hex: "#DC99CE", brand: "MARD" },
  { id: "D13", name: "紫红3", hex: "#B5038D", brand: "MARD" },
  { id: "D14", name: "紫红4", hex: "#862993", brand: "MARD" },
  { id: "D15", name: "深紫2", hex: "#2F1F8C", brand: "MARD" },
  { id: "D16", name: "浅灰紫1", hex: "#E2E4F0", brand: "MARD" },
  { id: "D17", name: "浅蓝紫1", hex: "#C7D3F9", brand: "MARD" },
  { id: "D18", name: "紫罗兰2", hex: "#9A64B8", brand: "MARD" },
  { id: "D19", name: "浅紫6", hex: "#D8C2D9", brand: "MARD" },
  { id: "D20", name: "紫红5", hex: "#9A35AD", brand: "MARD" },
  { id: "D21", name: "紫红6", hex: "#940595", brand: "MARD" },
  { id: "D22", name: "深紫3", hex: "#38389A", brand: "MARD" },
  { id: "D23", name: "浅紫7", hex: "#EADBF8", brand: "MARD" },
  { id: "D24", name: "蓝紫2", hex: "#768AE1", brand: "MARD" },
  { id: "D25", name: "深蓝紫2", hex: "#4950C2", brand: "MARD" },
  { id: "D26", name: "浅紫8", hex: "#D6C6EB", brand: "MARD" },

  // E 系列 - 粉色系 (41个)
  { id: "E01", name: "浅粉1", hex: "#F6D4CB", brand: "MARD" },
  { id: "E02", name: "粉橙1", hex: "#FCC1DD", brand: "MARD" },
  { id: "E03", name: "粉紫1", hex: "#F6BDE8", brand: "MARD" },
  { id: "E04", name: "粉红1", hex: "#E8649E", brand: "MARD" },
  { id: "E05", name: "粉红2", hex: "#F0569F", brand: "MARD" },
  { id: "E06", name: "粉红3", hex: "#EB4172", brand: "MARD" },
  { id: "E07", name: "粉红4", hex: "#C53674", brand: "MARD" },
  { id: "E08", name: "浅粉2", hex: "#FDDBE9", brand: "MARD" },
  { id: "E09", name: "粉紫2", hex: "#E376C7", brand: "MARD" },
  { id: "E10", name: "粉红5", hex: "#D13B95", brand: "MARD" },
  { id: "E11", name: "浅粉3", hex: "#F7DAD4", brand: "MARD" },
  { id: "E12", name: "粉橙2", hex: "#F693BF", brand: "MARD" },
  { id: "E13", name: "深粉1", hex: "#B5026A", brand: "MARD" },
  { id: "E14", name: "浅橙粉1", hex: "#FAD4BF", brand: "MARD" },
  { id: "E15", name: "浅粉4", hex: "#F5C9CA", brand: "MARD" },
  { id: "E16", name: "米白1", hex: "#FBF4EC", brand: "MARD" },
  { id: "E17", name: "浅粉5", hex: "#F7E3EC", brand: "MARD" },
  { id: "E18", name: "粉橙3", hex: "#F9C8DB", brand: "MARD" },
  { id: "E19", name: "粉橙4", hex: "#F6BBD1", brand: "MARD" },
  { id: "E20", name: "灰粉1", hex: "#D7C6CE", brand: "MARD" },
  { id: "E21", name: "灰粉2", hex: "#C09DA4", brand: "MARD" },
  { id: "E22", name: "灰粉3", hex: "#B38C9F", brand: "MARD" },
  { id: "E23", name: "灰粉4", hex: "#937D8A", brand: "MARD" },
  { id: "E24", name: "粉紫3", hex: "#DEBEE5", brand: "MARD" },

  // F 系列 - 红色系 (27个)
  { id: "F01", name: "橙红1", hex: "#FE9381", brand: "MARD" },
  { id: "F02", name: "亮红1", hex: "#F63D4B", brand: "MARD" },
  { id: "F03", name: "亮红2", hex: "#EE4E3E", brand: "MARD" },
  { id: "F04", name: "正红1", hex: "#FB2A40", brand: "MARD" },
  { id: "F05", name: "正红2", hex: "#E10328", brand: "MARD" },
  { id: "F06", name: "砖红1", hex: "#913635", brand: "MARD" },
  { id: "F07", name: "深红1", hex: "#911932", brand: "MARD" },
  { id: "F08", name: "深红2", hex: "#BB0126", brand: "MARD" },
  { id: "F09", name: "粉红1", hex: "#E0677A", brand: "MARD" },
  { id: "F10", name: "棕红1", hex: "#874628", brand: "MARD" },
  { id: "F11", name: "棕红2", hex: "#592323", brand: "MARD" },
  { id: "F12", name: "粉红2", hex: "#F3536B", brand: "MARD" },
  { id: "F13", name: "橙红2", hex: "#F45C45", brand: "MARD" },
  { id: "F14", name: "粉红3", hex: "#FCADB3", brand: "MARD" },
  { id: "F15", name: "正红3", hex: "#D50527", brand: "MARD" },
  { id: "F16", name: "橙红3", hex: "#F8C0A9", brand: "MARD" },
  { id: "F17", name: "橙红4", hex: "#E89B7D", brand: "MARD" },
  { id: "F18", name: "棕红3", hex: "#D07F4A", brand: "MARD" },
  { id: "F19", name: "砖红2", hex: "#BE454A", brand: "MARD" },
  { id: "F20", name: "粉红4", hex: "#C69495", brand: "MARD" },
  { id: "F21", name: "粉红5", hex: "#F2B8C6", brand: "MARD" },
  { id: "F22", name: "粉红6", hex: "#F7C3D0", brand: "MARD" },
  { id: "F23", name: "橙红5", hex: "#ED806C", brand: "MARD" },
  { id: "F24", name: "粉红7", hex: "#E09DAF", brand: "MARD" },
  { id: "F25", name: "亮红3", hex: "#E84854", brand: "MARD" },

  // G 系列 - 棕色系 (22个)
  { id: "G01", name: "米色1", hex: "#FFE4D3", brand: "MARD" },
  { id: "G02", name: "米色2", hex: "#FCC6AC", brand: "MARD" },
  { id: "G03", name: "米色3", hex: "#F1C4A5", brand: "MARD" },
  { id: "G04", name: "浅棕1", hex: "#DCB387", brand: "MARD" },
  { id: "G05", name: "浅棕2", hex: "#E7B34E", brand: "MARD" },
  { id: "G06", name: "浅棕3", hex: "#E3A014", brand: "MARD" },
  { id: "G07", name: "棕褐1", hex: "#985C3A", brand: "MARD" },
  { id: "G08", name: "深棕1", hex: "#713D2F", brand: "MARD" },
  { id: "G09", name: "浅棕4", hex: "#E4B685", brand: "MARD" },
  { id: "G10", name: "棕橙1", hex: "#DA8C42", brand: "MARD" },
  { id: "G11", name: "米黄1", hex: "#DAC898", brand: "MARD" },
  { id: "G12", name: "浅橙4", hex: "#FEC993", brand: "MARD" },
  { id: "G13", name: "棕褐2", hex: "#B2714B", brand: "MARD" },
  { id: "G14", name: "橄榄棕1", hex: "#8B684C", brand: "MARD" },
  { id: "G15", name: "米白2", hex: "#F6F8E3", brand: "MARD" },
  { id: "G16", name: "米色4", hex: "#F2D8C1", brand: "MARD" },
  { id: "G17", name: "深棕2", hex: "#77544E", brand: "MARD" },
  { id: "G18", name: "米色5", hex: "#FFE3D5", brand: "MARD" },
  { id: "G19", name: "橙棕1", hex: "#DD7D41", brand: "MARD" },
  { id: "G20", name: "深橙1", hex: "#A5452F", brand: "MARD" },
  { id: "G21", name: "棕褐3", hex: "#B38561", brand: "MARD" },

  // H 系列 - 灰色/黑色/白色系 (38个)
  { id: "H01", name: "白色", hex: "#FFFFFF", brand: "MARD" },
  { id: "H02", name: "极浅灰", hex: "#FBFBFB", brand: "MARD" },
  { id: "H03", name: "浅灰1", hex: "#B4B4B4", brand: "MARD" },
  { id: "H04", name: "浅灰2", hex: "#878787", brand: "MARD" },
  { id: "H05", name: "中灰1", hex: "#464648", brand: "MARD" },
  { id: "H06", name: "深灰1", hex: "#2C2C2C", brand: "MARD" },
  { id: "H07", name: "炭黑1", hex: "#010101", brand: "MARD" },
  { id: "H08", name: "粉灰1", hex: "#E7D6DC", brand: "MARD" },
  { id: "H09", name: "极浅灰2", hex: "#EFEDEE", brand: "MARD" },
  { id: "H10", name: "极浅灰3", hex: "#EBEBEB", brand: "MARD" },
  { id: "H11", name: "紫灰1", hex: "#CDCDCD", brand: "MARD" },
  { id: "H12", name: "米白3", hex: "#FDF6EE", brand: "MARD" },
  { id: "H13", name: "米黄2", hex: "#F4EFD1", brand: "MARD" },
  { id: "H14", name: "蓝灰1", hex: "#CED7D4", brand: "MARD" },
  { id: "H15", name: "蓝灰2", hex: "#9AA6A6", brand: "MARD" },
  { id: "H16", name: "深棕黑", hex: "#1B1213", brand: "MARD" },
  { id: "H17", name: "极浅灰4", hex: "#F0EEEF", brand: "MARD" },
  { id: "H18", name: "极浅青", hex: "#FCFFF6", brand: "MARD" },
  { id: "H19", name: "米白4", hex: "#F2EEE5", brand: "MARD" },
  { id: "H20", name: "绿灰1", hex: "#96A09F", brand: "MARD" },
  { id: "H21", name: "米黄3", hex: "#F8FBE6", brand: "MARD" },
  { id: "H22", name: "蓝灰3", hex: "#CACAD2", brand: "MARD" },
  { id: "H23", name: "绿灰2", hex: "#9B9C94", brand: "MARD" },

  // M 系列 - 混合色系 (15个)
  { id: "M01", name: "灰绿1", hex: "#BBC6B6", brand: "MARD" },
  { id: "M02", name: "灰绿2", hex: "#909994", brand: "MARD" },
  { id: "M03", name: "蓝灰4", hex: "#697E81", brand: "MARD" },
  { id: "M04", name: "米棕2", hex: "#E0D4BC", brand: "MARD" },
  { id: "M05", name: "米棕3", hex: "#D1CCAF", brand: "MARD" },
  { id: "M06", name: "橄榄棕2", hex: "#B0AA86", brand: "MARD" },
  { id: "M07", name: "灰棕1", hex: "#B0A796", brand: "MARD" },
  { id: "M08", name: "灰粉6", hex: "#AE8082", brand: "MARD" },
  { id: "M09", name: "棕褐4", hex: "#A68862", brand: "MARD" },
  { id: "M10", name: "灰粉7", hex: "#C4B3BB", brand: "MARD" },
  { id: "M11", name: "紫棕1", hex: "#9D7693", brand: "MARD" },
  { id: "M12", name: "深紫棕", hex: "#644B51", brand: "MARD" },
  { id: "M13", name: "橙棕2", hex: "#C79266", brand: "MARD" },
  { id: "M14", name: "橙棕3", hex: "#C27563", brand: "MARD" },
  { id: "M15", name: "蓝灰5", hex: "#747D7A", brand: "MARD" },
];

// ============ HAMA 增强色号系统（来自 fuse-bead-tool）============
export const HAMA_ENHANCED_COLORS: BeadColor[] = [
  { id: "H01", name: "White", hex: "#ECEDED", brand: "Hama Midi" },
  { id: "H02", name: "Cream", hex: "#F0E8B9", brand: "Hama Midi" },
  { id: "H03", name: "Yellow", hex: "#F0B901", brand: "Hama Midi" },
  { id: "H04", name: "Orange", hex: "#E64F27", brand: "Hama Midi" },
  { id: "H05", name: "Red", hex: "#B63136", brand: "Hama Midi" },
  { id: "H06", name: "Pink", hex: "#E1889F", brand: "Hama Midi" },
  { id: "H07", name: "Purple", hex: "#694A82", brand: "Hama Midi" },
  { id: "H08", name: "Blue", hex: "#2C4690", brand: "Hama Midi" },
  { id: "H09", name: "Light Blue", hex: "#305CB0", brand: "Hama Midi" },
  { id: "H10", name: "Green", hex: "#256847", brand: "Hama Midi" },
  { id: "H11", name: "Light Green", hex: "#49AE89", brand: "Hama Midi" },
  { id: "H12", name: "Brown", hex: "#534137", brand: "Hama Midi" },
  { id: "H13", name: "Dark Red", hex: "#C02435", brand: "Hama Midi" },
  { id: "H16", name: "Bright Green", hex: "#37B876", brand: "Hama Midi" },
  { id: "H17", name: "Grey", hex: "#83888A", brand: "Hama Midi" },
  { id: "H18", name: "Black", hex: "#2E2F31", brand: "Hama Midi" },
  { id: "H19", name: "Beige", hex: "#D8D2CE", brand: "Hama Midi" },
  { id: "H20", name: "Red Brown", hex: "#7F332A", brand: "Hama Midi" },
  { id: "H21", name: "Light Brown", hex: "#A5693F", brand: "Hama Midi" },
  { id: "H22", name: "Crimson", hex: "#A52D36", brand: "Hama Midi" },
  { id: "H24", name: "Violet", hex: "#683E9A", brand: "Hama Midi" },
  { id: "H25", name: "Medium Brown", hex: "#87593D", brand: "Hama Midi" },
  { id: "H26", name: "Light Red", hex: "#DE9B90", brand: "Hama Midi" },
  { id: "H27", name: "Tan", hex: "#DEB48B", brand: "Hama Midi" },
  { id: "H28", name: "Dark Green", hex: "#363F38", brand: "Hama Midi" },
  { id: "H29", name: "Magenta", hex: "#B9395E", brand: "Hama Midi" },
  { id: "H30", name: "Dark Brown", hex: "#592F38", brand: "Hama Midi" },
  { id: "H31", name: "Teal", hex: "#6797AE", brand: "Hama Midi" },
  { id: "H32", name: "Hot Pink", hex: "#FF208D", brand: "Hama Midi" },
  { id: "H33", name: "Bright Pink", hex: "#FF3956", brand: "Hama Midi" },
  { id: "H34", name: "Neon Yellow", hex: "#E5EF13", brand: "Hama Midi" },
  { id: "H35", name: "Bright Red", hex: "#FF2833", brand: "Hama Midi" },
  { id: "H36", name: "Royal Blue", hex: "#2353B0", brand: "Hama Midi" },
  { id: "H37", name: "Bright Green", hex: "#06B73C", brand: "Hama Midi" },
  { id: "H38", name: "Bright Orange", hex: "#FD8600", brand: "Hama Midi" },
  { id: "H39", name: "Pale Yellow", hex: "#F1F21C", brand: "Hama Midi" },
  { id: "H40", name: "Neon Orange", hex: "#FE630B", brand: "Hama Midi" },
  { id: "H41", name: "Bright Blue", hex: "#2659B2", brand: "Hama Midi" },
  { id: "H42", name: "Neon Green", hex: "#0CBD51", brand: "Hama Midi" },
  { id: "H43", name: "Bright Yellow", hex: "#F0EA37", brand: "Hama Midi" },
  { id: "H44", name: "Light Red", hex: "#EE6972", brand: "Hama Midi" },
  { id: "H45", name: "Light Purple", hex: "#886DB9", brand: "Hama Midi" },
  { id: "H46", name: "Sky Blue", hex: "#629ED7", brand: "Hama Midi" },
  { id: "H47", name: "Mint Green", hex: "#83CB70", brand: "Hama Midi" },
  { id: "H48", name: "Bright Pink", hex: "#CF70B7", brand: "Hama Midi" },
  { id: "H49", name: "Medium Blue", hex: "#4998BC", brand: "Hama Midi" },
  { id: "H60", name: "Orange", hex: "#F49422", brand: "Hama Midi" },
  { id: "H70", name: "Light Grey", hex: "#B4B9BC", brand: "Hama Midi" },
  { id: "H71", name: "Dark Grey", hex: "#404040", brand: "Hama Midi" },
  { id: "H75", name: "Beige", hex: "#C8AB93", brand: "Hama Midi" },
  { id: "H76", name: "Brown", hex: "#8C644B", brand: "Hama Midi" },
];

// ============ NABBI 色号系统（来自 fuse-bead-tool）============
export const NABBI_COLORS: BeadColor[] = [
  { id: "N01", name: "Dark Grey", hex: "#3A3D41", brand: "Nabbi" },
  { id: "N02", name: "Dark Brown", hex: "#50443B", brand: "Nabbi" },
  { id: "N03", name: "Brown", hex: "#5A3E36", brand: "Nabbi" },
  { id: "N04", name: "Dark Red", hex: "#813547", brand: "Nabbi" },
  { id: "N05", name: "Orange Brown", hex: "#A76224", brand: "Nabbi" },
  { id: "N06", name: "Tan", hex: "#AD967E", brand: "Nabbi" },
  { id: "N07", name: "Peach", hex: "#EEB182", brand: "Nabbi" },
  { id: "N08", name: "Grey Brown", hex: "#8D8B7F", brand: "Nabbi" },
  { id: "N09", name: "Dark Green", hex: "#2F4A39", brand: "Nabbi" },
  { id: "N10", name: "Light Grey", hex: "#D3CBCB", brand: "Nabbi" },
  { id: "N11", name: "Purple", hex: "#644591", brand: "Nabbi" },
  { id: "N12", name: "Beige", hex: "#E2D0BF", brand: "Nabbi" },
  { id: "N13", name: "Orange", hex: "#F3601B", brand: "Nabbi" },
  { id: "N14", name: "Yellow", hex: "#F9CA00", brand: "Nabbi" },
  { id: "N15", name: "White", hex: "#F4F4F3", brand: "Nabbi" },
  { id: "N16", name: "Green", hex: "#297A3B", brand: "Nabbi" },
  { id: "N17", name: "Blue", hex: "#3B75CB", brand: "Nabbi" },
  { id: "N18", name: "Light Pink", hex: "#E1B4AB", brand: "Nabbi" },
  { id: "N19", name: "Red", hex: "#DF2638", brand: "Nabbi" },
  { id: "N20", name: "Brown", hex: "#B58B69", brand: "Nabbi" },
  { id: "N21", name: "Pale Yellow", hex: "#F5EC8D", brand: "Nabbi" },
  { id: "N22", name: "Bright Green", hex: "#48AF4F", brand: "Nabbi" },
  { id: "N23", name: "Sky Blue", hex: "#71A3E6", brand: "Nabbi" },
  { id: "N24", name: "Lavender", hex: "#B6A0DB", brand: "Nabbi" },
  { id: "N25", name: "Pink", hex: "#EE6A97", brand: "Nabbi" },
  { id: "N26", name: "Peach", hex: "#FCA879", brand: "Nabbi" },
  { id: "N27", name: "Brown", hex: "#875F52", brand: "Nabbi" },
  { id: "N28", name: "Light Blue", hex: "#A7C6F1", brand: "Nabbi" },
  { id: "N29", name: "Orange", hex: "#EE9527", brand: "Nabbi" },
  { id: "N30", name: "Olive", hex: "#C7BF5E", brand: "Nabbi" },
];

// ============ 国产品牌色号映射系统（perler-beads 风格）============
// 这是一个统一的颜色映射表，以 HEX 为键，映射到多个品牌的色号
export const BRAND_COLOR_MAPPING: ColorMapping[] = [
  { hex: "#FAF4C8", brands: { "MARD": "A01", "COCO": "E02", "漫漫": "E2", "盼盼": "65", "咪小窝": "77" }, name: "Light Cream" },
  { hex: "#FFFFD5", brands: { "MARD": "A02", "COCO": "E01", "漫漫": "B1", "盼盼": "2", "咪小窝": "2" }, name: "Cream" },
  { hex: "#FEFF8B", brands: { "MARD": "A03", "COCO": "E05", "漫漫": "B2", "盼盼": "28", "咪小窝": "28" }, name: "Pale Yellow" },
  { hex: "#FBED56", brands: { "MARD": "A04", "COCO": "E07", "漫漫": "B3", "盼盼": "3", "咪小窝": "3" }, name: "Bright Yellow" },
  { hex: "#F4D738", brands: { "MARD": "A05", "COCO": "D03", "漫漫": "B4", "盼盼": "74", "咪小窝": "79" }, name: "Golden Yellow" },
  { hex: "#FEAC4C", brands: { "MARD": "A06", "COCO": "D05", "漫漫": "B5", "盼盼": "29", "咪小窝": "29" }, name: "Orange" },
  { hex: "#FE8B4C", brands: { "MARD": "A07", "COCO": "D08", "漫漫": "B6", "盼盼": "4", "咪小窝": "4" }, name: "Light Orange" },
  { hex: "#FFDA45", brands: { "MARD": "A08", "COCO": "E08", "漫漫": "B10", "盼盼": "88", "咪小窝": "98" }, name: "Yellow" },
  { hex: "#FF995B", brands: { "MARD": "A09", "COCO": "D06", "漫漫": "B11", "盼盼": "90", "咪小窝": "97" }, name: "Peach" },
  { hex: "#F77C31", brands: { "MARD": "A10", "COCO": "D07", "漫漫": "B12", "盼盼": "89", "咪小窝": "96" }, name: "Apricot" },
  { hex: "#FFDD99", brands: { "MARD": "A11", "COCO": "D01", "漫漫": "E11", "盼盼": "100", "咪小窝": "109" }, name: "Light Peach" },
  { hex: "#FE9F72", brands: { "MARD": "A12", "COCO": "K09", "漫漫": "A18", "盼盼": "99", "咪小窝": "110" }, name: "Salmon" },
  { hex: "#FFC365", brands: { "MARD": "A13", "COCO": "D04", "漫漫": "B13", "盼盼": "131", "咪小窝": "116" }, name: "Orange Yellow" },
  { hex: "#FD543D", brands: { "MARD": "A14", "COCO": "C05", "漫漫": "B14", "盼盼": "138", "咪小窝": "135" }, name: "Red Orange" },
  { hex: "#FFF365", brands: { "MARD": "A15", "COCO": "E04", "漫漫": "B15", "盼盼": "150", "咪小窝": "150" }, name: "Pastel Yellow" },
  { hex: "#FFFF9F", brands: { "MARD": "A16", "COCO": "E03", "漫漫": "IC04", "盼盼": "216", "咪小窝": "216" }, name: "Pale Yellow" },
  { hex: "#FFE36E", brands: { "MARD": "A17", "COCO": "E06", "漫漫": "IC9", "盼盼": "213", "咪小窝": "213" }, name: "Golden" },
  { hex: "#FEBE7D", brands: { "MARD": "A18", "COCO": "D02", "漫漫": "IC14", "盼盼": "223", "咪小窝": "208" }, name: "Peach" },
  { hex: "#FD7C72", brands: { "MARD": "A19", "COCO": "K10", "漫漫": "IC15", "盼盼": "218", "咪小窝": "218" }, name: "Light Red" },
  { hex: "#FFD568", brands: { "MARD": "A20", "COCO": "E09", "漫漫": "Q6", "盼盼": "242", "咪小窝": "242" }, name: "Gold" },
  { hex: "#FFE395", brands: { "MARD": "A21", "COCO": "E10", "漫漫": "R07", "盼盼": "276", "咪小窝": "261" }, name: "Light Gold" },
  { hex: "#F4F57D", brands: { "MARD": "A22", "COCO": "E11", "漫漫": "R06", "盼盼": "270", "咪小窝": "255" }, name: "Lime" },
  { hex: "#E6C9B7", brands: { "MARD": "A23", "COCO": "E12", "漫漫": "R08", "盼盼": "274", "咪小窝": "259" }, name: "Beige" },
  { hex: "#F7F8A2", brands: { "MARD": "A24", "COCO": "E13", "漫漫": "G3", "盼盼": "288", "咪小窝": "273" }, name: "Pale Green" },
  // ... 更多颜色映射可以按需添加
];

// ============ 辅助函数：从映射表获取特定品牌的色号 ============
export function getBrandColorForHex(hex: string, brand: BrandCode): BeadColor | null {
  const upperHex = hex.toUpperCase();
  const mapping = BRAND_COLOR_MAPPING.find(m => m.hex.toUpperCase() === upperHex);
  if (!mapping) return null;

  const colorId = mapping.brands[brand];
  if (!colorId) return null;

  return {
    id: colorId,
    name: mapping.name || `Unknown (${colorId})`,
    hex: mapping.hex,
    brand: SUPPORTED_BRANDS[brand],
  };
}

// ============ 辅助函数：获取颜色对应的所有品牌色号 ============
export function getAllBrandColorsForHex(hex: string): Map<BrandCode, string> {
  const upperHex = hex.toUpperCase();
  const mapping = BRAND_COLOR_MAPPING.find(m => m.hex.toUpperCase() === upperHex);
  if (!mapping) return new Map();

  return new Map(
    Object.entries(mapping.brands).map(([brand, colorId]) => [brand as BrandCode, colorId])
  );
}

// ============ 增强的调色板系统 ============
export const PALETTES = {
  // 原有调色板
  perler: { name: "Perler", colors: PERLER_COLORS },
  hama: { name: "Hama Midi", colors: HAMA_MIDI_COLORS },
  artkal: { name: "Artkal S", colors: ARTKAL_S_COLORS },

  // 新增调色板
  mard: { name: "MARD", colors: MARD_COLORS },
  hamaEnhanced: { name: "Hama Enhanced", colors: HAMA_ENHANCED_COLORS },
  nabbi: { name: "Nabbi", colors: NABBI_COLORS },

  // 组合调色板（国产品牌）
  coco: { name: "COCO (国产品牌)", colors: [] },
  manman: { name: "漫漫 (国产品牌)", colors: [] },
  panpan: { name: "盼盼 (国产品牌)", colors: [] },
  mixiaowo: { name: "咪小窝 (国产品牌)", colors: [] },
};

export type PaletteKey = keyof typeof PALETTES;

// ============ 动态加载国产品牌色号 ============
export function loadDomesticBrandPalette(brandCode: BrandCode): BeadColor[] {
  const colors: BeadColor[] = [];

  for (const mapping of BRAND_COLOR_MAPPING) {
    const colorId = mapping.brands[brandCode];
    if (colorId) {
      colors.push({
        id: colorId,
        name: mapping.name || `Unknown (${colorId})`,
        hex: mapping.hex,
        brand: SUPPORTED_BRANDS[brandCode],
      });
    }
  }

  return colors;
}

// ============ 自定义色号支持 ============
// 用户可以添加自己的色号
let customColors: BeadColor[] = [];

export function addCustomColor(color: BeadColor): void {
  customColors.push(color);
}

export function getCustomColors(): BeadColor[] {
  return [...customColors];
}

export function clearCustomColors(): void {
  customColors = [];
}

export function getCustomPalette(): BeadColor[] {
  return customColors;
}

// ============ 扩展调色板以支持自定义色号 ============
export function getPaletteWithCustom(basePalette: BeadColor[]): BeadColor[] {
  return [...basePalette, ...customColors];
}
