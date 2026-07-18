import React, { useState, useRef, useEffect } from "react";
import {
  Inbox, Star, CalendarDays, Layers, Archive, CheckCircle2,
  Plus, Flag, Circle, Check, X, Folder, Trash2, Moon, Sun,
  Search, Bell, Repeat, Hash, RotateCcw,
} from "lucide-react";

/* ------------------------------ date helpers ------------------------------ */
const iso = (d) => d.toISOString().slice(0, 10);
const TODAY = iso(new Date());
const addDays = (base, n) => {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + n);
  return iso(d);
};
const addMonths = (base, n) => {
  const d = new Date(base + "T00:00:00");
  d.setMonth(d.getMonth() + n);
  return iso(d);
};
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const daysUntil = (s) =>
  Math.round((new Date(s + "T00:00:00") - new Date(TODAY + "T00:00:00")) / 864e5);
const prettyDate = (s) => {
  const n = daysUntil(s);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};
const deadlineLabel = (s) => {
  const n = daysUntil(s);
  if (n === 0) return "today";
  if (n < 0) return `${-n}d over`;
  if (n === 1) return "tomorrow";
  return `in ${n} days`;
};
const prettyReminder = (s) => {
  const d = new Date(s);
  if (isNaN(d)) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};
/* advance a plain date string by one repeat interval */
const advanceDate = (dateStr, repeat) =>
  repeat === "monthly" ? addMonths(dateStr, 1)
    : repeat === "weekly" ? addDays(dateStr, 7)
      : addDays(dateStr, 1);
/* advance a `when` value (may be a keyword) by one interval */
const advanceWhen = (when, repeat) => advanceDate(isDate(when) ? when : TODAY, repeat);

/* -------------------------------- seed data ------------------------------- */
let _id = 0;
const uid = () => `id${++_id}`;
/* keep the id counter ahead of anything already persisted */
const bumpIdFrom = (data) => {
  const re = /"id(\d+)"/g;
  const s = JSON.stringify(data);
  let m, max = 0;
  while ((m = re.exec(s))) max = Math.max(max, +m[1]);
  _id = Math.max(_id, max);
};

const SEED_AREAS = [
  { id: "a-work", title: "Work" },
  { id: "a-family", title: "Family" },
  { id: "a-hobbies", title: "Hobbies" },
];
const SEED_PROJECTS = [
  { id: "p-present", title: "Prepare Presentation", areaId: "a-work" },
  { id: "p-julia", title: "Onboard Julia", areaId: "a-work" },
  { id: "p-rome", title: "Vacation in Rome", areaId: "a-family" },
  { id: "p-eve", title: "Throw Party for Eve", areaId: "a-family" },
];
const mk = (t, extra = {}) => ({
  id: uid(), title: t, notes: "", tags: [], checklist: [],
  when: null, deadline: null, reminder: null, repeat: null,
  projectId: null, areaId: null, heading_id: null,
  status: "open", trashed: false, completedAt: null, ...extra,
});
const SEED_TODOS = [
  mk("Hit the gym with Lucas", { when: "today" }),
  mk("Coffee with Emma", { when: "today" }),
  mk("Team meeting", { when: "today", areaId: "a-work" }),
  mk("Budget review", { when: "today", areaId: "a-work" }),
  mk("Borrow Emma's travel guide", { when: "today", projectId: "p-rome" }),
  mk("Finish expense report", { when: "today", projectId: "p-present", deadline: TODAY }),
  mk("Confirm conference call for Friday", { when: "today", projectId: "p-present" }),
  mk("Make dinner reservation", { when: "evening", projectId: "p-eve" }),
  mk("Read article about nutrition", { when: "evening" }),
  mk("Revise introduction", { projectId: "p-present" }),
  mk("Review milestones from last quarter", { projectId: "p-present" }),
  mk("Collect sales statistics", { projectId: "p-present" }),
  mk("Print handouts for attendees", { projectId: "p-present", when: addDays(TODAY, 3) }),
  mk("Book the conference room", { projectId: "p-present" }),
  mk("Request bank account information", { projectId: "p-julia" }),
  mk("Schedule introduction to the team", { projectId: "p-julia" }),
  mk("Buy 'Thank You' cards", { projectId: "p-eve" }),
  mk("Borrow a microphone", { projectId: "p-eve" }),
  mk("Book a hotel room", { projectId: "p-rome", when: addDays(TODAY, 1) }),
  mk("Check out restaurants", { projectId: "p-rome", when: addDays(TODAY, 2) }),
  mk("Learn Basic Italian", { areaId: "a-hobbies" }),
  mk("Run a Marathon", { areaId: "a-hobbies", when: "someday" }),
  mk("Buy a New Bike", { areaId: "a-hobbies", when: "someday" }),
  mk("Apply for office position in New York", {
    when: addDays(TODAY, 4), deadline: addDays(TODAY, 7),
    checklist: [
      { id: uid(), title: "Update resume", done: true },
      { id: uid(), title: "Draft my introduction", done: false },
      { id: uid(), title: "Ask John for a recommendation letter", done: false },
    ],
  }),
  mk("Renew passport", { deadline: addDays(TODAY, 12) }),
  mk("Pick up dry cleaning", {}),
];

