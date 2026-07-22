# 🚀 Performance First Development Guide

## Purpose

Every feature, component, screen, endpoint, query, or service MUST be evaluated for performance before implementation.

The AI should always choose the fastest, cleanest, and most scalable approach instead of simply making the feature work.

---

# Golden Rule

> Never sacrifice performance for convenience.

Every implementation should minimize:

- CPU usage
- Memory usage
- Network requests
- Rendering time
- Database queries
- Bundle size
- API response time

---

# Before Writing Code

Always ask yourself:

- Can this be done with fewer database queries?
- Can this avoid unnecessary API calls?
- Can this component avoid unnecessary rerenders?
- Can this data be cached?
- Can this operation run asynchronously?
- Can this be lazy loaded?
- Can this be paginated?
- Can this use indexes?
- Can this reduce memory allocation?
- Can this execute on the server instead of the client?
- Is this scalable to 100,000+ records?

Never start coding until these questions are considered.

---

# API Performance

## Never

❌ Return unnecessary fields

❌ Return entire objects when only IDs are needed

❌ Create N+1 queries

❌ Perform repeated database lookups

❌ Send duplicate data

---

## Always

✅ Pagination

✅ Filtering

✅ Sorting on database

✅ Select only required columns

✅ Proper indexing

✅ Bulk inserts

✅ Bulk updates

✅ Bulk deletes

✅ Connection pooling

✅ Compress responses

---

Example

Bad

GET /users

Returns

- profile
- settings
- address
- permissions
- notifications
- history
- logs

Good

GET /users?page=1&limit=20

Returns only

- id
- name
- avatar

---

# Database Rules

Always optimize queries.

Never write code that loops over database queries.

Bad

```
for user in users:
    load orders
```

Good

```
JOIN
Prefetch
Select Related
```

Always use

- indexes
- foreign keys
- constraints

Avoid

- SELECT *
- full table scans
- nested queries

---

# Mobile Performance

Every screen should load as quickly as possible.

## Rules

Only request data needed.

Lazy load images.

Cache API responses.

Use FlatList instead of ScrollView for long lists.

Memoize expensive calculations.

Avoid unnecessary state.

Avoid unnecessary renders.

Split large components.

Use optimized image formats.

Prefetch important assets.

Avoid large JSON payloads.

Never block the UI thread.

---

# React Performance

Always

React.memo

useMemo

useCallback

Lazy Loading

Dynamic Import

Code Splitting

Virtualized Lists

Suspense

Skeleton Loaders

Never

Unnecessary Context updates

Large state objects

Heavy computations inside render

Anonymous functions inside large lists

Repeated API calls

---

# Backend Performance

Always

Background jobs

Queues

Caching

Database indexes

Connection pooling

Pagination

Batch processing

Rate limiting

Compression

Streaming for large files

Never

Long blocking requests

Repeated queries

Duplicate processing

Heavy work inside request handlers

---

# AI Performance Checklist

Before generating code verify:

## Database

- Efficient query
- Indexed
- No N+1
- Pagination
- Filtering

## Backend

- Cached
- Async
- Small payload
- Error handled

## API

- RESTful
- Minimal response
- Pagination
- Compression

## Frontend

- Memoized
- Lazy loaded
- Cached
- Optimized rendering

## Mobile

- Smooth scrolling
- Lazy images
- Minimal rerenders
- Fast startup

---

# Rendering Rules

Never rerender an entire page because one small value changes.

Prefer

Local state

Memoization

Context splitting

Selectors

Instead of

Global rerenders

---

# Image Optimization

Always

WebP

AVIF

Lazy loading

Responsive sizes

Compression

Caching

CDN

Never

Upload 10MB images

Full-resolution thumbnails

Duplicate downloads

---

# Network Rules

Reduce requests.

Batch requests.

Cache requests.

Retry intelligently.

Cancel stale requests.

Debounce search.

Throttle rapid actions.

Avoid polling when WebSockets or Server-Sent Events are more appropriate.

---

# Caching Strategy

Cache

Images

User profile

Settings

Permissions

Frequently requested lists

Configuration

Use

Memory Cache

Redis

HTTP Cache

CDN

Browser Cache

Offline Storage

---

# Loading UX

Every loading state should improve perceived performance.

Always use

Skeletons

Optimistic UI

Progress indicators

Infinite scrolling

Progressive rendering

Never

Blank white screens

Blocking loaders for every action

---

# Search Optimization

Debounce search

Server-side filtering

Indexed search

Pagination

Limit results

Never load every record first.

---

# Logging

Production

Minimal logs

Development

Detailed logs

Never spam console logs in production.

---

# Security Without Sacrificing Performance

Validate input.

Sanitize data.

Authenticate efficiently.

Cache permissions.

Use JWT/session validation wisely.

Avoid unnecessary encryption work inside loops.

---

# Scalability

Assume the application will eventually support

- 100,000+ users
- Millions of records
- Thousands of concurrent requests

Write code that scales.

---

# AI Self Review

Before finishing implementation, verify:

✓ No unnecessary rerenders

✓ No unnecessary queries

✓ Minimal API payload

✓ Cached where appropriate

✓ Lazy loaded where appropriate

✓ Proper indexes

✓ Optimized loops

✓ Optimized algorithms

✓ Responsive UI

✓ Fast initial load

✓ Memory efficient

✓ Readable code

✓ Maintainable architecture

If any item fails, improve the implementation before returning code.

---

# Final Principle

> Working code is not enough.

Every implementation should strive to be:

- Fast
- Efficient
- Scalable
- Maintainable
- Clean
- Secure
- Production-ready

Performance is a requirement, not an afterthought.