# Domiciliary Care Provider Support Plan

## Overview
This plan extends Grace Companion to support domiciliary (home care) providers as a third provider type, alongside individuals/families and care facilities. The approach leverages approximately 70% of existing functionality while adding specialized features for home-based care delivery.

## Questions to Address First

1. Should domiciliary providers be able to serve both private pay clients and care facility residents who receive additional home support?

2. Do you want real-time GPS tracking of care workers during visits, or just check-in/check-out verification?

3. Should the system support rota optimization algorithms to automatically suggest efficient visit routes, or just manual scheduling?

---

## 1. Database Schema Extensions

- Extend the organization types enum to include domiciliary care categories (home care, visiting care, personal care)
- Create domiciliary-specific fields in the organizations table for service areas, travel radius, and provider qualifications
- Add service visit tracking table for logging home visits, visit types, and travel documentation
- Create route planning table for staff schedules with geographic assignments
- Add service location table to track multiple client home addresses
- Extend organization_residents to support clients living independently at home with service delivery addresses

## 2. Registration and Onboarding Adaptations

- Update organization registration flow to include domiciliary-specific options
- Add fields for CQC registration numbers, insurance certificates, and domiciliary-specific licenses
- Create service area mapping interface for defining geographical coverage
- Add staff vehicle and travel insurance tracking
- Configure visit frequency options per client during onboarding
- Set up mobile-first accessibility for field staff using personal devices

## 3. Visit Management System

- Build visit scheduling dashboard with geographic optimization
- Create visit check-in and check-out functionality with GPS verification
- Add travel time tracking between client visits
- Implement visit confirmation system with clients and family members
- Create visit notes and observation logging accessible from mobile devices
- Add photo documentation capability for care evidence during visits
- Build real-time visit status updates visible to office staff and families

## 4. Care Delivery Adaptations

- Reuse existing care plans system but adapt for home environment context
- Reuse medication reminders but add mobile administration tracking for visiting staff
- Extend care tasks to include visit-specific tasks like shopping assistance, meal preparation
- Add home safety assessment templates and checklists
- Create equipment tracking for devices left at client homes
- Reuse family portal with visit schedule visibility
- Adapt wellness checks for remote monitoring between visits

## 5. Staff Management for Field Workers

- Extend shift schedules to support traveling routes and visit assignments
- Add mileage tracking and expense management
- Create lone worker safety features including check-in requirements
- Build emergency escalation for field staff incidents
- Add mobile-optimized interfaces for all staff functions
- Implement offline mode capabilities for areas with poor connectivity
- Reuse care teams but allow multiple clients per staff member assignments

## 6. Compliance and Reporting

- Reuse audit logs system for visit documentation
- Add domiciliary-specific compliance reports for CQC requirements
- Create visit frequency compliance tracking and alerts
- Build travel documentation for billing and insurance
- Add safeguarding incident reporting specific to home environments
- Generate visit completion reports and missed visit alerts
- Reuse existing GDPR framework with home visit context

## 7. Billing and Payment Adaptations

- Add time-based billing calculations for visit duration
- Include travel cost calculations in billing
- Create itemized service billing per visit type
- Add invoice generation for private pay clients
- Support different payment models for local authority contracts
- Reuse subscription tier system but add domiciliary pricing tiers

## 8. User Experience Adjustments

- Create distinct dashboard for domiciliary providers focusing on route planning
- Build mobile-first visit management app for care workers
- Add client home profile pages with access instructions and home layout notes
- Implement communication hub for coordinating between office and field staff
- Reuse voice interface but add context for supporting clients at home
- Create family notification system for visit arrivals and completions

---

## Key Reusable Components

### Existing Systems to Leverage (70% reuse):
- Care plans system
- Family portal and messaging
- Medication tracking and reminders
- Audit logs and compliance framework
- User authentication and roles
- Grace voice assistant core
- GDPR and data lifecycle management
- Care teams structure
- Assessment tools
- MCA and DoLS frameworks (where applicable)

### New Systems Required (30% new):
- Visit scheduling and routing
- GPS check-in/check-out
- Mobile field worker interfaces
- Home location management
- Travel and mileage tracking
- Visit-specific billing
- Lone worker safety features
- Offline mobile capabilities

---

## Integration Approach

The domiciliary model fits as a third provider type in the existing architecture:

**Current Structure:**
1. Individuals & Families (home users with family support)
2. Care Facilities (residential care with staff management)

**Extended Structure:**
1. Individuals & Families (home users with family support)
2. Care Facilities (residential care with staff management)
3. **Domiciliary Providers (visiting care with field staff)**

All three share:
- Same user database and authentication
- Core Grace voice assistant
- Family portal functionality
- Care task and reminder systems
- Audit and compliance framework
- Medication management
- Document and photo sharing

---

## Implementation Priority

### Phase 1: Core Domiciliary Features
- Organization type extensions
- Visit scheduling basics
- Mobile check-in/check-out
- Client home profiles

### Phase 2: Field Staff Operations
- Route planning
- Mobile interfaces
- Offline capabilities
- Travel tracking

### Phase 3: Advanced Features
- GPS verification
- Route optimization
- Advanced billing
- Comprehensive reporting

---

## Technical Considerations

- Mobile-first design for field staff
- Offline-first architecture for poor connectivity areas
- GPS and location services integration
- Real-time notification system for visit updates
- Scalable routing algorithms for large provider networks
- HIPAA/GDPR compliance for home visit data
- Integration with existing Supabase schema

---

**Status:** Planning phase - awaiting clarification on the three questions above before implementation.

**Created:** 2024
**Last Updated:** 2024
