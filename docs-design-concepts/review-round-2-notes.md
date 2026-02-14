# Review Round 2 -- Notes

## User Favorites
- #11 Grid Collapse (decay mechanic)
- E14 Departure Board (split-flap animations)
- D14 Somnography Lab (EEG traces, hypnogram)
- #4 Threshold Protocol (redaction bars, classification)
- Both syntheses (Level Zero + Level One "Sublevel Zero")

## Key Feedback: Redaction Behavior
The user wants a specific redaction interaction model:
- Redactions should be **animated and temporary** -- not a permanent occlusion
- On hover: show **inverted text color** so the redaction bar is still visible/present but text IS readable
- The redaction should NOT get in the way of actually reading docs
- Think: redaction as atmospheric texture, not as a hide-and-seek game
- Implementation: `color` transitions to inverted/visible on hover, `background` stays as a dark bar but becomes semi-transparent

## Direction: Build Prototypes
User wants working HTML/CSS/JS prototypes in `./docs-design-concepts/prototypes/`
- Docs-themed (landing page + a few content pages)
- Demonstrate components: split-flap titles, decay system, redaction bars, thermal receipts, protocol headers, navigation, search
- Doesn't need to be Astro -- simpler scaffold is fine
- Multiple prototypes exploring different concept combinations

## Prototype Plan
1. **Sublevel Zero** -- The main Level One synthesis: dark-primary, decay, split-flap, protocol headers, thermal receipts, redactions
2. **Departure Board** -- Transit terminal aesthetic focused on the split-flap animation and LED status system
3. **Somnography Hybrid** -- EEG traces + Grid Collapse decay + Threshold Protocol redactions -- the wildcard
