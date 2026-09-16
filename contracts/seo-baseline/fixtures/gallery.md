---
rune: gallery
title: Image gallery
role: canonical
notes: >
  Group A, resolved — no longer emits ImageGallery. The six images are
  plain markdown pictures with nothing naming them;
  `image`/`associatedMedia` needs each one typed as an ImageObject, which
  is a retype-and-wrap job rather than a flat mapping (WORK-567).
---
{% gallery %}
![Mountain sunrise](https://picsum.photos/seed/sunrise/600/400)
![Forest path](https://picsum.photos/seed/forest/600/400)
![Ocean waves](https://picsum.photos/seed/ocean/600/400)
{% /gallery %}
