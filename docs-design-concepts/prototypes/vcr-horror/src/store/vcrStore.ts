import { create } from 'zustand'

type VCRStatus = 'PLAYING' | 'PAUSED' | 'FF' | 'RW' | 'EJECTED' | 'LOADING'

interface VCRState {
    status: VCRStatus
    currentTime: number
    duration: number
    tapeTitle: string | null
    screenFlash: boolean

    // Actions
    play: () => void
    pause: () => void
    fastForward: () => void
    rewind: () => void
    insertTape: (title: string, duration: number) => void
    ejectTape: () => void
    seek: (time: number) => void
    triggerScreenFlash: () => void
    tick: (delta: number) => void // Called every frame
}

export const useVCRStore = create<VCRState>((set) => ({
    status: 'EJECTED',
    currentTime: 0,
    duration: 0,
    tapeTitle: null,
    screenFlash: false,

    play: () => set({ status: 'PLAYING' }),
    pause: () => set({ status: 'PAUSED' }),
    fastForward: () => set({ status: 'FF' }),
    rewind: () => set({ status: 'RW' }),

    insertTape: (title, duration) => set({
        status: 'LOADING',
        tapeTitle: title,
        duration,
        currentTime: 0
    }),

    ejectTape: () => set({
        status: 'EJECTED',
        tapeTitle: null,
        currentTime: 0
    }),

    seek: (time) => set({ currentTime: time }),

    triggerScreenFlash: () => {
        set({ screenFlash: true })
        setTimeout(() => set({ screenFlash: false }), 100) // 100ms flash
    },

    tick: (delta) => set((state) => {
        if (state.status === 'EJECTED' || state.status === 'PAUSED') return {}

        let speed = 0
        if (state.status === 'PLAYING') speed = 1
        if (state.status === 'FF') speed = 5
        if (state.status === 'RW') speed = -5
        if (state.status === 'LOADING') {
            // Simulate loading delay
            return { status: 'PLAYING' }
        }

        let newTime = state.currentTime + delta * speed

        // Loop or stop at ends
        if (newTime > state.duration) {
            newTime = state.duration
            return { currentTime: newTime, status: 'PAUSED' }
        }
        if (newTime < 0) {
            newTime = 0
            return { currentTime: newTime, status: 'PAUSED' }
        }

        return { currentTime: newTime }
    })
}))
