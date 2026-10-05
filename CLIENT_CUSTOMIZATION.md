# Non-Developer Client Website Customization Guide

Welcome to the **AyurvedaCare Clinic Platform** administration manual.

This guide provides step-by-step instructions for non-technical clinic owners, administrators, and receptionists. **No coding or source-code modifications are required** to perform any of these operations. All changes made in the Admin Dashboard are saved directly to the database and reflect immediately on your live public website.

---

## Table of Contents

1. [Accessing the Admin Dashboard](#accessing-the-admin-dashboard)
2. [How to Change the Clinic Logo](#1-how-to-change-the-clinic-logo)
3. [How to Upload an Image](#2-how-to-upload-an-image)
4. [How to Replace the Homepage Hero Image](#3-how-to-replace-the-homepage-hero-image)
5. [How to Change Paragraphs and Headings](#4-how-to-change-paragraphs-and-headings)
6. [How to Add a New Medical Service](#5-how-to-add-a-new-medical-service)
7. [How to Add a New Doctor](#6-how-to-add-a-new-doctor)
8. [How to Change a Doctor's Photo](#7-how-to-change-a-doctors-photo)
9. [How to Change the Clinic Phone Number](#8-how-to-change-the-clinic-phone-number)
10. [How to Change the WhatsApp Inquiries Number](#9-how-to-change-the-whatsapp-inquiries-number)
11. [How to Change the Physical Clinic Address](#10-how-to-change-the-physical-clinic-address)
12. [How to Change Appointment Capacity & Operating Hours](#11-how-to-change-appointment-capacity--operating-hours)
13. [How to Change Consultation Fees](#12-how-to-change-consultation-fees)
14. [How to Change Advance Payment Requirements](#13-how-to-change-advance-payment-requirements)
15. [How to Change Theme Branding Colors](#14-how-to-change-theme-branding-colors)
16. [How to Change SEO Title, Meta Description & Social Links](#15-how-to-change-seo-title-meta-description--social-links)

---

## Accessing the Admin Dashboard

1. Open your browser and navigate to `/login` (e.g. `https://yourclinic.com/login`).
2. Log in using your **Clinic Administrator** or **Super Administrator** email and password.
3. You will be automatically redirected to `/dashboard/admin`.
4. The top navigation bar contains primary operational tabs:
   - `👨‍⚕️ Doctors`
   - `👥 Patients`
   - `📋 Appointments`
   - `📅 Schedules`
   - `🩺 Services`
   - `💳 Payments`
   - `📊 Reports`
   - `🎨 CMS & Branding`
   - `🔔 Notifications`

---

## 1. How to Change the Clinic Logo

1. In the top navigation bar, click **🎨 CMS & Branding**.
2. Click the **🎨 Theme & Colors** subtab.
3. Locate the **Clinic Logo URL** field.
4. You have two options:
   - **Option A (Choose from media)**: Click the **Pick** button next to the input, select an uploaded image from your Media Library, and click **Select Image**.
   - **Option B (Direct URL or Path)**: Paste the image URL directly into the field (e.g., `/logo.png` or `https://cdn.example.com/logo.png`).
5. Click the green **Save Theme Settings** button.
6. Open your homepage in a new tab; your new logo is now displayed in both the header and footer.

---

## 2. How to Upload an Image

1. Go to **🎨 CMS & Branding** > **🖼️ Media Assets** subtab.
2. Click **Open Media Uploader & Library**.
3. In the popup modal, click **Choose File** (or drag and drop your `.jpg`, `.png`, `.webp`, or `.svg` file).
4. Enter an optional **Title** and **Alt Text** (good for search engines).
5. Click **Upload Media Asset**.
6. Once uploaded, the image appears in your library grid with its file size, dimensions, and URL, ready to be attached to any page, hero section, or doctor profile.

---

## 3. How to Replace the Homepage Hero Image

1. Go to **🎨 CMS & Branding** > **🏠 Homepage Hero** subtab.
2. Locate the **Hero Banner Image** field.
3. Click the **Browse Media** button to select an image from your uploaded library, or type the file path/URL.
4. You will immediately see a live thumbnail in the **Image Preview** box below.
5. Click **Save Homepage Content**.
6. The public homepage hero section now renders your new image.

---

## 4. How to Change Paragraphs and Headings

### To edit the Homepage Hero headline & introduction:
1. Go to **🎨 CMS & Branding** > **🏠 Homepage Hero**.
2. Edit the text in **Hero Heading** (the large title).
3. Edit the text in **Hero Paragraph** (the descriptive introduction).
4. Edit the **Badge Tagline** (e.g. `"Certified Clinical Excellence"`).
5. Click **Save Homepage Content**.

### To edit the About Us story & healing philosophy:
1. Go to **🎨 CMS & Branding** > **📖 About Section** subtab.
2. Update **About Section Title** and **Mission Subtitle**.
3. Update the **Detailed Clinical Story & Healing Approach** in the text box.
4. Update the **Experience Highlight Badge** (e.g. `"15+ Years"`).
5. Click **Save About Content**. The changes automatically update on `/about`.

---

## 5. How to Add a New Medical Service

1. In the top navigation bar, click the **🩺 Services** tab.
2. Under **Add New Clinical Service**, enter:
   - **Service Name** (e.g., `"Panchakarma Detox Therapy"`)
   - **URL Slug** (e.g., `"panchakarma-detox"`)
   - **Consultation / Procedure Fee (₹)** (e.g., `1500`)
   - **Duration in Minutes** (e.g., `45`)
   - **Description** (details about indications, herbs used, and health benefits)
3. Click the **Create Service Offering** button.
4. The new service is immediately listed in the services catalog and becomes available in the online appointment booking wizard.

---

## 6. How to Add a New Doctor

1. Click the **👨‍⚕️ Doctors** tab.
2. Click the **+ Register New Doctor** button at the top right.
3. Fill in the practitioner details:
   - **Doctor Full Name** (e.g., `"Dr. Ramesh Vaidya"`)
   - **Email Address** (will serve as their secure login ID)
   - **Initial Login Password**
   - **Specialization** (e.g., `"Ayurvedic Panchakarma Specialist"`)
   - **Qualifications** (e.g., `"BAMS, MD (Ayurveda)"`)
   - **Years of Experience**
   - **Medical Registration Number** (AYUSH / Medical Council ID)
   - **Consultation Fee (₹)** (e.g., `600`)
   - **Advance Booking Deposit (₹)** (default: `100`)
   - **Slot Duration (Mins)** (e.g., `15` or `30`)
   - **OPD Room Number** (e.g., `"OPD Room 3"`)
   - **Languages Spoken** (e.g., `"English, Hindi, Kannada"`)
   - **Select Offered Clinical Services** (check the boxes corresponding to services they provide)
4. Click **Register Doctor**.
5. The doctor account is created and automatically provisioned with default weekly consultation slots.

---

## 7. How to Change a Doctor's Photo

1. Upload the doctor's portrait via **🎨 CMS & Branding** > **🖼️ Media Assets**.
2. Click the **👨‍⚕️ Doctors** tab.
3. Find the doctor in the list and click **Edit Profile**.
4. In the doctor photo field, click **Pick** to select the uploaded portrait.
5. Click **Save Changes**. The updated photograph appears on the homepage, doctors directory (`/doctors`), and appointment booking steps.

---

## 8. How to Change the Clinic Phone Number

1. Go to **🎨 CMS & Branding** > **🏥 Clinic Contacts** subtab.
2. Locate the **Contact Phone** field.
3. Enter your clinic's primary phone number (e.g., `"+91 98765 43210"`).
4. Click **Save Clinic Profile**.
5. The phone number updates across the website header, footer, contact page, and appointment confirmations.

---

## 9. How to Change the WhatsApp Inquiries Number

1. Go to **🎨 CMS & Branding** > **🏥 Clinic Contacts** subtab.
2. Locate the **WhatsApp Number (With Country Code)** field.
3. Enter your international phone format (e.g. `+919876543210` without hyphens or spaces).
4. Click **Save Clinic Profile**.
5. The "Chat on WhatsApp" floating actions and footer buttons will automatically direct patients to this WhatsApp number.

---

## 10. How to Change the Physical Clinic Address

1. Go to **🎨 CMS & Branding** > **🏥 Clinic Contacts** subtab.
2. In the **Clinic Physical Address** text area, type your full address including landmark, street, city, state, and postal code.
3. In the **Google Maps Embed URL** field, paste the `src` URL from Google Maps (see below).
4. Click **Save Clinic Profile**.

### How to get the Google Maps Embed URL:
1. Open [Google Maps](https://maps.google.com) and search for your clinic.
2. Click **Share** > **Embed a map**.
3. Copy only the URL inside the `src="..."` attribute (e.g., `https://www.google.com/maps/embed?pb=...`).
4. Paste it into the **Google Maps Embed URL** field in the admin dashboard and save.

---

## 11. How to Change Appointment Capacity & Operating Hours

1. Go to **🎨 CMS & Branding** > **⚙️ Rules & Fees** subtab.
2. You can configure:
   - **Daily Opening Time** (e.g. `09:00 AM`)
   - **Daily Closing Time** (e.g. `08:00 PM`)
   - **Default Slot Duration** (e.g. `15` or `30` minutes)
   - **Max Advance Booking Window** (e.g. `30` days ahead)
   - **Free Cancellation Cutoff** (e.g. `2` hours before appointment)
3. Click **Save Appointment Rules & Fees**.
4. The booking calendar automatically generates slots matching your operating window and enforces the capacity limits.

---

## 12. How to Change Consultation Fees

### To change a specific doctor's consultation fee:
1. Click the **👨‍⚕️ Doctors** tab.
2. Locate the doctor and click **Edit Profile**.
3. Under **Consultation Fee (₹)**, enter the updated amount (e.g. `750`).
4. Click **Save Changes**.

### To change a clinical service fee:
1. Click the **🩺 Services** tab.
2. Locate the service and edit the fee.
3. Click **Save Changes**.

---

## 13. How to Change Advance Payment Requirements

1. Go to **🎨 CMS & Branding** > **⚙️ Rules & Fees** subtab.
2. Under **Minimum Advance Deposit Required (₹)**, enter your required advance amount (e.g. `100` or `200`).
3. Toggle the **Enable Online Advance Payment Processing** checkbox to enable or disable instant digital payment gateways.
4. Click **Save Appointment Rules & Fees**.
5. During checkout, patients will be charged exactly this advance deposit, with the remaining balance due at reception upon arrival.

---

## 14. How to Change Theme Branding Colors

1. Go to **🎨 CMS & Branding** > **🎨 Theme & Colors** subtab.
2. You will see three color pickers:
   - **Primary Color**: Used for major booking buttons, active tabs, and primary highlights.
   - **Secondary Color**: Used for hover states and secondary elements.
   - **Accent Color**: Used for badges, notification dots, and special tags.
3. Click on any color box to open the visual color picker, or paste a Hex code (e.g. `#0D9488`).
4. Check the **Live Palette Preview** box to see how buttons and badges appear.
5. Click **Save Theme Settings**.
6. The entire website dynamically updates to your brand palette without rebuilding the application!

---

## 15. How to Change SEO Title, Meta Description & Social Links

1. Go to **🎨 CMS & Branding** > **🔍 SEO & Socials** subtab.
2. Configure search engine tags:
   - **Global Meta Description**: Enter a 150-160 character description of your clinic's services for Google search results.
   - **Open Graph (OG) Share Image**: Pick or paste the image that appears when your clinic website link is shared on WhatsApp, Facebook, or Twitter.
3. Configure your social links:
   - **Facebook Page URL**
   - **Instagram Profile URL**
   - **Twitter / X Profile URL**
   - **YouTube Channel URL**
   - **LinkedIn Profile URL**
4. Click **Save SEO & Social Settings**.
5. Search engines and social share previews will now present your branded clinic information.

---

## Summary of Client Isolation & Tenancy

- Each clinic operates with strict database-level tenancy.
- Data from **Clinic A** (patients, appointments, revenue, medical records) will **never appear** to users or administrators of **Clinic B**.
- Clinic administrators only have permissions for their designated clinic.
- Super administrators can oversee all clinic installations from the central management platform.
