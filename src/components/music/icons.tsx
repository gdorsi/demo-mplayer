import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function MusicNoteIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 18V6.5l9-2V16" />
      <circle cx="7" cy="18" r="2.5" />
      <circle cx="16" cy="16" r="2.5" />
    </IconBase>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 6.5v11l9-5.5-9-5.5Z" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="7" y="6" width="3.5" height="12" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.5" y="6" width="3.5" height="12" rx="1" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function PreviousIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 6v12" />
      <path d="m18 7-8 5 8 5V7Z" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function NextIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M17 6v12" />
      <path d="m6 7 8 5-8 5V7Z" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 16V5" />
      <path d="m7.5 9.5 4.5-4.5 4.5 4.5" />
      <path d="M5 18.5h14" />
    </IconBase>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

export function DotsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16" />
      <path d="M9.5 4h5" />
      <path d="M8 7v11" />
      <path d="M12 7v11" />
      <path d="M16 7v11" />
      <path d="M6.5 7 7 19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l.5-12" />
    </IconBase>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m4 20 4.5-1 9-9a2.2 2.2 0 0 0-3-3l-9 9L4 20Z" />
      <path d="m13.5 6.5 4 4" />
    </IconBase>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M15 8V5.5A1.5 1.5 0 0 0 13.5 4h-7A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20h7a1.5 1.5 0 0 0 1.5-1.5V16" />
      <path d="M10 12h10" />
      <path d="m17 8 3 4-3 4" />
    </IconBase>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </IconBase>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" />
      <path d="m18.5 15 1 2.5L22 18.5 19.5 19.5 18.5 22l-1-2.5-2.5-1 2.5-1 1-2.5Z" />
    </IconBase>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 15 6-6 6 6" />
    </IconBase>
  );
}

export function LibraryIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 6.5h4v13h-4z" />
      <path d="M10 4.5h4v15h-4z" />
      <path d="M15.5 8h4v11.5h-4z" />
    </IconBase>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="m8.2 10.8 7.6-4.1" />
      <path d="m8.2 13.2 7.6 4.1" />
    </IconBase>
  );
}
