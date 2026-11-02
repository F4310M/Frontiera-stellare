// Stellar Frontier — ICONE: tutte le frecce e i simboli dei pulsanti sono icone SVG
// (prima erano caratteri di testo come → ↗ ⤓ ✓ che cambiavano aspetto da un font all'altro).
// ico('nome') restituisce l'SVG; nell'HTML basta <i data-ico="nome"></i>, che viene sostituito al caricamento.
// Va caricato per primo: gli altri file usano ico() quando costruiscono i pulsanti.

const ICONS={
 'arrow-right':'<path d="M4 12h15M13 6l6 6-6 6"/>',
 'arrow-left':'<path d="M20 12H5M11 6l-6 6 6 6"/>',
 'arrow-up':'<path d="M12 20V5M6 11l6-6 6 6"/>',
 'arrow-down':'<path d="M12 4v15M6 13l6 6 6-6"/>',
 'chevrons':'<path d="M5 6l6 6-6 6M12 6l6 6-6 6"/>',
 'land':'<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
 'jump':'<path d="M12 21V9M7 14l5-5 5 5M4 4h16"/>',
 'maximize':'<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
 'minimize':'<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
 'play':'<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>',
 'pause':'<path d="M8 5v14M16 5v14" stroke-width="3.2"/>',
 'map':'<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5zM9 4v13.5M15 6.5V20"/>',
 'check':'<path d="M4.5 12.5l5 5 10-11"/>',
 'close':'<path d="M6 6l12 12M18 6 6 18"/>',
 'gear':'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/><circle cx="12" cy="12" r="6.6"/>',
 'coins':'<ellipse cx="12" cy="6" rx="7" ry="2.8"/><path d="M5 6v6c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8V6M5 12v6c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8v-6"/>',
 'trophy':'<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3.5 4M16 6h3a3 3 0 0 1-3.5 4M12 13v4M8 21h8M9.5 17h5v4h-5z"/>',
 'globe':'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
 'ship':'<path d="M21 12 4 5l3.5 7L4 19z" fill="currentColor" stroke-linejoin="round"/>',
 'rotate':'<path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5"/>',
 'warning':'<path d="M12 3 2 20h20zM12 10v4.5M12 17.2v.3"/>',
 // mercato e comandi touch
 'salvo':'<path d="M8 21V9M5 12l3-3 3 3M16 21V5M13 8l3-3 3 3"/>',
 'laser':'<path d="M12 2.5l2.4 7.1 7.1 2.4-7.1 2.4L12 21.5l-2.4-7.1L2.5 12l7.1-2.4z" fill="currentColor" stroke-linejoin="round"/>',
 'shield':'<path d="M12 3l8 3v6c0 4.8-3.4 8-8 9-4.6-1-8-4.2-8-9V6z"/><path d="M12 7.5v9" opacity=".55"/>',
 'speed':'<path d="M13.5 2.5 5 13.5h6l-1 8 8.5-11h-6z" fill="currentColor" stroke-linejoin="round"/>',
 'fuel':'<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M7 8h4M14 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
 'grenade':'<circle cx="11" cy="14.5" r="6"/><path d="M9 8.8V6h4v2.8M13 6l3.5-3"/>',
 'twin':'<path d="M3 9h13M3 15h13"/><path d="M17 9h4M17 15h4" stroke-width="3.4"/>',
 'fire':'<circle cx="12" cy="12" r="6.5"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
 'missile':'<path d="M5 19l3-3M14.5 4.5c2-1 4.2-1.3 5-1 .3.8 0 3-1 5L12 15l-3-3zM9 12l-4 .5 2-3h4M12 15l-.5 4 3-2v-4"/>',
 'boost':'<path d="M4 6l6 6-6 6M11 6l6 6-6 6M18 6v12"/>',
 'brake':'<path d="M8.5 3h7L21 8.5v7L15.5 21h-7L3 15.5v-7z"/><path d="M8 12h8"/>',
 'god':'<path d="M12 3l8 3v6c0 4.8-3.4 8-8 9-4.6-1-8-4.2-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'
};
function ico(name,cls){
 const p=ICONS[name];if(!p)return'';
 return `<svg class="ico${cls?' '+cls:''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`;
}
function icoFill(root){
 if(!root||!root.querySelectorAll)return;
 for(const el of root.querySelectorAll('[data-ico]')){const s=ico(el.dataset.ico,el.className.replace(/\bico\b/,'').trim());if(s)el.outerHTML=s}
}
if(typeof document!=='undefined'&&document.body)icoFill(document.body);