/* ------------------------------ persistence ------------------------------- */
const STORE_KEY = "things-clone-v1";
const loadState = () => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/* ------------------------------ list registry ----------------------------- */
const LISTS = [
  { id: "inbox", name: "Inbox", Icon: Inbox, color: "text-sky-500" },
  { id: "today", name: "Today", Icon: Star, color: "text-amber-400" },
  { id: "upcoming", name: "Upcoming", Icon: CalendarDays, color: "text-rose-400" },
  { id: "anytime", name: "Anytime", Icon: Layers, color: "text-teal-500" },
  { id: "someday", name: "Someday", Icon: Archive, color: "text-amber-600" },
  { id: "logbook", name: "Logbook", Icon: CheckCircle2, color: "text-emerald-500" },
  { id: "trash", name: "Trash", Icon: Trash2, color: "text-stone-400" },
];

/* ================================== APP =================================== */
export default function App() {
  const boot = loadState();
  if (boot) bumpIdFrom(boot);

  const [todos, setTodos] = useState(boot?.todos ?? SEED_TODOS);
  const [areas, setAreas] = useState(boot?.areas ?? SEED_AREAS);
  const [projects, setProjects] = useState(boot?.projects ?? SEED_PROJECTS);
  const [headings, setHeadings] = useState(boot?.headings ?? []);
  const [theme, setTheme] = useState(boot?.theme ?? "light");

  const [view, setView] = useState({ type: "list", id: "today" });
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [editingEntity, setEditingEntity] = useState(null); // area/project id being renamed

  /* persist everything */
  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify({ todos, areas, projects, headings, theme }));
  }, [todos, areas, projects, headings, theme]);

  /* reflect the theme on <html> so dark: variants + page bg apply */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const open = (t) => t.status === "open" && !t.trashed;
  const inToday = (t) =>
    open(t) &&
    (t.when === "today" || t.when === "evening" ||
      (isDate(t.when) && t.when <= TODAY) ||
      (t.deadline && t.deadline <= TODAY));
  const futureScheduled = (t) =>
    open(t) && ((isDate(t.when) && t.when > TODAY) || (!t.when && t.deadline && t.deadline > TODAY));

  const projectOf = (id) => projects.find((p) => p.id === id);

  /* derive the todos for a given view */
  const listFor = (v) => {
    if (v.type === "project") return todos.filter((t) => open(t) && t.projectId === v.id);
    if (v.type === "area")
      return todos.filter((t) => open(t) && t.areaId === v.id && !t.projectId);
    switch (v.id) {
      case "inbox":
        return todos.filter((t) => open(t) && !t.projectId && !t.areaId && t.when == null);
      case "today":
        return todos.filter(inToday);
      case "upcoming":
        return todos.filter(futureScheduled);
      case "anytime":
        return todos.filter(
          (t) => open(t) && !inToday(t) && t.when !== "someday" && !futureScheduled(t) &&
            (t.projectId || t.areaId)
        );
      case "someday":
        return todos.filter((t) => open(t) && t.when === "someday");
      case "logbook":
        return todos.filter((t) => t.status === "completed" && !t.trashed);
      case "trash":
        return todos.filter((t) => t.trashed);
      default:
        return [];
    }
  };

  const counts = {
    inbox: todos.filter((t) => open(t) && !t.projectId && !t.areaId && t.when == null).length,
    today: todos.filter(inToday).length,
    trash: todos.filter((t) => t.trashed).length,
  };
  const projStats = (pid) => {
    const items = todos.filter((t) => t.projectId === pid && !t.trashed);
    const done = items.filter((t) => t.status === "completed").length;
    return { done, total: items.length };
  };

  /* ------------------------------- mutations ------------------------------ */
  const patch = (id, p) => setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)));

  const toggle = (id) =>
    setTodos((ts) => {
      const t = ts.find((x) => x.id === id);
      if (!t) return ts;
      if (t.status === "open") {
        let next = ts.map((x) =>
          x.id === id ? { ...x, status: "completed", completedAt: new Date().toISOString() } : x
        );
        if (t.repeat) {
          next = [
            ...next,
            {
              ...t,
              id: uid(),
              status: "open",
              completedAt: null,
              when: advanceWhen(t.when, t.repeat),
              deadline: t.deadline ? advanceDate(t.deadline, t.repeat) : null,
              checklist: t.checklist.map((c) => ({ ...c, id: uid(), done: false })),
            },
          ];
        }
        return next;
      }
      return ts.map((x) => (x.id === id ? { ...x, status: "open", completedAt: null } : x));
    });

  const trash = (id) => {
    setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, trashed: true } : t)));
    if (editing === id) setEditing(null);
  };
  const restore = (id) => setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, trashed: false } : t)));
  const destroy = (id) => {
    setTodos((ts) => ts.filter((t) => t.id !== id));
    if (editing === id) setEditing(null);
  };
  const emptyTrash = () => setTodos((ts) => ts.filter((t) => !t.trashed));

  const addTodo = () => {
    const base = mk("");
    if (view.type === "project") {
      base.projectId = view.id;
      base.areaId = projectOf(view.id)?.areaId || null;
    } else if (view.type === "area") base.areaId = view.id;
    else if (view.id === "today") base.when = "today";
    else if (view.id === "someday") base.when = "someday";
    else if (view.id === "upcoming") base.when = addDays(TODAY, 1);
    setTodos((ts) => [...ts, base]);
    setEditing(base.id);
  };

  /* areas & projects */
  const patchArea = (id, p) => setAreas((as) => as.map((a) => (a.id === id ? { ...a, ...p } : a)));
  const patchProject = (id, p) => setProjects((ps) => ps.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const addArea = () => {
    const a = { id: uid(), title: "" };
    setAreas((as) => [...as, a]);
    setEditingEntity(a.id);
  };
  const addProject = (areaId) => {
    const p = { id: uid(), title: "", areaId };
    setProjects((ps) => [...ps, p]);
    setEditingEntity(p.id);
  };
  const deleteArea = (id) => {
    const projIds = projects.filter((p) => p.areaId === id).map((p) => p.id);
    setTodos((ts) =>
      ts.map((t) =>
        t.areaId === id || projIds.includes(t.projectId)
          ? { ...t, areaId: null, projectId: null, heading_id: null }
          : t
      )
    );
    setHeadings((hs) => hs.filter((h) => !projIds.includes(h.projectId)));
    setProjects((ps) => ps.filter((p) => p.areaId !== id));
    setAreas((as) => as.filter((a) => a.id !== id));
    if (view.id === id || projIds.includes(view.id)) setView({ type: "list", id: "today" });
  };
  const deleteProject = (id) => {
    const proj = projectOf(id);
    setTodos((ts) =>
      ts.map((t) =>
        t.projectId === id ? { ...t, projectId: null, heading_id: null, areaId: proj?.areaId || null } : t
      )
    );
    setHeadings((hs) => hs.filter((h) => h.projectId !== id));
    setProjects((ps) => ps.filter((p) => p.id !== id));
    if (view.id === id) setView({ type: "list", id: "today" });
  };
  const commitEntityName = (kind, id, value) => {
    const title = value.trim();
    if (!title) {
      if (kind === "area") deleteArea(id);
      else deleteProject(id);
    } else if (kind === "area") patchArea(id, { title });
    else patchProject(id, { title });
    setEditingEntity(null);
  };

  /* headings */
  const addHeading = (projectId, title) =>
    setHeadings((hs) => [...hs, { id: uid(), title, projectId }]);
  const deleteHeading = (id) => {
    setTodos((ts) => ts.map((t) => (t.heading_id === id ? { ...t, heading_id: null } : t)));
    setHeadings((hs) => hs.filter((h) => h.id !== id));
  };

  const activeTodo = todos.find((t) => t.id === editing) || null;
  const headerInfo = viewHeader(view, areas, projects);
  const searching = query.trim().length > 0;
  const shown = listFor(view);
  const q = query.trim().toLowerCase();
  const results = searching
    ? todos.filter(
        (t) =>
          !t.trashed &&
          ((t.title || "").toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q))
      )
    : [];

  return (
    <div className="flex h-[760px] w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 font-sans text-stone-800 antialiased shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200">
      {/* ------------------------------ SIDEBAR ------------------------------ */}
      <aside className="flex w-60 shrink-0 flex-col overflow-y-auto border-r border-stone-200/70 bg-stone-100/80 px-2.5 py-3 dark:border-stone-800 dark:bg-stone-950/40">
        {/* search */}
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-stone-200/60 px-2.5 py-1.5 dark:bg-stone-800/70">
          <Search size={15} className="text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-400 dark:text-stone-200"
          />
          {searching && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="text-stone-400 hover:text-stone-600">
              <X size={14} />
            </button>
          )}
        </div>

        {LISTS.map((l) => (
          <Row
            key={l.id}
            active={!searching && view.type === "list" && view.id === l.id}
            onClick={() => { setQuery(""); setView({ type: "list", id: l.id }); }}
          >
            <l.Icon size={17} className={l.color} strokeWidth={2} />
            <span className="flex-1">{l.name}</span>
            {l.id === "inbox" && counts.inbox > 0 && <Badge>{counts.inbox}</Badge>}
            {l.id === "today" && counts.today > 0 && <Badge>{counts.today}</Badge>}
            {l.id === "trash" && counts.trash > 0 && <Badge>{counts.trash}</Badge>}
          </Row>
        ))}

        <div className="mx-2 my-3 border-t border-stone-200 dark:border-stone-800" />

        {areas.map((a) => (
          <div key={a.id} className="group/area mb-1">
            {editingEntity === a.id ? (
              <input
                autoFocus
                defaultValue={a.title}
                onBlur={(e) => commitEntityName("area", a.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") commitEntityName("area", a.id, a.title);
                }}
                placeholder="New Area"
                className="mx-1 my-1 block w-[calc(100%-0.5rem)] rounded border border-sky-400 bg-white px-2 py-1 text-sm outline-none dark:bg-stone-800"
              />
            ) : (
              <Row
                active={view.type === "area" && view.id === a.id}
                onClick={() => { setQuery(""); setView({ type: "area", id: a.id }); }}
                onDoubleClick={() => setEditingEntity(a.id)}
              >
                <span className="flex h-[17px] w-[17px] items-center justify-center">
                  <span className="h-2.5 w-2.5 rounded-sm bg-stone-400" />
                </span>
                <span className="flex-1 truncate font-medium">{a.title || "Untitled Area"}</span>
                <span className="hidden items-center gap-1 group-hover/area:flex">
                  <IconBtn label="New project" onClick={(e) => { e.stopPropagation(); addProject(a.id); }}>
                    <Plus size={13} />
                  </IconBtn>
                  <IconBtn label="Delete area" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete area "${a.title}" and its projects?`)) deleteArea(a.id); }}>
                    <Trash2 size={13} />
                  </IconBtn>
                </span>
              </Row>
            )}
            {projects.filter((p) => p.areaId === a.id).map((p) => {
              const s = projStats(p.id);
              if (editingEntity === p.id)
                return (
                  <input
                    key={p.id}
                    autoFocus
                    defaultValue={p.title}
                    onBlur={(e) => commitEntityName("project", p.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") commitEntityName("project", p.id, p.title);
                    }}
                    placeholder="New Project"
                    className="my-1 ml-7 mr-1 block w-[calc(100%-2rem)] rounded border border-sky-400 bg-white px-2 py-1 text-sm outline-none dark:bg-stone-800"
                  />
                );
              return (
                <div key={p.id} className="group/proj">
                  <Row
                    indent
                    active={view.type === "project" && view.id === p.id}
                    onClick={() => { setQuery(""); setView({ type: "project", id: p.id }); }}
                    onDoubleClick={() => setEditingEntity(p.id)}
                  >
                    <Ring done={s.done} total={s.total} theme={theme} />
                    <span className="flex-1 truncate">{p.title || "Untitled Project"}</span>
                    <span className="hidden group-hover/proj:flex">
                      <IconBtn label="Delete project" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete project "${p.title}"?`)) deleteProject(p.id); }}>
                        <Trash2 size={13} />
                      </IconBtn>
                    </span>
                  </Row>
                </div>
              );
            })}
          </div>
        ))}

        <button
          onClick={addArea}
          className="mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-stone-400 transition hover:bg-stone-200/60 hover:text-stone-600 dark:hover:bg-stone-800/60"
        >
          <Plus size={15} /> New Area
        </button>

        <div className="mt-auto pt-3">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-stone-500 transition hover:bg-stone-200/60 dark:text-stone-400 dark:hover:bg-stone-800/60"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      </aside>

      {/* ------------------------------- CONTENT ------------------------------ */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-8 pb-24 pt-8">
          {searching ? (
            <>
              <header className="mb-5 flex items-center gap-3">
                <Search size={24} className="text-stone-400" strokeWidth={2} />
                <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                  “{query.trim()}”
                </h1>
                <span className="text-sm text-stone-400">{results.length} result{results.length === 1 ? "" : "s"}</span>
              </header>
              {results.length === 0 ? (
                <p className="mt-10 text-sm text-stone-400">No matching to-dos.</p>
              ) : (
                <div className="space-y-1">
                  {results.map((t) => (
                    <TodoRow key={t.id} t={t} projectOf={projectOf} toggle={toggle} theme={theme} onOpen={() => setEditing(t.id)} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <header className="mb-5 flex items-center gap-3">
                {headerInfo.Icon && <headerInfo.Icon size={26} className={headerInfo.color} strokeWidth={2} />}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">{headerInfo.title}</h1>
                  {headerInfo.subtitle && (
                    <div className="text-xs font-medium uppercase tracking-wide text-stone-400">
                      {headerInfo.subtitle}
                    </div>
                  )}
                </div>
                {view.type === "list" && view.id === "trash" && counts.trash > 0 && (
                  <button
                    onClick={() => { if (confirm("Permanently delete all items in Trash?")) emptyTrash(); }}
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
                  >
                    Empty Trash
                  </button>
                )}
              </header>

              <ListBody
                view={view}
                shown={shown}
                headings={headings}
                projectOf={projectOf}
                theme={theme}
                toggle={toggle}
                restore={restore}
                destroy={destroy}
                addHeading={addHeading}
                deleteHeading={deleteHeading}
                openEditor={setEditing}
              />
            </>
          )}
        </div>

        {/* Magic Plus (hidden in logbook, trash, search) */}
        {!searching && !(view.type === "list" && (view.id === "logbook" || view.id === "trash")) && (
          <button
            onClick={addTodo}
            aria-label="New to-do"
            className="absolute bottom-6 left-8 flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-600 active:scale-95"
          >
            <Plus size={24} strokeWidth={2.5} />
          </button>
        )}
      </main>

      {activeTodo && (
        <Editor
          todo={activeTodo}
          areas={areas}
          projects={projects}
          headings={headings}
          patch={patch}
          toggle={toggle}
          trash={trash}
          close={() => {
            if (!activeTodo.title.trim()) trash(activeTodo.id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* --------------------------- the list rendering --------------------------- */
function ListBody({ view, shown, headings, projectOf, theme, toggle, restore, destroy, addHeading, deleteHeading, openEditor }) {
  const Item = ({ t, muted }) => (
    <TodoRow t={t} muted={muted} projectOf={projectOf} toggle={toggle} theme={theme} onOpen={() => openEditor(t.id)} />
  );

  /* Trash: restore / delete-forever affordances */
  if (view.type === "list" && view.id === "trash") {
    if (shown.length === 0)
      return <p className="mt-10 text-sm text-stone-400">Trash is empty.</p>;
    return (
      <div className="space-y-1">
        {shown.map((t) => (
          <div key={t.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-800">
            <div className="min-w-0 flex-1 text-[15px] text-stone-500 line-through">
              {t.title || "Untitled"}
            </div>
            <button onClick={() => restore(t.id)} className="flex items-center gap-1 text-xs text-stone-400 hover:text-sky-500" title="Restore">
              <RotateCcw size={13} /> Restore
            </button>
            <button onClick={() => destroy(t.id)} className="flex items-center gap-1 text-xs text-stone-400 hover:text-rose-500" title="Delete forever">
              <Trash2 size={13} /> Delete
            </button>
          </div>
        ))}
      </div>
    );
  }

  /* Project: group by headings */
  if (view.type === "project") {
    const hs = headings.filter((h) => h.projectId === view.id);
    const ungrouped = shown.filter((t) => !t.heading_id);
    return (
      <div className="space-y-5">
        {ungrouped.length > 0 && <div className="space-y-1">{ungrouped.map((t) => <Item key={t.id} t={t} />)}</div>}
        {hs.map((h) => {
          const items = shown.filter((t) => t.heading_id === h.id);
          return (
            <div key={h.id} className="space-y-1">
              <div className="group/h flex items-center gap-2 border-b border-stone-200 px-1 pb-1 pt-2 text-sm font-semibold text-stone-600 dark:border-stone-700 dark:text-stone-300">
                <Hash size={13} className="text-stone-400" />
                <span className="flex-1">{h.title}</span>
                <button
                  onClick={() => deleteHeading(h.id)}
                  className="hidden text-stone-400 hover:text-rose-500 group-hover/h:block"
                  title="Delete heading"
                >
                  <X size={13} />
                </button>
              </div>
              {items.length === 0 ? (
                <p className="px-1 text-xs text-stone-400">No to-dos under this heading.</p>
              ) : (
                items.map((t) => <Item key={t.id} t={t} />)
              )}
            </div>
          );
        })}
        <AddHeading onAdd={(title) => addHeading(view.id, title)} />
      </div>
    );
  }

  if (shown.length === 0)
    return <p className="mt-10 text-sm text-stone-400">Nothing here yet. Tap + to add a to-do.</p>;

  /* Today: split Today / This Evening */
  if (view.type === "list" && view.id === "today") {
    const evening = shown.filter((t) => t.when === "evening");
    const day = shown.filter((t) => t.when !== "evening");
    return (
      <div className="space-y-1">
        {day.map((t) => <Item key={t.id} t={t} />)}
        {evening.length > 0 && (
          <>
            <div className="flex items-center gap-2 px-1 pb-1 pt-5 text-sm font-semibold text-stone-500 dark:text-stone-400">
              <Moon size={15} /> This Evening
            </div>
            {evening.map((t) => <Item key={t.id} t={t} />)}
          </>
        )}
      </div>
    );
  }

  /* Upcoming: group by scheduled/deadline date */
  if (view.type === "list" && view.id === "upcoming") {
    const groups = {};
    shown.forEach((t) => {
      const key = isDate(t.when) ? t.when : t.deadline;
      (groups[key] ||= []).push(t);
    });
    return (
      <div className="space-y-5">
        {Object.keys(groups).sort().map((k) => (
          <div key={k} className="space-y-1">
            <div className="px-1 pb-1 text-sm font-semibold text-stone-500 dark:text-stone-400">{prettyDate(k)}</div>
            {groups[k].map((t) => <Item key={t.id} t={t} />)}
          </div>
        ))}
      </div>
    );
  }

  /* Logbook: group by completion date, muted + struck */
  if (view.type === "list" && view.id === "logbook") {
    const groups = {};
    shown.forEach((t) => {
      const key = (t.completedAt || "").slice(0, 10) || TODAY;
      (groups[key] ||= []).push(t);
    });
    return (
      <div className="space-y-5">
        {Object.keys(groups).sort().reverse().map((k) => (
          <div key={k} className="space-y-1">
            <div className="px-1 pb-1 text-sm font-semibold text-stone-400">
              {k === TODAY ? "Today" : prettyDate(k)}
            </div>
            {groups[k].map((t) => <Item key={t.id} t={t} muted />)}
          </div>
        ))}
      </div>
    );
  }

  return <div className="space-y-1">{shown.map((t) => <Item key={t.id} t={t} />)}</div>;
}

/* add-heading control inside a project */
function AddHeading({ onAdd }) {
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState("");
  if (!adding)
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex items-center gap-1.5 px-1 pt-2 text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
      >
        <Plus size={14} /> Add Heading
      </button>
    );
  return (
    <input
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => { if (val.trim()) onAdd(val.trim()); setVal(""); setAdding(false); }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && val.trim()) { onAdd(val.trim()); setVal(""); setAdding(false); }
        if (e.key === "Escape") { setVal(""); setAdding(false); }
      }}
      placeholder="Heading name"
      className="mt-1 block w-full rounded border border-sky-400 bg-white px-2 py-1 text-sm font-semibold outline-none dark:bg-stone-800"
    />
  );
}

/* ------------------------------- a todo row ------------------------------- */
function TodoRow({ t, muted, projectOf, toggle, theme, onOpen }) {
  const proj = t.projectId ? projectOf(t.projectId) : null;
  const done = t.status === "completed";
  return (
    <div
      onClick={onOpen}
      className={`group flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 transition hover:bg-stone-100 dark:hover:bg-stone-800 ${
        muted ? "opacity-60" : ""
      }`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); toggle(t.id); }}
        className="mt-0.5 shrink-0"
        aria-label={done ? "Mark as open" : "Complete"}
      >
        {done ? (
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-sky-500 text-white">
            <Check size={13} strokeWidth={3.5} />
          </span>
        ) : (
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border-2 border-stone-300 text-transparent transition group-hover:border-stone-400 dark:border-stone-600">
            <Check size={13} strokeWidth={3.5} />
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className={`text-[15px] leading-tight ${done ? "text-stone-400 line-through" : "text-stone-800 dark:text-stone-200"}`}>
          {t.title || <span className="text-stone-300 dark:text-stone-600">New To-Do</span>}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {proj && (
            <span className="flex items-center gap-1 text-xs text-stone-400">
              <Folder size={11} /> {proj.title}
            </span>
          )}
          {t.checklist.length > 0 && (
            <span className="text-xs text-stone-400">
              {t.checklist.filter((c) => c.done).length}/{t.checklist.length}
            </span>
          )}
          {t.repeat && !done && <Repeat size={11} className="text-stone-400" />}
          {t.reminder && !done && (
            <span className="flex items-center gap-1 text-xs text-stone-400">
              <Bell size={11} /> {prettyReminder(t.reminder)}
            </span>
          )}
          {t.tags.map((tag) => (
            <span key={tag} className="rounded bg-stone-200 px-1.5 py-px text-[10px] font-medium text-stone-500 dark:bg-stone-700 dark:text-stone-300">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {t.deadline && !done && (
        <span
          className={`mt-0.5 flex shrink-0 items-center gap-1 text-xs font-medium ${
            daysUntil(t.deadline) <= 1 ? "text-rose-500" : "text-stone-400"
          }`}
        >
          <Flag size={12} /> {deadlineLabel(t.deadline)}
        </span>
      )}
    </div>
  );
}

/* --------------------------------- editor --------------------------------- */
function Editor({ todo, areas, projects, headings, patch, toggle, trash, close }) {
  const [chk, setChk] = useState("");
  const titleRef = useRef(null);
  useEffect(() => { titleRef.current?.focus(); }, []);

  const done = todo.status === "completed";
  const setWhen = (w) => patch(todo.id, { when: w });
  const whenBtns = [
    { k: "today", label: "Today", Icon: Star, cls: "text-amber-400" },
    { k: "evening", label: "This Evening", Icon: Moon, cls: "text-indigo-400" },
    { k: "someday", label: "Someday", Icon: Archive, cls: "text-amber-600" },
  ];
  const repeatBtns = [
    { k: "daily", label: "Daily" },
    { k: "weekly", label: "Weekly" },
    { k: "monthly", label: "Monthly" },
  ];
  const projHeadings = todo.projectId ? headings.filter((h) => h.projectId === todo.projectId) : [];

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-stone-900/40 p-6" onClick={close}>
      <div
        className="max-h-[85%] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-stone-800 dark:text-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-3">
          <button onClick={() => toggle(todo.id)} className="mt-1 shrink-0" aria-label={done ? "Mark as open" : "Complete"}>
            {done ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white">
                <Check size={13} strokeWidth={3.5} />
              </span>
            ) : (
              <Circle size={20} className="text-stone-300 dark:text-stone-600" />
            )}
          </button>
          <input
            ref={titleRef}
            value={todo.title}
            onChange={(e) => patch(todo.id, { title: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && close()}
            placeholder="New To-Do"
            className={`w-full border-none bg-transparent text-lg font-semibold outline-none placeholder:text-stone-300 dark:placeholder:text-stone-600 ${done ? "text-stone-400 line-through" : "text-stone-900 dark:text-stone-100"}`}
          />
          <button onClick={close} className="rounded p-1 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700" aria-label="Done">
            <X size={18} />
          </button>
        </div>

        <textarea
          value={todo.notes}
          onChange={(e) => patch(todo.id, { notes: e.target.value })}
          placeholder="Notes"
          rows={2}
          className="mb-5 w-full resize-none rounded-lg bg-stone-50 p-3 text-sm text-stone-700 outline-none placeholder:text-stone-400 dark:bg-stone-900 dark:text-stone-200"
        />

        {/* checklist */}
        <div className="mb-5">
          {todo.checklist.map((c) => (
            <div key={c.id} className="group/c flex items-center gap-2 py-1">
              <button
                onClick={() =>
                  patch(todo.id, {
                    checklist: todo.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)),
                  })
                }
              >
                {c.done ? (
                  <span className="flex h-[15px] w-[15px] items-center justify-center rounded-[4px] bg-sky-500 text-white">
                    <Check size={11} strokeWidth={3.5} />
                  </span>
                ) : (
                  <span className="h-[15px] w-[15px] rounded-[4px] border-2 border-stone-300 dark:border-stone-600" />
                )}
              </button>
              <span className={`flex-1 text-sm ${c.done ? "text-stone-400 line-through" : "text-stone-700 dark:text-stone-200"}`}>
                {c.title}
              </span>
              <button
                onClick={() => patch(todo.id, { checklist: todo.checklist.filter((x) => x.id !== c.id) })}
                className="hidden text-stone-300 hover:text-rose-500 group-hover/c:block"
                aria-label="Remove checklist item"
              >
                <X size={13} />
              </button>
            </div>
          ))}
          <input
            value={chk}
            onChange={(e) => setChk(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && chk.trim()) {
                patch(todo.id, { checklist: [...todo.checklist, { id: uid(), title: chk.trim(), done: false }] });
                setChk("");
              }
            }}
            placeholder="+ Add checklist item"
            className="mt-1 w-full border-none bg-transparent text-sm outline-none placeholder:text-stone-400"
          />
        </div>

        {/* WHEN */}
        <Field label="When">
          <div className="flex flex-wrap gap-2">
            {whenBtns.map((b) => (
              <Chip key={b.k} active={todo.when === b.k} onClick={() => setWhen(todo.when === b.k ? null : b.k)}>
                <b.Icon size={14} className={b.cls} /> {b.label}
              </Chip>
            ))}
            <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1 text-sm text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-700/50">
              <CalendarDays size={14} className="text-rose-400" />
              <input
                type="date"
                value={isDate(todo.when) ? todo.when : ""}
                onChange={(e) => setWhen(e.target.value || null)}
                className="bg-transparent text-sm outline-none dark:[color-scheme:dark]"
              />
            </label>
            {todo.when && (
              <button onClick={() => setWhen(null)} className="rounded-full px-2 text-sm text-stone-400 hover:text-stone-600">
                Clear
              </button>
            )}
          </div>
        </Field>

        {/* DEADLINE */}
        <Field label="Deadline">
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1 text-sm text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-700/50">
              <Flag size={14} className="text-rose-500" />
              <input
                type="date"
                value={todo.deadline || ""}
                onChange={(e) => patch(todo.id, { deadline: e.target.value || null })}
                className="bg-transparent text-sm outline-none dark:[color-scheme:dark]"
              />
            </label>
            {todo.deadline && (
              <span className="text-xs font-medium text-rose-500">{deadlineLabel(todo.deadline)}</span>
            )}
            {todo.deadline && (
              <button onClick={() => patch(todo.id, { deadline: null })} className="text-sm text-stone-400 hover:text-stone-600">
                Clear
              </button>
            )}
          </div>
        </Field>

        {/* REMINDER */}
        <Field label="Reminder">
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1 text-sm text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-700/50">
              <Bell size={14} className="text-violet-400" />
              <input
                type="datetime-local"
                value={todo.reminder || ""}
                onChange={(e) => patch(todo.id, { reminder: e.target.value || null })}
                className="bg-transparent text-sm outline-none dark:[color-scheme:dark]"
              />
            </label>
            {todo.reminder && (
              <button onClick={() => patch(todo.id, { reminder: null })} className="text-sm text-stone-400 hover:text-stone-600">
                Clear
              </button>
            )}
          </div>
        </Field>

        {/* REPEAT */}
        <Field label="Repeat">
          <div className="flex flex-wrap gap-2">
            {repeatBtns.map((b) => (
              <Chip key={b.k} active={todo.repeat === b.k} onClick={() => patch(todo.id, { repeat: todo.repeat === b.k ? null : b.k })}>
                <Repeat size={13} className="text-stone-400" /> {b.label}
              </Chip>
            ))}
            {todo.repeat && (
              <button onClick={() => patch(todo.id, { repeat: null })} className="rounded-full px-2 text-sm text-stone-400 hover:text-stone-600">
                Clear
              </button>
            )}
          </div>
        </Field>

        {/* MOVE */}
        <Field label="List">
          <select
            value={todo.projectId || todo.areaId || ""}
            onChange={(e) => {
              const v = e.target.value;
              const proj = projects.find((p) => p.id === v);
              if (proj) patch(todo.id, { projectId: proj.id, areaId: proj.areaId, heading_id: null });
              else if (areas.find((a) => a.id === v)) patch(todo.id, { projectId: null, areaId: v, heading_id: null });
              else patch(todo.id, { projectId: null, areaId: null, heading_id: null });
            }}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
          >
            <option value="">Inbox / none</option>
            {areas.map((a) => (
              <optgroup key={a.id} label={a.title || "Untitled Area"}>
                <option value={a.id}>{a.title || "Untitled Area"} (area)</option>
                {projects.filter((p) => p.areaId === a.id).map((p) => (
                  <option key={p.id} value={p.id}>{p.title || "Untitled Project"}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>

        {/* HEADING (only when in a project that has headings) */}
        {projHeadings.length > 0 && (
          <Field label="Heading">
            <select
              value={todo.heading_id || ""}
              onChange={(e) => patch(todo.id, { heading_id: e.target.value || null })}
              className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
            >
              <option value="">No heading</option>
              {projHeadings.map((h) => (
                <option key={h.id} value={h.id}>{h.title}</option>
              ))}
            </select>
          </Field>
        )}

        {/* TAGS */}
        <Field label="Tags">
          <input
            value={todo.tags.join(", ")}
            onChange={(e) =>
              patch(todo.id, { tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
            }
            placeholder="Important, Errand…"
            className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-sm outline-none placeholder:text-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
          />
        </Field>

        <div className="mt-6 flex justify-between border-t border-stone-100 pt-4 dark:border-stone-700">
          <button
            onClick={() => trash(todo.id)}
            className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-rose-500"
          >
            <Trash2 size={15} /> Delete
          </button>
          <button
            onClick={close}
            className="rounded-lg bg-sky-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ small pieces ------------------------------ */
function Row({ children, active, onClick, onDoubleClick, indent }) {
  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[15px] transition ${
        indent ? "pl-7" : ""
      } ${active
        ? "bg-sky-500/15 font-medium text-sky-700 dark:bg-sky-500/25 dark:text-sky-300"
        : "text-stone-700 hover:bg-stone-200/60 dark:text-stone-300 dark:hover:bg-stone-800/60"}`}
    >
      {children}
    </button>
  );
}
const IconBtn = ({ children, onClick, label }) => (
  <span
    role="button"
    aria-label={label}
    onClick={onClick}
    className="flex h-5 w-5 items-center justify-center rounded text-stone-400 hover:bg-stone-300/60 hover:text-stone-700 dark:hover:bg-stone-700"
  >
    {children}
  </span>
);
const Badge = ({ children }) => (
  <span className="rounded-full bg-stone-300/70 px-1.5 py-px text-xs font-semibold text-stone-600 dark:bg-stone-700 dark:text-stone-300">
    {children}
  </span>
);
function Ring({ done, total, big, theme }) {
  const s = big ? 22 : 15;
  const r = big ? 8 : 5.5;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  const track = theme === "dark" ? "#44403c" : "#d6d3d1";
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="shrink-0 -rotate-90">
      <circle cx={s / 2} cy={s / 2} r={r} fill="none" stroke={track} strokeWidth={big ? 2.5 : 2} />
      <circle
        cx={s / 2} cy={s / 2} r={r} fill="none" stroke="#0ea5e9"
        strokeWidth={big ? 2.5 : 2} strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        strokeLinecap="round"
      />
    </svg>
  );
}
const Field = ({ label, children }) => (
  <div className="mb-4 flex flex-col gap-1.5 sm:flex-row sm:items-center">
    <div className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</div>
    <div className="flex-1">{children}</div>
  </div>
);
const Chip = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
      active
        ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
        : "border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-700/50"
    }`}
  >
    {children}
  </button>
);

/* header info for a view */
function viewHeader(view, areas, projects) {
  if (view.type === "project") {
    const p = projects.find((x) => x.id === view.id);
    const a = areas.find((x) => x.id === p?.areaId);
    return { title: p?.title || "Untitled Project", subtitle: a?.title };
  }
  if (view.type === "area") {
    const a = areas.find((x) => x.id === view.id);
    return { title: a?.title || "Untitled Area", subtitle: "Area" };
  }
  const l = LISTS.find((x) => x.id === view.id);
  return { title: l?.name, Icon: l?.Icon, color: l?.color };
}
