import { useState, useEffect, useRef } from 'react'

const GLITCH_CHARS = '!<>-_\\/[]{}—=+*^?#________'

interface GlitchTextProps {
  text: string
  as?: any
  className?: string
  frequent?: boolean
}

export default function GlitchText({ text, as: Component = 'span', className = '', frequent = false }: GlitchTextProps) {
  const [displayText, setDisplayText] = useState(text)
  const originalText = useRef(text)
  
  // Update ref if prop changes
  useEffect(() => {
    originalText.current = text
    setDisplayText(text)
  }, [text])

  useEffect(() => {
    let timeout: any
    
    const glitch = () => {
      // 1. Randomly decide to glitch
      if (Math.random() > (frequent ? 0.6 : 0.9)) {
        const chars = originalText.current.split('')
        
        // 2. Corrupt random amount of characters
        const amount = Math.floor(Math.random() * 3) + 1
        for (let i = 0; i < amount; i++) {
            const idx = Math.floor(Math.random() * chars.length)
            chars[idx] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
        }
        
        setDisplayText(chars.join(''))
        
        // 3. Reset quickly
        setTimeout(() => {
          setDisplayText(originalText.current)
        }, 50 + Math.random() * 100)
      }
      
      // Schedule next check
      // Frequent: checks every 100-500ms
      // Normal: checks every 500-2000ms
      const delay = frequent 
        ? 100 + Math.random() * 400 
        : 500 + Math.random() * 1500
        
      timeout = setTimeout(glitch, delay)
    }

    timeout = setTimeout(glitch, 1000)

    return () => clearTimeout(timeout)
  }, [frequent])

  return (
    <Component className={className}>
      {displayText}
    </Component>
  )
}
