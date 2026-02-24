/**
 * Minimal Phase 1 editor UI — a single HTML page that:
 * - Shows the content tree as a sidebar
 * - Loads preview pages in an iframe
 * - Allows clicking pages to navigate
 *
 * This will be replaced by a full SvelteKit app in Phase 2.
 */
export function getEditorHtml(port: number): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>refrakt editor</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #0f1117;
      color: #e2e8f0;
    }
    header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: #161822;
      border-bottom: 1px solid #2a2d3a;
      flex-shrink: 0;
    }
    header h1 {
      font-size: 0.875rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: #94a3b8;
    }
    header h1 span { color: #818cf8; }
    .current-file {
      font-size: 0.8rem;
      color: #64748b;
      margin-left: auto;
    }
    main {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .sidebar {
      width: 260px;
      min-width: 200px;
      background: #161822;
      border-right: 1px solid #2a2d3a;
      overflow-y: auto;
      padding: 0.5rem 0;
    }
    .tree-item {
      padding: 0.35rem 0.75rem 0.35rem calc(0.75rem + var(--depth, 0) * 1rem);
      cursor: pointer;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: background 0.1s;
    }
    .tree-item:hover { background: #1e2030; }
    .tree-item.active { background: #2a2d3a; color: #818cf8; }
    .tree-item.layout { color: #f59e0b; font-style: italic; }
    .tree-item.draft { opacity: 0.5; }
    .tree-dir {
      padding: 0.35rem 0.75rem 0.35rem calc(0.75rem + var(--depth, 0) * 1rem);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-top: 0.5rem;
    }
    .preview-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .preview-pane iframe {
      flex: 1;
      border: none;
      background: #ffffff;
    }
    .empty-state {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #475569;
      font-size: 0.9rem;
    }
    .loading { color: #64748b; padding: 1rem; font-size: 0.8rem; }
  </style>
</head>
<body>
  <header>
    <h1><span>refrakt</span> editor</h1>
    <span class="current-file" id="current-file"></span>
  </header>
  <main>
    <nav class="sidebar" id="sidebar">
      <div class="loading">Loading content tree...</div>
    </nav>
    <div class="preview-pane" id="preview">
      <div class="empty-state">Select a page to preview</div>
    </div>
  </main>

  <script>
    const BASE = 'http://localhost:${port}';
    let activeFile = null;

    async function loadTree() {
      const res = await fetch(BASE + '/api/tree');
      const tree = await res.json();
      const sidebar = document.getElementById('sidebar');
      sidebar.innerHTML = '';
      renderTree(tree, sidebar, 0);
    }

    function renderTree(node, parent, depth) {
      if (node.type === 'directory') {
        if (depth > 0) {
          const dirEl = document.createElement('div');
          dirEl.className = 'tree-dir';
          dirEl.style.setProperty('--depth', depth - 1);
          dirEl.textContent = node.name;
          parent.appendChild(dirEl);
        }

        if (node.layout) {
          renderFileItem(node.layout, parent, depth);
        }

        for (const child of node.children || []) {
          if (child.type === 'page' || child.type === 'layout') {
            renderFileItem(child, parent, depth);
          } else {
            renderTree(child, parent, depth + 1);
          }
        }
      }
    }

    function renderFileItem(item, parent, depth) {
      const el = document.createElement('div');
      el.className = 'tree-item';
      if (item.type === 'layout') el.classList.add('layout');
      if (item.draft) el.classList.add('draft');
      el.style.setProperty('--depth', depth);
      el.textContent = item.name;
      el.addEventListener('click', () => openFile(item.path, el));
      parent.appendChild(el);
    }

    function openFile(filePath, el) {
      // Update active state
      document.querySelectorAll('.tree-item.active').forEach(e => e.classList.remove('active'));
      el.classList.add('active');
      activeFile = filePath;

      document.getElementById('current-file').textContent = filePath;

      const preview = document.getElementById('preview');
      preview.innerHTML = '<iframe src="' + BASE + '/api/preview/' + encodeURIComponent(filePath) + '"></iframe>';
    }

    loadTree();
  </script>
</body>
</html>`;
}
