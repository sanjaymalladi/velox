import type { VeloxTheme } from '../types'

export type CardSurfaceStyle = 'none' | 'frosted' | 'solid' | 'ribbon'

export interface TypeStyle {
  fontFamily: string
  fontSize: number
  fontWeight: number
  lineHeight: number
  letterSpacing: number
}

export interface CardSurface {
  style: CardSurfaceStyle
  fill: string
  border: string
  radius: number
  shadow?: { color: string; blur: number; offsetY: number }
}

export interface VeloxAesthetic {
  id: string
  name: string
  description?: string
  /** Flat color map from DESIGN.md */
  colors: Record<string, string>
  /** Legacy theme tokens used across compiler + draw */
  theme: VeloxTheme
  typography: {
    display: TypeStyle
    title: TypeStyle
    subtitle: TypeStyle
    body: TypeStyle
    caption: TypeStyle
    kicker: TypeStyle
  }
  surfaces: {
    card: CardSurface
    captionBar: {
      fill: string
      border: string
      /** When set, draws a top accent stripe instead of filling an inset rect. */
      borderMode?: 'stripe' | 'none'
      radius: number
      text: string
    }
    button: { fill: string; text: string; radius: number }
  }
  video: {
    canvas: string
    sceneBackground: string
    grain: number
    vignette: number
  }
}
