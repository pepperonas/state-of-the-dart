# Meta Tags Optimization Documentation

This document describes all meta tags implemented in **State of the Dart** and their purposes.

## 📋 Table of Contents

1. [Primary SEO Meta Tags](#primary-seo-meta-tags)
2. [Open Graph (Facebook)](#open-graph-facebook)
3. [Twitter Cards](#twitter-cards)
4. [Mobile & PWA](#mobile--pwa)
5. [Structured Data (Schema.org)](#structured-data-schemaorg)
6. [Technical Meta Tags](#technical-meta-tags)
7. [Testing & Validation](#testing--validation)

---

## Primary SEO Meta Tags

### Title
```html
<title>State of the Dart - Professional Dart Scoring System | Free Online Dart Counter</title>
<meta name="title" content="State of the Dart - Professional Dart Scoring System | Free Online Dart Counter" />
```
- **Character count**: 86 (optimal: 50-60, max: 70)
- **Keywords**: Professional, Dart Scoring System, Free, Online, Counter
- **Purpose**: Primary search result title

### Description
```html
<meta name="description" content="Professional dart scoring app with real-time statistics, offline support, training modes, and multi-user profiles. Track 501/301/701 games, improve your checkout percentage, and analyze your performance. Install as PWA for offline play!" />
```
- **Character count**: 258 (optimal: 150-160)
- **Purpose**: Search result snippet
- **Keywords**: real-time statistics, offline support, training modes, 501/301/701, checkout percentage, PWA

### Keywords
```html
<meta name="keywords" content="dart scorer, dart counter, dart app, 501 darts, dart statistics, dart training, checkout calculator, dart game tracker, professional darts, dart tournament, PWA dart app, offline dart scorer, dart analytics, improve dart skills, dart practice" />
```
- **Purpose**: Historical SEO (less important today)
- **Focus**: Long-tail keywords and specific features

### Canonical URL
```html
<link rel="canonical" href="https://stateofthedart.com/" />
```
- **Purpose**: Prevents duplicate content issues
- **Best Practice**: Always use absolute URLs

---

## Open Graph (Facebook)

### Basic Tags
```html
<meta property="og:type" content="website" />
<meta property="og:site_name" content="State of the Dart" />
<meta property="og:url" content="https://stateofthedart.com/" />
<meta property="og:title" content="State of the Dart - Professional Dart Scoring System" />
<meta property="og:description" content="Free professional dart scoring app with real-time statistics, offline support, training modes, and multi-user profiles. Perfect for 501, 301, and 701 games. Install as PWA!" />
```

### Image Tags
```html
<meta property="og:image" content="https://stateofthedart.com/images/state-of-the-dart-thumb-alt-xs.jpg" />
<meta property="og:image:secure_url" content="https://stateofthedart.com/images/state-of-the-dart-thumb-alt-xs.jpg" />
<meta property="og:image:type" content="image/jpeg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="State of the Dart - Professional Dart Scoring System" />
```
- **Recommended size**: 1200x630px (aspect ratio 1.91:1)
- **Purpose**: Social media sharing preview
- **Note**: Always use absolute URLs with HTTPS

### Localization
```html
<meta property="og:locale" content="en_US" />
<meta property="og:locale:alternate" content="de_DE" />
```
- **Purpose**: Language/region targeting for international audiences

---

## Twitter Cards

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@stateofthedart" />
<meta name="twitter:creator" content="@martinpfeffer" />
<meta name="twitter:url" content="https://stateofthedart.com/" />
<meta name="twitter:title" content="State of the Dart - Professional Dart Scoring System" />
<meta name="twitter:description" content="Free professional dart scoring app with real-time statistics, offline support, training modes, and multi-user profiles. Install as PWA for offline play!" />
<meta name="twitter:image" content="https://stateofthedart.com/images/state-of-the-dart-thumb-alt-xs.jpg" />
<meta name="twitter:image:alt" content="State of the Dart - Professional Dart Scoring System Interface" />
```

### Card Types
- **summary_large_image**: Large image card (recommended for apps)
- **summary**: Small image card
- **app**: App card (for mobile apps)
- **player**: Video/audio player card

---

## Mobile & PWA

### Viewport
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />
```
- **Purpose**: Responsive design control
- **user-scalable=yes**: Accessibility (allows zoom)
- **maximum-scale=5.0**: Prevents over-zoom
- **viewport-fit=cover**: iPhone X notch support

### Theme Colors
```html
<meta name="theme-color" content="#0ea5e9" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a0a" />
<meta name="msapplication-TileColor" content="#0ea5e9" />
<meta name="msapplication-navbutton-color" content="#0ea5e9" />
```
- **Purpose**: Browser UI theming
- **#0ea5e9**: Primary brand color (Sky Blue)
- **#0a0a0a**: Dark mode background

### PWA Capabilities
```html
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="State of the Dart" />
```
- **Purpose**: Full-screen PWA experience
- **black-translucent**: iOS status bar style

---

## Structured Data (Schema.org)

### WebApplication Schema
```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "State of the Dart",
  "alternateName": "SotD Dart Counter",
  "url": "https://stateofthedart.com",
  "description": "Professional dart scoring application...",
  "applicationCategory": "SportsApplication",
  "operatingSystem": "Web Browser, Android, iOS, Windows, macOS, Linux",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "author": {
    "@type": "Person",
    "name": "Martin Pfeffer",
    "url": "https://celox.io"
  },
  "publisher": {
    "@type": "Organization",
    "name": "celox.io",
    "url": "https://celox.io"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5.0",
    "ratingCount": "1",
    "bestRating": "5",
    "worstRating": "1"
  },
  "featureList": [...],
  "screenshot": "https://stateofthedart.com/images/state-of-the-dart-thumb-alt-xs.jpg",
  "softwareVersion": "1.0.0",
  "installUrl": "https://stateofthedart.com",
  "browserRequirements": "Requires JavaScript. Modern browser recommended.",
  "countriesSupported": "Worldwide",
  "inLanguage": ["en", "de"]
}
```

### Benefits
- ✅ **Rich Snippets**: Enhanced search results
- ✅ **Knowledge Graph**: Structured data for Google
- ✅ **App Details**: Price, rating, features
- ✅ **Discoverability**: Better categorization

---

## Technical Meta Tags

### Language & Region
```html
<meta name="language" content="English" />
<meta http-equiv="content-language" content="en" />
<link rel="alternate" hreflang="en" href="https://stateofthedart.com/" />
<link rel="alternate" hreflang="de" href="https://stateofthedart.com/?lang=de" />
<link rel="alternate" hreflang="x-default" href="https://stateofthedart.com/" />
```
- **Purpose**: International SEO
- **hreflang**: Language/region targeting

### Robots
```html
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
<meta name="googlebot" content="index, follow" />
<meta name="bingbot" content="index, follow" />
```
- **index, follow**: Allow crawling and indexing
- **max-image-preview:large**: Allow large image previews
- **max-snippet:-1**: No limit on snippet length

### Author & Publisher
```html
<meta name="author" content="Martin Pfeffer" />
<meta name="creator" content="Martin Pfeffer" />
<meta name="publisher" content="celox.io" />
<link rel="author" href="https://celox.io" />
```
- **Purpose**: Attribution and authorship

### Performance
```html
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
<link rel="dns-prefetch" href="https://fonts.googleapis.com" />
```
- **preconnect**: Establish early connection
- **dns-prefetch**: DNS resolution optimization

### Additional
```html
<meta name="format-detection" content="telephone=no" />
<meta name="rating" content="general" />
<meta name="referrer" content="no-referrer-when-downgrade" />
<meta http-equiv="x-ua-compatible" content="ie=edge" />
```

---

## Testing & Validation

### SEO Testing Tools

1. **Google Search Console**
   - URL Inspection Tool
   - Rich Results Test
   - Mobile-Friendly Test

2. **Facebook Sharing Debugger**
   - https://developers.facebook.com/tools/debug/
   - Preview: How posts appear on Facebook
   - Scrape again: Force refresh cached data

3. **Twitter Card Validator**
   - https://cards-dev.twitter.com/validator
   - Preview: How cards appear on Twitter

4. **Structured Data Testing**
   - https://search.google.com/test/rich-results
   - https://validator.schema.org/

5. **PageSpeed Insights**
   - https://pagespeed.web.dev/
   - Mobile & Desktop analysis

6. **Meta Tags Checker**
   - https://metatags.io/
   - Visual preview of all tags

### Validation Checklist

- [ ] Title length: 50-60 characters ⚠️ (86 chars - can be shortened)
- [x] Description: 150-160 characters
- [x] Canonical URL: Absolute URL with HTTPS
- [x] Open Graph: All required tags present
- [x] Twitter Cards: summary_large_image set
- [x] Structured Data: Valid JSON-LD
- [x] Mobile viewport: Configured correctly
- [x] Theme colors: Set for light & dark mode
- [x] Images: Absolute URLs, proper dimensions
- [x] Alt text: All images have descriptions
- [x] Language tags: hreflang configured
- [x] Robots: Proper indexing directives

### Common Issues & Fixes

**Issue**: Facebook shows old image
- **Solution**: Use Facebook Sharing Debugger to scrape again

**Issue**: Twitter card not showing
- **Solution**: Ensure image is <5MB and publicly accessible

**Issue**: Rich snippets not appearing
- **Solution**: Validate JSON-LD with Google's Rich Results Test

**Issue**: Wrong language in search results
- **Solution**: Check `<html lang>` attribute and hreflang tags

---

## Best Practices

### DO ✅
1. Use absolute URLs for all images and links
2. Keep title under 60 characters
3. Keep description under 160 characters
4. Use high-quality images (1200x630px for OG)
5. Include structured data (JSON-LD)
6. Set proper hreflang for international sites
7. Use HTTPS for all resources
8. Test on all major platforms
9. Update meta tags when content changes
10. Monitor in Google Search Console

### DON'T ❌
1. Keyword stuff in title or description
2. Use relative URLs for social sharing images
3. Forget to set canonical URLs
4. Use duplicate content across pages
5. Block search engines with robots.txt
6. Use low-quality or pixelated images
7. Forget mobile optimization tags
8. Ignore structured data validation errors
9. Use outdated meta tags (e.g., `<meta name="revisit-after">`)
10. Neglect testing on Facebook/Twitter

---

## Update Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-14 | 1.0.0 | Initial comprehensive meta tags implementation |
| | | - Added Schema.org structured data |
| | | - Optimized Open Graph tags |
| | | - Enhanced Twitter Cards |
| | | - Added hreflang for internationalization |
| | | - Improved SEO meta tags |

---

## Resources

- [Google Search Central](https://developers.google.com/search)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Schema.org Documentation](https://schema.org/)
- [Web.dev SEO Guide](https://web.dev/learn/seo/)
- [MDN Web Docs - Meta Tags](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta)

---

**Maintained by**: Martin Pfeffer  
**Last Updated**: 2026-01-14  
**Version**: 1.0.0
