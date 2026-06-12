---
rune: form
---

{% form action="/api/contact" method="POST" success="Thanks! We'll be in touch." %}
# Contact Us

- Name (required)
- Email (required, placeholder: "you@example.com")
- Company (optional)

> What are you interested in?
- Product demo
- Partnership
- Support
- Other

- Message (required)

**Send Message**
{% /form %}
