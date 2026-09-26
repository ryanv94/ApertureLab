# 📷 ApertureLab Studio Suite

**ApertureLab** is a minimalist, high-performance, and privacy-focused web application designed for photographers and visual storytellers. Built entirely with client-side technology, it provides core optical tools, exposure calculations, EXIF image framing, client-side resizing, and panoramic carousel splitting without relying on server uploads or third-party tracking.

---

## ✨ Features & Tools

### 1. 🎯 Depth of Field (DoF) Visualizer
- **Dynamic Optical Physics Engine**: Calculates near focus limit, far focus limit, total depth of field, and hyperfocal distance.
- **Interactive SVG Optics Diagram**: Live visual diagram representing camera position, subject placement, focus distribution, and hyperfocal markers.
- **Sensor & Optic Presets**: Full Frame (35mm), APS-C (Sony/Nikon/Fuji & Canon), Micro Four Thirds (MFT), and Medium Format (Fuji GFX 44x33).

### 2. ⏱️ Exposure Triangle & ND Filter Calculator
- **Exposure Value (EV) Engine**: Dynamic calculations based on Shutter Speed, Aperture ($f$-stop), and ISO.
- **Stacked ND Light Loss Compensation**: Compute exposures with stacked Neutral Density filters up to 20 stops (`ND1000000`).
- **Circular Polarizer (CPL) Adjustment**: Toggle light-loss compensation ($+1.5\text{ stops}$).
- **Bulb Mode Countdown Timer**: Built-in countdown timer with progress tracking and audio notification on completion.

### 3. 📐 Client-Side Resize & Watermark
- **Browser-Only Processing**: Zero-server upload processing preserving privacy and speed.
- **Social Media & HD Presets**: Instagram Square, Instagram Portrait, 1080p Full HD, and 4K UHD presets.
- **Aspect Ratio Lock**: Automated proportional dimension recalculations.
- **Dynamic Text Overlay**: Custom text watermarks with position (Bottom-Right, Bottom-Left, Center) and color options.
- **Format & Quality Scaling**: Export to JPEG, PNG, or WebP with adjustable compression quality sliders.

### 4. 🖼️ Frame Photo with EXIF Telemetry
- **Automatic EXIF Parsing**: Powered by `ExifReader` to extract camera model, lens specifications, focal length, aperture, shutter speed, and ISO sensitivity.
- **Brand Logo Preloader**: Renders vector-accurate image logos for **Canon, Sony, Nikon, Fujifilm, Panasonic Lumix, Olympus, OM System, Leica, Pentax, Ricoh, Hasselblad, Apple, Google Pixel, Samsung, and DJI**.
- **Studio Mattes**: Pure White, Dark Slate, Deep Black, and Gallery Warm Studio White (`#F5F0E6`) with fine sepia border lines.
- **High-Contrast Typography**: Dual-tone 800/700 Inter & JetBrains Mono typography stack for clean camera telemetry rendering.

### 5. 🎞️ Carousel Panorama Splitter
- **Seamless Multi-Slide Crops**: Split ultra-wide panoramic photographs into 2 to 10 carousel slides.
- **Social Platform Aspect Ratios**:
  - Instagram Portrait ($4:5$)
  - Instagram Square ($1:1$)
  - Instagram Landscape ($1.91:1$)
  - TikTok Full Vertical ($9:16$)
  - Custom $W:H$ user ratios
- **Slide 1 Overview Cover Option**: Generates a cover slide showing the uncropped panorama centered within the target ratio before horizontal crops follow.
- **JSZip Batch Export**: Download all cropped slides + overview cover directly in a single `.ZIP` archive.

---

## 🔒 Privacy & Architecture

- **100% Client-Side Execution**: All image manipulation, canvas operations, metadata parsing, and archive generations occur entirely within your Web Browser's HTML5 Engine.
- **Zero Third-Party Image Uploads**: Photos are processed directly via browser memory (`HTMLCanvasElement` & Blob APIs).

---

## 🚀 Getting Started

Since **ApertureLab** is built as a single-file web application, deployment and usage are instantaneous:

### Local Usage
1. Clone or download the repository:
   ```bash
   git clone https://github.com/your-username/aperturelab.git
   ```
2. Open `index.html` directly in any modern browser (Chrome, Edge, Safari, Firefox).

### Single-File Deployment
Simply upload `index.html` to any web server, GitHub Pages, Netlify, Cloudflare Pages, or Vercel. No node server or backend build tools required.

---

## 🛠️ Built With

- **Framework**: Native HTML5, CSS3, JavaScript (ES6+)
- **Styling**: [Tailwind CSS CDN](https://tailwindcss.com/)
- **Icons**: [Font Awesome 6](https://fontawesome.com/)
- **Typography**: Inter & JetBrains Mono via Google Fonts
- **Metadata Parsing**: [ExifReader](https://github.com/mattiasw/ExifReader)
- **Batch Archiving**: [JSZip](https://stuk.github.io/jszip/)

---

## 📄 License

This project is licensed under the **MIT License**. Free for personal and commercial use by photographers and developers alike.