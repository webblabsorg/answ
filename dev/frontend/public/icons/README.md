# PWA Icons

This directory should contain PWA icons in the following sizes:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## How to Generate Icons

You can use tools like:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator
- ImageMagick: `convert logo.png -resize 192x192 icon-192x192.png`

## Placeholder Icons

For development, you can create simple colored squares:

```bash
# Using ImageMagick
for size in 72 96 128 144 152 192 384 512; do
  convert -size ${size}x${size} xc:#4f46e5 icon-${size}x${size}.png
done
```

Or use this online tool: https://favicon.io/favicon-generator/
