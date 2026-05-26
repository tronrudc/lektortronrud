/* ============================================================
   LEKTOR TRONRUD · KLASSELISTER (shared store)

   Tiny library that holds named class lists in localStorage and
   lets every tool read from / subscribe to the same data.

   PRIVACY: All data lives in the browser's localStorage on the
   teacher's own device. Nothing is sent anywhere.

   Shape:
   {
     version: 1,
     groups: [
       { id: 'g_xyz', name: 'Blå tredeling', color: 'teal',
         names: ['Hermione', 'Ron', ...],
         updatedAt: 1716600000000 }
     ],
     selected: 'g_xyz' | null   // last group the user picked
   }
   ============================================================ */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'lt-klasselister';
  const VERSION = 1;
  const PALETTE = ['teal', 'orange', 'pink', 'yellow', 'green', 'blue', 'red'];

  // ── Read / write ──
  function emptyState() {
    return { version: VERSION, groups: [], selected: null };
  }
  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || !Array.isArray(data.groups)) return emptyState();
      // Sanitise
      data.version = VERSION;
      data.groups = data.groups.map(normaliseGroup).filter(Boolean);
      if (data.selected && !data.groups.some(g => g.id === data.selected)) {
        data.selected = null;
      }
      return data;
    } catch (_) {
      return emptyState();
    }
  }
  function write(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      // Notify listeners in this tab (storage event only fires in other tabs)
      window.dispatchEvent(new CustomEvent('lt-klasselister:change', { detail: data }));
    } catch (_) {}
  }
  function normaliseGroup(g) {
    if (!g || typeof g !== 'object') return null;
    return {
      id: typeof g.id === 'string' && g.id ? g.id : newId(),
      name: typeof g.name === 'string' ? g.name : 'Uten navn',
      color: PALETTE.includes(g.color) ? g.color : 'teal',
      names: Array.isArray(g.names) ? g.names.filter(n => typeof n === 'string' && n.trim()).map(n => n.trim()) : [],
      updatedAt: typeof g.updatedAt === 'number' ? g.updatedAt : Date.now(),
    };
  }
  function newId() {
    return 'g_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  }

  // ── Public API ──
  const API = {
    PALETTE,

    getAll() {
      return read();
    },
    getGroups() {
      return read().groups;
    },
    getGroup(id) {
      return read().groups.find(g => g.id === id) || null;
    },
    getSelected() {
      const data = read();
      if (!data.selected) return null;
      return data.groups.find(g => g.id === data.selected) || null;
    },
    setSelected(id) {
      const data = read();
      if (id && !data.groups.some(g => g.id === id)) return;
      data.selected = id || null;
      write(data);
    },

    create({ name, color, names } = {}) {
      const data = read();
      const group = normaliseGroup({
        id: newId(),
        name: (name || 'Ny klasseliste').trim(),
        color: color || PALETTE[data.groups.length % PALETTE.length],
        names: names || [],
        updatedAt: Date.now(),
      });
      data.groups.push(group);
      data.selected = group.id;
      write(data);
      return group;
    },

    update(id, patch) {
      const data = read();
      const idx = data.groups.findIndex(g => g.id === id);
      if (idx < 0) return null;
      const merged = normaliseGroup({ ...data.groups[idx], ...patch, id, updatedAt: Date.now() });
      data.groups[idx] = merged;
      write(data);
      return merged;
    },

    remove(id) {
      const data = read();
      data.groups = data.groups.filter(g => g.id !== id);
      if (data.selected === id) data.selected = data.groups[0]?.id || null;
      write(data);
    },

    duplicate(id) {
      const data = read();
      const g = data.groups.find(x => x.id === id);
      if (!g) return null;
      return API.create({
        name: g.name + ' (kopi)',
        color: g.color,
        names: [...g.names],
      });
    },

    reorder(ids) {
      const data = read();
      const byId = new Map(data.groups.map(g => [g.id, g]));
      const next = [];
      ids.forEach(i => { if (byId.has(i)) { next.push(byId.get(i)); byId.delete(i); } });
      byId.forEach(g => next.push(g));
      data.groups = next;
      write(data);
    },

    // Parsing helper used by every tool
    parseNames(raw) {
      if (!raw) return [];
      // Accept comma, newline, semicolon, tab — single delimiter system
      return raw.split(/[,\n;\t]+/).map(s => s.trim()).filter(Boolean);
    },

    formatNames(names) {
      return (names || []).join(', ');
    },

    // Listen for any change (same-tab and other-tab)
    onChange(cb) {
      const localHandler = (e) => cb(e.detail || read());
      const storageHandler = (e) => { if (e.key === STORAGE_KEY) cb(read()); };
      window.addEventListener('lt-klasselister:change', localHandler);
      window.addEventListener('storage', storageHandler);
      return () => {
        window.removeEventListener('lt-klasselister:change', localHandler);
        window.removeEventListener('storage', storageHandler);
      };
    },
  };

  global.LektorKlasselister = API;
})(window);
