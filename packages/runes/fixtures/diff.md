---
rune: diff
---

{% diff mode="unified" language="javascript" %}
```javascript
function getData() {
  return fetch('/api')
    .then(res => res.json())
    .then(data => data);
}
```

```javascript
async function getData() {
  const res = await fetch('/api');
  return res.json();
}
```
{% /diff %}
