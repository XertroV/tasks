// Audio Manifest for Terminal Horror Experience

export type AudioCue = {
  id: string;
  file: string; // Placeholder filename
  description: string;
  trigger: string;
  loop?: boolean;
  volume: number; // 0.0 to 1.0
};

export const audioCues: AudioCue[] = [
  {
    id: "ambient_hum",
    file: "server_room_hum_low.mp3",
    description: "Constant, low-frequency hum of server racks and cooling fans.",
    trigger: "On load (immediate)",
    loop: true,
    volume: 0.3,
  },
  {
    id: "typing_click",
    file: "mechanical_keyboard_click.mp3",
    description: "Sharp, tactile keyboard sound.",
    trigger: "On user typing in terminal",
    loop: false,
    volume: 0.8,
  },
  {
    id: "error_glitch",
    file: "digital_glitch_short.mp3",
    description: "Distorted, abrasive digital noise.",
    trigger: "On command error or invalid input",
    loop: false,
    volume: 0.6,
  },
  {
    id: "distant_scream",
    file: "muffled_scream_distant.mp3",
    description: "Very faint, muffled scream, barely audible.",
    trigger: "Random interval (30s - 120s) or after 5th command",
    loop: false,
    volume: 0.2,
  },
  {
    id: "breathing",
    file: "heavy_breathing_slow.mp3",
    description: "Slow, wet, raspy breathing sound directly behind the user.",
    trigger: "When user stops typing for > 10 seconds",
    loop: true,
    volume: 0.4,
  },
  {
    id: "heartbeat",
    file: "heartbeat_thump.mp3",
    description: "Rhythmic thumping sound, increasing in tempo.",
    trigger: "Progressive, starts slow after 'bl claim', speeds up with 'bl consume'",
    loop: true,
    volume: 0.5,
  },
  {
    id: "wet_squelch",
    file: "flesh_movement_wet.mp3",
    description: "Sound of wet biological matter moving/shifting.",
    trigger: "On page transition to 'Internals' or when wall texture pulses",
    loop: false,
    volume: 0.5,
  },
  {
    id: "whispers",
    file: "incoherent_whispers_layered.mp3",
    description: "Multiple voices whispering overlapping, unintelligible phrases.",
    trigger: "When user hovers over 'The Entity' or stares at 'bl consume' command",
    loop: true,
    volume: 0.3,
  },
];
