import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = 'h-[22px] w-[22px]'

const S = ({ children, className, ...resto }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
       strokeLinecap="round" strokeLinejoin="round" className={className ?? base}
       aria-hidden {...resto}>{children}</svg>
)

export const IcBasura = (p: P) => <S {...p}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></S>
export const IcMas    = (p: P) => <S {...p}><path d="M12 5v14M5 12h14" /></S>
export const IcGota   = (p: P) => <S {...p}><path d="M12 3s6 6.3 6 10.2A6 6 0 0 1 6 13.2C6 9.3 12 3 12 3z" /></S>
export const IcAviso  = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16v.01" /></S>
