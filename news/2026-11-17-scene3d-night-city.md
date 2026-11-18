---
title: "scene3d: sky, rain, lit windows and wet streets"
tag: scene3d
---
A round of features for scenes at night - in the software renderer and on the GPU alike.

- **Sky.** `obj.Background = true` makes an object part of the backdrop: a sky dome, stars, sun, moon and clouds are drawn first, in the order they were added, without depth and without fog. Everything else - glass, particles, rain - is drawn in front of them.
- **Emission maps.** `obj.EmissiveTexture` is a second texture whose colours the surface gives off by itself: lit windows at night, also in the shadow. `EmissiveStrength = 0` switches them off for the day.
- **Reflections.** `obj.Reflectivity` lets a surface mirror what is above it, in screen space with a fresnel: wet streets, puddles, a polished floor.
- **Rain.** `Emitter.Stretch` draws particles as soft streaks along the way they fly - rain, sparks, tracers.
- **Many lights.** `Light.Cutoff` gives a point light an end; the GPU sorts lights into tiles, so a street full of lamps stays fast. Fog and reflections now also run on the GPU.
- **Pixel art.** `texture.Filter` is `Bilinear`, `Nearest` or `Sharp` (hard pixels without shimmering at uneven sizes).

See [3D scenes](docs/graphics/3d.html) and [particles and effects](docs/graphics/effects.html).
