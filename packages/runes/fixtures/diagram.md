---
rune: diagram
---

{% diagram language="mermaid" title="User Flow" %}
```mermaid
graph TD
  A[Visit Site] --> B{Logged In?}
  B -->|Yes| C[Dashboard]
  B -->|No| D[Login Page]
  D --> E[Sign Up]
  D --> F[Sign In]
  F --> C
  E --> C
```
{% /diagram %}
