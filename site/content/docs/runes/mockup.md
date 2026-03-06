---
title: Mockup
description: Wrap content in realistic device frames for phones, tablets, browsers, and laptops
---

# Mockup

Wrap any content in a realistic device frame. Choose from phones, tablets, browsers, and laptops to show how content looks in context.

## Basic usage

The default device is a browser window.

{% preview source=true %}
{% mockup %}
{% sandbox height=798 %}
<style>
  html, body { height: 100%; }
  body { margin: 0; font-family: system-ui, sans-serif; color: #1e293b; background: #fff; }
  nav { display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; border-bottom: 1px solid #e2e8f0; }
  .logo { font-weight: 700; font-size: 18px; }
  .nav-links { display: flex; gap: 20px; font-size: 14px; color: #64748b; }
  .hero { padding: 60px 24px; text-align: center; }
  .hero h1 { font-size: 32px; margin: 0 0 12px; }
  .hero p { color: #64748b; margin: 0 0 24px; font-size: 16px; }
  .btn { display: inline-block; padding: 10px 24px; background: #6366f1; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 500; text-decoration: none; }
</style>
<nav>
  <div class="logo">Acme</div>
  <div class="nav-links"><span>Features</span><span>Pricing</span><span>Docs</span></div>
</nav>
<div class="hero">
  <h1>Build faster, ship sooner</h1>
  <p>The modern toolkit for ambitious teams.</p>
  <a class="btn" href="#">Get started</a>
</div>
{% /sandbox %}
{% /mockup %}
{% /preview %}

## Phone devices

Use `device` to select a specific phone model.

{% preview source=true %}
{% mockup device="iphone-15" %}
{% sandbox height=852 %}
<style>
  html, body { height: 100%; }
  body { margin: 0; font-family: system-ui, sans-serif; background: #f8fafc; color: #1e293b; }
  .header { padding: 12px 16px 8px; font-size: 28px; font-weight: 700; }
  .search { margin: 0 16px 12px; padding: 8px 12px; background: #e2e8f0; border-radius: 10px; font-size: 14px; color: #94a3b8; }
  .msg { display: flex; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
  .avatar { width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0; }
  .msg-body { flex: 1; min-width: 0; }
  .msg-top { display: flex; justify-content: space-between; align-items: baseline; }
  .msg-name { font-weight: 600; font-size: 15px; }
  .msg-time { font-size: 12px; color: #94a3b8; }
  .msg-text { font-size: 14px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
  .badge { width: 20px; height: 20px; background: #6366f1; border-radius: 50%; color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; margin-top: 6px; flex-shrink: 0; }
</style>
<div class="header">Messages</div>
<div class="search">Search</div>
<div class="msg">
  <div class="avatar" style="background: #c4b5fd;"></div>
  <div class="msg-body">
    <div class="msg-top"><span class="msg-name">Alice Chen</span><span class="msg-time">2m ago</span></div>
    <div class="msg-text">Hey, are we still on for lunch tomorrow?</div>
  </div>
  <div class="badge">1</div>
</div>
<div class="msg">
  <div class="avatar" style="background: #93c5fd;"></div>
  <div class="msg-body">
    <div class="msg-top"><span class="msg-name">Team Design</span><span class="msg-time">1h ago</span></div>
    <div class="msg-text">New mockups uploaded to the shared drive</div>
  </div>
</div>
<div class="msg">
  <div class="avatar" style="background: #86efac;"></div>
  <div class="msg-body">
    <div class="msg-top"><span class="msg-name">Jordan Lee</span><span class="msg-time">3h ago</span></div>
    <div class="msg-text">Thanks for the review! I'll push the fix today.</div>
  </div>
</div>
{% /sandbox %}
{% /mockup %}
{% /preview %}

Other phone options: `iphone-se`, `pixel`, `phone` (generic).

## Tablet

{% preview source=true %}
{% mockup device="ipad" %}
{% sandbox height=1180 %}
<style>
  html, body { height: 100%; }
  body { margin: 0; font-family: system-ui, sans-serif; display: flex; background: #f8fafc; color: #1e293b; }
  .sidebar { width: 200px; background: #fff; border-right: 1px solid #e2e8f0; padding: 20px 0; flex-shrink: 0; }
  .sidebar-item { padding: 10px 20px; font-size: 14px; color: #64748b; cursor: pointer; }
  .sidebar-item.active { color: #6366f1; background: #eef2ff; border-right: 2px solid #6366f1; font-weight: 600; }
  .main { flex: 1; padding: 24px; }
  .main h1 { font-size: 22px; margin: 0 0 20px; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  .card-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; }
  .card-value { font-size: 28px; font-weight: 700; margin: 6px 0 4px; }
  .card-change { font-size: 13px; }
  .up { color: #22c55e; }
  .down { color: #ef4444; }
</style>
<div class="sidebar">
  <div class="sidebar-item active">Dashboard</div>
  <div class="sidebar-item">Analytics</div>
  <div class="sidebar-item">Customers</div>
  <div class="sidebar-item">Products</div>
  <div class="sidebar-item">Settings</div>
</div>
<div class="main">
  <h1>Dashboard</h1>
  <div class="cards">
    <div class="card">
      <div class="card-label">Revenue</div>
      <div class="card-value">$12.4k</div>
      <div class="card-change up">+14% this month</div>
    </div>
    <div class="card">
      <div class="card-label">Users</div>
      <div class="card-value">2,841</div>
      <div class="card-change up">+7% this month</div>
    </div>
    <div class="card">
      <div class="card-label">Bounce Rate</div>
      <div class="card-value">24.3%</div>
      <div class="card-change down">-2% this month</div>
    </div>
  </div>
</div>
{% /sandbox %}
{% /mockup %}
{% /preview %}

Also available: `tablet` (generic).

## Browser with URL

Show a URL in the address bar with the `url` attribute.

{% preview source=true %}
{% mockup device="browser" url="https://example.com/dashboard" %}
{% sandbox height=798 %}
<style>
  html, body { height: 100%; }
  body { margin: 0; font-family: system-ui, sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; box-sizing: border-box; }
  h1 { font-size: 22px; margin: 0 0 20px; }
  .metrics { display: flex; gap: 16px; margin-bottom: 24px; }
  .metric { flex: 1; background: #fff; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  .metric-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; }
  .metric-val { font-size: 24px; font-weight: 700; margin: 4px 0; }
  .chart { background: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  .chart-title { font-size: 14px; font-weight: 600; margin-bottom: 16px; }
  .bars { display: flex; align-items: flex-end; gap: 12px; height: 100px; }
  .bar { flex: 1; background: #6366f1; border-radius: 4px 4px 0 0; position: relative; }
  .bar-label { position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); font-size: 11px; color: #94a3b8; }
</style>
<h1>Analytics</h1>
<div class="metrics">
  <div class="metric"><div class="metric-label">Page views</div><div class="metric-val">48.2k</div></div>
  <div class="metric"><div class="metric-label">Sessions</div><div class="metric-val">12.1k</div></div>
  <div class="metric"><div class="metric-label">Avg. duration</div><div class="metric-val">3m 24s</div></div>
</div>
<div class="chart">
  <div class="chart-title">Weekly Traffic</div>
  <div class="bars">
    <div class="bar" style="height:60%"><span class="bar-label">Mon</span></div>
    <div class="bar" style="height:80%"><span class="bar-label">Tue</span></div>
    <div class="bar" style="height:45%"><span class="bar-label">Wed</span></div>
    <div class="bar" style="height:90%"><span class="bar-label">Thu</span></div>
    <div class="bar" style="height:70%"><span class="bar-label">Fri</span></div>
    <div class="bar" style="height:40%"><span class="bar-label">Sat</span></div>
    <div class="bar" style="height:35%"><span class="bar-label">Sun</span></div>
  </div>
</div>
{% /sandbox %}
{% /mockup %}
{% /preview %}

## Dark browser

A dark-themed browser chrome variant.

{% preview source=true %}
{% mockup device="browser-dark" url="https://app.example.com" %}
{% sandbox height=798 %}
<style>
  html, body { height: 100%; }
  body { margin: 0; font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; display: flex; }
  .side { width: 180px; background: #1e293b; padding: 20px 0; border-right: 1px solid #334155; flex-shrink: 0; }
  .side-item { padding: 10px 20px; font-size: 13px; color: #94a3b8; }
  .side-item.active { color: #a5b4fc; background: rgba(99,102,241,.1); }
  .content { flex: 1; padding: 24px; }
  .content h1 { font-size: 20px; margin: 0 0 16px; color: #f1f5f9; }
  .table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .table th { text-align: left; padding: 10px 12px; color: #94a3b8; border-bottom: 1px solid #334155; font-weight: 500; }
  .table td { padding: 10px 12px; border-bottom: 1px solid #1e293b; }
  .status { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
  .status.on { background: rgba(34,197,94,.15); color: #4ade80; }
  .status.off { background: rgba(239,68,68,.15); color: #f87171; }
</style>
<div class="side">
  <div class="side-item active">Deployments</div>
  <div class="side-item">Domains</div>
  <div class="side-item">Storage</div>
  <div class="side-item">Logs</div>
</div>
<div class="content">
  <h1>Deployments</h1>
  <table class="table">
    <tr><th>Service</th><th>Status</th><th>Region</th></tr>
    <tr><td>api-prod</td><td><span class="status on">Live</span></td><td>us-east-1</td></tr>
    <tr><td>web-app</td><td><span class="status on">Live</span></td><td>eu-west-1</td></tr>
    <tr><td>worker-queue</td><td><span class="status off">Stopped</span></td><td>us-east-1</td></tr>
  </table>
</div>
{% /sandbox %}
{% /mockup %}
{% /preview %}

## MacBook

Full laptop frame with keyboard and trackpad.

{% preview source=true %}
{% mockup device="macbook" %}
{% sandbox height=900 %}
<style>
  html, body { height: 100%; }
  body { margin: 0; font-family: system-ui, sans-serif; background: #fff; color: #1e293b; display: flex; flex-direction: column; }
  .toolbar { display: flex; align-items: center; gap: 12px; padding: 8px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  .toolbar-btn { padding: 4px 10px; background: #e2e8f0; border-radius: 4px; font-size: 12px; color: #475569; }
  .workspace { display: flex; flex: 1; }
  .panel { width: 180px; background: #f8fafc; border-right: 1px solid #e2e8f0; padding: 12px; font-size: 13px; overflow: hidden; flex-shrink: 0; }
  .panel-title { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: .5px; margin-bottom: 8px; font-weight: 600; }
  .file { padding: 4px 8px; border-radius: 4px; color: #475569; }
  .file.active { background: #6366f1; color: #fff; }
  .editor { flex: 1; padding: 16px; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; background: #fafafa; line-height: 1.7; overflow: hidden; }
  .ln { color: #cbd5e1; margin-right: 16px; user-select: none; }
  .kw { color: #8b5cf6; }
  .fn { color: #2563eb; }
  .str { color: #16a34a; }
  .cm { color: #94a3b8; }
</style>
<div class="toolbar">
  <span class="toolbar-btn">File</span>
  <span class="toolbar-btn">Edit</span>
  <span class="toolbar-btn">View</span>
  <span style="flex:1"></span>
  <span style="color:#94a3b8; font-size:12px;">main.ts — project</span>
</div>
<div class="workspace">
  <div class="panel">
    <div class="panel-title">Explorer</div>
    <div class="file">src/</div>
    <div class="file active">&nbsp;&nbsp;main.ts</div>
    <div class="file">&nbsp;&nbsp;utils.ts</div>
    <div class="file">&nbsp;&nbsp;types.ts</div>
    <div class="file">package.json</div>
  </div>
  <div class="editor">
    <div><span class="ln">1</span><span class="kw">import</span> { <span class="fn">createApp</span> } <span class="kw">from</span> <span class="str">'./app'</span>;</div>
    <div><span class="ln">2</span></div>
    <div><span class="ln">3</span><span class="cm">// Initialize the application</span></div>
    <div><span class="ln">4</span><span class="kw">const</span> app = <span class="fn">createApp</span>({</div>
    <div><span class="ln">5</span>&nbsp;&nbsp;port: <span class="str">3000</span>,</div>
    <div><span class="ln">6</span>&nbsp;&nbsp;env: <span class="str">'production'</span>,</div>
    <div><span class="ln">7</span>});</div>
    <div><span class="ln">8</span></div>
    <div><span class="ln">9</span>app.<span class="fn">listen</span>();</div>
  </div>
</div>
{% /sandbox %}
{% /mockup %}
{% /preview %}

## Watch

Compact smartwatch frame.

{% preview source=true %}
{% mockup device="watch" color="dark" %}
{% sandbox height=242 %}
<style>
  html, body { height: 100%; }
  body { margin: 0; font-family: system-ui, sans-serif; background: #000; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px; text-align: center; box-sizing: border-box; }
  .time { font-size: 36px; font-weight: 200; letter-spacing: 2px; }
  .date { font-size: 11px; color: #f97316; margin-top: 2px; font-weight: 600; }
  .rings { display: flex; gap: 8px; margin-top: 12px; }
  .ring { width: 24px; height: 24px; border-radius: 50%; border: 3px solid; }
</style>
<div class="time">10:09</div>
<div class="date">TUE MAR 4</div>
<div class="rings">
  <div class="ring" style="border-color: #ef4444;"></div>
  <div class="ring" style="border-color: #22c55e;"></div>
  <div class="ring" style="border-color: #06b6d4;"></div>
</div>
{% /sandbox %}
{% /mockup %}
{% /preview %}

## Color variants

Control the bezel color with `color`.

{% preview source=true %}
{% mockup device="iphone-15" color="light" %}
{% sandbox height=852 %}
<style>
  html, body { height: 100%; }
  body { margin: 0; font-family: system-ui, sans-serif; background: #f8fafc; color: #1e293b; }
  .now-playing { padding: 32px 20px 20px; text-align: center; }
  .art { width: 180px; height: 180px; margin: 0 auto 20px; border-radius: 12px; background: linear-gradient(135deg, #c4b5fd, #818cf8, #6366f1); }
  .title { font-size: 18px; font-weight: 700; }
  .artist { font-size: 14px; color: #64748b; margin-top: 2px; }
  .progress { margin: 20px 20px 0; height: 3px; background: #e2e8f0; border-radius: 2px; }
  .progress-fill { height: 100%; width: 40%; background: #6366f1; border-radius: 2px; }
  .times { display: flex; justify-content: space-between; margin: 6px 20px 0; font-size: 11px; color: #94a3b8; }
  .controls { display: flex; align-items: center; justify-content: center; gap: 32px; margin-top: 16px; font-size: 20px; color: #334155; }
  .play { width: 48px; height: 48px; background: #6366f1; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .play::after { content: ''; border-style: solid; border-width: 8px 0 8px 14px; border-color: transparent transparent transparent #fff; margin-left: 2px; }
</style>
<div class="now-playing">
  <div class="art"></div>
  <div class="title">Midnight Drive</div>
  <div class="artist">Neon Waves</div>
</div>
<div class="progress"><div class="progress-fill"></div></div>
<div class="times"><span>1:24</span><span>3:42</span></div>
<div class="controls">
  <span>&#9198;</span>
  <div class="play"></div>
  <span>&#9197;</span>
</div>
{% /sandbox %}
{% /mockup %}
{% /preview %}

## Label

Add a caption below the device frame.

{% preview source=true %}
{% mockup device="browser" url="https://example.com" label="Homepage — Desktop" %}
{% sandbox height=798 %}
<style>
  html, body { height: 100%; }
  body { margin: 0; font-family: system-ui, sans-serif; color: #1e293b; background: #fff; }
  .hero { text-align: center; padding: 48px 24px; background: linear-gradient(135deg, #eef2ff, #e0e7ff); }
  .hero h1 { font-size: 28px; margin: 0 0 8px; }
  .hero p { color: #64748b; margin: 0 0 20px; }
  .cta { display: inline-block; padding: 10px 24px; background: #6366f1; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 500; text-decoration: none; }
  .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 32px 24px; }
  .feat { text-align: center; padding: 16px; }
  .feat-icon { width: 40px; height: 40px; margin: 0 auto 10px; border-radius: 10px; background: #eef2ff; display: flex; align-items: center; justify-content: center; font-size: 20px; }
  .feat h3 { font-size: 14px; margin: 0 0 4px; }
  .feat p { font-size: 13px; color: #64748b; margin: 0; }
</style>
<div class="hero">
  <h1>Welcome to Example</h1>
  <p>Everything you need to build great products.</p>
  <a class="cta" href="#">Start free trial</a>
</div>
<div class="features">
  <div class="feat"><div class="feat-icon">&#9889;</div><h3>Fast</h3><p>Sub-second load times</p></div>
  <div class="feat"><div class="feat-icon">&#128274;</div><h3>Secure</h3><p>Enterprise-grade auth</p></div>
  <div class="feat"><div class="feat-icon">&#128200;</div><h3>Scalable</h3><p>Grows with your team</p></div>
</div>
{% /sandbox %}
{% /mockup %}
{% /preview %}

## Scale

Shrink or enlarge the device frame with CSS scaling.

{% preview source=true %}
{% mockup device="iphone-15" scale=0.75 %}
{% sandbox height=852 %}
<style>
  html, body { height: 100%; }
  body { margin: 0; font-family: system-ui, sans-serif; background: #f8fafc; color: #1e293b; padding: 16px; box-sizing: border-box; }
  .profile { text-align: center; padding: 20px 0 16px; }
  .avatar { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #f97316, #ec4899); margin: 0 auto 12px; }
  .name { font-size: 18px; font-weight: 700; }
  .handle { font-size: 13px; color: #94a3b8; }
  .stats { display: flex; justify-content: center; gap: 24px; margin: 16px 0; }
  .stat-val { font-size: 17px; font-weight: 700; }
  .stat-label { font-size: 11px; color: #94a3b8; }
  .follow-btn { display: block; margin: 0 20px; padding: 10px; background: #6366f1; color: #fff; border-radius: 10px; text-align: center; font-size: 14px; font-weight: 600; }
  .bio { font-size: 13px; color: #64748b; text-align: center; margin: 14px 20px 0; line-height: 1.4; }
</style>
<div class="profile">
  <div class="avatar"></div>
  <div class="name">Sam Rivera</div>
  <div class="handle">@samrivera</div>
</div>
<div class="stats">
  <div><div class="stat-val">842</div><div class="stat-label">Posts</div></div>
  <div><div class="stat-val">12.4k</div><div class="stat-label">Followers</div></div>
  <div><div class="stat-val">381</div><div class="stat-label">Following</div></div>
</div>
<div class="follow-btn">Follow</div>
<div class="bio">Designer & developer. Building things for the web.</div>
{% /sandbox %}
{% /mockup %}
{% /preview %}

## No frame

Use `device="none"` for a minimal dashed border with no chrome.

{% preview source=true %}
{% mockup device="none" %}

Content without any device chrome.

{% /mockup %}
{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `device` | `string` | `"browser"` | Device type: `iphone-15`, `iphone-se`, `pixel`, `phone`, `ipad`, `tablet`, `browser`, `browser-dark`, `macbook`, `watch`, `none` |
| `label` | `string` | — | Caption displayed below the device frame |
| `color` | `string` | `"dark"` | Bezel color: `dark`, `light`, `auto` |
| `statusBar` | `boolean` | `true` | Show status bar on mobile devices |
| `url` | `string` | — | URL to display in browser address bar |
| `scale` | `number` | `1` | CSS transform scale factor |

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `tight`, `default`, or `loose` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
