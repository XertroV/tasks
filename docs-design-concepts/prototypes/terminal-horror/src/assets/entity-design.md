# Entity Design: "The Admin"

## Concept
The Entity, known internally as "The Admin," is a manifestation of the system's overgrowth. It is not a monster in the traditional sense, but a biological accumulation of technological debt. It represents the neglected backlog, the tasks that were never completed, the bugs that were marked "wontfix."

## Visual Description
When the user turns around, they see a floating, pulsating mass in the center of the dark server room.

*   **Core:** A beating heart made of tangled server cables (CAT6, power cables, fiber optics) woven together into a spherical, fleshy organ. It pulses with a sickly red light (status LED red).
*   **Limbs:** Dozens of loose cables hang from it like tentacles, twitching and seeking connection ports. Some end in standard connectors (RJ45, USB), others end in organic, bone-like spikes.
*   **Face:** There is no face, only a cluster of glowing white status lights that resemble eyes in the darkness. They blink in asynchronous patterns, watching the user.
*   **Atmosphere:** The air around it shimmers with heat (server exhaust).
*   **Movement:** It hovers silently, drifting slightly. The cables writhe like worms. When the user interacts with the terminal (completes a task), the Entity spasms, as if in pain or pleasure.

## Behavior
*   **Idle:** Hovers, watches. Breathing sound (fan noise mixed with lungs).
*   **Aggressive:** When the user tries to leave or stops working, the cables extend towards the camera. The red light intensifies.
*   **Submission:** When the user completes tasks rapidly, the Entity recedes, the lights turn green for a moment.

## Technical Implementation (R3F)
The Entity is composed of:
1.  **InstancedMesh** for the cables (using a curve modifier or simple cylinder segments).
2.  **PointLight** inside the core for the heartbeat effect.
3.  **ShaderMaterial** on the cables to make them look slick/wet.

See `src/components/TheEntity.tsx` for the component implementation.
