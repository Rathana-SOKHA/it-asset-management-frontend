import type { SVGProps } from "react"

type IconName =
  | "activity" | "archive" | "arrow-down" | "arrow-left" | "arrow-right"
  | "bell" | "box" | "calendar" | "check" | "chevron-down" | "chevron-left"
  | "chevron-right" | "clock" | "close" | "download" | "edit" | "external"
  | "file" | "filter" | "grid" | "home" | "laptop" | "map" | "menu"
  | "more" | "package" | "plus" | "refresh" | "search" | "settings"
  | "shield" | "sparkles" | "sun" | "moon" | "tag" | "team" | "trash" | "upload" | "users"

const paths: Record<IconName, string> = {
  activity: "M3 12h4l3-8 4 16 3-8h4",
  archive: "M3 4h18v4H3z M5 8v12h14V8 M10 12h4",
  "arrow-down": "M12 5v14 M19 12l-7 7-7-7",
  "arrow-left": "M19 12H5 M12 19l-7-7 7-7",
  "arrow-right": "M5 12h14 M12 5l7 7-7 7",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  box: "m12 3 9 5-9 5-9-5 9-5z M3 8v9l9 5 9-5V8 M12 13v9",
  calendar: "M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16",
  check: "m5 12 4 4L19 6",
  "chevron-down": "m6 9 6 6 6-6",
  "chevron-left": "m15 18-6-6 6-6",
  "chevron-right": "m9 18 6-6-6-6",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
  close: "m18 6-12 12 M6 6l12 12",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  edit: "M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z",
  external: "M14 3h7v7 M10 14 21 3 M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h8",
  filter: "M4 7h16 M7 12h10 M10 17h4",
  grid: "M3 3h8v8H3z M13 3h8v5h-8z M13 10h8v11h-8z M3 13h8v8H3z",
  home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z",
  laptop: "M4 5h16v11H4z M2 20h20l-2-4H4z",
  map: "m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  moon: "M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z",
  more: "M5 12h.01 M12 12h.01 M19 12h.01",
  package: "m12 3 9 5-9 5-9-5 9-5z M3 8v9l9 5 9-5V8 M12 13v9",
  plus: "M12 5v14 M5 12h14",
  refresh: "M20 7v5h-5 M4 17v-5h5 M5.6 9a7 7 0 0 1 11.6-2L20 12 M4 12l2.8 5a7 7 0 0 0 11.6-2",
  search: "m20 20-4.5-4.5 M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0z",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.6 2.8-.2-.1a1.8 1.8 0 0 0-1.9.3l-.2.2h-3.2l-.1-.2a1.8 1.8 0 0 0-1.9-.3l-.2.1-1.6-2.8.1-.1a1.7 1.7 0 0 0 .3-1.9L9 14.8v-3.2l.2-.1a1.8 1.8 0 0 0 .3-1.9l-.1-.2L11 6.6l.2.1a1.8 1.8 0 0 0 1.9-.3l.1-.2h3.2l.2.2a1.8 1.8 0 0 0 1.9.3l.2-.1 1.6 2.8-.1.2a1.7 1.7 0 0 0-.3 1.9l.2.1v3.2z",
  shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z M9 12l2 2 4-4",
  sparkles: "m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z M19 14l1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2z",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2 M12 20v2 M4.93 4.93l1.42 1.42 M17.65 17.65l1.42 1.42 M2 12h2 M20 12h2 M4.93 19.07l1.42-1.42 M17.65 6.35l1.42-1.42",
  tag: "M20 13 13 20l-9-9V4h7z M7 7h.01",
  team: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8",
  trash: "M3 6h18 M8 6V4h8v2 M19 6l-1 15H6L5 6 M10 11v6 M14 11v6",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  users: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8",
}

export default function Icon({
  name,
  size = 18,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  )
}
