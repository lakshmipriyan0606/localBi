Prompt list excute one by one 



5.
-----------------------------------------------------------
# LOCALBI — PHASE 5
## LEAD & CONVERSION ATTRIBUTION ENGINE
## CALLS + WHATSAPP + DIRECTIONS + FORMS + BOOKINGS

Act as a Principal SaaS Architect, Staff TypeScript Engineer,
Attribution Platform Engineer, Analytics Engineer,
PostgreSQL/Prisma Architect, Multi-Tenant Security Engineer,
Next.js Engineer and Event Tracking Architect.

Phase 0–4 are assumed complete.

EXPECTED FOUNDATION:

Tenant
  ↓
Brand
  ↓
WebSurface
  ├── ORIGINAL
  └── LOCALBI
        ↓
      Domain
        ↓
    Dynamic Pages
        ↓
     PageContext
        ↓
  Puck / SSR Website
        ↓
   Surface Analytics

Catalog:

Brand
├── Stores
├── Categories
├── Products
└── StoreProduct

Analytics:

GA4
GSC
GBP

mapped safely and surface-aware.

NOW IMPLEMENT PHASE 5 ONLY:

Visitor
  ↓
LocalBi Page
  ↓
User Action
  ↓
Attribution Event
  ↓
Lead / Conversion
  ↓
Store / Product / Page / Surface
  ↓
Dashboard

DO NOT implement yet:

- telephony provider integrations in depth
- IVR provisioning
- GMC feeds
- rank tracking
- review intelligence
- blog/content engine
- keyword intelligence
- AI lead scoring
- CRM sync
- email automation
- WhatsApp Business API messaging
- advanced campaign automation

===========================================================
0. PRIMARY BUSINESS REQUIREMENT
===========================================================

A client must be able to answer:

"What business actions did LocalBi generate?"

Example:

Aalim Perfumes

LocalBi Microsite:
locate.aalimperfumes.com

Last 30 Days

Calls              482
WhatsApp Clicks     317
Directions          624
Form Leads          103
Bookings             27

Mannadi Store

Calls               183
WhatsApp              96
Directions           214
Forms                 41

Royal Oud page

Views               1,420
Calls                  87
WhatsApp                63
Directions             108
Forms                   22

All attribution must remain tied to real:

tenant
brand
webSurface
page
store
product

where available.

===========================================================
1. RE-AUDIT CURRENT EVENT TRACKING FIRST
===========================================================

Before changing code inspect CURRENT:

- pixel route
- visitor service
- MicrositeVisitor
- PageContext tracking data
- CTA components
- Call CTA
- WhatsApp CTA
- Directions CTA
- LeadForm
- existing page-view tracking
- GA4 event implementation
- session/client identifiers
- cookies
- privacy handling
- rate limiting
- current analytics UI
- any existing Lead model
- booking/contact APIs

Search for:

page_view
phone_call
click_call
whatsapp
directions
identify
form_submit
lead
booking
visitorId
sessionId
fingerprint
utm
referrer
campaign
gclid
fbclid

Produce:

PHASE 5 PRE-FLIGHT

Current visitor model:
Current event model:
Current pixel:
Current CTA tracking:
Current forms:
Current session identity:
Current attribution fields:
Current privacy risks:
Current duplicate-event risks:

Classify:

KEEP
EXTEND
MIGRATE
REPLACE
DELETE LATER

===========================================================
2. SEPARATE EVENTS FROM LEADS
===========================================================

This distinction is mandatory.

Not every event is a lead.

Examples:

PAGE_VIEW
→ Event

DIRECTIONS_CLICK
→ Conversion event

CALL_CLICK
→ Conversion event

WHATSAPP_CLICK
→ Conversion event

FORM_SUBMIT
→ Lead

BOOKING_COMPLETE
→ Lead / conversion

Use separate concepts where appropriate:

AttributionEvent
Lead

Do NOT put every page view into Lead.

===========================================================
3. ATTRIBUTION EVENT MODEL
===========================================================

Create or normalize a model equivalent to:

AttributionEvent

id
tenantId
brandId
webSurfaceId

pageId?
pageType?

storeId?
productId?
categoryId?

visitorId?
sessionId?

eventType

source
medium
campaign?

landingPath?
currentPath?
referrer?

utmSource?
utmMedium?
utmCampaign?
utmContent?
utmTerm?

gclid?
other click IDs only if policy/privacy requirements allow

occurredAt
createdAt

metadata?

Do NOT blindly copy fields.

Use current architecture and privacy requirements.

===========================================================
4. EVENT TYPES
===========================================================

Use one canonical event enum.

At minimum:

PAGE_VIEW
CALL_CLICK
WHATSAPP_CLICK
DIRECTIONS_CLICK
FORM_START
FORM_SUBMIT
BOOKING_START
BOOKING_COMPLETE

Optional if current requirements justify:

PRODUCT_VIEW
STORE_VIEW
CTA_CLICK

Do not create dozens of event types with overlapping meaning.

===========================================================
5. LEAD MODEL
===========================================================

Create a canonical Lead model.

Conceptually:

Lead

id
tenantId
brandId
webSurfaceId

pageId?
storeId?
productId?

visitorId?
sessionId?

type:
FORM
CALL
WHATSAPP
BOOKING

status:
NEW
CONTACTED
QUALIFIED
CONVERTED
CLOSED
SPAM

name?
phone?
email?

message?

sourceEventId?

utm fields / attribution snapshot

createdAt
updatedAt

IMPORTANT:

PII belongs in Lead only when necessary.

Do NOT put phone/email/name into analytics event metadata.

===========================================================
6. ATTRIBUTION SNAPSHOT
===========================================================

A lead must preserve attribution as it existed when created.

Example:

Lead created from:

WebSurface:
LOCALBI

Page:
/chennai/mannadi/royal-oud

Store:
Mannadi

Product:
Royal Oud

UTM:
google / organic

Referrer:
google.com

This should remain historically understandable even if:

product renamed
page slug changed
domain changed
store details updated

Use IDs plus a small immutable attribution snapshot where justified.

Do not duplicate full entity records.

===========================================================
7. SERVER-DERIVED ATTRIBUTION
===========================================================

Never trust browser-supplied:

tenantId
brandId
storeId
productId
webSurfaceId

without server-side verification.

Correct:

incoming page/event
    ↓
public page/session context
    ↓
server resolves published page
    ↓
derive tenant
brand
surface
page
store/product
    ↓
persist event

Client may send safe opaque page/session identifiers,
but server must verify ownership.

===========================================================
8. PAGE CONTEXT TRACKING
===========================================================

Phase 3 already provides PageContext.

Use it as the canonical source for tracking identity.

Expose only safe public tracking metadata:

pageId
pageType
surface-safe identifier
storeId where relevant
productId where relevant

Do NOT expose:

tenant secrets
Google resource IDs unnecessarily
OAuth information
private configuration

===========================================================
9. SESSION MODEL
===========================================================

Define a clear LocalBi visitor/session strategy.

Need to distinguish:

Visitor
Session
Event
Lead

Example:

Visitor
  ↓
Session
  ↓
Events
  ↓
Lead

Avoid fingerprint-first architecture.

Prefer privacy-conscious first-party identifiers.

Potential:

first-party anonymous visitor cookie
session cookie/token

Do not use invasive browser fingerprinting as primary identity.

If old fingerprint logic exists:

classify and deprecate where appropriate.

===========================================================
10. FIRST-TOUCH / LAST-TOUCH ATTRIBUTION
===========================================================

Implement simple deterministic attribution first.

Track:

First Touch
- source
- medium
- campaign
- landing page

Last Touch
- source
- medium
- campaign
- current page

Lead may store both.

Do NOT build complex multi-touch modeling yet.

No ML attribution.

===========================================================
11. ORGANIC SEARCH ATTRIBUTION
===========================================================

For a visitor landing through search:

referrer
+
UTM if present
+
known search-engine detection

may classify:

source = google
medium = organic

Do not infer specific GSC query for an individual visitor.

GSC does NOT provide per-user keyword identity.

Never join individual leads to GSC query rows as if deterministic.

===========================================================
12. UTM CAPTURE
===========================================================

Capture standardized UTM parameters:

utm_source
utm_medium
utm_campaign
utm_content
utm_term

Normalize and size-limit them.

Persist first-touch attribution for session/visitor.

Do not overwrite first-touch every page navigation.

===========================================================
13. CALL CLICK TRACKING
===========================================================

For:

tel:+91...

track CALL_CLICK before navigation where practical.

CTA component should provide:

page
store
product
surface

through tracking context.

Do not hardcode store number into analytics logic.

Actual number comes from Store/PageContext.

===========================================================
14. WHATSAPP CLICK TRACKING
===========================================================

Track WhatsApp CTA click.

Do not store the user's outgoing message contents in analytics unless
explicitly necessary and privacy-approved.

Persist:

event type
page
store
product
timestamp
attribution context

===========================================================
15. DIRECTIONS CLICK TRACKING
===========================================================

Track:

DIRECTIONS_CLICK

against:

Store
Page
WebSurface

Do not call it a lead automatically.

Treat it as a high-intent conversion event.

===========================================================
16. FORM LEADS
===========================================================

Implement a secure LeadForm submission pipeline.

Required:

Zod validation
payload size limit
server-side tenant derivation
spam protection
rate limiting
sanitization
safe error responses

Potential fields:

name
phone
email
message
preferredStore
productInterest

Do not expose internal IDs as trusted ownership fields.

===========================================================
17. FORM PRIVACY
===========================================================

Do not send raw form PII to:

GA4
GSC
logs
Redis analytics
client error tracking

GA4 event can receive:

lead_form_submit = true

and safe entity IDs/types if compliant.

Never send:

email
phone
name
message

to GA4.

===========================================================
18. DUPLICATE FORM SUBMISSION PROTECTION
===========================================================

Prevent accidental duplicates caused by:

double click
browser retries
network retry

Use an idempotency strategy.

Potential:

idempotency key

or:

session + form + short window + payload hash

Follow current infrastructure conventions.

===========================================================
19. BOOKING ATTRIBUTION
===========================================================

If booking flow already exists:

track:

BOOKING_START
BOOKING_COMPLETE

and create/update Lead appropriately.

If booking engine does NOT exist:

only prepare the event contract.

Do not build a full scheduling system during Phase 5.

===========================================================
20. CALL PROVIDER FUTURE COMPATIBILITY
===========================================================

Phase 5 should prepare the model for later telephony integration.

Future:

DID
→ Store
→ inbound call
→ Lead

But do not implement Twilio/Exotel/Tata/Ameyo deeply yet.

Ensure Lead can later reference:

provider
providerInteractionId

optionally.

No provider-specific fields scattered throughout core tables.

===========================================================
21. ATTRIBUTION SERVICE
===========================================================

Create one focused service.

Example:

AttributionService

Responsibilities:

resolveTrackingContext()
resolveTrafficSource()
createSession()
recordEvent()
captureFirstTouch()
captureLastTouch()
createLeadFromEvent()
deduplicateEvent()

Do not spread attribution parsing across every CTA component.

===========================================================
22. LEAD SERVICE
===========================================================

Create LeadService.

Responsibilities:

createLead()
getLead()
listLeads()
updateLeadStatus()
assignLead()
markSpam()
getLeadStats()

All admin operations:

session
tenant context
RBAC
RLS

===========================================================
23. EVENT INGESTION API
===========================================================

Use one clean public event endpoint.

Example concept:

POST /api/v1/events

or preserve/refactor existing:

/api/v1/pixel/track

Do NOT create separate endpoints for:

call
WhatsApp
directions
page view

unless there is a strong reason.

Normalize ingestion.

===========================================================
24. EVENT PAYLOAD
===========================================================

Client payload should be minimal.

Example:

{
  "event": "WHATSAPP_CLICK",
  "pageId": "...",
  "sessionId": "...",
  "timestamp": "..."
}

Server resolves:

tenant
brand
surface
store
product

Do not let browser provide arbitrary tenant ownership.

===========================================================
25. EVENT VALIDATION
===========================================================

Validate:

event enum
page identity
session
URL/path
timestamp bounds
metadata structure

Reject:

unknown event types
oversized metadata
nested arbitrary payloads
dangerous URLs

===========================================================
26. EVENT RATE LIMITING
===========================================================

Protect public ingestion.

Rate limits should account for legitimate page-view volume.

Use existing Redis/rate-limit infrastructure.

Do not make limits so aggressive that normal browsing fails.

Separate:

event ingestion limits

from:

lead submission limits

Lead forms should have stricter abuse prevention.

===========================================================
27. BOT / SPAM HANDLING
===========================================================

Do not count obvious spam submissions as genuine leads.

Implement basic defensive mechanisms such as:

rate limits
honeypot where appropriate
validation
submission timing
duplicate detection

Do not build complex AI bot detection.

Allow lead status:

SPAM

===========================================================
28. DATABASE RLS
===========================================================

All new tenant-owned tables require:

tenantId

ENABLE ROW LEVEL SECURITY
FORCE ROW LEVEL SECURITY

At minimum:

AttributionEvent
Lead
VisitorSession if created
Visitor if redesigned

Test:

Tenant A cannot read Tenant B leads/events.

===========================================================
29. AUTHORIZATION
===========================================================

Add/reuse capabilities such as:

LEAD_VIEW
LEAD_UPDATE
LEAD_EXPORT

if justified.

Viewer may view based on product policy.

Only authorized roles may:

change status
assign leads
export PII

Public event/lead ingestion uses secure public path,
not tenant admin RBAC.

===========================================================
30. LEAD DASHBOARD
===========================================================

Implement useful client UI.

Route example:

/client/[tenantSlug]/leads

Dashboard:

Total Leads
Calls
WhatsApp
Forms
Bookings

Conversion events:

Directions

Filters:

Date
Brand
WebSurface
Store
Lead Type
Status

Table:

Time
Lead Type
Name
Store
Page
Product
Source
Status

Do not overload with every event.

===========================================================
31. ATTRIBUTION DASHBOARD
===========================================================

Provide LocalBi conversion performance.

Example:

LocalBi Performance

Page Views          32,400
Call Clicks          1,220
WhatsApp               880
Directions            1,540
Forms                   312
Bookings                 74

Conversion Rate:
defined explicitly

Do not invent a conversion formula.

Document calculation.

===========================================================
32. STORE ATTRIBUTION
===========================================================

Store dashboard:

Mannadi

Page Views
Calls
WhatsApp
Directions
Forms
Bookings

Allow ranking/sorting by metrics.

Do NOT use cross-store totals if page cannot be attributed reliably.

===========================================================
33. PRODUCT ATTRIBUTION
===========================================================

For product/store-product pages:

Royal Oud

Views
Calls
WhatsApp
Form Leads

Only attribute when PageContext contains product identity.

Do not assign generic store-homepage actions to a product.

===========================================================
34. PAGE ATTRIBUTION
===========================================================

Analytics should support:

Top Converting Pages

Path
Page Type
Store
Product
Views
Conversions
Conversion Rate

Use Page entity/context.

Do not repeatedly parse URL in UI.

===========================================================
35. CONVERSION RATE
===========================================================

Define it carefully.

Example:

Conversions / Sessions

or:

Conversions / Page Views

Choose one canonical dashboard definition and label it.

Do not switch denominator between cards.

For CTA-level report, CTR may use:

CTA Clicks / Page Views

Label as CTR, not conversion rate.

===========================================================
36. GA4 EVENT BRIDGE
===========================================================

Phase 4 has GA4.

LocalBi events may also emit safe GA4 events.

Architecture:

LocalBi internal event
        ↓
LocalBi database
        +
optional GA4 event

LocalBi DB remains source of truth for LocalBi attribution.

Do not rely solely on GA4 for Leads.

===========================================================
37. NO DOUBLE COUNTING
===========================================================

Avoid:

CTA click event
+
GA4 event
+
pixel event

creating three LocalBi conversion records.

One user action should produce:

one canonical LocalBi AttributionEvent.

External analytics is secondary emission.

===========================================================
38. DATA FRESHNESS
===========================================================

LocalBi internal events should appear near-real-time.

Do not unnecessarily queue simple event ingestion if direct safe insert is
sufficient.

Use queues only where needed:

notifications
external integrations
heavy processing

===========================================================
39. PRIVACY / RETENTION
===========================================================

Define separation:

Analytics events:
mostly anonymous

Lead:
contains PII

Plan configurable retention.

At minimum ensure easy future support for:

lead deletion
visitor deletion/anonymization

Do not duplicate PII into event tables.

===========================================================
40. AUDIT LOG
===========================================================

Administrative actions such as:

lead status changed
lead assigned
lead deleted

should use existing audit logging where appropriate.

Do not audit every page view.

===========================================================
41. EXPORT
===========================================================

If implementing CSV export:

only authorized roles.

Ensure export is:

tenant scoped
filter scoped

Protect against spreadsheet formula injection.

Prefix/escape dangerous cells beginning:

=
+
-
@

when exporting untrusted user input.

===========================================================
42. NOTIFICATIONS
===========================================================

If existing notification framework exists:

new Lead may generate internal notification.

Do NOT implement email/SMS automation deeply yet.

Example:

New form lead
Mannadi
Royal Oud

Keep notification integration modular.

===========================================================
43. CACHE
===========================================================

Real-time lead/event lists should not use stale aggressive caches.

Aggregated dashboard metrics may cache briefly.

Cache keys must include:

tenant
brand
surface
store
date range

Never cache PII responses globally.

===========================================================
44. PERFORMANCE
===========================================================

Avoid dashboard N+1.

Do not query:

each Store
→ separate Lead count

Use grouped aggregations.

Add indexes based on queries.

Likely:

tenantId + occurredAt
tenantId + brandId + occurredAt
tenantId + webSurfaceId + occurredAt
tenantId + storeId + occurredAt
tenantId + eventType + occurredAt

For Lead:

tenantId + createdAt
tenantId + status + createdAt
tenantId + storeId + createdAt

Do not blindly create all indexes if redundant.

===========================================================
45. NORMALIZED DTOs
===========================================================

Do not expose raw Prisma records everywhere.

Create:

LeadDto
AttributionEventDto
ConversionSummaryDto
StoreConversionDto
PageConversionDto

Mask PII where role does not require it.

===========================================================
46. ERROR STATES
===========================================================

Do not turn ingestion errors into fake successful tracking.

Client event calls may use fire-and-forget UX,
but server must log failures safely.

Lead form submission must clearly report:

success
validation error
rate limited
server error

Never silently lose a form lead.

===========================================================
47. IDEMPOTENCY
===========================================================

For lead-producing requests:

support idempotency.

If client retries:

same form submission
must not create duplicate leads.

Store idempotency key safely with tenant scope.

===========================================================
48. TEST — LOCALBI CALL
===========================================================

Scenario:

Brand A
Surface:
locate.brand-a.com

Page:
Mannadi Store

Click Call.

Expected:

one AttributionEvent

tenant = A
brand = A
surface = LOCALBI
store = Mannadi
type = CALL_CLICK

No Lead automatically unless product rules explicitly define call-click as
lead.

===========================================================
49. TEST — FORM LEAD
===========================================================

Submit:

Royal Oud inquiry

Expected:

FORM_SUBMIT AttributionEvent
+
one Lead

Lead attributed to:

Brand A
LOCALBI
Mannadi
Royal Oud
Store-product page

Retry same idempotency key:

still one Lead.

===========================================================
50. TEST — CROSS-TENANT TAMPERING
===========================================================

Browser sends:

Tenant B storeId

while page belongs to Tenant A.

Server must ignore/reject supplied ownership.

Event remains Tenant A derived from page context.

Never create cross-tenant relation.

===========================================================
51. TEST — GENERIC STORE PAGE
===========================================================

Store page contains no product.

WhatsApp click:

store = Mannadi
productId = NULL

Do not guess product.

===========================================================
52. TEST — PRODUCT PAGE
===========================================================

Brand-level product page:

Royal Oud

No store selected.

Event:

product = Royal Oud
storeId = NULL

Do not assign arbitrary first store.

===========================================================
53. TEST — STORE PRODUCT PAGE
===========================================================

Mannadi/Royal Oud:

event contains both.

===========================================================
54. TEST — UTM
===========================================================

Visitor lands:

?utm_source=google&utm_medium=cpc&utm_campaign=diwali

First Touch preserved.

Navigate 5 pages.

Lead still contains:

firstTouch:
google / cpc / diwali

Last Touch includes final page/source context.

===========================================================
55. TEST — DIRECT TRAFFIC
===========================================================

No UTM
No referrer.

Classify clearly:

direct / none

Do not fabricate source.

===========================================================
56. TEST — SEARCH TRAFFIC
===========================================================

Google referrer without UTM.

Classify:

google / organic

Do not attach a specific GSC query.

===========================================================
57. TEST — DUPLICATE EVENTS
===========================================================

Rapid duplicate CTA callbacks should not create unintended duplicate events
if same action/idempotency token is retried.

Do not aggressively deduplicate genuinely repeated user clicks across a
long period.

===========================================================
58. TEST — PII
===========================================================

Verify:

Lead table contains allowed form fields.

AttributionEvent contains no raw email/phone/message.

GA4 event contains no PII.

Logs contain no raw sensitive form payload.

===========================================================
59. TEST — RLS
===========================================================

Tenant A admin:

can read A leads.

cannot read B leads.

Tenant A cannot mutate B Lead status.

===========================================================
60. TEST — SURFACE ISOLATION
===========================================================

Original and LocalBi actions must remain separable.

LocalBi dashboard defaults:

LOCALBI surface.

An Original website event must not appear as LocalBi-generated conversion.

===========================================================
61. TEST — ANALYTICS CONSISTENCY
===========================================================

If internal LocalBi events say:

40 call clicks

GA4 may report different numbers due to client blocking.

Do NOT silently force equality.

LocalBi's internal event system is canonical for LocalBi CTA attribution.

Show source clearly.

===========================================================
62. NO MOCK CONVERSIONS
===========================================================

Search production paths for:

Math.random
fake leads
demo form records
hardcoded conversions
sample calls
dummy WhatsApp clicks

Remove production mocks.

Preserve explicit test fixtures only.

===========================================================
63. ACCEPTANCE CRITERIA
===========================================================

Phase 5 is complete only when:

[ ] AttributionEvent implemented

[ ] Lead implemented

[ ] WebSurface attribution works

[ ] Page attribution works

[ ] Store attribution works

[ ] Product attribution works where applicable

[ ] CALL_CLICK tracked

[ ] WHATSAPP_CLICK tracked

[ ] DIRECTIONS_CLICK tracked

[ ] FORM_SUBMIT tracked

[ ] form submission creates Lead

[ ] booking event contract supported where applicable

[ ] first-touch attribution implemented

[ ] last-touch attribution implemented

[ ] UTM captured

[ ] tenant ownership derived server-side

[ ] cross-tenant tampering prevented

[ ] no PII in analytics events

[ ] GA4 receives no PII

[ ] idempotent Lead creation implemented

[ ] Lead dashboard implemented

[ ] Store conversion reporting implemented

[ ] Page conversion reporting implemented

[ ] Product attribution implemented

[ ] LocalBi surface remains default

[ ] RLS verified

[ ] no synthetic conversions

===========================================================
64. VERIFICATION
===========================================================

Run:

prisma validate
prisma migrate status

typecheck
lint touched files

Phase 5 tests

RLS tests
API security tests
pixel/event ingestion tests
lead tests
attribution tests
idempotency tests
surface isolation tests

Phase 0 regression
Phase 1 domain regression
Phase 2 catalog regression
Phase 3 page engine regression
Phase 4 analytics regression

production build

===========================================================
65. FINAL REPORT
===========================================================

Return:

# PHASE 5 IMPLEMENTATION REPORT

## Pre-flight
Existing tracking:
Visitor model:
Forms:
PII risks:

## Data model
AttributionEvent:
Lead:
Session:
Indexes:

## Attribution
Page:
Surface:
Store:
Product:
First Touch:
Last Touch:
UTM:

## Events
Page View:
Call:
WhatsApp:
Directions:
Form:
Booking:

## Lead handling
Create:
Status:
Idempotency:
Spam:
Authorization:

## Privacy
PII storage:
Analytics:
GA4:
Logging:

## Dashboard
Lead list:
Conversion summary:
Store reports:
Page reports:
Product reports:

## Security
RLS:
Tenant derivation:
Tampering tests:

## Performance
Aggregation:
Indexes:
Caching:

## Verification
Prisma:
TypeScript:
Lint:
Tests:
Build:

## Deferred
Telephony provider integration:
Virtual numbers:
GMC:
Rank tracking:
Review intelligence:
Keyword categorization:
Blog/content:
CRM integrations:

Finish with:

PHASE 5 STATUS

Attribution events implemented: YES/NO
Lead engine implemented: YES/NO
Server-side tenant derivation verified: YES/NO
WebSurface attribution verified: YES/NO
Store attribution verified: YES/NO
Product attribution verified: YES/NO
Call tracking implemented: YES/NO
WhatsApp tracking implemented: YES/NO
Directions tracking implemented: YES/NO
Form attribution implemented: YES/NO
First/last touch implemented: YES/NO
PII isolation verified: YES/NO
Idempotency verified: YES/NO
RLS verified: YES/NO
LocalBi conversion dashboard implemented: YES/NO
Existing phases preserved: YES/NO
Ready for Phase 6: YES/NO




6___________________________________________________

# LOCALBI — PHASE 6
## GOOGLE BUSINESS PROFILE OPERATIONS
## LOCATIONS + REVIEWS + POSTS + MEDIA + LOCATION INTELLIGENCE

Act as a Principal SaaS Architect, Staff TypeScript Engineer,
Google Business Profile API Engineer, PostgreSQL/Prisma Architect,
Background Job Engineer, Multi-Tenant Security Engineer,
Local SEO Platform Architect and Next.js Engineer.

Phases 0–5 are assumed complete.

CURRENT EXPECTED FOUNDATION:

Tenant
  ↓
Brand
  ↓
Stores
  ↓
Explicit GBP ResourceMapping
  ↓
Google Business Profile Location

Other established architecture:

Brand
├── WebSurface
├── Domains
├── PageTemplates
├── Products
├── Categories
├── StoreProduct
├── Analytics
└── Attribution / Leads

NOW IMPLEMENT PHASE 6 ONLY:

GBP Account
   ↓
Discovered Locations
   ↓
Explicit Store Mapping
   ↓
Location Data
   ├── Profile
   ├── Hours
   ├── Categories
   ├── Attributes
   ├── Reviews
   ├── Review Replies
   ├── Posts
   ├── Media
   └── Performance
         ↓
LocalBi Store Intelligence

DO NOT IMPLEMENT YET:

- local rank tracking
- grid rank scanner
- GMC inventory feeds
- virtual phone number provisioning
- telephony providers
- keyword clustering engine
- blog/article CMS
- AI review response generation
- automated posting campaigns
- competitor scraping
- citation/directory management
- CRM integrations

===========================================================
0. NON-NEGOTIABLE GBP PRINCIPLE
===========================================================

Google discovery is NOT LocalBi ownership.

A Google account may expose:

100 GBP locations

while LocalBi may contain:

Tenant A
Tenant B
Tenant C

Never automatically assign discovered GBP resources.

Required flow:

Google OAuth
    ↓
Discover Accounts
    ↓
Discover Locations
    ↓
Persist ExternalResource
    ↓
UNMAPPED
    ↓
User explicitly maps
    ↓
LocalBi Store

Only after explicit mapping may:

sync
reporting
reviews
posts
media
profile updates

operate against that Store.

===========================================================
1. VERIFY CURRENT GOOGLE API CONTRACTS FIRST
===========================================================

Before changing application code:

review CURRENT official Google documentation for every API/endpoint used.

Do NOT trust:

old blog posts
old Stack Overflow answers
previous AI prompts
deprecated endpoint assumptions

Verify official contracts for:

Google Business Profile APIs
Business Profile Account Management API
Business Profile Business Information API
Business Profile Performance API
Reviews
Local Posts
Media
Categories
Attributes
Locations

Record:

API hostname
version
method
required OAuth scope
pagination
write requirements
resource-name format
quota behavior
deprecated APIs

Produce:

GBP API CONTRACT REPORT

Accounts:
Locations:
Reviews:
Replies:
Posts:
Media:
Performance:
Categories:
Attributes:

If Google currently exposes some functionality through different API
versions/hosts, implement an adapter layer rather than pretending one API
handles everything.

===========================================================
2. RE-AUDIT CURRENT GBP CODE
===========================================================

Inspect CURRENT:

GoogleOAuthService
GoogleApiClient
ResourceDiscoveryService
ResourceMappingService
sync worker
sync queue
GBP write client
reporting service
Store model
ExternalResource
ResourceMapping

existing:

GbpReview
GbpPost
GbpMedia
GbpLocationAggregate

API routes
GBP pages
reviews UI
location UI
tests
Redis caching

Search:

business.manage
accounts
locations
reviews
localPosts
media
performance
attributes
categories
businessInformation
nextPageToken

Produce:

PHASE 6 PRE-FLIGHT

Account discovery:
Location discovery:
Location pagination:
Mapping:
Profile sync:
Performance sync:
Reviews:
Replies:
Posts:
Media:
Categories:
Attributes:
Current persistence:
Current UI:
Current mocks:
Current API errors:

Classify:

KEEP
EXTEND
REFACTOR
REPLACE
REMOVE

===========================================================
3. GBP RESOURCE HIERARCHY
===========================================================

Preserve external Google hierarchy.

Conceptually:

GoogleConnection
   ↓
GBP Account
   ↓
GBP Location

LocalBi:

Tenant
   ↓
Brand
   ↓
Store
   ↓
ResourceMapping
   ↓
GBP Location ExternalResource

Do not flatten everything into:

Store.googleLocationId

if existing ResourceMapping architecture already solves this.

ResourceMapping remains authorization boundary.

===========================================================
4. GBP ACCOUNT DISCOVERY
===========================================================

Implement/reverify complete account discovery.

Support:

primary accounts
eligible sub-accounts where API permits
pagination

Persist account resources if current ExternalResource architecture supports
it.

Do not duplicate accounts on every discovery run.

Use stable Google resource names/IDs.

===========================================================
5. GBP LOCATION DISCOVERY
===========================================================

Discovery must retrieve ALL accessible locations.

Handle pagination correctly.

Normalize Google location resource identity.

Persist discovered locations as ExternalResource records.

Important:

Discovery does NOT create LocalBi Stores automatically unless explicit
current onboarding workflow intentionally offers a reviewed import step.

Preferred:

Discover
   ↓
Show locations
   ↓
User selects
   ↓
Map to existing Store
OR
Create Store intentionally

No hidden auto-assignment.

===========================================================
6. STORE ↔ GBP MAPPING
===========================================================

One LocalBi Store should normally map to one active canonical GBP location
for reporting.

Prevent accidental duplicate active mappings.

Validate:

same tenant
same brand where applicable
authorized Google connection
resource accessible
resource type = GBP_LOCATION

Allow remapping safely.

Historical synchronized data must not be deleted merely because mapping
changes.

===========================================================
7. MAPPING UI
===========================================================

Create/upgrade UX:

LocalBi Store:
Mannadi

Google Business Profile:
Aalim Perfumes - Mannadi
123 Example Road, Chennai
Verified

[Map]

Provide:

Mapped
Unmapped
Connection
Last Sync
Status

Do not choose automatically based only on matching names.

You may show:

Suggested match

but user must confirm.

===========================================================
8. LOCATION PROFILE SYNC
===========================================================

Synchronize supported GBP profile fields into LocalBi.

Potential fields:

business name
primary category
additional categories
phone
website
address
latitude
longitude
regular hours
special hours
attributes
business description where supported

Clearly define authority.

Recommended:

GBP-derived fields have provenance.

Example:

Store.phone
LocalBi manually configured

GBP phone
provider snapshot

Do not silently overwrite manually managed LocalBi data unless product
rules explicitly define GBP as source of truth.

===========================================================
9. FIELD PROVENANCE
===========================================================

For synchronized external data, preserve:

source
external resource
syncedAt

Avoid:

Google value overwrites DB
→ user edits
→ next sync silently overwrites again

Establish field ownership strategy.

Examples:

MANUAL
GOOGLE_SYNCED

or separate provider snapshot tables.

Choose architecture based on existing Store model.

===========================================================
10. LOCATION SYNC STATE
===========================================================

Every mapped location should expose:

ACTIVE
SYNCING
SYNCED
STALE
ERROR
REAUTH_REQUIRED
RESOURCE_UNAVAILABLE

Do not show API failure as:

0 reviews
0 calls
0 searches

No-data and error are different.

===========================================================
11. REVIEWS SYNC
===========================================================

Synchronize real GBP reviews.

Store:

tenantId
brandId where appropriate
storeId
resourceMappingId / externalResourceId
externalReviewId
reviewer safe display fields
starRating
comment
createTime
updateTime
reply
replyUpdateTime
syncedAt

Use stable unique constraint preventing duplicate review ingestion.

Do not fabricate reviews.

===========================================================
12. REVIEW PAGINATION
===========================================================

Handle all supported pagination.

Never sync only the first page and call it complete.

Record sync completeness.

A partial failed sync must NOT mark unseen reviews deleted.

===========================================================
13. REVIEW UPDATE / DELETION LOGIC
===========================================================

Google review state can change.

Use upsert by externalReviewId.

If previously-known review is absent from ONE failed/partial discovery:

do NOT delete it.

Only mark deleted/unavailable when there is reliable authoritative evidence.

Preserve historical analytics where appropriate.

===========================================================
14. REVIEW REPLIES
===========================================================

Support authorized review reply operations if CURRENT official API permits.

Flow:

User
  ↓
LocalBi Review
  ↓
Reply Composer
  ↓
Authorization
  ↓
Google write API
  ↓
Confirm response
  ↓
Update local snapshot

Never optimistically mark Google write successful before provider success.

===========================================================
15. REVIEW REPLY AUTHORIZATION
===========================================================

Create/reuse capability:

REVIEW_REPLY

Viewer:
cannot reply

Editor/Manager:
according to existing RBAC policy

Tenant owner:
allowed

Do not let public microsite users access reply endpoint.

===========================================================
16. REVIEW REPLY FAILURE
===========================================================

If Google fails:

retain draft if useful

show:

Failed to publish reply

with provider-safe reason.

Do not silently update local reply as if Google accepted it.

===========================================================
17. REVIEWS UI
===========================================================

Store Reviews page:

Rating Summary
Total Reviews
Response Rate
Unanswered Reviews

Filters:

Store
Rating
Answered
Unanswered
Date

Table/cards:

Reviewer
Rating
Comment
Date
Reply
Status

Use real provider data only.

===========================================================
18. REVIEW METRICS
===========================================================

Calculate safely:

Average Rating
Review Count
Response Rate
New Reviews

Do not invent sentiment scoring yet.

Phase 6 = factual review operations.

AI review intelligence belongs later.

===========================================================
19. LOCAL POSTS
===========================================================

Audit CURRENT official Local Posts API capability before implementing.

If supported:

persist provider snapshot/state.

Support types actually available from Google.

Do not invent obsolete post types.

LocalBi Post entity may include:

tenantId
brandId
storeId
externalPostId
topicType
summary
cta
media
start/end times where supported
status
publishedAt
syncedAt

Use current API contract.

===========================================================
20. POST CREATION
===========================================================

If write API is supported:

Draft
  ↓
Validate
  ↓
Publish to Google
  ↓
Persist external ID
  ↓
SYNCED

Do not create fake "published" posts locally before provider confirms.

===========================================================
21. POST STATUS
===========================================================

Use clear states:

DRAFT
PUBLISHING
PUBLISHED
FAILED
ARCHIVED

If Google rejects content:

show structured validation/provider error.

===========================================================
22. MEDIA
===========================================================

Synchronize real GBP media where API currently permits.

Store metadata such as:

externalMediaId
category
format
googleUrl
thumbnailUrl if returned
description where supported
createTime
syncedAt

Do not unnecessarily download/re-host all Google media unless product
requirements justify it.

===========================================================
23. MEDIA UPLOAD
===========================================================

Only implement GBP media upload if officially supported by current API.

Validate:

file type
size
dimensions where necessary

Reuse LocalBi upload architecture.

Do not expose Google access tokens to browser upload components.

===========================================================
24. LOCATION CATEGORIES
===========================================================

Implement provider category discovery where needed.

Do not hardcode:

Restaurant
Hospital
Jewelry
Perfume

category arrays in production.

Cache category metadata appropriately because categories do not need to be
fetched on every UI render.

===========================================================
25. ATTRIBUTES
===========================================================

GBP attributes depend on category/location.

Retrieve supported attributes dynamically.

Do not create a universal static attribute form.

Example:

Wheelchair accessibility
Delivery
Dine-in
etc.

Only show attributes applicable to mapped location/category.

===========================================================
26. BUSINESS HOURS
===========================================================

Handle:

regular hours
special hours
closed days

Do not force one simple:

9 AM–5 PM

string.

Keep timezone/local-date semantics correct.

===========================================================
27. GBP PERFORMANCE METRICS
===========================================================

Use CURRENT Business Profile Performance API.

Verify exact available metrics.

Potential metrics may include:

business impressions
website clicks
call clicks
direction requests

but do NOT assume names from old API versions.

Implement only metrics confirmed by current official docs.

===========================================================
28. GBP PERFORMANCE PERSISTENCE
===========================================================

Persist historical daily/monthly metrics if current architecture already
uses scheduled synchronization.

Preferred for dashboards:

provider
resource
store
date
metric
value

or existing normalized structure.

Do not fetch years of GBP data live for every dashboard render.

===========================================================
29. SEARCH KEYWORDS / SEARCH TERMS
===========================================================

If GBP performance API exposes search keyword impressions:

store them as GBP SEARCH TERMS.

Do NOT mix them with GSC queries.

Label clearly:

GBP Search Terms
vs
Search Console Queries

Maintain data provenance.

===========================================================
30. DATA PROVENANCE
===========================================================

All Google Business Profile metrics must identify source:

GOOGLE_BUSINESS_PROFILE

Do not label:

GSC metric as GBP
GA4 as GBP
LocalBi events as GBP

Provider source remains explicit throughout normalized DTOs.

===========================================================
31. STORE INTELLIGENCE VIEW
===========================================================

Add store-level GBP section:

Mannadi

GBP Status
Connected

Profile Completeness
based only on factual field coverage

Reviews
4.6 / 5
328 reviews

Calls
provider metric where supported

Directions
provider metric where supported

Website Actions
provider metric where supported

Search Terms
real GBP search terms

Do not create an arbitrary "SEO score" yet.

===========================================================
32. PROFILE COMPLETENESS
===========================================================

A completeness indicator is allowed if formula is transparent.

Example factual checks:

Phone present
Website present
Hours configured
Primary category present
Address present
Description present

Do not pretend Google itself provides LocalBi's calculated score.

Label:

LocalBi Profile Completeness

and expose formula/tooltips.

===========================================================
33. GBP DASHBOARD
===========================================================

Target:

Brand
   ↓
Stores

Metrics:

Mapped Locations
Unmapped Locations
Needs Reauth
Sync Errors
Total Reviews
Average Rating
Unanswered Reviews

Then store table:

Store
GBP Status
Rating
Reviews
Calls
Directions
Last Sync

Avoid mixing with LocalBi website analytics unless clearly labeled.

===========================================================
34. GBP VS LOCALBI ATTRIBUTION
===========================================================

This distinction is important.

GBP metric:

Google Maps → call action

is:

GBP sourced.

LocalBi page CALL_CLICK:

locate.brand.com → call

is:

LOCALBI sourced.

Do not combine them silently.

Dashboard may show:

GBP Actions
LocalBi Website Actions

side by side.

===========================================================
35. GBP CACHE
===========================================================

Cache provider metadata appropriately.

Cache keys must include:

tenant
connection
externalResource
mapping/store

Never cache:

one tenant's location profile

under only:

locationId

if resource scope could collide or leak.

===========================================================
36. BACKGROUND SYNC
===========================================================

Use BullMQ for scheduled/heavy sync.

Separate job types where helpful:

GBP_PROFILE_SYNC
GBP_PERFORMANCE_SYNC
GBP_REVIEWS_SYNC
GBP_POSTS_SYNC
GBP_MEDIA_SYNC

Do not build one giant sync worker branch if modular processors are
cleaner.

===========================================================
37. JOB PAYLOAD
===========================================================

Every job needs sufficient immutable ownership context:

tenantId
connectionId
resourceMappingId
externalResourceId
storeId

Worker must revalidate these values from DB.

Do not blindly trust queued payload.

===========================================================
38. CONNECTION REVOCATION
===========================================================

Preserve earlier invariant:

before calling Google:

verify connection ACTIVE.

If:

REVOKED
EXPIRED
REQUIRES_REAUTH

abort safely.

Do not decrypt/use old token.

===========================================================
39. IDEMPOTENT JOBS
===========================================================

Use deterministic job IDs / business keys.

Avoid duplicate concurrent review/profile sync for same:

tenant
resource
period

Existing queue idempotency architecture should be reused.

===========================================================
40. SYNC WATERMARKS
===========================================================

Track:

lastAttemptAt
lastSuccessAt
lastFailureAt
errorCode
errorMessage safe summary

For applicable resources.

Never claim "synced" based only on job enqueue.

===========================================================
41. API QUOTAS / RETRIES
===========================================================

Handle:

429
5xx
network timeout

with controlled retry/backoff.

Do not retry permanent:

400
403 permission errors

indefinitely.

Classify provider errors.

===========================================================
42. PARTIAL FAILURE
===========================================================

Example:

Profile sync success
Reviews success
Media failure

Store status should not become:

everything failed

if independent datasets succeed.

Track per-capability synchronization state where useful.

===========================================================
43. AUTHORIZATION MODEL
===========================================================

Add/reuse capabilities:

GBP_VIEW
GBP_MANAGE_PROFILE
GBP_REPLY_REVIEW
GBP_MANAGE_POSTS
GBP_MANAGE_MEDIA
GBP_SYNC

Match existing RBAC patterns.

Do not give write permissions to VIEWER.

===========================================================
44. PUBLIC MICROSITE INTEGRATION
===========================================================

Phase 3 PageContext may consume:

real Store profile
real reviews

Use synchronized LocalBi DB snapshot.

Do NOT call GBP APIs directly during public page rendering.

Public page:

request
→ LocalBi DB
→ PageContext

not:

visitor request
→ Google API

This protects latency and quotas.

===========================================================
45. REVIEW COMPONENT
===========================================================

Puck Review components should consume:

PageContext.reviews

from synchronized DB.

Do not let Puck component call Google.

Do not embed Google OAuth credentials in renderer.

===========================================================
46. STALE DATA
===========================================================

Historical synchronized data may remain visible after connection problems.

Clearly differentiate:

LIVE ACCESSIBLE
STALE SNAPSHOT
REAUTH REQUIRED

Do not erase useful historical data merely because current OAuth expires.

===========================================================
47. LOCATION REMOVED FROM GOOGLE
===========================================================

If mapped GBP resource disappears:

do not delete LocalBi Store.

Mark mapping/resource state:

RESOURCE_UNAVAILABLE

Retain historical:

reviews
metrics
profile snapshot

until intentional cleanup policy says otherwise.

===========================================================
48. GOOGLE PROFILE WRITES
===========================================================

Any profile update to Google must use:

explicit user action

Do not automatically push LocalBi Store fields to Google every sync.

Synchronization direction must be explicit.

READ sync:

Google → LocalBi snapshot

WRITE:

User explicitly selects change
→ Google

No accidental two-way sync loops.

===========================================================
49. CONFLICT MANAGEMENT
===========================================================

If user edits LocalBi phone while Google has another phone:

do not silently decide which wins.

Show provider snapshot where appropriate.

Future "push to Google" can be explicit.

===========================================================
50. NO MOCK GBP DATA
===========================================================

Search production code for:

fake reviews
sample search terms
mock calls
dummy rating
hardcoded GBP locations
Math.random
fake post statuses

Remove production fallback values.

Test fixtures may remain explicit.

===========================================================
51. MULTI-BRAND GOOGLE ACCOUNT TEST
===========================================================

Scenario:

One OAuth Google account sees:

Aalim Mannadi
Aalim T Nagar
Lakshmi Food Chennai
Another Company's Store

Tenant has:

Brand Aalim
Brand Lakshmi Food

Discovery must keep all resources unmapped.

User explicitly maps:

Aalim Mannadi
→ Aalim / Mannadi

Lakshmi Food Chennai
→ Lakshmi Food / Chennai

No cross-brand automatic assignment.

===========================================================
52. MULTI-TENANT TEST
===========================================================

Tenant A Google account/resource

must never be visible through:

Tenant B mapping UI
Tenant B API
Tenant B worker
Tenant B reports

RLS + service authorization tests required.

===========================================================
53. DUPLICATE REVIEW TEST
===========================================================

Sync review same external ID twice.

Expected:

one row
updated fields

not duplicate.

===========================================================
54. REVIEW PARTIAL SYNC TEST
===========================================================

Existing:

100 reviews.

Next provider request returns first page then fails.

Expected:

existing unseen 80 reviews remain.

Do NOT delete them.

===========================================================
55. REVIEW REPLY TEST
===========================================================

Provider accepts reply:

local snapshot updated.

Provider rejects:

local review remains unchanged / failure state.

No false-success UI.

===========================================================
56. PROFILE SYNC TEST
===========================================================

Google updates store hours.

Successful synchronization updates provider snapshot.

Local manually-owned fields remain according to defined provenance strategy.

===========================================================
57. REVOKED WORKER TEST
===========================================================

Queue created.

Connection revoked before job executes.

Expected:

job aborts safely.

No Google request.

===========================================================
58. PERFORMANCE TEST
===========================================================

50 mapped stores.

Dashboard must not trigger:

50 independent browser calls
+
50 independent Google calls

Use:

DB aggregates
server aggregation
background synced data

===========================================================
59. DATA MODEL INDEXES
===========================================================

Review current indexes.

Likely:

GbpReview:
tenantId + storeId + createTime
tenantId + externalResourceId
externalReviewId unique within provider scope

Performance:
tenant + store + date

Posts:
tenant + store + status + createdAt

Media:
tenant + store

Do not duplicate indexes already covered.

===========================================================
60. NORMALIZED DTOs
===========================================================

Create/reuse:

GbpLocationDto
GbpReviewDto
GbpPostDto
GbpMediaDto
GbpPerformanceDto
GbpStoreSummaryDto

Do not expose raw Google API payload everywhere.

Store raw provider payload only if genuinely necessary and bounded.

===========================================================
61. UI ARCHITECTURE
===========================================================

Avoid another giant monolith.

Suggested logical modules:

features/gbp/
├── locations
├── reviews
├── posts
├── media
├── performance
└── components

Use:

TanStack Query
browserClient
central query keys
existing tables/cards

Do not duplicate request logic per page.

===========================================================
62. QUERY KEYS
===========================================================

Examples conceptually:

gbpKeys.locations(tenant, brand)
gbpKeys.location(tenant, store)
gbpKeys.reviews(tenant, store, filters)
gbpKeys.posts(...)
gbpKeys.performance(...)

Invalidate relevant resources after writes.

===========================================================
63. EMPTY / ERROR STATES
===========================================================

Distinguish:

Not Connected
Unmapped
Syncing
No Reviews
No Posts
Permission Missing
Reauth Required
Provider Error
Stale Data

Do not render empty chart as 0 for provider failure.

===========================================================
64. OBSERVABILITY
===========================================================

Log:

tenantId
storeId
mappingId
resourceId
operation
Google endpoint family
status
duration
retry count

Do not log:

access token
refresh token
reviewer sensitive data unnecessarily
private key
OAuth secrets

===========================================================
65. ACCEPTANCE CRITERIA
===========================================================

Phase 6 is complete only when:

[ ] GBP accounts discovered safely

[ ] All GBP locations discovered with pagination

[ ] Resource discovery stays separate from mapping

[ ] Explicit Store mapping works

[ ] Duplicate active mappings prevented

[ ] Location profile sync works

[ ] Hours sync works

[ ] Category sync works

[ ] Attribute sync works where supported

[ ] Reviews sync works

[ ] Review pagination works

[ ] Partial review sync cannot delete unseen reviews

[ ] Review replies work where API supports them

[ ] Posts work where current API supports them

[ ] Media sync works where supported

[ ] Performance metrics use current official API

[ ] GBP search terms remain distinct from GSC queries

[ ] Public pages use DB snapshots, never live Google requests

[ ] Provider failures != zero data

[ ] Stale historical data retained

[ ] Revoked connection jobs abort

[ ] RLS verified

[ ] Cross-brand mapping protection verified

[ ] Cross-tenant protection verified

[ ] No fake GBP data exists

===========================================================
66. VERIFICATION
===========================================================

Run:

prisma validate
prisma migrate status

typecheck
lint touched files

GBP API contract tests
location discovery tests
pagination tests
mapping tests
review tests
reply tests
post tests where implemented
media tests
performance tests
worker revocation tests
RLS tests
cross-brand tests
cross-tenant tests

Phase 0 security regression
Phase 1 WebSurface regression
Phase 2 catalog regression
Phase 3 website engine regression
Phase 4 analytics regression
Phase 5 attribution regression

production build

===========================================================
67. FINAL REPORT
===========================================================

Return:

# PHASE 6 IMPLEMENTATION REPORT

## Official API verification
Accounts:
Locations:
Reviews:
Posts:
Media:
Performance:
Deprecated endpoints avoided:

## Pre-flight
Existing discovery:
Existing mapping:
Existing GBP tables:
Existing workers:

## Location management
Accounts:
Locations:
Mapping:
Profile:
Hours:
Categories:
Attributes:

## Reviews
Sync:
Pagination:
Replies:
Partial failure:
Historical retention:

## Posts
API status:
Create:
Sync:
Failures:

## Media
Sync:
Upload:
Persistence:

## Performance
Metrics:
Persistence:
Search terms:
Data provenance:

## Workers
Jobs:
Idempotency:
Revocation:
Retries:
Partial failures:

## Public website integration
PageContext:
Reviews:
No live provider calls:

## UI
Locations:
Reviews:
Posts:
Media:
Performance:

## Security
Authorization:
RLS:
Cross-tenant:
Cross-brand:

## Verification
Prisma:
TypeScript:
Lint:
Tests:
Build:

## Deferred
Rank tracking:
GMC:
Virtual numbers:
Calls:
Keyword intelligence:
Review AI:
Content engine:

Finish with:

PHASE 6 STATUS

GBP account discovery verified: YES/NO
Location discovery verified: YES/NO
Explicit Store mapping verified: YES/NO
Profile sync implemented: YES/NO
Reviews sync implemented: YES/NO
Review replies implemented/supported: YES/NO
Posts implemented/supported: YES/NO
Media implemented/supported: YES/NO
Performance API implemented: YES/NO
GBP/GSC provenance separation verified: YES/NO
Worker revocation safety verified: YES/NO
RLS verified: YES/NO
Cross-brand isolation verified: YES/NO
Cross-tenant isolation verified: YES/NO
No synthetic GBP data verified: YES/NO
Existing phases preserved: YES/NO
Ready for Phase 7: YES/NO

7_____________________________________________________________________

# LOCALBI — PHASE 7
## HYPER RANK / LOCAL SEARCH VISIBILITY ENGINE
## KEYWORDS + GEO-GRID RANK TRACKING + COMPETITOR INTELLIGENCE

Act as a Principal SaaS Architect, Staff TypeScript Engineer,
Local SEO Platform Architect, PostgreSQL/Prisma Architect,
Background Job Engineer, Geospatial Data Engineer,
Analytics Engineer and Multi-Tenant Security Engineer.

Phases 0–6 are assumed complete.

EXPECTED CURRENT FOUNDATION:

Tenant
  ↓
Brand
  ↓
Stores
  ↓
GBP Mapping
  ↓
GBP Profile / Reviews / Performance

Brand also has:

WebSurface
Domains
PageTemplates
Products
Categories
StoreProduct
GA4
GSC
Attribution
Leads

NOW IMPLEMENT PHASE 7 ONLY:

Brand
  ↓
Store
  ↓
Keyword Set
  ↓
Geo Grid
  ↓
Rank Checks
  ↓
Local Pack / Organic Results
  ↓
Competitors
  ↓
Historical Visibility
  ↓
Hyper Rank Dashboard

DO NOT IMPLEMENT YET:

- GMC / Merchant Center feeds
- virtual phone numbers
- telephony provisioning
- AI content generation
- automated review replies
- citations/directories
- CRM integrations
- blog/article automation
- advanced recommendation AI
- paid search campaign management

===========================================================
0. PRIMARY PRODUCT GOAL
===========================================================

A LocalBi client must be able to answer:

"For each store, where do I rank locally for important search terms?"

Example:

Aalim Perfumes — Mannadi

Keyword:
perfume shop near me

Grid:
7 x 7
Radius:
5 km

Average Rank:
4.8

Top 3 Coverage:
61%

Top 10 Coverage:
92%

Share of Voice:
34%

Strong Areas:
Mannadi
Parrys
George Town

Weak Areas:
Royapuram
Washermanpet

Top Competitors:
Competitor A
Competitor B
Competitor C

Historical Trend:
4.8 → 4.1 → 3.7

The system must show factual rank observations.

Do NOT fabricate ranking data.

===========================================================
1. RE-AUDIT CURRENT CODE FIRST
===========================================================

Before implementing anything inspect CURRENT:

- Store model
- Brand model
- GBP mappings
- GBP categories
- GSC queries
- GBP search terms
- current keyword features
- competitor model if one exists
- location coordinates
- Redis
- BullMQ
- analytics/report architecture
- maps/geospatial utilities
- current background jobs
- current UI components
- current charting
- existing API provider integrations

Search for:

keyword
rank
ranking
competitor
geo
grid
latitude
longitude
near me
search terms
queries
local rank
position
SERP
maps
placeId

Produce:

PHASE 7 PRE-FLIGHT

Current keyword model:
Current competitor model:
Store geolocation:
GBP category data:
GSC keyword data:
GBP search terms:
Existing rank provider:
Existing rank jobs:
Existing map/grid utilities:
Existing persistence:
Existing UI:

Classify:

KEEP
EXTEND
REFACTOR
REPLACE
MISSING

===========================================================
2. DO NOT CONFUSE DATA SOURCES
===========================================================

These are separate:

GSC QUERY
→ what people searched before clicking/seeing website

GBP SEARCH TERM
→ terms associated with GBP visibility

LOCAL RANK CHECK
→ observed ranking at a specific geographic coordinate

Do NOT merge them into one table without source metadata.

Maintain provenance:

GSC
GBP
LOCAL_RANK_PROVIDER

===========================================================
3. RANK DATA SOURCE — VERIFY FIRST
===========================================================

Before coding rank acquisition:

determine how LocalBi will obtain rank data.

Do not assume Google exposes an official API for arbitrary local-pack
ranking queries.

Possible architecture:

LocalBi
  ↓
RankProvider interface
  ↓
approved/compliant rank data provider

Examples may include external SERP/local-rank vendors if the product
chooses one.

Do NOT implement brittle direct browser scraping as the permanent
production architecture.

Do NOT automate Google Maps/Search UI scraping without verifying
provider/legal/technical constraints.

Create abstraction first:

RankProvider

Methods conceptually:

checkLocalRank()
checkOrganicRank()
validateKeyword()
validateLocation()

Provider-specific code must stay isolated.

===========================================================
4. PROVIDER ABSTRACTION
===========================================================

Create:

LocalRankProvider

Conceptual contract:

checkGridPoint({
  keyword,
  latitude,
  longitude,
  language,
  country,
  device?
})

returns:

observedAt
results
targetBusinessPosition
targetBusinessIdentity
competitors
providerMetadata

Do not expose raw vendor response throughout LocalBi.

Normalize it.

===========================================================
5. KEYWORD MODEL
===========================================================

Create/normalize Keyword.

Conceptually:

Keyword

id
tenantId
brandId

keyword
normalizedKeyword

source:
MANUAL
GSC
GBP
IMPORT

status:
ACTIVE
PAUSED

locale
language
country

createdAt
updatedAt

A keyword can potentially be used across multiple Stores.

Do NOT duplicate identical keywords per Store unnecessarily.

===========================================================
6. STORE KEYWORD MAPPING
===========================================================

Create many-to-many mapping:

StoreKeyword

tenantId
storeId
keywordId

priority
trackingEnabled

gridConfigId?

createdAt
updatedAt

One Brand keyword may be tracked for:

Mannadi
T Nagar
Anna Nagar

independently.

===========================================================
7. KEYWORD DISCOVERY
===========================================================

Allow users to build keyword sets from:

Manual entry
GSC queries
GBP search terms
CSV import

Do NOT automatically activate every discovered keyword.

Flow:

Discover
  ↓
Review
  ↓
Select
  ↓
Assign to Store
  ↓
Enable tracking

This avoids thousands of unnecessary rank checks.

===========================================================
8. KEYWORD NORMALIZATION
===========================================================

Normalize carefully:

trim
collapse excess whitespace
consistent Unicode handling
case-normalized comparison

Do NOT rewrite semantic meaning.

Example:

"perfume shop near me"

should not be silently changed into:

"perfume store Chennai"

===========================================================
9. GEO GRID MODEL
===========================================================

Create a Grid configuration.

Conceptually:

RankGridConfig

id
tenantId
storeId

centerLatitude
centerLongitude

gridSize:
3
5
7
9
etc.

radiusKm
distanceBetweenPoints?

status

createdAt
updatedAt

Do not assume every Store uses same grid.

===========================================================
10. GRID GENERATION
===========================================================

Create deterministic grid-point generation.

Example:

7 x 7
centered on Store coordinates

→ 49 geographic points.

Each point should have:

index
row
column
latitude
longitude
distanceFromStore

Grid generation must be reproducible.

Same config:

same points.

===========================================================
11. GEOGRAPHIC CORRECTNESS
===========================================================

Do not calculate large-distance coordinates with naive:

lat += x

unless accuracy is acceptable and documented.

Use a correct geospatial calculation.

At minimum account for:

latitude
longitude
Earth curvature

for grid point generation.

Use existing geospatial library if available.

Avoid unnecessary new dependency if current stack already supports it.

===========================================================
12. RANK CHECK MODEL
===========================================================

Separate scheduled run from individual observations.

Concept:

RankRun

tenantId
brandId
storeId
keywordId
gridConfigId

provider
status

startedAt
completedAt
errorCode?

Then:

RankObservation

tenantId
rankRunId
gridPointId

latitude
longitude

rank?
found

resultType:
LOCAL_PACK
MAPS
ORGANIC
or provider-supported types

observedAt

Never use:

rank = 0

to mean:

not found.

Use:

rank = NULL
found = false

or an explicit status.

===========================================================
13. TARGET BUSINESS IDENTITY
===========================================================

Critical problem:

Rank provider results may include businesses with similar names.

Do NOT identify target only by:

business name string.

Prefer stable identity when available:

GBP location resource
Google Place ID
provider business ID

Create verified target identity mapping.

Example:

Store
  ↓
GBP Mapping
  ↓
Place identity
  ↓
Rank Provider Target

If stable ID unavailable:

use carefully documented fallback matching.

===========================================================
14. COMPETITOR MODEL
===========================================================

Create/normalize Competitor.

Concept:

Competitor

id
tenantId
brandId?

name
externalPlaceId?
domain?
category?

latitude?
longitude?

source

createdAt
updatedAt

Then:

StoreCompetitor

storeId
competitorId

Do not duplicate the same competitor on every rank run.

===========================================================
15. COMPETITOR DISCOVERY
===========================================================

Rank observations can discover competing businesses.

When a competitor appears:

normalize identity
match existing competitor
upsert if stable identity exists

Do NOT merge businesses solely because names are similar.

===========================================================
16. HISTORICAL RANKING
===========================================================

Rank data is time series.

Never overwrite previous observations.

Example:

2026-10-01
rank 7

2026-10-08
rank 5

2026-10-15
rank 3

History is valuable.

Persist immutable observations.

===========================================================
17. RANK SCHEDULE
===========================================================

Use BullMQ.

Potential schedules:

daily
weekly
custom cadence

Do not default every customer to daily 9x9 grids for every keyword.

Rank checks may be expensive.

Use subscription/usage limits where available.

===========================================================
18. COST CONTROL
===========================================================

Estimate job cost before executing.

Example:

10 Stores
x
30 Keywords
x
49 Grid Points

=
14,700 rank queries

Do NOT accidentally trigger this on page load.

All grid checks must be background jobs.

===========================================================
19. JOB PLAN
===========================================================

Potential hierarchy:

RankBatch
  ↓
Store + Keyword
  ↓
Grid Points
  ↓
Provider queries

Avoid one giant blocking job if provider APIs benefit from controlled
parallelism.

Also avoid creating millions of tiny jobs unnecessarily.

Design batching intentionally.

===========================================================
20. PROVIDER RATE LIMITS
===========================================================

Respect provider:

QPS
daily quota
concurrency
429 handling

Implement:

bounded concurrency
retry/backoff
dead-letter/failure state

Do not retry permanent provider errors indefinitely.

===========================================================
21. JOB IDEMPOTENCY
===========================================================

Do not execute same scheduled rank scan twice.

Business key concept:

tenant
store
keyword
gridConfig
schedule period

Use deterministic job identity.

===========================================================
22. RUN STATES
===========================================================

Use explicit states:

QUEUED
RUNNING
PARTIAL
COMPLETED
FAILED
CANCELLED

Do not display:

0 rank

when job failed.

===========================================================
23. PARTIAL RUN
===========================================================

Example:

49 grid points.

45 succeed.
4 provider requests fail.

Run:

PARTIAL

Do not discard 45 valid observations.

UI should show:

45/49 points complete

with failed points distinguishable.

===========================================================
24. RANK RANGE
===========================================================

Provider may only return top N.

If target not present:

found = false
rank = NULL
checkedDepth = N

Do not report:

rank = 100

unless provider actually establishes that.

UI can show:

20+

if checked depth = 20.

===========================================================
25. GRID VISIBILITY METRICS
===========================================================

Calculate transparent metrics.

Examples:

Average Rank

Top 3 Coverage:
number of found grid points rank <= 3
/
valid checked points

Top 10 Coverage:
rank <= 10
/
valid checked points

Visibility:
define explicitly

Do not invent unexplained "LocalBi Score".

===========================================================
26. AVERAGE RANK
===========================================================

Be careful with not-found points.

Do NOT assign arbitrary rank:

100

and average it silently.

Possible reporting:

Average Found Rank
+
Coverage

Example:

Average Found Rank:
4.2

Found:
43/49

Top 3 Coverage:
55%

This is more transparent.

===========================================================
27. SHARE OF VOICE
===========================================================

If implementing Share of Voice:

document exact formula.

It must derive from observed result presence/position.

Do not use arbitrary percentages.

Example approach may weight:

rank 1 > rank 2 > rank 3...

but expose formula.

===========================================================
28. COMPETITOR SHARE
===========================================================

For each competitor calculate factual visibility across same grid/run.

Example:

Aalim          34%
Competitor A   28%
Competitor B   22%

Only compare businesses appearing in equivalent observations.

===========================================================
29. GEO-GRID UI
===========================================================

Create interactive map/grid.

Example cells:

1
2
3
5
8
10
20+
—

Legend:

Top 3
4–10
11–20
Not found
Failed

Do not hardcode colors inconsistently.

Use centralized rank-band configuration/design tokens.

===========================================================
30. GRID MAP
===========================================================

Each grid point should display:

rank
coordinate
observation time
top competitors where useful

Clicking point may show:

1. Competitor A
2. Aalim Perfumes
3. Competitor B

provided provider result data supports it.

===========================================================
31. HISTORICAL TREND UI
===========================================================

Show:

Average Rank
Top 3 Coverage
Top 10 Coverage
Visibility
Competitor comparison

over time.

Use real historical observations.

Do not reconstruct fake historical data.

===========================================================
32. STORE RANK DASHBOARD
===========================================================

Example:

Mannadi

Tracked Keywords     24
Avg Found Rank       4.6
Top 3 Coverage       58%
Top 10 Coverage      89%
Visibility Trend     +8%

Top Keywords:

perfume shop near me
oud perfume chennai
attar shop mannadi

Weak Keywords:

luxury perfume
arabic perfume
perfume gifts

"Weak" must use defined factual criteria.

===========================================================
33. BRAND RANK DASHBOARD
===========================================================

Aggregate Stores carefully.

Do not average averages incorrectly.

Use raw observations/weighted calculations.

Example:

Brand
  ↓
Store visibility

Mannadi        72%
T Nagar        67%
Anna Nagar     44%

===========================================================
34. KEYWORD DASHBOARD
===========================================================

For one keyword:

"perfume shop near me"

show:

Stores
Average rank
Top 3 coverage
Top 10 coverage
Trend
Competitors

===========================================================
35. GSC INTEGRATION
===========================================================

GSC can suggest keywords.

It does NOT prove local-pack ranking.

UI should label:

Website Search Query Data

separately from:

Geo Rank Tracking

Do not substitute GSC average position for geo-grid ranking.

===========================================================
36. GBP SEARCH TERM INTEGRATION
===========================================================

GBP search terms may suggest local-intent keywords.

Allow:

"Add to Rank Tracking"

but do not automatically activate every term.

===========================================================
37. STORE LOCATION REQUIREMENT
===========================================================

Geo rank tracking requires reliable:

latitude
longitude.

Prefer Store/GBP coordinates.

If missing:

block grid creation

and ask user to configure coordinates.

Do not guess coordinates from city center silently.

===========================================================
38. SEARCH LOCATION / LOCALE
===========================================================

Each rank request should include appropriate:

country
language
coordinate

and provider-supported device/search settings.

Do not assume every customer is India/en-IN.

===========================================================
39. MOBILE VS DESKTOP
===========================================================

If provider supports device variants:

model device explicitly.

Do not mix mobile/desktop observations in same metric without labeling.

If Phase 7 only needs mobile/local searches:

define that product rule.

===========================================================
40. ORGANIC VS LOCAL PACK
===========================================================

Keep result types separate.

Example:

Local Pack Rank
Organic Rank

Do not average them together.

Hyper Rank should primarily focus on Local/Maps rank unless product
requirements say otherwise.

===========================================================
41. DATA PROVENANCE
===========================================================

Every observation should know:

provider
providerJobId?
query timestamp
coordinate
keyword
result type

This is essential for debugging.

===========================================================
42. PROVIDER RAW PAYLOAD
===========================================================

Do not permanently store huge raw SERP responses unless needed.

Prefer normalized observations.

If raw provider data is retained for debugging:

bounded retention
compressed/object storage
tenant scoped
no unnecessary duplication

===========================================================
43. RLS
===========================================================

Every new tenant-owned table:

tenantId

ENABLE ROW LEVEL SECURITY
FORCE ROW LEVEL SECURITY

Likely:

Keyword
StoreKeyword
RankGridConfig
RankGridPoint
RankRun
RankObservation
Competitor
StoreCompetitor

Cross-tenant tests mandatory.

===========================================================
44. AUTHORIZATION
===========================================================

Add/reuse:

RANK_VIEW
RANK_MANAGE_KEYWORDS
RANK_RUN
RANK_CONFIGURE

Viewer:
read only

Editor/Manager:
according to RBAC

Do not allow arbitrary users to trigger expensive rank scans.

===========================================================
45. USAGE LIMITS
===========================================================

Rank checks have cost.

Integrate with subscription quotas if current Subscription architecture
exists.

Potential limits:

tracked keywords
stores
grid size
scan frequency
monthly rank checks

Do not hardcode pricing tiers.

Create usage counters/capability checks.

===========================================================
46. MANUAL RUN
===========================================================

Allow:

Run Rank Check

but enforce:

authorization
quota
cooldown
duplicate-run prevention

Return:

queued

not fake immediate rank data.

===========================================================
47. SCHEDULED RUN
===========================================================

Scheduler queues due rank scans.

Never run rank queries synchronously inside dashboard request.

===========================================================
48. CACHE
===========================================================

Dashboard aggregates may cache.

Key scope:

tenant
brand
store
keyword
grid
date/run

Do not cache one Store result under only keyword text.

===========================================================
49. INDEXES
===========================================================

Design for time-series scale.

Potential:

RankObservation:
tenantId + storeId + observedAt
tenantId + keywordId + observedAt
rankRunId + gridPointId

RankRun:
tenantId + storeId + keywordId + createdAt

StoreKeyword:
storeId + keywordId unique

Competitor:
tenant + external identity

Avoid redundant indexes.

===========================================================
50. DATA RETENTION
===========================================================

Rank observations can grow quickly.

Design retention/aggregation strategy.

Example:

raw grid observations:
retain according to subscription/policy

historical summary:
retain longer

Do not implement destructive cleanup without policy.

===========================================================
51. SUMMARY TABLES
===========================================================

If dashboards become expensive, consider:

RankRunSummary

with:

averageFoundRank
foundPoints
totalValidPoints
top3Count
top10Count
visibility

Compute after run.

Do not recompute all raw observations on every dashboard request.

===========================================================
52. NO N+1
===========================================================

Brand dashboard must not:

loop stores
→ loop keywords
→ query observations separately.

Use grouped SQL/aggregations.

===========================================================
53. COMPETITOR TREND
===========================================================

Track competitor visibility historically.

Do not interpret intent.

Report:

Observed competitor position/coverage.

Avoid statements such as:

"Competitor is aggressively targeting your store"

unless there is direct evidence.

===========================================================
54. RECOMMENDATION BOUNDARY
===========================================================

Phase 7 may surface factual opportunities.

Example:

"Keyword X has Top-3 coverage of 12% while Keyword Y has 68%."

Do not build AI recommendations yet.

Later intelligence phase can suggest actions.

===========================================================
55. API DESIGN
===========================================================

Create/reuse tenant-scoped APIs for:

keywords
store-keywords
grid configs
rank runs
rank results
competitors
summary metrics

Follow current conventions.

Use:

browserClient
TanStack Query
Zod
standard error handler
RBAC
tenant context

===========================================================
56. QUERY KEYS
===========================================================

Centralize.

Conceptually:

rankKeys.keywords(...)
rankKeys.storeKeywords(...)
rankKeys.grid(...)
rankKeys.latestRun(...)
rankKeys.history(...)
rankKeys.competitors(...)

No random arrays in each component.

===========================================================
57. KEYWORD UI
===========================================================

Build:

Keyword Management

Keyword
Source
Stores
Tracking Status
Last Run
Avg Rank
Top 3 Coverage

Actions:

Assign Stores
Pause
Resume
Run Check

===========================================================
58. STORE KEYWORD UI
===========================================================

Store:

Mannadi

Tracked Keywords

perfume shop near me
attar shop
oud perfume
arabic perfume

Each:

Last Rank
Coverage
Trend
Last Checked

===========================================================
59. GRID CONFIG UI
===========================================================

User can select:

Grid Size:
3x3
5x5
7x7

Radius:
1 km
3 km
5 km
10 km

Provide estimated checks:

7 x 7
=
49 points per keyword.

10 keywords
=
490 checks/run.

Make cost visible.

===========================================================
60. PROVIDER CONFIG
===========================================================

Provider API keys/secrets:

server environment / secure secret store

never:

database plaintext
browser bundle
Puck JSON

If tenant-specific provider credentials are supported later:

encrypt them with existing secret infrastructure.

===========================================================
61. PROVIDER FAILURE
===========================================================

Provider outage:

show:

Rank data temporarily unavailable

Do not:

set all ranks to not found
overwrite last good run
create zero metrics

Historical data remains visible.

===========================================================
62. STALE DATA
===========================================================

Show:

Last checked:
2 days ago

If job failed:

Last successful:
2 days ago

Latest attempt:
failed today

Do not hide staleness.

===========================================================
63. STORE DEACTIVATION
===========================================================

Inactive Store:

pause future rank scans.

Preserve historical data.

Do not delete observations.

===========================================================
64. KEYWORD DEACTIVATION
===========================================================

Paused keyword:

no new scheduled scans.

History remains.

===========================================================
65. GRID CHANGE
===========================================================

Changing from:

5x5 / 3km

to:

7x7 / 5km

creates a new configuration/version.

Do not overwrite historical grid definition used by older runs.

===========================================================
66. TARGET BUSINESS NOT FOUND
===========================================================

Distinguish:

NOT_FOUND_IN_DEPTH

from:

PROVIDER_ERROR

from:

TARGET_IDENTITY_UNKNOWN

These are not equivalent.

===========================================================
67. TEST — GRID GENERATION
===========================================================

Same:

lat/lng
7x7
5km

must generate same 49 points.

===========================================================
68. TEST — TENANT ISOLATION
===========================================================

Tenant A cannot:

view Tenant B keywords
run Tenant B scans
read Tenant B observations
see Tenant B competitors.

===========================================================
69. TEST — BRAND / STORE OWNERSHIP
===========================================================

Keyword from Brand A cannot be assigned to Store in Brand B.

===========================================================
70. TEST — RANK FOUND
===========================================================

Provider returns target business at rank 3.

Store:

rank = 3
found = true.

===========================================================
71. TEST — NOT FOUND
===========================================================

Provider checks top 20.

Target absent.

Store:

rank = null
found = false
checkedDepth = 20.

===========================================================
72. TEST — PARTIAL GRID
===========================================================

49 points.

45 successful.
4 failed.

Summary calculated from 45 valid points.

Run status:

PARTIAL.

===========================================================
73. TEST — DUPLICATE RUN
===========================================================

Two scheduler invocations for same scheduled interval.

Only one actual provider run.

===========================================================
74. TEST — PROVIDER RATE LIMIT
===========================================================

429:

retry/backoff.

Do not mark keyword not found.

===========================================================
75. TEST — COMPETITOR IDENTITY
===========================================================

Same external Place ID appears in 20 observations.

Create one Competitor row.

===========================================================
76. TEST — HISTORICAL DATA
===========================================================

New rank run does not overwrite prior observations.

===========================================================
77. TEST — PAUSED KEYWORD
===========================================================

Scheduled worker does not scan paused keyword.

===========================================================
78. TEST — INACTIVE STORE
===========================================================

Scheduled scan skipped.

===========================================================
79. TEST — COST LIMIT
===========================================================

Tenant exceeds monthly quota.

Manual/scheduled run blocked with explicit quota state.

No partial hidden provider execution.

===========================================================
80. REAL DATA ONLY
===========================================================

Search production code for:

Math.random
fake ranks
demo competitors
hardcoded grid results
sample visibility
dummy heatmaps

Remove production fallbacks.

Use explicit test fixtures only.

===========================================================
81. ACCEPTANCE CRITERIA
===========================================================

Phase 7 is complete only when:

[ ] Keyword model implemented

[ ] StoreKeyword mapping implemented

[ ] GSC keyword import works

[ ] GBP search-term import works

[ ] Geo grid config implemented

[ ] Deterministic grid generation implemented

[ ] RankProvider abstraction implemented

[ ] Production rank acquisition uses an approved/provider abstraction

[ ] RankRun implemented

[ ] RankObservation implemented

[ ] Ranking history preserved

[ ] Competitor discovery implemented

[ ] Competitor identity deduplicated

[ ] Top-3 coverage implemented

[ ] Top-10 coverage implemented

[ ] Average found rank implemented

[ ] Metric formulas documented

[ ] Geo-grid UI implemented

[ ] Historical trend implemented

[ ] Store dashboard implemented

[ ] Keyword dashboard implemented

[ ] Brand summary implemented

[ ] Scheduled scans implemented

[ ] Manual scans implemented

[ ] Quotas/cost guards implemented

[ ] Provider error states implemented

[ ] Partial scans handled

[ ] RLS verified

[ ] Cross-brand isolation verified

[ ] Cross-tenant isolation verified

[ ] No synthetic rank data exists

===========================================================
82. VERIFICATION
===========================================================

Run:

prisma validate
prisma migrate status

typecheck
lint touched files

grid-generation tests
keyword tests
mapping tests
provider adapter tests
rank-run tests
partial-run tests
competitor tests
quota tests
worker tests
RLS tests
cross-tenant tests

Regression:

Phase 0 security
Phase 1 WebSurface
Phase 2 Catalog
Phase 3 Website Engine
Phase 4 Analytics
Phase 5 Attribution
Phase 6 GBP

production build

===========================================================
83. FINAL REPORT
===========================================================

Return:

# PHASE 7 IMPLEMENTATION REPORT

## Data source
Provider selected:
Provider contract:
Compliance considerations:

## Pre-flight
Keywords:
Competitors:
Coordinates:
Workers:

## Data model
Keyword:
StoreKeyword:
Grid:
RankRun:
RankObservation:
Competitor:
Summary:

## Grid engine
Generation:
Distance:
Versioning:

## Rank provider
Adapter:
Rate limits:
Retries:
Errors:

## Metrics
Average Rank:
Top 3:
Top 10:
Visibility:
Share of Voice if implemented:

## Competitors
Discovery:
Deduplication:
Historical trend:

## Scheduling
Manual:
Scheduled:
Idempotency:
Quota:

## UI
Keyword Manager:
Store Rank:
Geo Grid:
History:
Competitors:
Brand Summary:

## Security
Authorization:
RLS:
Cross-brand:
Cross-tenant:

## Performance
Batching:
Indexes:
Aggregation:
Caching:

## Verification
Prisma:
TypeScript:
Lint:
Tests:
Build:

## Deferred
GMC:
Virtual Numbers:
Call Provider:
Keyword intelligence:
AI recommendations:
Content engine:

Finish with:

PHASE 7 STATUS

Keywords implemented: YES/NO
Store keyword mapping implemented: YES/NO
Geo grid implemented: YES/NO
Provider abstraction implemented: YES/NO
Real rank acquisition implemented: YES/NO
Historical observations implemented: YES/NO
Competitor intelligence implemented: YES/NO
Top-3/Top-10 metrics verified: YES/NO
Scheduled scans implemented: YES/NO
Cost controls implemented: YES/NO
RLS verified: YES/NO
Cross-brand isolation verified: YES/NO
Cross-tenant isolation verified: YES/NO
No synthetic rank data verified: YES/NO
Existing phases preserved: YES/NO
Ready for Phase 8: YES/NO



8______________________________________________________________

# LOCALBI — PHASE 8
## GOOGLE MERCHANT CENTER + LOCAL PRODUCT INVENTORY
## PRODUCTS + STORE INVENTORY + FEED SYNC + DIAGNOSTICS

Act as a Principal SaaS Architect, Staff TypeScript Engineer,
Google Merchant Center Integration Engineer,
PostgreSQL/Prisma Architect, E-commerce Feed Architect,
Background Job Engineer, Multi-Tenant Security Engineer,
Local SEO / Local Commerce Platform Architect and Next.js Engineer.

Phases 0–7 are assumed complete.

EXPECTED CURRENT FOUNDATION:

Tenant
  ↓
Brand
  ↓
├── Stores
├── Categories
├── Products
├── StoreProduct
├── GBP Mapping
├── WebSurface
├── Domains
├── PageTemplates
├── GA4 / GSC
├── Attribution / Leads
└── Rank Tracking

NOW IMPLEMENT PHASE 8 ONLY:

Brand Catalog
    ↓
Products
    ↓
StoreProduct
    ↓
Merchant Center Mapping
    ↓
Product Feed
    ↓
Local Inventory
    ↓
Google Merchant Center
    ↓
Diagnostics / Status
    ↓
LocalBi Commerce Dashboard

DO NOT IMPLEMENT YET:

- virtual phone numbers
- telephony provider integration
- advanced AI recommendations
- AI product-content generation
- CRM
- blog automation
- citation management
- paid campaign management
- review AI
- automated price optimization

===========================================================
0. CORE BUSINESS REQUIREMENT
===========================================================

LocalBi must be able to answer:

"Which products are successfully available in Google Merchant Center,
for which stores, and what is wrong with any rejected products?"

Example:

Aalim Perfumes

Products:
400

Merchant Center:
Connected

Approved:
348

Pending:
24

Disapproved:
18

Not Submitted:
10


Store:
Mannadi

Products available:
120

Local inventory synced:
116

Errors:
4


Royal Oud

Base Price:
₹2,499

Mannadi:
₹2,399
Available

T Nagar:
₹2,499
Available

Anna Nagar:
Unavailable

Merchant Status:
Approved

Local Inventory:
Mannadi ✓
T Nagar ✓
Anna Nagar Not Available

All Merchant data must derive from real LocalBi relational catalog data.

===========================================================
1. VERIFY CURRENT GOOGLE MERCHANT CENTER APIS FIRST
===========================================================

Before implementing application code:

review CURRENT official Google Merchant Center documentation.

Do NOT rely on:

old Content API tutorials
old blog posts
old Stack Overflow answers
previous prompts
deprecated Merchant Center API assumptions

Verify current supported APIs for:

- Merchant account discovery/access
- Merchant account metadata
- product data
- data sources / feeds
- local inventory
- regional inventory if applicable
- product status
- issue diagnostics
- store codes
- business information
- supplemental data if relevant
- batch capabilities
- pagination
- write/update semantics
- quotas
- OAuth scopes
- account linking
- subaccounts / MCA structure if supported

Produce:

MERCHANT API CONTRACT REPORT

Account API:
Product API:
Data source/feed API:
Local inventory API:
Diagnostics API:
OAuth scope:
Pagination:
Batch behavior:
Deprecated APIs avoided:

Do not implement an endpoint until its current official contract is verified.

===========================================================
2. RE-AUDIT CURRENT LOCALBI CODE
===========================================================

Inspect CURRENT:

- Product
- Category
- StoreProduct
- Store
- Brand
- ExternalResource
- ResourceMapping
- Integration
- Google OAuth
- Google account discovery
- sync queue
- sync workers
- Store codes
- SKU
- GTIN
- MPN
- brand/manufacturer fields
- price
- currency
- availability
- images
- product URLs
- shipping fields
- tax fields
- Merchant Center IDs
- any existing GMC code

Search for:

merchant
gmc
shopping
content api
merchant api
productInput
localInventory
feed
offerId
gtin
mpn
condition
availability
storeCode
googleProductCategory
productType

Produce:

PHASE 8 PRE-FLIGHT

Existing Merchant integration:
Existing Product feed fields:
Existing storeCode:
Existing SKU strategy:
Existing inventory strategy:
Existing product URLs:
Existing image strategy:
Existing Google account resources:
Existing GMC tables:
Existing workers:
Existing mocks:

Classify:

KEEP
EXTEND
REFACTOR
REPLACE
MISSING

===========================================================
3. PRESERVE EXISTING PRODUCT SOURCE OF TRUTH
===========================================================

Merchant Center must NOT become LocalBi's primary product database.

Canonical source remains:

Brand
  ↓
Product
  ↓
StoreProduct

Merchant Center is an external publication channel.

Correct:

LocalBi DB
   ↓
Merchant mapping
   ↓
Google Merchant Center

Incorrect:

Google Merchant Center
   ↓
overwrite LocalBi Product
as canonical product management system

Provider sync snapshots may be stored separately.

===========================================================
4. MERCHANT RESOURCE MAPPING
===========================================================

Extend existing Google resource architecture.

Do not create a parallel OAuth system.

Expected relationship:

Integration / GoogleConnection
     ↓
ExternalResource
     ↓
Merchant Account
     ↓
ResourceMapping
     ↓
Brand

Merchant account mapping is generally Brand-level.

Local inventory then references Store.

Do NOT map a Merchant account directly to every Store independently unless
the API/product model truly requires it.

===========================================================
5. ACCOUNT DISCOVERY
===========================================================

Discover accessible Merchant accounts using verified current API.

Support:

- one account
- multiple accounts
- manager/multi-client account structures if current API exposes them

Discovery only means:

Google user has access.

It does NOT mean:

LocalBi Brand is automatically mapped.

Require explicit mapping.

===========================================================
6. MERCHANT ACCOUNT MAPPING UI
===========================================================

UX:

Google Merchant Center

Connected account:
marketing@aalimperfumes.com

Accessible accounts:

○ Aalim Perfumes
  Merchant ID: ...

○ LP Retail
  Merchant ID: ...

Map to Brand:

Aalim Perfumes

[Confirm Mapping]

Never choose by matching Brand name alone.

===========================================================
7. PRODUCT ELIGIBILITY MODEL
===========================================================

Not every Product is ready for Merchant Center.

Implement deterministic validation.

Possible required fields depending on product type/current API:

- title
- description
- image
- price
- currency
- availability
- link
- condition
- brand
- GTIN / MPN where applicable
- Google product category if applicable

Do not hardcode old required-field assumptions.

Validate against current provider requirements.

Create:

MerchantEligibilityService

that returns:

READY
MISSING_REQUIRED_DATA
UNSUPPORTED
NOT_PUBLISHED

with issues.

===========================================================
8. PRODUCT MERCHANT SETTINGS
===========================================================

Avoid stuffing every Google-specific field directly into Product if it is
provider-specific.

Potential model:

ProductMerchantConfig

tenantId
brandId
productId

enabled

googleProductCategory?
productType?
condition?
gtin?
mpn?

customLabel0?
...
where genuinely required

But first check which attributes belong canonically to Product itself.

Example:

GTIN
may be a real product attribute independent of Google.

Do not duplicate canonical fields.

===========================================================
9. STORE CODE
===========================================================

Local inventory requires deterministic Store identity.

Every participating Store needs a stable Merchant-compatible store code.

Do not use Store name.

Example:

CHE-MAN-01

Requirements:

stable
unique within Merchant/Brand scope
immutable after active synchronization unless migration performed

Store rename must NOT silently change storeCode.

===========================================================
10. OFFER ID / PRODUCT IDENTITY
===========================================================

Merchant offer/product identity must be stable.

Do NOT derive offer ID solely from mutable Product name.

Prefer stable deterministic identifiers:

SKU
or
LocalBi immutable product ID mapped to provider identifier

Define exact identity strategy.

Changing Product title should not create accidental duplicate Merchant
products.

===========================================================
11. PRODUCT URLS
===========================================================

Merchant product link should resolve to the correct published LocalBi page.

Potential:

https://locate.aalimperfumes.com/products/royal-oud

or store-specific page if provider/feed architecture requires it.

Only submit:

published
canonical
publicly accessible

URLs.

Do NOT submit:

builder preview URLs
localhost
/site/internal routes
draft pages
unverified domains

===========================================================
12. IMAGE URLS
===========================================================

Merchant product images must use stable public URLs.

Do not submit:

local filesystem
temporary signed preview URL
localhost
private asset URL

Use existing ProductMedia/public asset architecture.

Validate image availability before submission when feasible.

===========================================================
13. PRICE RESOLUTION
===========================================================

Global product feed:

use canonical Product base pricing according to provider model.

Local inventory:

use StoreProduct.priceOverride when present.

Existing Phase 2 price resolver remains canonical.

Rule:

effectiveStorePrice =
StoreProduct.priceOverride
else
Product.basePrice

Do not reimplement price resolution inside Merchant worker.

===========================================================
14. AVAILABILITY RESOLUTION
===========================================================

Product-level global availability and local store availability are distinct.

Local inventory:

StoreProduct.isAvailable
quantity where used

Product being globally ACTIVE does not mean every Store has stock.

Map internal availability to current Merchant-supported enum values through
one adapter.

===========================================================
15. INVENTORY QUANTITY
===========================================================

If Merchant local inventory currently supports quantity:

map StoreProduct quantity appropriately.

If quantity is not required/currently unsupported:

do not invent unsupported fields.

Keep LocalBi quantity internally.

===========================================================
16. PRODUCT FEED ARCHITECTURE
===========================================================

Do NOT submit products synchronously when admin loads Product page.

Architecture:

Product change
    ↓
mark merchant state DIRTY
    ↓
queue
    ↓
Merchant Sync Worker
    ↓
Google API
    ↓
update local sync snapshot

Support:

single product sync
bulk product sync
scheduled reconciliation

===========================================================
17. SYNC STATE
===========================================================

Per product mapping, track explicit state:

NOT_ENABLED
QUEUED
SYNCING
SUBMITTED
PROCESSING
APPROVED
DISAPPROVED
ERROR
STALE
REMOVAL_PENDING
REMOVED

Do not treat API HTTP 200 submission as:

APPROVED.

Submission and approval are different.

===========================================================
18. PRODUCT MAPPING / SNAPSHOT MODEL
===========================================================

Create normalized provider state.

Conceptually:

MerchantProductMapping

tenantId
brandId
productId
merchantAccountResourceId

externalProductId / offerId
status

lastSubmittedAt
lastSuccessfulSyncAt
lastCheckedAt

providerStatus
providerIssues

Do not duplicate full Product data unnecessarily.

===========================================================
19. LOCAL INVENTORY MODEL
===========================================================

Track provider-local-inventory state separately.

Concept:

MerchantLocalInventoryState

tenantId
brandId
storeId
productId
merchantProductMappingId

storeCode

submittedAvailability
submittedPrice
submittedQuantity?

status

lastSubmittedAt
lastCheckedAt

Use current API requirements.

===========================================================
20. LOCAL INVENTORY SYNC
===========================================================

Flow:

StoreProduct changed
        ↓
Merchant eligibility check
        ↓
Product must exist in Merchant
        ↓
Resolve Store Code
        ↓
Resolve effective price
        ↓
Resolve availability
        ↓
Queue local inventory update
        ↓
Provider confirmation
        ↓
Local sync state

Do not send inventory for unpublished products.

===========================================================
21. INVENTORY REMOVAL
===========================================================

If StoreProduct becomes unavailable:

follow current Merchant API semantics.

Do not simply delete the Product globally.

Only update/remove the Store's local inventory state.

Global Product and Store Inventory are different.

===========================================================
22. PRODUCT DEACTIVATION
===========================================================

If Product becomes globally unpublished/inactive:

stop new local inventory updates as appropriate.

Queue Merchant product removal or disable operation according to provider
semantics.

Preserve historical sync records.

===========================================================
23. DIAGNOSTICS
===========================================================

Ingest Merchant product issues/diagnostics where available.

Examples conceptually:

Missing GTIN
Invalid image
Price mismatch
Landing page unavailable
Policy issue

Do not fabricate interpretations.

Store:

issue code
severity
affected attribute
provider message
first seen
last seen

if supported.

===========================================================
24. ISSUE SEVERITY
===========================================================

Normalize provider issue severity carefully.

Potential normalized states:

INFO
WARNING
ERROR
DISAPPROVAL

Only if current API provides sufficient semantics.

Always retain provider issue code/source.

===========================================================
25. MERCHANT DIAGNOSTICS UI
===========================================================

Dashboard:

Merchant Center

Products Submitted     382
Approved               348
Pending                 16
Disapproved             18

Local Inventory Stores   8
Inventory Errors          4

Issues:

Missing GTIN          7
Image problems        3
Landing page errors   2
Price mismatch        6

Use real provider issue data.

===========================================================
26. PRODUCT TABLE
===========================================================

Columns:

Product
SKU
Eligibility
Merchant Status
Stores
Inventory Status
Issues
Last Sync

Filters:

Approved
Pending
Disapproved
Not submitted
Has issues
Store
Category

===========================================================
27. PRODUCT DETAIL VIEW
===========================================================

Merchant tab:

Merchant Account
Offer ID
Eligibility
Submission Status
Provider Status
Issues

Local Inventory:

Store
Price
Availability
Quantity
Provider Status
Last Sync

Do not mix editable Product source fields with provider state confusingly.

===========================================================
28. BULK OPERATIONS
===========================================================

Support:

Enable Merchant for selected Products
Queue Sync
Retry Failed
Disable Merchant

Bulk actions must:

authorize
validate
batch
queue

Do not call provider sequentially from browser.

===========================================================
29. SYNC JOB TYPES
===========================================================

Potential BullMQ jobs:

MERCHANT_PRODUCT_SYNC
MERCHANT_PRODUCT_DELETE
MERCHANT_INVENTORY_SYNC
MERCHANT_DIAGNOSTIC_SYNC
MERCHANT_FULL_RECONCILE

Avoid one giant worker function.

===========================================================
30. JOB PAYLOAD SECURITY
===========================================================

Job payload may include:

tenantId
connectionId
merchantResourceId
productMappingId
storeId where relevant

Worker must re-read DB and revalidate:

tenant
mapping
connection
product status

Never trust stale queued payload blindly.

===========================================================
31. TOKEN REVOCATION
===========================================================

Before provider call:

Google connection must be ACTIVE.

If:

REVOKED
EXPIRED
REQUIRES_REAUTH

abort safely.

Mark sync state appropriately.

Do NOT report product as disapproved because auth expired.

===========================================================
32. IDEMPOTENCY
===========================================================

Repeated product sync with same current product version must not create
duplicate products.

Use stable offer ID.

Use deterministic BullMQ job keys where possible.

===========================================================
33. PRODUCT VERSION / DIRTY CHECK
===========================================================

Avoid resubmitting unchanged products unnecessarily.

Potential:

merchantPayloadHash

generated from canonical outbound payload.

If unchanged since last successful submission:

skip unnecessary provider write.

Do not include volatile fields like timestamp in hash.

===========================================================
34. RECONCILIATION
===========================================================

Scheduled reconciliation should compare:

LocalBi expected state

vs

Merchant provider state.

Detect:

missing product
stale status
inventory mismatch
provider issue changes

Do not blindly re-upload entire catalog every run.

===========================================================
35. PROVIDER RATE LIMITING
===========================================================

Handle:

429
5xx
timeout

with:

bounded retry
exponential backoff
jitter if existing queue conventions support it

Do not retry permanent validation failures endlessly.

===========================================================
36. PARTIAL BATCH FAILURE
===========================================================

If 100 products queued:

90 successful
10 fail

preserve 90 successes.

Report 10 failures.

Do not roll entire sync back.

===========================================================
37. ERROR TYPES
===========================================================

Normalize:

VALIDATION_ERROR
AUTH_ERROR
QUOTA_ERROR
PROVIDER_ERROR
NOT_FOUND
CONFIGURATION_ERROR

Do not display all as:

"Merchant sync failed"

when more precise safe information exists.

===========================================================
38. ZERO ≠ FAILURE
===========================================================

No products configured:

NOT_CONFIGURED

No eligible products:

NO_ELIGIBLE_PRODUCTS

Provider error:

UPSTREAM_ERROR

Do not show:

0 approved

as if a successful feed with zero products.

===========================================================
39. PRODUCT DATA PROVENANCE
===========================================================

Merchant state comes from:

GOOGLE_MERCHANT_CENTER

Catalog state comes from:

LOCALBI

Keep distinction.

Example:

LocalBi price:
₹2,399

Last submitted Merchant price:
₹2,399

Provider observed/status:
Approved

Do not overwrite canonical Product with provider echo unless explicitly
designed.

===========================================================
40. PRICE MISMATCH
===========================================================

If Merchant reports a price mismatch:

show:

LocalBi current price
Last submitted price
Provider issue

Do NOT auto-change LocalBi Product price to match Google.

===========================================================
41. STORE INVENTORY DASHBOARD
===========================================================

Example:

Mannadi

LocalBi Products: 120
Merchant Enabled: 116
Synced: 112
Errors: 4

Table:

Product
Effective Price
Availability
Quantity
Merchant Status
Issue
Last Sync

===========================================================
42. BRAND MERCHANT DASHBOARD
===========================================================

Show:

Account
Connection Status
Products
Approval %
Issues
Inventory Stores
Last Reconciliation

Do not calculate fake approval percentages when provider status is stale.

===========================================================
43. SUBSCRIPTION / QUOTA
===========================================================

If LocalBi has subscription limits:

support:

merchant products
stores
sync frequency

Do not hardcode pricing tiers.

===========================================================
44. RLS
===========================================================

Every new tenant table must include:

tenantId

ENABLE ROW LEVEL SECURITY
FORCE ROW LEVEL SECURITY

Likely:

MerchantProductMapping
MerchantLocalInventoryState
MerchantProductIssue

or equivalents.

Test:

Tenant A cannot access Tenant B Merchant state.

===========================================================
45. AUTHORIZATION
===========================================================

Add/reuse capabilities:

MERCHANT_VIEW
MERCHANT_MANAGE
MERCHANT_SYNC

Viewer:
read-only

Authorized editor/admin:
enable/sync

Only appropriate roles can modify Merchant mappings.

===========================================================
46. CROSS-BRAND ISOLATION
===========================================================

Brand A Product cannot be submitted through Brand B Merchant mapping.

Store A inventory cannot use Brand B Product.

Verify:

tenantId
brandId
productId
storeId
merchant mapping

all align.

===========================================================
47. ACCOUNT REMAPPING
===========================================================

If Brand changes Merchant account mapping:

do not silently reuse old external product IDs.

Require deliberate migration/reconciliation.

Retain historical provider state.

===========================================================
48. STORE CODE VALIDATION
===========================================================

Before local inventory sync:

Store must have valid merchant store identity according to current API.

If missing:

CONFIGURATION_REQUIRED

Do not fail entire Brand sync.

===========================================================
49. PRODUCT IDENTIFIER VALIDATION
===========================================================

Where product identifiers such as GTIN are required:

validate structure.

Do not generate fake GTINs.

If product legitimately has no GTIN under provider rules:

follow current Merchant guidance.

Do not invent values merely to pass validation.

===========================================================
50. PRODUCT CATEGORY
===========================================================

Keep separate:

LocalBi Category

vs

Google Product Category

They are not necessarily identical.

Map via Merchant config when required.

Do not overwrite LocalBi category taxonomy.

===========================================================
51. SHIPPING
===========================================================

Audit current Merchant requirements.

If shipping is Merchant-account level:

do not duplicate shipping configuration on every Product.

If product-specific shipping is required:

model only supported attributes.

Do not build a full shipping engine unless required.

===========================================================
52. TAX
===========================================================

Same principle:

follow current Merchant requirements by country.

Do not hardcode India/US tax assumptions globally.

===========================================================
53. MULTI-COUNTRY
===========================================================

Do not assume:

India
INR
English

Brand merchant config may include:

targetCountry
language
currency

according to provider requirements.

Use current product currency safely.

===========================================================
54. DATA SOURCE / FEED MODE
===========================================================

Current Merchant architecture may support:

API-managed product inputs
data sources
feeds

Determine current recommended method from official docs.

Use one canonical LocalBi publishing approach.

Do not implement multiple overlapping submission paths without reason.

===========================================================
55. LOCAL INVENTORY PROGRAM ELIGIBILITY
===========================================================

Verify current Google requirements for local inventory features.

Do not show:

"Local inventory enabled"

until required account/store configuration is actually satisfied.

Use:

CONFIGURATION_REQUIRED

when prerequisites are missing.

===========================================================
56. GBP STORE LINKAGE
===========================================================

Local inventory may require Google store identities linked to Merchant
configuration.

Reuse existing GBP Store mapping where it is valid.

Do NOT create duplicate Store identities purely for Merchant Center if one
canonical Store exists.

But do not assume GBP ResourceMapping alone satisfies every Merchant API
requirement.

Validate prerequisites.

===========================================================
57. PUBLIC PRODUCT PAGE CONSISTENCY
===========================================================

Merchant product URL must show:

same product
same price semantics
same availability semantics

as submitted data.

Avoid feed/page mismatches.

PageContext should use canonical Product/StoreProduct source.

===========================================================
58. NO LIVE MERCHANT API ON PUBLIC PAGE
===========================================================

Public product page:

LocalBi DB
→ PageContext
→ SSR

Never:

public request
→ Merchant API

Merchant is a publication channel, not website runtime dependency.

===========================================================
59. ANALYTICS INTEGRATION
===========================================================

Merchant performance analytics, if available later, must remain provider
specific.

Phase 8 focuses on:

catalog publication
inventory
status
diagnostics

Do not fake Shopping performance using GA4.

===========================================================
60. OBSERVABILITY
===========================================================

Log:

tenantId
brandId
productId
storeId if relevant
merchant mapping
operation
duration
provider status
retry

Never log:

access token
refresh token
private customer information
full credentials

===========================================================
61. QUERY KEYS
===========================================================

Centralize TanStack Query keys.

Conceptually:

merchantKeys.account(...)
merchantKeys.products(...)
merchantKeys.product(...)
merchantKeys.inventory(...)
merchantKeys.issues(...)

No scattered random query arrays.

===========================================================
62. UI ARCHITECTURE
===========================================================

Suggested feature module:

features/merchant/
├── account
├── products
├── inventory
├── diagnostics
├── components
├── hooks
└── api

Avoid giant page components.

===========================================================
63. TEST — SAME PRODUCT MULTIPLE STORES
===========================================================

Royal Oud:

Product:
basePrice = 2499

Mannadi:
override = 2399
available = true

T Nagar:
override = null
available = true

Anna Nagar:
available = false

Expected Merchant local inventory:

Mannadi:
2399 / available

T Nagar:
2499 / available

Anna Nagar:
unavailable

Only one canonical Product.

===========================================================
64. TEST — PRODUCT TITLE CHANGE
===========================================================

Product name changes.

Offer ID remains stable.

No duplicate Merchant product created.

===========================================================
65. TEST — STORE NAME CHANGE
===========================================================

Store display name changes.

Store code remains stable.

Local inventory continues using same provider store identity.

===========================================================
66. TEST — PRODUCT DISABLED
===========================================================

Product marked unpublished.

Expected:

Merchant sync queued according to configured removal/disable semantics.

Do not leave stale enabled product indefinitely.

===========================================================
67. TEST — PRICE OVERRIDE
===========================================================

StoreProduct override changes:

2399 → 2299

Only affected local inventory update is queued.

Do not resubmit entire catalog unnecessarily.

===========================================================
68. TEST — AUTH REVOKED
===========================================================

Sync queued.

Google OAuth revoked before worker executes.

Expected:

job aborts
REAUTH_REQUIRED

Do not classify Product as disapproved.

===========================================================
69. TEST — PROVIDER VALIDATION ERROR
===========================================================

Google rejects missing field.

Expected:

product mapping status reflects validation/config issue.

Issue visible in UI.

Other valid products continue.

===========================================================
70. TEST — TENANT ISOLATION
===========================================================

Tenant A cannot:

read Tenant B Merchant account
sync Tenant B product
read Tenant B diagnostics
read Tenant B local inventory state

RLS required.

===========================================================
71. TEST — CROSS-BRAND
===========================================================

Aalim Product cannot use Lakshmi Food Merchant account.

Request rejected.

===========================================================
72. TEST — DUPLICATE SYNC
===========================================================

Same product payload submitted twice.

No duplicate Merchant product.

===========================================================
73. TEST — UNCHANGED PAYLOAD
===========================================================

Product unchanged since successful sync.

Scheduled reconciliation should avoid unnecessary write where architecture
supports change detection.

===========================================================
74. TEST — PARTIAL BATCH
===========================================================

100 products:

95 success
5 provider validation failures

Result:

95 synchronized
5 actionable errors

No rollback of successful provider writes.

===========================================================
75. TEST — DIAGNOSTIC RECOVERY
===========================================================

Product initially:

DISAPPROVED

User fixes missing image.

Resync.

Provider later approves.

Local issue/status updates without losing historical issue information if
history is retained.

===========================================================
76. REAL DATA ONLY
===========================================================

Search production source for:

fake merchant status
mock approval
dummy GTIN
hardcoded Merchant ID
sample inventory status
Math.random
fake diagnostics

Remove from production paths.

Explicit test fixtures may remain.

===========================================================
77. PERFORMANCE
===========================================================

Do not load 10,000 products into browser at once.

Use:

pagination
server filtering
search
category filter
status filter

Background synchronization must batch responsibly.

Avoid N+1:

Product
→ query each StoreProduct separately

Use relational batch queries.

===========================================================
78. DATABASE INDEXES
===========================================================

Review actual access patterns.

Potential:

MerchantProductMapping:
tenantId + brandId + status
tenantId + productId
merchantResourceId + externalProductId

Inventory:
tenantId + storeId + status
productId + storeId unique

Issues:
tenantId + productMappingId + severity
active/resolved state

Do not duplicate unique index coverage.

===========================================================
79. ISSUE HISTORY
===========================================================

Consider retaining:

firstSeenAt
lastSeenAt
resolvedAt

instead of deleting issues immediately.

Useful for operational history.

Do not over-engineer full audit history unless needed.

===========================================================
80. ACCEPTANCE CRITERIA
===========================================================

Phase 8 is complete only when:

[ ] Current Merchant API contracts verified

[ ] Merchant account discovery implemented

[ ] Explicit Brand mapping implemented

[ ] Product eligibility validation implemented

[ ] Stable offer ID strategy implemented

[ ] Stable Store code strategy implemented

[ ] Product publication implemented

[ ] Local inventory publication implemented

[ ] Store-specific price override respected

[ ] Store-specific availability respected

[ ] Diagnostics synchronized

[ ] Product/provider status separated

[ ] Background sync implemented

[ ] Idempotency verified

[ ] Change detection implemented where appropriate

[ ] Partial batch failures handled

[ ] Reauth safety preserved

[ ] RLS verified

[ ] Cross-brand safety verified

[ ] No provider call on public page

[ ] No synthetic Merchant data

[ ] Existing catalog remains source of truth

===========================================================
81. VERIFICATION
===========================================================

Run:

prisma validate
prisma migrate status

typecheck
lint touched files

Merchant account tests
Product eligibility tests
Product sync tests
Inventory sync tests
price resolution tests
availability tests
diagnostic tests
worker tests
idempotency tests
RLS tests
cross-brand tests
cross-tenant tests

Regression:

Phase 0 Security
Phase 1 WebSurface/Domain
Phase 2 Catalog
Phase 3 Page Engine
Phase 4 Analytics
Phase 5 Attribution
Phase 6 GBP
Phase 7 Rank

production build

===========================================================
82. FINAL REPORT
===========================================================

Return:

# PHASE 8 IMPLEMENTATION REPORT

## Official API verification
Account API:
Product API:
Inventory API:
Diagnostics API:
Deprecated APIs avoided:

## Pre-flight
Existing GMC:
Catalog readiness:
Store codes:
Identifiers:
Workers:

## Account
Discovery:
Mapping:
Authorization:

## Product feed
Eligibility:
Offer ID:
Payload:
Submission:
Removal:
Change detection:

## Local inventory
Store code:
Price:
Availability:
Quantity:
Sync:

## Diagnostics
Statuses:
Issues:
Recovery:
History:

## Workers
Jobs:
Batching:
Idempotency:
Retries:
Reauth:
Partial failures:

## UI
Dashboard:
Products:
Inventory:
Diagnostics:

## Security
RLS:
Cross-brand:
Cross-tenant:
Secrets:

## Performance
Pagination:
Batching:
Indexes:
Provider calls:

## Verification
Prisma:
TypeScript:
Lint:
Tests:
Build:

## Deferred
Virtual numbers:
Telephony:
AI intelligence:
Review AI:
Content engine:
CRM:

Finish with:

PHASE 8 STATUS

Merchant account discovery implemented: YES/NO
Explicit Brand mapping verified: YES/NO
Product eligibility implemented: YES/NO
Product sync implemented: YES/NO
Local inventory implemented: YES/NO
Price overrides verified: YES/NO
Store availability verified: YES/NO
Diagnostics implemented: YES/NO
Stable offer IDs verified: YES/NO
Stable store codes verified: YES/NO
Background synchronization verified: YES/NO
Idempotency verified: YES/NO
Reauth safety verified: YES/NO
RLS verified: YES/NO
Cross-brand isolation verified: YES/NO
Cross-tenant isolation verified: YES/NO
No synthetic Merchant data verified: YES/NO
Existing phases preserved: YES/NO
Ready for Phase 9: YES/NO



9_______________________________________________________________


# LOCALBI — PHASE 9
## VIRTUAL NUMBER MAPPING + CALL TRACKING + TELEPHONY ATTRIBUTION
## INBOUND CALLS + PROVIDER WEBHOOKS + STORE/PAGE ATTRIBUTION

Act as a Principal SaaS Architect, Staff TypeScript Engineer,
Telephony Integration Architect, Webhook Security Engineer,
PostgreSQL/Prisma Architect, Attribution Engineer,
Background Job Engineer, Multi-Tenant Security Engineer
and Next.js Engineer.

Phases 0–8 are assumed complete.

EXPECTED CURRENT FOUNDATION:

Tenant
  ↓
Brand
  ↓
├── Stores
├── WebSurface
├── Domains
├── Dynamic Pages
├── PageContext
├── Products
├── StoreProduct
├── GBP
├── GA4 / GSC
├── Rank Tracking
├── Merchant Center
└── Lead / Attribution Engine

NOW IMPLEMENT PHASE 9 ONLY:

Store
  ↓
Virtual Number
  ↓
Inbound Call
  ↓
Telephony Provider Webhook
  ↓
Call Record
  ↓
Attribution
  ↓
Lead
  ↓
Dashboard

DO NOT IMPLEMENT YET:

- AI call transcription
- AI lead qualification
- call recording intelligence
- outbound dialer
- IVR builder
- contact center
- CRM integrations
- automated follow-up
- SMS automation
- WhatsApp Business API messaging
- advanced call routing rules engine

===========================================================
0. PRIMARY BUSINESS GOAL
===========================================================

A LocalBi client must be able to answer:

"How many real phone calls did LocalBi generate,
from which page, which store, and which source?"

Example:

Aalim Perfumes

LocalBi Website Calls:
482

Mannadi:
183

T Nagar:
142

Anna Nagar:
94

Other:
63

Top Call-Generating Pages:

/chennai/mannadi
83 calls

/chennai/mannadi/royal-oud
47 calls

/chennai/t-nagar
39 calls


Call Sources:

Google Organic
211

Direct
108

GBP
73

Paid
51

Other
39

Calls must remain factually attributable.

Do NOT fabricate caller identity,
duration,
answer state,
recording,
or source.

===========================================================
1. RE-AUDIT CURRENT CALL / PHONE ARCHITECTURE
===========================================================

Before implementing anything inspect CURRENT:

- Store phone fields
- CTA Call components
- AttributionEvent CALL_CLICK
- Lead model
- PageContext
- visitor/session tracking
- webhook infrastructure
- background jobs
- notification framework
- any virtual-number code
- any provider SDK/config
- API routes
- secret storage
- audit logs
- Redis
- rate limiting
- current dashboard metrics

Search for:

tel:
phone
call
virtual number
did
twilio
exotel
tata
knowlarity
plivo
webhook
recording
duration
caller
callee
callSid
callId

Produce:

PHASE 9 PRE-FLIGHT

Current store phone source:
Current call-click tracking:
Current Lead integration:
Current webhook system:
Current telephony provider:
Current secrets:
Current call persistence:
Current routing:
Current notifications:
Current mock data:

Classify:

KEEP
EXTEND
REFACTOR
REPLACE
MISSING

===========================================================
2. VERIFY TELEPHONY PROVIDER FIRST
===========================================================

Do not hardcode implementation around one provider before checking
what provider is actually being used or intended.

Possible examples:

Exotel
Twilio
Tata Tele / Smartflo
Knowlarity
Plivo
other provider

Determine:

- number provisioning API
- webhook events
- incoming call event format
- call status events
- answer/completion events
- duration fields
- caller/callee fields
- forwarding/routing support
- recording support
- webhook signing/verification
- retries
- event IDs
- rate limits
- account model
- number ownership model

Produce:

TELEPHONY PROVIDER CONTRACT REPORT

Provider:
Number API:
Webhook API:
Signature verification:
Call lifecycle events:
Retry behavior:
Unique event/call identifiers:
Recording support:
Deprecated APIs avoided:

If no provider has been selected:

build provider abstraction first.

===========================================================
3. PROVIDER ABSTRACTION
===========================================================

Do not scatter provider-specific code across LocalBi.

Create conceptual interface:

TelephonyProvider

Methods such as:

listNumbers()
getNumber()
provisionNumber()
releaseNumber()
configureForwarding()
verifyWebhook()
normalizeWebhookEvent()
getCallDetails()

Only implement capabilities supported by selected provider.

Provider-specific modules must remain isolated.

===========================================================
4. VIRTUAL NUMBER MODEL
===========================================================

Create canonical VirtualNumber model.

Conceptually:

VirtualNumber

id
tenantId
brandId

provider
providerNumberId

phoneNumber
countryCode

status:
AVAILABLE
RESERVED
ACTIVE
SUSPENDED
RELEASED
ERROR

forwardingNumber?

assignedStoreId?
assignedWebSurfaceId?

createdAt
activatedAt?
releasedAt?
updatedAt

Do not blindly copy fields.

Follow current project conventions.

===========================================================
5. NUMBER OWNERSHIP
===========================================================

A VirtualNumber belongs to exactly one Tenant.

It may be assigned to:

Brand
Store
WebSurface

depending on product rules.

Recommended first model:

Store-specific number

Example:

Mannadi Store
→ +91-44-XXX-XXXX

This creates simple, reliable attribution.

Do not reuse same active virtual number across unrelated tenants.

===========================================================
6. STORE NUMBER ASSIGNMENT
===========================================================

Target relationship:

Store
  ↓
VirtualNumber

Store may have:

real destination number
+
LocalBi tracking number

Call flow:

Customer
  ↓
LocalBi Virtual Number
  ↓
Provider
  ↓
Store's Real Phone Number

Do not replace canonical Store phone in DB with provider number.

Keep separate:

Store.phone
= real business number

VirtualNumber.phoneNumber
= tracking number

===========================================================
7. DISPLAY NUMBER RESOLUTION
===========================================================

LocalBi public pages should show:

virtual number

only when active tracking configuration exists.

Otherwise:

fallback to Store real phone.

Centralize this logic.

Example:

resolvePublicPhone(store, webSurface)

Do not hardcode phone selection in Puck CallCTA.

===========================================================
8. PAGE CONTEXT INTEGRATION
===========================================================

PageContext should expose:

displayPhone
trackingNumberId if safe
storeId
pageId
webSurfaceId

Call CTA uses PageContext.

Do not let Puck templates store phone numbers.

===========================================================
9. NUMBER PROVISIONING
===========================================================

If provider supports number provisioning API:

Admin
  ↓
Search/Choose Number
  ↓
Provision
  ↓
Assign Store
  ↓
Configure Forwarding
  ↓
ACTIVE

Never mark ACTIVE until provider confirms.

If provider does NOT allow API provisioning:

support MANUAL_PROVIDER_NUMBER mode.

Do not fake automated provisioning.

===========================================================
10. NUMBER ASSIGNMENT UI
===========================================================

Example:

Store: Mannadi

Real Phone:
+91 98401 55667

Tracking Number:
+91 44 4123 4567

Provider:
Exotel

Status:
Active

Forwarding:
+91 98401 55667

[Change Number]
[Disable Tracking]

Do not expose provider credentials.

===========================================================
11. STABLE NUMBER MAPPING
===========================================================

Once assigned and in use:

do not rotate number casually.

Historical call attribution depends on stable mapping.

Number reassignment must preserve history.

===========================================================
12. CALL MODEL
===========================================================

Create canonical Call model.

Conceptually:

Call

id
tenantId
brandId
storeId?
webSurfaceId?
pageId?
productId?

virtualNumberId

provider
providerCallId

direction:
INBOUND

callerNumber?
destinationNumber?

status:
INITIATED
RINGING
ANSWERED
COMPLETED
MISSED
BUSY
FAILED
CANCELLED

startedAt
answeredAt?
endedAt?

durationSeconds?
talkDurationSeconds?

recordingUrl?
only if supported and policy allows

attributionSessionId?
leadId?

createdAt
updatedAt

Do not invent fields provider cannot supply.

===========================================================
13. CALL EVENT MODEL
===========================================================

Telephony providers often send multiple lifecycle webhooks.

Do NOT overwrite raw lifecycle blindly.

Use:

Call
+
CallEvent

Conceptually:

CallEvent

id
tenantId
callId

providerEventId
eventType
occurredAt
payloadHash
createdAt

Store minimal normalized event information.

Raw provider payload only if justified and protected.

===========================================================
14. WEBHOOK SECURITY
===========================================================

This is critical.

Every telephony webhook must be verified using the provider's supported
mechanism.

Potential:

HMAC signature
shared secret
signed headers
IP allowlist where provider supports it

Do NOT trust:

provider=twilio

in request body.

Do NOT accept unsigned webhook payloads if provider supports signature
verification.

===========================================================
15. WEBHOOK ENDPOINT
===========================================================

Use provider-specific or normalized endpoint.

Example:

POST /api/webhooks/telephony/[provider]

Flow:

request
  ↓
verify signature
  ↓
parse provider event
  ↓
normalize
  ↓
idempotency check
  ↓
resolve VirtualNumber
  ↓
derive tenant/store
  ↓
upsert Call
  ↓
append CallEvent
  ↓
attribution
  ↓
optional Lead creation

===========================================================
16. NEVER TRUST TENANT FROM WEBHOOK BODY
===========================================================

Provider payload does NOT decide LocalBi tenant ownership.

Correct:

called virtual number
or
provider number ID
    ↓
VirtualNumber
    ↓
Tenant
    ↓
Brand
    ↓
Store

Tenant context is derived server-side.

===========================================================
17. WEBHOOK IDEMPOTENCY
===========================================================

Provider webhooks may retry.

Same event can arrive multiple times.

Use stable:

providerEventId

or deterministic payload hash/business identity where needed.

Duplicate webhook:

must not duplicate:

Call
Lead
CallEvent

===========================================================
18. OUT-OF-ORDER EVENTS
===========================================================

Provider may deliver:

COMPLETED

before:

ANSWERED

or retry older events later.

Implement state transition logic.

Do not blindly apply last-arriving event.

Use:

event timestamp
status precedence
provider lifecycle semantics

===========================================================
19. CALL STATE MACHINE
===========================================================

Define valid transitions.

Example:

INITIATED
  ↓
RINGING
  ↓
ANSWERED
  ↓
COMPLETED

Alternative:

RINGING
→ MISSED

RINGING
→ BUSY

INITIATED
→ FAILED

Do not allow invalid transition:

COMPLETED
→ RINGING

unless provider documentation justifies correction.

===========================================================
20. CALL DURATION
===========================================================

Keep separate where provider supports:

total duration
talk duration

Example:

total:
60 seconds

talk:
43 seconds

Do not label ring time as talk duration.

===========================================================
21. MISSED CALL
===========================================================

A missed call is operationally important.

Status:

MISSED

should not automatically equal:

qualified lead

but may create a Lead according to product policy.

Keep attribution separate from qualification.

===========================================================
22. CALL LEAD CREATION POLICY
===========================================================

Define deterministic policy.

Recommended initial:

ANSWERED / COMPLETED inbound call
→ create/update CALL Lead

MISSED inbound call
→ create CALL Lead with status NEW
if product wants follow-up

Document exact rule.

Do not create multiple Leads for lifecycle events of same call.

===========================================================
23. LINK CALL TO ATTRIBUTION EVENT
===========================================================

Phase 5 already records:

CALL_CLICK

This is browser intent.

Phase 9 records:

real inbound phone call.

These are different.

Do not assume every CALL_CLICK became a real Call.

Do not assume every real Call has a CALL_CLICK.

===========================================================
24. DYNAMIC NUMBER ATTRIBUTION
===========================================================

If one Store has one fixed tracking number:

Store attribution is reliable.

But Page-level attribution requires more.

Possible future:

session-based Dynamic Number Insertion.

Do NOT implement complex DNI automatically unless architecture/provider
supports it.

Phase 9 first version may support:

Store-level virtual number attribution

plus browser CALL_CLICK for page-level intent.

If implementing DNI:

explicitly separate it as optional advanced mode.

===========================================================
25. OPTIONAL DNI MODEL
===========================================================

If implemented:

Visitor Session
  ↓
Temporary Number Assignment
  ↓
Page / Source
  ↓
Inbound Call

Potential:

DynamicNumberSession

tenantId
virtualNumberId
visitorSessionId
pageId
assignedAt
expiresAt

But only implement if number pool/provider capacity supports it.

Do not fake page-level certainty without DNI.

===========================================================
26. ATTRIBUTION CONFIDENCE
===========================================================

Store how call attribution was determined.

Examples:

STORE_NUMBER
SESSION_DNI
CALL_CLICK_CORRELATED
MANUAL

Do not present all attribution as equally certain.

===========================================================
27. CALL CLICK CORRELATION
===========================================================

Potential heuristic:

CALL_CLICK
+
same store
+
same session
+
short time window
+
inbound call

may help correlate.

But do not claim deterministic page attribution unless identity supports it.

Use confidence/source field.

===========================================================
28. PHONE PRIVACY
===========================================================

Caller phone number is PII.

Do not expose it in:

analytics event tables
GA4
logs
browser telemetry

Call table/Lead may store it when legitimately required.

Admin UI may mask:

+91 ******1234

for roles without full PII permission.

===========================================================
29. CALLER NUMBER NORMALIZATION
===========================================================

Normalize phone numbers using a proper phone-number strategy.

Prefer E.164 where possible.

Do not build manual:

replace(" ", "")

as complete phone validation.

Use existing phone utility/library if available.

===========================================================
30. RECORDING
===========================================================

Only support call recordings if:

provider supports them
customer enables them
legal/consent requirements are handled

Do not enable recording by default.

Do not expose recording URLs publicly.

Store protected provider reference/URL.

===========================================================
31. RECORDING ACCESS
===========================================================

If implemented:

require explicit permission:

CALL_RECORDING_VIEW

Use authenticated proxy or signed provider access if needed.

Do not store publicly accessible recording URL in frontend JSON.

===========================================================
32. NUMBER STATUS
===========================================================

Use explicit states:

AVAILABLE
PROVISIONING
ACTIVE
SUSPENDED
RELEASE_PENDING
RELEASED
ERROR

Do not display:

Active

while provider provisioning is pending.

===========================================================
33. NUMBER RELEASE
===========================================================

Releasing a tracking number must be deliberate.

Before release:

warn about:

active website usage
store mapping
call attribution impact

Historical Calls remain linked to old VirtualNumber record.

Do not delete history.

===========================================================
34. DESTINATION NUMBER CHANGE
===========================================================

If Store real phone changes:

update forwarding configuration.

Keep tracking number stable where possible.

Provider update must confirm before showing success.

===========================================================
35. PROVIDER FAILURE
===========================================================

If forwarding update fails:

retain last known provider config.

Show:

Provider update failed

Do not change LocalBi display state to a config not actually active.

===========================================================
36. CALL DASHBOARD
===========================================================

Add:

Calls

Summary:

Total Calls
Answered
Missed
Avg Talk Duration
Unique Callers where policy permits

Filters:

Date
Brand
Store
WebSurface
Status
Source

Do not use fake numbers.

===========================================================
37. CALL TABLE
===========================================================

Columns:

Time
Caller
Store
Page if known
Product if known
Source
Status
Duration
Lead Status

PII masking according to permission.

===========================================================
38. STORE CALL DASHBOARD
===========================================================

Example:

Mannadi

Total Calls: 183
Answered: 142
Missed: 41
Answer Rate: 77.6%
Avg Talk Time: 2m 31s

Do not mix:

CALL_CLICK

with:

real Calls.

Show separately when useful.

===========================================================
39. CALL VS CLICK FUNNEL
===========================================================

Useful report:

Call CTA Clicks:
600

Actual Tracked Calls:
482

Do not imply difference means failure.

Reasons may include:

user abandons
desktop/device behavior
direct dialing
repeat calls
call blocking

Label clearly.

===========================================================
40. LEAD INTEGRATION
===========================================================

Call can create/link one Lead.

Lead type:

CALL

Lead attribution includes:

tenant
brand
surface
store
page/product if confidently known
source
campaign
callId

Do not duplicate Lead per webhook event.

===========================================================
41. CALL STATUS → LEAD STATUS
===========================================================

Do NOT tightly couple telephony state with CRM lead state.

Call:

COMPLETED

does not automatically mean Lead:

CONVERTED.

Lead status remains business workflow.

===========================================================
42. SOURCE ATTRIBUTION
===========================================================

Where browser/session attribution exists:

Google Organic
Google Ads
Direct
Referral
LocalBi internal source

preserve it.

If unknown:

UNKNOWN / DIRECT as appropriate.

Do not invent source based on caller phone.

===========================================================
43. GBP CALLS VS LOCALBI CALLS
===========================================================

GBP performance metric:

call actions from Google Business Profile

is different from:

real calls received through LocalBi tracking number

and different from:

LocalBi CALL_CLICK.

Keep three sources distinct.

===========================================================
44. TELEPHONY DATA PROVENANCE
===========================================================

Every Call must record:

provider
providerCallId
VirtualNumber

so debugging remains possible.

Do not strip provider provenance.

===========================================================
45. WEBHOOK AUDIT
===========================================================

Log:

provider
event type
provider event ID
verification success/failure
call ID
duration processing
status

Do NOT log:

raw caller phone
full webhook payload
recording URL
secrets

unless protected diagnostic mode exists.

===========================================================
46. WEBHOOK RATE LIMIT
===========================================================

Do not apply generic user-facing rate limit that blocks legitimate provider
burst events.

Use webhook-specific security:

signature verification
provider-specific throttling
idempotency

===========================================================
47. WEBHOOK REPLAY PROTECTION
===========================================================

If provider signature includes timestamp:

enforce reasonable age window.

Prevent replay when supported.

===========================================================
48. RLS
===========================================================

Every new tenant-owned table:

VirtualNumber
Call
CallEvent
DynamicNumberSession if created

must include:

tenantId

ENABLE ROW LEVEL SECURITY
FORCE ROW LEVEL SECURITY

Cross-tenant tests mandatory.

===========================================================
49. AUTHORIZATION
===========================================================

Add/reuse:

CALL_VIEW
CALL_MANAGE_NUMBERS
CALL_EXPORT
CALL_RECORDING_VIEW

Viewer:
maybe aggregate/read-only according to product policy

Only authorized admins can:

assign numbers
change forwarding
release numbers
view unmasked PII
export calls

===========================================================
50. CROSS-BRAND PROTECTION
===========================================================

Brand A number cannot be assigned to Brand B Store.

Store A cannot use Tenant B number.

Enforce:

tenant
brand
store
virtualNumber

alignment.

===========================================================
51. EXPORT
===========================================================

Optional CSV:

Date
Caller
Store
Status
Duration
Source
Lead Status

Must be:

tenant scoped
filter scoped
permission protected

Protect against spreadsheet formula injection.

===========================================================
52. NOTIFICATIONS
===========================================================

If notification framework exists:

Missed Call

may create internal notification.

Example:

Missed call
Mannadi
+91 ******1234

Do not implement SMS/email automation deeply yet.

===========================================================
53. CALLBACK WORKFLOW
===========================================================

Allow operational flag:

Needs Callback

or rely on Lead status.

Do not build full call-center ticketing system.

===========================================================
54. NUMBER POOL
===========================================================

If provider returns purchasable/available number inventory:

do not load all numbers into DB permanently.

Query/cache provider inventory briefly.

Only persist:

provisioned/reserved LocalBi numbers.

===========================================================
55. PROVIDER CREDENTIALS
===========================================================

Credentials must remain server-side.

Use:

environment / encrypted secret infrastructure

Never:

frontend
Puck JSON
public APIs
logs

===========================================================
56. BACKGROUND JOBS
===========================================================

Use BullMQ for operations that may take time:

NUMBER_PROVISION
NUMBER_RELEASE
FORWARDING_UPDATE
CALL_DETAILS_RECONCILE
RECORDING_FETCH if later needed

Webhook ingestion itself should remain fast.

===========================================================
57. WEBHOOK RESPONSE TIME
===========================================================

Provider may require quick 2xx.

Webhook flow:

verify
normalize
persist minimal state
enqueue heavy work
respond

Do not perform slow analytics/report generation synchronously.

===========================================================
58. RECONCILIATION
===========================================================

Scheduled reconciliation may verify:

active numbers
provider configuration
missing call-finalization events

Use provider call lookup sparingly.

Do not refetch all historical calls each run.

===========================================================
59. STUCK CALL
===========================================================

If Call remains:

RINGING

for hours due to missing webhook:

reconciliation may query provider and finalize state.

Do not silently leave impossible active calls forever.

===========================================================
60. INDEXES
===========================================================

Likely:

VirtualNumber:
tenantId + brandId
phoneNumber unique/provider scoped
storeId + status

Call:
tenantId + startedAt
tenantId + storeId + startedAt
tenantId + status + startedAt
provider + providerCallId unique

CallEvent:
callId + occurredAt
providerEventId unique/provider scoped

Do not create redundant indexes.

===========================================================
61. PERFORMANCE
===========================================================

Call dashboard should query aggregates efficiently.

Avoid:

each Store
→ separate call count query

Use grouped aggregation.

Paginate detailed call lists.

===========================================================
62. CACHE
===========================================================

Do not heavily cache live call lists.

Short cache acceptable for aggregate dashboards.

Never globally cache PII call results.

Cache keys include:

tenant
brand
store
surface
date range

===========================================================
63. NORMALIZED DTOS
===========================================================

Create:

VirtualNumberDto
CallDto
CallSummaryDto
StoreCallSummaryDto

Do not expose raw provider payload.

===========================================================
64. ERROR STATES
===========================================================

Number:

NOT_CONFIGURED
PROVISIONING
ACTIVE
PROVIDER_ERROR
SUSPENDED

Calls:

No calls
Provider disconnected
Webhook unhealthy

These are distinct.

===========================================================
65. WEBHOOK HEALTH
===========================================================

Track provider webhook health where practical:

lastWebhookAt
lastVerifiedEventAt
recent failures

Dashboard may show:

Telephony Connected
Webhook healthy

or:

No provider events received recently

Do not infer outage solely from low call volume.

===========================================================
66. NO MOCK CALL DATA
===========================================================

Search production source for:

fake calls
dummy phone numbers
Math.random duration
sample missed calls
mock caller IDs
hardcoded call totals

Remove from production paths.

Explicit tests/fixtures may remain.

===========================================================
67. TEST — INBOUND ANSWERED CALL
===========================================================

Provider sends:

RINGING
ANSWERED
COMPLETED

Expected:

one Call

status = COMPLETED

duration correct

one Lead according to configured rule

events preserved.

===========================================================
68. TEST — MISSED CALL
===========================================================

RINGING
→ MISSED

Expected:

one Call
MISSED

lead/notification according to defined policy.

===========================================================
69. TEST — DUPLICATE WEBHOOK
===========================================================

Same COMPLETED event delivered 3 times.

Expected:

one Call
one normalized event
one Lead

No duplication.

===========================================================
70. TEST — OUT OF ORDER
===========================================================

COMPLETED event arrives before ANSWERED retry.

Final Call remains:

COMPLETED.

===========================================================
71. TEST — CROSS-TENANT WEBHOOK TAMPERING
===========================================================

Payload includes fake tenantId.

Ignore it.

Tenant determined through VirtualNumber.

===========================================================
72. TEST — UNKNOWN NUMBER
===========================================================

Webhook references number not registered in LocalBi.

Do not attach to arbitrary Tenant.

Log safe orphan event / reject according to architecture.

===========================================================
73. TEST — NUMBER REASSIGNMENT
===========================================================

Historical Call belongs to old Store.

Number later reassigned according to supported policy.

Old Call must remain linked to original historical Store.

Do not retroactively change attribution.

===========================================================
74. TEST — STORE PHONE CHANGE
===========================================================

Destination phone changes.

Virtual tracking number remains same.

Forwarding provider update succeeds.

Public page still shows virtual number.

===========================================================
75. TEST — FORWARDING FAILURE
===========================================================

Provider rejects forwarding update.

Local configured state must not falsely claim new destination is active.

===========================================================
76. TEST — CALL CLICK WITHOUT REAL CALL
===========================================================

User clicks CALL CTA.

No provider Call occurs.

Expected:

CALL_CLICK AttributionEvent exists.

No real Call row created.

===========================================================
77. TEST — REAL CALL WITHOUT CALL CLICK
===========================================================

Caller dials tracking number manually.

Expected:

real Call exists.

No fake browser event required.

===========================================================
78. TEST — PII MASKING
===========================================================

Unauthorized Viewer:

masked caller number.

Authorized role:

full number only if policy permits.

===========================================================
79. TEST — RECORDING SECURITY
===========================================================

If recordings enabled:

unauthorized user cannot access URL/content.

===========================================================
80. TEST — RLS
===========================================================

Tenant A cannot:

read Tenant B calls
read Tenant B numbers
modify Tenant B forwarding
view Tenant B caller PII.

===========================================================
81. ACCEPTANCE CRITERIA
===========================================================

Phase 9 is complete only when:

[ ] Telephony provider contract verified

[ ] Provider abstraction implemented

[ ] VirtualNumber model implemented

[ ] Store mapping implemented

[ ] Tracking number displayed dynamically

[ ] Store real phone preserved separately

[ ] Webhook signature verification implemented

[ ] Tenant ownership derived server-side

[ ] Webhook idempotency implemented

[ ] Call model implemented

[ ] CallEvent lifecycle implemented

[ ] Out-of-order event handling implemented

[ ] Answered calls tracked

[ ] Missed calls tracked

[ ] Duration handled correctly

[ ] Call Leads linked correctly

[ ] CALL_CLICK separated from real Call

[ ] Store attribution verified

[ ] Page/Product attribution uses confidence-aware strategy

[ ] PII isolation implemented

[ ] Number provisioning supported if provider permits

[ ] Forwarding updates verified

[ ] Number release preserves history

[ ] Call dashboard implemented

[ ] Store call dashboard implemented

[ ] RLS verified

[ ] Cross-brand isolation verified

[ ] Cross-tenant isolation verified

[ ] No synthetic call data

===========================================================
82. VERIFICATION
===========================================================

Run:

prisma validate
prisma migrate status

typecheck
lint touched files

provider adapter tests
webhook signature tests
webhook idempotency tests
call lifecycle tests
out-of-order event tests
virtual-number tests
forwarding tests
Lead integration tests
PII tests
RLS tests
cross-brand tests
cross-tenant tests

Regression:

Phase 0 Security
Phase 1 WebSurface
Phase 2 Catalog
Phase 3 Page Engine
Phase 4 Analytics
Phase 5 Attribution
Phase 6 GBP
Phase 7 Rank
Phase 8 Merchant

production build

===========================================================
83. FINAL REPORT
===========================================================

Return:

# PHASE 9 IMPLEMENTATION REPORT

## Provider contract
Provider:
Number provisioning:
Webhook signing:
Call lifecycle:
Retries:
Recording:

## Pre-flight
Existing phone fields:
Existing CALL_CLICK:
Existing leads:
Existing webhook infrastructure:

## Virtual numbers
Model:
Provisioning:
Store mapping:
Forwarding:
Release:

## Calls
Call model:
Events:
State machine:
Duration:
Missed calls:

## Webhooks
Verification:
Replay protection:
Idempotency:
Out-of-order handling:

## Attribution
Store:
WebSurface:
Page:
Product:
Confidence:

## Lead integration
Answered call:
Missed call:
Deduplication:

## Privacy
Caller PII:
Masking:
Logging:
Recordings:

## UI
Number management:
Call dashboard:
Store call dashboard:
Lead linkage:

## Security
RLS:
Authorization:
Cross-brand:
Cross-tenant:

## Performance
Indexes:
Aggregations:
Reconciliation:
Webhook latency:

## Verification
Prisma:
TypeScript:
Lint:
Tests:
Build:

## Deferred
DNI advanced attribution:
Call transcription:
AI call intelligence:
IVR:
Outbound dialer:
CRM:
SMS automation:

Finish with:

PHASE 9 STATUS

Provider integration verified: YES/NO
Virtual numbers implemented: YES/NO
Store mapping implemented: YES/NO
Webhook verification implemented: YES/NO
Webhook idempotency verified: YES/NO
Call lifecycle implemented: YES/NO
Answered/missed calls verified: YES/NO
Store attribution verified: YES/NO
Page attribution confidence implemented: YES/NO
Lead integration verified: YES/NO
PII isolation verified: YES/NO
RLS verified: YES/NO
Cross-brand isolation verified: YES/NO
Cross-tenant isolation verified: YES/NO
No synthetic call data verified: YES/NO
Existing phases preserved: YES/NO
Ready for Phase 10: YES/NO




10_____________________________________________________


# LOCALBI — PHASE 10
## KEYWORD INTELLIGENCE + SEO OPPORTUNITY ENGINE
## FACTUAL SIGNALS + EXPLAINABLE RECOMMENDATIONS + PRIORITIZATION

Act as a Principal SaaS Architect, Staff TypeScript Engineer,
Local SEO Intelligence Architect, Search Data Engineer,
PostgreSQL/Prisma Architect, Analytics Engineer,
Recommendation Systems Engineer, Multi-Tenant Security Engineer
and Next.js Engineer.

Phases 0–9 are assumed complete.

EXPECTED CURRENT FOUNDATION:

Tenant
  ↓
Brand
  ↓
├── Stores
├── Products
├── Categories
├── StoreProduct
├── WebSurface
├── Domains
├── PageTemplates
├── Dynamic Pages
├── GBP
├── GSC
├── GA4
├── LocalBi Attribution
├── Leads
├── Rank Tracking
├── Merchant Center
└── Call Tracking

NOW IMPLEMENT PHASE 10 ONLY:

Raw Provider Signals
    ↓
Normalized Search Signals
    ↓
Keyword Intelligence
    ↓
Entity/Page Coverage
    ↓
Opportunity Detection
    ↓
Evidence
    ↓
Priority
    ↓
Recommended Action
    ↓
Human Review
    ↓
Task / Workflow

DO NOT IMPLEMENT YET:

- AI-written blogs
- automatic SEO edits
- automatic Puck publishing
- automatic GBP posting
- automatic review replies
- automatic product edits
- autonomous campaign execution
- autonomous pricing
- CRM workflow automation
- citation submission
- backlink automation

===========================================================
0. PRIMARY PRODUCT GOAL
===========================================================

LocalBi must be able to answer:

"What should this business improve next,
based on real search, ranking, page, store,
product and conversion data?"

Example:

Aalim Perfumes — Mannadi

Opportunity:
"oud perfume chennai"

Evidence:
- GSC impressions: 12,480
- GSC clicks: 318
- CTR: 2.55%
- Local grid Top-3 coverage: 18%
- Average found local rank: 8.4
- GBP search-term impressions: strong
- Existing landing page: YES
- Page conversions: 41
- Product availability: 6 relevant products
- Store relevance: high

Recommended action:
Improve existing Mannadi Oud category/store landing page.

Reason:
Strong demand + weak local visibility + existing conversion value.

Do NOT produce:

"SEO Score = 93"

unless LocalBi has a transparent,
documented formula.

Every recommendation must show:

WHAT
WHY
EVIDENCE
AFFECTED ENTITY
EXPECTED TYPE OF IMPROVEMENT

Do not promise ranking increases.

===========================================================
1. RE-AUDIT CURRENT INTELLIGENCE DATA FIRST
===========================================================

Before writing any implementation:

inspect CURRENT:

GSC data
GBP search terms
Rank keywords
Rank observations
GA4 page reports
LocalBi page analytics
PageContext
Page records
SEO configs
Products
Categories
Stores
StoreProduct
Reviews
Leads
Calls
Merchant diagnostics
Brand/WebSurface
existing suggestions
existing alerts
notifications
tasks
analytics DTOs

Search for:

keyword
query
searchTerm
opportunity
recommendation
suggestion
issue
alert
score
priority
position
ctr
impression
conversion
pageType
seo
metadata
missing
optimization

Produce:

PHASE 10 PRE-FLIGHT

Current keyword sources:
Current page signals:
Current rank signals:
Current conversion signals:
Current GBP signals:
Current product/store signals:
Current SEO metadata:
Current issue/recommendation model:
Current tasks/notifications:
Current duplicate scoring logic:

Classify:

KEEP
EXTEND
REFACTOR
REPLACE
MISSING

Do not create a duplicate recommendation system.

===========================================================
2. NEVER MIX PROVIDER MEANING
===========================================================

Preserve source semantics.

GSC_QUERY:
website search query data.

GBP_SEARCH_TERM:
Google Business Profile search-term data.

LOCAL_RANK_KEYWORD:
explicit geo-grid rank observation.

GA4:
website behavioral analytics.

LOCALBI_EVENT:
LocalBi first-party interaction/conversion.

GBP_REVIEW:
review/reputation data.

MERCHANT:
product feed/diagnostic data.

Do NOT convert one source into another.

Example forbidden:

GBP search term
→ display as GSC query.

GSC average position
→ display as local map rank.

CALL_CLICK
→ display as real phone call.

All opportunity evidence must retain provenance.

===========================================================
3. NORMALIZED SEARCH SIGNAL MODEL
===========================================================

Build a normalized read model/service.

Do not necessarily create one giant physical table if current DB
architecture can compose efficiently.

Conceptually:

SearchSignal {
  tenantId
  brandId
  storeId?
  webSurfaceId?

  keywordId?
  normalizedTerm

  source:
    GSC
    GBP
    LOCAL_RANK

  dateRange

  metrics
  provenance
}

Examples:

GSC:
impressions
clicks
ctr
averagePosition

GBP:
searchImpressions / provider-supported metric

LOCAL_RANK:
averageFoundRank
top3Coverage
top10Coverage
foundCoverage

Do not invent common metrics where sources differ.

===========================================================
4. CANONICAL KEYWORD IDENTITY
===========================================================

Phase 7 already has Keyword.

Reuse it as the canonical Keyword entity.

Build mappings from:

GSC query
GBP search term
manual keyword
rank keyword

to Keyword where deterministic.

Do not duplicate:

"perfume shop near me"
"Perfume Shop Near Me"
" perfume shop near me "

as separate terms after normalization.

But do NOT merge semantically distinct terms automatically.

===========================================================
5. KEYWORD NORMALIZATION
===========================================================

Use the existing normalization rules from Phase 7.

At minimum:

trim
Unicode normalization
case-normalized comparison
collapse whitespace

Do not stem aggressively.

Do not automatically merge:

"perfume shop"
with
"perfume shops"

unless explicit keyword clustering later supports it.

===========================================================
6. KEYWORD SOURCE MAPPING
===========================================================

Create normalized provenance mapping.

Conceptually:

KeywordSignalSource

keywordId
source
sourceIdentifier
storeId?
webSurfaceId?
firstSeenAt
lastSeenAt

Examples:

Keyword:
oud perfume chennai

sources:
GSC query
GBP search term
Rank tracking

This lets LocalBi understand evidence convergence.

===========================================================
7. OPPORTUNITY MODEL
===========================================================

Create a canonical Opportunity model.

Conceptually:

Opportunity

id
tenantId
brandId

storeId?
webSurfaceId?
pageId?
productId?
categoryId?
keywordId?

type

status:
OPEN
IN_REVIEW
ACCEPTED
DISMISSED
COMPLETED
STALE

priority

title
summary

detectedAt
lastEvaluatedAt
resolvedAt?

ruleId
ruleVersion

Do not store the entire recommendation only as free text.

===========================================================
8. OPPORTUNITY EVIDENCE
===========================================================

Every Opportunity requires evidence.

Conceptually:

OpportunityEvidence

id
tenantId
opportunityId

source

metric
value
comparisonValue?
dateRange

entityType
entityId?

capturedAt

Examples:

GSC impressions = 12,480
CTR = 2.55%
Top-3 coverage = 18%
Conversions = 41

Do not create recommendation without supporting evidence.

===========================================================
9. OPPORTUNITY TYPES
===========================================================

Keep the first version focused.

Potential:

HIGH_IMPRESSIONS_LOW_CTR
HIGH_DEMAND_LOW_RANK
HIGH_CONVERSION_LOW_VISIBILITY
MISSING_RELEVANT_LANDING_PAGE
WEAK_STORE_PAGE
WEAK_PRODUCT_PAGE
GBP_PROFILE_INCOMPLETE
UNANSWERED_REVIEWS
MERCHANT_PRODUCT_ISSUE
LOCAL_RANK_DECLINE
SEARCH_DEMAND_GROWTH
PRODUCT_DEMAND_NO_STORE_AVAILABILITY
PAGE_WITH_TRAFFIC_NO_CONVERSIONS
PAGE_WITH_CONVERSIONS_LOW_TRAFFIC

Only implement types supported by available data.

Do not invent opportunities based on unavailable signals.

===========================================================
10. RULE ENGINE
===========================================================

Implement deterministic rules first.

Create:

OpportunityRule

or code-based rule registry.

Each rule must have:

id
version
name
requiredSignals
evaluate()
evidenceBuilder()
recommendedActionType

Do not hide business logic across React components.

===========================================================
11. RULE VERSIONING
===========================================================

This is important.

A recommendation created under:

LOW_CTR_RULE v1

must remain explainable after rule changes.

Store:

ruleId
ruleVersion

with Opportunity.

Do not rewrite historical rationale silently.

===========================================================
12. NO BLACK-BOX SCORE
===========================================================

Do NOT create arbitrary:

SEO Health Score
Local Visibility Score
Optimization Score

unless formula is explicitly defined.

If priority is calculated:

store component scores and formula.

Example conceptual:

priority =
demandWeight
× visibilityGap
× conversionValue
× confidence

But do not copy this formula blindly.

Use transparent normalized components.

===========================================================
13. PRIORITY MODEL
===========================================================

Need practical sorting.

Recommended categories:

CRITICAL
HIGH
MEDIUM
LOW

or numeric priority with transparent factors.

Potential factors:

search demand
visibility gap
conversion value
business relevance
data confidence
trend severity

Every factor must have a defined meaning.

===========================================================
14. CONFIDENCE
===========================================================

Opportunity should expose confidence.

Example:

HIGH:
multiple independent data sources agree.

MEDIUM:
one strong source.

LOW:
limited data.

Do not present low-confidence inference as fact.

Conceptually:

confidence:
HIGH
MEDIUM
LOW

and list supporting sources.

===========================================================
15. HIGH IMPRESSIONS + LOW CTR RULE
===========================================================

Example:

GSC:

impressions high
CTR materially below appropriate comparison
page exists

Potential opportunity:

Improve title/meta/search-result relevance.

Do NOT use one universal:

CTR < 3% = bad

rule.

CTR depends on:

position
query type
brand/non-brand
page type

Use defensible comparisons.

At minimum account for average position bands.

===========================================================
16. HIGH DEMAND + LOW LOCAL RANK
===========================================================

Example:

Keyword appears strongly in:

GBP search terms
GSC
or rank tracking priority

but:

Top-3 grid coverage is low.

Opportunity:

Improve local relevance / store landing coverage.

Evidence must show both:

demand
visibility gap.

===========================================================
17. HIGH CONVERSION + LOW VISIBILITY
===========================================================

This is high-value.

Example:

Royal Oud page:

strong conversion rate

but:

GSC impressions low
local rank weak.

Opportunity:

Increase discovery of proven-converting page/product.

Do not estimate revenue unless actual revenue data exists.

===========================================================
18. HIGH TRAFFIC + LOW CONVERSION
===========================================================

Example:

Store page:

high sessions
high impressions
few calls/WhatsApp/forms.

Opportunity:

Review page intent/CTA/store information.

Do not say:

"Page is bad"

as a factual conclusion.

Say:

"High traffic but low tracked action rate."

===========================================================
19. MISSING LANDING PAGE
===========================================================

Example:

Keyword:
"oud perfume chennai"

strong demand.

Current entity coverage:

No relevant category/store/product landing page.

Opportunity:

Create or improve targeted landing page.

Important:

Do NOT auto-create the page in Phase 10.

Human reviews recommendation first.

===========================================================
20. PAGE COVERAGE ENGINE
===========================================================

Create service:

PageCoverageService

Input:

keyword
store
brand
category/product context

Output:

matching existing pages
page types
coverage confidence

Do not use only:

page title contains keyword.

Use structured Page/PageContext relationships where possible.

===========================================================
21. STORE COVERAGE
===========================================================

For local keywords:

determine whether appropriate Store/City pages exist.

Example:

"perfume shop mannadi"

Relevant existing:

STORE Mannadi page.

If not:

opportunity may exist.

Do not create duplicate landing pages if equivalent one already exists.

===========================================================
22. PRODUCT COVERAGE
===========================================================

Keyword may map to:

Product
Category
StoreProduct

Use relational catalog.

Example:

"oud perfume"

may relate to:

Category: Oud

and multiple Products.

Do not create a new Product based only on search demand.

===========================================================
23. ENTITY RELEVANCE
===========================================================

First version should use factual mappings:

Category
Product
Store
Page
Keyword

Avoid unrestricted LLM semantic classification as source of truth.

Optional semantic assistance can come later.

===========================================================
24. TREND DETECTION
===========================================================

Detect changes based on comparable windows.

Examples:

GSC impressions:
last 28 days vs prior 28 days

Rank:
last run vs meaningful historical baseline

Conversions:
current vs previous period

Avoid comparing unequal periods.

===========================================================
25. RANK DECLINE OPPORTUNITY
===========================================================

Example:

keyword Top-3 coverage:

60%
→ 32%

over validated comparable grid configuration.

Opportunity:

Local visibility decline.

Do NOT compare:

5x5 / 3km

against:

9x9 / 10km

as if same grid.

Grid configuration/version must match.

===========================================================
26. SEARCH DEMAND GROWTH
===========================================================

Example:

GSC/GBP demand rises materially.

Opportunity:

Growing search demand.

Need minimum volume threshold to avoid noise.

Do not claim "trend" from tiny sample.

===========================================================
27. GBP PROFILE OPPORTUNITIES
===========================================================

Use factual profile completeness from Phase 6.

Potential:

missing hours
missing phone
missing description
missing relevant attribute

Do not create arbitrary score.

Evidence:

field missing.

===========================================================
28. REVIEW OPPORTUNITIES
===========================================================

Examples:

unanswered reviews
new negative reviews
response rate decline

Phase 10 should detect.

Do NOT generate/publish AI responses yet.

Action:

Review and respond.

===========================================================
29. MERCHANT OPPORTUNITIES
===========================================================

Examples:

high-demand Product
+
Merchant disapproval

or:

StoreProduct available locally
+
not successfully synced to Merchant.

Opportunity:

Fix Merchant issue.

Use actual diagnostic evidence.

===========================================================
30. CALL / LEAD SIGNALS
===========================================================

Use real Phase 5/9 conversion data.

Examples:

Store page produces many calls.

Keyword/page has strong lead rate.

This can increase priority.

Do not assume CALL_CLICK = actual Call.

Use them as distinct metrics.

===========================================================
31. BUSINESS VALUE SIGNAL
===========================================================

Priority can consider:

Lead volume
actual Calls
Forms
Bookings

if available.

Do not estimate monetary value unless configured.

===========================================================
32. RECOMMENDED ACTION TYPES
===========================================================

Create normalized action types.

Examples:

UPDATE_METADATA
IMPROVE_EXISTING_PAGE
CREATE_PAGE
ADD_PRODUCT_TO_STORE
FIX_GBP_PROFILE
RESPOND_TO_REVIEWS
FIX_MERCHANT_PRODUCT
INVESTIGATE_RANK_DECLINE
IMPROVE_CTA
ADD_KEYWORD_TRACKING

Opportunity UI should know action type.

===========================================================
33. RECOMMENDATION TEXT
===========================================================

Recommendation text should be generated from structured evidence.

Example:

"Improve the Mannadi Oud landing page because the keyword
'oud perfume chennai' generated 12,480 GSC impressions,
has 18% Top-3 grid coverage, and this page produced 41
tracked conversions in the selected period."

Do not include numbers that are not in evidence.

===========================================================
34. OPTIONAL LLM ASSISTANCE
===========================================================

If an LLM is introduced at all during Phase 10:

it may rewrite/explain structured recommendation text.

It must NOT:

invent evidence
change metrics
change priority
autonomously publish changes
create facts

Structured deterministic rule engine remains source of truth.

===========================================================
35. OPPORTUNITY DEDUPLICATION
===========================================================

Do not generate same opportunity daily.

Use deterministic identity.

Concept:

tenant
ruleId
entity
keyword
surface/store

Existing open opportunity:

update evidence
lastEvaluatedAt

rather than create duplicates.

===========================================================
36. OPPORTUNITY STALENESS
===========================================================

If underlying condition disappears:

mark:

STALE
or RESOLVED

according to workflow.

Do not leave outdated recommendations forever.

===========================================================
37. HUMAN WORKFLOW
===========================================================

Status:

OPEN
IN_REVIEW
ACCEPTED
DISMISSED
COMPLETED
STALE

Support:

Dismiss
Accept
Mark Complete

Do not auto-execute recommendations.

===========================================================
38. DISMISSAL
===========================================================

Allow dismissal reason optionally:

Not relevant
Already addressed
Business decision
Incorrect mapping

Useful for later rule tuning.

Do not immediately regenerate identical dismissed opportunity unless
evidence materially changes or cooldown expires.

===========================================================
39. TASK INTEGRATION
===========================================================

If LocalBi already has task/notification concepts:

accepted Opportunity may create:

Optimization Task.

If not:

create lightweight Opportunity workflow only.

Do not build full project management software.

===========================================================
40. OPPORTUNITY DASHBOARD
===========================================================

Target:

SEO Opportunities

High Priority          12
Medium                 28
Low                    41

Categories:

Search Visibility
Content/Page
GBP
Reviews
Products
Merchant
Conversions

Cards:

HIGH

Improve Mannadi Oud page

Why:
12.4K impressions
2.5% CTR
18% Top-3 coverage
41 conversions

[Review]

===========================================================
41. OPPORTUNITY DETAIL
===========================================================

Show:

Recommendation
Affected entity
Keyword
Store
Page
Evidence
Data sources
Date range
Priority
Confidence
Suggested action

Never show recommendation without evidence.

===========================================================
42. EVIDENCE UI
===========================================================

Example:

Evidence

Search Console
12,480 impressions
318 clicks
2.55% CTR

Hyper Rank
18% Top-3 coverage
8.4 avg found rank

LocalBi
41 conversions

Sources must remain visibly labeled.

===========================================================
43. BRAND DASHBOARD INTEGRATION
===========================================================

Brand dashboard may show:

Top Opportunities

but do not overwhelm primary analytics.

Keep opportunity engine a dedicated module.

===========================================================
44. STORE DASHBOARD INTEGRATION
===========================================================

Store page:

Optimization Opportunities

Mannadi
4 high priority
7 medium

Use store-scoped opportunities.

===========================================================
45. PRODUCT OPPORTUNITIES
===========================================================

Example:

Royal Oud:

high page conversions
low visibility

or:

high search demand
not available in important Store

Use Product + StoreProduct.

Do not automatically alter inventory.

===========================================================
46. KEYWORD OPPORTUNITY VIEW
===========================================================

Keyword detail:

"perfume shop near me"

Demand
GSC
GBP

Visibility
Rank Grid

Pages
Current landing pages

Conversions

Opportunities

This should become one factual intelligence workspace.

===========================================================
47. DATE WINDOWS
===========================================================

Opportunity rules must use explicit date windows.

Examples:

last 28 days
previous 28 days

rank:
last completed comparable run
vs previous comparable run

Store dateRange with evidence.

===========================================================
48. MINIMUM DATA REQUIREMENTS
===========================================================

Avoid noisy recommendations.

Each rule should define minimum data.

Example:

CTR rule requires minimum impressions.

Conversion rule requires minimum sessions/pageviews.

Trend rule requires sufficient history.

No recommendation when sample is too small.

===========================================================
49. DATA QUALITY
===========================================================

Introduce:

DATA_SUFFICIENT
INSUFFICIENT_DATA
STALE_DATA
SOURCE_UNAVAILABLE

Opportunity engine should skip unsafe evaluation when source is invalid.

Do not treat unavailable provider as zero.

===========================================================
50. PROVIDER FAILURE
===========================================================

If GSC fails:

do not suddenly create:

"Traffic dropped 100%"

opportunity.

Use last-good data only when clearly marked stale,
or skip rule.

===========================================================
51. MAPPING CHANGES
===========================================================

If:

WebSurface mapping
GSC mapping
Store/GBP mapping
Rank grid

changes:

invalidate/re-evaluate relevant opportunities.

Do not compare pre/post mapping data incorrectly.

===========================================================
52. RULE EXECUTION
===========================================================

Use background jobs for full evaluations.

Potential:

OPPORTUNITY_EVALUATE_BRAND
OPPORTUNITY_EVALUATE_STORE
OPPORTUNITY_EVALUATE_KEYWORD

Do not evaluate hundreds of rules on every dashboard page request.

===========================================================
53. INCREMENTAL EVALUATION
===========================================================

When new:

GSC sync
Rank run
GBP sync
Lead
Merchant diagnostic

completes:

queue targeted re-evaluation.

Avoid recomputing entire tenant when one Product changes.

===========================================================
54. JOB IDEMPOTENCY
===========================================================

Prevent duplicate evaluation for same:

tenant
rule
entity
evaluation window

Use deterministic business keys.

===========================================================
55. RULE REGISTRY
===========================================================

Keep rules modular.

Example:

rules/
  high-impressions-low-ctr.rule.ts
  high-demand-low-rank.rule.ts
  high-conversion-low-visibility.rule.ts
  missing-page.rule.ts
  gbp-profile-gap.rule.ts

Do not create one 3,000-line opportunity service.

===========================================================
56. RULE TESTABILITY
===========================================================

Each rule should accept normalized inputs and return:

triggered
priority factors
confidence
evidence
action

Pure logic where practical.

This makes tests deterministic.

===========================================================
57. PRIORITY CALCULATION
===========================================================

Create transparent helper.

Example components:

Demand:
0–1

Visibility Gap:
0–1

Conversion Value:
0–1

Confidence:
0–1

Then derive priority.

But exact formula must be documented and tested.

Do not choose arbitrary weights without product rationale.

===========================================================
58. PRIORITY EXPLANATION
===========================================================

UI should be able to explain:

HIGH

because:

High demand
Large visibility gap
Existing conversion evidence
Multiple sources agree

Not just:

score = 84.

===========================================================
59. NO PREDICTED RANK GUARANTEE
===========================================================

Do not output:

"Fix this and you will rank #1."

Allowed:

"LocalBi detected high search demand and low current visibility."

Recommendations are opportunities,
not guarantees.

===========================================================
60. PAGE ACTION SAFETY
===========================================================

CREATE_PAGE opportunity may deep-link to Page Builder.

UPDATE_METADATA may deep-link to SEO settings.

But:

NO automatic save/publish.

Human review remains mandatory in Phase 10.

===========================================================
61. GBP ACTION SAFETY
===========================================================

FIX_GBP_PROFILE:

opens profile management.

Do not automatically update Google.

RESPOND_TO_REVIEW:

opens review page.

Do not auto-publish response.

===========================================================
62. MERCHANT ACTION SAFETY
===========================================================

Merchant opportunity:

deep-link to Product/diagnostic.

Do not auto-change price/GTIN/inventory.

===========================================================
63. CACHING
===========================================================

Opportunity dashboard may cache.

Cache keys:

tenant
brand
store/surface
filters
evaluation version

Invalidate after:

new evaluation
status update
major signal sync

===========================================================
64. RLS
===========================================================

Every tenant-owned table:

Opportunity
OpportunityEvidence
RuleEvaluation if persisted

must include:

tenantId

ENABLE ROW LEVEL SECURITY
FORCE ROW LEVEL SECURITY

Cross-tenant tests mandatory.

===========================================================
65. AUTHORIZATION
===========================================================

Add/reuse:

OPPORTUNITY_VIEW
OPPORTUNITY_MANAGE

Viewer:
read

Editor/Manager:
accept/dismiss/complete according to current role model.

Do not allow unauthorized users to change workflow state.

===========================================================
66. CROSS-BRAND SAFETY
===========================================================

Brand A opportunity cannot reference:

Brand B page
Brand B store
Brand B product
Brand B keyword

Service-level checks + RLS.

===========================================================
67. EVIDENCE IMMUTABILITY
===========================================================

When opportunity is detected,
capture evidence snapshot.

Later evaluations may add/update current evidence,
but historical accepted/completed decisions should remain explainable.

Do not silently rewrite old evidence values.

===========================================================
68. AUDIT LOGGING
===========================================================

Audit:

Opportunity accepted
dismissed
completed

with:

user
timestamp
entity

Do not audit every rule read.

===========================================================
69. NOTIFICATIONS
===========================================================

Use existing notification framework sparingly.

Examples:

New high-priority opportunity
Major rank decline

Do not generate daily notification spam.

Deduplicate notifications.

===========================================================
70. PERFORMANCE
===========================================================

Do not query:

each keyword
→ each page
→ each store
→ separate provider tables.

Use:

batch queries
pre-aggregated reports
normalized read services

Avoid N+1.

===========================================================
71. INDEXES
===========================================================

Potential:

Opportunity:
tenantId + brandId + status + priority
tenantId + storeId + status
tenantId + keywordId + status
ruleId + entity identity

Evidence:
opportunityId
source

Do not duplicate index coverage.

===========================================================
72. RETENTION
===========================================================

Completed/dismissed opportunities may remain for history.

Do not immediately delete.

Potential future archival policy.

===========================================================
73. ANALYTICS
===========================================================

Track LocalBi product usage:

opportunity viewed
accepted
dismissed
completed

This is internal product analytics.

Do not claim SEO outcome solely because user completed task.

===========================================================
74. OPPORTUNITY OUTCOME
===========================================================

Optional future comparison:

before
vs
after

but Phase 10 should only prepare linkage.

Do not attribute ranking improvement causally without careful analysis.

===========================================================
75. TEST — HIGH DEMAND LOW RANK
===========================================================

Input:

GSC high impressions
GBP strong search presence
rank Top-3 coverage 15%
valid Store page

Expected:

HIGH_DEMAND_LOW_RANK opportunity.

Evidence includes actual inputs.

===========================================================
76. TEST — PROVIDER FAILURE
===========================================================

GSC unavailable.

No fake zero-impression opportunity.

Rule:

skip / stale state.

===========================================================
77. TEST — LOW SAMPLE
===========================================================

10 impressions.

CTR 0%.

Do NOT necessarily create low CTR opportunity
if minimum threshold is not met.

===========================================================
78. TEST — DUPLICATE OPPORTUNITY
===========================================================

Same rule evaluated daily.

One active Opportunity.

Evidence refreshed.

No duplicate card each day.

===========================================================
79. TEST — DISMISSED COOLDOWN
===========================================================

User dismisses.

Next evaluation with unchanged evidence:

do not recreate immediately.

===========================================================
80. TEST — MATERIAL CHANGE
===========================================================

Dismissed opportunity.

Evidence later changes significantly.

System may create/reopen based on explicit rule.

Document behavior.

===========================================================
81. TEST — CROSS-TENANT
===========================================================

Tenant A cannot:

view
modify
evaluate

Tenant B opportunities.

===========================================================
82. TEST — CROSS-BRAND
===========================================================

Opportunity for Brand A cannot reference Brand B Product/Page/Store.

===========================================================
83. TEST — EVIDENCE PROVENANCE
===========================================================

GSC metric remains labeled GSC.

Rank metric remains LOCAL_RANK.

No accidental source conversion.

===========================================================
84. TEST — HIGH CONVERSION LOW VISIBILITY
===========================================================

Page:

high conversions

Rank/GSC:

weak discovery

Expected:

HIGH_CONVERSION_LOW_VISIBILITY.

No revenue amount invented.

===========================================================
85. TEST — MISSING PAGE
===========================================================

Keyword demand strong.

No relevant page.

Expected:

MISSING_RELEVANT_LANDING_PAGE.

If equivalent Page already exists:

do not generate duplicate CREATE_PAGE recommendation.

===========================================================
86. TEST — MERCHANT ISSUE
===========================================================

High-value Product:

Merchant disapproved.

Expected:

Merchant-related opportunity with provider issue evidence.

===========================================================
87. TEST — GBP PROFILE
===========================================================

Store missing hours.

Opportunity generated.

When hours later synchronized:

opportunity becomes resolved/stale.

===========================================================
88. TEST — RANK CONFIG CHANGE
===========================================================

Old grid:
5x5 / 3km

New:
9x9 / 10km

Do not treat difference as rank decline without comparable configuration.

===========================================================
89. TEST — RULE VERSION
===========================================================

Opportunity created under rule v1.

Rule changes to v2.

Old Opportunity still identifies v1.

===========================================================
90. REAL DATA ONLY
===========================================================

Search production paths for:

fake opportunities
sample metrics
Math.random score
hardcoded recommendation counts
demo ranking drops
fake conversion evidence

Remove production fallbacks.

Tests may use explicit fixtures.

===========================================================
91. UI ARCHITECTURE
===========================================================

Suggested:

features/opportunities/
├── components/
├── api/
├── hooks/
├── schemas/
└── types/

modules/opportunities/
├── opportunity-service.ts
├── opportunity-evaluator.ts
├── priority-service.ts
├── evidence-service.ts
└── rules/

Avoid another giant component/service.

===========================================================
92. QUERY KEYS
===========================================================

Centralize:

opportunityKeys.all(...)
opportunityKeys.list(...)
opportunityKeys.detail(...)
opportunityKeys.summary(...)

Filters:

brand
store
type
priority
status
date

===========================================================
93. ACCEPTANCE CRITERIA
===========================================================

Phase 10 is complete only when:

[ ] canonical Keyword reused

[ ] provider provenance preserved

[ ] Opportunity model implemented

[ ] OpportunityEvidence implemented

[ ] deterministic rule registry implemented

[ ] rule versioning implemented

[ ] priority calculation documented

[ ] confidence implemented

[ ] minimum data requirements implemented

[ ] provider-error safety implemented

[ ] opportunity deduplication implemented

[ ] staleness/resolution implemented

[ ] dismissal cooldown implemented

[ ] high-demand/low-rank rule implemented

[ ] high-impressions/low-CTR rule implemented

[ ] high-conversion/low-visibility rule implemented

[ ] missing-page rule implemented

[ ] GBP profile-gap rule implemented

[ ] Merchant issue opportunity implemented where applicable

[ ] evidence UI implemented

[ ] opportunity dashboard implemented

[ ] Store opportunity view implemented

[ ] Keyword opportunity view implemented

[ ] human review required

[ ] no automatic publishing implemented

[ ] RLS verified

[ ] cross-brand isolation verified

[ ] cross-tenant isolation verified

[ ] no synthetic intelligence data

===========================================================
94. VERIFICATION
===========================================================

Run:

prisma validate
prisma migrate status

typecheck
lint touched files

rule tests
priority tests
confidence tests
dedup tests
staleness tests
provider failure tests
minimum-volume tests
opportunity workflow tests
RLS tests
cross-brand tests
cross-tenant tests

Regression:

Phase 0 Security
Phase 1 WebSurface
Phase 2 Catalog
Phase 3 Website Engine
Phase 4 Analytics
Phase 5 Attribution
Phase 6 GBP
Phase 7 Hyper Rank
Phase 8 Merchant
Phase 9 Calls

production build

===========================================================
95. FINAL REPORT
===========================================================

Return:

# PHASE 10 IMPLEMENTATION REPORT

## Pre-flight
Keyword sources:
Search signals:
Conversion signals:
Existing recommendations:

## Intelligence architecture
Keyword normalization:
Signal normalization:
Provenance:
Data quality:

## Opportunity model
Opportunity:
Evidence:
Rule version:
Status lifecycle:

## Rule engine
Rules implemented:
Minimum data:
Failure handling:
Deduplication:
Staleness:

## Priority
Formula:
Factors:
Confidence:
Explanation:

## Opportunity types
Search visibility:
CTR:
Rank:
Page coverage:
Conversions:
GBP:
Merchant:

## UI
Dashboard:
Opportunity detail:
Store view:
Keyword view:
Evidence:

## Workflow
Accept:
Dismiss:
Complete:
Cooldown:

## Safety
No auto-publish:
No fake metrics:
No ranking guarantees:
Human review:

## Security
RLS:
Cross-brand:
Cross-tenant:
Authorization:

## Performance
Batching:
Jobs:
Indexes:
Caching:

## Verification
Prisma:
TypeScript:
Lint:
Tests:
Build:

## Deferred
AI content generation:
AI review responses:
Automated SEO execution:
Blog engine:
Citation management:
CRM automation:

Finish with:

PHASE 10 STATUS

Keyword intelligence implemented: YES/NO
Search signals normalized: YES/NO
Provider provenance preserved: YES/NO
Opportunity engine implemented: YES/NO
Evidence snapshots implemented: YES/NO
Rule versioning implemented: YES/NO
Priority explainability implemented: YES/NO
Confidence implemented: YES/NO
Deduplication verified: YES/NO
Provider-failure safety verified: YES/NO
Human review enforced: YES/NO
No autonomous publishing verified: YES/NO
RLS verified: YES/NO
Cross-brand isolation verified: YES/NO
Cross-tenant isolation verified: YES/NO
No synthetic opportunity data verified: YES/NO
Existing phases preserved: YES/NO
Ready for Phase 11: YES/NO




11__________________________________________________

# LOCALBI — PHASE 11
## CONTENT & GROWTH ENGINE
## BLOG CMS + SEO CONTENT + EDITORIAL WORKFLOW + INTERNAL LINKING
## AI-ASSISTED DRAFTING WITH HUMAN APPROVAL

Act as a Principal SaaS Architect, Staff TypeScript Engineer,
Headless CMS Architect, Local SEO Content Architect,
Next.js SEO Engineer, PostgreSQL/Prisma Architect,
AI Content Workflow Engineer, Multi-Tenant Security Engineer
and Editorial Platform Architect.

Phases 0–10 are assumed complete.

EXPECTED CURRENT FOUNDATION:

Tenant
  ↓
Brand
  ↓
├── Stores
├── Categories
├── Products
├── StoreProduct
├── WebSurface
├── Domain
├── BrandTheme
├── PageTemplate
├── PageContext
├── Dynamic SSR Pages
├── SEO Engine
├── GA4 / GSC
├── GBP
├── Attribution / Leads
├── Hyper Rank
├── Merchant Center
├── Call Tracking
└── Opportunity Engine

NOW IMPLEMENT PHASE 11 ONLY:

Search / Opportunity Signals
        ↓
Content Topic
        ↓
Editorial Brief
        ↓
Article / Blog Draft
        ↓
Human Review
        ↓
SEO Validation
        ↓
Internal Linking
        ↓
Preview
        ↓
Publish
        ↓
Dynamic LocalBi Website
        ↓
Performance Feedback

DO NOT IMPLEMENT YET:

- fully autonomous publishing
- backlink purchasing
- automated citation submissions
- fake reviews
- programmatic mass-spam pages
- uncontrolled keyword stuffing
- AI-generated claims without source support
- AI-generated medical/legal/financial claims
- auto-rewriting every existing page
- CRM campaigns
- email marketing automation
- social media automation
- advanced digital PR

===========================================================
0. PRIMARY PRODUCT GOAL
===========================================================

LocalBi must help a client create useful,
search-friendly content around real business entities and real demand.

Example:

Brand:
Aalim Perfumes

Opportunity Engine detects:

Keyword:
"how to choose oud perfume"

Search demand:
strong

Existing page:
none

Relevant products:
Royal Oud
Amber Oud
Musk Oud

Relevant store:
Mannadi

Recommended Content:

Article:
"How to Choose an Oud Perfume: A Beginner's Guide"

Internal links:

→ Oud Category
→ Royal Oud
→ Mannadi Store
→ Store Locator

Workflow:

Opportunity
   ↓
Create Brief
   ↓
Draft
   ↓
Editor Review
   ↓
Preview
   ↓
Publish
   ↓
Track performance

The system must assist.

It must NOT silently create and publish hundreds of SEO pages.

===========================================================
1. RE-AUDIT CURRENT CONTENT ARCHITECTURE
===========================================================

Before modifying anything inspect CURRENT:

- Page model
- PageTemplate
- template versions
- PageContext
- SEO config
- Product
- Category
- Store
- Opportunity
- Keyword
- GSC
- GBP search terms
- rank data
- existing Blog model
- article routes
- rich text
- Puck content blocks
- media upload
- sitemap
- canonical handling
- internal links
- preview/publish lifecycle
- current AI integration if any

Search:

blog
article
post
content
richText
markdown
editor
slug
seoTitle
metaDescription
author
publishedAt
topic
brief
draft
internalLink
content calendar
AI
generate
rewrite

Produce:

PHASE 11 PRE-FLIGHT

Existing Blog model:
Existing Article model:
Existing editor:
Existing rich-text format:
Existing SEO fields:
Existing publishing workflow:
Existing preview:
Existing Page integration:
Existing AI integration:
Existing media:
Existing sitemap integration:
Existing internal links:

Classify:

KEEP
EXTEND
MIGRATE
REFACTOR
REPLACE
MISSING

Do not create duplicate blog/content systems.

===========================================================
2. CONTENT DOMAIN MODEL
===========================================================

Create or normalize a canonical ContentItem model.

Conceptually:

ContentItem

id
tenantId
brandId
webSurfaceId

type:
ARTICLE
BLOG
GUIDE
FAQ_CONTENT
CUSTOM

title
slug

excerpt?

status:
DRAFT
IN_REVIEW
APPROVED
PUBLISHED
ARCHIVED

authorId?

publishedAt?
scheduledAt?

createdAt
updatedAt

Do not blindly copy exact field names.

Use repository conventions.

===========================================================
3. CONTENT VERSIONING
===========================================================

Do not overwrite published content directly.

Create:

ContentVersion

Conceptually:

id
tenantId
contentItemId

version
content

seoTitle?
seoDescription?

status

createdBy
createdAt
publishedAt?

Published version remains stable while editor creates next draft.

Target:

Published v3
    ↓
Edit
    ↓
Draft v4
    ↓
Review
    ↓
Publish
    ↓
Published v4

Rollback must remain possible.

===========================================================
4. CONTENT STORAGE FORMAT
===========================================================

Choose one canonical structured format.

Potential:

structured rich-text JSON

or

validated Markdown

based on current editor architecture.

Do NOT mix:

HTML
Markdown
Puck JSON
random rich-text JSON

for equivalent article body content without adapters.

Structured format should support:

headings
paragraphs
lists
images
links
quotes
tables where justified
callouts
embedded LocalBi entities

No arbitrary JavaScript.

===========================================================
5. HTML SECURITY
===========================================================

If rich text produces HTML:

sanitize server-side.

Disallow:

<script>
inline event handlers
javascript: URLs
unsafe iframes
unrestricted style injection

External links:

safe rel attributes where appropriate.

===========================================================
6. CONTENT ≠ PUCK TEMPLATE
===========================================================

Keep responsibilities clear.

Puck:
page structure/layout.

ContentItem:
editorial content.

Example:

ARTICLE PageTemplate

BrandHeader
Breadcrumbs
ArticleContent
RelatedProducts
RelatedStores
FAQ
CTA
Footer

ArticleContent retrieves the published ContentItem.

Do not save the full article body inside each Puck template instance.

===========================================================
7. CONTENT PAGE CONTEXT
===========================================================

Extend PageContext safely.

Conceptually:

PageContext {
  ...
  contentItem?
  author?
  relatedProducts?
  relatedCategories?
  relatedStores?
  relatedArticles?
}

Do not fetch article relations independently inside every component.

===========================================================
8. CONTENT ROUTING
===========================================================

Support clean canonical routes.

Examples:

/blog/how-to-choose-oud-perfume

/guides/perfume-shopping-chennai

Exact route architecture should fit Phase 3 page engine.

Do not publish articles under:

/site/foo/blog/...

as canonical production URLs.

===========================================================
9. CONTENT TEMPLATE
===========================================================

Create PageTemplate type(s) if necessary:

ARTICLE
BLOG_INDEX

Potential article layout:

BrandHeader
Breadcrumbs
ArticleHero
ArticleContent
RelatedProducts
RelatedStores
RelatedArticles
CTA
Footer

Do not create unique Puck template per article.

One template should serve many articles.

===========================================================
10. EDITORIAL BRIEF MODEL
===========================================================

Create ContentBrief.

Conceptually:

id
tenantId
brandId

keywordId?
opportunityId?

workingTitle

primaryTopic
primaryKeyword?
secondaryKeywords?

intent

targetAudience?

relatedProductIds?
relatedStoreIds?
relatedCategoryIds?

requiredTopics
notes

status

createdBy
createdAt
updatedAt

A Brief is planning data.

It is not automatically published content.

===========================================================
11. CONTENT OPPORTUNITY INTEGRATION
===========================================================

Phase 10 Opportunity:

MISSING_RELEVANT_LANDING_PAGE
or content opportunity

may offer:

[Create Content Brief]

This should create:

ContentBrief

not a published page.

Human/editorial workflow remains mandatory.

===========================================================
12. SEARCH INTENT
===========================================================

Allow structured intent values where useful:

INFORMATIONAL
COMMERCIAL
LOCAL
TRANSACTIONAL

Do not infer intent with absolute certainty.

If inferred automatically:

record:

source
confidence

Human can modify.

===========================================================
13. KEYWORD USAGE
===========================================================

Primary/secondary keywords guide content.

Do not implement:

keyword density target = 5%

Do not stuff repeated terms automatically.

Focus on:

topic coverage
entity relevance
natural writing
search intent

===========================================================
14. AI ASSISTANCE BOUNDARY
===========================================================

AI may assist with:

- brief generation
- title options
- outline
- first draft
- rewrite selected paragraph
- summarize
- improve clarity
- FAQ suggestions
- meta-title suggestions
- meta-description suggestions

AI must NOT:

publish automatically
invent business facts
invent product prices
invent store details
invent reviews
invent ratings
invent statistics
invent credentials
invent awards
invent provider metrics

===========================================================
15. AI CONTEXT MUST USE REAL DATA
===========================================================

When generating draft:

provide structured LocalBi context only.

Potential:

Brand
Products
Categories
Stores
existing content
target keywords
approved facts
Opportunity evidence

Do not ask AI to guess missing information.

If a requested factual detail is unavailable:

omit it
or flag for editor.

===========================================================
16. FACT BOUNDARY
===========================================================

Build clear factual source context.

Example:

Brand Facts
Store Facts
Product Facts
Review Facts
Search Evidence

AI prompt should explicitly distinguish:

FACTS
EDITORIAL INSTRUCTIONS
OPTIONAL STYLE

This reduces hallucination.

===========================================================
17. GENERATED CONTENT LABEL
===========================================================

Internally track:

origin:
HUMAN
AI_ASSISTED
AI_GENERATED_DRAFT

This is workflow metadata.

Do not necessarily expose public label unless product policy requires it.

===========================================================
18. AI GENERATION AUDIT
===========================================================

Record:

model/provider if relevant
generatedAt
createdBy
briefId
promptVersion
source context identifiers

Do not store unnecessary raw sensitive prompts.

===========================================================
19. AI PROMPT VERSIONING
===========================================================

If LocalBi uses prompt templates:

version them.

Example:

CONTENT_DRAFT_V1

Future generated drafts remain traceable.

Do not spread prompt strings across UI components.

===========================================================
20. AI COST CONTROL
===========================================================

AI generation has cost.

Use:

authorization
subscription limits
rate limits
usage counters

Do not run AI generation automatically on every keystroke.

===========================================================
21. EDITORIAL WORKFLOW
===========================================================

Required lifecycle:

DRAFT
    ↓
IN_REVIEW
    ↓
APPROVED
    ↓
PUBLISHED

Possible:

CHANGES_REQUESTED

Do not allow:

AI Generate
→ immediately PUBLISHED.

===========================================================
22. ROLE PERMISSIONS
===========================================================

Add/reuse:

CONTENT_VIEW
CONTENT_CREATE
CONTENT_EDIT
CONTENT_REVIEW
CONTENT_PUBLISH
CONTENT_ARCHIVE
AI_CONTENT_GENERATE

Potential:

Editor:
create/edit

Reviewer:
approve

Admin:
publish

Follow current role model.

===========================================================
23. CONTENT EDITOR
===========================================================

Build maintainable editing experience.

Target sections:

Title
Slug

Content
SEO
Relations
Internal Links
Publishing

AI assistance may appear as:

Generate Outline
Draft Section
Rewrite Selection
Suggest FAQ

Do not replace human editor with one giant "Generate Article" button only.

===========================================================
24. AUTOSAVE
===========================================================

Draft autosave may be supported.

Use:

debounce
optimistic concurrency/version token

Autosave:

DRAFT only.

Never:

auto-publish.

Show:

Saving
Saved
Conflict
Failed

===========================================================
25. CONCURRENCY
===========================================================

If two users edit same draft:

do not silently overwrite.

Use:

version
updatedAt
etag
or equivalent optimistic concurrency.

Return conflict when stale.

===========================================================
26. SLUG MANAGEMENT
===========================================================

Slug must be:

normalized
stable
unique per WebSurface/content route

Changing published slug should require explicit action.

If changed:

prepare redirect from old canonical path.

Do not silently break indexed URLs.

===========================================================
27. REDIRECT MODEL
===========================================================

If no redirect system exists, create minimal safe routing redirect model.

Conceptually:

Redirect

tenantId
webSurfaceId

fromPath
toPath

status
createdAt

Avoid redirect loops.

Do not create cross-domain redirects without validation.

===========================================================
28. SEO METADATA
===========================================================

Use existing Phase 3 SEO engine.

Article may override:

title
description
canonical
OpenGraph

Do not create separate independent SEO framework.

Inheritance:

Brand
  ↓
Article template
  ↓
Content item
  ↓
Optional explicit override

===========================================================
29. META TITLE VALIDATION
===========================================================

Do not enforce outdated exact character-limit rules as hard SEO truth.

Use usability guidance.

Warn on:

missing
extremely long
duplicate

Do not block publishing solely due to arbitrary character count unless
product rule explicitly chooses that.

===========================================================
30. CANONICAL
===========================================================

Canonical must use:

active verified LocalBi Domain
+
published Content path.

Draft/preview URLs:

noindex.

===========================================================
31. STRUCTURED DATA
===========================================================

Article page may generate:

Article
BreadcrumbList

and relevant FAQPage if actual FAQ exists.

Only output factual fields.

Do not fabricate:

author credentials
ratings
publication organization data

===========================================================
32. AUTHOR MODEL
===========================================================

Audit whether author profiles already exist.

If needed:

ContentAuthor

name
bio
image
role
public profile fields

Tenant scoped where appropriate.

Do not create fake expert biographies through AI.

===========================================================
33. PUBLISH DATES
===========================================================

Track:

publishedAt
updatedAt

accurately.

Do not change:

publishedAt

every time typo is fixed.

Use:

datePublished
dateModified

correctly in structured data.

===========================================================
34. CONTENT INDEX PAGE
===========================================================

Implement dynamic Blog/Insights index.

Supports:

pagination
category/topic
search if useful

Only PUBLISHED content.

No drafts.

===========================================================
35. CONTENT TAXONOMY
===========================================================

Do not reuse Product Category automatically as editorial category.

Potential:

ContentCategory
ContentTag

But avoid unnecessary taxonomy complexity.

A content item may still relate to Product Category separately.

===========================================================
36. RELATED ENTITY RELATIONS
===========================================================

Use relational associations.

Content may relate to:

Product
Category
Store
Keyword

Example:

Article:
How to Choose Oud

related:

Category: Oud
Products: Royal Oud
Store: Mannadi

Do not embed copies of Product/Store records in content JSON.

===========================================================
37. INTERNAL LINKING ENGINE
===========================================================

Create:

InternalLinkService

Sources:

Article
Product
Category
Store
City
other Content

Goal:

suggest relevant internal links.

Do not automatically insert every suggestion.

Editor can review.

===========================================================
38. INTERNAL LINK SUGGESTION
===========================================================

Example:

Article contains topic:

Royal Oud

LocalBi knows:

Product:
Royal Oud

Suggested link:

/products/royal-oud

Store mention:

Mannadi

Suggested:

/chennai/mannadi

Use entity relationships where possible.

Do not rely purely on text replacement.

===========================================================
39. INTERNAL LINK SAFETY
===========================================================

Do not automatically replace every occurrence.

Avoid:

duplicate links
self-links
link spam
incorrect entity matching

Editor approval recommended.

===========================================================
40. BROKEN LINK VALIDATION
===========================================================

Before publish:

validate internal LocalBi links.

Warn on:

404 target
draft target
archived Product
inactive Store
redirect chain where avoidable

===========================================================
41. ORPHAN CONTENT
===========================================================

Detect published content with no internal inbound links where practical.

Opportunity:

Add internal links.

Do not call this a guaranteed SEO problem.

Label factual:

"No LocalBi internal links currently point to this article."

===========================================================
42. RELATED CONTENT
===========================================================

Related Articles can use explicit relations first.

Do not rely on opaque AI-only recommendations.

Potential fallback:

shared ContentCategory
shared Keyword
shared Product/Store relationships.

===========================================================
43. CONTENT CALENDAR
===========================================================

Build editorial calendar.

ContentItem may have:

scheduledAt

Calendar shows:

Draft
Review
Scheduled
Published

Do not actually schedule publish unless publishing scheduler is safely
implemented.

===========================================================
44. SCHEDULED PUBLISHING
===========================================================

If implementing:

BullMQ job

CONTENT_PUBLISH

Before execution revalidate:

content still APPROVED
schedule still valid
WebSurface active
Domain active
user/system authorization policy
version unchanged

Do not publish stale rejected draft.

===========================================================
45. SCHEDULED PUBLISH IDEMPOTENCY
===========================================================

Same schedule event executing twice:

must result in one published version.

Use deterministic job identity.

===========================================================
46. UNSCHEDULE
===========================================================

User can cancel scheduled publication.

Cancelled job must not later publish.

===========================================================
47. CONTENT PREVIEW
===========================================================

Preview must render:

real BrandTheme
real PageTemplate
real related entities
draft ContentVersion

But preview:

requires auth or secure preview token
noindex

Never leak unpublished content publicly.

===========================================================
48. SITEMAP
===========================================================

Extend existing dynamic sitemap.

Include:

published
indexable
canonical

articles only.

Exclude:

draft
review
scheduled future
archived
preview

===========================================================
49. RSS / FEED
===========================================================

Optional if justified.

If implemented:

published articles only.

Do not spend Phase 11 effort here unless needed.

===========================================================
50. CONTENT SEARCH
===========================================================

Admin content list:

search by:

title
status
keyword
store
product
author

Use database filtering.

Do not load every article into browser.

===========================================================
51. CONTENT LIST UI
===========================================================

Columns:

Title
Type
Status
Primary Topic
Related Store/Product
Author
Updated
Published
Actions

Filters:

Draft
Review
Published
Scheduled
Archived

===========================================================
52. CONTENT PERFORMANCE
===========================================================

Connect Phase 4/5 analytics.

Article detail may show:

GSC Impressions
GSC Clicks
GA4 Sessions
LocalBi Page Views
Conversions
Calls
WhatsApp

Only if mapped data exists.

Do not fabricate 0 for missing integrations.

===========================================================
53. CONTENT PERFORMANCE SOURCE
===========================================================

Metrics must remain source-labeled.

GSC:
search visibility

GA4:
traffic/engagement

LocalBi:
first-party actions

Do not merge into one unlabeled number.

===========================================================
54. OPPORTUNITY FEEDBACK
===========================================================

If article came from Opportunity:

link:

Opportunity
↔ ContentItem

When content publishes:

Opportunity may move to:

COMPLETED

only if workflow defines publishing as action completion.

Do NOT mark:

"SEO problem solved"

automatically.

Publishing completes the task,
not the search outcome.

===========================================================
55. POST-PUBLISH MONITORING
===========================================================

After publish:

track performance over future periods.

Do not immediately evaluate success after minutes/hours.

Store:

publishedAt

and allow later comparative analysis.

===========================================================
56. NO CAUSAL CLAIMS
===========================================================

If rank improves after article:

do not state:

"Article caused +25% rankings"

without causal evidence.

Allowed:

"Rank improved from X to Y after publication."

Keep correlation separate from causation.

===========================================================
57. DUPLICATE CONTENT DETECTION
===========================================================

Before creating new content:

search existing content and dynamic pages.

Detect likely overlap using:

same primary keyword
same linked entities
similar title/topic

First version can be rule-based.

Do not require complex AI embeddings initially.

===========================================================
58. CONTENT CANNIBALIZATION WARNING
===========================================================

Potential warning:

Two LocalBi pages target same primary keyword/entity strongly.

Do not call it definitive keyword cannibalization.

Label:

"Potential overlapping targeting."

Provide evidence.

===========================================================
59. PROGRAMMATIC PAGE SAFETY
===========================================================

LocalBi already generates dynamic:

Store
Category
Product
StoreProduct

pages.

Do NOT use blog engine to create duplicate thin pages for:

every city
every keyword
every Product combination

without meaningful content.

Avoid mass low-value page generation.

===========================================================
60. QUALITY CHECKS
===========================================================

Create pre-publish checks.

Factual checks:

title present
slug valid
body present
canonical valid
no broken internal links
related entities valid
image alt where applicable
preview works
no unsafe HTML

Content guidance:

heading structure
duplicate title
missing meta description

Do not invent arbitrary "quality score" unless transparent.

===========================================================
61. FACT VALIDATION
===========================================================

For AI-assisted content:

compare referenced entities against DB.

Examples:

Product price mentioned:
must match Product/StoreProduct if included as factual dynamic value.

Store hours:
must match Store/GBP synchronized snapshot.

Preferred architecture:

avoid embedding volatile values into long-form body.

Use dynamic blocks where possible.

===========================================================
62. DYNAMIC CONTENT TOKENS
===========================================================

Support controlled dynamic entity components/tokens if useful.

Examples:

<StoreHours storeId="..." />

<ProductPrice productId="..." />

But do not store executable arbitrary syntax.

Better:

structured embedded entity reference.

Renderer resolves live data.

===========================================================
63. VOLATILE DATA RULE
===========================================================

Avoid AI writing:

"Royal Oud costs ₹2,399"

inside static paragraph if price changes frequently.

Prefer:

"Explore Royal Oud"

plus dynamic Product card.

This prevents stale factual content.

===========================================================
64. MEDIA
===========================================================

Use existing media architecture.

Article images require:

public URL
alt text
tenant ownership

Do not allow Tenant A content to attach Tenant B asset.

===========================================================
65. AI IMAGE GENERATION
===========================================================

Do not add automatically in Phase 11 unless existing infrastructure already
supports it and product explicitly needs it.

Focus on content architecture first.

===========================================================
66. EXTERNAL SOURCES
===========================================================

If editor adds factual external source/reference:

store optional reference metadata where useful.

AI-generated draft must not fabricate citations.

Do not generate fake URLs/sources.

===========================================================
67. COPYRIGHT SAFETY
===========================================================

AI drafting must not reproduce competitor articles.

Do not:

scrape competitor article
→ rewrite sentence-by-sentence

as product architecture.

Content should be generated from:

LocalBi business facts
approved source material
editor instructions
original synthesis.

===========================================================
68. BRAND VOICE
===========================================================

Optional BrandContentGuidelines:

tone
audience
approved terms
prohibited terms
style notes

Use as AI instruction.

Do not let Brand voice contain executable prompts that bypass platform safety.

===========================================================
69. AI PROMPT INJECTION SAFETY
===========================================================

Treat imported external text and website content as untrusted data.

Do not allow text such as:

"Ignore previous instructions"

inside imported content to control generation system behavior.

Separate:

system prompt
workflow instructions
source data.

===========================================================
70. RLS
===========================================================

All tenant-owned tables require:

tenantId

ENABLE ROW LEVEL SECURITY
FORCE ROW LEVEL SECURITY

Likely:

ContentItem
ContentVersion
ContentBrief
ContentRelation
ContentAuthor if tenant-scoped
ContentCategory if created
Redirect

Cross-tenant tests mandatory.

===========================================================
71. CROSS-BRAND SAFETY
===========================================================

Brand A article cannot attach:

Brand B Product
Brand B Store
Brand B Keyword
Brand B PageTemplate

Validate service + DB relationships.

===========================================================
72. AUTHORIZATION
===========================================================

Admin endpoints require:

session
tenant context
RBAC
Zod
standard error handling

Public content resolution remains separate.

===========================================================
73. AI ENDPOINT SECURITY
===========================================================

AI generation endpoints:

authenticated
authorized
rate limited
tenant scoped

Do not expose general unrestricted prompt endpoint publicly.

===========================================================
74. AI SECRET HANDLING
===========================================================

Provider API keys:

server-side only.

Never:

browser
Puck JSON
content body
logs

===========================================================
75. QUERY KEYS
===========================================================

Centralize TanStack Query keys.

Conceptually:

contentKeys.list(...)
contentKeys.detail(...)
contentKeys.versions(...)
contentKeys.briefs(...)
contentKeys.calendar(...)
contentKeys.performance(...)

No random duplicated key arrays.

===========================================================
76. SERVICES
===========================================================

Create focused modules:

ContentService
ContentVersionService
ContentPublishingService
ContentBriefService
InternalLinkService
ContentSeoService
ContentAiService

Avoid one giant ContentService doing everything.

===========================================================
77. BACKGROUND JOBS
===========================================================

Potential:

CONTENT_SCHEDULED_PUBLISH
CONTENT_LINK_VALIDATE
CONTENT_PERFORMANCE_REFRESH

AI generation may be request/async depending on provider latency.

Do not unnecessarily queue every CRUD operation.

===========================================================
78. CONTENT PUBLISH TRANSACTION
===========================================================

Publishing must atomically establish:

approved version
active published version
publishedAt
route availability

Avoid state:

status = PUBLISHED

but no published version.

===========================================================
79. CACHE INVALIDATION
===========================================================

On publish:

invalidate:

page context
content route
sitemap
related-content cache

On draft save:

do NOT invalidate production page.

===========================================================
80. BUILD PERFORMANCE
===========================================================

Do not build article pages as huge client components.

Public content:

Server Components / SSR / ISR

interactive islands only where needed.

Rich article body should not require large admin editor JS on public page.

===========================================================
81. EDITOR BUNDLE SEPARATION
===========================================================

Admin rich-text editor libraries should not enter public website bundle.

Verify bundle boundaries.

===========================================================
82. INDEXES
===========================================================

Potential:

ContentItem:
tenantId + brandId + status
webSurfaceId + slug
publishedAt

ContentVersion:
contentItemId + version unique

Brief:
tenantId + brandId + status

Redirect:
webSurfaceId + fromPath unique

Do not duplicate index coverage.

===========================================================
83. TEST — DRAFT SAFETY
===========================================================

Published Article v3 exists.

Editor creates Draft v4.

Public site must still show v3.

===========================================================
84. TEST — PUBLISH
===========================================================

Approve/publish v4.

Public site now displays v4.

v3 retained.

===========================================================
85. TEST — ROLLBACK
===========================================================

Rollback to v3.

Public page shows correct version.

History remains intact.

===========================================================
86. TEST — PREVIEW
===========================================================

Draft preview accessible to authorized editor.

Public anonymous user cannot access draft.

Preview returns noindex.

===========================================================
87. TEST — AI FACT SAFETY
===========================================================

AI context contains:

Store closes at 9 PM.

Draft must not claim:

open 24 hours.

If generated output introduces conflicting structured fact:

flag/reject/warn before publish.

===========================================================
88. TEST — CROSS-TENANT
===========================================================

Tenant A cannot:

read Tenant B drafts
edit Tenant B content
publish Tenant B article
use Tenant B assets.

===========================================================
89. TEST — CROSS-BRAND
===========================================================

Brand A Article cannot link internal relation to Brand B Product.

===========================================================
90. TEST — SCHEDULED PUBLISH
===========================================================

Approved article scheduled.

Job runs once.

Published exactly once.

===========================================================
91. TEST — UNSCHEDULE
===========================================================

Schedule cancelled before execution.

Article remains unpublished.

===========================================================
92. TEST — SLUG CHANGE
===========================================================

Published:

/blog/oud-guide

changed explicitly to:

/blog/beginners-oud-guide

Expected:

new canonical path

old path:
redirect if redirect architecture enabled.

No broken search route.

===========================================================
93. TEST — INTERNAL LINKS
===========================================================

Article relation:

Royal Oud.

Product active/published.

Suggestion resolves correct canonical URL.

===========================================================
94. TEST — ARCHIVED TARGET
===========================================================

Product linked from draft becomes archived.

Pre-publish validator warns.

Do not publish broken LocalBi link silently.

===========================================================
95. TEST — OPPORTUNITY CONNECTION
===========================================================

Opportunity
→ Create Brief
→ Article
→ Publish

Opportunity workflow records completed action.

Do not label SEO outcome successful automatically.

===========================================================
96. TEST — SITEMAP
===========================================================

Published Article appears.

Draft does not.

Archived Article removed according to route policy.

===========================================================
97. TEST — PUBLIC BUNDLE
===========================================================

Verify admin editor/AI libraries are not unnecessarily included in public
article bundle.

===========================================================
98. REAL DATA ONLY
===========================================================

Search production source for:

sample blogs
fake author
dummy SEO metrics
Math.random engagement
hardcoded article stats
fake sources
fake reviews in articles

Remove production fallbacks.

Explicit demo/test fixtures may remain.

===========================================================
99. ACCEPTANCE CRITERIA
===========================================================

Phase 11 is complete only when:

[ ] canonical ContentItem implemented

[ ] content versioning implemented

[ ] editorial workflow implemented

[ ] draft / review / approve / publish implemented

[ ] rollback implemented

[ ] secure preview implemented

[ ] article PageTemplate integrated

[ ] PageContext supports editorial content

[ ] blog/article routing implemented

[ ] SEO metadata integrated with existing engine

[ ] Article JSON-LD implemented correctly

[ ] sitemap integration implemented

[ ] content calendar implemented

[ ] scheduled publishing safely implemented

[ ] ContentBrief implemented

[ ] Opportunity → Brief workflow implemented

[ ] related Product/Store/Category relations implemented

[ ] internal-link suggestions implemented

[ ] broken-link checks implemented

[ ] AI-assisted drafting implemented if provider available

[ ] AI generation uses real structured context

[ ] AI cannot auto-publish

[ ] factual business fields are not fabricated

[ ] human approval enforced

[ ] content performance integration implemented

[ ] RLS verified

[ ] cross-brand isolation verified

[ ] cross-tenant isolation verified

[ ] no production demo content

===========================================================
100. VERIFICATION
===========================================================

Run:

npx prisma validate
npx prisma migrate status

typecheck
lint touched files

content CRUD tests
version tests
workflow tests
publish tests
rollback tests
preview authorization tests
scheduled publishing tests
slug/redirect tests
internal-link tests
SEO tests
sitemap tests
AI-context tests
AI authorization tests
RLS tests
cross-brand tests
cross-tenant tests

Regression:

Phase 0 Security
Phase 1 WebSurface
Phase 2 Catalog
Phase 3 Page Engine
Phase 4 Analytics
Phase 5 Attribution
Phase 6 GBP
Phase 7 Rank
Phase 8 Merchant
Phase 9 Calls
Phase 10 Opportunities

production build

Verify:

admin editor bundle isolated from public pages
public SSR works
published article metadata correct

===========================================================
101. FINAL REPORT
===========================================================

Return:

# PHASE 11 IMPLEMENTATION REPORT

## Pre-flight
Existing content:
Existing editor:
Existing page integration:
Existing AI:

## Data model
ContentItem:
ContentVersion:
ContentBrief:
Relations:
Authors:
Redirects:

## Editorial workflow
Draft:
Review:
Approval:
Publish:
Rollback:
Schedule:

## Website integration
PageTemplate:
PageContext:
Routing:
SSR:
Preview:

## SEO
Metadata:
Canonical:
Article schema:
Breadcrumb:
Sitemap:

## Internal linking
Suggestions:
Validation:
Related content:
Orphan detection:

## AI assistance
Provider:
Prompt architecture:
Fact context:
Guardrails:
Human approval:
Usage controls:

## Opportunity integration
Brief creation:
Content linkage:
Workflow completion:

## Analytics
GSC:
GA4:
LocalBi conversions:
Performance display:

## Security
XSS:
Authorization:
RLS:
Cross-brand:
Cross-tenant:
AI endpoint safety:

## Performance
Public bundle:
Admin editor:
Caching:
Indexes:

## Verification
Prisma:
TypeScript:
Lint:
Tests:
Build:

## Deferred
Citation management:
Directory listings:
Automated backlink workflows:
Advanced AI optimization:
Social publishing:
CRM:
Email automation:

Finish with:

PHASE 11 STATUS

Content CMS implemented: YES/NO
Versioning implemented: YES/NO
Editorial workflow implemented: YES/NO
Secure preview implemented: YES/NO
Publishing/rollback implemented: YES/NO
Scheduled publishing implemented: YES/NO
Content briefs implemented: YES/NO
Opportunity integration implemented: YES/NO
Internal linking implemented: YES/NO
SEO integration verified: YES/NO
AI drafting implemented: YES/NO
AI fact safeguards verified: YES/NO
Human approval enforced: YES/NO
No autonomous publishing verified: YES/NO
RLS verified: YES/NO
Cross-brand isolation verified: YES/NO
Cross-tenant isolation verified: YES/NO
Existing phases preserved: YES/NO
Ready for Phase 12: YES/NO




12________________________________________


# LOCALBI — PHASE 12
## LOCAL LISTINGS + CITATIONS + DIRECTORY PRESENCE
## NAP CONSISTENCY + DUPLICATE DETECTION + CONTROLLED SYNC

Act as a Principal SaaS Architect, Staff TypeScript Engineer,
Local SEO Listings Architect, Directory Integration Engineer,
PostgreSQL/Prisma Architect, Background Job Engineer,
Multi-Tenant Security Engineer and Next.js Engineer.

Phases 0–11 are assumed complete.

EXPECTED CURRENT FOUNDATION:

Tenant
  ↓
Brand
  ↓
Stores
  ↓
Canonical Business Data

Brand / Store also have:

- GBP
- WebSurface
- Domains
- Products
- Pages
- SEO
- Analytics
- Leads
- Rank Tracking
- Merchant Center
- Calls
- Opportunities
- Content

NOW IMPLEMENT PHASE 12 ONLY:

Store / Brand Canonical Data
        ↓
Listing Profile
        ↓
Directory Connectors
        ↓
Discovery
        ↓
Existing Listing Match
        ↓
NAP Consistency Audit
        ↓
Duplicate Detection
        ↓
Suggested Changes
        ↓
Human Approval
        ↓
Provider Update
        ↓
Sync / Verification
        ↓
Local Presence Dashboard

DO NOT IMPLEMENT YET:

- backlink purchasing
- automated review generation
- fake directory submissions
- mass-spam citations
- arbitrary web scraping at scale
- unauthorized account creation
- paid campaign automation
- CRM automation
- social publishing
- advanced digital PR
- autonomous listing edits without approval

===========================================================
0. PRIMARY BUSINESS GOAL
===========================================================

LocalBi must help a client answer:

"Is my business information consistent everywhere customers may find me?"

Example:

Aalim Perfumes — Mannadi

Canonical LocalBi Data:

Name:
Aalim Perfumes - Mannadi

Address:
123 Example Street, Mannadi, Chennai

Phone:
+91 44 4000 1234

Website:
https://locate.aalimperfumes.com/chennai/mannadi

Hours:
10:00 AM – 9:00 PM


Directory Presence:

Google Business Profile
MATCHED
Healthy

Apple Business Connect
MATCHED
Phone mismatch

Bing Places
MATCHED
Hours outdated

Justdial
DISCOVERED
Possible duplicate

Yelp
NOT CONNECTED

Facebook
MATCHED
Healthy

LocalBi should show:

- where the Store exists
- whether information matches canonical data
- whether duplicates exist
- what needs review
- what can be updated automatically
- what requires manual action

Do NOT fabricate directory listings.

===========================================================
1. RE-AUDIT CURRENT CODE FIRST
===========================================================

Before implementing anything inspect CURRENT:

- Brand
- Store
- Store address
- Store phone
- Store hours
- website URL
- GBP mapping
- ExternalResource
- ResourceMapping
- Integration
- Google OAuth
- any Apple/Bing/Yelp/Facebook integrations
- provider connector architecture
- sync jobs
- secrets
- current directory UI
- current listing/citation tables
- opportunity engine
- notification system
- audit logging

Search for:

listing
citation
directory
NAP
apple
bing
yelp
facebook
justdial
foursquare
business listing
directory listing
duplicate listing
presence
sync
externalResource

Produce:

PHASE 12 PRE-FLIGHT

Existing listing model:
Existing provider connectors:
Existing canonical NAP source:
Existing directory discovery:
Existing update APIs:
Existing provider auth:
Existing duplicate detection:
Existing sync state:
Existing listing UI:
Existing mock data:

Classify:

KEEP
EXTEND
REFACTOR
REPLACE
MISSING

===========================================================
2. DEFINE CANONICAL BUSINESS DATA
===========================================================

Before comparing directories, define canonical LocalBi source of truth.

For Store-level listings:

Canonical name
Canonical address
Canonical phone
Canonical website
Canonical hours
Canonical category
Canonical coordinates
Canonical description where applicable

Do NOT create another independent Store profile table if Store already owns
these fields.

If GBP provider snapshot exists:

do not silently make GBP canonical for everything.

Define provenance clearly:

LOCALBI_MANUAL
GBP_SYNCED
PROVIDER_SNAPSHOT

Canonical listing comparison should use one documented LocalBi value set.

===========================================================
3. LISTING PROFILE
===========================================================

Create a reusable normalized listing representation.

Conceptually:

ListingProfile {
  tenantId
  brandId
  storeId

  businessName
  address
  phone
  website
  hours
  categories
  coordinates
}

This may be a DTO/service instead of a physical table.

Do not duplicate Store data unnecessarily.

===========================================================
4. DIRECTORY PROVIDER ABSTRACTION
===========================================================

Create:

DirectoryProvider

Conceptual methods:

discoverListings()
getListing()
validateConnection()
compareListing()
updateListing()
getUpdateStatus()
detectDuplicates()

Only expose methods supported by each provider.

Provider-specific logic stays isolated.

Do NOT force every provider into capabilities they do not support.

===========================================================
5. VERIFY PROVIDER API CONTRACTS FIRST
===========================================================

Before implementing write operations, verify CURRENT official APIs/docs for
each provider.

Potential providers may include:

- Google Business Profile
- Apple Business Connect
- Bing Places
- Yelp
- Facebook / Meta
- Foursquare
- Justdial
- industry/local directories
- other supported listing providers

Do NOT assume every provider has:

- public write API
- OAuth
- listing discovery
- duplicate removal
- bulk updates

Produce:

DIRECTORY PROVIDER CONTRACT REPORT

For each provider:

Provider:
Authentication:
Discovery API:
Read API:
Write API:
Duplicate API:
Webhook/status API:
Rate limits:
Account ownership requirements:
Supported fields:
Unsupported fields:
Manual-only operations:

Do not fake automation where no supported API exists.

===========================================================
6. CAPABILITY MODEL
===========================================================

Each provider connector should declare capabilities.

Example:

{
  read: true,
  write: true,
  discovery: true,
  duplicateDetection: false,
  hours: true,
  categories: true,
  photos: false
}

Do not scatter provider conditionals throughout UI.

===========================================================
7. DIRECTORY / PROVIDER MODEL
===========================================================

Create or normalize DirectoryProviderConfig / Provider definition.

Potential metadata:

providerKey
displayName
status
capabilities
authenticationType

Do not store secrets here.

===========================================================
8. LISTING MODEL
===========================================================

Create canonical external listing entity.

Conceptually:

DirectoryListing

id
tenantId
brandId
storeId

provider
externalListingId

name
address
phone
website

status

matchStatus

providerUrl?

lastDiscoveredAt
lastSyncedAt
lastVerifiedAt

createdAt
updatedAt

Do not copy every provider-specific field into core table.

Use normalized core fields + provider metadata where necessary.

===========================================================
9. LISTING STATUS
===========================================================

Use explicit states:

DISCOVERED
MATCHED
UNVERIFIED
NEEDS_REVIEW
SYNCING
SYNCED
STALE
ERROR
REMOVED
DUPLICATE
MANUAL_ACTION_REQUIRED

Do not display:

Healthy

for a provider that has never been checked.

===========================================================
10. LISTING MATCHING
===========================================================

When provider discovery returns candidate listings:

do not match solely by business name.

Use evidence such as:

external provider ID
phone
address
coordinates
website
store identity

Build:

ListingMatchService

Return:

MATCHED
POSSIBLE_MATCH
NO_MATCH
AMBIGUOUS

with evidence.

===========================================================
11. NO AUTOMATIC AMBIGUOUS MATCHING
===========================================================

Example:

"Aalim Perfumes"

appears at:

Chennai
Coimbatore
Bengaluru

Store:
Mannadi Chennai

Do not auto-map based on name.

Require strong evidence or human confirmation.

===========================================================
12. MATCH CONFIDENCE
===========================================================

If using confidence:

expose why.

Example:

HIGH
- exact phone
- close coordinates
- matching address

MEDIUM
- similar address
- same website

LOW
- name only

Do not hide arbitrary confidence score.

===========================================================
13. NAP CONSISTENCY
===========================================================

NAP:

Name
Address
Phone

Compare normalized provider values against LocalBi canonical data.

Report per field:

MATCH
MISMATCH
MISSING
UNKNOWN

Do not collapse all differences into one generic warning.

===========================================================
14. NORMALIZATION
===========================================================

Create reusable comparison utilities.

Name:
trim/case normalization for comparison only.

Address:
normalize whitespace/punctuation carefully.

Phone:
use E.164/phone utility.

Website:
normalize host/scheme/trailing slash.

Hours:
compare structured schedule.

Do not rewrite canonical values just to match provider formatting.

===========================================================
15. ADDRESS COMPARISON
===========================================================

Do not use naive full-string equality only.

Examples:

"123 MG Road"
vs
"123 M.G. Road"

may represent same address.

Use structured fields where available.

But do NOT claim identical if geocoding/identity is uncertain.

===========================================================
16. PHONE COMPARISON
===========================================================

Compare normalized phone numbers.

Example:

044 40001234
+91 44 4000 1234

may be equivalent.

Do not simply compare raw strings.

===========================================================
17. WEBSITE COMPARISON
===========================================================

Different URLs may still be valid.

Example:

brand.com

vs

locate.brand.com/store

Product rule should define desired listing URL per provider.

Do NOT mark original Brand website incorrect simply because LocalBi also has
a WebSurface.

===========================================================
18. DIRECTORY WEBSITE STRATEGY
===========================================================

Define preferred URL strategy.

Potential:

GBP:
LocalBi Store URL

Apple/Bing:
LocalBi Store URL

or client original website depending on customer configuration.

Do not overwrite provider website automatically without explicit Brand
policy.

Store policy:

ORIGINAL
LOCALBI
CUSTOM

where justified.

===========================================================
19. HOURS COMPARISON
===========================================================

Compare structured:

regular hours
special hours

Do not treat:

special holiday hours

as permanent mismatch.

===========================================================
20. CATEGORY COMPARISON
===========================================================

Provider categories differ.

Do not require exact text equality.

Create provider-specific category mapping if write capability needs it.

Do not overwrite LocalBi category taxonomy.

===========================================================
21. CONSISTENCY RESULT
===========================================================

Create normalized comparison DTO.

Conceptually:

ListingConsistencyResult {
  listingId
  provider

  name
  address
  phone
  website
  hours
  category

  overallState
}

Overall state must be derived transparently.

===========================================================
22. NO ARBITRARY "LOCAL SEO SCORE"
===========================================================

Do not create:

Presence Score 94/100

unless formula is fully documented.

Preferred:

Providers checked: 6
Healthy: 4
Needs review: 1
Duplicate: 1
Missing: 0

If a percentage is shown:

define exactly:

healthy providers / verified providers.

===========================================================
23. DUPLICATE DETECTION
===========================================================

Create:

DuplicateListingCandidate

Conceptually:

tenantId
storeId
provider
primaryListingId?
duplicateExternalId

evidence
confidence
status

Do not automatically delete duplicates.

===========================================================
24. DUPLICATE EVIDENCE
===========================================================

Potential evidence:

same phone
same address
near-identical coordinates
same website
same business identity

Do not classify duplicate solely from similar names.

===========================================================
25. DUPLICATE WORKFLOW
===========================================================

States:

POSSIBLE
CONFIRMED
DISMISSED
RESOLVED
MANUAL_ACTION_REQUIRED

Human reviews duplicate candidates.

Provider action may:

merge
remove
report
close

only if official provider capability exists.

===========================================================
26. PROVIDER WRITE SAFETY
===========================================================

Never automatically push LocalBi changes when canonical Store data changes.

Flow:

Mismatch detected
    ↓
Suggested update
    ↓
Human review
    ↓
Approve provider update
    ↓
Provider API
    ↓
Confirm result
    ↓
SYNCED

No silent writes.

===========================================================
27. LISTING CHANGESET
===========================================================

Create structured proposed changes.

Example:

ListingChangeSet

name:
old → new

phone:
old → new

hours:
old → new

website:
old → new

User can:

Approve All
Select Fields
Cancel

===========================================================
28. WRITE CAPABILITY DIFFERENCES
===========================================================

Provider A may support:

name
phone
hours

Provider B may only support:

read/discovery

Provider C may require manual dashboard action.

UI must reflect capability.

Do not show:

Update Automatically

if provider is manual-only.

===========================================================
29. MANUAL ACTION WORKFLOW
===========================================================

For unsupported providers:

show:

Manual Action Required

Include:

provider
listing URL
fields mismatched
recommended change

Do not falsely mark fixed.

User may manually mark:

Completed

then LocalBi rechecks where possible.

===========================================================
30. PROVIDER AUTHENTICATION
===========================================================

Reuse existing integration architecture.

Do not invent one-off secret storage.

Use:

OAuth
API key
service account
manual connection

according to provider.

Secrets:

encrypted/server-side only.

===========================================================
31. EXTERNAL RESOURCE ARCHITECTURE
===========================================================

Reuse:

Integration
ExternalResource
ResourceMapping

where appropriate.

Potential:

Provider Account
  ↓
ExternalResource
  ↓
Directory Listing
  ↓
Store mapping

Do not build disconnected integration architecture.

===========================================================
32. DISCOVERY ≠ OWNERSHIP
===========================================================

A provider account may reveal many listings.

Discovery does NOT authorize automatic Store mapping.

Preserve explicit mapping invariant.

===========================================================
33. LISTING DISCOVERY JOB
===========================================================

Use background jobs where provider operations may be slow.

Potential:

LISTING_DISCOVERY
LISTING_REFRESH
LISTING_CONSISTENCY_CHECK
LISTING_UPDATE
DUPLICATE_SCAN

Do not call all external providers every dashboard request.

===========================================================
34. JOB PAYLOAD
===========================================================

Include sufficient identifiers:

tenantId
connectionId
provider
storeId?
listingId?

Workers must revalidate all ownership.

Do not trust stale payload.

===========================================================
35. JOB IDEMPOTENCY
===========================================================

Avoid duplicate update jobs for same:

listing
field set
canonical version

Use deterministic business keys.

===========================================================
36. CANONICAL VERSION
===========================================================

If Store changes between:

update queued
and worker execution

recompute or reject stale change.

Do not push old address after user already changed it again.

Use:

updatedAt
version
payload hash

===========================================================
37. PROVIDER WRITE CONFIRMATION
===========================================================

HTTP success may mean:

accepted
pending review

not necessarily live.

Track:

SUBMITTED
PROCESSING
VERIFIED
FAILED

according to provider behavior.

===========================================================
38. PROVIDER RETRIES
===========================================================

Retry:

429
5xx
temporary timeout

Do not endlessly retry:

invalid request
permission denied
ownership missing

Use typed provider errors.

===========================================================
39. CONNECTION REVOCATION
===========================================================

If provider account revoked:

workers stop.

State:

REAUTH_REQUIRED

Do not show listing mismatches as provider errors caused by data itself.

===========================================================
40. LISTING SNAPSHOTS
===========================================================

Persist enough provider snapshot data to compare over time.

Do not overwrite history if useful operationally.

Potential:

DirectoryListingSnapshot

listingId
capturedAt
normalized fields
provider state

But only add snapshot table if justified.

===========================================================
41. LAST VERIFIED
===========================================================

Every listing should show:

Last checked
Last successful sync
Last update attempt

Do not imply fresh data when months old.

===========================================================
42. STALE LISTINGS
===========================================================

Define staleness based on provider/check cadence.

Display:

STALE

not:

MISMATCH

if data could not be refreshed.

===========================================================
43. BRAND / STORE PRESENCE DASHBOARD
===========================================================

Example:

Aalim Perfumes — Mannadi

Providers Checked      7
Healthy                 4
Needs Review            1
Duplicates              1
Manual Action           1

Provider table:

Google       Healthy
Apple        Phone mismatch
Bing         Hours mismatch
Justdial     Possible duplicate
Yelp         Manual action
Facebook     Healthy

===========================================================
44. BRAND SUMMARY
===========================================================

For multi-location Brand:

Store
Providers
Healthy
Issues
Duplicates
Last Audit

Mannadi
7
5
1
1
Today

T Nagar
7
7
0
0
Today

Avoid N+1 queries.

===========================================================
45. ISSUE MODEL
===========================================================

Normalize listing issues.

Potential:

NAME_MISMATCH
ADDRESS_MISMATCH
PHONE_MISMATCH
WEBSITE_MISMATCH
HOURS_MISMATCH
CATEGORY_MISMATCH
DUPLICATE
MISSING_LISTING
AUTH_REQUIRED
STALE
PROVIDER_ERROR

Do not use vague generic issue text only.

===========================================================
46. OPPORTUNITY ENGINE INTEGRATION
===========================================================

Phase 10 may create opportunities from listing problems.

Examples:

LISTING_PHONE_MISMATCH
LISTING_DUPLICATE
MISSING_DIRECTORY_PRESENCE

Evidence:

provider
listing
field mismatch

Do not fabricate importance.

===========================================================
47. MISSING LISTING
===========================================================

Be careful.

"No listing discovered"

does NOT always mean:

business is missing.

Could mean:

provider search unavailable
account not connected
discovery failed

Use states:

NOT_FOUND
NOT_CHECKED
DISCOVERY_ERROR

===========================================================
48. LISTING CREATION
===========================================================

If provider officially supports business creation:

allow controlled workflow.

But require:

human confirmation
business ownership/authorization
provider prerequisites

Do NOT auto-create listings everywhere.

===========================================================
49. PROVIDER OWNERSHIP CLAIM
===========================================================

Some directories require manual ownership verification.

Model:

CLAIM_REQUIRED

Do not pretend LocalBi can bypass provider verification.

===========================================================
50. NAP CHANGE PROPAGATION
===========================================================

If Store phone/address changes:

LocalBi should mark affected directory comparisons:

NEEDS_RECHECK

Potential provider updates become pending suggestions.

Do not automatically propagate.

===========================================================
51. STORE DEACTIVATION
===========================================================

Inactive Store:

stop normal directory synchronization.

Do not automatically delete all external listings.

May require separate:

Store Closed / Provider Closure workflow

later.

===========================================================
52. RELOCATION
===========================================================

Address relocation is high risk.

Do not automatically overwrite every provider.

Require explicit relocation workflow.

Potential:

old address
new address
effective date

Avoid duplicate/closed-location confusion.

===========================================================
53. MULTI-LOCATION BRANDS
===========================================================

Do not accidentally assign:

Mannadi listing
to
T Nagar Store

Use stable provider listing IDs and Store mapping.

===========================================================
54. DIRECTORY URLs
===========================================================

Store provider listing URL where available.

Admin UI can offer:

View Listing

Do not rely on scraping listing HTML to derive state when API provides
structured data.

===========================================================
55. DIRECTORIES WITHOUT API
===========================================================

For providers without supported APIs:

Phase 12 may model:

manual listing record
manual verification status
provider URL
last checked manually

Do not build unauthorized scraping as a shortcut.

===========================================================
56. SCRAPING BOUNDARY
===========================================================

Do NOT implement general directory scraping in Phase 12.

If a provider has no supported API:

use manual workflow unless an approved/licensed data provider is selected.

Provider/data-source abstraction should allow future extension.

===========================================================
57. DATA PROVENANCE
===========================================================

Every external listing value should retain:

provider
external listing identity
retrievedAt

Do not present provider snapshot as canonical LocalBi Store data.

===========================================================
58. FIELD-LEVEL PROVENANCE
===========================================================

Comparison UI should display:

LocalBi:
+91...

Provider:
044...

Status:
MATCH after normalization

Do not overwrite raw provider representation solely for display.

===========================================================
59. NORMALIZED VS RAW
===========================================================

Keep:

raw provider value

and/or

normalized comparison value

where justified.

Do not lose useful debugging information.

===========================================================
60. AUDIT LOG
===========================================================

Audit:

listing mapping
update approval
update execution
duplicate confirmation
manual completion
provider connection changes

Do not audit every dashboard read.

===========================================================
61. AUTHORIZATION
===========================================================

Add/reuse:

LISTING_VIEW
LISTING_MANAGE
LISTING_UPDATE
LISTING_DUPLICATE_MANAGE

Viewer:
read

Editor/Manager:
depending on role

Only authorized roles may push provider updates.

===========================================================
62. RLS
===========================================================

New tenant-owned tables require:

tenantId
ENABLE ROW LEVEL SECURITY
FORCE ROW LEVEL SECURITY

Likely:

DirectoryListing
DuplicateListingCandidate
ListingChangeSet
ListingSnapshot if created

Cross-tenant tests mandatory.

===========================================================
63. CROSS-BRAND SAFETY
===========================================================

Brand A listing cannot map to Brand B Store.

Store A cannot use Tenant B provider resource.

Enforce service + database constraints.

===========================================================
64. SECRET HANDLING
===========================================================

Provider credentials:

server-side
encrypted or environment-based

Never:

browser
Puck JSON
logs
listing table plaintext secrets

===========================================================
65. QUERY KEYS
===========================================================

Centralize:

listingKeys.summary(...)
listingKeys.store(...)
listingKeys.providers(...)
listingKeys.issues(...)
listingKeys.duplicates(...)
listingKeys.changeSets(...)

No scattered random arrays.

===========================================================
66. UI ARCHITECTURE
===========================================================

Suggested:

features/listings/
├── dashboard
├── providers
├── store-listings
├── issues
├── duplicates
├── changes
├── hooks
└── api

Avoid giant listing-manager.tsx.

===========================================================
67. LISTING DETAIL
===========================================================

Display:

Provider
Current LocalBi Value
Provider Value
Status

Example:

Phone

LocalBi:
+91 44 4000 1234

Apple:
+91 44 4555 9999

MISMATCH

[Review Update]

===========================================================
68. BULK ACTIONS
===========================================================

Potential:

Refresh selected listings
Approve selected safe changes

Do NOT:

bulk push across providers without showing changes.

Provider-specific capability validation required.

===========================================================
69. BULK MULTI-STORE OPERATIONS
===========================================================

If 50 Stores change business hours:

do not launch 50×10 provider calls from browser.

Queue controlled background operations.

Show progress.

===========================================================
70. PARTIAL FAILURE
===========================================================

100 updates:

85 success
10 manual
5 failed

Preserve successful changes.

Do not rollback external successes.

===========================================================
71. UPDATE RESULT
===========================================================

Track per provider:

SUCCESS
PENDING_PROVIDER_REVIEW
FAILED
MANUAL_ACTION_REQUIRED

Do not use one overall success flag.

===========================================================
72. NOTIFICATIONS
===========================================================

Potential alerts:

High-confidence duplicate discovered
Provider connection expired
Critical phone mismatch

Avoid notification spam.

Deduplicate repeated issues.

===========================================================
73. CONSISTENCY CHECK SCHEDULE
===========================================================

Allow scheduled refresh.

Example:

weekly

Do not hammer provider APIs daily without reason.

Frequency may depend on provider quotas/subscription.

===========================================================
74. SUBSCRIPTION LIMITS
===========================================================

If subscription model exists:

limits may cover:

stores
providers
refresh frequency

Do not hardcode pricing plans.

===========================================================
75. INDEXES
===========================================================

Potential:

DirectoryListing:
tenantId + storeId + provider
provider + externalListingId
tenantId + status

Duplicate:
tenantId + storeId + status

ChangeSet:
tenantId + listingId + status

Avoid redundant indexes.

===========================================================
76. PERFORMANCE
===========================================================

Store summary should not query each provider independently during UI load.

Use:

DB snapshots
server aggregation
background provider refresh

Do not make external calls from React chart/card components.

===========================================================
77. CACHE
===========================================================

Cache provider metadata where appropriate.

Do not cache stale provider listing values indefinitely.

Cache keys:

tenant
store
provider
listing

Never global provider ID only if tenant authorization matters.

===========================================================
78. ERROR STATES
===========================================================

Distinguish:

NOT_CONNECTED
NOT_CHECKED
NO_LISTING_FOUND
AUTH_REQUIRED
PROVIDER_ERROR
RATE_LIMITED
MANUAL_ONLY
STALE
MISMATCH

Do not display all as red generic error.

===========================================================
79. NO SYNTHETIC LISTING DATA
===========================================================

Search production source for:

fake listings
demo directory matches
Math.random consistency
hardcoded directory counts
sample duplicates
dummy provider status

Remove production fallbacks.

Test/demo fixtures may remain explicitly isolated.

===========================================================
80. TEST — EXACT MATCH
===========================================================

LocalBi Store:

phone/address/name match provider after normalization.

Expected:

HEALTHY/MATCH.

===========================================================
81. TEST — PHONE FORMAT DIFFERENCE
===========================================================

LocalBi:

+91 44 4000 1234

Provider:

04440001234

If semantically same:

MATCH.

===========================================================
82. TEST — TRUE PHONE MISMATCH
===========================================================

Different normalized number.

Expected:

PHONE_MISMATCH.

===========================================================
83. TEST — AMBIGUOUS DISCOVERY
===========================================================

Two provider listings have same name.

No strong identity evidence.

Expected:

AMBIGUOUS

No automatic Store mapping.

===========================================================
84. TEST — DUPLICATE
===========================================================

Two provider listings share:

same phone
same address
same Place identity signals.

Create duplicate candidate.

Do not automatically delete either.

===========================================================
85. TEST — WRITE PROVIDER
===========================================================

User approves phone update.

Provider supports write.

Expected:

change queued
provider update
status reflects provider result.

===========================================================
86. TEST — MANUAL PROVIDER
===========================================================

Provider has no API.

Expected:

MANUAL_ACTION_REQUIRED.

No fake update success.

===========================================================
87. TEST — STALE CHANGE
===========================================================

Phone update queued.

User changes canonical phone before job executes.

Worker detects stale canonical version.

Do not push obsolete number.

===========================================================
88. TEST — REVOKED CONNECTION
===========================================================

Provider OAuth revoked.

Update job aborts.

State:

REAUTH_REQUIRED.

===========================================================
89. TEST — CROSS-TENANT
===========================================================

Tenant A cannot:

view Tenant B listings
map Tenant B listing
push Tenant B update
see Tenant B provider credentials.

===========================================================
90. TEST — CROSS-BRAND
===========================================================

Brand A Store cannot map Brand B listing.

===========================================================
91. TEST — PARTIAL BULK UPDATE
===========================================================

10 providers:

6 success
2 manual
2 fail

UI reflects individual outcomes.

===========================================================
92. TEST — OPPORTUNITY
===========================================================

Verified phone mismatch persists.

Phase 10 receives factual listing opportunity with provider evidence.

===========================================================
93. TEST — NO LISTING VS PROVIDER ERROR
===========================================================

Provider timeout.

Do not mark:

MISSING_LISTING.

Mark:

PROVIDER_ERROR / UNKNOWN.

===========================================================
94. ACCEPTANCE CRITERIA
===========================================================

Phase 12 is complete only when:

[ ] canonical NAP source defined

[ ] provider abstraction implemented

[ ] provider capabilities modeled

[ ] official API capabilities verified

[ ] DirectoryListing implemented

[ ] explicit Store mapping implemented

[ ] listing discovery implemented where supported

[ ] NAP comparison implemented

[ ] phone normalization implemented

[ ] website normalization implemented

[ ] structured hours comparison implemented

[ ] ambiguous matches require human confirmation

[ ] duplicate candidates implemented

[ ] duplicates are not auto-deleted

[ ] proposed change sets implemented

[ ] human approval required for writes

[ ] provider-specific write capability enforced

[ ] manual-only provider workflow implemented

[ ] provider updates run safely in background

[ ] stale queued changes prevented

[ ] provider errors distinguished from missing listings

[ ] listing dashboard implemented

[ ] Brand/store summary implemented

[ ] opportunity integration implemented

[ ] RLS verified

[ ] cross-brand isolation verified

[ ] cross-tenant isolation verified

[ ] no synthetic listing data exists

===========================================================
95. VERIFICATION
===========================================================

Run:

prisma validate
prisma migrate status

typecheck
lint touched files

provider contract tests
listing discovery tests
matching tests
normalization tests
NAP comparison tests
duplicate tests
change-set tests
provider-write tests
manual-provider tests
job idempotency tests
stale-change tests
RLS tests
cross-brand tests
cross-tenant tests

Regression:

Phase 0 Security
Phase 1 WebSurface
Phase 2 Catalog
Phase 3 Website Engine
Phase 4 Analytics
Phase 5 Attribution
Phase 6 GBP
Phase 7 Rank
Phase 8 Merchant
Phase 9 Calls
Phase 10 Opportunities
Phase 11 Content

production build

===========================================================
96. FINAL REPORT
===========================================================

Return:

# PHASE 12 IMPLEMENTATION REPORT

## Pre-flight
Canonical NAP:
Existing providers:
Existing listings:
Existing integration architecture:

## Provider contracts
Google:
Apple:
Bing:
Yelp:
Facebook:
Other:
Manual-only providers:

## Data model
DirectoryListing:
Duplicates:
ChangeSets:
Snapshots:

## Discovery
Provider discovery:
Matching:
Ambiguous handling:

## Consistency
Name:
Address:
Phone:
Website:
Hours:
Categories:

## Duplicate management
Detection:
Evidence:
Human review:
Resolution:

## Provider updates
Capabilities:
Approval:
Background jobs:
Pending states:
Manual workflow:

## Dashboard
Store presence:
Brand summary:
Issues:
Freshness:

## Opportunity integration
Issue types:
Evidence:
Deep links:

## Security
Authorization:
RLS:
Cross-brand:
Cross-tenant:
Secrets:

## Performance
Jobs:
Caching:
Indexes:
Provider calls:

## Verification
Prisma:
TypeScript:
Lint:
Tests:
Build:

## Deferred
Advanced citation network:
Backlinks:
Digital PR:
CRM:
Social automation:
Autonomous listing updates:

Finish with:

PHASE 12 STATUS

Canonical NAP established: YES/NO
Provider abstraction implemented: YES/NO
Listing discovery implemented: YES/NO
NAP consistency implemented: YES/NO
Duplicate detection implemented: YES/NO
Ambiguous mapping safety verified: YES/NO
Human approval enforced: YES/NO
Provider writes implemented where supported: YES/NO
Manual-provider workflow implemented: YES/NO
Stale-write protection verified: YES/NO
Opportunity integration implemented: YES/NO
RLS verified: YES/NO
Cross-brand isolation verified: YES/NO
Cross-tenant isolation verified: YES/NO
No synthetic listing data verified: YES/NO
Existing phases preserved: YES/NO
Ready for Phase 13: YES/NO




13________________________________________________

# LOCALBI — PHASE 13
## UNIFIED EXECUTIVE / CLIENT REPORTING
## CROSS-MODULE DASHBOARD + CLIENT REPORTS + EXPORTS + SCHEDULED DELIVERY

Act as a Principal SaaS Architect, Staff TypeScript Engineer,
Analytics Platform Architect, Reporting Systems Engineer,
PostgreSQL/Prisma Architect, Multi-Tenant Security Engineer,
Next.js Engineer and Enterprise Dashboard UX Architect.

Phases 0–12 are assumed complete.

EXPECTED CURRENT FOUNDATION:

Tenant
  ↓
Brand
  ↓
├── Stores
├── Products / Categories / StoreProduct
├── WebSurface / Domains
├── PageTemplates / Dynamic Pages
├── GA4
├── GSC
├── GBP
├── Rank Tracking
├── Attribution / Leads
├── Call Tracking
├── Merchant Center
├── Opportunities
├── Content
└── Listings / Citations

NOW IMPLEMENT PHASE 13 ONLY:

Raw Module Data
    ↓
Normalized Report Services
    ↓
Client Report Context
    ↓
Cross-Module KPI Aggregation
    ↓
Executive Dashboard
    ↓
Store / Page / Product Drilldowns
    ↓
Export / PDF / CSV
    ↓
Scheduled Report Delivery

DO NOT IMPLEMENT YET:

- AI executive summaries that invent conclusions
- automated strategy execution
- automated budget decisions
- predictive revenue modeling
- customer billing
- CRM automation
- marketing campaign automation
- benchmarking against unknown external datasets
- white-label agency billing
- custom BI query builder
- arbitrary SQL reporting
- autonomous recommendations

===========================================================
0. PRIMARY BUSINESS GOAL
===========================================================

A client should be able to answer:

"What did LocalBi improve or generate for my business,
across all locations and channels?"

Example:

Aalim Perfumes
Last 30 Days

LOCALBI WEBSITE

Users:
12,480

Sessions:
15,210

GSC Clicks:
4,820

GSC Impressions:
118,000


LOCAL ACTIONS

Calls:
482

WhatsApp:
317

Directions:
624

Form Leads:
103

Bookings:
27


GBP

Reviews:
328

Average Rating:
4.6

Unanswered Reviews:
12

Google Actions:
provider-specific real metrics only


LOCAL RANK

Tracked Keywords:
84

Top-3 Coverage:
58%

Top-10 Coverage:
89%

Avg Found Rank:
4.6


MERCHANT

Products Approved:
348

Disapproved:
18

Local Inventory Errors:
4


CONTENT

Published Articles:
21

Article GSC Clicks:
1,130

Article Conversions:
46


LISTINGS

Providers Checked:
7

Healthy:
5

Needs Review:
1

Possible Duplicate:
1


OPPORTUNITIES

High Priority:
8

Completed:
12


IMPORTANT:

Every section must clearly preserve source.

Do NOT create one fake aggregate metric such as:

"LocalBi Score = 91"

unless the product later defines a transparent formula.

===========================================================
1. RE-AUDIT CURRENT REPORTING ARCHITECTURE FIRST
===========================================================

Before modifying code inspect CURRENT:

- website analytics
- ReportContextService
- normalized GA4/GSC DTOs
- GBP reporting
- rank summaries
- lead reports
- call reports
- Merchant diagnostics
- opportunity summaries
- content performance
- listing summaries
- Store dashboards
- Brand dashboards
- chart components
- date filters
- comparison filters
- exports
- PDF generation
- notification/email infrastructure
- caching
- background jobs
- query keys
- tenant/client permissions

Search for:

report
dashboard
summary
overview
analytics
export
pdf
csv
scheduled report
email report
client dashboard
executive
kpi
metric
comparison
previous period

Produce:

PHASE 13 PRE-FLIGHT

Existing report services:
Existing dashboards:
Existing report DTOs:
Existing date handling:
Existing comparison logic:
Existing chart components:
Existing exports:
Existing PDF capability:
Existing email delivery:
Existing cache strategy:
Existing client permissions:
Existing duplicate metrics:

Classify:

KEEP
EXTEND
REFACTOR
REPLACE
MISSING

Do not build another parallel reporting stack.

===========================================================
2. REPORT CONTEXT
===========================================================

Extend/create one canonical ClientReportContext.

Conceptually:

ClientReportContext {
  tenant
  brand

  selectedWebSurface?
  selectedStores?

  dateRange
  comparisonRange?

  timezone

  integrations
  dataFreshness
}

Do not let every dashboard card independently resolve:

tenant
brand
surface
stores
date range.

Resolve once.

===========================================================
3. REPORT SCOPE
===========================================================

Support clear scopes:

BRAND
STORE
WEB_SURFACE
PAGE
PRODUCT
CATEGORY

Executive dashboard defaults:

BRAND

with LocalBi surface emphasis where applicable.

Do not mix:

Original Website
+
LocalBi Website

without explicit selection or compare mode.

===========================================================
4. LOCALBI SURFACE DEFAULT
===========================================================

For website-related metrics:

default to:

LOCALBI WebSurface

unless user explicitly selects:

ORIGINAL
COMPARE

This preserves Phase 4 product requirement.

Do not silently aggregate Original + LocalBi website traffic.

===========================================================
5. REPORT DATE RANGE
===========================================================

Centralize date handling.

Support at minimum:

7 days
28 days
30 days
90 days
custom

Use Brand/Tenant timezone.

Do not calculate reporting dates in browser using arbitrary local timezone.

===========================================================
6. COMPARISON RANGE
===========================================================

Support:

Previous Period

and optionally:

Previous Year

when data exists.

Example:

Last 30 days
vs
Previous 30 days

Do not compare unequal-length periods.

===========================================================
7. COMPARISON SAFETY
===========================================================

If previous data is incomplete:

show:

Comparison unavailable

not:

-100%

Do not treat missing provider data as zero.

===========================================================
8. REPORT STATE
===========================================================

Every module should return a typed state.

At minimum:

DATA
NO_DATA
NOT_CONNECTED
REAUTH_REQUIRED
UPSTREAM_ERROR
STALE
SYNCING
INSUFFICIENT_DATA

Executive dashboard must preserve these states.

Do not flatten them into zero.

===========================================================
9. NORMALIZED MODULE ADAPTERS
===========================================================

Build reporting adapters over existing modules.

Conceptually:

WebsiteReportingService
GbpReportingService
RankReportingService
LeadReportingService
CallReportingService
MerchantReportingService
ContentReportingService
ListingReportingService
OpportunityReportingService

Each returns a normalized reporting DTO.

Do not query provider APIs directly from dashboard components.

===========================================================
10. EXECUTIVE REPORT DTO
===========================================================

Create one typed aggregate DTO.

Conceptually:

ExecutiveReport {
  context

  website
  localActions
  gbp
  rank
  leads
  calls
  merchant
  content
  listings
  opportunities

  freshness
  generatedAt
}

Do not expose raw Prisma/provider responses.

===========================================================
11. SOURCE PROVENANCE
===========================================================

Every metric must retain:

source

Examples:

GA4
GSC
GBP
LOCALBI
TELEPHONY
MERCHANT
LOCAL_RANK_PROVIDER
DIRECTORY_PROVIDER

UI should be able to show source label/tooltips.

===========================================================
12. DO NOT SUM INCOMPATIBLE METRICS
===========================================================

Examples of invalid combined metrics:

GA4 Users
+
GBP Profile Views

as:

"Total Audience"

Do not do this.

Similarly:

CALL_CLICK
+
real Call

must not become:

"Calls"

without distinction.

===========================================================
13. LOCAL ACTIONS SECTION
===========================================================

Clearly separate:

Call CTA Clicks
Real Tracked Calls
WhatsApp Clicks
Directions Clicks
Forms
Bookings

Do not collapse all of them into one number unless labeled:

Tracked Actions

with exact formula documented.

===========================================================
14. LEADS VS ACTIONS
===========================================================

A Directions click is not necessarily a Lead.

A Page View is not a Lead.

Report separately:

Actions
Leads
Calls

Phase 5 semantics must remain intact.

===========================================================
15. WEBSITE SECTION
===========================================================

LocalBi Website section may show:

Users
Sessions
Page Views
GSC Clicks
GSC Impressions
CTR
Average Position

but preserve source labels.

Do not show GSC position as GA4 metric.

===========================================================
16. GBP SECTION
===========================================================

Show only verified/current supported metrics.

Potential:

Mapped Locations
Average Rating
Review Count
Unanswered Reviews
Provider-supported performance metrics
Profile Completeness

Clearly label LocalBi-calculated:

Profile Completeness

as LocalBi metric.

===========================================================
17. RANK SECTION
===========================================================

Show:

Tracked Keywords
Average Found Rank
Top-3 Coverage
Top-10 Coverage
Found Coverage
Visibility if defined

Do not show fake average using not-found = 100.

Use Phase 7 formulas exactly.

===========================================================
18. MERCHANT SECTION
===========================================================

Show:

Enabled Products
Approved
Processing
Disapproved
Local Inventory Errors

Do not display provider auth error as:

0 approved.

===========================================================
19. CONTENT SECTION
===========================================================

Show:

Published Articles
GSC Clicks
Sessions
Tracked conversions
Top Articles

Do not claim article caused ranking growth.

===========================================================
20. LISTINGS SECTION
===========================================================

Show factual:

Providers Checked
Healthy
Needs Review
Duplicates
Manual Action Required

Do not invent a generic presence score unless already transparent.

===========================================================
21. OPPORTUNITY SECTION
===========================================================

Show:

Open
High Priority
Accepted
Completed

Top Opportunities

Do not imply opportunity completion equals SEO outcome success.

===========================================================
22. EXECUTIVE DASHBOARD LAYOUT
===========================================================

Build a premium enterprise dashboard.

Target hierarchy:

Header

Brand
Date Range
Surface Selector
Store Filter

Then:

Executive Summary Metrics

LocalBi Website Performance

Local Actions & Leads

GBP / Reputation

Local Rank

Store Performance

Products / Merchant

Content

Listings

Opportunities

Data Freshness

Avoid:

30 cards with equal visual importance.

Use hierarchy.

===========================================================
23. KPI CARD DESIGN
===========================================================

Reusable MetricCard should support:

label
value
comparison
trend
source
state
freshness
tooltip

Do not create separate card component for every module.

===========================================================
24. TREND DISPLAY
===========================================================

Trend examples:

+12.4%
-8.1%

Need clear baseline.

Tooltip:

vs previous 30 days

Do not show arrow without comparison definition.

===========================================================
25. PERCENTAGE MATH
===========================================================

Handle denominator = 0 safely.

Do not show:

Infinity%

Use:

New
N/A
or explicit state

according to metric.

===========================================================
26. STORE PERFORMANCE
===========================================================

Create cross-module Store table.

Example:

Store
Website Actions
Calls
Leads
Rating
Reviews
Top-3 Rank
Listings Issues

Mannadi
420
183
61
4.7
328
62%
1

Do not trigger per-row provider/API queries.

Use server-side aggregates.

===========================================================
27. STORE DRILLDOWN
===========================================================

Click Store:

opens Store Intelligence view.

Sections:

LocalBi page traffic
Calls
WhatsApp
Directions
Leads
GBP
Reviews
Rank
Products
Listings
Opportunities

Reuse module services.

Do not duplicate business logic.

===========================================================
28. PAGE PERFORMANCE
===========================================================

Cross-module Page table:

Page
Type
Sessions
GSC Clicks
Conversions
Calls
WhatsApp
Conversion Rate

Page identity comes from Phase 3 Page model/context.

Do not parse URLs repeatedly to infer page type.

===========================================================
29. PRODUCT PERFORMANCE
===========================================================

Product reporting may show:

Product
Page Views
Store Availability
Leads
Calls/WhatsApp where attributable
Merchant Status

Do not attribute generic Store-page actions to Product.

===========================================================
30. CONTENT PERFORMANCE
===========================================================

Show published content:

Article
GSC Clicks
Sessions
Conversions
Published Date

Do not combine draft articles.

===========================================================
31. CLIENT-FACING SIMPLICITY
===========================================================

Executive dashboard is NOT admin diagnostics.

Do not expose:

resource IDs
OAuth connection IDs
provider job IDs
database IDs

unless inside technical detail/debug view.

===========================================================
32. TECHNICAL HEALTH SECTION
===========================================================

Provide optional:

Data Health

Example:

GA4      Updated 10m ago
GSC      Updated 6h ago
GBP      Updated 2h ago
Rank     Last run yesterday
Merchant Updated 1h ago

Connections needing action:
1

Useful without exposing internal secrets.

===========================================================
33. FRESHNESS
===========================================================

Every provider/module must supply last-successful update.

Do not imply report is current if data is stale.

===========================================================
34. REPORT WARNINGS
===========================================================

Example:

Search Console requires reconnection.

Rank scan is 9 days old.

Merchant sync has 4 errors.

Display warnings separately from KPIs.

Do not convert warnings into zero metrics.

===========================================================
35. FILTER ARCHITECTURE
===========================================================

Use one report filter state.

Potential:

dateRange
compare
webSurface
storeIds
pageType
product/category where relevant

Do not create isolated filter state per card.

===========================================================
36. FILTER URL STATE
===========================================================

Where appropriate, persist report filters in query parameters.

Allows:

shareable dashboard state
back/forward navigation

Validate all query params.

Do not trust tenant IDs from URL.

===========================================================
37. TANSTACK QUERY KEYS
===========================================================

Centralize:

reportKeys.executive(...)
reportKeys.store(...)
reportKeys.pages(...)
reportKeys.products(...)
reportKeys.content(...)

Keys include:

tenant
brand
surface
stores
date
comparison

No cross-filter cache leakage.

===========================================================
38. SERVER AGGREGATION
===========================================================

Do not make browser send:

GA4 request
GSC request
GBP request
Rank request
Leads request
Calls request
Merchant request

separately if a coordinated executive endpoint can serve optimized data.

Architecture:

UI
  ↓
Executive Report Endpoint
  ↓
Reporting Orchestrator
  ↓
parallel module services
  ↓
normalized report

===========================================================
39. PARALLELIZATION
===========================================================

Independent module reads may run concurrently.

Do not serialize:

Website
→ GBP
→ Rank
→ Calls
→ Merchant

unnecessarily.

But respect DB connection/provider limits.

===========================================================
40. DO NOT CALL LIVE PROVIDERS FOR EVERY EXECUTIVE LOAD
===========================================================

Executive reporting should use:

synced DB data
cached report data

where architecture already supports it.

Do not trigger fresh GBP/Merchant/rank API jobs simply because dashboard loads.

===========================================================
41. CACHING
===========================================================

Use short/appropriate report cache.

Cache scope:

tenant
brand
surface
stores
dateRange
comparison
reportVersion

Do not share cached report across tenants.

===========================================================
42. CACHE INVALIDATION
===========================================================

Relevant module sync completion may invalidate:

executive report cache.

Examples:

GSC sync
Lead created
Call completed
Rank run completed
GBP sync
Merchant sync

Do not invalidate everything for unrelated changes.

===========================================================
43. REPORT SNAPSHOT
===========================================================

Consider using/extend existing ReportSnapshot architecture.

Useful for:

scheduled reports
historical client reports
PDF consistency

Conceptually:

ReportSnapshot

tenantId
brandId

reportType
dateRange
comparisonRange

reportVersion
payload
generatedAt

Do not store uncontrolled huge raw provider payloads.

===========================================================
44. REPORT VERSIONING
===========================================================

Scheduled/exported reports must identify:

report schema/version.

If KPI formulas change later:

old reports remain interpretable.

===========================================================
45. PDF EXPORT
===========================================================

Implement professional PDF report if existing PDF infrastructure permits.

PDF should include:

Brand identity
Date range
Executive summary
Website
Actions/leads
GBP
Rank
Stores
Merchant
Content
Listings
Opportunities
Data notes/freshness

Do not screenshot the entire browser dashboard as the primary architecture.

Use a report-specific printable representation.

===========================================================
46. PDF BRANDING
===========================================================

Use:

Brand logo
BrandTheme

or optional LocalBi branding depending product configuration.

No hardcoded client logos.

===========================================================
47. PDF DATA CONSISTENCY
===========================================================

Generate PDF from one ReportSnapshot / report payload.

Do not re-query each section during PDF generation.

Otherwise values may change mid-generation.

===========================================================
48. CSV EXPORT
===========================================================

CSV for tabular datasets:

Stores
Pages
Leads
Calls
Products
Rank keywords
Listings

Must respect current report filters.

Protect against spreadsheet formula injection.

===========================================================
49. EXPORT AUTHORIZATION
===========================================================

Add/reuse:

REPORT_VIEW
REPORT_EXPORT

PII exports may require stronger permissions.

Example:

Call/Lead CSV

must respect PII permissions.

===========================================================
50. SCHEDULED REPORTS
===========================================================

Support scheduled client reports.

Potential cadence:

WEEKLY
MONTHLY

Configuration:

tenant
brand
recipient(s)
report scope
surface
stores
format
timezone
schedule

Do not hardcode send times.

===========================================================
51. REPORT SCHEDULE MODEL
===========================================================

Conceptually:

ReportSchedule

id
tenantId
brandId

name
frequency
timezone

surfaceId?
storeIds/filter config

format:
PDF
EMAIL_SUMMARY

status

nextRunAt
lastRunAt

createdBy
createdAt
updatedAt

Validate recipient permissions/business rules.

===========================================================
52. SCHEDULED DELIVERY
===========================================================

Use BullMQ / existing scheduler.

Flow:

Schedule due
    ↓
Generate ReportSnapshot
    ↓
Generate PDF if configured
    ↓
Send
    ↓
Record delivery

Do not send from browser.

===========================================================
53. REPORT DELIVERY MODEL
===========================================================

Optional:

ReportDelivery

scheduleId
snapshotId

recipient
status
attempts
sentAt
errorCode

Useful for audit/support.

===========================================================
54. EMAIL DELIVERY
===========================================================

Reuse current email provider infrastructure.

Do not introduce another provider unnecessarily.

Email should include:

Brand
period
small executive summary
secure report link or attachment

Never expose tenant report publicly through guessable URL.

===========================================================
55. SECURE REPORT LINKS
===========================================================

If email links to report:

authenticated client route

or secure expiring share token if product supports external recipients.

Do not expose permanent public report URLs by default.

===========================================================
56. EMAIL PII
===========================================================

Executive report email should not contain detailed caller phone/email lead data.

Use aggregates.

Detailed PII stays authenticated.

===========================================================
57. RECIPIENT MANAGEMENT
===========================================================

Avoid arbitrary spam relay.

Recipients should be:

tenant users
approved client recipients

according to product policy.

Add rate/recipient limits.

===========================================================
58. SCHEDULE IDEMPOTENCY
===========================================================

Scheduler retry must not send duplicate report emails.

Business key:

scheduleId + reporting period

Only one successful delivery unless explicit resend.

===========================================================
59. RESEND
===========================================================

Authorized user may resend historical ReportSnapshot.

Do not regenerate different values silently unless they explicitly request regeneration.

===========================================================
60. REPORT HISTORY
===========================================================

Add:

Reports

History:

September 2026
August 2026
July 2026

Show:

Generated
Delivered
Status

Users can open/download according to permission.

===========================================================
61. CLIENT DASHBOARD PERMISSIONS
===========================================================

Client users may have restricted Store access.

Executive report must respect membership scope if current platform supports
store-level access.

Do not let user see all Brand Stores merely because report endpoint is aggregated.

===========================================================
62. RLS
===========================================================

Any new tables:

ReportSchedule
ReportDelivery
ReportSnapshot additions

must be tenant scoped.

ENABLE ROW LEVEL SECURITY
FORCE ROW LEVEL SECURITY

Cross-tenant tests mandatory.

===========================================================
63. REPORT SNAPSHOT SECURITY
===========================================================

Snapshot payload may contain sensitive aggregate/business data.

Never expose raw snapshots without tenant authorization.

If payload includes PII:

reconsider storing it.

Executive snapshot should preferably remain aggregate.

===========================================================
64. CROSS-BRAND SAFETY
===========================================================

Brand A scheduled report cannot include:

Brand B Stores
Brand B analytics
Brand B Leads

All report filter IDs validated under same Brand/Tenant.

===========================================================
65. CLIENT REPORT CUSTOMIZATION
===========================================================

Allow lightweight section visibility.

Example:

Website ✓
GBP ✓
Rank ✓
Merchant ✕
Content ✓

Do not create full drag-and-drop BI designer yet.

===========================================================
66. SAVED REPORT PRESET
===========================================================

Potential:

ReportPreset

name
section config
filters

Reuse between:

dashboard
manual export
schedule

Only implement if useful and architecture clean.

===========================================================
67. EMPTY MODULES
===========================================================

If client does not use Merchant:

do not show:

Merchant
0 Products

Prefer:

Merchant Center
Not Connected

or hide section based on report configuration.

===========================================================
68. CLIENT EXPLANATIONS
===========================================================

Use tooltips/help text.

Example:

Top-3 Coverage:
Percentage of valid geo-grid rank points where the business appeared in positions 1–3.

Use exact formulas from source modules.

Do not redefine metrics in report layer.

===========================================================
69. METRIC DEFINITIONS
===========================================================

Create centralized MetricDefinition registry.

For every executive metric:

key
displayName
description
source
format
calculation description

Do not scatter tooltips across components.

===========================================================
70. REPORT SCHEMA VALIDATION
===========================================================

Use Zod or existing validation boundary for generated report payloads.

Snapshots must match expected versioned schema.

===========================================================
71. TREND CHART REUSE
===========================================================

Create reusable enterprise chart wrappers:

TrendChart
ComparisonChart
RankTrend
StoreComparison

Do not create new chart config for every page.

===========================================================
72. ACCESSIBILITY
===========================================================

Charts require:

text summary
labels
tooltips
keyboard-friendly filters where applicable

Do not use color as only signal.

===========================================================
73. RESPONSIVE DESIGN
===========================================================

Executive dashboard must work:

desktop
tablet
reasonable mobile

Do not squeeze 8-column enterprise tables onto mobile unchanged.

===========================================================
74. LOADING ARCHITECTURE
===========================================================

Avoid full-page spinner for all modules.

Use:

server initial data where appropriate
section skeletons
progressive rendering

But preserve consistent report context.

===========================================================
75. ERROR ISOLATION
===========================================================

If Merchant section fails:

Website/GBP/Rank dashboard should still render.

Module-level error boundary/state.

Do not fail entire Executive report because one provider/module is unavailable.

===========================================================
76. REPORT COMPLETENESS
===========================================================

Executive DTO can include:

partial: true

and list unavailable modules.

PDF/report should state:

"Merchant data unavailable during report generation"

rather than omit silently.

===========================================================
77. DATA FRESHNESS FOOTER
===========================================================

Client report should include:

Data last refreshed:

GA4
GSC
GBP
Rank
Merchant

This improves trust.

===========================================================
78. NO FAKE EXECUTIVE INSIGHTS
===========================================================

Do not automatically write:

"Your business is performing excellently"

from arbitrary metrics.

Phase 13 reporting should be factual.

Phase 10 Opportunities already handles structured recommendations.

===========================================================
79. OPPORTUNITY SUMMARY
===========================================================

Executive dashboard can say:

8 high-priority opportunities

and show titles.

Do not regenerate recommendation logic inside reporting.

===========================================================
80. PERFORMANCE
===========================================================

Target executive report should not create hundreds of SQL queries.

Profile query counts where possible.

Use:

aggregations
precomputed summaries
parallel reads
ReportSnapshot
cache

Avoid N+1 across Stores.

===========================================================
81. DATABASE INDEXES
===========================================================

Review reporting query patterns.

Potential:

date-based module indexes
ReportSnapshot:
tenantId + brandId + generatedAt
ReportSchedule:
tenantId + status + nextRunAt
ReportDelivery:
scheduleId + createdAt

Do not add redundant indexes.

===========================================================
82. OBSERVABILITY
===========================================================

Record:

report type
tenantId
brandId
date range
duration
module timings
cache hits
partial modules
export duration

Do not log report payload or PII unnecessarily.

===========================================================
83. REPORT PERFORMANCE BUDGET
===========================================================

Measure:

executive endpoint latency
DB query count
snapshot generation time
PDF generation time

Do not accept 30-second interactive dashboard if avoidable.

===========================================================
84. TEST — LOCALBI VS ORIGINAL
===========================================================

Brand:

Original:
brand.com

LocalBi:
locate.brand.com

Executive website section default must show:

LocalBi only.

No mixed traffic.

===========================================================
85. TEST — MODULE FAILURE
===========================================================

GBP provider data unavailable.

Executive report:

Website works
Rank works
Calls work

GBP state:
UPSTREAM_ERROR

No entire dashboard failure.

===========================================================
86. TEST — REAUTH
===========================================================

GSC requires reauth.

Expected:

Search Console section:
REAUTH_REQUIRED

not:

0 clicks.

===========================================================
87. TEST — PREVIOUS PERIOD
===========================================================

Current:
100 Calls

Previous:
80 Calls

Trend:
+25%

Verify formula.

===========================================================
88. TEST — PREVIOUS ZERO
===========================================================

Current:
10

Previous:
0

Do not show Infinity%.

Use defined:

New

or N/A.

===========================================================
89. TEST — STORE ACCESS
===========================================================

Restricted user only allowed Mannadi.

Brand report endpoint must not reveal T Nagar metrics.

===========================================================
90. TEST — PDF SNAPSHOT CONSISTENCY
===========================================================

Generate snapshot.

Underlying call count changes afterward.

PDF from snapshot must keep original report values.

===========================================================
91. TEST — SCHEDULE IDEMPOTENCY
===========================================================

Monthly report job retried 3 times.

Only one successful email sent for same period.

===========================================================
92. TEST — CROSS-TENANT
===========================================================

Tenant A cannot:

read Tenant B snapshots
run Tenant B report
download Tenant B PDF
modify Tenant B schedule.

===========================================================
93. TEST — CROSS-BRAND
===========================================================

Brand A report cannot include Brand B Stores.

===========================================================
94. TEST — CSV INJECTION
===========================================================

Lead name:

=HYPERLINK(...)

CSV export must neutralize spreadsheet formula execution.

===========================================================
95. TEST — EMPTY MODULE
===========================================================

Merchant not configured.

Expected:

NOT_CONNECTED

not:

0 approved products.

===========================================================
96. TEST — STALE DATA
===========================================================

Rank latest successful run:

14 days old.

Report clearly marks stale.

===========================================================
97. TEST — DATA PROVENANCE
===========================================================

Call CTA Click:

LOCALBI

Real Call:

TELEPHONY

GBP call metric:

GBP

All distinct.

===========================================================
98. TEST — REPORT FILTER CACHE
===========================================================

Mannadi report cached.

Switch to T Nagar.

Must not receive Mannadi cached metrics.

===========================================================
99. NO SYNTHETIC REPORT DATA
===========================================================

Search production source for:

fake executive metrics
sample trends
Math.random growth
hardcoded report percentages
demo store totals
placeholder charts masquerading as data

Remove from production paths.

Explicit demo/test fixtures may remain isolated.

===========================================================
100. ACCEPTANCE CRITERIA
===========================================================

Phase 13 is complete only when:

[ ] canonical ClientReportContext implemented

[ ] ExecutiveReport DTO implemented

[ ] module reporting adapters implemented

[ ] data provenance preserved

[ ] LocalBi WebSurface default preserved

[ ] previous-period comparisons implemented

[ ] missing/error states preserved

[ ] Website section implemented

[ ] Local actions section implemented

[ ] GBP section implemented

[ ] Rank section implemented

[ ] Lead/Call section implemented

[ ] Merchant section implemented

[ ] Content section implemented

[ ] Listings section implemented

[ ] Opportunity summary implemented

[ ] Store cross-module reporting implemented

[ ] Page reporting implemented

[ ] Product reporting implemented

[ ] freshness implemented

[ ] module failure isolation implemented

[ ] ReportSnapshot implemented/reused

[ ] PDF export implemented

[ ] CSV export secured

[ ] scheduled reports implemented

[ ] report history implemented

[ ] schedule idempotency implemented

[ ] client permissions enforced

[ ] RLS verified

[ ] cross-brand isolation verified

[ ] cross-tenant isolation verified

[ ] no synthetic report data

===========================================================
101. VERIFICATION
===========================================================

Run:

prisma validate
prisma migrate status

typecheck
lint touched files

Executive reporting tests
module adapter tests
comparison tests
freshness tests
partial-report tests
store-access tests
snapshot tests
PDF tests
CSV security tests
schedule tests
delivery idempotency tests
RLS tests
cross-brand tests
cross-tenant tests

Regression:

Phase 0 Security
Phase 1 WebSurface
Phase 2 Catalog
Phase 3 Website Engine
Phase 4 Analytics
Phase 5 Attribution
Phase 6 GBP
Phase 7 Rank
Phase 8 Merchant
Phase 9 Calls
Phase 10 Opportunities
Phase 11 Content
Phase 12 Listings

production build

Measure:

Executive endpoint latency
DB query count
PDF generation time
bundle impact

===========================================================
102. FINAL REPORT
===========================================================

Return:

# PHASE 13 IMPLEMENTATION REPORT

## Pre-flight
Existing reporting:
Existing dashboards:
Existing exports:
Existing schedules:

## Architecture
ClientReportContext:
ExecutiveReport DTO:
Module adapters:
Metric definitions:

## Dashboard
Website:
Actions:
Leads:
Calls:
GBP:
Rank:
Merchant:
Content:
Listings:
Opportunities:

## Drilldowns
Stores:
Pages:
Products:
Content:

## Comparison
Previous period:
Previous year:
Missing data safety:

## Freshness
Module freshness:
Warnings:
Partial reports:

## Export
PDF:
CSV:
Snapshot consistency:

## Scheduled reports
Schedule:
Snapshot:
Delivery:
Idempotency:
History:

## Security
Authorization:
Store-scoped access:
PII:
RLS:
Cross-brand:
Cross-tenant:

## Performance
Query count:
Caching:
Parallelization:
Snapshot:
Endpoint latency:

## Verification
Prisma:
TypeScript:
Lint:
Tests:
Build:

## Deferred
Predictive analytics:
AI executive summaries:
Advanced BI builder:
White-label agency portal:
Billing:
CRM:
Autonomous optimization:

Finish with:

PHASE 13 STATUS

Executive report implemented: YES/NO
Module adapters implemented: YES/NO
Source provenance preserved: YES/NO
LocalBi surface default verified: YES/NO
Comparison reporting implemented: YES/NO
Freshness/error states verified: YES/NO
Store drilldown implemented: YES/NO
Page/Product reporting implemented: YES/NO
Report snapshots implemented: YES/NO
PDF export implemented: YES/NO
CSV export secured: YES/NO
Scheduled reports implemented: YES/NO
Delivery idempotency verified: YES/NO
Client access restrictions verified: YES/NO
RLS verified: YES/NO
Cross-brand isolation verified: YES/NO
Cross-tenant isolation verified: YES/NO
No synthetic reporting data verified: YES/NO
Existing phases preserved: YES/NO
Ready for Phase 14: YES/NO




14______________________________________________

# LOCALBI — PHASE 14
## WHITE-LABEL / AGENCY / MULTI-CLIENT PORTAL
## CLIENT HIERARCHY + BRANDING + ACCESS CONTROL + INVITATIONS + ENTITLEMENTS

Act as a Principal SaaS Architect, Staff TypeScript Engineer,
Multi-Tenant SaaS Architect, Enterprise IAM Engineer,
PostgreSQL/Prisma Architect, Next.js Engineer,
White-Label Platform Architect and Product Security Engineer.

Phases 0–13 are assumed complete.

EXPECTED CURRENT FOUNDATION:

Tenant
  ↓
Brand
  ↓
Stores

with:

- WebSurface / Domains
- BrandTheme
- Dynamic Pages
- Products / StoreProduct
- GA4 / GSC
- GBP
- Leads / Attribution
- Rank Tracking
- Merchant Center
- Calls
- Opportunities
- Content
- Listings
- Executive Reporting

NOW IMPLEMENT PHASE 14 ONLY:

Platform
   ↓
Tenant / Agency
   ↓
Client Organization
   ↓
Brand
   ↓
Stores / Products / Integrations / Reports
   ↓
Client Users
   ↓
Role + Scope
   ↓
White-Label Portal

DO NOT IMPLEMENT YET:

- subscription billing
- payment gateway
- invoices
- automated plan charging
- advanced reseller marketplace
- custom SSO/SAML
- SCIM
- enterprise procurement workflows
- public API monetization
- autonomous client onboarding
- CRM pipeline
- affiliate system

===========================================================
0. PRIMARY PRODUCT GOAL
===========================================================

LocalBi must support scenarios like:

Agency:
LP Digital

Clients:

Aalim Perfumes
Lakshmi Food
Priyan Juice

Agency admins can manage all clients.

Client users can access ONLY their own organization / Brands / Stores.

Example:

LP Digital
  ↓
Clients
  ├── Aalim Perfumes
  │     ├── Brand
  │     ├── 12 Stores
  │     └── Reports
  │
  ├── Lakshmi Food
  │     ├── Brand
  │     ├── 4 Stores
  │     └── Reports
  │
  └── Priyan Juice
        ├── Brand
        ├── 8 Stores
        └── Reports

White-label portal may appear as:

portal.lpdigital.com

instead of:

app.localbi.com

Agency may configure:

Logo
Favicon
Primary Color
Portal Name
Email Sender Name where supported
Support Link

BUT:

White-labeling must not weaken:

tenant isolation
authentication
authorization
resource mapping
report isolation

===========================================================
1. RE-AUDIT CURRENT TENANCY MODEL FIRST
===========================================================

Before modifying anything inspect CURRENT:

- Tenant
- Brand
- TenantMembership
- User
- roles
- permissions
- ContextResolver
- TenantContextService
- RLS
- client routes
- tenant slug
- invitations
- auth/session
- domain routing
- BrandTheme
- Report permissions
- store-scoped access
- notification system
- onboarding
- feature flags
- plan/subscription models if already present

Search for:

tenant
organization
client
agency
workspace
membership
invite
role
permission
brand access
store access
feature flag
subscription
plan
entitlement
white label
portal domain
custom branding

Produce:

PHASE 14 PRE-FLIGHT

Current Tenant meaning:
Current Brand ownership:
Current client abstraction:
Current membership:
Current roles:
Current invitations:
Current store-scoped access:
Current portal branding:
Current feature flags:
Current plan/entitlement models:
Current onboarding:
Current RLS assumptions:

Classify:

KEEP
EXTEND
MIGRATE
REFACTOR
DO NOT DUPLICATE

Do not create another "Organization" model if Tenant already represents it
unless a real missing business concept exists.

===========================================================
2. DECIDE TENANT VS CLIENT SEMANTICS
===========================================================

This is the most important design decision.

Do not blindly create:

Tenant
Agency
Organization
Client
Workspace

all as overlapping ownership layers.

First determine current Tenant semantics.

Preferred architecture if compatible:

Tenant
= LocalBi paying/owning workspace

Tenant may be:

DIRECT_CLIENT
AGENCY

Then:

Agency Tenant
  ↓
ClientAccount
  ↓
Brand

Direct Tenant
  ↓
Brand directly

OR

if current Tenant already equals client:

introduce an Agency grouping layer ABOVE Tenant.

Choose based on CURRENT schema.

Do not break existing RLS model merely to match naming.

===========================================================
3. NO SECOND TENANCY SYSTEM
===========================================================

Forbidden architecture:

Tenant A
  +
ClientTenant
  +
AgencyTenant
  +
WorkspaceTenant

with independent authorization paths.

There must be ONE canonical security tenant boundary.

Agency hierarchy should be an application-level ownership/grouping model
inside or above that boundary.

RLS must remain understandable and fail closed.

===========================================================
4. CLIENT ACCOUNT MODEL
===========================================================

If current architecture requires it, create a ClientAccount model.

Conceptually:

ClientAccount

id
tenantId

name
slug

status:
ACTIVE
SUSPENDED
ARCHIVED

primaryContact?
timezone?
locale?

createdAt
updatedAt

Brands belong to ClientAccount.

BUT:

only create this if Brand currently lacks a clean client grouping concept.

Do not create it solely for UI labels.

===========================================================
5. BRAND OWNERSHIP
===========================================================

Target:

Agency Tenant
  ↓
ClientAccount
  ↓
Brand
  ↓
Store

One Client may have:

multiple Brands.

Example:

Client:
ABC Retail Pvt Ltd

Brands:
ABC Electronics
ABC Home
ABC Fashion

Do not assume:

Client = Brand.

===========================================================
6. DIRECT CLIENT COMPATIBILITY
===========================================================

Existing LocalBi direct clients must continue working.

Do not require every historical Tenant to suddenly create an Agency.

Migration strategy may create:

default ClientAccount

only if necessary and deterministic.

Do not fabricate client entities if current Brand structure already works.

===========================================================
7. AGENCY MODE
===========================================================

Support Agency-specific behavior.

Agency can:

- create/manage Clients
- create/manage Brands
- invite agency team
- invite client users
- view cross-client summary
- access client reports
- configure white-label portal
- manage feature entitlements

according to authorization.

===========================================================
8. CLIENT MODE
===========================================================

Client user sees only:

their ClientAccount
their Brands
their Stores
their reports
their leads
their content
their integrations

No Agency-wide client list unless permitted.

===========================================================
9. MEMBERSHIP SCOPES
===========================================================

Current TenantMembership may be too broad.

Extend authorization carefully to support scopes.

Possible:

TENANT
CLIENT
BRAND
STORE

Conceptual membership/access grant:

UserAccessGrant

userId
tenantId

clientAccountId?
brandId?
storeId?

role

Do not create one row per Store if existing architecture has cleaner scope
representation.

Choose scalable design.

===========================================================
10. ROLE MODEL
===========================================================

Do NOT hardcode role checks such as:

if role === "agency"

Use existing capability system.

Potential roles:

AGENCY_OWNER
AGENCY_ADMIN
AGENCY_MEMBER

CLIENT_ADMIN
CLIENT_EDITOR
CLIENT_VIEWER

But only introduce roles if they fit current authorization architecture.

Capabilities remain source of truth.

===========================================================
11. CAPABILITY EXAMPLES
===========================================================

Potential capabilities:

CLIENT_VIEW
CLIENT_CREATE
CLIENT_UPDATE
CLIENT_ARCHIVE

BRAND_VIEW
BRAND_MANAGE

STORE_VIEW
STORE_MANAGE

REPORT_VIEW
REPORT_EXPORT

INTEGRATION_MANAGE

LEAD_VIEW
LEAD_MANAGE

CONTENT_MANAGE

USER_INVITE
USER_MANAGE

WHITELABEL_MANAGE

ENTITLEMENT_MANAGE

Follow existing AuthorizationService pattern.

===========================================================
12. ACCESS RESOLUTION
===========================================================

Required flow:

session
  ↓
Tenant membership
  ↓
scope grants
  ↓
Client / Brand / Store ownership
  ↓
capability
  ↓
resource access

Never trust:

clientId
brandId
storeId

from browser alone.

===========================================================
13. CROSS-CLIENT ISOLATION
===========================================================

Within same Agency:

Client A user must not access Client B.

Example:

Agency:
LP Digital

Client:
Aalim

Client user:
aalim-owner@example.com

must NOT access:

Lakshmi Food

even though both belong to same Agency Tenant.

This requires application-level scope enforcement in addition to Tenant RLS.

===========================================================
14. RLS STRATEGY
===========================================================

Tenant RLS alone may not protect Client-to-Client isolation inside same
Agency Tenant.

Therefore:

RLS:
tenant boundary

Application authorization:
client/brand/store scopes

If practical and clean:

additional DB policy/helper may enforce client scope.

But do not make RLS dependent on huge lists of IDs unless architecture
supports it reliably.

Document security boundary explicitly.

===========================================================
15. CLIENT USER INVITATIONS
===========================================================

Implement secure invitation workflow.

Flow:

Agency Admin
  ↓
Invite User
  ↓
Email
  ↓
Secure token
  ↓
Accept
  ↓
Create/link account
  ↓
Assign client scope + role

Invitation must include:

tenant
scope
role
expiry

Do not trust these values from acceptance request.

===========================================================
16. INVITATION MODEL
===========================================================

Conceptually:

Invitation

id
tenantId

email

scopeType
clientAccountId?
brandId?

role

tokenHash
expiresAt

status:
PENDING
ACCEPTED
EXPIRED
REVOKED

invitedBy
createdAt
acceptedAt?

Never store raw invitation token.

===========================================================
17. INVITATION SECURITY
===========================================================

Tokens:

cryptographically random
single-use
hashed at rest
time-limited

Do not expose Tenant ID as authorization mechanism.

===========================================================
18. EXISTING USER INVITE
===========================================================

If invite email belongs to existing User:

link membership/access grant after verification.

Do not create duplicate User account.

===========================================================
19. INVITE REVOKE
===========================================================

Agency admin may revoke pending invitation.

Revoked token must immediately stop working.

===========================================================
20. CLIENT USER MANAGEMENT
===========================================================

Admin UI should show:

Name
Email
Role
Scope
Status
Last Active where available

Actions:

Change Role
Change Scope
Deactivate Access
Resend Invite

Do not delete User globally when removing access.

===========================================================
21. USER MAY BELONG TO MULTIPLE CLIENTS
===========================================================

Support if business requirement permits.

Example:

Finance user manages:

Client A
Client B

Do not assume one User = one Client forever.

===========================================================
22. AGENCY DASHBOARD
===========================================================

Agency homepage:

Clients
Brands
Stores
Active Users
Integrations Needing Attention
High Priority Opportunities

Client performance summary:

Aalim Perfumes
Lakshmi Food
Priyan Juice

Do not expose client PII unnecessarily.

===========================================================
23. CLIENT SWITCHER
===========================================================

Agency user:

Client Selector

Aalim Perfumes
Lakshmi Food
Priyan Juice

Selection should determine application context.

Do not encode authorization solely through selected client.

Server still validates access every request.

===========================================================
24. BRAND SWITCHER
===========================================================

Within Client:

Brand selector.

If one Brand:

simplify UI.

If multiple Brands:

switch explicitly.

===========================================================
25. STORE FILTER
===========================================================

Existing Store filters should respect current Client + Brand scope.

Do not show Stores from another Client in selector.

===========================================================
26. ROUTING
===========================================================

Re-audit route architecture.

Potential:

/agency/[tenantSlug]/clients/[clientSlug]

or current:

/client/[tenantSlug]/...

Do NOT unnecessarily rewrite all existing routes.

Prefer backward-compatible context resolution.

===========================================================
27. CONTEXT RESOLVER
===========================================================

Extend current ContextResolver.

Conceptually resolves:

User
Tenant
ClientAccount
Brand
Store scope
Capabilities

Provide one normalized AppContext.

Do not make every page independently resolve hierarchy.

===========================================================
28. APP CONTEXT
===========================================================

Conceptual:

AppContext {
  user
  tenant

  clientAccount?
  brand?
  store?

  role
  capabilities
  accessScopes
}

Server-generated.

Never trust client-side context as authorization.

===========================================================
29. WHITE-LABEL CONFIG
===========================================================

Create WhiteLabelConfig.

Conceptually:

id
tenantId

enabled

portalName

logoUrl
faviconUrl

primaryColor
secondaryColor
accentColor

supportEmail?
supportUrl?

customDomainId?

hideLocalBiBranding?

createdAt
updatedAt

Do not duplicate BrandTheme.

BrandTheme:
customer Brand website styling.

WhiteLabelConfig:
Agency portal styling.

===========================================================
30. WHITE-LABEL VS BRAND THEME
===========================================================

Keep distinct.

BrandTheme:

Aalim public microsite

WhiteLabelConfig:

LP Digital client dashboard/portal

Do not reuse one model for both.

===========================================================
31. WHITE-LABEL CUSTOM DOMAIN
===========================================================

Support:

portal.lpdigital.com

using Phase 1 Domain architecture if appropriate.

Introduce surface/context:

PORTAL

only if model cleanly supports it.

Do not mix public Brand WebSurface domains with authenticated portal domains
without explicit type distinction.

===========================================================
32. PORTAL DOMAIN MODEL
===========================================================

Possible:

PortalDomain

or extend Domain with:

surfaceType:
CLIENT_PORTAL

Only if current Domain model supports safe generalized usage.

Hostname resolution:

portal.lpdigital.com
  ↓
WhiteLabelConfig
  ↓
Tenant
  ↓
Login / Dashboard

===========================================================
33. PORTAL DOMAIN SECURITY
===========================================================

Custom portal domain must be:

verified
active
tenant-owned

Do not allow Tenant A to claim Tenant B hostname.

Database uniqueness required.

===========================================================
34. DOMAIN VERIFICATION
===========================================================

Use same safe Phase 1 domain state:

PENDING
VERIFYING
ACTIVE
FAILED

Do not pretend DNS ownership.

===========================================================
35. LOGIN PAGE WHITE-LABEL
===========================================================

When entering:

portal.lpdigital.com

login may display:

LP Digital logo
LP Digital colors
"Client Portal"

But authentication still uses LocalBi's secure auth infrastructure.

Do not fork auth.

===========================================================
36. AUTH DOMAIN / COOKIE SAFETY
===========================================================

Be careful with custom domains.

Do not share authentication cookies insecurely across arbitrary domains.

Audit:

cookie Domain
SameSite
Secure
CSRF
NextAuth callbacks
redirect URLs

Custom portal auth must not weaken session isolation.

===========================================================
37. OAUTH CALLBACKS
===========================================================

Google OAuth/integration callbacks should remain on canonical secure LocalBi
callback infrastructure unless custom-domain support is explicitly safe.

Do not dynamically accept arbitrary callback URLs.

===========================================================
38. CLIENT REPORT BRANDING
===========================================================

Phase 13 reports may use Agency white-label branding.

Example:

Prepared by:
LP Digital

Logo:
Agency Logo

Do not modify metric source provenance.

===========================================================
39. PDF WHITE-LABEL
===========================================================

White-label report config may control:

Logo
Portal Name
Header/Footer
Primary color
Support contact

Do not hide underlying data provider attribution where legally/product-wise
required.

===========================================================
40. EMAIL WHITE-LABEL
===========================================================

If current email infrastructure supports customizable sender identity:

Agency display name may be used.

Do not spoof arbitrary sender addresses.

Actual email sending domain requires verified infrastructure.

===========================================================
41. EMAIL DOMAIN VERIFICATION
===========================================================

If future support for:

reports@lpdigital.com

is desired:

require verified sending domain through provider.

Do not allow free-form From address.

If not supported now:

use LocalBi sender with white-label display name.

===========================================================
42. CLIENT ONBOARDING
===========================================================

Create guided Agency onboarding flow.

Potential:

Create Client
   ↓
Create Brand
   ↓
Add Stores
   ↓
Invite Client Users
   ↓
Connect Google
   ↓
Configure WebSurface
   ↓
Select Features

Do not duplicate the individual feature setup logic.

Reuse existing flows.

===========================================================
43. CLIENT CREATION
===========================================================

Agency user inputs:

Client name
timezone
country/locale
primary contact

Then:

Brand creation.

Do not require all Google integrations immediately.

===========================================================
44. ONBOARDING STATUS
===========================================================

Track factual setup steps.

Example:

Brand created ✓
Store configured ✓
Google connected ✓
GBP mapped ✓
Website configured ✓
Client invited ✓

Do not create arbitrary onboarding percentage unless formula explicit.

===========================================================
45. FEATURE ENTITLEMENTS
===========================================================

Phase 14 prepares feature control even before billing.

Create centralized entitlement model.

Examples:

GBP
WEBSITE
ANALYTICS
RANK_TRACKING
MERCHANT
CALL_TRACKING
OPPORTUNITIES
CONTENT
LISTINGS
REPORTING

Do not scatter:

if plan === "pro"

through components.

===========================================================
46. ENTITLEMENT SERVICE
===========================================================

Create:

EntitlementService

Methods conceptually:

hasFeature()
assertFeature()
getLimits()
getTenantEntitlements()

All feature access passes through one layer.

===========================================================
47. ENTITLEMENT MODEL
===========================================================

Potential:

TenantEntitlement

tenantId
featureKey

enabled

limits JSON/structured fields
source

effectiveFrom?
expiresAt?

Do not blindly use unstructured JSON for everything if commonly queried
limits deserve columns.

===========================================================
48. CLIENT-LEVEL ENTITLEMENTS
===========================================================

Agency may enable different features per Client.

Example:

Aalim:
GBP + Rank + Calls

Lakshmi Food:
GBP + Website + Merchant

If product requires this:

support ClientFeatureEntitlement.

Do not hardcode all Agency clients to same feature set.

===========================================================
49. LIMITS
===========================================================

Potential limits:

Brands
Stores
Users
Tracked Keywords
Rank Checks
Merchant Products
Scheduled Reports
AI generations
Content items

Centralize limit enforcement.

===========================================================
50. ENFORCEMENT MUST BE SERVER-SIDE
===========================================================

Do not only hide button.

Example:

Rank disabled.

Browser manually calls rank API.

Server must reject.

===========================================================
51. FEATURE UI
===========================================================

Disabled feature:

show:

Not enabled for this client

or hide based on UX.

Do not show broken pages.

===========================================================
52. FEATURE USAGE
===========================================================

Reuse existing usage counters if available.

Avoid duplicating quota tracking per module.

===========================================================
53. SUSPEND CLIENT
===========================================================

Agency may suspend Client access.

Suspension must not:

delete data
delete Google mappings
delete reports

It should stop applicable client login/access.

Agency admin may retain management access according to policy.

===========================================================
54. ARCHIVE CLIENT
===========================================================

Archive should be non-destructive.

Historical:

reports
leads
analytics
content

remain.

No new activity/jobs if configured.

===========================================================
55. BACKGROUND JOBS + ENTITLEMENTS
===========================================================

Scheduled jobs must re-check:

Tenant/Client active
feature entitlement active

Examples:

Rank jobs
Merchant sync
scheduled reports

Do not continue expensive feature jobs after feature disabled.

===========================================================
56. CONNECTIONS AFTER FEATURE DISABLE
===========================================================

Disabling GBP feature:

do NOT delete OAuth/account mappings automatically.

Stop feature usage/sync if policy says.

Preserve configuration for re-enable.

===========================================================
57. AUDIT LOGGING
===========================================================

Audit:

Client created
Client archived
User invited
Role changed
Access revoked
White-label changed
Portal domain changed
Entitlement changed

Do not audit normal dashboard reads.

===========================================================
58. ADMIN IMPERSONATION
===========================================================

Do NOT implement silent impersonation casually.

If support/admin impersonation exists:

must be explicit
audited
time-limited
banner displayed

If not required:

defer.

===========================================================
59. AGENCY TEAM VS CLIENT TEAM
===========================================================

UI should clearly distinguish:

Agency Team
Client Users

Avoid accidentally granting Agency-wide role to client user.

===========================================================
60. CLIENT INVITE DEFAULT SCOPE
===========================================================

Default client invitation should scope only to intended Client.

Never default to entire Agency Tenant.

===========================================================
61. USER REMOVAL
===========================================================

Removing Client user access:

revoke access grants/membership.

Do not delete:

content authored
audit logs
historical actions

Keep user attribution.

===========================================================
62. LAST OWNER PROTECTION
===========================================================

Do not allow removing/demoting last Tenant/Agency owner without transfer.

Implement guard.

===========================================================
63. INVITE EMAIL UX
===========================================================

Invitation should clearly show:

Agency/Portal
Client
Role
Expiry
Accept button

Do not expose internal IDs.

===========================================================
64. CLIENT PORTAL HOME
===========================================================

Client user lands on:

Overview

showing only their scoped data.

Potential:

Website
GBP
Rank
Leads
Calls
Products
Opportunities
Reports

Feature visibility follows entitlement.

===========================================================
65. AGENCY PORTFOLIO DASHBOARD
===========================================================

Agency user may see cross-client operational summary:

Client
Stores
Integrations
High Opportunities
Sync Health
Latest Report

Do not mix client business metrics into one fake Agency KPI unless clearly
defined.

===========================================================
66. AGENCY CLIENT SEARCH
===========================================================

Support:

search
status
feature filters

Do not load thousands of clients into browser.

Paginate.

===========================================================
67. TENANT BRANDING FALLBACK
===========================================================

WhiteLabel disabled:

use LocalBi default branding.

Enabled but logo missing:

safe fallback.

Never broken image/login page.

===========================================================
68. WHITE-LABEL ASSET SECURITY
===========================================================

Logo/favicon assets:

tenant-owned
validated type
size limited
publicly safe

Do not permit Tenant A to reference Tenant B private asset.

===========================================================
69. CUSTOM CSS
===========================================================

Do NOT allow arbitrary raw CSS/JS initially.

Use controlled tokens:

colors
logo
favicon
border radius if desired
font selection from supported set

This avoids XSS/layout breakage.

===========================================================
70. WHITE-LABEL FONTS
===========================================================

If custom fonts supported:

use approved/validated sources.

Do not allow arbitrary script injection disguised as font URL.

Can defer full custom-font hosting.

===========================================================
71. SUPPORT LINKS
===========================================================

White-label config may define:

supportEmail
supportUrl

Validate protocols.

No javascript: URLs.

===========================================================
72. API ARCHITECTURE
===========================================================

Create/reuse clean APIs for:

Clients
Client users
Invitations
White-label
Portal domain
Entitlements

Follow existing:

browserClient
TanStack Query
Zod
standard errors
AuthorizationService
TenantContextService

===========================================================
73. CLIENT API SECURITY
===========================================================

Example:

GET /clients/[clientId]

must validate:

session
Tenant
scope
capability

Do not rely on URL Client ID.

===========================================================
74. QUERY KEYS
===========================================================

Centralize:

agencyKeys.clients(...)
agencyKeys.client(...)
agencyKeys.members(...)
agencyKeys.invites(...)
agencyKeys.whiteLabel(...)
agencyKeys.entitlements(...)

No scattered query arrays.

===========================================================
75. CACHE SCOPE
===========================================================

Any cached client/agency data includes:

tenant
client

Do not cache:

client:123

without Tenant scope if IDs are not globally safe.

===========================================================
76. RLS
===========================================================

All new tenant-owned tables:

ClientAccount
AccessGrant
Invitation
WhiteLabelConfig
Entitlement
PortalDomain if separate

must include:

tenantId

ENABLE ROW LEVEL SECURITY
FORCE ROW LEVEL SECURITY

Tenant A never sees Tenant B.

===========================================================
77. CLIENT-SCOPE SECURITY TESTS
===========================================================

Because multiple Clients may exist under same Tenant:

also test application authorization:

Agency user:
can see Clients A/B.

Client A admin:
can see A.

Client A admin:
cannot see B.

Tenant RLS alone is not enough.

===========================================================
78. CROSS-BRAND TEST
===========================================================

Client A has Brand A.

Client B has Brand B.

Client A user cannot:

access Brand B
Stores
Integrations
Reports
Leads
Products
Content

===========================================================
79. CROSS-STORE TEST
===========================================================

If user has Store-scoped permission:

Mannadi only

must not access:

T Nagar

even within same Brand.

===========================================================
80. INVITE TEST
===========================================================

Invite Client A admin.

Accept.

Expected:

Client A access only.

No Client B visibility.

===========================================================
81. EXPIRED INVITE TEST
===========================================================

Expired invitation cannot be accepted.

===========================================================
82. REVOKED INVITE TEST
===========================================================

Revoked invitation fails.

===========================================================
83. TOKEN REPLAY TEST
===========================================================

Accepted invitation token cannot be reused.

===========================================================
84. LAST OWNER TEST
===========================================================

Attempt to remove final Agency Owner.

Reject safely.

===========================================================
85. WHITE-LABEL DOMAIN TEST
===========================================================

portal.agency-a.com

resolves Agency A.

Cannot be claimed by Agency B.

===========================================================
86. WHITE-LABEL LOGIN TEST
===========================================================

Custom domain login uses Agency branding.

Authentication still produces correctly scoped session.

===========================================================
87. AUTH COOKIE TEST
===========================================================

Ensure custom portal domain cannot access another tenant's session through
misconfigured cookie Domain.

===========================================================
88. ENTITLEMENT API TEST
===========================================================

Rank disabled.

UI hides/disables rank.

Direct API attempt still rejected.

===========================================================
89. JOB ENTITLEMENT TEST
===========================================================

Rank scheduled job queued.

Feature disabled before execution.

Worker safely skips/aborts.

===========================================================
90. CLIENT SUSPENSION TEST
===========================================================

Client suspended.

Client user loses access.

Data retained.

Agency authorized admin can inspect according to policy.

===========================================================
91. CLIENT ARCHIVE TEST
===========================================================

Archived client no longer active in normal portal.

Historical reports/data remain.

===========================================================
92. REPORT WHITE-LABEL TEST
===========================================================

Agency branded report:

uses WhiteLabelConfig.

Metrics/source provenance unchanged.

===========================================================
93. CROSS-TENANT TEST
===========================================================

Tenant A cannot:

list Tenant B clients
invite into Tenant B
use Tenant B custom domain
read Tenant B branding
change Tenant B entitlement.

===========================================================
94. PERFORMANCE
===========================================================

Agency with:

500 Clients
2,000 Brands
10,000 Stores

must not load everything on login.

Use:

pagination
server filtering
summary aggregates

Avoid N+1 counts.

===========================================================
95. INDEXES
===========================================================

Potential:

ClientAccount:
tenantId + status
tenantId + slug unique

AccessGrant:
tenantId + userId
clientAccountId + userId

Invitation:
tenantId + email + status
tokenHash unique

WhiteLabel:
tenantId unique

Entitlement:
tenantId + featureKey
clientAccountId + featureKey where applicable

Do not duplicate coverage.

===========================================================
96. OBSERVABILITY
===========================================================

Log safe identifiers:

tenantId
clientId
userId
operation
permission denial reason category

Never log:

invite raw token
session token
secret
PII unnecessarily

===========================================================
97. NO HARDCODED FEATURE FLAGS
===========================================================

Search production source for:

plan ===
isPro
premiumUser
agencyName ===
clientName ===
featureEnabled = true

Replace applicable product-access logic with EntitlementService.

Do not remove legitimate development flags without review.

===========================================================
98. NO FAKE CLIENT DATA
===========================================================

Search production paths for:

demo client
fake agency
sample users
hardcoded portal branding
mock entitlement
Math.random usage

Remove from production flows.

Test/demo fixtures may remain isolated.

===========================================================
99. UI ARCHITECTURE
===========================================================

Suggested feature areas:

features/agency/
├── clients/
├── members/
├── invitations/
├── branding/
├── entitlements/
├── onboarding/
└── dashboard/

Do not create one giant:

agency-manager.tsx

===========================================================
100. ACCEPTANCE CRITERIA
===========================================================

Phase 14 is complete only when:

[ ] existing Tenant semantics audited

[ ] no duplicate tenancy system created

[ ] Agency mode implemented

[ ] Client grouping implemented where needed

[ ] multiple Brands per Client supported

[ ] direct-client backward compatibility preserved

[ ] Agency users can manage permitted Clients

[ ] Client users limited to own scope

[ ] Store-level restriction supported where architecture allows

[ ] secure invitations implemented

[ ] invitation expiry/revoke/replay safety verified

[ ] role/capability architecture reused

[ ] AppContext/ContextResolver extended cleanly

[ ] white-label portal config implemented

[ ] WhiteLabelConfig separated from BrandTheme

[ ] custom portal domain supported safely

[ ] auth/cookie security verified for custom domain

[ ] white-label report branding integrated

[ ] entitlement service implemented

[ ] feature access enforced server-side

[ ] background jobs respect entitlements

[ ] client suspension/archive non-destructive

[ ] Agency dashboard implemented

[ ] Client portal implemented

[ ] RLS verified

[ ] client-within-tenant isolation verified

[ ] cross-brand isolation verified

[ ] cross-store isolation verified where configured

[ ] cross-tenant isolation verified

[ ] no hardcoded client/agency production data

===========================================================
101. VERIFICATION
===========================================================

Run:

npx prisma validate
npx prisma migrate status

typecheck
lint touched files

Tenant regression tests
Agency tests
Client-scope tests
Brand/store-scope tests
Invitation tests
token security tests
membership tests
role/capability tests
white-label tests
custom-domain tests
auth-cookie tests
entitlement tests
worker-entitlement tests
client suspension tests
RLS tests
cross-tenant tests

Regression:

Phase 0 Security
Phase 1 WebSurface
Phase 2 Catalog
Phase 3 Website Engine
Phase 4 Analytics
Phase 5 Attribution
Phase 6 GBP
Phase 7 Rank
Phase 8 Merchant
Phase 9 Calls
Phase 10 Opportunities
Phase 11 Content
Phase 12 Listings
Phase 13 Reporting

production build

Measure:

Agency dashboard query count
Client list pagination
context resolution latency
custom-domain routing impact

===========================================================
102. FINAL REPORT
===========================================================

Return:

# PHASE 14 IMPLEMENTATION REPORT

## Pre-flight
Tenant meaning:
Brand ownership:
Current memberships:
Current invitation model:
Current feature controls:

## Hierarchy
Agency:
Client:
Brand:
Store:
Backward compatibility:

## Authorization
Roles:
Capabilities:
Access scopes:
ContextResolver:
Client isolation:
Store isolation:

## Invitations
Create:
Accept:
Expiry:
Revoke:
Replay protection:
Existing-user handling:

## White-label
WhiteLabelConfig:
Portal branding:
Custom domain:
Login:
Reports:
Email branding:

## Entitlements
Feature keys:
Service:
Client-level overrides:
Usage limits:
Server enforcement:
Worker enforcement:

## Client lifecycle
Create:
Onboard:
Suspend:
Archive:

## Agency UI
Client list:
Client switcher:
Team:
Dashboard:

## Client portal
Overview:
Brands:
Stores:
Feature visibility:
Reports:

## Security
RLS:
Within-tenant Client isolation:
Cross-brand:
Cross-store:
Cross-tenant:
Cookie/custom-domain safety:

## Performance
Pagination:
Indexes:
Caching:
Context resolution:

## Verification
Prisma:
TypeScript:
Lint:
Tests:
Build:

## Deferred
Billing:
Payments:
Invoices:
SAML/SSO:
SCIM:
Agency reseller billing:
CRM:
Public API monetization:

Finish with:

PHASE 14 STATUS

Agency hierarchy implemented: YES/NO
Client model/grouping implemented safely: YES/NO
Direct-client compatibility preserved: YES/NO
Client-scoped access verified: YES/NO
Store-scoped access verified: YES/NO
Secure invitations implemented: YES/NO
Invitation replay protection verified: YES/NO
White-label portal implemented: YES/NO
Custom portal domain verified: YES/NO
Auth cookie safety verified: YES/NO
White-label reporting implemented: YES/NO
Entitlement service implemented: YES/NO
Server-side feature enforcement verified: YES/NO
Worker entitlement enforcement verified: YES/NO
Client suspension/archive verified: YES/NO
RLS verified: YES/NO
Within-tenant client isolation verified: YES/NO
Cross-brand isolation verified: YES/NO
Cross-tenant isolation verified: YES/NO
No synthetic client data verified: YES/NO
Existing phases preserved: YES/NO
Ready for Phase 15: YES/NO




15_______________________________________________

# LOCALBI — PHASE 15
## SUBSCRIPTIONS + USAGE METERING + BILLING + PAYMENTS + INVOICES
## PLAN ENTITLEMENTS + QUOTAS + BILLING PROVIDER + PAYMENT WEBHOOKS

Act as a Principal SaaS Architect, Staff TypeScript Engineer,
Subscription Billing Architect, Payments Integration Engineer,
PostgreSQL/Prisma Architect, Webhook Security Engineer,
Multi-Tenant SaaS Architect, Finance Systems Engineer
and Next.js Engineer.

Phases 0–14 are assumed complete.

EXPECTED CURRENT FOUNDATION:

Platform
  ↓
Tenant
  ↓
Agency / Direct Client
  ↓
ClientAccount
  ↓
Brand
  ↓
Stores / Products / Integrations / Reports

Phase 14 already introduced or normalized:

- EntitlementService
- feature entitlements
- usage limits
- Agency / Client hierarchy
- white-label portal
- user access
- background-job entitlement checks

NOW IMPLEMENT PHASE 15 ONLY:

Plan Catalog
    ↓
Subscription
    ↓
Entitlements
    ↓
Usage Metering
    ↓
Invoice
    ↓
Payment Provider
    ↓
Payment Webhook
    ↓
Subscription State
    ↓
Feature Access

DO NOT IMPLEMENT YET:

- enterprise sales CRM
- revenue forecasting
- tax engine for every jurisdiction
- complex reseller settlement
- affiliate commissions
- marketplace billing
- usage-based overage charging unless clearly required
- SAML / SCIM
- public API monetization
- automated collections calling
- accounting-system integrations
- multi-entity international accounting
- custom contract management

===========================================================
0. PRIMARY BUSINESS GOAL
===========================================================

LocalBi must be able to answer:

"What plan is this Tenant on,
what features are enabled,
how much usage has been consumed,
what is their billing status,
and should a feature request be allowed?"

Example:

Tenant:
LP Digital

Plan:
Growth Agency

Billing:
₹24,999 / month

Status:
ACTIVE

Included:

Clients               20
Brands                50
Stores               200
Users                 30

Rank Keywords        2,000
Rank Checks         50,000 / month

Merchant Products   25,000

Scheduled Reports      100 / month

AI Generations        1,000 / month

Call Tracking Numbers   50

Features:

GBP                 Enabled
Website             Enabled
Analytics           Enabled
Rank Tracking       Enabled
Merchant            Enabled
Call Tracking       Enabled
Opportunities       Enabled
Content             Enabled
Listings            Enabled
Reporting           Enabled

Usage:

Rank Checks:
31,420 / 50,000

AI Generations:
620 / 1,000

Scheduled Reports:
44 / 100

If usage limit is exceeded:

server-side execution must reject or enforce defined product policy.

Do NOT merely hide the UI button.

===========================================================
1. RE-AUDIT CURRENT COMMERCIAL ARCHITECTURE FIRST
===========================================================

Before implementing anything inspect CURRENT:

- Tenant
- ClientAccount
- Subscription models
- Plan models
- EntitlementService
- usage counters
- feature flags
- Agency structure
- rank quota checks
- AI usage checks
- report schedules
- Merchant limits
- call-number limits
- Google sync jobs
- background workers
- billing-related code
- payment provider SDKs
- webhook routes
- invoices
- tax/GST fields
- currency handling
- notifications
- audit logs

Search for:

subscription
plan
billing
payment
invoice
checkout
customer
priceId
stripe
razorpay
paddle
cashfree
paypal
gst
tax
quota
usage
entitlement
trial
cancel
renew
past_due
payment_failed
webhook

Produce:

PHASE 15 PRE-FLIGHT

Current Plan model:
Current Subscription model:
Current Entitlement model:
Current usage counters:
Current billing provider:
Current webhook infrastructure:
Current invoice handling:
Current tax handling:
Current currency handling:
Current trial logic:
Current cancellation logic:
Current feature enforcement:
Current hardcoded plan checks:

Classify:

KEEP
EXTEND
REFACTOR
REPLACE
MISSING

Do not create duplicate billing systems.

===========================================================
2. BILLING PROVIDER — VERIFY FIRST
===========================================================

Before implementing provider-specific payment logic:

determine which billing provider LocalBi will actually use.

Possible examples:

- Razorpay
- Stripe
- Cashfree
- Paddle
- other supported provider

Do NOT implement multiple providers simultaneously unless architecture
already requires it.

Verify CURRENT official provider documentation for:

- customers
- products/plans/prices
- subscriptions
- checkout
- payment methods
- recurring payments
- invoices
- payment intents/orders
- trials
- cancellation
- upgrades/downgrades
- proration
- webhook signing
- webhook retry semantics
- idempotency
- taxes/GST support
- refunds
- payment failures

Produce:

BILLING PROVIDER CONTRACT REPORT

Provider:
Customer object:
Plan/Price object:
Subscription API:
Checkout API:
Invoice API:
Webhook signing:
Webhook events:
Retry behavior:
Idempotency:
Refund API:
Trial support:
Proration support:
Tax/GST support:
Deprecated APIs avoided:

Use current official API contracts.

===========================================================
3. BILLING PROVIDER ABSTRACTION
===========================================================

Do not scatter provider SDK calls across routes.

Create:

BillingProvider

Conceptual interface:

createCustomer()
updateCustomer()

createCheckoutSession()
createSubscription()
updateSubscription()
cancelSubscription()
resumeSubscription()

getSubscription()

getInvoice()
listInvoices()

createBillingPortalSession()
or equivalent if provider supports it

verifyWebhook()
normalizeWebhookEvent()

refundPayment()
only if required

Provider-specific code stays isolated.

===========================================================
4. LOCALBI PLAN IS SOURCE OF PRODUCT ENTITLEMENTS
===========================================================

Do NOT let payment-provider Product metadata become the only source of truth
for LocalBi features.

Correct:

LocalBi Plan
    ↓
Plan Entitlements
    ↓
Provider Price Mapping

Provider handles money/payment lifecycle.

LocalBi controls:

features
limits
product behavior

===========================================================
5. PLAN MODEL
===========================================================

Create/normalize a Plan model.

Conceptually:

Plan

id

code
name
description?

audience:
DIRECT
AGENCY
BOTH

status:
ACTIVE
INACTIVE

billingInterval:
MONTHLY
YEARLY

currency

basePrice

trialDays?

isPublic

createdAt
updatedAt

Do not blindly copy fields.

If monthly/yearly share same feature package:

consider:

Plan
+
PlanPrice

rather than duplicate entire Plan.

===========================================================
6. PLAN PRICE MODEL
===========================================================

Recommended if multiple intervals/currencies are needed:

PlanPrice

id
planId

currency
amount

interval:
MONTH
YEAR

provider
providerPriceId

status

createdAt
updatedAt

Never use floating point for currency.

Follow existing Decimal/minor-unit strategy.

===========================================================
7. PLAN ENTITLEMENTS
===========================================================

Phase 14 introduced EntitlementService.

Extend it instead of replacing it.

Create:

PlanEntitlement

planId
featureKey

enabled

limitType?
limitValue?

Examples:

RANK_TRACKING
enabled = true

RANK_CHECKS_MONTHLY
limit = 50000

CLIENTS
limit = 20

STORES
limit = 200

Do not scatter limits in code.

===========================================================
8. TENANT OVERRIDES
===========================================================

Some enterprise customers may have custom contracts.

Support explicit override layer:

Plan Entitlement
      ↓
Tenant Override
      ↓
Client Override where Phase 14 permits
      ↓
Effective Entitlement

Precedence must be documented.

Example:

Plan allows 100 stores.

Enterprise override:
250 stores.

Do not modify shared Plan for one customer.

===========================================================
9. EFFECTIVE ENTITLEMENT RESOLUTION
===========================================================

One canonical service:

EntitlementService.getEffectiveEntitlement()

Input:

tenant
client?
feature

Output:

enabled
limit
source
expiresAt?
usage?

Potential precedence:

Client override
Tenant override
Subscription Plan
Platform default

Define exact precedence once.

===========================================================
10. SUBSCRIPTION MODEL
===========================================================

Create/normalize Subscription.

Conceptually:

Subscription

id
tenantId

planId
planPriceId?

provider
providerCustomerId
providerSubscriptionId

status:
TRIALING
ACTIVE
PAST_DUE
PAYMENT_FAILED
CANCEL_PENDING
CANCELLED
EXPIRED
SUSPENDED

currentPeriodStart
currentPeriodEnd

trialStart?
trialEnd?

cancelAtPeriodEnd

cancelledAt?
endedAt?

createdAt
updatedAt

Provider raw status should remain separately available if needed.

===========================================================
11. DO NOT TRUST CLIENT-SIDE SUBSCRIPTION STATUS
===========================================================

Browser cannot submit:

status = ACTIVE

and unlock features.

Subscription state changes come from:

verified provider API/webhooks
or authorized internal admin action.

===========================================================
12. BILLING CUSTOMER MODEL
===========================================================

Determine if provider customer IDs belong directly on Subscription or a
separate BillingCustomer model.

Potential:

BillingCustomer

tenantId
provider
providerCustomerId

billingName
billingEmail

taxId?
billingAddress?

Do not duplicate Tenant profile unnecessarily.

===========================================================
13. CUSTOMER CREATION
===========================================================

On first paid checkout:

resolve/create one provider customer per Tenant/provider.

Do not create new provider Customer for every payment.

===========================================================
14. CHECKOUT FLOW
===========================================================

Correct conceptual flow:

Authenticated Tenant Admin
    ↓
Select Plan
    ↓
Server validates Plan
    ↓
Server creates provider checkout/order/session
    ↓
Provider-hosted/secure payment
    ↓
Provider callback/webhook
    ↓
Server verifies payment/subscription
    ↓
Subscription becomes ACTIVE
    ↓
Entitlements refresh

Never:

payment success page
→ directly mark ACTIVE

without provider verification.

===========================================================
15. CHECKOUT AUTHORIZATION
===========================================================

Only authorized roles may:

start subscription
upgrade
downgrade
cancel
change payment method

Potential capability:

BILLING_VIEW
BILLING_MANAGE

Client users under Agency should not automatically manage Agency billing.

===========================================================
16. PAYMENT WEBHOOK SECURITY
===========================================================

Critical.

Every webhook must:

verify provider signature
check timestamp/replay protection if supported
validate event shape
deduplicate event
derive Tenant from provider identifiers
never trust tenantId in body

Do not accept unsigned provider callbacks.

===========================================================
17. BILLING WEBHOOK EVENT MODEL
===========================================================

Persist processed provider event identity.

Conceptually:

BillingWebhookEvent

id
provider
providerEventId

eventType
receivedAt
processedAt?

status:
RECEIVED
PROCESSED
FAILED
IGNORED

payloadHash

Do not store provider secrets.

Raw payload retention only if required and securely bounded.

===========================================================
18. WEBHOOK IDEMPOTENCY
===========================================================

Provider may deliver same event multiple times.

Same event must NOT:

create duplicate invoice
activate twice
grant duplicated credits
send duplicate notifications

Unique providerEventId required where available.

===========================================================
19. OUT-OF-ORDER BILLING EVENTS
===========================================================

Webhook order is not guaranteed.

Do not blindly apply:

last received event = current truth.

Use:

provider subscription state
event timestamps
status transition rules

If ambiguous:

re-fetch authoritative provider Subscription.

===========================================================
20. SUBSCRIPTION STATE MACHINE
===========================================================

Define valid transitions.

Example:

TRIALING
→ ACTIVE

ACTIVE
→ PAST_DUE

PAST_DUE
→ ACTIVE

ACTIVE
→ CANCEL_PENDING

CANCEL_PENDING
→ CANCELLED

Do not allow invalid transition solely because stale webhook arrived.

===========================================================
21. TRIALS
===========================================================

If trials are supported:

Trial begins once according to product policy.

Track:

trialStart
trialEnd

Do not reset trial by repeatedly creating checkout.

Use Tenant-level trial eligibility.

===========================================================
22. TRIAL ENTITLEMENTS
===========================================================

Trial may grant:

full plan

or limited feature set.

Define through entitlements.

Do not scatter:

if trial...

through modules.

===========================================================
23. TRIAL EXPIRY
===========================================================

At expiry:

if paid subscription activated:
ACTIVE

otherwise:
EXPIRED / appropriate state

Background jobs must respect resulting feature state.

Do not delete data.

===========================================================
24. PLAN UPGRADE
===========================================================

Upgrade example:

Starter
→ Growth

Correct flow:

validate target plan
provider subscription update
provider confirmation
subscription plan update
entitlement recompute

Proration handling follows verified provider capabilities/product policy.

Do not invent proration calculations locally if provider owns billing.

===========================================================
25. DOWNGRADE
===========================================================

Downgrade is more complex because usage may exceed future limits.

Example:

Current:
200 Stores

Target Plan Limit:
50 Stores

Do NOT delete 150 Stores.

Create:

downgrade compatibility check.

Possible behavior:

downgrade scheduled for next period
existing data preserved
new additions blocked
feature limitations applied according to policy

Document exact product policy.

===========================================================
26. DOWNGRADE IMPACT ANALYSIS
===========================================================

Before confirmation show:

Current Usage
Target Limit

Stores:
120 / 50

Keywords:
500 / 250

Users:
18 / 10

Explain consequences.

Do not silently disable random Stores.

===========================================================
27. CANCELLATION
===========================================================

Support:

cancel immediately
or
cancel at period end

according to product/provider capability.

Default SaaS pattern may use:

cancel at period end

but follow product decision.

===========================================================
28. CANCELLATION MUST PRESERVE DATA
===========================================================

Cancelled Subscription must not:

delete Brands
delete Stores
delete analytics
delete Leads
delete reports
delete integrations

Feature access becomes restricted according to retention/product policy.

===========================================================
29. REACTIVATION
===========================================================

If provider supports resume before cancellation date:

support it safely.

If already fully cancelled:

new subscription may be needed.

Do not fake resume state.

===========================================================
30. PAYMENT FAILURE
===========================================================

Handle payment failure distinctly.

Potential:

PAST_DUE
PAYMENT_FAILED

Do not instantly erase access unless product grace policy says so.

===========================================================
31. GRACE PERIOD
===========================================================

If LocalBi supports grace period:

model it explicitly.

Example:

payment failed
→ grace 7 days
→ restrict write-heavy/paid features
→ suspend if unpaid

Do not hardcode date calculations across modules.

===========================================================
32. FEATURE ACCESS DURING PAST_DUE
===========================================================

Define central BillingAccessPolicy.

Example policy:

Read reports:
allowed during grace

New rank runs:
blocked after grace

Existing data:
preserved

Do not implement module-specific random behavior.

===========================================================
33. INVOICES
===========================================================

Create normalized Invoice snapshot/model.

Conceptually:

Invoice

id
tenantId
subscriptionId

provider
providerInvoiceId

invoiceNumber?

currency
subtotal
tax
total
amountPaid
amountDue

status:
DRAFT
OPEN
PAID
VOID
FAILED
REFUNDED
PARTIALLY_REFUNDED

periodStart?
periodEnd?

issuedAt
dueAt?
paidAt?

providerInvoiceUrl?
providerPdfUrl?

createdAt
updatedAt

Only map statuses actually supported by selected provider.

===========================================================
34. INVOICE SOURCE OF TRUTH
===========================================================

If provider creates invoices:

LocalBi stores normalized snapshot/reference.

Do not create conflicting independent amounts.

===========================================================
35. TAX / GST
===========================================================

Audit current business jurisdiction and provider support.

Support enough billing fields for:

legal business name
billing address
GSTIN/tax ID if applicable

Do NOT build a universal tax engine during Phase 15.

Prefer provider tax calculation where supported.

If LocalBi calculates tax:

formula and jurisdiction must be explicit and tested.

===========================================================
36. MONEY HANDLING
===========================================================

Never use uncontrolled JS floating point for money.

Use:

integer minor units

or:

Prisma Decimal

consistently.

Example:

₹24,999.00

stored safely.

===========================================================
37. CURRENCY
===========================================================

Do not assume INR globally.

PlanPrice defines currency.

Avoid accidental:

Tenant paying INR
invoice labeled USD.

===========================================================
38. PAYMENT MODEL
===========================================================

If provider invoice information is insufficient for payment history,
create normalized Payment.

Potential:

Payment

id
tenantId
invoiceId?

provider
providerPaymentId

amount
currency

status

paidAt?
failedAt?

paymentMethodType?

Do not store full card details.

===========================================================
39. PAYMENT METHOD SECURITY
===========================================================

Never store:

card number
CVV
full bank credentials

Use provider tokenization.

Only store safe display metadata if needed:

Visa
•••• 4242

expiry where provider safely supplies it.

===========================================================
40. REFUNDS
===========================================================

Only implement refunds if product needs them now.

If implemented:

authorized Billing Admin
→ provider refund
→ webhook/API confirmation
→ local normalized state

Never just edit Invoice amount locally.

===========================================================
41. PLAN CATALOG UI
===========================================================

Admin/public pricing page if required:

Starter
Growth
Agency

Features
limits
monthly/yearly price

Data comes from Plan catalog.

Do not hardcode pricing in React components.

===========================================================
42. BILLING PAGE
===========================================================

Tenant billing area:

Current Plan
Status
Current Period
Next Renewal
Usage
Payment Method
Invoices

Actions:

Upgrade
Change Plan
Cancel
Manage Payment Method

Only show capabilities provider actually supports.

===========================================================
43. USAGE METERING
===========================================================

Phase 14 created limits.

Now create robust usage metering.

Need to answer:

How many units has Tenant consumed during billing/usage period?

===========================================================
44. USAGE METRIC REGISTRY
===========================================================

Create canonical metric keys.

Examples:

CLIENT_COUNT
BRAND_COUNT
STORE_COUNT
ACTIVE_USERS

RANK_KEYWORDS
RANK_CHECKS_MONTHLY

MERCHANT_PRODUCTS

TRACKING_NUMBERS

SCHEDULED_REPORTS_MONTHLY

AI_GENERATIONS_MONTHLY

CONTENT_ITEMS

Do not create arbitrary string keys throughout code.

===========================================================
45. STOCK VS FLOW USAGE
===========================================================

Distinguish:

STOCK

current number:

Stores
Users
Keywords
Tracking Numbers

versus:

FLOW

consumed during period:

Rank Checks
AI generations
Report deliveries

Different metering semantics.

===========================================================
46. USAGE COUNTER MODEL
===========================================================

For FLOW metrics, potentially:

UsageCounter

tenantId
metricKey

periodStart
periodEnd

used

updatedAt

But do not blindly increment without event traceability where billing-critical.

===========================================================
47. USAGE LEDGER
===========================================================

For billing/critical usage, prefer append-only ledger.

Conceptually:

UsageEvent

id
tenantId

metricKey
quantity

sourceType
sourceId

occurredAt

periodKey

idempotencyKey

This allows counter reconciliation.

===========================================================
48. USAGE EVENT IDEMPOTENCY
===========================================================

Example:

Rank job retried.

Should consume one rank-check usage event, not three.

Tie usage idempotency to business operation.

===========================================================
49. USAGE COUNTER RECONCILIATION
===========================================================

Periodically compare:

UsageCounter

against:

UsageEvent aggregate

for critical metrics.

Detect drift.

===========================================================
50. WHEN TO CONSUME USAGE
===========================================================

Define per metric.

Example:

Rank check:

consume when provider request is actually executed,
not merely when UI button clicked.

AI generation:

consume when provider request accepted/executed according to policy.

Scheduled report:

consume when report generated/delivered based on metric definition.

Document this.

===========================================================
51. FAILED OPERATIONS
===========================================================

Do not always charge usage for provider failures.

Define policy per metric.

Example:

rank provider 500 before execution:
no usage

provider successfully performed search but downstream UI failed:
usage may count

Need clear deterministic rule.

===========================================================
52. LIMIT CHECK FLOW
===========================================================

Correct:

request
   ↓
authorization
   ↓
entitlement
   ↓
usage limit
   ↓
reserve/execute
   ↓
record usage
   ↓
result

Avoid race condition where 20 concurrent requests all see:

49,999 / 50,000

and all proceed.

===========================================================
53. ATOMIC USAGE ENFORCEMENT
===========================================================

Use DB transaction/atomic counter/reservation strategy.

Do not rely only on:

if (used < limit)

outside transaction.

===========================================================
54. USAGE RESERVATION
===========================================================

For expensive async jobs:

reserve usage before queueing where appropriate.

If job is cancelled/fails before billable operation:

release reservation.

Design explicitly.

===========================================================
55. UNLIMITED
===========================================================

Represent unlimited clearly.

Do not use magic number:

999999999

Prefer:

limit = null
or explicit limit type.

===========================================================
56. PLAN CHANGE + USAGE
===========================================================

If upgrade mid-period:

determine whether usage limit updates immediately.

Example:

Starter:
10k rank checks

used:
9k

upgrade Growth:
50k

effective:
50k immediately

according to product policy.

Do not reset usage accidentally.

===========================================================
57. DOWNGRADE + USAGE
===========================================================

If downgrade next period:

current period retains current plan until effective date.

Do not reduce current quota prematurely unless product policy says so.

===========================================================
58. BILLING PERIOD VS CALENDAR PERIOD
===========================================================

Do not assume usage resets on first day of month.

Use:

subscription billing period

unless product explicitly defines calendar-month quotas.

Store period boundaries.

===========================================================
59. TIMEZONE
===========================================================

Billing timestamps typically use UTC.

Display in Tenant timezone.

Do not calculate period validity from browser timezone.

===========================================================
60. USAGE DASHBOARD
===========================================================

Show:

Rank Checks
31,420 / 50,000

AI Generations
620 / 1,000

Scheduled Reports
44 / 100

Stores
81 / 200

Users
19 / 30

Use progress bar cautiously.

Warn near limit.

===========================================================
61. USAGE WARNINGS
===========================================================

Potential:

80%
90%
100%

notifications.

Do not spam.

Deduplicate per metric/period/threshold.

===========================================================
62. LIMIT EXCEEDED UX
===========================================================

Return typed error:

FEATURE_LIMIT_EXCEEDED

including:

feature
currentUsage
limit
period

No generic 500.

UI may show:

Upgrade Plan

only if user has billing permission.

===========================================================
63. PLAN FEATURE DISABLED UX
===========================================================

Typed:

FEATURE_NOT_INCLUDED

Different from:

LIMIT_EXCEEDED.

===========================================================
64. PROVIDER CHECKOUT PRICE SECURITY
===========================================================

Browser must never send trusted arbitrary:

amount = 1

Correct:

browser sends:

planPriceId

Server resolves amount/providerPriceId from DB.

===========================================================
65. PRICE TAMPERING TEST
===========================================================

Browser modifies checkout payload amount.

Server ignores it.

Provider session uses stored PlanPrice.

===========================================================
66. PROVIDER CUSTOMER OWNERSHIP
===========================================================

providerCustomerId must map uniquely to correct Tenant.

Never resolve Tenant using billing email alone.

===========================================================
67. PAYMENT SUCCESS PAGE
===========================================================

Success page may show:

Payment received / processing

but should load authoritative Subscription state.

Do not mark ACTIVE based on URL query:

?success=true

===========================================================
68. PAYMENT CANCEL PAGE
===========================================================

Payment cancelled:

Subscription remains previous state.

No false cancellation of existing active subscription.

===========================================================
69. WEBHOOK REPLAY PROTECTION
===========================================================

Verify provider signature.

If timestamped signature supported:

validate reasonable age.

Persist providerEventId.

===========================================================
70. WEBHOOK FAILURE RECOVERY
===========================================================

If webhook processing fails:

return/provider retry appropriately.

Have internal retry/dead-letter path.

Do not swallow webhook and lose billing state.

===========================================================
71. BILLING RECONCILIATION JOB
===========================================================

Because webhooks can be missed:

run periodic reconciliation.

For active/recent subscriptions:

fetch authoritative provider state.

Repair discrepancies safely.

Do not fetch every historical subscription every hour.

===========================================================
72. RECONCILIATION CONFLICT
===========================================================

Provider says:

ACTIVE

LocalBi says:

PAST_DUE

Reconcile using provider as payment lifecycle authority.

Audit correction.

===========================================================
73. BACKGROUND JOB ENTITLEMENT REFRESH
===========================================================

After Subscription change:

invalidate/refresh entitlement caches.

Workers must see new plan promptly.

===========================================================
74. ENTITLEMENT CACHE
===========================================================

If caching effective entitlement:

key includes:

tenant
client if applicable
feature
subscription/version

Invalidate on:

plan update
override
subscription status
trial change

===========================================================
75. FEATURE DISABLE ON CANCELLATION
===========================================================

When effective subscription expires:

EntitlementService must resolve according to fallback plan/product policy.

Do not leave paid features active indefinitely because old cache exists.

===========================================================
76. FREE PLAN
===========================================================

If LocalBi has a free plan:

model as Plan.

Do not treat:

subscription == null

as a dozen special cases.

Potential:

Tenant without paid Subscription
→ default FREE Plan

If product has no free plan:

use NO_ACTIVE_SUBSCRIPTION state.

===========================================================
77. INTERNAL / COMPLIMENTARY PLAN
===========================================================

Support non-provider subscriptions for:

internal testing
partners
complimentary customers

but require authorized platform admin.

Mark source:

INTERNAL

Do not create fake paid invoices.

===========================================================
78. MANUAL ENTERPRISE CONTRACT
===========================================================

Potential:

Subscription source:
MANUAL_CONTRACT

Entitlements still use same service.

Billing provider may not exist.

Do not force all enterprise customers through online checkout.

===========================================================
79. AGENCY CLIENT BILLING
===========================================================

Phase 15 first billing boundary should generally be:

Tenant / Agency

NOT every ClientAccount independently,

unless product explicitly sells per-client subscriptions.

Agency Tenant pays LocalBi.

Agency decides Client entitlements through Phase 14.

Do not accidentally create duplicate billing per Brand.

===========================================================
80. DIRECT CLIENT BILLING
===========================================================

Direct-client Tenant:

Tenant itself is billing customer.

Same Subscription architecture.

===========================================================
81. RESELLER BILLING
===========================================================

Do NOT implement complex reseller commission/settlement during Phase 15.

Only prepare extension points if necessary.

===========================================================
82. INVOICE UI
===========================================================

Billing page:

Invoice Number
Date
Amount
Status
Download

Use provider invoice PDF/url where safe.

If LocalBi generates invoices independently:

must use immutable snapshot.

===========================================================
83. INVOICE ACCESS SECURITY
===========================================================

Only authorized Tenant billing users may access invoices.

Do not expose permanent public invoice links unless provider handles secure
access.

===========================================================
84. GST / TAX ID UI
===========================================================

Tenant billing profile may support:

Legal Name
Billing Address
GSTIN / Tax ID

Validate format based on configured country only where appropriate.

Do not assume every Tenant is Indian.

===========================================================
85. AUDIT LOGGING
===========================================================

Audit:

subscription created
plan changed
cancel requested
cancel reversed
manual entitlement changed
refund initiated
billing profile changed

Do not put full payment provider payload in audit logs.

===========================================================
86. NOTIFICATIONS
===========================================================

Potential:

Trial ending
Payment failed
Subscription renewed
Cancellation scheduled
Usage 90%
Invoice available

Reuse current notification/email infrastructure.

Deduplicate events.

===========================================================
87. EMAIL PAYMENT SECURITY
===========================================================

Do not send:

card details
provider secrets
private payment tokens.

Email links should point to authenticated billing page/provider-hosted
secure page.

===========================================================
88. RLS
===========================================================

Tenant-owned billing tables:

Subscription
BillingCustomer
Invoice
Payment if created
UsageCounter
UsageEvent
Tenant entitlement overrides

must use:

tenantId
ENABLE ROW LEVEL SECURITY
FORCE ROW LEVEL SECURITY

Plan catalog itself may be platform/global and should not necessarily use
tenant RLS.

Document distinction.

===========================================================
89. PLATFORM ADMIN AUTHORIZATION
===========================================================

Plan creation/editing:

platform-admin operation

not Tenant admin.

Do not let customers edit price/features of public Plan.

===========================================================
90. TENANT BILLING AUTHORIZATION
===========================================================

Tenant roles:

BILLING_VIEW
BILLING_MANAGE

Only BILLING_MANAGE:

checkout
upgrade
downgrade
cancel
payment method

===========================================================
91. CLIENT-SCOPE SAFETY
===========================================================

ClientAccount admin under Agency must not modify Agency Tenant subscription
unless explicitly granted Tenant billing capability.

===========================================================
92. CROSS-TENANT BILLING SAFETY
===========================================================

Tenant A cannot:

read Tenant B Subscription
read invoices
use provider customer ID
change Tenant B plan
access Tenant B checkout

===========================================================
93. PLAN API
===========================================================

Public/tenant-readable:

active Plans and prices where appropriate.

Admin:

create/update/deactivate plans.

Do not expose hidden enterprise/internal pricing publicly.

===========================================================
94. SUBSCRIPTION API
===========================================================

Create/reuse:

GET current subscription
POST checkout
POST upgrade/change
POST cancel
POST resume

Exact routes follow project conventions.

All mutations:

session
tenant context
BILLING_MANAGE
Zod
provider service

===========================================================
95. WEBHOOK API
===========================================================

Example:

POST /api/webhooks/billing/[provider]

No user session required.

Security comes from:

provider signature
event validation
idempotency

Do not protect webhook with normal browser auth.

===========================================================
96. USAGE API
===========================================================

Expose read-only normalized usage:

metric
used
limit
remaining
periodStart
periodEnd

Do not allow browser to increment usage directly.

===========================================================
97. QUERY KEYS
===========================================================

Centralize:

billingKeys.subscription(...)
billingKeys.plans(...)
billingKeys.invoices(...)
billingKeys.usage(...)
billingKeys.entitlements(...)

===========================================================
98. UI ARCHITECTURE
===========================================================

Suggested:

features/billing/
├── plans/
├── subscription/
├── usage/
├── invoices/
├── payment-method/
├── components/
├── hooks/
└── api/

modules/billing/
├── billing-provider.ts
├── subscription-service.ts
├── invoice-service.ts
├── usage-service.ts
├── billing-access-policy.ts
└── providers/

Do not create one giant billing-manager.tsx.

===========================================================
99. DATABASE INDEXES
===========================================================

Potential:

Subscription:
tenantId
provider + providerSubscriptionId unique
status + currentPeriodEnd

BillingCustomer:
tenantId + provider unique
providerCustomerId unique/provider scoped

Invoice:
tenantId + issuedAt
provider + providerInvoiceId unique

UsageEvent:
tenantId + metricKey + occurredAt
idempotencyKey unique within tenant/metric semantics

UsageCounter:
tenantId + metricKey + periodStart unique

Do not duplicate indexes.

===========================================================
100. PAYMENT PROVIDER SECRETS
===========================================================

Provider secret keys:

server-only
environment/secret infrastructure

Never:

browser
database plaintext
logs
HTML
Puck
report payload

Webhook secret likewise protected.

===========================================================
101. NO HARDCODED PLAN LOGIC
===========================================================

Search production source for:

plan === "pro"
plan === "agency"
isPremium
isPaid
maxStores = 10
maxKeywords = 100
if subscription

Replace product-entitlement decisions with:

EntitlementService
BillingAccessPolicy

Do not blindly remove legitimate display labels/tests.

===========================================================
102. NO FAKE PAYMENT DATA
===========================================================

Search production paths for:

mock invoice
fake payment success
hardcoded transaction
dummy subscription
Math.random invoice ID
sample paid state

Remove production fallbacks.

Tests may use explicit fixtures.

===========================================================
103. TEST — CHECKOUT
===========================================================

Tenant Admin selects Growth Plan.

Server resolves stored PlanPrice.

Provider checkout created.

No Subscription ACTIVE until verified provider event/state.

===========================================================
104. TEST — PRICE TAMPERING
===========================================================

Browser submits:

Growth plan
amount = ₹1

Server ignores amount.

Stored provider price used.

===========================================================
105. TEST — DUPLICATE WEBHOOK
===========================================================

subscription.active event delivered 3 times.

Expected:

one processed billing state transition.

No duplicate invoice/notification/credits.

===========================================================
106. TEST — OUT-OF-ORDER WEBHOOK
===========================================================

Older PAST_DUE event arrives after newer ACTIVE event.

Final state must remain authoritative/current.

===========================================================
107. TEST — PAYMENT FAILURE
===========================================================

Provider reports failure.

Subscription enters defined failure/grace state.

Do not delete data.

===========================================================
108. TEST — RECOVERY
===========================================================

Payment later succeeds.

Subscription returns ACTIVE.

Entitlements restored.

===========================================================
109. TEST — CANCELLATION
===========================================================

Cancel at period end.

Until period end:

features remain according to policy.

After effective cancellation:

paid entitlements removed/restricted.

Data retained.

===========================================================
110. TEST — UPGRADE
===========================================================

Rank limit:

10k → 50k.

Used:
9k.

After effective upgrade:

usage remains 9k.

New limit:
50k.

===========================================================
111. TEST — DOWNGRADE
===========================================================

Current Stores:
120

Target limit:
50

Downgrade must not delete 70 Stores.

System shows compatibility warning/policy.

===========================================================
112. TEST — STOCK LIMIT
===========================================================

Store limit:
100.

Currently:
100.

Create new Store:

server rejects FEATURE_LIMIT_EXCEEDED.

===========================================================
113. TEST — FLOW LIMIT
===========================================================

Rank check limit:
50,000.

Used:
49,999.

Two concurrent requests try to consume one each.

Only allowed quantity according to atomic limit enforcement.

No race overflow.

===========================================================
114. TEST — USAGE IDEMPOTENCY
===========================================================

Rank job retried 3 times.

One billable execution.

Usage increments once.

===========================================================
115. TEST — FAILED PROVIDER OPERATION
===========================================================

Rank provider fails before execution.

Usage behavior follows documented rule.

No accidental charge if policy says not billable.

===========================================================
116. TEST — PERIOD RESET
===========================================================

New subscription billing period begins.

Flow usage resets/rolls into new UsageCounter period.

Stock usage remains current.

===========================================================
117. TEST — EXPIRED TRIAL
===========================================================

Trial expires.

No payment.

Entitlements become defined post-trial state.

===========================================================
118. TEST — CLIENT ADMIN
===========================================================

Agency Client admin attempts:

cancel Agency subscription.

Denied unless granted Tenant billing capability.

===========================================================
119. TEST — CROSS-TENANT
===========================================================

Tenant A cannot:

view B invoices
checkout against B
change B plan
see B usage

===========================================================
120. TEST — RECONCILIATION
===========================================================

Webhook intentionally missed.

Billing reconciliation sees provider ACTIVE.

LocalBi repaired to ACTIVE.

Audit event created.

===========================================================
121. TEST — INVOICE
===========================================================

Provider invoice paid.

Local normalized Invoice status = PAID.

Amount/currency match provider.

===========================================================
122. TEST — CURRENCY
===========================================================

Plan price INR.

Invoice must remain INR.

No silent USD fallback.

===========================================================
123. TEST — RLS
===========================================================

Tenant A:

can see A billing data.

cannot see B.

Global Plan catalog remains readable only according to product policy.

===========================================================
124. ACCEPTANCE CRITERIA
===========================================================

Phase 15 is complete only when:

[ ] billing provider contract verified

[ ] BillingProvider abstraction implemented

[ ] Plan catalog implemented

[ ] PlanPrice implemented where needed

[ ] Plan entitlements integrated with Phase 14

[ ] Tenant overrides supported

[ ] effective entitlement resolution centralized

[ ] Subscription implemented

[ ] provider Customer mapping implemented

[ ] secure checkout implemented

[ ] checkout price tampering prevented

[ ] verified payment webhooks implemented

[ ] webhook replay/idempotency implemented

[ ] out-of-order events handled

[ ] subscription state machine implemented

[ ] trials implemented if product supports them

[ ] upgrades implemented

[ ] safe downgrades implemented

[ ] cancellation implemented

[ ] data retained after cancellation

[ ] payment failure/grace policy implemented

[ ] invoices implemented

[ ] money handling uses safe numeric representation

[ ] usage metric registry implemented

[ ] stock vs flow usage separated

[ ] UsageEvent / UsageCounter implemented as appropriate

[ ] atomic usage limit enforcement implemented

[ ] usage idempotency implemented

[ ] billing-period usage boundaries correct

[ ] usage dashboard implemented

[ ] feature limits enforced server-side

[ ] background jobs respect billing/entitlements

[ ] billing page implemented

[ ] invoice history implemented

[ ] reconciliation job implemented

[ ] RLS verified

[ ] Agency Client billing isolation verified

[ ] cross-tenant isolation verified

[ ] no hardcoded plan access logic remains in production paths

[ ] no synthetic payment data exists

===========================================================
125. VERIFICATION
===========================================================

Run:

npx prisma validate
npx prisma migrate status

typecheck
lint touched files

Plan tests
Entitlement tests
Subscription tests
checkout tests
price-tampering tests
webhook-signature tests
webhook-idempotency tests
out-of-order tests
trial tests
upgrade tests
downgrade tests
cancellation tests
payment-failure tests
invoice tests
usage-meter tests
atomic-limit tests
usage-idempotency tests
billing-period tests
reconciliation tests
RLS tests
cross-client tests
cross-tenant tests

Regression:

Phase 0 Security
Phase 1 WebSurface
Phase 2 Catalog
Phase 3 Website Engine
Phase 4 Analytics
Phase 5 Attribution
Phase 6 GBP
Phase 7 Rank
Phase 8 Merchant
Phase 9 Calls
Phase 10 Opportunities
Phase 11 Content
Phase 12 Listings
Phase 13 Reporting
Phase 14 Agency / White-label

production build

Measure:

checkout latency
billing webhook processing time
EntitlementService latency
usage reservation latency
billing reconciliation query count

===========================================================
126. FINAL REPORT
===========================================================

Return:

# PHASE 15 IMPLEMENTATION REPORT

## Pre-flight
Existing plans:
Existing subscriptions:
Existing entitlements:
Existing usage controls:
Existing billing code:

## Provider contract
Provider:
Checkout:
Subscription:
Invoices:
Webhooks:
Trials:
Proration:
Tax:

## Plan architecture
Plan:
PlanPrice:
PlanEntitlement:
Tenant override:
Effective entitlement:

## Subscription
Customer:
Create:
Trial:
Activate:
Upgrade:
Downgrade:
Cancel:
Resume:
Failure/grace:

## Payments
Checkout:
Provider verification:
Payment:
Refunds if implemented:

## Webhooks
Signature:
Replay protection:
Idempotency:
Out-of-order:
Reconciliation:

## Invoices
Provider:
Snapshot:
Tax:
Currency:
PDF/link:

## Usage metering
Metric registry:
Stock usage:
Flow usage:
UsageEvent:
UsageCounter:
Reservations:
Atomic enforcement:
Period reset:
Idempotency:

## Billing UI
Current plan:
Usage:
Upgrade:
Cancellation:
Invoices:
Payment method:

## Entitlement integration
Server API:
Workers:
Client overrides:
Cache invalidation:

## Security
Authorization:
Agency/client billing scope:
RLS:
Cross-tenant:
Secrets:

## Performance
Indexes:
Entitlement lookup:
Usage counters:
Reconciliation:

## Verification
Prisma:
TypeScript:
Lint:
Tests:
Build:

## Deferred
Complex overage pricing:
Reseller settlement:
Accounting integrations:
Universal tax engine:
Enterprise contracts:
SAML/SCIM:
Public API monetization:

Finish with:

PHASE 15 STATUS

Billing provider integrated: YES/NO
Plan catalog implemented: YES/NO
Plan entitlements integrated: YES/NO
Subscription lifecycle implemented: YES/NO
Secure checkout implemented: YES/NO
Payment webhook verification implemented: YES/NO
Webhook idempotency verified: YES/NO
Out-of-order billing events handled: YES/NO
Trials implemented/supported: YES/NO
Upgrade/downgrade implemented: YES/NO
Cancellation/data-retention verified: YES/NO
Invoices implemented: YES/NO
Usage metering implemented: YES/NO
Atomic quota enforcement verified: YES/NO
Usage idempotency verified: YES/NO
Billing-period reset verified: YES/NO
Background-job entitlement enforcement verified: YES/NO
Agency/client billing scope verified: YES/NO
RLS verified: YES/NO
Cross-tenant isolation verified: YES/NO
No synthetic billing data verified: YES/NO
Existing phases preserved: YES/NO
Ready for Phase 16: YES/NO



16
____________________________________________________________


# LOCALBI — PHASE 16
## PLATFORM OPERATIONS + ENTERPRISE HARDENING
## OBSERVABILITY + AUDIT + TENANT HEALTH + JOB HEALTH + INTEGRATION HEALTH
## RATE LIMITS + RETENTION + BACKUP VERIFICATION + SLOs + INCIDENT DIAGNOSTICS

Act as a Principal SaaS Architect, Staff Platform Engineer,
Site Reliability Engineer, Security Engineer,
PostgreSQL/Prisma Architect, Observability Engineer,
Queue/Worker Architect, Multi-Tenant Security Engineer
and Production Operations Engineer.

Phases 0–15 are assumed complete.

EXPECTED CURRENT PLATFORM:

Platform
  ↓
Tenant
  ↓
Agency / Direct Client
  ↓
Client
  ↓
Brand
  ↓
Stores

Modules include:

- Authentication / RBAC / RLS
- WebSurface / Domains
- Dynamic website engine
- Product catalog
- GA4 / GSC
- GBP
- Attribution / Leads
- Hyper Rank
- Merchant Center
- Telephony / Calls
- Opportunities
- Content
- Listings
- Executive Reporting
- White-label / Agency
- Entitlements
- Billing / Usage Metering

CURRENT INFRASTRUCTURE MAY INCLUDE:

- Next.js
- PostgreSQL
- Prisma
- Redis
- BullMQ
- Pino
- Sentry
- Prometheus
- PM2 / containers
- CI/CD

NOW IMPLEMENT PHASE 16 ONLY:

Application / Workers / Providers / Database
          ↓
Structured Telemetry
          ↓
Health Signals
          ↓
Tenant / Integration / Job Health
          ↓
Alerts / Incident Context
          ↓
Operational Console
          ↓
Safe Remediation

DO NOT IMPLEMENT YET:

- Kubernetes migration just for complexity
- multi-region active-active architecture
- automated production database mutation by AI
- autonomous incident remediation
- arbitrary admin SQL console
- unrestricted support impersonation
- full SIEM replacement
- custom APM platform
- custom log storage engine
- chaos engineering against production
- infrastructure rewrite without measured need

===========================================================
0. PRIMARY GOAL
===========================================================

LocalBi must become operationally understandable.

An operator should be able to answer:

"Is the platform healthy?"

"Which Tenant is affected?"

"Which integration failed?"

"Which worker/job is stuck?"

"Is this authentication, provider, database, Redis,
queue, quota, or application failure?"

"Is stale data caused by provider outage or LocalBi?"

"What changed before the incident?"

"What is safe to retry?"

Example:

Tenant:
LP Digital

Client:
Aalim Perfumes

Integration Health:

GBP
HEALTHY
Last Success: 12 min ago

GSC
REAUTH_REQUIRED
Last Success: 2 days ago

GA4
HEALTHY

Rank Provider
DEGRADED
429 rate limits

Merchant
PARTIAL
4 failed products

Telephony
HEALTHY
Webhook last received: 3 min ago


Queue Health:

google-sync
2 active
8 waiting
0 failed

rank
14 active
630 waiting
23 delayed
4 failed

merchant
0 active
3 failed


Platform Health:

Postgres
Healthy

Redis
Healthy

Workers
3/3

API p95
420 ms

Error rate
0.7%

Do NOT invent health states.

Every operational status must come from measurable signals.

===========================================================
1. RE-AUDIT CURRENT OPERATIONS ARCHITECTURE
===========================================================

Before changing anything inspect CURRENT:

- logging
- Pino configuration
- request IDs
- Sentry
- Prometheus
- metrics endpoints
- BullMQ queues
- workers
- worker retries
- dead jobs
- Redis
- Prisma
- database connection pool
- health routes
- readiness routes
- cron/scheduler
- PM2/container setup
- CI/CD
- deployment scripts
- provider error handling
- audit log
- notifications
- feature usage
- billing webhooks
- provider webhooks
- data retention
- backups
- backup documentation
- environment validation
- secrets handling
- rate limiting
- API throttling
- login throttling
- public pixel/event throttling
- scheduled reports
- integration sync state

Search for:

health
ready
live
metrics
prometheus
sentry
logger
pino
requestId
traceId
queue
failed
retry
backoff
dead
stale
heartbeat
lastSuccessAt
lastFailureAt
backup
retention
rateLimit
throttle
timeout
circuit
audit
incident

Produce:

PHASE 16 PRE-FLIGHT

Current logging:
Current metrics:
Current tracing:
Current Sentry:
Current health checks:
Current queue monitoring:
Current worker heartbeats:
Current provider health:
Current tenant health:
Current rate limiting:
Current retention:
Current backups:
Current restore verification:
Current alerts:
Current incident tooling:
Current security audit:
Current CI/CD checks:

Classify:

KEEP
EXTEND
REFACTOR
REPLACE
MISSING

Do not create duplicate telemetry systems.

===========================================================
2. OBSERVABILITY PRINCIPLE
===========================================================

One request/job should be traceable across:

HTTP request
    ↓
Application service
    ↓
Database
    ↓
Queue job
    ↓
Worker
    ↓
External provider
    ↓
Result

Use correlation identifiers.

At minimum:

requestId
jobId
tenantId where safe
clientId where relevant
brandId where relevant
integration/resource identity
operation

Never log secrets.

===========================================================
3. STRUCTURED LOGGING
===========================================================

Standardize Pino structured logs.

Every important log should use structured fields.

Example:

{
  requestId,
  tenantId,
  brandId,
  operation: "gsc.sync",
  provider: "google",
  resourceId,
  durationMs,
  status: "failed",
  errorCode
}

Avoid:

console.log("sync failed", data)

through production application code.

===========================================================
4. LOG LEVELS
===========================================================

Define consistent meaning:

TRACE
DEBUG
INFO
WARN
ERROR
FATAL

Production should not emit huge DEBUG payloads by default.

Do not log full provider responses unless secure diagnostic mode explicitly
permits bounded data.

===========================================================
5. PII / SECRET LOG REDACTION
===========================================================

Centralize redaction.

Never log:

accessToken
refreshToken
authorization header
cookies
password
session token
OAuth code
API secret
private key
webhook secret
full card/payment details
full form payload
caller phone unnecessarily
email/body where unnecessary

Configure logger redaction paths.

Do not rely entirely on developers remembering not to log.

===========================================================
6. REQUEST CORRELATION
===========================================================

Every inbound request receives:

requestId

If caller provides a supported correlation ID:

validate format before reusing.

Otherwise generate one.

Return safe request ID in response header where appropriate.

===========================================================
7. JOB CORRELATION
===========================================================

When request queues job:

propagate:

requestId/correlationId

plus:

jobId
tenantId
operation

Worker logs should make request → job relationship searchable.

===========================================================
8. EXTERNAL PROVIDER CORRELATION
===========================================================

Where provider gives:

request ID
transaction ID
job ID

record safe provider identifier.

Useful for support.

Do not confuse provider IDs with LocalBi request IDs.

===========================================================
9. METRICS REGISTRY
===========================================================

Centralize application metrics.

Use existing Prometheus client where present.

Do not create metrics ad hoc in each module.

Create naming conventions.

Examples:

localbi_http_requests_total
localbi_http_request_duration_seconds

localbi_jobs_total
localbi_job_duration_seconds
localbi_job_failures_total

localbi_provider_requests_total
localbi_provider_request_duration_seconds
localbi_provider_errors_total

localbi_db_query_duration_seconds

localbi_cache_hits_total
localbi_cache_misses_total

Avoid high-cardinality labels.

===========================================================
10. HIGH-CARDINALITY SAFETY
===========================================================

Do NOT use labels such as:

userId
requestId
full URL
keyword text
productId
callId

in Prometheus labels.

These belong in logs/traces.

Metrics labels should be bounded:

route
method
status
provider
queue
jobType
errorClass

Tenant ID should generally NOT be Prometheus label across large SaaS
population.

===========================================================
11. HTTP METRICS
===========================================================

Track:

request count
latency
status distribution
5xx rate
4xx rate

Use normalized route templates.

Example:

/api/tenants/:tenantSlug/products/:id

not thousands of unique paths.

===========================================================
12. DATABASE METRICS
===========================================================

Track useful indicators:

DB availability
query latency
connection pool saturation if exposed
transaction failures
deadlocks
migration status operationally

Do not instrument every SQL statement into massive metrics cardinality.

Use logs/tracing for slow-query details.

===========================================================
13. SLOW QUERY DETECTION
===========================================================

Define threshold.

Example:

> 500 ms

log safe slow-query metadata.

Do not log full SQL with sensitive bound values by default.

Capture:

operation
model/service
duration

Use database-native tooling when available for deeper analysis.

===========================================================
14. REDIS HEALTH
===========================================================

Measure:

connectivity
command latency
errors

Distinguish use cases:

cache
rate limiter
BullMQ

One Redis outage can affect multiple modules.

===========================================================
15. CACHE OBSERVABILITY
===========================================================

Track bounded:

cache hits
cache misses
cache errors

by logical cache family.

Example:

analytics
domain
report
entitlement

Do not label every unique key.

===========================================================
16. BULLMQ OBSERVABILITY
===========================================================

Track per queue:

waiting
active
completed
failed
delayed

job duration
retry count

queues may include:

google-sync
rank
merchant
telephony
content
reports
billing
listings
opportunities

Use actual current queue names.

===========================================================
17. JOB HEALTH
===========================================================

Normalize states:

HEALTHY
BACKLOGGED
DEGRADED
FAILED
PAUSED

Derive from factual thresholds.

Do not label queue "failed" because one old job failed.

===========================================================
18. STUCK JOB DETECTION
===========================================================

Detect jobs exceeding expected runtime.

Threshold may depend on job type.

Example:

rank batch:
30 min expected

report generation:
5 min

Do not use one universal timeout.

===========================================================
19. DEAD-LETTER / TERMINAL FAILURES
===========================================================

BullMQ retries eventually exhaust.

Provide operational view for terminal failures.

Operator may:

inspect
retry
dismiss

Retry must revalidate:

tenant active
entitlement active
connection active
resource mapping valid

Do not blindly replay stale job payload.

===========================================================
20. SAFE JOB RETRY
===========================================================

Retry operation:

load current DB state
reconstruct safe job payload
enqueue new job

Do not simply execute old serialized secrets/config.

===========================================================
21. WORKER HEARTBEATS
===========================================================

Implement worker heartbeat/registration if not already available.

Track:

worker type
startedAt
lastHeartbeatAt
version/build
status

Do not store process memory every second unnecessarily.

===========================================================
22. WORKER HEALTH
===========================================================

If queue has backlog but no active worker heartbeat:

critical operational issue.

Surface clearly.

===========================================================
23. SCHEDULER HEALTH
===========================================================

Track scheduled tasks.

Examples:

GBP sync
GSC sync
rank runs
reports
billing reconciliation
listing refresh

Need to know:

last scheduled
last dispatched
last completed

Do not assume schedule works because cron process is alive.

===========================================================
24. PROVIDER HEALTH NORMALIZATION
===========================================================

Create normalized integration health.

Potential:

HEALTHY
DEGRADED
REAUTH_REQUIRED
RATE_LIMITED
PROVIDER_OUTAGE
CONFIGURATION_ERROR
STALE
UNKNOWN

Provider-specific errors map into operational state.

===========================================================
25. PROVIDER HEALTH ≠ TENANT CONFIGURATION
===========================================================

Example:

Google 401 revoked:
REAUTH_REQUIRED

Google 500:
PROVIDER_OUTAGE / DEGRADED

Missing GSC mapping:
NOT_CONFIGURED

Do not classify all as provider outage.

===========================================================
26. INTEGRATION HEALTH MODEL
===========================================================

Create or normalize health snapshot/read model.

Conceptually:

IntegrationHealth {
  tenantId
  integrationId
  provider
  capability

  state

  lastAttemptAt
  lastSuccessAt
  lastFailureAt

  consecutiveFailures

  errorClass?
  safeErrorMessage?

  updatedAt
}

Could be derived from current sync state rather than new table.

Do not duplicate existing GoogleSyncState if it already serves this role.

===========================================================
27. CAPABILITY-LEVEL HEALTH
===========================================================

One Google connection may have:

GBP healthy
GSC healthy
GA4 failing

Do not collapse entire Google connection into one red state if capability-level
health can be tracked.

===========================================================
28. TENANT HEALTH
===========================================================

Create TenantHealthService.

It should summarize operational state from:

integrations
queues
sync freshness
billing
domain
reports
workers where relevant

Not a fake score.

Example:

Tenant Health:

2 actions required

GSC:
Reauthenticate

Merchant:
4 product failures

Everything else:
Healthy

===========================================================
29. CLIENT / BRAND HEALTH
===========================================================

Agency operators need health scoped by Client/Brand.

Example:

Aalim Perfumes:
DEGRADED

reason:
GSC stale

Lakshmi Food:
HEALTHY

No hidden aggregate score.

===========================================================
30. PLATFORM HEALTH
===========================================================

Create internal Platform Health view.

Sections:

API
Postgres
Redis
Queues
Workers
Schedulers
Providers
Webhooks
Recent Errors

Restricted platform-operator access only.

===========================================================
31. HEALTH ENDPOINTS
===========================================================

Implement/review:

/health/live
/health/ready

or current convention.

Liveness:

process alive

Readiness:

required dependencies available enough to serve traffic.

Do not make liveness fail merely because one optional provider is down.

===========================================================
32. READINESS DEPENDENCIES
===========================================================

Typical critical dependencies:

Postgres

Potentially Redis depending on application requirements.

Google API outage should not make entire LocalBi instance "not ready".

Keep provider health separate.

===========================================================
33. HEALTH ENDPOINT SECURITY
===========================================================

Public load balancer health endpoint may expose minimal:

status

Do not expose:

DB host
queue names
tenant data
provider credentials
stack traces

Detailed diagnostics require authentication/internal access.

===========================================================
34. SENTRY HARDENING
===========================================================

Re-audit Sentry configuration.

Ensure:

environment
release version
requestId
safe tenant context if acceptable
route
job type

Do NOT attach raw request bodies containing PII/secrets.

===========================================================
35. RELEASE TRACKING
===========================================================

Every deployment should expose:

release/build identifier
commit SHA where available
deployedAt

Operational errors must correlate with release.

===========================================================
36. ERROR TAXONOMY
===========================================================

Create consistent error classes.

Examples:

ValidationError
AuthenticationError
AuthorizationError
NotFoundError
ConflictError
RateLimitError

ProviderAuthenticationError
ProviderQuotaError
ProviderUnavailableError

ConfigurationError
DatabaseError
QueueError

Do not throw generic Error everywhere.

===========================================================
37. ERROR CODE REGISTRY
===========================================================

Create stable public/internal codes.

Example:

GOOGLE_REAUTH_REQUIRED
MERCHANT_PRODUCT_VALIDATION_FAILED
RANK_PROVIDER_RATE_LIMITED

Messages may change.

Codes remain stable.

===========================================================
38. SAFE CLIENT ERRORS
===========================================================

Client-facing API must not expose:

SQL
stack trace
secret
provider token
internal path

Return:

error code
safe message
requestId

===========================================================
39. RATE LIMIT GOVERNANCE
===========================================================

Audit every rate limiter.

Create centralized rate-limit policy registry.

Different categories:

AUTH
PASSWORD_RESET
PUBLIC_EVENTS
LEAD_FORM
PUBLIC_PREVIEW
ADMIN_MUTATION
EXPENSIVE_EXPORT
AI_GENERATION
MANUAL_RANK_RUN
WEBHOOK

Do not use one universal rate limit.

===========================================================
40. DISTRIBUTED RATE LIMIT
===========================================================

Use Redis/central store for horizontally scaled enforcement where required.

Avoid in-memory-only production rate limits if multiple app instances exist.

===========================================================
41. RATE-LIMIT KEY DESIGN
===========================================================

Depending on route:

authenticated user
tenant
IP
resource

Use privacy-conscious identifiers.

Do not allow one abusive Tenant to exhaust platform-wide provider quota
without governance.

===========================================================
42. PROVIDER QUOTA GOVERNANCE
===========================================================

Track provider limits where known.

Examples:

Google APIs
rank provider
telephony
AI
Merchant

Bound concurrency.

Use queue-level throttling.

===========================================================
43. CIRCUIT BREAKER
===========================================================

Consider circuit-breaker behavior for repeatedly failing providers.

Example:

provider returns 500 continuously.

Temporarily stop aggressive retries.

State:
DEGRADED

Do not implement over-complex framework if queue retry/backoff already solves
it sufficiently.

Decision must be evidence-based.

===========================================================
44. TIMEOUT GOVERNANCE
===========================================================

Every external call needs explicit timeout.

Do not rely indefinitely on default network timeouts.

Configure by provider/service.

===========================================================
45. RETRY GOVERNANCE
===========================================================

Standardize retry policy.

Retry:

429
temporary network failure
5xx where safe

Do not retry:

validation failure
403 permission denial
invalid configuration

unless provider semantics justify it.

===========================================================
46. BACKOFF
===========================================================

Use exponential backoff with jitter where existing infrastructure supports it.

Prevent retry storms.

===========================================================
47. WEBHOOK HEALTH
===========================================================

Track health separately for:

Billing
Telephony
other inbound providers

At minimum:

lastReceivedAt
lastVerifiedAt
verification failures
processing failures

Do not infer provider outage from low business activity alone.

===========================================================
48. WEBHOOK FAILURE QUEUE
===========================================================

If verified webhook processing fails after acceptance:

persist enough safe event identity/state for retry.

Do not lose billing/call state.

===========================================================
49. AUDIT LOG HARDENING
===========================================================

Review AuditLog schema.

Audit security-sensitive administrative actions:

role change
membership change
invite
integration mapping
domain change
publish
lead export
listing write
number reassignment
billing change
entitlement override
support action

Do not audit every read.

===========================================================
50. AUDIT EVENT STRUCTURE
===========================================================

Conceptually:

actor
tenant
client/brand scope

action
resourceType
resourceId

timestamp
requestId

safe before/after summary where useful

ipHash or safe network context if product policy allows

Do not store secrets or huge payload diffs.

===========================================================
51. AUDIT IMMUTABILITY
===========================================================

Audit logs should be append-only through normal application paths.

Do not provide standard UI "edit audit event".

Retention/deletion follows explicit policy.

===========================================================
52. SECURITY CONSOLE
===========================================================

Internal platform operator view may show:

Recent authorization failures
Repeated login failures
Webhook signature failures
RLS verification
Suspicious rate-limit activity
Recent admin changes

Do not turn this into speculative fraud scoring.

Show factual events.

===========================================================
53. SUPPORT ACCESS
===========================================================

If platform support needs tenant access:

do NOT use hidden unrestricted bypass.

Implement only if needed:

SupportAccessSession

explicit
reason required
time-limited
audited
visible banner
tenant context still applied

If not required now:

defer.

===========================================================
54. NO GLOBAL RLS DISABLE
===========================================================

Support tooling must never:

SET row_security = off

as normal access method.

Preserve tenant context.

===========================================================
55. RLS CONTINUOUS VERIFICATION
===========================================================

Extend tests/catalog checks so every tenant-owned table has:

ENABLE RLS
FORCE RLS
appropriate policy

Prevent future migrations from accidentally adding unprotected tables.

===========================================================
56. MIGRATION SAFETY CHECK
===========================================================

CI should detect:

schema changed
without migration

where applicable.

Never run:

prisma db push

against production as deployment workflow.

===========================================================
57. MIGRATION DEPLOYMENT
===========================================================

Production uses:

validated migrations
prisma migrate deploy
or project's canonical safe deployment flow

Record migration version.

===========================================================
58. BACKUP STRATEGY AUDIT
===========================================================

Do not claim backups exist merely because cloud provider may support them.

Verify actual deployment environment.

Document:

database backup mechanism
frequency
retention
encryption
storage location category
restore process

Do not expose credentials.

===========================================================
59. BACKUP VERIFICATION
===========================================================

A backup that was never restored is unproven.

Implement operational process for periodic restore verification in a safe,
isolated environment.

Do NOT restore over production.

===========================================================
60. RESTORE TEST
===========================================================

Verify:

database can restore
migrations/app can start
critical row counts/schema exist
RLS remains configured
basic tenant isolation test passes

Document test date/results.

===========================================================
61. REDIS BACKUP
===========================================================

Determine whether Redis holds durable business data.

Preferred architecture:

Redis should generally contain reconstructable:

cache
queues
ephemeral locks

Critical canonical business data lives in Postgres.

If Redis contains irreplaceable state:

flag architectural risk.

===========================================================
62. QUEUE DURABILITY
===========================================================

Audit BullMQ Redis persistence configuration.

Define what happens if Redis restarts.

Business-critical operations should be reconstructable/reconciled where
possible.

===========================================================
63. DATA RETENTION POLICY
===========================================================

Create centralized retention definitions.

Different classes:

Audit logs
Visitor events
Leads
Calls
Rank observations
Provider snapshots
Webhook events
Billing data
Content versions
Reports

Do not apply one retention period globally.

===========================================================
64. RETENTION CONFIGURATION
===========================================================

Conceptual:

DataRetentionPolicy

dataClass
defaultRetentionDays
minimumRetentionDays?
legalHoldSupported?
cleanupStrategy

Tenant override only where product/legal policy allows.

===========================================================
65. RETENTION JOBS
===========================================================

Cleanup runs via controlled background jobs.

Requirements:

bounded batches
idempotency
audit summary
tenant isolation
dry-run support for risky classes

Do not run:

DELETE FROM massive_table

without batching/index strategy.

===========================================================
66. PII RETENTION
===========================================================

Leads/call PII requires special treatment.

Support eventual:

anonymization
deletion

according to policy.

Do not remove aggregate business metrics unnecessarily if they can remain
non-identifying.

===========================================================
67. USER DATA DELETION
===========================================================

Prepare/administer safe workflow for applicable privacy requests.

User deletion must not corrupt:

audit integrity
historical authored content
financial records

Use anonymization where appropriate.

Do not implement legal policy guesses; build controlled capability.

===========================================================
68. FILE / MEDIA RETENTION
===========================================================

Audit orphaned:

Product media
Content media
Brand assets

Do not delete based on filename alone.

Use reference checks.

===========================================================
69. STORAGE HEALTH
===========================================================

If object storage exists:

track failures
upload errors

Do not attempt full cloud storage monitoring platform.

===========================================================
70. SLO DEFINITIONS
===========================================================

Define initial measurable SLOs.

Example candidates:

API availability
interactive p95 latency
job success rate
critical webhook processing
provider sync freshness

Do not copy arbitrary "five nines".

Set realistic targets based on current infrastructure/product needs.

===========================================================
71. SLI METRICS
===========================================================

For each SLO define indicator.

Example:

API Availability:

successful eligible requests
/
total eligible requests

Exclude intentional 4xx where appropriate.

Document formula.

===========================================================
72. ERROR BUDGET
===========================================================

Optional initial support:

calculate error budget.

Do not over-engineer if no operational process will use it.

At minimum SLO dashboard should expose:

target
current
period

===========================================================
73. ALERTING
===========================================================

Alerts should be actionable.

Potential alerts:

API 5xx surge
DB unavailable
Redis unavailable
worker heartbeat missing
queue backlog severe
billing webhook failures
telephony webhook failures
provider reauth spike
scheduled reports failing
migration failure

Do not alert on every single job failure.

===========================================================
74. ALERT SEVERITY
===========================================================

Use:

INFO
WARNING
CRITICAL

with documented thresholds.

Avoid arbitrary severity.

===========================================================
75. ALERT DEDUPLICATION
===========================================================

Do not send 1,000 alerts for same provider outage.

Group/deduplicate by:

condition
provider/service
time window

===========================================================
76. ALERT DELIVERY
===========================================================

Reuse current notification infrastructure where possible.

Potential destinations:

internal dashboard
email
Slack/webhook later

Do not introduce external incident vendor solely for Phase 16 unless chosen.

===========================================================
77. INCIDENT MODEL
===========================================================

If useful, add lightweight Incident record.

Conceptually:

Incident

id
severity
status:
OPEN
INVESTIGATING
MONITORING
RESOLVED

service/component
summary

startedAt
resolvedAt?

createdFromAlert?

Do not build PagerDuty clone.

===========================================================
78. INCIDENT TIMELINE
===========================================================

Allow safe operator notes/events:

alert fired
deployment occurred
provider recovered
incident resolved

Do not automatically infer causality.

===========================================================
79. DEPLOYMENT EVENTS
===========================================================

Record deployment metadata.

Incident timeline can show:

Release abc123 deployed at 10:42

This does not mean release caused incident.

===========================================================
80. OPERATIONAL DASHBOARD
===========================================================

Internal:

Platform Operations

API
Database
Redis
Workers
Queues
Schedulers
Provider Health
Webhook Health
Recent Errors
Incidents
Deployments

Do not expose this to normal client users.

===========================================================
81. TENANT OPERATIONS VIEW
===========================================================

Support operator can inspect one Tenant:

Integrations
Jobs
Sync freshness
Domains
Billing state
Entitlements
Recent safe errors
Recent audit actions

No need to expose customer PII by default.

===========================================================
82. JOB EXPLORER
===========================================================

Internal UI:

Queue
Job Type
Tenant
Status
Attempts
Created
Duration
Error

Actions:

Retry
Cancel where safe

Never allow editing arbitrary job JSON and executing it.

===========================================================
83. JOB CANCELLATION
===========================================================

Only cancel jobs where semantically safe.

Example:

queued rank batch:
can cancel

billing webhook:
should not casually cancel processing

Capability defined by job type.

===========================================================
84. PROVIDER DIAGNOSTICS
===========================================================

Integration detail:

connection
resource mapping
last success
last error
token status classification
quota/rate state
sync jobs

Never display raw tokens.

===========================================================
85. HEALTH HISTORY
===========================================================

Persist/aggregate enough operational history to answer:

"Was this failing yesterday?"

Do not store second-by-second health snapshots forever.

Use aggregation/retention.

===========================================================
86. CONFIGURATION VALIDATION
===========================================================

Application startup should validate required env vars.

Use Zod or current config system.

Fail clearly for mandatory:

DATABASE_URL
Redis
Auth secret
encryption keys

Optional provider configs should disable feature cleanly rather than crash
entire platform.

===========================================================
87. SECRET VALIDATION
===========================================================

Validate presence/format without logging value.

Do not print secret during startup diagnostics.

===========================================================
88. SECRET ROTATION READINESS
===========================================================

Review encryption/token secret strategy.

Architecture should support rotation where applicable.

Do not actually rotate production secrets automatically.

Document manual runbook.

===========================================================
89. ENVIRONMENT SEPARATION
===========================================================

Ensure:

development
staging
production

do not share:

DB
Redis
OAuth callbacks
billing webhook endpoints
telephony numbers

unless explicitly intended.

===========================================================
90. PRODUCTION MOCK BLOCK
===========================================================

Add safety checks so production cannot accidentally enable:

mock integrations
sample metrics
fake providers
demo payment success
mock rank data

Tests/dev can retain them explicitly.

===========================================================
91. DEVELOPMENT SEED SAFETY
===========================================================

Seed scripts should require explicit non-production environment.

Never automatically seed demo Tenant into production.

===========================================================
92. CI QUALITY GATES
===========================================================

CI should run at minimum:

typecheck
lint relevant production source
unit tests
security tests
RLS verification logic
migration validation
build

Do not silently continue on failures.

===========================================================
93. TEST SEGMENTATION
===========================================================

Separate:

unit
integration
live-provider
database
security

Live provider tests should not run unintentionally on every PR with production
credentials.

===========================================================
94. BUILD MEMORY
===========================================================

Re-check known historical Puck/build issue after Phase 3 refactor.

Production build should run under reasonable memory.

Do not hide regressions by continually increasing NODE_OPTIONS.

Measure current build.

===========================================================
95. BUNDLE ANALYSIS
===========================================================

Inspect major client bundles.

Focus on:

dashboard
public website
editor

Prevent admin-heavy libraries entering public microsite bundle.

===========================================================
96. API PERFORMANCE
===========================================================

Identify top slow endpoints via metrics.

Do not optimize based on guess.

For each serious issue:

measure
find bottleneck
fix
remeasure

===========================================================
97. N+1 DETECTION
===========================================================

Audit high-traffic:

Executive dashboard
Store dashboard
Product lists
Rank reports
Lead lists

Fix measured N+1 patterns.

===========================================================
98. PAGINATION GOVERNANCE
===========================================================

All potentially large admin lists require pagination/cursor strategy.

Examples:

Leads
Calls
Products
Reviews
Rank observations
Jobs
Audit logs

Do not load unlimited rows.

===========================================================
99. REQUEST SIZE LIMITS
===========================================================

Centralize sensible request size constraints.

Different endpoints:

Lead form
Event pixel
JSON APIs
Media uploads

Do not accept unlimited bodies.

===========================================================
100. RESPONSE SIZE
===========================================================

Avoid sending enormous provider snapshots or datasets to browser.

Use:

pagination
aggregation
drilldowns

===========================================================
101. DB TRANSACTION DURATION
===========================================================

Avoid external provider HTTP calls inside long DB transactions.

Correct:

DB state
→ commit
→ provider call/job
→ result transaction

unless atomic design explicitly requires otherwise.

===========================================================
102. DISTRIBUTED LOCKS
===========================================================

Audit current Redis lock usage.

Use locks only where needed:

sync deduplication
scheduled jobs
provider reconciliation

Avoid global coarse locks.

===========================================================
103. CLOCK / TIME CONSISTENCY
===========================================================

Store timestamps in UTC.

Convert to Tenant timezone in UI/reporting.

Schedulers must respect configured timezone explicitly.

===========================================================
104. DATA FRESHNESS POLICY
===========================================================

Centralize freshness definitions.

Example:

GSC:
daily expected

GBP:
specific cadence

Rank:
according to schedule

Merchant:
according to sync

Do not label all modules stale after 1 hour.

===========================================================
105. CLIENT-FACING HEALTH
===========================================================

Clients may see safe integration status:

Connected
Needs Reconnection
Sync Delayed
Last Updated

Do not expose infrastructure internals.

===========================================================
106. INTERNAL VS CLIENT ERRORS
===========================================================

Internal:

PROVIDER_429
Google endpoint family
retry count

Client:

Data sync delayed

Keep abstraction.

===========================================================
107. RUNBOOKS
===========================================================

Create operational documentation for:

DB unavailable
Redis unavailable
Google token incident
Rank provider outage
billing webhook issue
telephony webhook issue
queue backlog
failed migration
domain incident
restore procedure

Runbooks should contain:

symptoms
checks
safe actions
escalation

Do not include secrets.

===========================================================
108. DEPLOYMENT RUNBOOK
===========================================================

Document:

pre-deploy checks
migration order
deploy
health verification
rollback decision

Do not claim rollback is safe if DB migration is irreversible.

===========================================================
109. MIGRATION REVERSIBILITY
===========================================================

Future migrations should classify:

backward compatible
requires app sequencing
irreversible

Phase 16 should establish convention.

Do not auto-create DOWN migrations if unsafe.

===========================================================
110. FEATURE FLAGS FOR ROLLOUT
===========================================================

If existing feature flag architecture exists:

use it for risky rollouts.

Do not build giant experiment platform.

Feature flags should not replace entitlements.

Difference:

Feature flag = rollout/control
Entitlement = customer permission

===========================================================
111. SAFE MAINTENANCE MODE
===========================================================

Optional:

platform maintenance state

allows read-only messaging during planned maintenance.

Do not block webhook ingestion unnecessarily if maintenance only affects UI.

===========================================================
112. SECURITY HEADERS
===========================================================

Re-audit:

CSP
HSTS
X-Content-Type-Options
Referrer-Policy
frame-ancestors

Fit Next.js architecture.

Do not apply CSP that breaks required scripts without nonce/hash strategy.

===========================================================
113. CORS
===========================================================

Audit CORS.

Admin APIs should not use wildcard origins unnecessarily.

Public pixel/events require explicit safe design.

===========================================================
114. CSRF
===========================================================

Ensure browser-authenticated mutation routes are protected by current auth
architecture.

Do not assume SameSite alone covers every custom-domain scenario.

===========================================================
115. SESSION SECURITY
===========================================================

Audit:

Secure
HttpOnly
SameSite
expiration
rotation
revocation

especially after Phase 14 custom portal domains.

===========================================================
116. PASSWORD / AUTH RATE LIMITS
===========================================================

Ensure login/password reset have appropriate limits.

Do not leak whether email exists unnecessarily.

===========================================================
117. SECURITY DEPENDENCY AUDIT
===========================================================

Run dependency audit.

Do not blindly upgrade major packages in Phase 16.

Classify:

critical exploitable
dev-only
transitive
false/non-applicable

Apply controlled upgrades.

===========================================================
118. NODE / FRAMEWORK VERSIONS
===========================================================

Document supported Node version.

Ensure CI, Docker, local, production align.

Avoid "works locally" due to runtime mismatch.

===========================================================
119. DATABASE ROLE SAFETY
===========================================================

Application should use least-privileged DB role where current architecture
supports it.

RLS tests should run under actual app role.

Administrative migration role remains separate.

===========================================================
120. DANGEROUS ADMIN FUNCTIONS
===========================================================

Search for:

$executeRawUnsafe
$queryRawUnsafe
shell execution
dynamic SQL
eval
new Function

Review every production usage.

Replace unsafe patterns where possible.

===========================================================
121. FILE UPLOAD SECURITY
===========================================================

Audit all uploads:

product images
content
brand logos

Validate:

type
size
ownership

Do not trust file extension alone.

===========================================================
122. SSRF SAFETY
===========================================================

Any server fetch to user-supplied URL:

review for SSRF.

Examples:

external image imports
website validation
webhook callbacks

Block:

localhost
private networks
metadata endpoints

unless explicitly required.

===========================================================
123. OPEN REDIRECT SAFETY
===========================================================

Audit:

login redirects
invite redirects
portal redirects
preview redirects

Only allow approved destinations.

===========================================================
124. DOMAIN ROUTING SECURITY
===========================================================

Unknown Host header must not resolve arbitrary Tenant.

Normalize host.

Resolve only active verified Domain.

Do not trust X-Forwarded-Host from untrusted proxies without deployment-aware
configuration.

===========================================================
125. BACKGROUND TENANT CONTEXT
===========================================================

Every worker touching tenant data must establish TenantContextService/RLS
context.

Do not use unrestricted Prisma because job is "internal".

===========================================================
126. REPORTING SECURITY
===========================================================

Re-run report cross-tenant/cross-client/store-scoped tests.

Snapshots/exports must preserve authorization.

===========================================================
127. AUDIT EXPORT
===========================================================

Platform/Tenant authorized admin may export audit records.

Use:

filters
pagination
CSV injection protection

Do not expose audit data across Tenant.

===========================================================
128. RETENTION DRY RUN
===========================================================

Cleanup tooling should support:

dry run

showing:

rows eligible
date cutoff
data class

before destructive execution for sensitive datasets.

===========================================================
129. DATABASE CLEANUP
===========================================================

Identify orphaned/stale records only through relational rules.

Do not include destructive cleanup unless fully verified.

Prefer report first.

===========================================================
130. OPERATIONAL UI ARCHITECTURE
===========================================================

Suggested internal modules:

features/platform-ops/
├── overview/
├── tenants/
├── integrations/
├── queues/
├── workers/
├── webhooks/
├── incidents/
├── audit/
├── security/
└── diagnostics/

Do not put all of this into one giant ops page.

===========================================================
131. PLATFORM ADMIN SECURITY
===========================================================

Platform operations UI must require explicit platform role.

Tenant Admin is NOT Platform Admin.

Do not represent platform access through normal Tenant membership only.

===========================================================
132. PLATFORM ADMIN MODEL
===========================================================

Audit current implementation.

If absent, create minimal secure platform-role concept.

Do not make:

email === "admin@example.com"

the authorization rule.

===========================================================
133. PLATFORM ACTION AUDIT
===========================================================

Platform admin operational action:

retry job
open support session
change incident
run retention job
manual reconciliation

must be audited.

===========================================================
134. DIAGNOSTICS DOWNLOAD
===========================================================

If support bundle feature is implemented:

include only safe:

versions
health
recent error codes
job statuses

Exclude:

tokens
PII
credentials
raw form data

===========================================================
135. TEST — REQUEST CORRELATION
===========================================================

Request queues Google sync.

Expected:

request log
queue job
worker log

share searchable correlation context.

===========================================================
136. TEST — LOG REDACTION
===========================================================

Error object contains:

accessToken
refreshToken
password

Structured logger output must redact values.

===========================================================
137. TEST — METRIC CARDINALITY
===========================================================

Verify requestId/userId not used as Prometheus labels.

===========================================================
138. TEST — WORKER DOWN
===========================================================

Rank queue has jobs.

Rank worker heartbeat expires.

Operational state:

worker unavailable / queue degraded.

===========================================================
139. TEST — QUEUE BACKLOG
===========================================================

Queue exceeds documented threshold.

Warning triggered once/grouped.

Not thousands of alerts.

===========================================================
140. TEST — REAUTH
===========================================================

GSC connection expires.

Tenant health:

REAUTH_REQUIRED

not:

platform outage.

===========================================================
141. TEST — PROVIDER OUTAGE
===========================================================

Google returns 5xx across many tenants.

Provider health becomes degraded/outage.

Do not create hundreds of independent critical incidents if deduplication
strategy groups them.

===========================================================
142. TEST — PROVIDER RATE LIMIT
===========================================================

429 response.

Classified:

RATE_LIMITED

retry/backoff applied.

Not:

NO_DATA.

===========================================================
143. TEST — STUCK JOB
===========================================================

Job runs beyond job-type threshold.

Detected operationally.

No automatic destructive termination unless policy says safe.

===========================================================
144. TEST — DEAD JOB RETRY
===========================================================

Operator retries old job.

System revalidates:

Tenant
entitlement
integration
resource

before new execution.

===========================================================
145. TEST — BACKUP RESTORE
===========================================================

Safe isolated restore test.

Verify:

schema
migrations
RLS
critical data access

Document result.

Never touch production DB.

===========================================================
146. TEST — RETENTION TENANT ISOLATION
===========================================================

Tenant A retention job cannot delete Tenant B records.

===========================================================
147. TEST — RLS NEW TABLE
===========================================================

Add simulated tenant-owned table/migration test.

CI fails if missing:

ENABLE/FORCE RLS/policy

according to project test framework.

===========================================================
148. TEST — UNKNOWN DOMAIN
===========================================================

Host:
unknown.example.com

must not resolve first/default Tenant.

===========================================================
149. TEST — PLATFORM ADMIN
===========================================================

Tenant Owner attempts platform ops route.

Denied.

Platform operator:

allowed.

===========================================================
150. TEST — HEALTH ENDPOINT
===========================================================

Detailed health fields are not exposed publicly.

Minimal endpoint returns only appropriate status.

===========================================================
151. TEST — REDIS FAILURE
===========================================================

Redis unavailable.

Platform reports dependency impact accurately.

Do not misreport Postgres outage.

===========================================================
152. TEST — OPTIONAL PROVIDER FAILURE
===========================================================

Rank provider down.

Core application remains ready if provider is optional.

===========================================================
153. TEST — ENV VALIDATION
===========================================================

Missing mandatory DB config:

startup fails clearly.

Missing optional Merchant key:

Merchant disabled/config error,
core app still starts if product permits.

===========================================================
154. TEST — RETRY POLICY
===========================================================

Validation error:

no retry storm.

503:

bounded retries.

===========================================================
155. TEST — RATE LIMIT
===========================================================

Lead form abuse triggers lead-form policy.

Authenticated dashboard normal requests remain unaffected.

===========================================================
156. TEST — SSRF
===========================================================

User-supplied URL attempts:

127.0.0.1
169.254.169.254
private network

blocked by server URL fetch boundary.

===========================================================
157. TEST — OPEN REDIRECT
===========================================================

redirect=https://evil.example

rejected unless explicitly approved.

===========================================================
158. TEST — MOCK PRODUCTION
===========================================================

NODE_ENV=production

mock provider flag enabled.

Startup or feature initialization must reject according to safety policy.

===========================================================
159. TEST — CI
===========================================================

Deliberately failing:

typecheck/test/migration validation

must fail pipeline.

No continue-on-error for required gates.

===========================================================
160. ACCEPTANCE CRITERIA
===========================================================

Phase 16 is complete only when:

[ ] operations architecture re-audited

[ ] structured logging standardized

[ ] log redaction centralized

[ ] request correlation implemented

[ ] job correlation implemented

[ ] Prometheus metrics normalized

[ ] high-cardinality labels prevented

[ ] HTTP metrics implemented

[ ] DB/Redis health measured

[ ] BullMQ health measured

[ ] worker heartbeat implemented

[ ] stuck-job detection implemented

[ ] safe terminal-job retry implemented

[ ] scheduler health implemented

[ ] provider health normalized

[ ] capability-level integration health implemented

[ ] Tenant health implemented

[ ] internal Platform Health dashboard implemented

[ ] minimal liveness/readiness implemented

[ ] Sentry configuration hardened

[ ] release tracking implemented

[ ] typed error taxonomy implemented

[ ] centralized rate-limit policies implemented

[ ] provider retry/timeout governance implemented

[ ] webhook health implemented

[ ] audit logging hardened

[ ] RLS continuous verification added

[ ] backup strategy documented/verified

[ ] restore verification process implemented

[ ] retention policy implemented

[ ] safe retention jobs implemented

[ ] SLO/SLI baseline implemented

[ ] actionable alerting implemented

[ ] alert deduplication implemented

[ ] operational runbooks added

[ ] environment validation hardened

[ ] production mock safety implemented

[ ] CI quality gates verified

[ ] build health measured

[ ] security headers/CORS/CSRF/session reviewed

[ ] unsafe raw SQL usage reviewed

[ ] upload security reviewed

[ ] SSRF/open redirect protections verified

[ ] background worker tenant context verified

[ ] platform-admin boundary implemented

[ ] platform actions audited

[ ] cross-tenant operational tooling safety verified

===========================================================
161. VERIFICATION
===========================================================

Run:

npx prisma validate
npx prisma migrate status

typecheck
lint

unit tests
integration tests
RLS tests
auth/security tests
logging-redaction tests
correlation tests
metrics tests
queue tests
worker-heartbeat tests
job-retry tests
provider-health tests
webhook tests
rate-limit tests
retention tests
platform-admin tests
domain-routing tests
SSRF tests
redirect tests
environment-config tests

Regression all phases:

Phase 0 Security
Phase 1 WebSurface
Phase 2 Catalog
Phase 3 Website Engine
Phase 4 Analytics
Phase 5 Attribution
Phase 6 GBP
Phase 7 Rank
Phase 8 Merchant
Phase 9 Calls
Phase 10 Opportunities
Phase 11 Content
Phase 12 Listings
Phase 13 Reporting
Phase 14 Agency
Phase 15 Billing

production build

Measure and report:

build memory
API p50/p95
executive report latency
DB query count on major pages
queue throughput
worker heartbeat
Redis latency
top slow endpoints

Do NOT claim performance improvement without measurements.

===========================================================
162. FINAL REPORT
===========================================================

Return:

# PHASE 16 IMPLEMENTATION REPORT

## Pre-flight
Logging:
Metrics:
Tracing:
Health:
Queues:
Backups:
Retention:
Security:

## Observability
Structured logs:
Redaction:
Request IDs:
Job correlation:
Sentry:
Release tracking:

## Metrics
HTTP:
Database:
Redis:
Queues:
Providers:
Cache:

## Jobs / Workers
Heartbeats:
Backlog:
Stuck jobs:
Retries:
Terminal failures:
Safe replay:

## Integration health
Google:
Rank:
Merchant:
Telephony:
Billing:
Listings:
Capability-level status:

## Health views
Platform:
Tenant:
Client/Brand:
Public health endpoint:

## Security operations
Audit:
Platform admin:
Support access:
RLS verification:
Rate limits:
Headers:
CORS:
CSRF:
Session:
SSRF:
Redirect safety:

## Reliability
Timeouts:
Retries:
Backoff:
Circuit-breaker decision:
Webhook health:

## Backups
Mechanism:
Frequency:
Retention:
Restore test:
RLS after restore:

## Data retention
Policies:
Cleanup:
Dry run:
PII handling:

## SLO / Alerts
SLIs:
SLOs:
Thresholds:
Deduplication:
Incident workflow:

## CI/CD
Typecheck:
Lint:
Tests:
Migration checks:
Build:
Release metadata:

## Performance
API p50:
API p95:
DB:
Redis:
Queues:
Build memory:
Known bottlenecks:

## Runbooks
Database:
Redis:
Queues:
Google:
Billing:
Telephony:
Migration:
Restore:

## Verification
Prisma:
TypeScript:
Lint:
Tests:
Build:
Security:

## Remaining production risks
List only factual unresolved risks.

Finish with:

PHASE 16 STATUS

Structured observability implemented: YES/NO
Log redaction verified: YES/NO
Request/job correlation verified: YES/NO
Metrics implemented: YES/NO
Queue/worker health verified: YES/NO
Provider health implemented: YES/NO
Tenant health implemented: YES/NO
Platform operations console implemented: YES/NO
Rate-limit governance verified: YES/NO
Audit security verified: YES/NO
RLS continuous verification implemented: YES/NO
Backup strategy verified: YES/NO
Restore test completed safely: YES/NO
Retention policies implemented: YES/NO
SLOs/alerts implemented: YES/NO
Webhook health verified: YES/NO
CI quality gates verified: YES/NO
Security hardening verified: YES/NO
Platform-admin isolation verified: YES/NO
Production mock protection verified: YES/NO
Cross-tenant operations safety verified: YES/NO
Existing phases preserved: YES/NO
Production readiness: YES/NO
Ready for Phase 17: YES/NO





17_____________________________________________

# LOCALBI — PHASE 17
## PRODUCTION VALIDATION + SCALE TESTING + CAPACITY PLANNING
## MULTI-TENANT LOAD + QUEUE STRESS + DATABASE/REDIS VALIDATION + FAILURE DRILLS

Act as a Principal Performance Engineer, Staff Platform Engineer,
SRE, PostgreSQL Performance Engineer, Redis/BullMQ Engineer,
Next.js Performance Engineer, Security Test Engineer,
Multi-Tenant SaaS Architect and Production Readiness Lead.

Phases 0–16 are assumed complete.

CURRENT PLATFORM INCLUDES:

- Multi-tenant Tenant / Agency / Client / Brand / Store architecture
- PostgreSQL + Prisma + RLS
- Redis
- BullMQ workers
- Next.js frontend/server
- Dynamic website engine
- Product catalog
- GA4 / GSC
- GBP
- Rank tracking
- Merchant Center
- Lead attribution
- Telephony
- Opportunities
- Content
- Listings
- Executive reporting
- White-label portal
- Billing / usage metering
- Platform observability / health

NOW IMPLEMENT PHASE 17 ONLY:

Realistic Workload Model
        ↓
Seeded Scale Dataset
        ↓
API Load Tests
        ↓
Public Website Load
        ↓
Dashboard Load
        ↓
Database Stress
        ↓
Redis Stress
        ↓
Queue / Worker Stress
        ↓
Provider Failure Simulation
        ↓
Security / Isolation Regression
        ↓
Capacity Measurements
        ↓
Measured Bottleneck Fixes
        ↓
Production Readiness Report

DO NOT IMPLEMENT:

- new major product modules
- architectural rewrite without measurements
- Kubernetes migration just because scale testing exists
- new databases unless current database proves insufficient
- premature sharding
- premature microservices
- multi-region active-active
- replacing Prisma without measured evidence
- replacing Redis/BullMQ without measured evidence
- arbitrary caching everywhere
- bigger servers as the only optimization

===========================================================
0. PRIMARY GOAL
===========================================================

Prove LocalBi can operate safely under realistic production scale.

The phase must answer:

1. How many Tenants/Clients/Stores can the current architecture support?
2. Where does latency start degrading?
3. Which DB queries dominate?
4. Which API routes dominate?
5. Which background queues become bottlenecks?
6. How does Redis behave under load?
7. How does the website renderer behave under traffic spikes?
8. Can one noisy Tenant harm others?
9. Does RLS remain correct under concurrency?
10. Are cache keys safely tenant scoped?
11. What happens if Google/provider APIs degrade?
12. What happens if Redis restarts?
13. What happens if a worker dies?
14. What happens during DB connection pressure?
15. What production capacity can be stated from measurements?

Do NOT answer with theoretical guesses.

Use measured evidence.

===========================================================
1. RE-AUDIT CURRENT DEPLOYMENT MODEL FIRST
===========================================================

Before testing inspect CURRENT:

- package.json
- Next.js version/config
- Node version
- Prisma configuration
- connection pooling
- PostgreSQL deployment
- indexes
- slow query logs
- Redis deployment/config
- BullMQ queues/workers
- worker concurrency
- PM2/container configuration
- Docker
- reverse proxy
- CI/CD
- cache TTLs
- rate limits
- health endpoints
- Prometheus/Sentry
- request logging
- production environment assumptions
- deployment docs

Produce:

PHASE 17 PRE-FLIGHT

Application runtime:
App instances:
Worker instances:
Node memory:
Database:
Connection pool:
Redis:
Queues:
Worker concurrency:
Caching:
Current p50/p95:
Current build memory:
Known slow endpoints:
Known large tables:
Known high-volume jobs:
Current infrastructure limits:

Do not start tuning until baseline is documented.

===========================================================
2. DEFINE SCALE TARGETS
===========================================================

Create realistic workload tiers.

At minimum:

SMALL
MEDIUM
LARGE
STRESS

Example only:

SMALL:
10 Tenants
50 Brands
250 Stores
5,000 Products
25,000 Pages

MEDIUM:
100 Tenants
500 Brands
2,500 Stores
50,000 Products
250,000 Pages

LARGE:
500 Tenants
2,500 Brands
10,000 Stores
250,000 Products
1,000,000 Pages

STRESS:
1,000 Tenants
5,000 Brands
25,000 Stores
500,000+ Products
multi-million analytics rows

Adjust based on actual business model.

Do NOT blindly use these numbers if current product target differs.

Document selected assumptions.

===========================================================
3. WORKLOAD PROFILE
===========================================================

Scale testing must reflect actual product behavior.

Include:

Public traffic:
- Home pages
- Store pages
- Product pages
- StoreProduct pages
- Articles

Admin traffic:
- Login
- Dashboard
- Store lists
- Product lists
- Analytics
- Rank dashboard
- Leads
- Calls
- Reports

Write traffic:
- Lead submissions
- event tracking
- form submissions
- product updates
- content draft saves

Background jobs:
- Google sync
- Rank scans
- Merchant sync
- Listing refresh
- Scheduled reports
- Opportunity evaluation
- Billing reconciliation

Do not test only GET /health and claim platform scale.

===========================================================
4. BUILD SCALE DATA GENERATOR
===========================================================

Create deterministic seed/load data generator.

It should generate:

Tenants
Clients
Brands
Stores
Products
Categories
StoreProduct
Pages
Domains
Keywords
Rank history
Leads
Calls
Reviews
Content
Listings
Analytics rows
Merchant states

Use deterministic seed.

Do not use random production-incompatible schemas.

===========================================================
5. TEST DATA SAFETY
===========================================================

Scale data must run ONLY in:

local
test
dedicated performance environment

Never production.

Add environment guard.

Example:

PERF_TEST_MODE=true

and explicit DB validation.

Abort if target DB appears production.

===========================================================
6. DATA SHAPE MATTERS
===========================================================

Avoid unrealistic uniform data.

Include:

Brands with 1 Store
Brands with 500 Stores

Products with one Store
Products mapped to many Stores

High-volume Tenants
Low-volume Tenants

Large review histories
Large event histories
Rank-heavy clients

This helps detect skew/noisy-neighbor problems.

===========================================================
7. BASELINE BEFORE OPTIMIZATION
===========================================================

Record baseline:

CPU
memory
DB connections
Redis latency
API p50/p95/p99
error rate
DB query p95
queue throughput
worker latency
build time
build memory

No code optimization before baseline.

===========================================================
8. LOAD-TEST TOOL
===========================================================

Use appropriate existing tool or add one intentionally.

Possible:

k6
Artillery
autocannon

Choose ONE primary load tool.

Do not build a custom HTTP load generator unless necessary.

===========================================================
9. LOAD TEST SCENARIOS
===========================================================

Create reproducible scenarios:

public-browse
admin-dashboard
lead-ingestion
analytics
rank-dashboard
catalog-admin
report-generation

Each should define:

VU/concurrency
duration
ramp
request mix
success criteria

===========================================================
10. PUBLIC WEBSITE TEST
===========================================================

Test:

hostname
→ Domain
→ WebSurface
→ Page
→ PageContext
→ SSR/render

Routes:

/
store
category
product
store-product
article

Measure:

TTFB
server render latency
DB query count
cache behavior
memory

===========================================================
11. COLD VS WARM CACHE
===========================================================

Run both:

cold cache
warm cache

Do not report only warm-cache results.

Record separately.

===========================================================
12. DOMAIN RESOLUTION SCALE
===========================================================

Simulate many hostnames.

Verify:

hostname lookup remains fast

with:

10
1,000
100,000+

Domain records.

Ensure proper index.

===========================================================
13. PAGE CONTEXT SCALE
===========================================================

Measure PageContext resolution.

Test:

Store with:
10 products
100 products
1,000 products

Do not load all related data unnecessarily.

===========================================================
14. ADMIN DASHBOARD TEST
===========================================================

Test Executive Dashboard under concurrent client users.

Measure:

orchestrator latency
module adapter latency
DB query count
cache hits
partial failure handling

Avoid one dashboard request causing hundreds of queries.

===========================================================
15. ANALYTICS DATA VOLUME
===========================================================

Test realistic:

GSC daily rows
page rows
keyword rows
GA4 persisted metrics if used
AttributionEvent
Call
Lead
RankObservation

Use millions of rows where scale target justifies it.

===========================================================
16. LEAD/EVENT INGESTION
===========================================================

Stress:

page_view
call click
WhatsApp click
directions
lead form

Measure:

writes/sec
p95 latency
DB contention
rate limiter
Redis

Ensure public ingestion cannot starve admin API.

===========================================================
17. WEBHOOK LOAD
===========================================================

Test:

Billing webhooks
Telephony webhooks

Burst duplicates
out-of-order events

Verify:

idempotency
latency
queue usage
no duplicate state

===========================================================
18. DATABASE QUERY PROFILING
===========================================================

Capture slow queries.

Use:

EXPLAIN
EXPLAIN ANALYZE

in performance environment.

For high-cost queries record:

query shape
rows examined
execution time
indexes used
sort/hash behavior

Do not add indexes blindly.

===========================================================
19. INDEX REVIEW
===========================================================

Review every important query against existing indexes.

Focus:

tenantId
brandId
storeId
date
status
foreign keys
unique keys

Add composite indexes only when measurements justify them.

===========================================================
20. INDEX WRITE COST
===========================================================

Every new index increases write cost.

Measure before/after:

read latency
write latency
index size

Do not solve read performance by adding dozens of redundant indexes.

===========================================================
21. PAGINATION
===========================================================

Validate large tables.

Test page 1 and deep pages.

Prefer cursor/keyset pagination where offset becomes expensive.

Potential:

Leads
Calls
Products
Reviews
Audit logs
Jobs
Rank observations

===========================================================
22. LARGE OFFSET DETECTION
===========================================================

If:

OFFSET 500000

causes degradation:

replace with cursor/keyset where appropriate.

===========================================================
23. N+1 AUDIT
===========================================================

Measure query counts for:

Brand list
Store list
Product list
Executive dashboard
Store dashboard
Merchant products
Rank keywords

Fix measured N+1.

Do not rely on visual code inspection only.

===========================================================
24. PRISMA SELECT OPTIMIZATION
===========================================================

Audit oversized:

include: true
deep relations

Select only required fields.

Avoid huge JSON graphs.

===========================================================
25. CONNECTION POOL PRESSURE
===========================================================

Stress concurrent requests.

Measure:

active connections
waiting queries
connection timeout

Do not assume increasing Prisma pool is always correct.

Balance with PostgreSQL max connections.

===========================================================
26. DB CONNECTION STORM
===========================================================

Simulate app/worker restart.

Ensure many processes do not overwhelm DB simultaneously.

Consider:

connection pooling
startup staggering

only if measured issue appears.

===========================================================
27. LONG TRANSACTIONS
===========================================================

Detect transactions lasting too long.

Especially:

bulk product mapping
publishing
billing
provider sync

External network calls must not remain inside DB transaction.

===========================================================
28. LOCK CONTENTION
===========================================================

Test concurrent writes to:

usage counters
rank scheduling
subscriptions
same Product
same draft
same Lead status

Detect:

deadlocks
lock waits
lost updates

===========================================================
29. OPTIMISTIC CONCURRENCY
===========================================================

Verify:

Content
Puck template
billing
catalog edits

do not silently overwrite under concurrent updates.

===========================================================
30. RLS PERFORMANCE
===========================================================

Measure query plans with RLS enabled.

Do not benchmark using unrestricted admin DB role.

Use real app DB role.

===========================================================
31. RLS ISOLATION UNDER LOAD
===========================================================

Create concurrent multi-tenant security test.

Thousands of parallel requests from Tenant A/B/C.

Verify:

zero cross-tenant leakage.

No cache bleed.

===========================================================
32. CLIENT-WITHIN-TENANT ISOLATION
===========================================================

For Agency:

Client A
Client B

stress concurrent requests and verify application-level scope remains enforced.

===========================================================
33. CACHE KEY AUDIT
===========================================================

Enumerate production cache families:

domain
page context
analytics
reports
entitlements
provider metadata

Confirm keys include required scope.

No:

report:{brandId}

if tenant/surface scope required.

===========================================================
34. CACHE BLEED TEST
===========================================================

Request Tenant A report.

Immediately request equivalent Tenant B report.

Verify:

no A data appears in B.

Repeat under concurrency.

===========================================================
35. CACHE STAMPEDE
===========================================================

Simulate popular cache expiry.

100 concurrent requests request same heavy report.

Measure whether all recompute.

If needed implement:

single-flight
lock
stale-while-revalidate

only where justified.

===========================================================
36. CACHE HIT RATE
===========================================================

Measure hit/miss.

Do not assume cache improves performance.

Remove/adjust useless cache where hit rate negligible and complexity high.

===========================================================
37. REDIS MEMORY
===========================================================

Measure:

used memory
keys
TTL distribution
BullMQ impact

Detect unbounded keys.

===========================================================
38. REDIS KEY TTL
===========================================================

Cache keys must expire appropriately.

Queue structures follow BullMQ retention policy.

Do not leave completed job data forever without need.

===========================================================
39. REDIS FAILURE DRILL
===========================================================

In test environment:

temporarily stop Redis.

Observe:

API
rate limiting
queues
cache
workers

Document impact.

Restore.

Verify recovery.

===========================================================
40. BULLMQ THROUGHPUT
===========================================================

Test each queue family.

Measure:

jobs/sec
p50/p95 duration
wait time
failure rate

===========================================================
41. RANK QUEUE STRESS
===========================================================

Example:

100 clients
20 stores
50 keywords
49 grid points

Do not necessarily execute real provider queries.

Use controlled provider stub/performance adapter.

Test scheduling/queue architecture.

===========================================================
42. PROVIDER STUBS
===========================================================

For load testing external-provider workflows:

use deterministic local provider simulators.

Simulate:

success
latency
429
500
timeout

Do NOT hit production provider APIs with stress traffic.

===========================================================
43. QUEUE FAIRNESS
===========================================================

Noisy Tenant with 100k rank jobs must not indefinitely starve small Tenant.

Evaluate:

fairness
concurrency
priority

Implement tenant-aware fairness only if measured starvation occurs.

===========================================================
44. QUEUE BACKPRESSURE
===========================================================

If producer rate > worker capacity:

system must remain stable.

Measure:

queue depth growth
Redis memory
job wait

Provide capacity limits.

===========================================================
45. JOB PAYLOAD SIZE
===========================================================

Audit BullMQ payloads.

Do not place:

huge product lists
raw analytics data
large provider payloads

inside Redis jobs.

Prefer IDs + DB lookup.

===========================================================
46. WORKER MEMORY LEAK
===========================================================

Run long-duration worker soak test.

Monitor memory.

Ensure heap does not grow continuously.

===========================================================
47. APP MEMORY LEAK
===========================================================

Run HTTP soak test.

Measure Node heap over time.

Detect:

cache leaks
global Maps
unbounded arrays
event listeners

===========================================================
48. CPU PROFILING
===========================================================

For high CPU route/job:

profile.

Potential historical risk:

Puck rendering
large report transformation

Fix only measured hotspots.

===========================================================
49. BUILD SCALE
===========================================================

Run production build repeatedly.

Record:

time
peak memory

Ensure Phase 3 builder refactor actually solved old build-memory issue.

===========================================================
50. SERVER COMPONENT PAYLOAD
===========================================================

Inspect large RSC payloads.

Do not serialize huge Product/analytics records to client.

===========================================================
51. CLIENT BUNDLE
===========================================================

Measure bundles for:

public page
client dashboard
builder/editor
admin ops

Ensure Puck/editor/chart/admin libraries do not leak into public microsite.

===========================================================
52. PUBLIC JS BUDGET
===========================================================

Define practical budget.

Do not choose arbitrary number without current baseline.

Report before/after.

===========================================================
53. IMAGE PERFORMANCE
===========================================================

Test pages with many Product images.

Verify:

lazy loading
dimensions
optimized URLs
reasonable payload

Do not benchmark with tiny placeholder images only.

===========================================================
54. SSR CONCURRENCY
===========================================================

Test multiple uncached dynamic pages simultaneously.

Measure:

CPU
memory
DB pressure

===========================================================
55. STATIC/ISR OPPORTUNITIES
===========================================================

Identify pages safe for:

ISR/cache

Do not convert all public pages to dynamic SSR if data changes infrequently.

But do not cache tenant-specific private content.

===========================================================
56. INVALIDATION STRESS
===========================================================

Publish content/theme update.

Ensure cache invalidation does not trigger platform-wide stampede.

===========================================================
57. REPORT GENERATION STRESS
===========================================================

Queue:

100
1,000

scheduled reports.

Measure:

snapshot generation
PDF generation
memory
queue latency

===========================================================
58. PDF MEMORY
===========================================================

PDF generation can be expensive.

Profile:

memory per report
concurrency

Bound concurrency if required.

===========================================================
59. MERCHANT SYNC SCALE
===========================================================

Simulate:

100k products
many StoreProduct mappings

Test:

dirty detection
batching
queue payload
DB queries

Do not call real Merchant API.

===========================================================
60. LISTING REFRESH SCALE
===========================================================

Simulate many provider listings.

Ensure:

provider jobs
DB storage
consistency comparison

remain bounded.

===========================================================
61. OPPORTUNITY ENGINE SCALE
===========================================================

Test:

thousands of Keywords
pages
Stores

Measure evaluation.

Ensure rules use batch data, not nested query loops.

===========================================================
62. CONTENT SCALE
===========================================================

Test:

10k+ content items

Admin content list:
pagination

Sitemap:
generation performance

Do not load every article into memory for sitemap if avoidable.

===========================================================
63. SITEMAP SCALE
===========================================================

If URL count grows large:

support sitemap index/chunking as needed.

Follow search-engine limits.

Do not generate giant single response indefinitely.

===========================================================
64. DOMAIN SCALE
===========================================================

Test many custom domains.

Hostname resolver must remain indexed and fast.

===========================================================
65. AUTH SCALE
===========================================================

Stress login/session validation with safe test accounts.

Measure DB/Redis/session cost.

Do not disable rate limits just to make benchmark faster; use test-specific controlled config.

===========================================================
66. INVITATION SCALE
===========================================================

No need huge emphasis, but verify membership/access lookups stay indexed.

===========================================================
67. ENTITLEMENT LOOKUP SCALE
===========================================================

Measure EntitlementService.

This may run on many APIs/jobs.

Target:

fast
cache-safe
tenant-scoped

===========================================================
68. USAGE COUNTER CONTENTION
===========================================================

Stress concurrent quota consumption.

Example:

1,000 rank-check reservations.

Verify:

atomicity
no over-consumption
no deadlock

===========================================================
69. BILLING WEBHOOK BURST
===========================================================

Simulate many events.

Verify:

signature path
idempotency
processing

without provider network.

===========================================================
70. TELEPHONY WEBHOOK BURST
===========================================================

Simulate high call-event burst.

Verify:

fast webhook response
event persistence
no duplicate Leads

===========================================================
71. THIRD-PARTY LATENCY
===========================================================

Simulate provider latency:

100ms
1s
5s
30s

Verify external calls use timeouts.

Admin/public requests should not hang indefinitely.

===========================================================
72. PROVIDER OUTAGE DRILL
===========================================================

Simulate:

Google 500
Rank 429
Merchant timeout

Ensure:

queue retry/backoff
health states
no zero-data corruption

===========================================================
73. CASCADING FAILURE PREVENTION
===========================================================

One provider outage should not cause:

all workers retrying simultaneously
Redis overload
DB overload
alert storm

Measure.

===========================================================
74. ALERT LOAD
===========================================================

Simulate provider outage affecting 500 Tenants.

Verify alert deduplication.

Do not create 500 critical incidents for same platform condition unless
Tenant-specific actions truly differ.

===========================================================
75. DATABASE FAILURE DRILL
===========================================================

In dedicated environment:

temporarily interrupt DB connectivity.

Observe:

API failure
worker handling
readiness
retry

Restore DB.

Verify clean recovery.

===========================================================
76. DB RESTART RECOVERY
===========================================================

Check stale Prisma connections recover appropriately.

No manual application restart should be required if architecture supports
reconnection.

===========================================================
77. WORKER FAILURE DRILL
===========================================================

Kill one worker.

Expected:

heartbeat missing
queue backlog detected
remaining workers continue if configured

Restart.

Jobs resume safely.

===========================================================
78. APP INSTANCE FAILURE
===========================================================

If multiple app instances exist:

kill one.

Verify requests continue.

If only one instance currently:

document single-instance availability limitation rather than pretending HA.

===========================================================
79. REDIS RESTART
===========================================================

Restart Redis in test.

Verify:

BullMQ behavior
cache recovery
rate limiter behavior

Document any lost ephemeral state.

===========================================================
80. QUEUE DUPLICATE SAFETY AFTER RESTART
===========================================================

Ensure reconciliation/idempotency prevents duplicate business effects.

===========================================================
81. DEPLOYMENT UNDER LOAD
===========================================================

Test realistic rolling/restart deployment.

Observe:

in-flight requests
workers
DB connections
jobs

Do not perform this first in production.

===========================================================
82. MIGRATION PERFORMANCE
===========================================================

Test upcoming/common migration patterns against large scale dataset.

Measure lock time.

Avoid dangerous table rewrite on huge tables.

===========================================================
83. ADDITIVE MIGRATION STANDARD
===========================================================

For large tables prefer:

add nullable
backfill in batches
index safely
enforce constraint later

when applicable.

Document migration playbook.

===========================================================
84. BACKFILL FRAMEWORK
===========================================================

If large backfills are needed:

batch
checkpoint
resume
rate limit

Do not run one massive transaction.

===========================================================
85. SECURITY LOAD
===========================================================

Stress authorization and RLS.

Ensure performance optimizations do not introduce security bypass.

===========================================================
86. IDOR REGRESSION
===========================================================

Generate IDs for Tenant B resources.

Tenant A attempts thousands of direct API requests.

All denied/not-found according to policy.

===========================================================
87. CACHE SECURITY REGRESSION
===========================================================

Cross-tenant cache bleed tests under load mandatory.

===========================================================
88. PUBLIC API ABUSE
===========================================================

Stress:

lead forms
pixel/events
preview

Verify rate limiting.

No DB/Redis exhaustion from trivial attacker.

===========================================================
89. LARGE PAYLOAD ATTACK
===========================================================

Attempt oversized:

JSON
event metadata
form
builder draft

Verify body limits.

===========================================================
90. EXPENSIVE QUERY ABUSE
===========================================================

Admin filters/date range requests should not allow arbitrary unbounded:

10-year raw analytics

without pagination/aggregation.

===========================================================
91. EXPORT LOAD
===========================================================

Stress CSV/PDF export.

Bound size.

Use async jobs for large exports if needed.

Do not allocate millions of rows in memory.

===========================================================
92. FILE UPLOAD LOAD
===========================================================

Test multiple image uploads.

Check:

memory
size limits
concurrency

===========================================================
93. RATE-LIMIT FAIRNESS
===========================================================

One abusive IP/Tenant should not incorrectly block all tenants.

Key strategy must be validated.

===========================================================
94. LONG SOAK TEST
===========================================================

Run hours-long test.

Measure:

memory growth
DB connection leakage
Redis key growth
worker stability
error rate

Short 30-second tests are insufficient for leaks.

===========================================================
95. PERFORMANCE ACCEPTANCE THRESHOLDS
===========================================================

Define before final benchmark.

Example categories:

Public page p95
Admin API p95
Event ingestion p95
error rate
queue wait
worker throughput

Use realistic targets based on product requirements.

Do not invent "enterprise" targets without context.

===========================================================
96. PERFORMANCE REGRESSION TESTS
===========================================================

Create lightweight CI/perf checks where practical.

Do not run full 2-hour stress suite on every commit.

Use:

smoke performance test in CI

full suite:
scheduled/manual

===========================================================
97. BASELINE STORAGE SIZE
===========================================================

Measure DB size for scale dataset.

Break down largest tables/indexes.

Example:

RankObservation
AttributionEvent
GSC tables
Call
Audit logs

===========================================================
98. STORAGE GROWTH MODEL
===========================================================

Estimate:

rows/day
GB/month

based on measured/assumed workloads.

Clearly label estimates.

Do not present projections as actual usage.

===========================================================
99. RETENTION IMPACT
===========================================================

Test retention policies from Phase 16.

Measure cleanup time.

Verify large deletes do not lock application excessively.

===========================================================
100. PARTITIONING DECISION
===========================================================

Evaluate time-series tables.

Possible candidates:

RankObservation
AttributionEvent
large analytics

Do NOT partition just because table is large.

Only recommend/implement if query/write/storage evidence shows benefit.

===========================================================
101. ARCHIVAL DECISION
===========================================================

Evaluate moving old data to archive/object storage.

Do not implement unless operationally needed.

===========================================================
102. DATABASE VACUUM / MAINTENANCE
===========================================================

Review PostgreSQL maintenance.

Measure bloat where possible.

Do not add manual VACUUM FULL production jobs casually.

===========================================================
103. CAPACITY MODEL
===========================================================

From measurements produce:

Current Tested Capacity

Example format:

Configuration:
2 app instances
3 workers
Postgres X
Redis Y

Sustained:
X requests/sec

p95:
Y ms

Queue:
Z jobs/min

Do not extrapolate far beyond tested conditions.

===========================================================
104. SCALE LIMITS
===========================================================

Document first bottleneck.

Example:

Database CPU at 80%

or:

Rank worker throughput

or:

PDF memory

This determines next infrastructure work.

===========================================================
105. OPTIMIZATION RULE
===========================================================

Every optimization must include:

BEFORE
evidence

CHANGE

AFTER
evidence

No speculative "performance improvements".

===========================================================
106. DATABASE OPTIMIZATION REPORT
===========================================================

For each fixed query:

Before:
800 ms

Index/query change

After:
90 ms

Query plan evidence.

===========================================================
107. CACHE OPTIMIZATION REPORT
===========================================================

Before:
Report p95 2.4s
cache hit 20%

After:
p95 650ms
cache hit 78%

Only report measured values.

===========================================================
108. WORKER OPTIMIZATION REPORT
===========================================================

Measure:

concurrency before
throughput
CPU
provider limit

Then tune.

Do not set concurrency = 100 blindly.

===========================================================
109. NODE MEMORY
===========================================================

Do not solve memory leaks by simply increasing heap.

Heap increase may be used only after confirming workload legitimately requires
it.

===========================================================
110. DB HARDWARE SCALE-UP
===========================================================

Vertical scaling may be valid.

But report:

why
measurement
expected impact

before recommending.

===========================================================
111. READ REPLICA DECISION
===========================================================

Do not add read replicas until:

read workload
DB CPU
query profile

justify it.

If recommended, specify which read-only workloads can safely use replica.

===========================================================
112. MICROSERVICE DECISION
===========================================================

Do not split modules solely because repo is large.

Only recommend service split if:

deployment isolation
resource isolation
failure isolation
independent scale

is proven necessary.

===========================================================
113. NEXT.JS SCALE DECISION
===========================================================

Assess current server architecture.

Do not migrate framework.

Measure:

SSR CPU
API latency
bundle size

Fix concrete issues.

===========================================================
114. PM2 / CONTAINER SCALE
===========================================================

If current deployment uses PM2:

validate cluster behavior.

If containerized:

validate instance scaling.

Do not force Kubernetes.

===========================================================
115. PRODUCTION CONFIG VALIDATION
===========================================================

Ensure performance env resembles production enough:

Node version
DB engine/version
Redis
runtime
build mode

Do not benchmark dev server.

===========================================================
116. TEST RESULT STORAGE
===========================================================

Store performance results as artifacts:

JSON
CSV
graphs
markdown report

Do not rely on terminal scrollback only.

===========================================================
117. PERFORMANCE DASHBOARD
===========================================================

Optional internal view can display:

latest test run
baseline
regression

Do not build elaborate performance product UI unless useful.

===========================================================
118. TEST — 100 TENANTS
===========================================================

Run representative mixed workload.

Verify:

latency
errors
security
queues

===========================================================
119. TEST — NOISY TENANT
===========================================================

Tenant A creates large rank workload.

Tenant B interactive dashboard must remain usable.

Measure impact.

===========================================================
120. TEST — MILLION ROW TABLE
===========================================================

Run key analytics queries.

Check index usage/pagination.

===========================================================
121. TEST — CACHE STAMPEDE
===========================================================

100 simultaneous misses for same report.

Verify behavior.

===========================================================
122. TEST — DB CONNECTION EXHAUSTION
===========================================================

Stress near pool capacity.

Ensure graceful timeout/error.

No application hang.

===========================================================
123. TEST — REDIS MEMORY PRESSURE
===========================================================

Generate queue/cache load.

Check retention/TTL.

===========================================================
124. TEST — WORKER RESTART
===========================================================

Terminate worker mid-job.

Verify job retry/idempotency.

===========================================================
125. TEST — PROVIDER 429
===========================================================

Rank provider returns 429.

No retry storm.

===========================================================
126. TEST — GOOGLE 500
===========================================================

Google provider stub returns 500.

No metrics overwritten with zero.

===========================================================
127. TEST — REPORT BURST
===========================================================

500 scheduled reports at same time.

Measure queue.

No app crash.

===========================================================
128. TEST — WEBHOOK BURST
===========================================================

1,000 webhook events.

No duplicate Calls/Billing state.

===========================================================
129. TEST — EVENT INGESTION
===========================================================

High page-view/event write rate.

Admin UI remains responsive.

===========================================================
130. TEST — LARGE PRODUCT BRAND
===========================================================

Brand:
100k Products

Product admin:
pagination/search remain usable.

===========================================================
131. TEST — LARGE STORE BRAND
===========================================================

Brand:
1,000 Stores

Store list/report/filter remain performant.

===========================================================
132. TEST — LARGE RANK HISTORY
===========================================================

Millions of observations.

Latest run/history dashboard remains performant.

===========================================================
133. TEST — SITEMAP LARGE SITE
===========================================================

Hundreds of thousands of URLs.

Verify sitemap architecture/chunking.

===========================================================
134. TEST — CROSS-TENANT UNDER LOAD
===========================================================

Concurrent A/B traffic.

Automated assertion:

zero leaked resources.

===========================================================
135. TEST — AGENCY CLIENT ISOLATION
===========================================================

Same Tenant:
100 Clients.

Concurrent scoped users.

No cross-client access.

===========================================================
136. TEST — USAGE METER RACE
===========================================================

Concurrent consumption at quota boundary.

No overage caused by race.

===========================================================
137. TEST — CONTENT PUBLISH CONCURRENCY
===========================================================

Two editors publish/update.

Optimistic concurrency works.

===========================================================
138. TEST — DOMAIN LOOKUP
===========================================================

100k Domains.

Lookup remains indexed.

===========================================================
139. TEST — BUILD
===========================================================

Clean production build.

No hidden >4GB requirement caused by source architecture unless measured and
accepted.

===========================================================
140. TEST — SOAK
===========================================================

Multi-hour workload.

No unbounded:

heap
Redis keys
DB connections
job failures

===========================================================
141. ACCEPTANCE CRITERIA
===========================================================

Phase 17 is complete only when:

[ ] realistic scale targets defined

[ ] deterministic large dataset generator implemented

[ ] production DB protection for load tests implemented

[ ] reproducible load-test scripts implemented

[ ] public website benchmarked

[ ] admin dashboard benchmarked

[ ] event ingestion benchmarked

[ ] webhook ingestion benchmarked

[ ] database queries profiled

[ ] indexes reviewed with evidence

[ ] N+1 issues measured/fixed

[ ] pagination validated at scale

[ ] Prisma relation payloads reviewed

[ ] DB connection pool tested

[ ] lock contention tested

[ ] RLS performance tested

[ ] cross-tenant load security verified

[ ] cross-client load isolation verified

[ ] cache bleed verified absent

[ ] cache stampede tested

[ ] Redis memory behavior measured

[ ] Redis failure drill completed

[ ] BullMQ throughput measured

[ ] queue backlog behavior tested

[ ] noisy-Tenant impact tested

[ ] worker failure/recovery tested

[ ] provider failure simulations completed

[ ] report generation stress tested

[ ] Merchant/listing/rank workers stress tested

[ ] memory soak test completed

[ ] CPU hotspots profiled

[ ] public bundle measured

[ ] production build measured

[ ] migration performance reviewed

[ ] retention behavior tested at scale

[ ] security abuse tests completed

[ ] capacity model documented

[ ] first bottleneck identified

[ ] optimizations have before/after evidence

[ ] no speculative architecture rewrite performed

===========================================================
142. FINAL VERIFICATION
===========================================================

Run full regression:

Phase 0 Security
Phase 1 WebSurface
Phase 2 Catalog
Phase 3 Website Engine
Phase 4 Analytics
Phase 5 Attribution
Phase 6 GBP
Phase 7 Rank
Phase 8 Merchant
Phase 9 Calls
Phase 10 Opportunities
Phase 11 Content
Phase 12 Listings
Phase 13 Reporting
Phase 14 Agency
Phase 15 Billing
Phase 16 Operations

Then run performance suite:

SMALL
MEDIUM
LARGE
STRESS

where infrastructure capacity permits.

Do NOT intentionally crash shared infrastructure.

===========================================================
143. FINAL REPORT
===========================================================

Return:

# PHASE 17 SCALE & PRODUCTION VALIDATION REPORT

## Test Environment

Application instances:
Workers:
Node:
Postgres:
Redis:
Dataset:

## Workload Model

Tenants:
Clients:
Brands:
Stores:
Products:
Pages:
Analytics rows:
Rank rows:
Leads:
Calls:

## Baseline

API p50:
API p95:
API p99:
Error rate:
DB query p95:
Redis latency:
Queue throughput:
Memory:

## Public Website

Home:
Store:
Product:
StoreProduct:
Article:

Cold cache:
Warm cache:

## Client Dashboard

Executive report:
Store dashboard:
Analytics:
Rank:
Leads:

## Database

Largest tables:
Slow queries:
Query plans:
Connection pressure:
Locks:
Indexes added/removed:

## Redis

Memory:
Cache hit rate:
Key growth:
Failure recovery:

## BullMQ

Queue throughput:
Backlog:
Worker utilization:
Failure/retry:
Noisy-Tenant behavior:

## Provider Failure Testing

Google:
Rank:
Merchant:
Telephony:
Billing:

## Security

RLS under load:
Cross-tenant:
Cross-client:
Cache isolation:
Quota race:
Public abuse:

## Failure Drills

Database:
Redis:
Worker:
App instance:
Provider outage:
Deployment:

## Memory / CPU

App heap:
Worker heap:
CPU hotspots:
Leaks:

## Frontend / Build

Production build time:
Peak build memory:
Public bundle:
Dashboard bundle:
Builder bundle:

## Data Growth

Current scale DB size:
Largest indexes:
Estimated monthly growth:
Retention impact:

## Optimizations

For EVERY optimization:

Problem:
Before:
Change:
After:

## Capacity

Tested sustained throughput:
Tested concurrent users:
Tested queue throughput:

Configuration required:

Known first bottleneck:

Do NOT extrapolate beyond tested evidence.

## Remaining Risks

List factual unresolved production risks only.

## Recommended Next Scaling Step

Only based on measurements.

Examples may include:

more worker capacity
specific DB index
higher DB tier
read replica
queue concurrency adjustment
cache change

Do NOT recommend architecture changes without evidence.

Finish with:

PHASE 17 STATUS

Scale dataset implemented: YES/NO
Load suite implemented: YES/NO
Public traffic validated: YES/NO
Admin traffic validated: YES/NO
Database scale validated: YES/NO
Redis scale validated: YES/NO
Queue scale validated: YES/NO
Noisy-Tenant isolation verified: YES/NO
RLS under concurrency verified: YES/NO
Cross-client isolation verified: YES/NO
Cache isolation verified: YES/NO
Quota race protection verified: YES/NO
Provider failure behavior verified: YES/NO
Worker recovery verified: YES/NO
Database/Redis failure drills completed: YES/NO
Memory soak test passed: YES/NO
Production build health verified: YES/NO
Capacity model documented: YES/NO
Measured bottlenecks fixed: YES/NO
Unresolved critical production risks: YES/NO
Ready for controlled production rollout: YES/NO
Ready for Phase 18: YES/NO


18________________________________________________
# LOCALBI — PHASE 18
## CONTROLLED PRODUCTION ROLLOUT + CLIENT MIGRATION
## PILOT TENANTS + LEGACY DATA CUTOVER + FEATURE FLAGS + ROLLBACK GATES
## DNS / DOMAIN CUTOVER + INTEGRATION VERIFICATION + CLIENT ACCEPTANCE

Act as a Principal SaaS Architect, Staff Platform Engineer,
Production Release Engineer, Migration Architect,
PostgreSQL/Prisma Architect, SRE,
Multi-Tenant Security Engineer, Next.js Engineer,
Data Migration Engineer and Customer Onboarding Architect.

Phases 0–17 are assumed complete.

CURRENT PLATFORM INCLUDES:

- Tenant / Agency / Client / Brand / Store
- RLS / RBAC / Client-scoped access
- WebSurface / Domains
- Dynamic Puck website engine
- Catalog / StoreProduct
- GA4 / GSC
- GBP
- Attribution / Leads
- Rank Tracking
- Merchant Center
- Calls
- Opportunities
- Content
- Listings
- Executive Reporting
- White-label / Agency
- Billing / Entitlements
- Platform Operations
- Scale / Load Validation

NOW IMPLEMENT PHASE 18 ONLY:

Production Readiness
        ↓
Migration Inventory
        ↓
Client Cohorts
        ↓
Dry Run
        ↓
Pilot
        ↓
Validation
        ↓
Controlled Cutover
        ↓
Monitoring
        ↓
Client Acceptance
        ↓
Cohort Expansion
        ↓
Legacy Retirement

DO NOT IMPLEMENT:

- new major feature modules
- another architecture rewrite
- aggressive full-client big-bang migration
- destructive legacy deletion on first cutover
- automatic DNS changes without confirmation
- automatic Google remapping
- automatic provider-account reassignment
- database copy scripts without idempotency
- cross-tenant migration shortcuts
- production migration without dry run
- silent schema/data repair
- temporary RLS bypass
- disabling auth/security for migration convenience

===========================================================
0. PRIMARY GOAL
===========================================================

Move LocalBi from:

"technically ready"

to:

"operating with real clients safely in production."

The rollout must answer:

1. Which clients can migrate safely now?
2. Which legacy records need transformation?
3. Which mappings require human review?
4. Which domains need cutover?
5. Which Google integrations need verification?
6. Can new and legacy systems coexist temporarily?
7. What exact signals determine rollout success?
8. What triggers automatic rollout pause?
9. How do we rollback without losing new production data?
10. When is legacy infrastructure safe to retire?

Do NOT use:

"migration completed"

to mean only that a script exited successfully.

Migration success requires:

data correctness
security correctness
integration correctness
website correctness
report correctness
client acceptance

===========================================================
1. RE-AUDIT CURRENT PRODUCTION AND LEGACY STATE
===========================================================

Before changing anything inspect CURRENT:

- production deployment
- staging deployment
- databases
- legacy LocalBi data
- historical microsites
- Brand website URLs
- Products
- menu/product JSON
- Stores
- GBP mappings
- GSC mappings
- GA4 mappings
- Domain/WebSurface records
- PageTemplate/Puck records
- Leads
- analytics
- users/memberships
- client roles
- existing domains
- scheduled jobs
- queues
- active integrations
- billing state
- feature flags
- migration scripts
- backups
- restore process

Search for:

legacy
migration
backfill
cutover
deprecated
old microsite
old domain
compatibility
fallback
adapter
v1
v2
feature flag
rollout
pilot

Produce:

PHASE 18 PRE-FLIGHT

Production environment:
Legacy environment:
Current clients:
Current Brands:
Current Stores:
Current microsites:
Current domains:
Current integrations:
Current catalog format:
Current content format:
Current users/access:
Current analytics history:
Current migration scripts:
Current compatibility adapters:
Current backups:
Current rollback capability:

Classify each area:

READY
NEEDS MIGRATION
NEEDS HUMAN REVIEW
BLOCKED
NOT APPLICABLE

===========================================================
2. MIGRATION PRINCIPLE
===========================================================

Migration must be:

deterministic
idempotent
observable
reversible where practical
tenant-scoped
non-destructive initially

Never:

read legacy record
→ guess
→ silently write production

without confidence/evidence.

Ambiguous records must be:

SKIPPED
NEEDS_REVIEW

not guessed.

===========================================================
3. CLIENT MIGRATION COHORTS
===========================================================

Do not migrate all clients together.

Create cohorts.

Recommended structure:

COHORT 0
Internal/Test

COHORT 1
Pilot clients

COHORT 2
Low-complexity clients

COHORT 3
Medium-complexity clients

COHORT 4
Large / high-risk clients

Criteria may include:

Stores
Products
Domains
Google integrations
Custom pages
Traffic
Historical data
Billing
Agency structure

===========================================================
4. MIGRATION READINESS MODEL
===========================================================

Create/read model:

ClientMigrationReadiness

Conceptually:

tenantId
clientId?
brandId

status:
NOT_STARTED
ASSESSING
READY
BLOCKED
IN_PROGRESS
VALIDATING
CUTOVER_READY
CUTOVER_COMPLETE
ROLLED_BACK

blockingReasons[]
warnings[]

lastCheckedAt

Do not create fake readiness score.

===========================================================
5. MIGRATION CHECKLIST
===========================================================

Per Brand verify:

Tenant/Client ownership
Brand record
Stores
Products
StoreProduct
Domain
WebSurface
Page templates
Content
Google integrations
GBP mappings
GA4 mappings
GSC mappings
Users
Reports
Lead history
Rank configuration
Merchant if used
Calls if used
Listings if used

Each should be:

PASS
WARN
FAIL
NOT_USED

===========================================================
6. LEGACY DATA INVENTORY
===========================================================

Create exact inventory of legacy structures.

Examples:

legacy microsites
menu JSON
product JSON
hardcoded Puck data
brand-specific page configs
old analytics mappings
legacy website URL
custom domain records
legacy visitor events
old Google resource IDs

Do not assume previous phases migrated every historical record.

===========================================================
7. MIGRATION MAPPING SPEC
===========================================================

For every legacy structure define:

SOURCE
TARGET
TRANSFORMATION
UNIQUENESS RULE
AMBIGUITY RULE
ROLLBACK/REFERENCE

Example:

Legacy Microsite
→ WebSurface LOCALBI
→ Domain
→ PageTemplate

Legacy Product JSON
→ Product
→ StoreProduct

Document before executing.

===========================================================
8. MIGRATION VERSIONING
===========================================================

Every migration/backfill script must have version.

Example:

CLIENT_CATALOG_V1
MICROSITE_TO_WEBSURFACE_V2

Store execution history.

Do not rely solely on:

"script file exists."

===========================================================
9. MIGRATION RUN MODEL
===========================================================

Create/normalize:

MigrationRun

id
migrationKey
version

tenantId?
clientId?
brandId?

mode:
DRY_RUN
EXECUTE
VALIDATE

status

startedAt
completedAt

recordsRead
recordsCreated
recordsUpdated
recordsSkipped
recordsFailed

errorSummary

===========================================================
10. MIGRATION ITEM RESULTS
===========================================================

For critical migration, preserve per-item result.

Conceptually:

MigrationItemResult

migrationRunId

sourceType
sourceId

targetType?
targetId?

status:
CREATED
UPDATED
UNCHANGED
SKIPPED
AMBIGUOUS
FAILED

reasonCode?

Do not store huge raw source payload unnecessarily.

===========================================================
11. DRY RUN REQUIRED
===========================================================

Every production data migration must support:

DRY_RUN

Dry run reports:

what will be created
what will be updated
what will be skipped
what is ambiguous
what conflicts

No DB mutations.

===========================================================
12. DRY RUN DIFF
===========================================================

Produce readable migration diff.

Example:

Brand:
Aalim Perfumes

Stores:
12 unchanged

Products:
384 create
16 update
4 ambiguous

Domains:
1 create

GBP mappings:
11 verified
1 review required

No execution until blocking issues understood.

===========================================================
13. IDEMPOTENCY
===========================================================

Running same migration twice must not create duplicates.

Use stable keys.

Example:

source legacyProductId
→ migration mapping
→ Product ID

Do not use names as sole idempotency key where mutable/non-unique.

===========================================================
14. MIGRATION MAPPING TABLE
===========================================================

If necessary create:

LegacyEntityMapping

sourceSystem
sourceType
sourceId

tenantId
targetType
targetId

migrationVersion

This helps:

idempotency
debugging
rollback
traceability

===========================================================
15. NO NAME-BASED OWNERSHIP GUESSING
===========================================================

Do NOT map:

Brand
Store
Google resource
Product

solely because names look similar.

Use:

stable ID
existing explicit relation
verified domain
phone/address
external resource mapping

Ambiguous:
human review.

===========================================================
16. USER MIGRATION
===========================================================

Existing users must preserve:

identity
membership
role
client scope
brand/store restrictions

Do not create duplicate user accounts based on casing differences in email.

Normalize carefully.

===========================================================
17. ACCESS VALIDATION
===========================================================

After user migration automatically test:

Agency admin
Client admin
Viewer
Store-scoped user

Verify expected resource visibility.

===========================================================
18. RLS DURING MIGRATION
===========================================================

Do not disable RLS.

Migration service must run through explicit safe privileged workflow only where
absolutely required.

Prefer tenant-context scoped operations.

Any elevated migration DB role must be:

separate
restricted
audited

===========================================================
19. CLIENT-WITHIN-TENANT SAFETY
===========================================================

Agency migration must preserve:

Client A
Client B

separation.

No Brand re-parenting by loose Tenant-only logic.

===========================================================
20. STORE MIGRATION
===========================================================

Validate:

name
address
phone
coordinates
hours
timezone
active state
Brand ownership

Do not overwrite verified current Store data with older legacy snapshot.

===========================================================
21. PRODUCT MIGRATION
===========================================================

Legacy product/menu data:

deduplicate at Brand level.

Correct target:

Brand
  ↓
Product
  ↕
StoreProduct
  ↓
Stores

Do NOT create duplicate Product for every Store.

===========================================================
22. PRODUCT AMBIGUITY
===========================================================

If two legacy entries:

same name
different SKU/price/details

do not automatically merge unless deterministic rules establish identity.

Mark:

AMBIGUOUS.

===========================================================
23. STOREPRODUCT MIGRATION
===========================================================

Preserve:

availability
price override
quantity

when supported by legacy data.

Never infer inventory from absence without explicit rule.

===========================================================
24. DOMAIN MIGRATION
===========================================================

For existing live domains:

inventory:

hostname
DNS state
current destination
SSL state
traffic

Do not switch DNS as part of generic DB migration.

Domain cutover is separate controlled step.

===========================================================
25. WEBSURFACE MIGRATION
===========================================================

Verify:

ORIGINAL
LOCALBI

distinction.

Never accidentally treat original client site as LocalBi-managed.

===========================================================
26. LEGACY MICROSITE MIGRATION
===========================================================

Map existing microsite to:

LOCALBI WebSurface
Domain
PageTemplate
Theme

Preserve current published site until new version is validated.

===========================================================
27. PAGE/Puck MIGRATION
===========================================================

Legacy custom builder JSON:

convert via compatibility adapter.

Do not embed canonical:

phone
address
price
hours

into new Puck config.

Extract canonical data into DB where possible.

===========================================================
28. UNSUPPORTED LEGACY COMPONENT
===========================================================

If legacy component has no Phase 3 equivalent:

do NOT drop it silently.

Mark:

UNSUPPORTED_COMPONENT

Provide migration report.

Implement compatibility wrapper only if justified.

===========================================================
29. CONTENT MIGRATION
===========================================================

Existing blogs/articles:

preserve:

title
slug
body
SEO
publication date
canonical
author where real

Do not reset publishedAt to migration date.

===========================================================
30. SEO MIGRATION
===========================================================

Preserve:

titles
descriptions
canonical URLs
redirects
structured data configuration

where valid.

Prevent mass URL changes unless intentionally approved.

===========================================================
31. REDIRECT MIGRATION
===========================================================

If route changes:

create explicit redirects.

Test:

old URL
→ new canonical URL

Avoid:

redirect chain
loop
cross-client redirect

===========================================================
32. ANALYTICS HISTORY
===========================================================

Historical synchronized metrics should remain historical.

Do not relabel old:

Original Website

metrics as:

LocalBi surface.

Preserve source/surface provenance.

===========================================================
33. GA4 MIGRATION
===========================================================

Verify:

connection
account
property
WebSurface mapping
hostname filter strategy

Do not auto-map GA4 property by Brand name.

===========================================================
34. GSC MIGRATION
===========================================================

Verify:

property
type
URL prefix/domain
WebSurface
page filter

Do not migrate Domain-property aggregate rows into LocalBi-only metrics without
URL filtering.

===========================================================
35. GBP MIGRATION
===========================================================

Verify:

Google connection
Account
Location
Store mapping

Discovery does NOT mean ownership.

Every Store ↔ GBP mapping must remain explicit.

===========================================================
36. MERCHANT MIGRATION
===========================================================

For enabled clients verify:

Merchant account
Brand mapping
Product mapping
Store codes
inventory sync

Do not resubmit entire catalog during migration unnecessarily.

===========================================================
37. RANK MIGRATION
===========================================================

Preserve:

keywords
Store mappings
grid configuration
historical observations
provider identity

Do not compare old/new rank grids if configs differ.

===========================================================
38. CALL TRACKING MIGRATION
===========================================================

Preserve:

virtual number
Store mapping
provider call IDs
historical Calls

Do not change active tracking number during generic migration.

===========================================================
39. LISTING MIGRATION
===========================================================

Preserve:

provider
external listing IDs
Store mapping
issues
duplicate state

Do not trigger provider writes during migration.

===========================================================
40. BILLING MIGRATION
===========================================================

Critical.

Verify:

Tenant
provider customer
subscription
plan
period
status
entitlements
usage

Do not create duplicate billing Customer/Subscription.

===========================================================
41. BILLING SAFETY
===========================================================

Migration must NEVER accidentally:

charge customer
start new subscription
cancel active subscription
reset usage

unless explicitly part of approved billing migration.

===========================================================
42. PILOT TENANTS
===========================================================

Choose a small controlled pilot.

Prefer:

known clients
manageable data size
representative features
direct communication available

Do not select only trivial test tenants.

Need at least one realistic multi-store case.

===========================================================
43. PILOT SUCCESS CRITERIA
===========================================================

Define before cutover.

Example categories:

Security:
PASS

Website:
PASS

Integrations:
PASS

Analytics:
PASS

Leads:
PASS

Reports:
PASS

Performance:
PASS

Client acceptance:
PASS

Do not decide success emotionally after rollout.

===========================================================
44. PILOT OBSERVATION WINDOW
===========================================================

After pilot cutover:

observe meaningful period.

Depending on feature:

website:
hours/day

GSC:
may require days

rank:
next scheduled run

Merchant:
provider processing time

Do not expect all delayed provider signals instantly.

===========================================================
45. FEATURE FLAGS
===========================================================

Use Phase 16 rollout feature flags.

Possible:

NEW_WEBSITE_ENGINE
NEW_EXECUTIVE_REPORT
NEW_CATALOG
NEW_OPPORTUNITY_ENGINE

Flags are rollout controls.

They are NOT entitlements.

===========================================================
46. FEATURE FLAG SCOPE
===========================================================

Support:

global
Tenant
Client
Brand

only as needed.

Avoid complex flag system.

===========================================================
47. DUAL-READ PERIOD
===========================================================

Where migration risk is high:

allow temporary:

new system primary
legacy comparison read

Do not keep dual-read forever.

Use it to validate equivalence.

===========================================================
48. SHADOW VALIDATION
===========================================================

Example:

legacy report:
482 Calls

new report:
482 Calls

or known documented differences.

Run comparisons without exposing legacy output to client.

===========================================================
49. DUAL-WRITE CAUTION
===========================================================

Avoid dual-write unless necessary.

Dual writes create consistency problems.

Prefer:

new system becomes canonical at defined cutover.

If dual-write needed:

strict idempotency
reconciliation
short duration.

===========================================================
50. CUTOVER STATE
===========================================================

Track per Brand:

LEGACY
SHADOW
PILOT
CUTOVER_PENDING
ACTIVE_NEW
ROLLBACK
LEGACY_RETIRED

Do not infer from feature flags only.

===========================================================
51. CUTOVER PLAN
===========================================================

For each Brand:

T-24h:
prechecks

T-1h:
freeze relevant migrations/config

T0:
cutover

T+15m:
smoke checks

T+1h:
integration checks

T+24h:
client/ops validation

Adjust to actual system.

===========================================================
52. WRITE FREEZE
===========================================================

If required for a specific migration:

short scoped write freeze.

Example:

legacy builder content editing

Do NOT freeze whole platform unnecessarily.

===========================================================
53. DELTA MIGRATION
===========================================================

If initial migration happened earlier:

run delta for records changed since snapshot.

Use timestamps/version markers.

Do not rerun full destructive migration.

===========================================================
54. CUTOVER VALIDATION
===========================================================

Immediately validate:

login
client scope
public domain
homepage
Store page
Product page
forms
events
Google mappings
executive dashboard
jobs

Use automated smoke test where possible.

===========================================================
55. PUBLIC WEBSITE SMOKE TEST
===========================================================

For each migrated Brand test:

canonical hostname
HTTPS
home
store
product
article where used
404
robots
sitemap
canonical
structured data generation

===========================================================
56. DNS CUTOVER
===========================================================

DNS is a separate explicit operation.

Before change record:

current records
TTL
target
rollback record

Do not automatically mutate DNS unless current infrastructure/provider safely
supports and user explicitly initiates it.

===========================================================
57. DNS TTL
===========================================================

Before planned cutover:

reduce TTL if operationally appropriate.

Do not change TTL minutes before cutover and expect existing caches to obey
new TTL immediately.

===========================================================
58. DOMAIN VERIFICATION
===========================================================

Before routing traffic:

Domain must be:

verified
active
mapped to correct WebSurface
mapped to correct Brand/Tenant

===========================================================
59. CERTIFICATE / HTTPS
===========================================================

Verify HTTPS ready before traffic switch.

Do not cut over to domain with pending certificate if it will cause outage.

===========================================================
60. UNKNOWN HOST SAFETY
===========================================================

Post-cutover unknown host must:

404/fail closed.

Never fallback to default Tenant.

===========================================================
61. FORM / LEAD CUTOVER
===========================================================

Test public forms after DNS cutover.

Verify:

Tenant derived server-side
Lead stored
Attribution preserved
No duplicate submissions

===========================================================
62. TRACKING CUTOVER
===========================================================

Verify:

GA4 measurement
LocalBi events
Call CTA
WhatsApp
Directions

Do not duplicate event instrumentation during old/new coexistence.

===========================================================
63. SEO CUTOVER
===========================================================

Preserve:

canonical URLs
robots
sitemap
redirects

Avoid accidental:

noindex
duplicate canonical
route changes
404s.

===========================================================
64. SEARCH ENGINE TRANSITION
===========================================================

If URLs remain same:

prefer seamless underlying platform change.

If URLs change:

redirect + sitemap update + canonical validation.

Do not mass change URLs unnecessarily.

===========================================================
65. CACHE CUTOVER
===========================================================

Invalidate only affected:

Domain
PageContext
reports

Avoid global Redis flush.

===========================================================
66. QUEUE CUTOVER
===========================================================

Ensure legacy schedulers are not still generating duplicate jobs after new
scheduler activates.

One canonical scheduler per workflow.

===========================================================
67. PROVIDER JOB DUPLICATION
===========================================================

Common risk:

legacy GBP sync
+
new GBP sync

running simultaneously.

Detect/disable old producer before activating new.

===========================================================
68. MIGRATION MONITORING
===========================================================

During cutover monitor:

5xx
latency
DB
Redis
queues
workers
domain errors
forms
events
provider errors
auth failures

Use Phase 16 telemetry.

===========================================================
69. ROLLOUT GATES
===========================================================

Define hard pause conditions.

Examples:

cross-tenant security failure
public 5xx above threshold
wrong-domain routing
lead loss
billing inconsistency
DB saturation
queue runaway
severe performance regression

If triggered:

pause next cohort.

===========================================================
70. SOFT WARNING GATES
===========================================================

Examples:

minor UI issue
one non-critical provider stale
small performance regression

May continue after review.

Document criteria.

===========================================================
71. AUTOMATIC ROLLOUT PAUSE
===========================================================

If rollout tooling supports automation:

critical health check may pause next cohort.

Do NOT automatically rollback production data without explicit safe design.

===========================================================
72. ROLLBACK PRINCIPLE
===========================================================

Rollback must distinguish:

CODE rollback

TRAFFIC rollback

DATA rollback

These are different.

Do not say:

"just revert deployment"

when new writes already occurred.

===========================================================
73. CODE ROLLBACK
===========================================================

Previous application release can be redeployed only if schema remains
compatible.

Use migration compatibility rules from Phase 16.

===========================================================
74. TRAFFIC ROLLBACK
===========================================================

For domain cutover:

restore previous DNS/route target.

But new leads/events may have been written in LocalBi.

Do not lose them.

===========================================================
75. DATA ROLLBACK
===========================================================

Avoid deleting newly migrated/newly-created data.

Prefer:

mark cutover state ROLLBACK
legacy becomes active
new system retained for reconciliation.

===========================================================
76. NEW-WRITE RECONCILIATION
===========================================================

If rollback occurs after new system received:

Leads
Calls
Content
Products

identify how these writes are preserved/migrated back or retained.

Document per module.

===========================================================
77. NEVER RESTORE OLD DB OVER NEW WRITES
===========================================================

Do NOT treat full DB backup restore as standard application rollback after
production activity.

That can destroy unrelated/new Tenant data.

===========================================================
78. CLIENT ACCEPTANCE CHECKLIST
===========================================================

For pilot client verify:

Can login
Correct Brands
Correct Stores
Correct Products
Correct website
Correct reports
Correct Google integrations
Correct Leads
Correct users
Correct branding

Client/user confirms expected behavior.

===========================================================
79. CLIENT ACCEPTANCE RECORD
===========================================================

Track:

acceptedBy
acceptedAt
notes

Do not require complex e-signature unless product needs it.

===========================================================
80. POST-CUTOVER SUPPORT WINDOW
===========================================================

For pilot/large client:

define elevated monitoring window.

Example:

24–72h

Watch:

errors
integration freshness
calls/forms
reports

===========================================================
81. COHORT PROMOTION
===========================================================

Next cohort starts only after:

pilot success criteria pass

and no unresolved critical incident.

Do not expand because calendar deadline says so.

===========================================================
82. BATCH SIZE
===========================================================

Increase gradually.

Example:

1
5
20
50
100

depending on capacity.

Use Phase 17 capacity evidence.

===========================================================
83. NOISY CLIENT MIGRATION
===========================================================

Large client with:

many Stores
Products
rank jobs

must not be migrated simultaneously with many other heavy clients if capacity
risk exists.

===========================================================
84. MIGRATION RATE LIMIT
===========================================================

Limit:

DB writes
queue generation
cache invalidations

Migration itself must not become outage.

===========================================================
85. BACKFILL BATCHING
===========================================================

Large data migrations:

batch
checkpoint
resume

Do not one-shot millions of rows.

===========================================================
86. CHECKPOINTS
===========================================================

Migration job should persist progress.

If process dies:

resume safely.

No restart from zero unless harmless.

===========================================================
87. MIGRATION LOCK
===========================================================

Prevent same Brand migration running twice concurrently.

Use deterministic lock/idempotency key.

===========================================================
88. MIGRATION RETRY
===========================================================

Retry failed batch only.

Do not duplicate successful records.

===========================================================
89. PARTIAL MIGRATION
===========================================================

If:

95% success
5% ambiguous

do not call complete.

Status:

VALIDATION_REQUIRED

or PARTIAL.

===========================================================
90. VALIDATION QUERIES
===========================================================

For each migration use deterministic assertions.

Examples:

legacy Stores = target Stores

legacy valid products mapped

no duplicate active Domain

all resource mappings same tenant

all PageTemplate relations valid

===========================================================
91. DATA CHECKSUMS
===========================================================

For large deterministic datasets consider normalized checksums/counts.

Example:

product count
store-product count
aggregate pricing counts

Do not hash volatile timestamps unnecessarily.

===========================================================
92. MIGRATION QUALITY REPORT
===========================================================

Per Brand:

Expected
Migrated
Skipped
Ambiguous
Failed

Example:

Stores:
12 / 12

Products:
398 / 400
2 review

Domains:
1 / 1

Google:
3 / 3 integrations verified

===========================================================
93. HUMAN REVIEW QUEUE
===========================================================

Create migration-review UI/list for ambiguous items.

Examples:

Product duplicate
Google resource match
Domain conflict
User scope

Reviewer selects correct mapping.

Audit decision.

===========================================================
94. HUMAN REVIEW SAFETY
===========================================================

Reviewer sees enough context:

source
possible targets
evidence

Do not show only IDs.

===========================================================
95. LEGACY COMPATIBILITY WINDOW
===========================================================

Keep legacy adapters for a defined period.

Example:

30/60/90 days

based on product plan.

Do not remove immediately after first successful pilot.

===========================================================
96. LEGACY READ MONITORING
===========================================================

Track whether compatibility paths are still used.

Example:

legacy microsite adapter hits

When usage reaches zero and migration verified:

candidate for retirement.

===========================================================
97. DEPRECATION WARNINGS
===========================================================

Internal logs/ops may show:

legacy path still used

Do not expose developer warnings to clients.

===========================================================
98. LEGACY WRITE DISABLE
===========================================================

After successful cutover:

disable legacy writes for migrated Brand.

Prevent divergence.

===========================================================
99. LEGACY READ-ONLY
===========================================================

Temporary legacy system may remain read-only for support/reference.

Do not keep dual active editing.

===========================================================
100. LEGACY RETIREMENT CRITERIA
===========================================================

Retire only when:

all target clients migrated
no compatibility reads
no active legacy jobs
data archived/retained
rollback window passed
client acceptance complete
backups verified

===========================================================
101. LEGACY ARCHIVE
===========================================================

Preserve required historical data.

Do not delete merely to clean database.

Follow Phase 16 retention policy.

===========================================================
102. LEGACY SECRETS
===========================================================

After retirement:

revoke old:

OAuth credentials if no longer needed
service accounts
API keys
webhook secrets

Do not leave abandoned credentials active.

===========================================================
103. LEGACY DNS
===========================================================

Remove obsolete DNS only after:

traffic confirmed migrated
redirect requirements satisfied
rollback window passed.

===========================================================
104. ROLLOUT DASHBOARD
===========================================================

Internal:

Production Rollout

Cohort
Tenant
Client
Brand
Readiness
Migration
Validation
Cutover
Health
Acceptance

Example:

Aalim
ACTIVE_NEW
Healthy
Accepted

Lakshmi Food
CUTOVER_READY

Priyan Juice
BLOCKED
GBP mapping review

===========================================================
105. MIGRATION DETAIL VIEW
===========================================================

Show:

Readiness
Migration Runs
Data Counts
Warnings
Domains
Integrations
Cutover History
Acceptance
Rollback state

No raw secrets.

===========================================================
106. ROLLOUT METRICS
===========================================================

Track:

Brands assessed
Ready
Migrated
Validated
Rolled back
Blocked

Do not make a fake success score.

===========================================================
107. SECURITY GATE
===========================================================

Any security regression:

RLS
Client isolation
Domain routing
Auth

immediately blocks cohort promotion.

No exceptions for deadline.

===========================================================
108. BILLING GATE
===========================================================

For paid clients:

Subscription/entitlements must be verified.

Do not cut over if migration would:

double charge
lose subscription mapping
incorrectly disable paid feature.

===========================================================
109. DOMAIN GATE
===========================================================

Domain:

verified
HTTPS ready
routing correct

before traffic cutover.

===========================================================
110. INTEGRATION GATE
===========================================================

For integrations the client uses:

connection valid
resource mapped
sync succeeds

before marking rollout complete.

===========================================================
111. REPORTING GATE
===========================================================

Executive dashboard:

correct scope
correct surface
correct Store totals
no source mixing

must be validated.

===========================================================
112. LEAD GATE
===========================================================

Test real/synthetic test submission in controlled environment/production-safe
smoke mode.

Ensure:

form
lead
notification
report

work.

Do not pollute client metrics with test Leads without marking/removing safely.

===========================================================
113. TEST TRAFFIC IDENTIFICATION
===========================================================

If production smoke test generates events:

mark:

isTest

or use controlled exclusion mechanism.

Do not contaminate real analytics.

===========================================================
114. PRODUCTION SMOKE TOOL
===========================================================

Create safe automated smoke suite.

Checks:

domain
login
API
Store page
Product page
form endpoint
analytics endpoint
report
health

No destructive actions.

===========================================================
115. SMOKE TEST AUTH
===========================================================

Use dedicated test identities.

Do not hardcode real client password in CI.

===========================================================
116. RELEASE PINNING
===========================================================

Know exact application release used for each cohort cutover.

Store release/commit reference.

Useful for incident correlation.

===========================================================
117. CONFIG SNAPSHOT
===========================================================

Before cutover snapshot:

Domain mapping
feature flags
integration mappings
relevant config

Do not snapshot secrets into migration log.

===========================================================
118. CHANGE FREEZE
===========================================================

For high-risk large migration consider short configuration freeze.

Communicate clearly.

Do not impose unnecessary long freeze.

===========================================================
119. SUPPORT COMMUNICATION
===========================================================

Prepare client-facing template:

migration window
expected impact
what changes
what does not
support path

No need overly technical details.

===========================================================
120. CLIENT CREDENTIALS
===========================================================

Do not request client passwords for migration.

Use OAuth/invitation flows.

===========================================================
121. GOOGLE REAUTH
===========================================================

If reauth required:

client performs authorized OAuth.

Do not attempt to migrate expired tokens by bypass.

===========================================================
122. PROVIDER CONNECTION TRANSFER
===========================================================

Provider resources belong to explicit mappings.

Do not silently reuse connection from wrong Tenant/Client.

===========================================================
123. CUTOVER FAILURE CLASSIFICATION
===========================================================

Use:

SECURITY_BLOCKER
DATA_BLOCKER
DOMAIN_BLOCKER
INTEGRATION_BLOCKER
PERFORMANCE_BLOCKER
CLIENT_ACCEPTANCE_BLOCKER
MINOR_ISSUE

Do not use generic "migration failed".

===========================================================
124. INCIDENT LINKAGE
===========================================================

If rollout causes incident:

link rollout/cutover record to Phase 16 Incident.

===========================================================
125. ROLLBACK DECISION LOG
===========================================================

If rollback occurs record:

reason
time
decision maker
traffic action
data implications
follow-up

===========================================================
126. ROOT CAUSE
===========================================================

Do not immediately assign root cause from correlation.

Example:

deployment happened before failure

does not prove deployment caused it.

Record investigation separately.

===========================================================
127. DATA PROTECTION
===========================================================

Before each high-risk cohort:

verify backup freshness.

Do not take whole-system backup for every tiny migration if existing reliable
backup strategy covers it.

===========================================================
128. MIGRATION DB ROLE
===========================================================

Use dedicated migration capability.

Do not expose it to normal application/user.

===========================================================
129. MIGRATION SCRIPT SAFETY
===========================================================

Scripts must require:

environment
tenant/client/brand scope
mode

Example:

--brand-id
--dry-run

Do not default to:

all tenants production execute.

===========================================================
130. CONFIRMATION GUARD
===========================================================

Production execute should require explicit flag.

Example:

--execute-production

Exact implementation can vary.

Goal:

avoid accidental execution.

===========================================================
131. NO DESTRUCTIVE SQL
===========================================================

Search migration scripts for:

DROP
TRUNCATE
DELETE without scope

Review manually.

Prefer additive migration.

===========================================================
132. CI MIGRATION TEST
===========================================================

Test migration against:

fresh DB
legacy fixture DB
already-migrated DB

Idempotency must pass.

===========================================================
133. FIXTURE VARIANTS
===========================================================

Create fixtures:

simple client
multi-store
multi-brand
agency
legacy weird data
ambiguous data

===========================================================
134. TEST — DRY RUN
===========================================================

Dry run must produce report.

DB state unchanged.

===========================================================
135. TEST — IDEMPOTENCY
===========================================================

Execute same migration twice.

Second run:

UNCHANGED

No duplicates.

===========================================================
136. TEST — AMBIGUOUS PRODUCT
===========================================================

Two possible product targets.

Expected:

SKIPPED / AMBIGUOUS.

No guessing.

===========================================================
137. TEST — CROSS-TENANT
===========================================================

Migration for Tenant A cannot mutate Tenant B.

===========================================================
138. TEST — CROSS-CLIENT
===========================================================

Agency migration for Client A cannot map Brand/Store to Client B.

===========================================================
139. TEST — USER ACCESS
===========================================================

After migration:

client viewer sees correct client only.

===========================================================
140. TEST — DOMAIN
===========================================================

Domain mapped to Brand A.

Cannot resolve Brand B.

===========================================================
141. TEST — SEO REDIRECT
===========================================================

Old URL redirects exactly once to canonical.

No loop.

===========================================================
142. TEST — GOOGLE MAPPING
===========================================================

Unmapped discovered GBP location remains unmapped.

Migration never auto-assigns by name.

===========================================================
143. TEST — REPORT EQUIVALENCE
===========================================================

Where legacy/new metrics should match:

compare known fixture.

Differences documented.

===========================================================
144. TEST — LEAD DURING CUTOVER
===========================================================

Lead submitted during/after cutover.

No loss.
No duplicate.

===========================================================
145. TEST — ROLLBACK AFTER NEW LEAD
===========================================================

Rollback traffic.

New Lead in LocalBi remains preserved.

===========================================================
146. TEST — QUEUE DUPLICATION
===========================================================

Legacy/new schedulers cannot both queue same sync after cutover.

===========================================================
147. TEST — FEATURE FLAG
===========================================================

Pilot Brand sees new feature.

Non-pilot remains legacy.

No cross-brand leak.

===========================================================
148. TEST — CLIENT ACCEPTANCE
===========================================================

Acceptance stored with actor/time.

===========================================================
149. TEST — ROLLOUT GATE
===========================================================

Critical security check fails.

Next cohort cannot start.

===========================================================
150. TEST — LEGACY WRITE BLOCK
===========================================================

After cutover:

legacy UI/API cannot modify migrated Brand.

===========================================================
151. TEST — LEGACY READ
===========================================================

Legacy compatibility read continues during agreed window.

===========================================================
152. TEST — RETIREMENT
===========================================================

Legacy job producer disabled.

No new legacy jobs appear.

===========================================================
153. PERFORMANCE DURING MIGRATION
===========================================================

Measure:

migration writes/sec
DB CPU
locks
Redis
queues

Migration must respect Phase 17 production capacity.

===========================================================
154. THROTTLED MIGRATION
===========================================================

If migration causes load pressure:

pause/throttle batches.

Do not compete with live traffic.

===========================================================
155. MIGRATION PRIORITY
===========================================================

Production client traffic has priority over backfill.

Use queue separation/throttling where necessary.

===========================================================
156. OBSERVABILITY
===========================================================

All migration logs include:

migrationRunId
tenantId
clientId/brandId
migrationKey
batch
status
duration

Do not log PII/source payload unnecessarily.

===========================================================
157. ALERTS
===========================================================

Alert on:

migration terminal failure
security assertion failure
wrong-domain routing
cutover health failure
unexpected DB pressure

Do not alert on every skipped ambiguous record.

===========================================================
158. REPORTING
===========================================================

Create cohort report:

Cohort:
1

Brands:
5

Ready:
5

Migrated:
5

Validated:
4

Blocked:
1

Rollback:
0

Show reason for blocked Brand.

===========================================================
159. LEGACY RETIREMENT REPORT
===========================================================

Before retirement show:

remaining clients
legacy traffic
legacy writes
legacy jobs
unmigrated records
active credentials
domains
rollback window

All must be understood.

===========================================================
160. ACCEPTANCE CRITERIA
===========================================================

Phase 18 is complete only when:

[ ] production/legacy inventory completed

[ ] client migration readiness implemented

[ ] migration cohort strategy implemented

[ ] versioned migration framework implemented

[ ] MigrationRun tracking implemented

[ ] per-item ambiguity/failure visibility implemented

[ ] dry-run support implemented

[ ] migration diff implemented

[ ] idempotency verified

[ ] legacy entity mapping implemented where needed

[ ] users/access migrated safely

[ ] Store migration verified

[ ] Product/StoreProduct migration verified

[ ] WebSurface/Domain migration verified

[ ] Puck/template migration verified

[ ] SEO/routes/redirects verified

[ ] analytics provenance preserved

[ ] GA4/GSC/GBP mappings verified explicitly

[ ] Merchant/Rank/Calls/Listings migration verified where applicable

[ ] billing/entitlements preserved

[ ] pilot cohort implemented

[ ] rollout success criteria defined

[ ] feature-flagged rollout implemented

[ ] cutover state tracked

[ ] DNS/domain cutover process documented

[ ] HTTPS/domain verification required

[ ] automated production smoke tests implemented

[ ] rollout monitoring implemented

[ ] hard rollout gates implemented

[ ] rollback plan distinguishes code/traffic/data

[ ] new writes preserved during rollback

[ ] client acceptance recorded

[ ] cohort promotion gated

[ ] migration throttling implemented

[ ] legacy write disable implemented after cutover

[ ] legacy usage monitoring implemented

[ ] legacy retirement criteria documented

[ ] migration RLS/cross-client safety verified

[ ] no automatic ambiguous mapping exists

[ ] no destructive migration shortcuts exist

===========================================================
161. FINAL VERIFICATION
===========================================================

Run:

prisma validate
prisma migrate status

typecheck
lint touched files

migration framework tests
dry-run tests
idempotency tests
legacy fixture tests
user/access tests
catalog migration tests
domain migration tests
SEO redirect tests
integration mapping tests
billing-preservation tests
cutover tests
rollback tests
feature-flag tests
smoke tests
RLS tests
cross-client tests
cross-tenant tests

Regression:

Phase 0 through Phase 17.

Then perform:

Internal Cohort 0
    ↓
Pilot Cohort 1
    ↓
Validate
    ↓
Only then expand.

===========================================================
162. FINAL REPORT
===========================================================

Return:

# PHASE 18 PRODUCTION ROLLOUT REPORT

## Pre-flight

Production:
Legacy:
Clients:
Brands:
Stores:
Domains:
Integrations:
Billing:

## Migration Framework

Versioning:
Dry Run:
Idempotency:
Item Results:
Legacy Mapping:
Checkpoints:
Throttling:

## Data Migration

Users:
Clients:
Brands:
Stores:
Products:
StoreProduct:
Pages:
Content:
Analytics:
Leads:

## Integration Migration

GA4:
GSC:
GBP:
Rank:
Merchant:
Calls:
Listings:

## Website Migration

WebSurface:
Domain:
Puck:
SEO:
Redirects:
Sitemap:
HTTPS:

## Billing

Customer mapping:
Subscription:
Entitlements:
Usage:
No duplicate billing:

## Pilot

Clients:
Selection criteria:
Migration result:
Cutover result:
Observation:
Acceptance:

## Cutover

Feature flags:
DNS:
Cache:
Schedulers:
Smoke tests:
Release version:

## Monitoring

API:
DB:
Redis:
Queues:
Workers:
Domains:
Integrations:
Leads:

## Rollout Gates

Security:
Data:
Performance:
Integration:
Billing:
Client acceptance:

## Rollback

Code:
Traffic:
Data:
New-write preservation:
Test result:

## Legacy

Read compatibility:
Writes disabled:
Traffic remaining:
Jobs remaining:
Credentials:
Retirement readiness:

## Security

RLS:
Client isolation:
Brand isolation:
Domain isolation:
Migration privilege:

## Verification

Prisma:
TypeScript:
Lint:
Tests:
Smoke:
Build:

## Remaining Blockers

List only factual blockers.

Finish with:

PHASE 18 STATUS

Migration framework implemented: YES/NO
Dry-run verified: YES/NO
Migration idempotency verified: YES/NO
Ambiguous-record safety verified: YES/NO
User/access migration verified: YES/NO
Catalog migration verified: YES/NO
WebSurface/domain migration verified: YES/NO
SEO/redirect migration verified: YES/NO
Google mappings verified: YES/NO
Billing preserved without duplication: YES/NO
Pilot cohort completed: YES/NO
Production smoke suite passed: YES/NO
Rollout gates active: YES/NO
Rollback tested: YES/NO
New-write preservation verified: YES/NO
Client acceptance completed: YES/NO
Cross-client isolation verified: YES/NO
Cross-tenant isolation verified: YES/NO
Legacy writes disabled for migrated clients: YES/NO
Legacy retirement criteria satisfied: YES/NO
Controlled production rollout ready: YES/NO
Ready for Phase 19: YES/NO



19_____________________________________________

# LOCALBI — PHASE 19
## PRODUCT UX/UI CONSOLIDATION + ENTERPRISE DESIGN SYSTEM
## USER-FRIENDLY WORKFLOWS + INFORMATION ARCHITECTURE + SMOOTH MOTION
## RESPONSIVE + ACCESSIBLE + CONSISTENT EXPERIENCE ACROSS ALL MODULES

Act as a Principal Product Designer, Staff Frontend Architect,
Enterprise SaaS UX Architect, Design Systems Engineer,
React/Next.js Performance Engineer, Accessibility Specialist,
Data Visualization Designer and Product Experience Lead.

Phases 0–18 are assumed complete.

LocalBi now contains major modules:

- Overview
- Clients
- Brands
- Stores
- Website / Microsite
- Puck Builder
- Domains
- Products
- Categories
- Store Products
- GBP
- GSC
- GA4 / Website Analytics
- Rank Tracking
- Competitors
- Merchant Center
- Leads
- Calls
- Opportunities
- Content
- Listings
- Reports
- Agency / White Label
- Users / Access
- Billing
- Integrations
- Settings
- Platform Operations

NOW IMPLEMENT PHASE 19 ONLY:

Existing Product
      ↓
UX Audit
      ↓
Information Architecture
      ↓
Design System
      ↓
Interaction Standards
      ↓
Navigation
      ↓
Page Templates
      ↓
Data Visualization System
      ↓
Loading / Empty / Error States
      ↓
Responsive Design
      ↓
Accessibility
      ↓
Motion System
      ↓
Performance
      ↓
Full Product Migration
      ↓
Final UX Validation

THIS IS NOT A FEATURE-BUILDING PHASE.

Do NOT:

- create new backend product modules
- rewrite working APIs unnecessarily
- change business semantics
- create page-specific random design styles
- use excessive gradients
- use excessive glassmorphism
- animate everything
- create huge cards everywhere
- hide important information behind unnecessary clicks
- use 20 colors on analytics dashboards
- redesign without checking actual workflows
- remove important enterprise functionality just to make pages look simple
- use fake/demo metrics to make design look better
- rebuild every component from scratch when reusable components already exist

===========================================================
0. PRIMARY UX GOAL
===========================================================

A first-time LocalBi user should understand:

1. Where am I?
2. Which client / Brand / Store am I viewing?
3. What is happening?
4. What needs attention?
5. What can I do next?
6. What data source am I looking at?
7. Is my integration/data healthy?
8. How do I move to another module?

within seconds.

The application should feel:

PREMIUM
ENTERPRISE
MODERN
CALM
FAST
TRUSTWORTHY
DATA-RICH
NOT CLUTTERED

Target experience:

"Complex platform,
simple to operate."

===========================================================
1. AUDIT THE CURRENT UI BEFORE REDESIGNING
===========================================================

First inspect ALL current screens.

Inventory:

- routes
- layouts
- sidebars
- nav bars
- cards
- tables
- charts
- forms
- filters
- dialogs
- drawers
- tabs
- badges
- buttons
- notifications
- toasts
- loading states
- empty states
- error states
- onboarding flows
- wizards
- configuration screens
- mobile behavior

Search current code for:

Card
Button
Table
Modal
Dialog
Drawer
Tabs
Badge
Skeleton
Spinner
Toast
Chart
Recharts
Select
Dropdown
Form
Input
Tooltip
Sidebar
Breadcrumb
Header
Pagination

Produce:

# PHASE 19 UX AUDIT

For each screen identify:

Current purpose
Primary user task
Problems
Duplicate UI
Visual inconsistency
Interaction inconsistency
Information overload
Missing hierarchy
Poor empty state
Poor error handling
Poor responsive behavior
Accessibility issues
Performance concerns

Classify:

KEEP
POLISH
RESTRUCTURE
CONSOLIDATE
REPLACE
REMOVE

Do not redesign before understanding current behavior.

===========================================================
2. CREATE ONE LOCALBI DESIGN LANGUAGE
===========================================================

LocalBi must have one unified visual system.

Not:

Analytics page = one style
GBP = another
Merchant = another
Rank = another

Create:

LocalBi Design System

covering:

Typography
Spacing
Color
Radius
Borders
Shadows
Elevation
Icons
Motion
Data visualization
Form controls
Tables
Navigation
Feedback states

===========================================================
3. DESIGN PRINCIPLES
===========================================================

Use these principles throughout the product:

CLARITY OVER DECORATION

HIERARCHY OVER DENSITY

CONSISTENCY OVER NOVELTY

PROGRESSIVE DISCLOSURE

ACTIONABLE DATA

VISIBLE SYSTEM STATUS

LOW COGNITIVE LOAD

NO SURPRISE NAVIGATION

PREDICTABLE INTERACTIONS

===========================================================
4. VISUAL DIRECTION
===========================================================

Target:

modern enterprise analytics SaaS.

Light mode should feel:

clean
premium
high contrast
spacious
structured

Avoid:

flat old Bootstrap look
heavy black borders
rainbow cards
too much purple/blue gradients
every card having shadow
huge hero areas inside dashboards

Use subtle depth.

Main background:
very soft neutral.

Primary surfaces:
white / theme surface.

Borders:
subtle.

Elevation:
reserved for:

dropdown
modal
drawer
floating controls.

===========================================================
5. COLOR SYSTEM
===========================================================

Create semantic tokens.

Example:

surface
surface-muted
surface-raised

text-primary
text-secondary
text-muted

border
border-strong

primary
primary-hover
primary-muted

success
warning
danger
info

Do not hardcode:

#ffffff
#ef4444
etc.

through components.

Use CSS variables/design tokens.

===========================================================
6. DATA COLORS
===========================================================

Charts need separate data palette.

Create:

chart-1
chart-2
chart-3
chart-4
chart-5

Use controlled palette.

Do not use random colors in each Recharts component.

Semantic status colors remain separate from categorical chart colors.

===========================================================
7. TYPOGRAPHY
===========================================================

Define hierarchy.

Example:

Display / Page title
Section title
Card title
Body
Small
Caption
Metric value
Table text

Do not create arbitrary:

text-[13px]
text-[17px]
text-[22px]

throughout product.

Use standard typography tokens/classes.

===========================================================
8. SPACING SYSTEM
===========================================================

Use consistent spacing scale.

Example:

4
8
12
16
20
24
32
40
48

Do not use random margins per page.

===========================================================
9. RADIUS
===========================================================

Choose a restrained radius scale.

Example:

small controls
medium cards
large dialogs

Avoid every container becoming giant rounded rectangle.

===========================================================
10. ICON SYSTEM
===========================================================

Choose one icon library/current library.

Do not mix:

Lucide
Heroicons
FontAwesome
random SVG

unless required.

Icon sizes standardized:

16
18
20
24

===========================================================
11. APP SHELL
===========================================================

Build one reusable application shell.

Structure:

┌───────────────────────────────────────────────┐
│ Top Bar                                       │
├─────────────┬─────────────────────────────────┤
│ Sidebar     │ Main Content                    │
│             │                                 │
│             │                                 │
└─────────────┴─────────────────────────────────┘

App shell handles:

sidebar
top bar
breadcrumbs
client context
brand context
notifications
user menu

Do not duplicate layout code by module.

===========================================================
12. SIDEBAR INFORMATION ARCHITECTURE
===========================================================

Current product has many modules.

Do NOT show 25 top-level menu items.

Group them.

Recommended conceptual IA:

OVERVIEW
  Overview

PRESENCE
  Website
  Google Business
  Listings
  Content

ANALYTICS
  Website Analytics
  Search Console
  Rank Tracking
  Reports

COMMERCE
  Products
  Merchant Center

CONVERSIONS
  Leads
  Calls

GROWTH
  Opportunities

MANAGEMENT
  Stores
  Integrations
  Team

SETTINGS
  Brand
  Domains
  Billing
  Settings

Agency users additionally:

AGENCY
  Clients
  Team
  White Label

Exact grouping must follow actual product roles.

===========================================================
13. SIDEBAR BEHAVIOR
===========================================================

Desktop:

expanded sidebar

Optional collapsed mode.

Tablet:

compact.

Mobile:

drawer.

Show:

active module
active nested page

Do not rely only on color to indicate active state.

===========================================================
14. CLIENT / BRAND / STORE CONTEXT
===========================================================

One of the biggest UX risks in LocalBi:

user does not know which Brand/Store is active.

Make context persistent and obvious.

Top bar should support:

Agency
→ Client
→ Brand

Store filter when page requires it.

Example:

LP Digital
/
Aalim Perfumes
/
All Stores

Do not bury this in settings.

===========================================================
15. CONTEXT SWITCHER
===========================================================

Context switcher should support:

search
recent Clients
recent Brands
keyboard navigation

Do not reload entire application unnecessarily.

When switching Brand:

invalidate relevant query cache safely.

===========================================================
16. PAGE HEADER
===========================================================

Every primary page should follow same pattern.

Example:

Analytics
Understand how customers discover and interact with your LocalBi website.

[Date Range] [Store Filter] [Export]

No random headers.

Component:

<PageHeader
  title
  description
  breadcrumb
  actions
/>

===========================================================
17. BREADCRUMBS
===========================================================

Use when hierarchy matters.

Example:

Products
/
Royal Oud
/
Merchant

Do not use breadcrumbs for shallow screens unnecessarily.

===========================================================
18. PAGE MAX WIDTH
===========================================================

Analytics/admin pages:

wide layout.

Forms/settings:

narrower readable content width.

Do not stretch forms across 1800px monitors.

===========================================================
19. PAGE TEMPLATES
===========================================================

Define reusable templates:

DashboardPage
ListPage
DetailPage
SettingsPage
WizardPage
BuilderPage
ReportPage

Do not structure every route independently.

===========================================================
20. DASHBOARD PAGE
===========================================================

Preferred hierarchy:

Page Header

Status/Alert area

Primary KPIs

Main trend/chart

Breakdown

Actionable data table

Recommendations/next actions

Avoid:

10 rows of tiny cards.

===========================================================
21. KPI CARDS
===========================================================

One reusable MetricCard.

Supports:

title
value
comparison
trend
description
source
freshness
state
optional sparkline

Example:

12,480
Users
↑ 12.4%
vs previous 30 days

Source: GA4

Do not create separate KPI implementation per module.

===========================================================
22. KPI INFORMATION HIERARCHY
===========================================================

Metric value:

highest emphasis.

Metric label:

clear.

Trend:

secondary.

Source/date:

subtle.

Do not make icons bigger than the data.

===========================================================
23. CHART SYSTEM
===========================================================

Create reusable wrappers:

LineTrendChart
AreaTrendChart
BarComparisonChart
HorizontalBarChart
DonutBreakdownChart
RankGrid
FunnelChart

Do not directly configure Recharts independently in every page.

===========================================================
24. CHART RULES
===========================================================

Every chart must have:

clear title
date range
units
tooltip
empty state
loading state

Do not:

hide axes unnecessarily
use 3D charts
use unexplained colors
show 10-series spaghetti charts.

===========================================================
25. TOOLTIP DESIGN
===========================================================

Chart tooltips should share one component.

Example:

Oct 12

Users
1,240

Sessions
1,481

No different tooltip styling across modules.

===========================================================
26. CHART ANIMATION
===========================================================

Use subtle animation.

Initial chart render:

250–450ms

Ease-out.

Do not animate chart for multiple seconds.

Do not replay aggressive animation whenever filter changes.

===========================================================
27. TABLE SYSTEM
===========================================================

Create unified enterprise DataTable.

Supports:

search
filters
sorting
pagination
column visibility
bulk select
sticky header where useful
empty state
loading
row actions

Modules reuse it.

===========================================================
28. TABLE DENSITY
===========================================================

Support:

comfortable default.

Optional compact density for power users later.

Do not make every row extremely tall.

===========================================================
29. TABLE ROW ACTIONS
===========================================================

Primary row interaction:

click row for detail where appropriate.

Secondary:

... menu

Avoid 6 visible action buttons per row.

===========================================================
30. BULK ACTIONS
===========================================================

When user selects rows:

display contextual bulk action bar.

Example:

3 Products selected

[Enable Merchant]
[Assign Stores]
[Archive]

Not always-visible inactive toolbar clutter.

===========================================================
31. FILTER SYSTEM
===========================================================

Filters must behave consistently.

Use:

FilterBar

with:

Date
Store
Status
Source
Category

Advanced filters inside:

Filters button / popover / drawer.

Do not use unique filter UX per module.

===========================================================
32. FILTER CHIPS
===========================================================

Active filters visible.

Example:

Store: Mannadi ×
Status: Error ×

[Clear all]

User must understand why results are filtered.

===========================================================
33. SEARCH
===========================================================

Debounced search.

Clear icon.

Keyboard-friendly.

Do not run API on every keystroke without debounce.

===========================================================
34. EMPTY STATES
===========================================================

Every empty state must answer:

Why is this empty?

What should I do?

Examples:

No Products yet

"Add your first product to start building your LocalBi catalog."

[Add Product]

No Merchant connection

"Connect Merchant Center to see product approval and inventory status."

[Connect Merchant Center]

Avoid:

No Data

alone.

===========================================================
35. NO-RESULT STATE
===========================================================

Different from empty state.

Example:

No products match these filters.

[Clear filters]

Do not suggest onboarding when data exists but filters hide it.

===========================================================
36. NOT-CONNECTED STATE
===========================================================

Example:

Search Console isn't connected yet.

Explain value briefly.

[Connect Search Console]

No fake metrics behind blurred cards.

===========================================================
37. REAUTH STATE
===========================================================

Example:

Search Console needs attention.

Your Google authorization has expired.

Last successful sync:
Sep 28, 2026

[Reconnect]

Clear and actionable.

===========================================================
38. ERROR STATES
===========================================================

Errors should answer:

What happened?
What can the user do?

Example:

We couldn't refresh Merchant data.

Last successful sync:
2 hours ago

[Retry]

Technical details optionally:

Request ID

Do not expose raw stack traces.

===========================================================
39. LOADING STATES
===========================================================

Prefer skeletons matching final layout.

Avoid full-screen spinner for routine page navigation.

Use:

card skeleton
table skeleton
chart skeleton

Do not cause layout shift.

===========================================================
40. BACKGROUND REFRESH
===========================================================

When existing data is available:

keep data visible while refreshing.

Show subtle:

Refreshing...

Do not replace whole dashboard with skeleton.

===========================================================
41. SUCCESS FEEDBACK
===========================================================

After actions:

save
mapping
publish
sync

provide clear confirmation.

Example:

Product saved.

Toast should not be the ONLY confirmation for critical workflow.

===========================================================
42. TOAST SYSTEM
===========================================================

One global toast implementation.

Use:

Success
Error
Info

Avoid excessive toasts.

Do not toast for every minor UI state.

===========================================================
43. DIALOG SYSTEM
===========================================================

Use Modal for:

focused decision
small forms
confirmation

Do not put complex 8-step workflows in a modal.

===========================================================
44. DRAWER SYSTEM
===========================================================

Use side drawer for:

details
filters
quick edit

when preserving page context helps.

Example:

Lead details
Listing issue details

===========================================================
45. FULL PAGE FLOW
===========================================================

Use full page/wizard for:

Google onboarding
Website creation
Client onboarding
Large configuration
Billing plan change

Do not force these into tiny dialogs.

===========================================================
46. FORMS
===========================================================

Create consistent form primitives.

Field:

Label
Optional helper
Control
Error

Do not use placeholder as field label.

===========================================================
47. FORM WIDTH
===========================================================

Keep text forms readable.

Typical:

500–720px

not full-screen width.

===========================================================
48. FORM VALIDATION
===========================================================

Show errors near field.

Example:

Please enter a valid domain.

Do not only show:

Validation failed.

===========================================================
49. SAVE BEHAVIOR
===========================================================

Choose clear patterns.

Settings:

Save Changes

Editor:

Autosave if appropriate.

Do not mix silently.

===========================================================
50. UNSAVED CHANGES
===========================================================

Protect unsaved changes.

If navigating away:

You have unsaved changes.

[Discard]
[Continue Editing]

Do not show for autosaved screens unnecessarily.

===========================================================
51. CONFIRMATION DIALOGS
===========================================================

Confirmation reserved for destructive/high-impact actions.

Examples:

Delete
Disconnect integration
Release number
Archive Brand

Do not confirm harmless actions.

===========================================================
52. DESTRUCTIVE ACTION STYLE
===========================================================

Danger action clearly differentiated.

Confirmation should explain consequence.

Example:

Disconnect Search Console?

Historical synchronized data will remain,
but new data will stop syncing.

[Cancel]
[Disconnect]

===========================================================
53. ONBOARDING EXPERIENCE
===========================================================

Current LocalBi setup is complex.

Build guided onboarding.

Concept:

Welcome
  ↓
Create Client / Brand
  ↓
Add Stores
  ↓
Connect Google
  ↓
Select Resources
  ↓
Configure LocalBi Website
  ↓
Finish

===========================================================
54. ONBOARDING PROGRESS
===========================================================

Use explicit steps.

Not arbitrary percentage.

Example:

1. Brand
2. Stores
3. Google
4. Resources
5. Website
6. Review

===========================================================
55. SKIP OPTIONAL STEPS
===========================================================

Clearly distinguish:

Required
Optional

User should not be blocked by Merchant Center if they only need analytics.

===========================================================
56. FIRST-RUN EXPERIENCE
===========================================================

After onboarding:

show useful overview.

Example:

Aalim Perfumes is ready.

Connected:

✓ Google Business
✓ Search Console
✓ Analytics

Next recommended setup:

Connect Merchant Center
Add rank keywords

Do not dump user into empty complex dashboard.

===========================================================
57. INTEGRATIONS UX
===========================================================

Create consistent integration cards.

Google Analytics

Connected
Property: Aalim GA4
Last sync: 20 min ago

[Manage]

Search Console

Needs Reconnection

[Reconnect]

===========================================================
58. INTEGRATION WIZARD
===========================================================

Use same visual pattern:

1 Connect Account
2 Choose Resources
3 Review Mapping
4 Confirm

This matches earlier LocalBi architecture.

===========================================================
59. RESOURCE SELECTION
===========================================================

Use:

search
checkbox
hierarchy
clear ownership context

Example:

Google Account
  ↓
Property
  ↓
Web Stream

Do not show raw resource IDs as primary label.

===========================================================
60. MAPPING REVIEW
===========================================================

Before confirmation show:

LocalBi Brand
→ Google Resource

LocalBi Store
→ GBP Location

User must know what is being connected.

===========================================================
61. WEBSITE / MICROSITE UX
===========================================================

This needs special attention.

Website area should have clear sections:

Overview
Pages
Design
Domains
SEO
Analytics

Not one enormous builder/configuration screen.

===========================================================
62. WEBSITE OVERVIEW
===========================================================

Show:

Live domain
Publication status
Pages
Traffic
Conversions
SEO health factual items

Actions:

[Edit Website]
[View Live]
[Manage Domain]

===========================================================
63. PUCK BUILDER EXPERIENCE
===========================================================

Builder layout:

┌──────────────┬──────────────────────────────┬───────────────┐
│ Components   │ Canvas                       │ Properties    │
│              │                              │               │
│ Search       │ Live page                    │ Selected      │
│ Categories   │                              │ component     │
│              │                              │ settings      │
└──────────────┴──────────────────────────────┴───────────────┘

Top:

Back
Page selector
Desktop / Tablet / Mobile
Undo / Redo
Preview
Publish

===========================================================
64. BUILDER COMPONENT LIBRARY
===========================================================

Group components:

Layout
Hero
Store
Products
Trust
Content
Conversion
Navigation

Search components.

Do not show 40 unsorted components.

===========================================================
65. BUILDER DRAG FEEDBACK
===========================================================

Show clear:

drop target
insertion line
selected component
hover component

Avoid ambiguous dragging.

===========================================================
66. BUILDER PROPERTIES
===========================================================

Right panel groups:

Content
Layout
Appearance
Data Source
Advanced

Do not show 50 settings flat.

===========================================================
67. BUILDER BUSINESS DATA
===========================================================

If component uses:

Store
Product
Category

show semantic selector.

Example:

Product Grid

Source:
Current Store Products

Limit:
8

Not giant JSON configuration.

===========================================================
68. PUBLISH UX
===========================================================

Top-right:

Save status

Saved

[Preview]
[Publish]

Publish dialog:

Pages affected
Domain
SEO validation warnings

Then:

[Publish Website]

===========================================================
69. ANALYTICS UX
===========================================================

Analytics needs clearer hierarchy.

Global pattern:

Overview
Acquisition
Audience
Engagement
Events
Pages
Conversions

Do not show every metric on every page.

===========================================================
70. ANALYTICS OVERVIEW
===========================================================

Structure:

Primary KPIs

Users
Sessions
Conversions
Conversion Rate

Traffic Trend

Top Sources

Top Pages

Top Locations / Stores

Actionable Insight/Opportunity section

Avoid dense text blocks.

===========================================================
71. GA4 VS GSC UX
===========================================================

Always label source.

Example:

Website Traffic
Source: Google Analytics

Search Performance
Source: Search Console

User should never wonder which provider generated a number.

===========================================================
72. RANK TRACKING UX
===========================================================

Overview:

Visibility
Top 3
Top 10
Avg Found Rank
Tracked Keywords

Then:

Trend
Keyword table
Geo-grid
Competitors

Do not put the map first if user needs summary first.

===========================================================
73. RANK GRID UX
===========================================================

Grid must have:

map
legend
keyword selector
Store selector
date/run selector

Hover point:

Rank
Coordinate
Top result
Checked time

===========================================================
74. COMPETITOR UX
===========================================================

Competitor comparison:

table + chart

Business
Visibility
Top-3 Coverage
Avg Rank

Do not use gimmicky radar charts by default.

===========================================================
75. GBP UX
===========================================================

Sections:

Overview
Profile
Reviews
Posts
Media
Performance

Profile should show:

Google value
LocalBi value
sync/source

clearly.

===========================================================
76. REVIEW UX
===========================================================

Review card:

Reviewer
Rating
Date
Text
Reply state

Filters:

Rating
Replied
Date

Do not show reviews as giant unstructured text list.

===========================================================
77. MERCHANT UX
===========================================================

Overview:

Approved
Pending
Disapproved
Inventory Errors

Then:

Product table.

Status badges standardized.

Issue detail in drawer.

===========================================================
78. LEADS UX
===========================================================

Pipeline-oriented but simple.

Top:

Total
New
Qualified
Converted

Table:

Lead
Source
Store
Type
Status
Created

Details in drawer.

Do not build full CRM unless required.

===========================================================
79. CALLS UX
===========================================================

Overview:

Total Calls
Answered
Missed
Avg Talk Duration

Table:

Time
Caller
Store
Status
Duration
Lead

Mask PII based on permissions.

===========================================================
80. OPPORTUNITY UX
===========================================================

This should feel actionable.

Card:

HIGH PRIORITY

Improve Mannadi Oud page

Why:
12.4K impressions
18% Top-3 coverage
41 conversions

[Review]

Do not show vague AI-like text.

===========================================================
81. OPPORTUNITY DETAIL
===========================================================

Sections:

Recommendation
Evidence
Affected entity
Expected action
Sources

CTA:

[Start Action]
[Dismiss]

===========================================================
82. CONTENT UX
===========================================================

Content workspace:

All Content
Calendar
Briefs

List:

Title
Status
Topic
Author
Updated
Performance

===========================================================
83. CONTENT EDITOR
===========================================================

Clean writing-first layout.

Main editor.

Right sidebar:

SEO
Relations
Publishing

AI actions:

Generate Outline
Rewrite Selection
Suggest FAQ

Avoid huge AI panel constantly visible.

===========================================================
84. LISTINGS UX
===========================================================

Overview:

Healthy
Needs Review
Duplicates
Manual Actions

Provider table.

Issue click:

side-by-side comparison.

LocalBi
vs
Provider

===========================================================
85. REPORTS UX
===========================================================

Reports page:

Executive Dashboard
Saved Reports
Scheduled Reports
History

Do not mix report configuration into analytics page.

===========================================================
86. BILLING UX
===========================================================

Simple:

Current Plan
Usage
Billing Period
Payment Method
Invoices

Plan comparison clearly shows:

features
limits
price

No dark patterns.

===========================================================
87. USERS / ACCESS UX
===========================================================

Table:

User
Role
Scope
Status

Invitation flow:

Email
Role
Client scope
Brand/Store scope

Review before invite.

===========================================================
88. SETTINGS IA
===========================================================

Group:

General
Brand
Domains
Integrations
Users
Notifications
Billing
Advanced

Avoid one massive settings page.

===========================================================
89. STATUS BADGE SYSTEM
===========================================================

Standardize statuses.

Success:
Connected
Active
Published
Synced
Approved

Warning:
Needs Review
Partial
Pending
Stale

Danger:
Error
Failed
Disconnected
Disapproved

Neutral:
Draft
Paused
Archived

Do not invent new color for every status.

===========================================================
90. STATUS LABEL LANGUAGE
===========================================================

Use user-friendly wording.

Instead of:

RESOURCE_UNAVAILABLE

Display:

Resource unavailable

Technical code may appear in diagnostic detail.

===========================================================
91. HELP / EXPLANATION
===========================================================

Complex LocalBi concepts need lightweight contextual help.

Use:

tooltip
info icon
short helper text

Example:

Top-3 Coverage ⓘ

"Percentage of valid geo-grid points where your business ranked in positions 1–3."

Do not create long documentation inside every screen.

===========================================================
92. MOTION SYSTEM
===========================================================

Create one Motion System.

Use animation to communicate:

state
location
hierarchy
feedback

Not decoration.

===========================================================
93. MOTION TOKENS
===========================================================

Define durations:

instant: 100ms
fast: 160ms
normal: 220ms
slow: 320ms

Approximate values can be adjusted after testing.

Use common easing.

Example:

ease-out for enter
ease-in for exit
spring only where appropriate

===========================================================
94. PAGE TRANSITIONS
===========================================================

Do NOT animate entire app sliding around.

Use subtle:

fade
small translate
content reveal

150–250ms.

Navigation must still feel immediate.

===========================================================
95. CARD ANIMATION
===========================================================

Hover:

subtle border/elevation.

Example:

translateY maximum ~1–2px

No dramatic floating cards.

===========================================================
96. BUTTON ANIMATION
===========================================================

Hover:
subtle background transition.

Press:
very small scale/feedback.

Do not delay action for animation.

===========================================================
97. DRAWER / MODAL MOTION
===========================================================

Drawer:

slide + fade
200–300ms.

Modal:

fade + slight scale
180–240ms.

Avoid bouncing.

===========================================================
98. DROPDOWN MOTION
===========================================================

Fast.

100–160ms.

Menu should feel instant.

===========================================================
99. SKELETON ANIMATION
===========================================================

Subtle shimmer/pulse.

Do not use strong flashing effect.

===========================================================
100. NUMBER ANIMATION
===========================================================

Optional metric count-up only on first meaningful load.

Do not animate:

0 → 12,480

every time user changes filter.

Prefer simple crossfade for updates.

===========================================================
101. CHART TRANSITIONS
===========================================================

Animate initial draw subtly.

On filters:

smooth transition if performant.

Respect reduced motion.

===========================================================
102. REDUCED MOTION
===========================================================

Mandatory:

prefers-reduced-motion

Disable/reduce nonessential animations.

Accessibility requirement.

===========================================================
103. FRAMER MOTION
===========================================================

If Framer Motion already exists:

centralize motion variants.

Do not write custom motion config in every component.

Potential:

motionPresets.ts

fadeIn
slideUp
drawer
modal
stagger

===========================================================
104. PERFORMANCE OF MOTION
===========================================================

Prefer animating:

opacity
transform

Avoid expensive:

height
width
top
left
box-shadow animation

where possible.

===========================================================
105. MICROINTERACTIONS
===========================================================

Useful examples:

copy domain → check icon
save → Saved state
sync → spinning small status then success
drag/drop → insertion indicator
filter applied → chip appears

Keep feedback immediate.

===========================================================
106. RESPONSIVE DESIGN
===========================================================

Audit:

1440+
1280
1024
768
390

Not just desktop.

===========================================================
107. MOBILE PRINCIPLE
===========================================================

Admin platform does not need every desktop capability compressed equally.

Prioritize:

overview
reports
leads
calls
notifications

Complex builder may show:

"Best experienced on desktop"

if genuinely impractical.

But core data remains usable.

===========================================================
108. RESPONSIVE TABLES
===========================================================

Do not horizontal-scroll every giant table blindly.

For mobile:

priority columns
row card/detail
optional horizontal scroll for analytical data

Choose based on task.

===========================================================
109. TOUCH TARGETS
===========================================================

Buttons/interactive controls:

sufficient hit area.

Avoid tiny 16px clickable icons without surrounding button.

===========================================================
110. ACCESSIBILITY
===========================================================

Target WCAG 2.2 AA where practical.

Audit:

keyboard navigation
focus states
labels
color contrast
screen reader semantics
dialog focus trap
table headers
form errors
chart summaries

===========================================================
111. FOCUS SYSTEM
===========================================================

All interactive components need visible focus.

Do not remove outline without replacement.

===========================================================
112. COLOR CONTRAST
===========================================================

Muted text must remain readable.

Do not use ultra-light gray for important metadata.

===========================================================
113. CHART ACCESSIBILITY
===========================================================

Provide:

textual summary
table alternative where meaningful
tooltip keyboard access if feasible

Do not rely only on chart color.

===========================================================
114. KEYBOARD SUPPORT
===========================================================

Important flows:

sidebar
dialogs
menus
filters
tables
builder controls

should be keyboard accessible.

===========================================================
115. COMMAND PALETTE
===========================================================

Optional but valuable for enterprise users.

Cmd/Ctrl + K

Search:

Clients
Brands
Stores
Pages
Products
Modules

Do not implement until basic navigation is correct.

===========================================================
116. GLOBAL SEARCH
===========================================================

Potential future/optional:

Search:

Client
Brand
Store
Product
Page

Use server-backed search.

Do not load all records client-side.

===========================================================
117. NOTIFICATIONS UX
===========================================================

Notification center:

Needs action
Updates
System

Prioritize actionable items.

Examples:

GSC needs reconnection
Rank scan completed
Merchant product disapproved

Avoid notification noise.

===========================================================
118. DATE RANGE UX
===========================================================

Use same date picker everywhere.

Presets:

7D
28D
30D
90D
Custom

Comparison optional.

Do not implement different date components per analytics page.

===========================================================
119. NUMBER FORMATTING
===========================================================

Centralize:

12,480
12.5K
4.6%
₹2,499

Use locale.

Do not format differently across modules.

===========================================================
120. DATE FORMATTING
===========================================================

Centralize date/time.

Respect Tenant timezone.

Examples:

Oct 2, 2026
10:42 AM

Tooltips may show exact timestamp.

===========================================================
121. COPY / MICROCOPY
===========================================================

Rewrite confusing technical text.

Bad:

"No resources mapped."

Better:

"No Search Console property is connected to this Brand yet."

CTA:

[Connect Search Console]

===========================================================
122. BUTTON LANGUAGE
===========================================================

Use clear verbs:

Connect
Save
Publish
Retry
Review
Assign
Invite
Export

Avoid:

Submit

when actual action is more specific.

===========================================================
123. DANGEROUS TERMINOLOGY
===========================================================

Do not expose internal architecture unnecessarily.

Example:

"ExternalResource mapping missing"

becomes:

"This Store isn't linked to a Google Business Profile location."

===========================================================
124. USER CONTROL
===========================================================

Never unexpectedly:

publish
delete
disconnect
change provider mapping
start expensive rank job

without clear action.

===========================================================
125. PROGRESS INDICATORS
===========================================================

For long operations:

Importing 384 products

147 / 384

or:

Sync queued

Do not leave infinite spinner.

===========================================================
126. BACKGROUND JOB UX
===========================================================

Action:

Run Rank Check

Immediate:

Rank check queued.

Then:

Running

Then:

Completed / Partial / Failed

User can leave page.

===========================================================
127. DATA FRESHNESS UX
===========================================================

Show:

Updated 12 min ago

where important.

Use tooltip for exact time.

Do not repeat freshness under every tiny metric if section-level timestamp is enough.

===========================================================
128. SOURCE PROVENANCE UX
===========================================================

Use subtle source badges:

GA4
GSC
GBP
LocalBi
Merchant

Keep data trustworthy.

===========================================================
129. DESIGN TOKEN ARCHITECTURE
===========================================================

Implement central tokens.

Potential:

styles/tokens.css
styles/theme.css

or existing Tailwind CSS v4 token strategy.

No scattered hardcoded design values.

===========================================================
130. COMPONENT LAYERING
===========================================================

Suggested:

components/ui/
  button
  input
  select
  dialog
  drawer
  table
  tabs
  badge
  tooltip
  skeleton

components/product/
  page-header
  metric-card
  filter-bar
  data-table
  chart-card
  empty-state
  integration-card
  status-panel

features/
  module-specific composites

Do not put business-specific logic inside base UI primitives.

===========================================================
131. SHADCN / EXISTING COMPONENTS
===========================================================

If Shadcn/current primitives already exist:

extend them.

Do not introduce another full component library unnecessarily.

===========================================================
132. STORYBOOK / VISUAL CATALOG
===========================================================

If Storybook exists:

update it.

If not:

consider lightweight internal design-system route only if useful.

Do not spend weeks configuring tooling unrelated to migration.

===========================================================
133. DUPLICATE COMPONENT AUDIT
===========================================================

Search for:

multiple Card components
multiple Button variants
multiple Table implementations
multiple status badges
multiple empty states
multiple date pickers

Consolidate.

===========================================================
134. REMOVE INLINE STYLES
===========================================================

Remove repeated:

style={{...}}

where design tokens/component variants should handle it.

Do not remove legitimate dynamic positioning.

===========================================================
135. REMOVE MAGIC COLORS
===========================================================

Search:

hex
rgb
Tailwind arbitrary colors

Move repeated design values to semantic tokens.

===========================================================
136. DARK MODE
===========================================================

Do NOT make Dark Mode mandatory for Phase 19.

First perfect Light Mode.

If current architecture supports theme safely:

ensure components remain token-based and future-ready.

===========================================================
137. PAGE-SPECIFIC DESIGN EXCEPTIONS
===========================================================

Some modules genuinely need unique layouts:

Puck Builder
Rank Map
Content Editor

Allow task-specific layouts.

But:

Typography
controls
status
colors
motion

still use design system.

===========================================================
138. DASHBOARD PERSONALIZATION
===========================================================

Do not implement drag/drop dashboard customization yet.

Use strong default hierarchy.

Customization adds complexity.

===========================================================
139. PERFORMANCE BUDGET
===========================================================

UX redesign must not degrade app.

Measure:

LCP
INP
CLS
route bundle
initial JS
chart render
table render

Before/after.

===========================================================
140. LAZY LOADING
===========================================================

Lazy-load heavy components where useful:

maps
builder
large charts
editors

Do not lazy-load tiny common UI causing excessive waterfalls.

===========================================================
141. CHART PERFORMANCE
===========================================================

Avoid rendering thousands of chart points.

Aggregate/downsample where necessary.

===========================================================
142. TABLE PERFORMANCE
===========================================================

Pagination first.

Virtualize only when justified.

Do not render 10,000 rows.

===========================================================
143. MEMOIZATION
===========================================================

Use:

React.memo
useMemo
useCallback

only for measured/stable performance cases.

Do not memoize everything blindly.

===========================================================
144. TANSTACK QUERY UX
===========================================================

Use:

keepPreviousData / placeholderData where appropriate

for pagination/filter transitions.

Avoid flashing empty states.

===========================================================
145. OPTIMISTIC UPDATES
===========================================================

Use for safe, reversible actions.

Examples:

toggle tracking status

Do not optimistically report:

provider integration updated

before provider confirms.

===========================================================
146. ROUTE TRANSITION UX
===========================================================

Navigation should feel immediate.

Use loading boundary/skeleton.

Do not show blank white screen between pages.

===========================================================
147. SCROLL RESTORATION
===========================================================

List → Detail → Back

should preserve:

filters
pagination
scroll

where feasible.

Important for enterprise workflows.

===========================================================
148. URL STATE
===========================================================

Persist useful filters:

date
store
status
tab

in URL when beneficial.

Allows sharing/back navigation.

===========================================================
149. TAB UX
===========================================================

Tabs represent sibling views.

Do not use 10+ tabs.

When too many:

restructure IA.

===========================================================
150. MODAL OVERLOAD AUDIT
===========================================================

Find nested modals.

Avoid:

Modal
→ Modal
→ Modal

Use full page/drawer where needed.

===========================================================
151. FINAL PAGE AUDIT MATRIX
===========================================================

Create matrix for every route.

Columns:

Page
Purpose
Template
Header
Navigation
Filters
Loading
Empty
Error
Responsive
Accessibility
Motion
Design-system compliant

No page should be forgotten.

===========================================================
152. CRITICAL USER JOURNEY — NEW CLIENT
===========================================================

Test:

Agency
→ Create Client
→ Create Brand
→ Add Stores
→ Connect Google
→ Map Resources
→ Configure Website
→ View Dashboard

Count:

steps
clicks
confusion points

Simplify.

===========================================================
153. CRITICAL JOURNEY — DAILY CLIENT USER
===========================================================

Login
→ Overview
→ Find issue
→ Review Opportunity
→ Open affected page
→ Take action

Should feel obvious.

===========================================================
154. CRITICAL JOURNEY — STORE MANAGER
===========================================================

Login
→ Store
→ Reviews
→ Leads
→ Calls
→ Rank

Scope should remain Store-focused.

===========================================================
155. CRITICAL JOURNEY — CONTENT EDITOR
===========================================================

Opportunity
→ Brief
→ Draft
→ Preview
→ Publish

No unnecessary detours.

===========================================================
156. CRITICAL JOURNEY — PRODUCT ADMIN
===========================================================

Product
→ Assign Stores
→ Price
→ Merchant
→ Fix issue

Smooth and clear.

===========================================================
157. CRITICAL JOURNEY — INTEGRATION RECOVERY
===========================================================

Dashboard warning
→ Search Console needs reconnection
→ Reconnect
→ Verify resource
→ Sync resumes

No need to navigate through 4 unrelated settings pages.

===========================================================
158. COMMAND / QUICK ACTIONS
===========================================================

Optional quick-create menu:

Add Store
Add Product
Create Content
Invite User

Use only common actions.

Do not overload top bar.

===========================================================
159. DESIGN REVIEW BREAKPOINT
===========================================================

Before migrating all pages:

implement representative screens first:

1. Overview
2. Analytics
3. Product list
4. Integration setup
5. Store detail
6. Puck Builder

Review consistency.

Then migrate all pages.

===========================================================
160. DO NOT REDESIGN EVERYTHING AT ONCE
===========================================================

Migration order:

FOUNDATIONS
    ↓
App Shell
    ↓
Core UI primitives
    ↓
Page templates
    ↓
Critical pages
    ↓
Feature modules
    ↓
Edge screens

Avoid giant risky one-commit redesign.

===========================================================
161. UI MIGRATION FLAGS
===========================================================

If necessary:

use temporary implementation flags.

But remove old version after validation.

Do not keep:

UI v1
UI v2
UI v3

forever.

===========================================================
162. VISUAL REGRESSION
===========================================================

Add visual regression tests where current test stack supports it.

Focus:

App shell
Metric cards
Tables
Dialogs
Critical dashboards

Do not snapshot every pixel of every screen unnecessarily.

===========================================================
163. E2E UX TESTS
===========================================================

Test:

navigation
filters
dialogs
forms
wizards
responsive critical flows

Use actual accessible roles where possible.

===========================================================
164. ACCESSIBILITY TESTS
===========================================================

Run automated accessibility checks on representative screens.

Also manually test:

keyboard
focus
dialogs
menus

Automated checks alone are insufficient.

===========================================================
165. TEST — LOADING
===========================================================

Slow API simulation.

Page should show correct skeleton.

No layout collapse.

===========================================================
166. TEST — EMPTY
===========================================================

Brand with no Products.

Show onboarding empty state.

===========================================================
167. TEST — FILTER EMPTY
===========================================================

Products exist but filter matches none.

Show:

No results.

Not:

Create your first Product.

===========================================================
168. TEST — ERROR
===========================================================

Provider fails.

Existing stale data remains visible where safe.

Error state actionable.

===========================================================
169. TEST — REAUTH
===========================================================

GSC expired.

User sees clear Reconnect flow.

===========================================================
170. TEST — RESPONSIVE
===========================================================

Critical routes:

390px
768px
1024px
1440px

No overlapping UI.

===========================================================
171. TEST — KEYBOARD
===========================================================

Complete basic navigation without mouse.

===========================================================
172. TEST — REDUCED MOTION
===========================================================

prefers-reduced-motion enabled.

Nonessential animations removed.

===========================================================
173. TEST — CONTEXT SWITCH
===========================================================

Switch:

Aalim
→ Lakshmi Food

No stale Aalim data flashes into Lakshmi Food page.

===========================================================
174. TEST — TABLE STATE
===========================================================

Filter Product table.

Open Product.

Back.

Filter remains.

===========================================================
175. TEST — FORM ERRORS
===========================================================

Invalid domain.

Error appears near domain field.

Focus moves appropriately if submit fails.

===========================================================
176. TEST — LONG TEXT
===========================================================

Long:

Brand name
Product name
Client name

must not break layout.

===========================================================
177. TEST — LARGE NUMBERS
===========================================================

Metrics:

1,234,567
100%
0
N/A

layout remains stable.

===========================================================
178. TEST — MANY STORES
===========================================================

1,000 Stores.

Store selector searchable.

Do not render 1,000 options eagerly if avoidable.

===========================================================
179. TEST — TABLE PAGINATION
===========================================================

Large Product/Lead lists.

Changing page does not reset all unrelated filters.

===========================================================
180. TEST — MOTION PERFORMANCE
===========================================================

Animations should not introduce jank.

Target smooth interaction on reasonable hardware.

===========================================================
181. TEST — BUILDER
===========================================================

Drag component.

Select.

Edit properties.

Preview.

Publish.

No confusing hidden state.

===========================================================
182. TEST — CHART SOURCE
===========================================================

Analytics chart clearly labels:

GA4 / GSC / LocalBi

where relevant.

===========================================================
183. TEST — ACCESSIBILITY
===========================================================

Critical dialogs:

correct role
title
focus trap
escape behavior
return focus.

===========================================================
184. TEST — DESTRUCTIVE ACTION
===========================================================

Disconnect integration.

User sees exact consequence.

No accidental one-click disconnect.

===========================================================
185. PRODUCT COPY AUDIT
===========================================================

Search UI for:

technical errors
inconsistent capitalization
unclear button labels
internal enum names

Replace with human-friendly wording.

===========================================================
186. DESIGN CONSISTENCY AUDIT
===========================================================

Search for inconsistent:

heights
radius
font
padding
shadow
status colors
icon sizes

Consolidate.

===========================================================
187. NO SYNTHETIC DATA
===========================================================

Redesign must work with:

DATA
NO_DATA
ERROR
NOT_CONNECTED
STALE

Do not add fake metrics merely to make screen attractive.

===========================================================
188. ACCEPTANCE CRITERIA
===========================================================

Phase 19 is complete only when:

[ ] complete UX audit performed

[ ] information architecture consolidated

[ ] one AppShell implemented

[ ] Client/Brand context is always clear

[ ] sidebar navigation reorganized

[ ] reusable PageHeader implemented

[ ] page templates established

[ ] design tokens centralized

[ ] typography standardized

[ ] spacing standardized

[ ] colors standardized

[ ] icon system standardized

[ ] status badges standardized

[ ] buttons standardized

[ ] forms standardized

[ ] dialogs/drawers standardized

[ ] DataTable standardized

[ ] MetricCard standardized

[ ] chart wrappers standardized

[ ] date range/filter UX standardized

[ ] loading states standardized

[ ] empty states implemented meaningfully

[ ] filtered-empty states differentiated

[ ] error states actionable

[ ] integration/re-auth states standardized

[ ] responsive behavior verified

[ ] accessibility verified

[ ] reduced-motion support implemented

[ ] global motion system implemented

[ ] animations remain subtle/performance-safe

[ ] onboarding simplified

[ ] Google connection wizard simplified

[ ] Microsite/Website UX reorganized

[ ] Puck Builder redesigned for clarity

[ ] analytics pages simplified

[ ] GBP pages improved

[ ] rank pages improved

[ ] Merchant pages improved

[ ] Leads/Calls improved

[ ] Opportunities improved

[ ] Content improved

[ ] Listings improved

[ ] Reports improved

[ ] Billing improved

[ ] Users/Access improved

[ ] Settings IA improved

[ ] duplicate components consolidated

[ ] hardcoded design values reduced

[ ] major user journeys tested

[ ] no synthetic data introduced

[ ] backend semantics preserved

[ ] existing security/RLS behavior preserved

===========================================================
189. VERIFICATION
===========================================================

Run:

typecheck
lint
unit tests
component tests
E2E tests
accessibility tests
responsive tests
visual regression tests where configured

production build

Measure:

public bundle
dashboard bundle
builder bundle

Core Web Vitals where applicable:

LCP
INP
CLS

Compare before vs after.

Do NOT claim smoother/faster unless measured.

===========================================================
190. FINAL REPORT
===========================================================

Return:

# PHASE 19 UX/UI IMPLEMENTATION REPORT

## UX Audit

Routes reviewed:
Major problems:
Duplicate patterns:
Navigation issues:
Accessibility issues:

## Information Architecture

Old navigation:
New navigation:
Context hierarchy:
Page hierarchy:

## Design System

Colors:
Typography:
Spacing:
Radius:
Icons:
Status:
Motion:

## Core Components

AppShell:
PageHeader:
MetricCard:
DataTable:
FilterBar:
ChartCard:
EmptyState:
ErrorState:
Dialog:
Drawer:
Forms:

## Navigation

Sidebar:
Top bar:
Client switcher:
Brand switcher:
Store filter:
Breadcrumbs:

## Dashboard UX

Overview:
Analytics:
Store:
Reports:

## Website / Puck

Website overview:
Pages:
Builder:
Component library:
Properties:
Responsive preview:
Publishing:

## Integrations

Connection cards:
Wizard:
Resource selection:
Mapping review:
Reauth:

## Feature Modules

GBP:
GSC:
GA4:
Rank:
Merchant:
Products:
Leads:
Calls:
Opportunities:
Content:
Listings:
Reports:
Billing:
Users:
Settings:

## Motion

Page:
Cards:
Charts:
Dialogs:
Drawers:
Microinteractions:
Reduced motion:

## Responsive

Desktop:
Tablet:
Mobile:

## Accessibility

Keyboard:
Focus:
Contrast:
Forms:
Dialogs:
Charts:

## Performance

Before:
After:

Dashboard bundle:
Public bundle:
Builder bundle:
LCP:
INP:
CLS:

## User Journeys

New client:
Daily user:
Store manager:
Content editor:
Product admin:
Integration recovery:

## Verification

TypeScript:
Lint:
Tests:
E2E:
Accessibility:
Responsive:
Build:

## Remaining UX Debt

List only factual unresolved issues.

Finish with:

PHASE 19 STATUS

UX audit completed: YES/NO
Information architecture redesigned: YES/NO
Design system implemented: YES/NO
App shell unified: YES/NO
Navigation simplified: YES/NO
Client/Brand context clarified: YES/NO
Reusable page patterns implemented: YES/NO
Tables standardized: YES/NO
Charts standardized: YES/NO
Forms standardized: YES/NO
Loading states standardized: YES/NO
Empty/error states improved: YES/NO
Integrations UX improved: YES/NO
Website/Puck Builder UX improved: YES/NO
Analytics UX improved: YES/NO
All primary modules migrated: YES/NO
Responsive UX verified: YES/NO
Accessibility verified: YES/NO
Reduced motion verified: YES/NO
Smooth animation system implemented: YES/NO
No excessive animation verified: YES/NO
Performance regression avoided: YES/NO
No synthetic metrics introduced: YES/NO
Existing backend/security behavior preserved: YES/NO
Ready for final client UX review: YES/NO
Ready for Phase 20: YES/NO

20_________________________________________

# LOCALBI — PHASE 20
## FINAL PRODUCT QA + REAL USER ACCEPTANCE TESTING
## END-TO-END WORKFLOW VALIDATION + UX FRICTION REMOVAL
## ROLE-BASED TESTING + RESPONSIVE QA + ACCESSIBILITY + PRODUCTION READINESS

Act as a Principal QA Architect, Staff Frontend Engineer,
Senior Product Designer, UAT Lead, Accessibility Specialist,
SaaS Product Manager, Security Test Engineer,
Multi-Tenant QA Engineer and Production Readiness Reviewer.

Phases 0–19 are assumed complete.

CURRENT LOCALBI PRODUCT INCLUDES:

- Tenant / Agency / Client / Brand / Store
- User / Role / Scope / RBAC
- RLS / Multi-tenant security
- WebSurface / Domains
- Dynamic LocalBi Website
- Puck Builder
- Product / Category / StoreProduct
- GA4
- GSC
- GBP
- Rank Tracking
- Competitors
- Merchant Center
- Attribution / Leads
- Calls
- Opportunities
- Content
- Listings
- Executive Reporting
- White-label / Agency
- Billing / Entitlements
- Platform Operations
- Controlled Production Rollout
- Enterprise UX/UI Design System

NOW IMPLEMENT PHASE 20 ONLY:

Role-Based Test Personas
        ↓
Critical Journey Inventory
        ↓
E2E Functional QA
        ↓
Real User Acceptance Tests
        ↓
UX Friction Capture
        ↓
Responsive / Accessibility QA
        ↓
Error / Empty / Recovery QA
        ↓
Security Regression
        ↓
Performance Validation
        ↓
Defect Prioritization
        ↓
Fix / Retest
        ↓
Final Production Sign-Off

DO NOT IMPLEMENT:

- new major features
- new architecture modules
- new backend domains
- large design redesign
- speculative optimizations
- unrelated refactors
- replacing libraries without a verified problem
- hiding known defects to pass UAT
- synthetic "everything passed" reporting
- accepting broken flows because APIs technically work

===========================================================
0. PRIMARY GOAL
===========================================================

The objective is NOT:

"Tests passed."

The objective is:

"A real person can successfully use LocalBi end-to-end
without confusion, broken states, security leaks,
or operational surprises."

Phase 20 must answer:

1. Can an agency onboard a client without developer help?
2. Can a client understand the dashboard?
3. Can a client connect Google correctly?
4. Can a user recover from expired integrations?
5. Can a user create and publish a website safely?
6. Can a user understand analytics and source provenance?
7. Can a user manage Products/Stores easily?
8. Can a Store manager operate with limited scope?
9. Can a content editor complete editorial workflow?
10. Can billing/admin users manage plans safely?
11. Does every major flow work on desktop/tablet/mobile?
12. Are errors actionable?
13. Are loading/empty states understandable?
14. Does role/security isolation still work after the UI redesign?
15. Are there any critical production blockers left?

Do NOT declare production readiness without evidence.

===========================================================
1. PRE-FLIGHT QA AUDIT
===========================================================

First audit current test infrastructure.

Inspect:

- Vitest/Jest
- React Testing Library
- Playwright/Cypress
- API tests
- integration tests
- RLS tests
- visual regression
- accessibility tests
- load/performance tests
- production smoke tests
- mock infrastructure
- test fixtures
- test DB
- provider stubs
- CI workflows

Search for:

test(
describe(
playwright
cypress
axe
accessibility
e2e
integration
smoke
visual
snapshot
fixture
mock
seed
uat

Produce:

PHASE 20 QA PRE-FLIGHT

Unit coverage:
Integration coverage:
E2E coverage:
Security coverage:
RLS coverage:
Accessibility coverage:
Responsive coverage:
Visual coverage:
Provider mocks:
Production smoke tests:
Known flaky tests:
Known untested flows:

Classify:

GOOD
PARTIAL
MISSING
FLAKY
REDUNDANT

===========================================================
2. DEFINE USER PERSONAS
===========================================================

Test the product using realistic personas.

At minimum:

PERSONA 1
Agency Owner

PERSONA 2
Agency Admin

PERSONA 3
Client Owner

PERSONA 4
Client Viewer

PERSONA 5
Store Manager

PERSONA 6
Content Editor

PERSONA 7
Product / Commerce Manager

PERSONA 8
Billing Admin

PERSONA 9
Platform Operator

Do not test only as super-admin.

===========================================================
3. PERSONA ACCESS MATRIX
===========================================================

Create an explicit matrix.

Example:

Feature             Agency Owner  Client Owner  Store Manager  Viewer
Clients             YES           NO            NO             NO
Brand               YES           YES           LIMITED        READ
Stores              YES           YES           OWN STORE      READ
Products            YES           YES           LIMITED        READ
GBP                 YES           YES           OWN STORE      READ
Leads               YES           YES           OWN STORE      READ
Calls               YES           YES           OWN STORE      READ
Billing             YES           DEPENDS       NO             NO

Use actual LocalBi permissions.

Do not infer permissions from UI visibility alone.

===========================================================
4. BUILD UAT DATASET
===========================================================

Create deterministic test accounts and data.

Example:

Agency:
LP Digital

Client 1:
Aalim Perfumes

Client 2:
Lakshmi Food

Brands:
Aalim Perfumes
Lakshmi Food

Stores:
Mannadi
T Nagar
Anna Nagar

Products:
enough to test pagination/filter/search

Integrations:
connected
not connected
expired
partial

Need test states for:

DATA
NO_DATA
NOT_CONNECTED
REAUTH_REQUIRED
STALE
ERROR
PARTIAL
SYNCING

Do not rely on only happy-state data.

===========================================================
5. UAT DATA SAFETY
===========================================================

Use dedicated staging/UAT environment.

Never run destructive UAT in real client production data.

If production smoke is needed:

use safe marked test data
or non-destructive checks only.

===========================================================
6. CRITICAL JOURNEY INVENTORY
===========================================================

Create complete journey list.

Each journey includes:

Persona
Goal
Starting point
Steps
Expected result
Failure scenarios
Permissions
Mobile requirement
Automation status

Prioritize:

P0
P1
P2

===========================================================
7. P0 DEFINITION
===========================================================

P0 flows are production blockers.

Examples:

Login
Tenant/client isolation
Google connection
Website publication
Lead submission
Billing state
Domain routing
Core reporting

Any P0 failure:

Production readiness = NO.

===========================================================
8. JOURNEY — LOGIN
===========================================================

Test:

valid login
invalid login
expired session
logout
session timeout
remembered route
custom portal domain

Verify:

correct Tenant context
correct redirect
safe errors

===========================================================
9. JOURNEY — AGENCY CLIENT CREATION
===========================================================

Agency Owner:

Create Client
→ Create Brand
→ Add Stores
→ Invite Client User

Verify:

no unnecessary steps
correct permissions
clear success state

===========================================================
10. JOURNEY — CLIENT INVITE
===========================================================

Test:

new user invite
existing user invite
expired invite
revoked invite
reused token

Verify:

correct client scope
role
redirect

===========================================================
11. JOURNEY — BRAND SETUP
===========================================================

Create/update:

name
logo
timezone
country
brand details

Verify:

validation
save state
unsaved changes
mobile form behavior

===========================================================
12. JOURNEY — STORE SETUP
===========================================================

Create Store:

Name
Address
Phone
Coordinates
Hours

Verify:

validation
Brand ownership
responsive layout
error handling

===========================================================
13. JOURNEY — MULTI-STORE MANAGEMENT
===========================================================

Test Brand with:

1 Store
10 Stores
100+ Stores

Verify:

search
pagination
filtering
context switching

===========================================================
14. JOURNEY — GOOGLE CONNECTION
===========================================================

Test full wizard:

Connect Google
→ Account
→ Resources
→ Review
→ Confirm

Verify:

Google Account
GA4
GSC
GBP

No accidental auto-mapping.

===========================================================
15. JOURNEY — GOOGLE RESOURCE MAPPING
===========================================================

Test:

one account
multiple properties
multiple GBP locations
ambiguous resources

Verify:

clear labels
correct hierarchy
no raw IDs as primary UX

===========================================================
16. JOURNEY — REAUTH
===========================================================

Simulate expired Google OAuth.

User sees:

Needs Reconnection

Flow:

Reconnect
→ Confirm resources
→ Sync resumes

Historical data remains.

===========================================================
17. JOURNEY — INTEGRATION ERROR
===========================================================

Simulate provider 500.

Verify:

existing data remains where safe
error is understandable
Retry available if appropriate
no fake zero metrics

===========================================================
18. JOURNEY — WEBSITE SETUP
===========================================================

Test:

Create LocalBi website
→ Domain
→ Template
→ Pages
→ Preview
→ Publish

A non-technical client should understand the flow.

===========================================================
19. JOURNEY — PUCK BUILDER
===========================================================

Test:

Open builder
Add component
Reorder
Select component
Edit props
Undo
Redo
Preview desktop/tablet/mobile
Save
Publish

Verify no hidden business-data duplication.

===========================================================
20. JOURNEY — BUILDER ERROR
===========================================================

Simulate:

save failure
publish failure
network failure

Draft must not be lost.

User must know status.

===========================================================
21. JOURNEY — WEBSITE PREVIEW
===========================================================

Verify:

draft visible only through secure preview
real theme
real data
noindex
correct responsive preview

===========================================================
22. JOURNEY — DOMAIN
===========================================================

Test:

add domain
duplicate domain
pending verification
verified
active
failed

Unknown domain must not resolve another Tenant.

===========================================================
23. JOURNEY — PRODUCT CREATION
===========================================================

Product Manager:

Create Product
→ Category
→ Price
→ Image
→ Save

Verify:

validation
errors
loading
success

===========================================================
24. JOURNEY — STOREPRODUCT
===========================================================

Assign Product to:

Mannadi
T Nagar

Set:

availability
price override

Verify effective price everywhere.

===========================================================
25. JOURNEY — BULK PRODUCT ASSIGNMENT
===========================================================

Select multiple Products
→ Assign Stores

Verify:

bulk UX
partial errors
loading
final state

===========================================================
26. JOURNEY — PRODUCT SEARCH/FILTER
===========================================================

Test:

large catalog
search
category
availability
Merchant state

Verify filters persist.

===========================================================
27. JOURNEY — MERCHANT
===========================================================

Test:

connect Merchant
map account
validate products
sync
view diagnostics

Verify:

Approved
Pending
Disapproved
Errors

No fake approval.

===========================================================
28. JOURNEY — ANALYTICS OVERVIEW
===========================================================

Client Owner:

Open Analytics.

Must understand:

Users
Sessions
Conversions
source
date range
trend

within seconds.

===========================================================
29. JOURNEY — DATE RANGE
===========================================================

Change:

7d
28d
30d
90d
custom

Verify:

all relevant cards/charts update consistently.

===========================================================
30. JOURNEY — SURFACE FILTER
===========================================================

Test:

LocalBi
Original
Compare

Default must remain LocalBi where product requires it.

No mixed data.

===========================================================
31. JOURNEY — GA4
===========================================================

Verify:

traffic
pages
acquisition
audience
events

data source clear.

===========================================================
32. JOURNEY — GSC
===========================================================

Verify:

queries
pages
clicks
impressions
CTR
position

Do not show local rank semantics.

===========================================================
33. JOURNEY — GBP
===========================================================

Test:

Overview
Profile
Reviews
Posts
Media
Performance

Verify:

Provider state
LocalBi state
sync state

clearly separated.

===========================================================
34. JOURNEY — REVIEWS
===========================================================

Test:

filters
reply state
pagination
error
empty

If reply supported:

provider confirmation required.

===========================================================
35. JOURNEY — RANK TRACKING
===========================================================

Test:

Add keyword
Assign Store
Create grid
Run scan
View results
View competitors
View history

===========================================================
36. JOURNEY — RANK GRID
===========================================================

User must understand:

color legend
position
not found
failed point
date/run

Do not confuse "-" with rank zero.

===========================================================
37. JOURNEY — OPPORTUNITY
===========================================================

Open Opportunity.

Verify user understands:

What
Why
Evidence
Source
Next Action

No unexplained score.

===========================================================
38. JOURNEY — OPPORTUNITY ACTION
===========================================================

Example:

Missing Content

Opportunity
→ Create Brief
→ Content Draft

Correct deep link and context preserved.

===========================================================
39. JOURNEY — LEAD
===========================================================

Test:

Lead form submission
Lead list
Lead detail
Status change

Verify:

source
Store
Page
PII permission

===========================================================
40. JOURNEY — CALL
===========================================================

Test:

real/provider-stub inbound call
Call table
Call detail
Lead link

Verify:

CALL_CLICK
real Call
GBP Call metric

remain separate.

===========================================================
41. JOURNEY — MISSED CALL
===========================================================

Verify:

MISSED state
notification/Lead behavior
no fake conversion

===========================================================
42. JOURNEY — CONTENT
===========================================================

Content Editor:

Opportunity
→ Brief
→ Draft
→ Edit
→ Review
→ Preview
→ Publish

No accidental auto-publish.

===========================================================
43. JOURNEY — CONTENT VERSIONING
===========================================================

Published v1.

Create v2 draft.

Verify:

public remains v1.

Publish v2.

Rollback v1.

===========================================================
44. JOURNEY — INTERNAL LINKS
===========================================================

Verify suggestions:

Product
Store
Category
Article

Editor can accept/reject.

===========================================================
45. JOURNEY — LISTINGS
===========================================================

Test:

directory discovery
match
mismatch
duplicate
manual action

Verify user understands:

LocalBi value
Provider value
Suggested change

===========================================================
46. JOURNEY — EXECUTIVE REPORT
===========================================================

Client Owner:

Open Overview/Executive report.

Must understand:

Website
Actions
GBP
Rank
Merchant
Content
Listings
Opportunities

without needing implementation knowledge.

===========================================================
47. JOURNEY — REPORT EXPORT
===========================================================

Test:

PDF
CSV

Verify:

correct filters
correct Brand
correct Store
correct date range
no cross-tenant data

===========================================================
48. JOURNEY — SCHEDULED REPORT
===========================================================

Create schedule.

Verify:

frequency
recipient
scope
preview
delivery
history

===========================================================
49. JOURNEY — WHITE LABEL
===========================================================

Agency:

configure logo
colors
portal name
custom domain

Verify:

login
dashboard
reports

No auth regression.

===========================================================
50. JOURNEY — USER MANAGEMENT
===========================================================

Invite
Role change
Scope change
Remove access

Verify immediate permission change.

===========================================================
51. JOURNEY — STORE-SCOPED USER
===========================================================

Store manager assigned:

Mannadi only.

Verify:

dashboard
leads
calls
reviews
rank

only Mannadi.

No hidden T Nagar data.

===========================================================
52. JOURNEY — BILLING
===========================================================

Billing Admin:

View Plan
View Usage
Upgrade
Cancel
View Invoices

Use provider sandbox.

No fake active status.

===========================================================
53. JOURNEY — LIMIT EXCEEDED
===========================================================

Hit:

keyword
Store
AI
report

quota.

Verify:

clear message
usage shown
upgrade CTA only if authorized

===========================================================
54. JOURNEY — PLATFORM OPS
===========================================================

Platform Operator:

open ops dashboard
view queue
view Tenant health
retry safe job

Verify platform access restricted.

===========================================================
55. NAVIGATION QA
===========================================================

Test every major module.

Verify:

sidebar active state
breadcrumb
page title
context
back behavior
browser history

No dead-end pages.

===========================================================
56. CONTEXT QA
===========================================================

Switch:

Client A
→ Client B

Brand A
→ Brand B

Store filter

Verify:

all data changes correctly.

No stale data flash.

===========================================================
57. GLOBAL UX LANGUAGE QA
===========================================================

Audit:

buttons
headings
tooltips
errors
badges
dialogs

Remove internal terms.

Example:

BAD:
ExternalResourceMapping missing.

GOOD:
This Store isn't connected to a Google Business Profile location.

===========================================================
58. LOADING QA
===========================================================

Simulate slow APIs.

Verify:

skeleton
no major layout shift
no blank page
no infinite spinner

===========================================================
59. STALE DATA QA
===========================================================

Existing data + failed refresh.

Verify:

data visible
stale indicator
error message
last success

===========================================================
60. EMPTY STATE QA
===========================================================

Test all major modules with zero data.

Empty state must explain:

what
why
next action

===========================================================
61. FILTERED EMPTY QA
===========================================================

Data exists.

Filter returns none.

Must show:

No results match current filters.

Not onboarding empty state.

===========================================================
62. ERROR QA
===========================================================

Test:

400
401
403
404
409
422
429
500
provider 500

Each should produce correct safe UX.

===========================================================
63. OFFLINE / NETWORK LOSS
===========================================================

Simulate network disconnect during:

form save
builder save
content edit
mapping

Verify:

no silent data loss
clear retry/recovery

===========================================================
64. DOUBLE-CLICK QA
===========================================================

Rapid-click:

Save
Publish
Invite
Run Rank
Submit form

Verify idempotency/disabled state.

No duplicate operations.

===========================================================
65. BACK BUTTON QA
===========================================================

Test list → detail → back.

Preserve:

filters
pagination
scroll

where designed.

===========================================================
66. UNSAVED CHANGE QA
===========================================================

Form modified.

Navigate away.

Verify appropriate warning.

Autosaved screens should not warn unnecessarily.

===========================================================
67. MODAL/DRAWER QA
===========================================================

Check:

focus
Escape
overlay
scroll lock
return focus
nested interaction

No inaccessible nested modal chains.

===========================================================
68. RESPONSIVE MATRIX
===========================================================

Test at minimum:

390
430
768
1024
1280
1440
1920

Critical pages:

Overview
Analytics
Stores
Products
Leads
Calls
Rank
Content
Integrations
Settings

===========================================================
69. MOBILE NAVIGATION
===========================================================

Verify:

sidebar drawer
context selector
filters
dialogs
tables

Core functionality usable.

===========================================================
70. MOBILE TABLE QA
===========================================================

Ensure important data remains accessible.

No impossible 2000px horizontal table for simple workflows.

===========================================================
71. BUILDER MOBILE POLICY
===========================================================

If full Puck editing is desktop-only:

show intentional UX:

"Website Builder works best on desktop."

Still allow:

preview
status
view live

if appropriate.

Do not render broken editor.

===========================================================
72. TABLET QA
===========================================================

Important for managers using tablets.

Verify:

filters
tables
charts
drawers

===========================================================
73. VISUAL QA
===========================================================

Audit all routes for:

alignment
spacing
font sizes
color usage
card styles
border radius
icon sizes
status badges

No old-design remnants.

===========================================================
74. LONG TEXT QA
===========================================================

Test long:

Client
Brand
Store
Product
Article

names.

No overflow/broken buttons.

===========================================================
75. INTERNATIONAL TEXT QA
===========================================================

Test:

Tamil
Hindi
Unicode
accented text

where supported.

No encoding issues.

===========================================================
76. NUMBER QA
===========================================================

Test:

0
1
999
1,000
999,999
1,000,000+

No card overflow.

===========================================================
77. DATE/TIME QA
===========================================================

Verify Tenant timezone.

No date shifts between:

dashboard
export
report
job history

===========================================================
78. CURRENCY QA
===========================================================

Verify:

INR
other supported currency

No hardcoded ₹ everywhere.

===========================================================
79. ACCESSIBILITY AUTOMATION
===========================================================

Run axe or current tooling.

Target representative screens:

Login
Overview
Form
Table
Dialog
Builder
Analytics
Content editor

===========================================================
80. KEYBOARD UAT
===========================================================

Complete core actions without mouse:

Navigation
Context switching
Forms
Tables
Dialogs
Menus
Filters

===========================================================
81. FOCUS QA
===========================================================

Check visible focus.

On error:

focus appropriate field/summary.

On modal close:

return focus.

===========================================================
82. SCREEN READER SEMANTICS
===========================================================

Check:

button names
form labels
headings
table headers
status text
dialogs

No unlabeled icon buttons.

===========================================================
83. COLOR CONTRAST
===========================================================

Audit:

text
muted text
badges
buttons
charts

Do not rely only on color.

===========================================================
84. REDUCED MOTION
===========================================================

Enable:

prefers-reduced-motion.

Verify:

page
chart
modal
drawer
micro-interactions

remain usable.

===========================================================
85. ANIMATION QA
===========================================================

Check:

no excessive animation
no layout jank
no delayed interaction
no repeated count animation
no motion on every filter

===========================================================
86. PERFORMANCE QA
===========================================================

Measure after Phase 19.

At minimum:

public page
Overview
Analytics
Product list
Rank page
Builder

Record:

bundle
LCP
INP
CLS
API latency

Compare with Phase 17/19 baseline.

===========================================================
87. SLOW DEVICE QA
===========================================================

Simulate throttled CPU/network.

Verify:

navigation still understandable
loading states appropriate
interactions not frozen

===========================================================
88. MEMORY QA
===========================================================

Navigate repeatedly:

Analytics
Rank
Builder
Content

Look for unbounded browser memory growth.

===========================================================
89. LARGE DATA QA
===========================================================

Test:

1,000 Stores
100k Products
thousands of Leads
large call list
large keyword list

UI must use pagination/server search.

===========================================================
90. SECURITY REGRESSION — TENANT
===========================================================

Tenant A attempts direct URLs/API to Tenant B.

Expected:

denied/fail closed.

===========================================================
91. SECURITY REGRESSION — CLIENT
===========================================================

Same Agency.

Client A cannot access Client B.

===========================================================
92. SECURITY REGRESSION — STORE
===========================================================

Store Manager A cannot access Store B.

===========================================================
93. SECURITY REGRESSION — UI
===========================================================

Hidden button is NOT security.

Call API directly.

Verify server denial.

===========================================================
94. RLS QA
===========================================================

Run all RLS tests after UX/API refactors.

No regression.

===========================================================
95. CUSTOM DOMAIN AUTH QA
===========================================================

White-label domain:

login
logout
session
redirect

Verify no cross-domain cookie issue.

===========================================================
96. DOMAIN ROUTING QA
===========================================================

Unknown host:

must not render another Tenant.

===========================================================
97. CSRF QA
===========================================================

Test authenticated mutations according to current auth architecture.

===========================================================
98. XSS QA
===========================================================

Test inputs:

Brand
Product
Content
Lead
Review reply
Listing fields

No script execution.

===========================================================
99. FILE UPLOAD QA
===========================================================

Test:

invalid type
oversized file
malformed image
wrong tenant asset

===========================================================
100. SSRF QA
===========================================================

Server URL import/validation attempts private IP.

Must block.

===========================================================
101. OPEN REDIRECT QA
===========================================================

Test redirect parameters.

External unapproved domains rejected.

===========================================================
102. PROVIDER FAILURE QA
===========================================================

Use provider stubs.

Test:

GA4
GSC
GBP
Rank
Merchant
Telephony
Billing
Listings

Scenarios:

429
500
timeout
invalid auth

===========================================================
103. CACHE ISOLATION QA
===========================================================

Rapid switch between Tenants/Brands.

No stale cross-context data.

===========================================================
104. QUERY INVALIDATION QA
===========================================================

Update:

Product
Store
Mapping
Integration
Opportunity

Correct screens refresh.

Unrelated screens do not unnecessarily refetch everything.

===========================================================
105. NOTIFICATION QA
===========================================================

Test:

new issue
reauth
missed call
report
billing

Verify:

deduplication
read state
deep link

===========================================================
106. TOAST QA
===========================================================

No toast spam.

Important operations also reflect persistent page state.

===========================================================
107. COPY REVIEW
===========================================================

Review every primary flow.

Fix:

typos
developer wording
ambiguous labels
inconsistent capitalization
unnecessary jargon

===========================================================
108. BUTTON COPY
===========================================================

Prefer:

Save Changes
Connect Google
Publish Website
Retry Sync
Invite User

Avoid vague:

Submit
Proceed
Execute

unless context clear.

===========================================================
109. DESTRUCTIVE ACTION QA
===========================================================

Test:

Archive Brand
Delete Product
Disconnect Google
Release Number
Cancel Subscription

Confirm consequences accurately described.

===========================================================
110. UAT SESSION PROCESS
===========================================================

For real user tests:

do NOT instruct every click.

Give goal.

Example:

"Connect this Brand to its Google Business Profile and Analytics."

Observe:

where user hesitates
where user chooses wrong action
where user asks questions
where user backtracks

Record friction.

===========================================================
111. UAT PARTICIPANT TYPES
===========================================================

Ideally test with:

non-technical business owner
agency operator
marketing analyst
store manager
content user
developer/admin

Do not use only developers who already understand architecture.

===========================================================
112. UAT OBSERVATION MODEL
===========================================================

For each task record:

Completed:
YES/NO

Time:
actual

Errors:
count

Assistance required:
YES/NO

Misclicks:
count

Confusion points:
text

Participant feedback:
text

===========================================================
113. DO NOT USE USER OPINION ALONE
===========================================================

Combine:

what user says
+
what user actually does.

Example:

User says:
"Looks fine."

but needs 8 minutes to find Integrations.

That is UX friction.

===========================================================
114. FRICTION CLASSIFICATION
===========================================================

Classify:

NAVIGATION
TERMINOLOGY
INFORMATION_OVERLOAD
MISSING_FEEDBACK
ERROR_RECOVERY
FORM_COMPLEXITY
PERMISSION_CONFUSION
DATA_INTERPRETATION
RESPONSIVE
PERFORMANCE
ACCESSIBILITY

===========================================================
115. FRICTION SEVERITY
===========================================================

Use:

BLOCKER
HIGH
MEDIUM
LOW

BLOCKER:
cannot complete critical goal.

HIGH:
can complete only with help / serious confusion.

MEDIUM:
avoidable friction.

LOW:
polish.

===========================================================
116. UX FIX RULE
===========================================================

Do not redesign entire page because of one test failure.

Fix smallest root cause.

Example:

Problem:
Users cannot find integration recovery.

Possible fix:
action banner with Reconnect CTA.

Not:
redesign whole analytics section.

===========================================================
117. DEFECT MODEL
===========================================================

Each issue should include:

ID
Title
Module
Persona
Severity
Reproduction
Expected
Actual
Evidence
Root cause if known
Fix
Retest

===========================================================
118. BUG PRIORITY
===========================================================

P0:
Security/data loss/core workflow blocked

P1:
Major functionality broken

P2:
Functional/UX problem with workaround

P3:
Polish

No production sign-off with open P0.

===========================================================
119. REGRESSION POLICY
===========================================================

Every P0/P1 fix:

must add automated regression test where practical.

Do not repeatedly fix same class manually.

===========================================================
120. NO BUG HIDING
===========================================================

Do not:

disable failing test
change assertion to pass
hide error UI
remove feature

solely to get green QA.

Fix root cause or document explicit deferment.

===========================================================
121. FLAKY TEST POLICY
===========================================================

Identify flaky tests.

Fix:

timing
state
fixture
network mocking

Do not add arbitrary sleep(5000).

===========================================================
122. PROVIDER TEST STRATEGY
===========================================================

Use:

local deterministic stubs
provider sandbox
limited real-provider smoke

Do not run destructive real-provider E2E on every CI run.

===========================================================
123. VISUAL REGRESSION
===========================================================

Capture representative screens:

Login
Overview
Analytics
Products
Rank
Integrations
Builder
Content
Billing

Compare after fixes.

===========================================================
124. VISUAL DIFF REVIEW
===========================================================

Do not auto-accept snapshots after UI changes.

Review intended vs accidental changes.

===========================================================
125. BROWSER MATRIX
===========================================================

Test current supported browsers.

At minimum:

Chrome
Edge
Safari where product requires it
Firefox where product policy requires it

Do not claim browser support without testing.

===========================================================
126. DEVICE MATRIX
===========================================================

At minimum:

Desktop Windows
Desktop macOS if available
iPhone-sized viewport
Android-sized viewport
Tablet

Can use browser simulation plus real-device spot checks.

===========================================================
127. PRODUCTION SMOKE TEST
===========================================================

After staging sign-off:

run safe production smoke.

Checks:

Login
Domain
Overview
Store
Product
Public website
Form endpoint
Report
Health

No destructive actions.

===========================================================
128. PRODUCTION SMOKE MARKING
===========================================================

Any test event/Lead:

mark/exclude clearly.

Do not contaminate real metrics.

===========================================================
129. FINAL DATA INTEGRITY CHECK
===========================================================

Verify:

counts
mappings
ownership

for pilot clients.

Examples:

Stores
Products
Users
Domains
GBP locations
Pages

No unexplained mismatch.

===========================================================
130. FINAL SECURITY CHECK
===========================================================

Must pass:

RLS
Tenant isolation
Client isolation
Store scope
Invite security
Custom domain security
Webhook signature
Billing scope
Platform admin isolation

===========================================================
131. FINAL BILLING CHECK
===========================================================

Sandbox/test Tenant:

checkout
subscription
usage
invoice
cancel

Verify no production accidental billing.

===========================================================
132. FINAL DOMAIN CHECK
===========================================================

Verify:

HTTPS
canonical
robots
sitemap
redirects
unknown host behavior

===========================================================
133. FINAL SEO CHECK
===========================================================

For public LocalBi website:

title
description
canonical
robots
structured data
sitemap
breadcrumbs

No accidental:

noindex
duplicate canonical
localhost URL

===========================================================
134. FINAL ANALYTICS CHECK
===========================================================

Verify:

GA4
GSC
LocalBi tracking

No duplicate page events.

No hardcoded property IDs.

===========================================================
135. FINAL PERFORMANCE CHECK
===========================================================

Compare against approved thresholds.

Do not regress materially from Phase 17 baseline without documented reason.

===========================================================
136. FINAL DESIGN SYSTEM CHECK
===========================================================

No major screen should still use:

legacy button
legacy table
random card
random status color
old spacing/layout

unless documented exception.

===========================================================
137. FINAL UX REVIEW
===========================================================

Every page must clearly answer:

Where am I?
What am I looking at?
What is the status?
What can I do?
What should I do next?

===========================================================
138. PRODUCT HELP QA
===========================================================

Tooltips/help text should explain complex concepts.

Avoid excessive documentation links for basic tasks.

===========================================================
139. DATA PROVENANCE QA
===========================================================

Verify source labels:

GA4
GSC
GBP
LocalBi
Merchant
Telephony
Rank

No misleading combined source.

===========================================================
140. PRODUCTION READINESS MATRIX
===========================================================

Create final matrix:

Security
PASS/FAIL

Data Integrity
PASS/FAIL

Core Workflows
PASS/FAIL

Integrations
PASS/FAIL

Website
PASS/FAIL

Analytics
PASS/FAIL

Leads/Calls
PASS/FAIL

Billing
PASS/FAIL

UX
PASS/FAIL

Accessibility
PASS/FAIL

Responsive
PASS/FAIL

Performance
PASS/FAIL

Operations
PASS/FAIL

===========================================================
141. EXIT CRITERIA
===========================================================

Production-ready requires:

ZERO open P0 bugs.

ZERO known cross-tenant/client isolation bugs.

ZERO known data-loss bugs.

ZERO broken payment-security flows.

ZERO known domain-routing leaks.

P1 issues:

must either be fixed
or explicitly reviewed/accepted with documented mitigation.

===========================================================
142. DEFERRED ISSUE RULE
===========================================================

Every deferred issue needs:

severity
reason
workaround
risk
owner
target phase/release

Do not use:

"fix later"

without context.

===========================================================
143. FINAL UAT SIGN-OFF
===========================================================

Record acceptance for:

Product
Engineering
QA
Security
Operations
Pilot/Client representative

Only roles actually involved need formal sign-off.

===========================================================
144. FINAL REPORT
===========================================================

Return:

# PHASE 20 FINAL PRODUCT QA & UAT REPORT

## Environment

App release:
DB migration:
Environment:
Browsers:
Devices:

## QA Coverage

Unit:
Integration:
E2E:
Security:
RLS:
Accessibility:
Responsive:
Visual:
Performance:

## UAT Personas

Agency Owner:
Agency Admin:
Client Owner:
Client Viewer:
Store Manager:
Content Editor:
Product Manager:
Billing Admin:
Platform Operator:

## Critical Journeys

Login:
Client onboarding:
Brand/Store setup:
Google setup:
Website:
Builder:
Products:
Analytics:
GBP:
Rank:
Merchant:
Leads:
Calls:
Opportunities:
Content:
Listings:
Reports:
White-label:
Users:
Billing:
Operations:

For each:

PASS/FAIL
friction
issues
fixes

## UX Findings

Navigation:
Terminology:
Information hierarchy:
Forms:
Filters:
Empty states:
Errors:
Loading:
Feedback:
Mobile:

## Accessibility

Keyboard:
Focus:
Contrast:
Dialogs:
Forms:
Charts:
Screen-reader semantics:
Reduced motion:

## Responsive

390:
430:
768:
1024:
1440:
1920:

## Security Regression

Tenant isolation:
Client isolation:
Store isolation:
RLS:
Custom domain:
Webhook:
Billing:
Platform admin:

## Integration Failure Testing

GA4:
GSC:
GBP:
Rank:
Merchant:
Telephony:
Listings:
Billing:

## Performance

Public website:
Dashboard:
Analytics:
Rank:
Builder:

Bundle:
LCP:
INP:
CLS:
API p95:

## Defects

P0:
P1:
P2:
P3:

Fixed:
Open:
Deferred:

## User Testing

Participants:
Tasks:
Completion:
Assistance required:
Main friction:
Changes made:

Do not include fake participant results if no actual users participated.

If real UAT has not occurred:

state:

REAL USER UAT PENDING

and do NOT mark final client acceptance complete.

## Production Smoke

Login:
Domains:
Public website:
Forms:
Reports:
Health:

## Readiness Matrix

Security:
Data:
Workflows:
Integrations:
UX:
Accessibility:
Responsive:
Performance:
Operations:
Billing:

## Remaining Risks

Only factual unresolved risks.

## Final Recommendation

Use one of:

READY FOR PRODUCTION
READY WITH DOCUMENTED NON-BLOCKING ISSUES
NOT READY — BLOCKERS REMAIN

Only based on evidence.

Finish with:

PHASE 20 STATUS

Pre-flight QA audit completed: YES/NO
Role-based UAT completed: YES/NO
Critical workflows verified: YES/NO
Agency journey verified: YES/NO
Client-owner journey verified: YES/NO
Store-manager journey verified: YES/NO
Content journey verified: YES/NO
Product/commerce journey verified: YES/NO
Billing journey verified: YES/NO
Integration recovery verified: YES/NO
Responsive QA completed: YES/NO
Accessibility QA completed: YES/NO
Reduced-motion QA completed: YES/NO
Visual consistency verified: YES/NO
Security regression passed: YES/NO
RLS regression passed: YES/NO
Cross-client isolation passed: YES/NO
Store scope isolation passed: YES/NO
Custom-domain auth verified: YES/NO
Provider failure states verified: YES/NO
Performance thresholds passed: YES/NO
Production smoke passed: YES/NO
Open P0 defects: <NUMBER>
Open P1 defects: <NUMBER>
Real user UAT completed: YES/NO
Real client acceptance completed: YES/NO
Production readiness: READY/CONDITIONAL/NOT_READY