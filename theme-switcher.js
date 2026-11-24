/* =========================================================================
   <theme-switcher> – eigenständige Web-Komponente
   -------------------------------------------------------------------------
   Nutzung:
     <theme-switcher themes="original:Original,rheinblau:Rheinblau"></theme-switcher>
   - setzt <html data-theme="...">  (Farben/Formen kommen aus theme-<name>.css)
   - merkt sich die Wahl pro Browser (localStorage, falls verfügbar)
   - ?theme=rheinblau in der URL überschreibt die Wahl (z. B. zum Teilen)
   - feuert das Event "themechange" auf document
   Die Komponente kennt weder Farben noch Layout der Seite.
   ========================================================================= */
(() => {
  const KEY = 'pp-theme';
  const root = document.documentElement;

  const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const write = (v) => { try { localStorage.setItem(KEY, v); } catch (e) { /* egal */ } };

  function apply(name) {
    root.dataset.theme = name;
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: name } }));
  }

  class ThemeSwitcher extends HTMLElement {
    connectedCallback() {
      const list = (this.getAttribute('themes') || 'original:Original')
        .split(',').map(s => s.trim()).filter(Boolean)
        .map(s => { const [id, label] = s.split(':'); return { id, label: label || id }; });
      const fromUrl = new URLSearchParams(location.search).get('theme');
      const valid = id => list.some(t => t.id === id);
      const current = [fromUrl, root.dataset.theme, read()].find(valid) || list[0].id;

      this.attachShadow({ mode: 'open' }).innerHTML = `
        <style>
          :host{display:inline-flex;gap:4px;padding:4px;border-radius:999px;
                background:var(--line, rgba(127,127,127,.2));font:600 12px/1 Inter,system-ui,sans-serif}
          button{all:unset;cursor:pointer;display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;
                 color:var(--fg,#fff);opacity:.75;transition:.15s;white-space:nowrap}
          button:hover{opacity:1}
          button[aria-pressed="true"]{background:var(--fg,#fff);color:var(--bg,#000);opacity:1}
          button:focus-visible{outline:2px solid var(--accent-2,#ff0);outline-offset:2px}
          .dot{width:12px;height:12px;border-radius:50%;box-shadow:inset 0 0 0 2px rgba(255,255,255,.6)}
          @media(max-width:560px){ .lbl{display:none} }
        </style>
        <span role="group" aria-label="Design wählen" style="display:contents">
          ${list.map(t => `<button type="button" data-id="${t.id}" title="Design: ${t.label}">
              <span class="dot" data-dot="${t.id}"></span><span class="lbl">${t.label}</span></button>`).join('')}
        </span>`;

      // Farbpunkt je Design: liest --accent aus dem jeweiligen Theme
      const probe = document.createElement('div'); probe.style.display = 'none'; document.body.appendChild(probe);
      this.shadowRoot.querySelectorAll('[data-dot]').forEach(dot => {
        probe.setAttribute('data-theme', dot.dataset.dot);
        const cs = getComputedStyle(probe);
        dot.style.background = `linear-gradient(135deg, ${cs.getPropertyValue('--bg')} 50%, ${cs.getPropertyValue('--accent')} 50%)`;
      });
      probe.remove();

      const sync = (id) => this.shadowRoot.querySelectorAll('button')
        .forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === id)));

      this.shadowRoot.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        apply(b.dataset.id); write(b.dataset.id); sync(b.dataset.id);
      });
      apply(current); sync(current);
    }
  }
  if (!customElements.get('theme-switcher')) customElements.define('theme-switcher', ThemeSwitcher);
})();
