# colorkit

Colour mixing and palettes in pure fire - no natives, so it works in the VM and in every native build.

```fire
#import "colorkit"
print(ColorKit.Rgb.Mix(10, 30))   // 20
```

It uses [mathkit](https://what3var.github.io/packages/mathkit.html) for the colour distances.
