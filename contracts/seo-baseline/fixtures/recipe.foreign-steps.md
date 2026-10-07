---
rune: recipe
title: A steps block the author nested in a recipe tip
role: edge-case
notes: >
  SPEC-146 Problem 1 / WORK-609. `recipe`'s schema row names its children
  `step`, which is also a rune name (`{% steps %}` emits `data-rune="step"`).
  Before WORK-609 `findChildren` reached through the author's `{% steps %}`
  block inside the tip and published each of its steps as one of the recipe's
  `recipeInstructions`, readable text included. The recipe's instructions are
  its own ordered list, and nothing else.
---
{% recipe prepTime="PT15M" cookTime="PT30M" servings=4 %}
# Classic Pasta Carbonara

A rich and creamy Italian pasta dish.

- 400g spaghetti
- 200g pancetta

1. Cook pasta in salted boiling water until al dente
2. Toss hot pasta with pancetta, then stir in egg mixture off the heat

> Before you start:
>
> {% steps %}
> 1. Clear the bench
> 2. Wash up as you go
> {% /steps %}
{% /recipe %}
