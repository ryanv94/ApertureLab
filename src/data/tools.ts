export type ToolMeta = { slug: string; frame: string; name: string; short: string; blurb: string };

export const tools: ToolMeta[] = [
  { slug: 'dof-visualizer', frame: '01', name: 'Depth of Field', short: 'DoF', blurb: 'Near and far limits, hyperfocal distance and a to-scale focus diagram.' },
  { slug: 'exposure-calculator', frame: '02', name: 'Exposure & ND', short: 'Exposure', blurb: 'Stack ND filters, reciprocate settings and run a bulb timer.' },
  { slug: 'resize-watermark', frame: '03', name: 'Resize & Watermark', short: 'Resize', blurb: 'Social presets, crops, text or logo watermarks, batch export.' },
  { slug: 'exif-frame', frame: '04', name: 'EXIF Frame', short: 'Frame', blurb: 'Gallery mattes captioned with your camera, lens and settings.' },
  { slug: 'panorama-splitter', frame: '05', name: 'Panorama Splitter', short: 'Pano', blurb: 'Slice wide shots into a seamless swipeable carousel.' },
  { slug: 'color-palette', frame: '06', name: 'Colour Palette', short: 'Palette', blurb: 'Extract the dominant colours and read the histogram.' },
  { slug: 'golden-hour', frame: '07', name: 'Golden Hour', short: 'Light', blurb: 'Golden and blue hour for any place and date.' },
  { slug: 'print-visualizer', frame: '08', name: 'Print DPI', short: 'Print', blurb: 'How big can it print? Every size, rated and cropped.' },
  { slug: 'selphy-layout', frame: '09', name: 'SELPHY Magnets', short: 'SELPHY', blurb: 'Two 45×70 mm magnets on one 4×6 sheet, calibrated with cut marks.' },
  { slug: 'collage', frame: '10', name: 'Collage', short: 'Collage', blurb: 'Arrange 6–10 photos into a balanced, print-ready composition.' },
];

export const PRIVACY =
  'Your photos are processed entirely on your device and are never uploaded. We use anonymous analytics to improve the site.';
