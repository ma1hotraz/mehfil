export const TEXT_SIZES = [1, 1.15, 1.3] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export type ThemeName = 'paper' | 'lamplight';
