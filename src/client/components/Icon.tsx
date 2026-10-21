export type IconName =
  | 'arrow'
  | 'check'
  | 'cross'
  | 'calendar'
  | 'print'
  | 'download'
  | 'plus'
  | 'minus'
  | 'pencil'
  | 'bell';

/** 24×24 line glyphs, 1.5px stroke, square caps. Always decorative: text sits beside them. */
const PATHS: Record<IconName, string> = {
  arrow: 'M4 12h15M13 6l6 6-6 6',
  check: 'M4 12.5l5 5L20 6.5',
  cross: 'M5 5l14 14M19 5L5 19',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  print: 'M7 9V4h10v5M5 9h14v8h-3M8 14h8v6H8zM5 17H5',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  pencil: 'M5 19l1-4L16 5l3 3L9 18zM14 7l3 3',
  bell: 'M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4',
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
