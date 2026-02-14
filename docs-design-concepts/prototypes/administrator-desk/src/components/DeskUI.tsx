import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, FileText, Terminal, Settings, Shield } from 'lucide-react'
import GlitchText from './GlitchText'

const TABS = [
  { id: 'intro', label: '00_INTRO', icon: FileText, color: '#e6c891' },
  { id: 'commands', label: '01_CMDS', icon: Terminal, color: '#d8ba80' },
  { id: 'config', label: '02_CONF', icon: Settings, color: '#ccac70' },
  { id: 'admin', label: '99_ADMIN', icon: Shield, color: '#bf9e60' },
]

const CONTENT = {
  intro: {
    title: "THE BACKLOGS: ACCESS GRANTED",
    body: `Welcome to the Administrator's Desk.

You are currently logged into Terminal 744, located within the damp yellow expanses of Level 0.

Current status: STABLE.
Reality Integrity: 94%.

The Backlogs are infinite. Your task is to organize them. Do not look directly at the entities.
Use the folders on the left to navigate the current stack.

Remember: If the lights go out, stay at your desk. It is the only safe space.`
  },
  commands: {
    title: "AVAILABLE COMMANDS",
    body: `> backlog claim <TASK_ID>
  - Claims a task for your current reality anchor.
  - WARNING: Do not claim tasks from the void.

> backlog drop <TASK_ID>
  - Relinquishes a task. 
  - The task will return to the pool and may mutate.

> backlog cycle
  - Refreshes the local cache.
  - Use if you hallucinate non-existent files.

> backlog burn --force
  - [REDACTED]
  - USE ONLY IN EMERGENCIES.`
  },
  config: {
    title: "SYSTEM CONFIGURATION",
    body: `ROOT_DIR = "/var/reality/backlogs"
MAX_RECURSION_DEPTH = 4  # Do not exceed 4 or you risk clipping.
ENABLE_SANITY_CHECKS = true
RENDER_GHOSTS = false

# Network Settings
GATEWAY = "192.168.0.666"
TIMEOUT = "ETERNAL"

# User Preferences
THEME = "DAMP_YELLOW"
FONT = "Special_Elite"
NOISE_LEVEL = "MADDENING"`
  },
  admin: {
    title: "ADMINISTRATION PANEL",
    body: `RESTRICTED AREA. AUTHORIZED PERSONNEL ONLY.

> Override Protocols: ACTIVE
> Reality Anchors: STABLE
> Memory Wipes: PENDING

Do not touch the red button. There is no red button. If you see a red button, report to medical immediately.`
  }
}

