# CMS & Content Management System

## CMS-First Design Philosophy

The public clinic website never hardcodes marketing content inside React components. All text, banners, FAQs, doctor profiles, services, testimonials, and SEO tags are stored in PostgreSQL and rendered dynamically.

## 1. CMS Data Models

- **`SiteSettings`**: Global branding (title, tagline, primary color, secondary color, accent color, logo, favicon, address, phone, WhatsApp number, social media links).
- **`Page`**: Top-level routes (`home`, `about`, `services`, `doctors`, `contact`, `privacy-policy`, `terms`).
- **`PageSection`**: Composable blocks within each page (`HERO`, `ABOUT`, `SERVICES`, `DOCTORS`, `TESTIMONIALS`, `FAQ`, `CTA`, `CUSTOM`).
- **`MediaAsset`**: Media items stored with metadata, alt text, MIME types, and storage keys.

## 2. White-Label Customization Workflow

A clinic owner or content manager can perform the following directly from the Admin Dashboard:

1. **Change Homepage Hero**: Edit the `PageSection` with type `HERO`.
2. **Update Contact Information**: Update phone and WhatsApp in `SiteSettings`.
3. **Change Clinic Colors**: Update the primary/secondary hex color in `SiteSettings`.
4. **Publish New Service**: Add a new `Service` record with fee, description, and duration.
5. **Manage Media**: Upload images into the `MediaAsset` repository; binaries are saved via object storage abstraction.
