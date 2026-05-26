{% card href=$item.url %}
---
{% $item.id %}

#### {% $item.data.title %}
---
Status: {% $item.data.status %} · Severity: {% $item.data.severity %}
{% /card %}
