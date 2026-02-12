---
title: Recipe
description: Structured recipe with ingredients, steps, and chef tips
---

# Recipe

Structured recipe content. Unordered lists become ingredients, ordered lists become steps, and blockquotes become chef's tips.

## Basic usage

A complete recipe with ingredients, instructions, and a tip.

```markdoc
{% recipe prepTime="PT15M" cookTime="PT30M" servings=4 difficulty="easy" %}
# Classic Pasta Carbonara

A rich and creamy Italian pasta dish.

- 400g spaghetti
- 200g pancetta
- 4 egg yolks
- 100g Pecorino Romano
- Black pepper to taste

1. Cook pasta in salted boiling water until al dente
2. Fry pancetta in a large pan until crispy
3. Whisk egg yolks with grated cheese and pepper
4. Toss hot pasta with pancetta, then stir in egg mixture off the heat

> The residual heat from the pasta cooks the eggs — never add eggs directly to a hot pan or they will scramble.
{% /recipe %}
```

{% recipe prepTime="PT15M" cookTime="PT30M" servings=4 difficulty="easy" %}
# Classic Pasta Carbonara

A rich and creamy Italian pasta dish.

- 400g spaghetti
- 200g pancetta
- 4 egg yolks
- 100g Pecorino Romano
- Black pepper to taste

1. Cook pasta in salted boiling water until al dente
2. Fry pancetta in a large pan until crispy
3. Whisk egg yolks with grated cheese and pepper
4. Toss hot pasta with pancetta, then stir in egg mixture off the heat

> The residual heat from the pasta cooks the eggs — never add eggs directly to a hot pan or they will scramble.
{% /recipe %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `prepTime` | `string` | — | Prep time in ISO 8601 duration (e.g. "PT15M") |
| `cookTime` | `string` | — | Cook time in ISO 8601 duration |
| `servings` | `number` | — | Number of servings |
| `difficulty` | `string` | `medium` | Difficulty level: `easy`, `medium`, or `hard` |
