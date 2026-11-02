---
title: Circuits make sound
tag: Circuits
---
Circuits now talk to real sound devices: an AudioInput in the schematic records from a microphone or line-in, an AudioOutput is a loudspeaker. Put a drawn fuzz pedal between the two and play through it.

- The simulation runs in real time in a thread of its own, with a speed setting for slow motion or fast forward instead of steps per frame.
- Recording (`Audio.Input`) works on every platform layer.
- Circuits with non-linear parts like diodes and tubes simulate about 1.5x faster.
