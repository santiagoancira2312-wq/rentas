import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = 'h-[22px] w-[22px]'

const S = ({ children, className, ...resto }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
       strokeLinecap="round" strokeLinejoin="round" className={className ?? base}
       aria-hidden {...resto}>{children}</svg>
)

export const IcTablero  = (p: P) => <S {...p}><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" /></S>
export const IcResumen  = (p: P) => <S {...p}><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 13h8M8 17h5" /></S>
export const IcCobranza = (p: P) => <S {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4" /></S>
export const IcUnidades = (p: P) => <S {...p}><path d="M3 21V9l6-4 6 4v12" /><path d="M15 21V11l6 3v7" /><path d="M7 13h2M7 17h2" /></S>
export const IcInquilinos = (p: P) => <S {...p}><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 5.5a3 3 0 0 1 0 5.8M18 20a5.6 5.6 0 0 0-2.2-4.4" /></S>
export const IcEgresos  = (p: P) => <S {...p}><path d="M4 7h16a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9v3" /><circle cx="17" cy="12.5" r="1.3" fill="currentColor" stroke="none" /></S>
export const IcAgua     = (p: P) => <S {...p}><path d="M12 3s6 6.3 6 10.2A6 6 0 0 1 6 13.2C6 9.3 12 3 12 3z" /><path d="M9.5 14a2.6 2.6 0 0 0 2.5 2.4" /></S>
export const IcAjustes  = (p: P) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4z" /></S>
export const IcGuia     = (p: P) => <S {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5" /></S>
export const IcMas      = (p: P) => <S {...p}><path d="M12 5v14M5 12h14" /></S>
export const IcSubida   = (p: P) => <S {...p}><path d="M7 17 17 7M9 7h8v8" /></S>
export const IcBajada   = (p: P) => <S {...p}><path d="M7 7l10 10M17 9v8H9" /></S>
export const IcAlerta   = (p: P) => <S {...p}><path d="M12 3 2.6 19.5A1 1 0 0 0 3.5 21h17a1 1 0 0 0 .9-1.5L12 3z" /><path d="M12 9v5M12 17.5v.01" /></S>
export const IcReloj    = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>
export const IcDinero   = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v10M14.5 9.5c-.6-.7-1.6-1-2.5-1-1.4 0-2.5.7-2.5 1.9 0 2.6 5 1.4 5 4 0 1.2-1.1 2-2.5 2-1 0-2-.4-2.6-1.1" /></S>
export const IcBuscar   = (p: P) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></S>
export const IcCheck    = (p: P) => <S {...p}><path d="m5 13 4 4L19 7" /></S>
export const IcCerrar   = (p: P) => <S {...p}><path d="M6 6l12 12M18 6 6 18" /></S>
export const IcChevron  = (p: P) => <S {...p}><path d="m9 6 6 6-6 6" /></S>
export const IcSalir    = (p: P) => <S {...p}><path d="M15 17v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v2M10 12h11M18 9l3 3-3 3" /></S>
export const IcMenu     = (p: P) => <S {...p}><path d="M4 7h16M4 12h16M4 17h16" /></S>
export const IcDescarga = (p: P) => <S {...p}><path d="M12 3v12M7 11l5 5 5-5M4 20h16" /></S>
export const IcEditar   = (p: P) => <S {...p}><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" /><path d="M14.5 6.5 17.5 9.5" /></S>
