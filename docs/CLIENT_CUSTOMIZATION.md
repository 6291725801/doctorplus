# Client Customization Guide

## Customization Without Modifying Source Code

This platform is structured so any client clinic can be customized purely through database records and dashboard controls.

### 1. Changing Brand Identity & Theme
- **Clinic Name & Slug**: Configured in `Clinic` table.
- **Logo, Favicon & Brand Colors**: Configured in `SiteSettings` (`primaryColor`, `secondaryColor`, `accentColor`).
- **Typography & Theme**: Dynamic CSS variables loaded from `SiteSettings`.

### 2. Contact & Social Channels
- **Phone, WhatsApp & Email**: Configured in `SiteSettings`.
- **Address & Google Maps Embed**: Configured in `SiteSettings`.
- **Social Media Links**: Configured in `SiteSettings`.

### 3. Services & Consultation Fees
- Add or remove clinical offerings via the `Service` model.
- Configure duration and fee per service or per doctor.
- Advance booking fee can be set on doctor profiles or clinic settings.

### 4. Doctor Rosters & Clinic Hours
- Operating hours set in `ClinicSettings.openingTime` and `closingTime`.
- Individual working schedules managed in `DoctorSchedule`.
- Blocked holidays and leaves managed in `DoctorLeave`.
