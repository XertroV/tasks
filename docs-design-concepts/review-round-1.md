# Docs Design Concepts -- Review Round 1

**Reviewer:** Claude (fresh eyes, post-generation)
**Date:** 2026-02-14
**Goal filter:** Fun, interactive, liminal horror, atmospheric, way-over-the-top art project, beautiful and intricate.

---

## Summary of All 18 Concepts

### Concepts 1-4 (Agent A)

| # | Name | One-liner | Pract. | Distinct. | Meets Goals? |
|---|------|-----------|--------|-----------|-------------|
| 1 | Municipal Safety Signage | ISO hazard signs as wayfinding in infinite offices | 8 | 8 | Moderate -- strong visual identity but more utilitarian than artistic/horror |
| 2 | Fluorescent Hum | Warm fluorescent light, ceiling tile grid, uncanny normality | 9 | 7 | Mixed -- deeply atmospheric & uncanny but *too subtle* for "over the top art project" |
| 3 | Analog Tape Log | VHS playback with scan lines, timecodes, scroll-reactive OSD | 7 | 9 | Strong -- interactive (OSD bar), atmospheric, fun, clearly an art project |
| 4 | Threshold Protocol | Declassified dossier with redaction bars, classification stamps | 7 | 9 | Strong -- interactive (redaction reveals), deeply atmospheric, beautiful typography |

### Concepts 5-8 (Agent B)

| # | Name | One-liner | Pract. | Distinct. | Meets Goals? |
|---|------|-----------|--------|-----------|-------------|
| 5 | Archival Operations Manual | Recovered institutional binder with manila folders and stamps | 8 | 9 | Moderate -- atmospheric and beautiful but less interactive/horror, more cozy |
| 6 | Corridor Depth | One-point perspective corridor, breadcrumbs recede to vanishing point | 6 | 9 | Strong -- deeply atmospheric, liminal horror core, intricate spatial metaphor |
| 7 | Maintenance Terminal | Green phosphor CRT console bolted to sub-basement wall | 7 | 8 | Moderate -- atmospheric and fun but monospace body hurts readability; terminal themes are known |
| 8 | Poolrooms | Ceramic tile grid + caustic water-light from Backrooms Poolrooms lore | 7 | 10 | Very Strong -- beautiful, atmospheric, interactive (ripples/caustics), iconic Backrooms imagery |

### Concepts 9-12 (Agent C)

| # | Name | One-liner | Pract. | Distinct. | Meets Goals? |
|---|------|-----------|--------|-----------|-------------|
| 9 | Exit Sign Noir | Film noir + dying EXIT sign, cinematic negative space | 8 | 8 | Moderate -- atmospheric and beautiful but less interactive; dark-only concern |
| 10 | The Catalog | Library card catalog with mahogany, brass, and date-due slips | 6 | 9 | Moderate -- beautiful and intricate but not liminal horror; more "cozy library" |
| 11 | Grid Collapse | Swiss grid that *decays* at deeper doc levels | 7 | 10 | Very Strong -- interactive decay mechanic, liminal horror via corruption, artistic, systematic |
| 12 | Memo from Nowhere | Corporate memo from nonexistent company; routing stamps, CONFIDENTIAL | 6 | 10 | Strong -- deeply atmospheric worldbuilding, beautiful, but less interactive than others |

### Concepts 13-15 (Agent D -- Freeform)

| # | Name | One-liner | Pract. | Distinct. | Meets Goals? |
|---|------|-----------|--------|-----------|-------------|
| D13 | The Eternal Hotel | Guest services compendium for a hotel with no checkout | 7 | 10 | Strong -- beautiful typography, great worldbuilding, elevator UX is fun/interactive |
| D14 | Somnography Lab | Sleep study report; EEG traces, hypnogram navigation, chart paper | 6 | 10 | Very Strong -- deeply intricate, interactive (hypnogram), beautiful, unique horror angle |
| D15 | Condemned Property | Building inspector report for a structure that can't be demolished | 7 | 10 | Strong -- violation log is interactive, institutional horror, great metaphor coherence |

### Concepts 13-15 (Agent E -- Freeform)

