declare module 'vara' {
  interface VaraOptions {
    fontSize?: number
    strokeWidth?: number
    color?: string
    duration?: number
    textAlign?: string
    autoAnimation?: boolean
    queued?: boolean
    letterSpacing?: number
  }

  interface VaraText {
    text: string
    fontSize?: number
    strokeWidth?: number
    color?: string
    duration?: number
    textAlign?: string
    x?: number
    y?: number
    fromCurrentPosition?: { x: boolean; y: boolean }
    autoAnimation?: boolean
    queued?: boolean
    letterSpacing?: number
    delay?: number
  }

  class Vara {
    constructor(
      element: string,
      fontPath: string,
      texts: VaraText[],
      options?: VaraOptions
    )
    animationEnd(callback: (i: number, o: object) => void): Vara
    draw(): void
  }

  export default Vara
}
