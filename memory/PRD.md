# Matrimonial App - Product Requirements Document

## Original Problem Statement

Build a cross-platform (iOS/Android) matrimonial application using React Native and Expo with user auth, profile creation, home dashboard, like/shortlist/view, and modern gradient UI.

## Architecture

- **Frontend**: React Native + Expo (SDK 54), expo-router
- **Backend**: FastAPI + PyMongo (Motor async)
- **Database**: MongoDB
- **Auth**: JWT

## Design System

- Primary: #6366F1 → #8B5CF6 (Indigo/Purple)
- Accent: #EC4899 → #F43F5E (Pink/Rose)
- All screens now use gradient UI consistently

## What's Implemented

- [x] Backend API (auth, profiles, likes, shortlist, views)
- [x] JWT authentication + test credentials
- [x] Login & Register pages (gradient UI)
- [x] Home dashboard (Find Match, Likes, New Profiles, Viewed By)
- [x] Likes tab (gradient UI, Received/Sent)
- [x] Shortlist tab (gradient UI)
- [x] Profile tab (gradient UI, menu grid)
- [x] Profile Detail screen (gradient UI)
- [x] Profile Setup - ALL 5 Steps (gradient UI) - Apr 18, 2026
- [x] Advanced Search screen - REDESIGNED (gradient UI) - Apr 18, 2026
- [x] Bottom tab navigation fixed (safe area + indigo colors)
- [x] 422 profile update bug fixed
- [x] 10 demo profiles seeded

## Test Credentials

- Email: test@example.com | Password: test123

## Known Issues

- Date picker: `@react-native-community/datetimepicker` causes babel/web build conflicts. Using text input (DD/MM/YYYY) for DOB/time. Date picker works natively on Expo Go but breaks web preview.

## Backlog

### P1 - [ ] Search Results screen gradient UI redesign

### P2 - [ ] Share Biodata, Success Stories, Membership Plans

### P3 - [ ] Google OAuth, Digital Magazine