| # | Name | One-liner | Pract. | Distinct. | Meets Goals? |
|---|------|-----------|--------|-----------|-------------|
| E13 | HVAC Schematic | Engineering blueprints for a building that shouldn't have mechanical systems | 7 | 9 | Strong -- beautiful blueprint aesthetic, redline interaction, deeply specific |
| E14 | Departure Board | Split-flap transit board for destinations that don't exist | 7 | 10 | Very Strong -- the split-flap animation is *chef's kiss* interactive, deeply atmospheric |
| E15 | Shift Log | Night shift handover notes, thermal printer receipts, bulletin board | 7 | 10 | Strong -- thermal receipt code blocks are novel, interactive pin board, great dark mode |

---

## Existing Synthesis ("Level Zero" Hybrid)

The synthesis document already proposed combining:
- **Grid Collapse** (decay mechanic driven by `--page-decay` CSS var)
- **Threshold Protocol** (institutional voice, protocol headers, redaction bars)
- **Poolrooms** (tile grid material, aquatic color language, caustic light)

This is a solid starting direction but was written *before* the Agent D and E freeform concepts existed. Those concepts introduced several ideas worth considering:
- The **split-flap animation** (Departure Board) -- one of the most viscerally satisfying interactive moments
- The **thermal receipt code blocks** (Shift Log) -- genuinely novel way to present code
- The **elevator directory navigation** (Eternal Hotel) -- elegant spatial metaphor
- The **EEG trace navigation** (Somnography Lab) -- the most conceptually wild signature component
- The **redline corrections** (HVAC Schematic) -- beautiful interactive metaphor for links

---

## Goal Scorecard

Goals: **Fun** | **Interactive** | **Liminal Horror** | **Atmospheric** | **Over-the-top Art Project** | **Beautiful & Intricate**

### Top Tier (meets 5-6 goals strongly)

1. **Grid Collapse (#11)** -- Horror via corruption mechanic, intricate system, atmospheric depth narrative. Less interactive than some.
2. **Poolrooms (#8)** -- Beautiful, atmospheric, iconic horror imagery, interactive (caustics/ripples). Needs stronger interactive components.
3. **Departure Board (E14)** -- Fun (split-flap!), interactive, atmospheric, intricate. Liminal horror is there (destinations that don't exist) but secondary.
4. **Somnography Lab (D14)** -- Intricate, beautiful, deeply weird, atmospheric. Interactive (hypnogram, EEG traces). Horror via "dreaming about infinite offices."
5. **Threshold Protocol (#4)** -- Atmospheric, interactive (redaction bars), beautiful typography. Liminal horror via institutional dread.

### Strong (meets 4 goals)

6. **Analog Tape Log (#3)** -- Fun, interactive (scroll-reactive OSD), atmospheric. Less intricate.
7. **The Eternal Hotel (D13)** -- Beautiful, atmospheric, fun (elevator buttons), worldbuilding. Less horror.
8. **Shift Log (E15)** -- Fun, atmospheric, interactive (bulletin board, thermal receipts). Less horror.
9. **Condemned Property (D15)** -- Atmospheric, interactive (violation log), strong metaphor. Less "beautiful."
10. **Memo from Nowhere (#12)** -- Atmospheric, beautiful worldbuilding, funny. Less interactive.

### Good but Missing Key Goals

11. **HVAC Schematic (E13)** -- Beautiful, atmospheric, but niche familiarity concern.
12. **Corridor Depth (#6)** -- Atmospheric, liminal horror, but impractical (6/10) and less interactive.
13. **Exit Sign Noir (#9)** -- Atmospheric and beautiful but dark-only and less interactive.
14. **Municipal Safety Signage (#1)** -- Practical and distinctive but more utilitarian than artistic.
15. **Archival Operations Manual (#5)** -- Beautiful but cozy, not horror.
16. **The Catalog (#10)** -- Beautiful but "cozy library" not "liminal horror."
17. **Maintenance Terminal (#7)** -- Atmospheric but monospace readability issue; terminal themes are known territory.
18. **Fluorescent Hum (#2)** -- Deeply uncanny but too subtle for "over the top art project."

---

## Key Decision Points

1. **Primary mode: light or dark?** Several concepts are much stronger in one mode.
2. **How far to push interactivity?** Split-flap animations and scroll-reactive OSD are fun but complex.
3. **Single concept or hybrid?** The synthesis already proposed a hybrid -- do we want more ingredients from the freeform concepts?
4. **Worldbuilding commitment level?** Threshold Protocol and Memo from Nowhere go furthest with fictional worldbuilding. How much fictional framing do we want?
5. **Decay mechanic: yes or no?** Grid Collapse's depth-based corruption is unique but needs careful calibration.
6. **Which signature components survive?** Each concept has one; we can only realistically ship 2-3.