export default function DeskUI({ onScroll }: { onScroll?: (progress: number) => void }) {
  const [activeTab, setActiveTab] = useState('intro')
  const [searchQuery, setSearchQuery] = useState('')

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      if (!onScroll) return;
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      const progress = scrollTop / (scrollHeight - clientHeight);
      onScroll(progress);
  }

  const playClick = () => {
    // Simple synthesized click
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Low thud
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  const handleTabChange = (id: string) => {
      if (activeTab !== id) {
          playClick()
          setActiveTab(id)
      }
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex p-8 gap-12 font-['Special_Elite'] text-neutral-900 selection:bg-yellow-900/30 overflow-hidden">
      
      {/* LEFT: Folder Stack */}
      <div className="pointer-events-auto w-64 flex flex-col pt-12 perspective-1000 z-20 group">
        {TABS.map((tab, index) => {
          const isActive = activeTab === tab.id
          return (
            <motion.button
              key={tab.id}
              layoutId={`tab-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              initial={false}
              animate={{
                x: isActive ? 20 : 0,
                scale: isActive ? 1.05 : 1,
                marginLeft: isActive ? 20 : 0,
                rotateZ: isActive ? 2 : 0, // Slight tilt for active
              }}
              whileHover={{ 
                  x: 30, 
                  scale: 1.05,
                  rotateZ: 1, // Fan out slightly
                  transition: { duration: 0.2 }
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative h-14 w-full -mt-2 first:mt-0 flex items-center px-4 shadow-md border border-white/10 origin-left"
              style={{ 
                backgroundColor: tab.color,
                borderRadius: '4px 12px 12px 4px',
                zIndex: isActive ? 50 : TABS.length - index,
                boxShadow: '2px 4px 8px rgba(0,0,0,0.2)'
              }}
            >
              <div className="absolute left-2 top-2 bottom-2 w-1 bg-black/5 rounded-full" />
              <tab.icon className="w-5 h-5 mr-3 opacity-60 mix-blend-multiply" />
              <span className="text-lg tracking-widest opacity-80 mix-blend-multiply font-bold">{tab.label}</span>
            </motion.button>
          )
        })}
      </div>

      {/* CENTER: The Paper */}
      <div className="flex-1 relative flex items-center justify-center pointer-events-auto z-10 perspective-1000">
        <AnimatePresence mode='wait'>
          <motion.div
            key={activeTab}
            initial={{ y: -20, opacity: 0, rotateX: 10 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            exit={{ y: 50, opacity: 0, rotateX: -10 }}
            transition={{ type: "spring", stiffness: 120, damping: 14 }}
            className="w-full max-w-3xl bg-[#fdfbf7] h-[85vh] shadow-2xl p-12 relative overflow-hidden transform-gpu"
            style={{
              boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.6), inset 0 0 40px rgba(0,0,0,0.05)',
              transform: 'rotate(-0.5deg)'
            }}
          >
            {/* Paper Texture/Stains */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-yellow-900/10 to-transparent pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col">
              <header className="border-b-4 border-double border-neutral-800 pb-4 mb-8 flex justify-between items-end">
                <GlitchText 
                    text={CONTENT[activeTab as keyof typeof CONTENT].title} 
                    as="h1" 
                    className="text-4xl font-bold uppercase tracking-tighter mix-blend-multiply opacity-90"
                    frequent={false}
                />
                <div className="flex flex-col items-end">
                    <span className="text-xs font-mono opacity-50">CONFIDENTIAL</span>
                    <GlitchText text={`REF-${Math.random().toString(36).substring(7).toUpperCase()}`} as="span" className="text-sm opacity-50 font-bold font-mono" />
                </div>
              </header>
              
              <div 
                className="flex-1 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-neutral-400 scrollbar-track-transparent"
                onScroll={handleScroll}
              >
                <p className="whitespace-pre-line text-xl leading-relaxed opacity-80 font-medium">
                  {CONTENT[activeTab as keyof typeof CONTENT].body}
                </p>
              </div>

              <footer className="mt-8 pt-4 border-t border-neutral-300 flex justify-between text-xs text-neutral-500 font-mono uppercase tracking-widest">
                <span>Property of The Backrooms</span>
                <span>Level 0 / Zone 4</span>
              </footer>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* RIGHT: Search / Tools */}
      <div className="w-72 pointer-events-auto flex flex-col gap-6 pt-12 z-20">
        <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-900 p-2 rounded-sm shadow-2xl transform rotate-1 border-2 border-gray-700"
        >
          <div className="bg-black p-4 rounded-sm border border-gray-800 relative overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,1)]">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-gray-500 to-transparent opacity-50" />
            <div className="flex items-center gap-3 border-b-2 border-gray-700 pb-2 mb-2">
              <Search className="text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="SEARCH INDEX..." 
                className="bg-transparent border-none outline-none text-white placeholder-gray-600 w-full font-mono text-base font-bold uppercase tracking-widest"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="text-[10px] text-gray-500 font-mono leading-tight tracking-wider opacity-80">
              &gt; SYSTEM READY<br/>
              &gt; AWAITING QUERY...
            </div>
          </div>
        </motion.div>

        <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-[#f0e6d2] p-6 shadow-xl transform -rotate-2 relative overflow-hidden border border-neutral-300"
        >
           <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-900/20 blur-sm"></div>
           <div className="w-2 h-2 rounded-full bg-red-900 mx-auto mb-4 opacity-50 shadow-sm"></div>
           <h3 className="font-bold border-b-2 border-neutral-800 pb-2 mb-3 text-center uppercase tracking-widest text-sm">Priority</h3>
           <ul className="text-sm list-none space-y-3 font-medium opacity-70">
             <li className="flex items-start gap-2">
                <span className="text-red-700 font-bold">!</span>
                <span>Check reality anchors</span>
             </li>
             <li className="flex items-start gap-2">
                <span className="text-red-700 font-bold">!</span>
                <span>Restock vending machine</span>
             </li>
             <li className="flex items-start gap-2">
                <span className="text-neutral-400 font-bold">-</span>
                <span className="line-through decoration-red-900/50">Escape</span>
             </li>
           </ul>
        </motion.div>
      </div>

    </div>
  )
}
