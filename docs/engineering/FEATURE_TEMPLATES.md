# FEATURE_TEMPLATES.md

> Version: 2.0
> Project: XPawSure
> Purpose: Standardized templates for implementing new features.
> Applies To: Backend, Frontend, Mobile, AI

---

# 1. Purpose

This document defines the standard implementation templates used throughout XPawSure.

Every new feature should follow these templates unless there is a documented reason not to.

These templates ensure:

- Consistency
- Maintainability
- Scalability
- Predictable project structure

AI coding assistants should use these templates whenever generating new features.

---

# 2. New Backend Module Template

Every backend module follows the same structure.

```
apps/

appointments/

├── migrations/
├── __init__.py
├── admin.py
├── apps.py
├── models.py
├── serializers.py
├── services.py
├── permissions.py
├── views.py
├── urls.py
├── filters.py
├── validators.py
├── signals.py
├── tasks.py
└── tests.py
```

Optional files may be omitted if they are not required.

---

# 3. Standard Django Model

```python
class Pet(BaseModel):
    owner = models.ForeignKey(...)
    name = models.CharField(...)
    breed = models.CharField(...)
    sex = models.CharField(...)
    birth_date = models.DateField(...)
```

Models should contain:

- Fields
- Relationships
- Simple helper methods

Never place business workflows inside models.

---

# 4. Standard Serializer

```python
class PetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pet
        fields = "__all__"
```

Serializer responsibilities:

- Validation
- Serialization
- Deserialization

Avoid business logic.

---

# 5. Standard Service

```python
class PetService:

    @staticmethod
    def create_pet(data):
        ...
```

Services handle:

- Business rules
- Transactions
- Complex workflows
- Cross-module operations

Services should not generate HTTP responses.

---

# 6. Standard Permission

```python
class IsVeterinarian(BasePermission):

    def has_permission(...):
        ...
```

Every feature should explicitly define permissions.

Never rely on frontend authorization.

---

# 7. Standard ViewSet

```python
class PetViewSet(ModelViewSet):

    queryset = ...
    serializer_class = ...
```

Views should:

Authenticate

↓

Authorize

↓

Validate

↓

Call Service

↓

Return Response

Nothing more.

---

# 8. Standard URL Registration

```python
router.register(
    "pets",
    PetViewSet,
    basename="pets"
)
```

Keep routing centralized and RESTful.

---

# 9. Backend Testing Template

Every module includes:

```
tests/

test_models.py

test_services.py

test_permissions.py

test_views.py

test_api.py
```

Tests should mirror the module structure.

---

# 10. React Feature Template

```
features/

pets/

├── api/
├── components/
├── hooks/
├── pages/
├── schemas/
├── types/
├── utils/
├── index.ts
```

Feature folders encapsulate all related code.

---

# 11. React Page Template

```
PetListPage

↓

Page Layout

↓

Toolbar

↓

Filters

↓

Table

↓

Pagination
```

Pages orchestrate components.

Business logic belongs in hooks.

---

# 12. React Component Template

```tsx
interface PetCardProps {
  pet: Pet;
}

export function PetCard({ pet }: PetCardProps) {
  return (...)
}
```

Components should:

- Receive props
- Render UI
- Emit events

Avoid API calls inside components.

---

# 13. React Hook Template

```tsx
export function usePets() {
    return useQuery(...)
}
```

Hooks manage:

- API interaction
- State
- Derived values

Keep hooks reusable.

---

# 14. API Service Template

```ts
export const petService = {

    getAll(),

    create(),

    update(),

    remove()
}
```

All API communication belongs here.

---

# 15. Zod Schema Template

```ts
export const PetSchema = z.object({

    name: z.string(),

    breed: z.string()
})
```

Validation schemas should be shared where practical.

---

# 16. Mobile Feature Template

```
features/

screening/

├── components/
├── hooks/
├── services/
├── screens/
├── types/
└── utils/
```

Maintain parity with frontend organization where appropriate.

---

# 17. Mobile Screen Template

```
Screen

↓

Header

↓

Content

↓

Actions

↓

Footer
```

Keep screens focused on presentation.

---

# 18. TensorFlow Lite Service Template

```ts
loadModel()

↓

preprocess()

↓

runInference()

↓

postprocess()

↓

returnPrediction()
```

Encapsulate all inference logic in a dedicated service.

---

# 19. API Response Template

Successful response

```json
{
  "success": true,
  "message": "Pet created successfully.",
  "data": {}
}
```

Error response

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {}
}
```

Maintain this format across all endpoints.

---

# 20. Feature Folder Checklist

Each feature should contain:

Backend

☐ Model

☐ Serializer

☐ Service

☐ Permission

☐ ViewSet

☐ Tests

Frontend

☐ API

☐ Components

☐ Hooks

☐ Pages

☐ Types

☐ Validation

Mobile (if applicable)

☐ Screen

☐ Hooks

☐ Services

☐ AI Integration

---

# 21. Naming Conventions

Backend

```
PetService

PetSerializer

PetViewSet

PetPermission
```

Frontend

```
PetCard

PetTable

usePets

petService
```

Mobile

```
ScreeningScreen

useScreening

screeningService
```

Use consistent naming throughout the project.

---

# 22. Rules for AI Coding Assistants

When creating a new feature:

- Use the templates defined in this document.
- Follow the standard folder structure.
- Do not invent new architectural patterns.
- Prefer extending existing templates over creating custom implementations.
- Keep generated code consistent with previous modules.
- If a template does not fit the use case, explain why before deviating from it.