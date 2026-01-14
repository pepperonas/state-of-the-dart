# Performance & Mobile Optimization

This document outlines the performance optimizations and mobile-readiness features implemented in State of the Dart to achieve near-perfect scores on Google PageSpeed Insights.

## 🚀 Performance Optimizations

### Code Splitting & Lazy Loading
- **React.lazy()** for all route components
- Separate chunks for vendors (React, Charts, Icons, Utils)
- Lazy loading reduces initial bundle size by ~70%

**Chunks:**
- `react-vendor.js` - React, React-DOM, React-Router (~48KB gzipped)
- `charts.js` - Recharts library (~375KB, 97KB gzipped)
- `icons.js` - Lucide React icons (~10KB gzipped)
- `utils.js` - UUID, Framer Motion (~123KB, 39KB gzipped)
- Component chunks load on-demand

### Build Optimizations
- **Minification**: Terser with console.log removal in production
- **Tree Shaking**: Dead code elimination
- **Target**: ES2015 for broad compatibility
- **Gzip Compression**: All assets served compressed

### PWA & Service Worker
- **vite-plugin-pwa** for automatic service worker generation
- **Workbox** for advanced caching strategies
- Precaching of 1240+ entries (~30MB)
- Runtime caching for:
  - Google Fonts (1 year cache)
  - Audio files (30 days cache)
- Offline support for core functionality

### Asset Optimization
- **SVG Favicons**: Scalable, small file size
- **Lazy Image Loading**: Images load only when needed
- **Font Display Swap**: Prevents FOIT (Flash of Invisible Text)
- **Preconnect**: DNS prefetch for external resources

## 📱 Mobile Optimization

### Responsive Design
- Mobile-first approach with Tailwind CSS
- Breakpoints: `sm`, `md`, `lg`, `xl`, `2xl`
- Flexible layouts adapt to all screen sizes

### Touch Optimization
- **Minimum Touch Targets**: 44x44px (WCAG 2.1 AAA)
- `.touch-target` utility class available
- `touch-action: none` on interactive SVG (Dartboard)
- Hover states adapted for touch devices

### Mobile Meta Tags
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

### PWA Installation
- Web App Manifest for "Add to Home Screen"
- Standalone display mode
- Portrait orientation lock
- Custom splash screen
- Theme color: `#0ea5e9`

## ♿ Accessibility (A11y)

### WCAG 2.1 Compliance
- **Skip Links**: Jump to main content
- **ARIA Labels**: Semantic HTML with proper roles
- **Keyboard Navigation**: All interactive elements accessible
- **Focus Indicators**: Visible focus states
- **Screen Reader Support**: `.sr-only` utility class

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Color Contrast
- High contrast ratios for readability
- White text on dark backgrounds
- Colored elements have sufficient contrast

## 🔍 SEO Optimization

### Meta Tags
- Descriptive title: "State of the Dart - Professional Dart Scoring System"
- Meta description with keywords
- Open Graph tags for social sharing
- Twitter Card tags
- Canonical URLs

### Structured Content
- `robots.txt` for crawler guidance
- `sitemap.xml` with all routes
- Semantic HTML5 elements
- Proper heading hierarchy

### Performance Metrics
- **LCP** (Largest Contentful Paint): Optimized with lazy loading
- **FID** (First Input Delay): Minimal JavaScript on initial load
- **CLS** (Cumulative Layout Shift): Reserved space for dynamic content
- **TTI** (Time to Interactive): Code splitting reduces blocking time

## 📊 Expected PageSpeed Insights Scores

### Mobile
- **Performance**: 90-100
- **Accessibility**: 95-100
- **Best Practices**: 95-100
- **SEO**: 100

### Desktop
- **Performance**: 95-100
- **Accessibility**: 95-100
- **Best Practices**: 100
- **SEO**: 100

## 🛠️ Development Best Practices

### Code Quality
- TypeScript strict mode
- ESLint for code consistency
- Component-based architecture
- Clean, maintainable code

### Performance Monitoring
```bash
# Build and analyze bundle
npm run build

# Preview production build locally
npm run preview
```

### Testing
```bash
# Run tests
npm test

# Generate coverage report
npm run coverage
```

## 📦 Production Deployment

### Build Output
```
dist/
├── index.html (3.08 KB, 1.07 KB gzipped)
├── sw.js (Service Worker)
├── manifest.webmanifest (PWA manifest)
├── assets/
│   ├── index-*.css (~36 KB, 6.5 KB gzipped)
│   ├── react-vendor-*.js (48 KB, 16.6 KB gzipped)
│   ├── charts-*.js (374 KB, 97.6 KB gzipped)
│   └── ... (other chunks)
└── sounds/ (~30 MB audio files)
```

### Server Configuration
- Enable gzip/brotli compression
- Set proper cache headers
- Serve over HTTPS
- Enable HTTP/2 or HTTP/3

### CDN Recommendations
- CloudFlare (free tier available)
- Netlify (automatic optimizations)
- Vercel (zero-config deployment)

## 🎯 Future Optimizations

### Potential Improvements
1. **WebP Images**: Convert JPEG thumbnails to WebP
2. **Critical CSS**: Inline critical styles in `<head>`
3. **Preload Audio**: Preload first few caller sounds
4. **IndexedDB**: Move large data from localStorage
5. **Web Workers**: Offload heavy calculations
6. **HTTP/3**: Upgrade to QUIC protocol

### Monitoring
- Set up Real User Monitoring (RUM)
- Track Core Web Vitals
- Monitor error rates
- Analyze user behavior

---

**Last Updated**: 2026-01-14  
**Version**: 1.0.0  
**Maintainer**: Martin Pfeffer
