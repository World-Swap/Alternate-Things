import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Inbox, Star, CalendarDays, Layers, Archive, CheckCircle2,
  Plus, Flag, Circle, Check, X, Folder, Trash2, Moon, ChevronRight,
} from "lucide-react";

/* ------------------------------ date helpers ------------------------------ */
const iso = (d) => d.toISOString().slice(0, 10);
const TODAY = iso(new Date());
const addDays = (base, n) => {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + n);
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

/* -------------------------------- seed data ------------------------------- */
let _id = 0;
const uid = () => `id${++_id}`;

const AREAS = [
  { id: "a-work", title: "Work" },
  { id: "a-family", title: "Family" },
  { id: "a-hobbies", title: "Hobbies" },
];
const PROJECTS = [
  { id: "p-present", title: "Prepare Presentation", areaId: "a-work" },
  { id: "p-julia", title: "Onboard Julia", areaId: "a-work" },
  { id: "p-rome", title: "Vacation in Rome", areaId: "a-family" },
  { id: "p-eve", title: "Throw Party for Eve", areaId: "a-family" },
];
const mk = (t, extra = {}) => ({
  id: uid(), title: t, notes: "", tags: [], checklist: [],
  when: null, deadline: null, projectId: null, areaId: null,
  status: "open", completedAt: null, ...extra,
});
const SEED = [
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

/* ------------------------------ list registry ----------------------------- */
const LISTS = [
  { id: "inbox", name: "Inbox", Icon: Inbox, color: "text-sky-500" },
  { id: "today", name: "Today", Icon: Star, color: "text-amber-400" },
  { id: "upcoming", name: "Upcoming", Icon: CalendarDays, color: "text-rose-400" },
  { id: "anytime", name: "Anytime", Icon: Layers, color: "text-teal-500" },
  { id: "someday", name: "Someday", Icon: Archive, color: "text-amber-600" },
  { id: "logbook", name: "Logbook", Icon: CheckCircle2, color: "text-emerald-500" },
];

/* ================================== APP =================================== */
export default function App() {
  const [todos, setTodos] = useState(SEED);
  const [view, setView] = useState({ type: "list", id: "today" });
  const [editing, setEditing] = useState(null); // todo id being edited in modal

  const open = (t) => t.status === "open";
  const inToday = (t) =>
    open(t) &&
    (t.when === "today" || t.when === "evening" ||
      (isDate(t.when) && t.when <= TODAY) ||
      (t.deadline && t.deadline <= TODAY));
  const futureScheduled = (t) =>
    open(t) && ((isDate(t.when) && t.when > TODAY) || (!t.when && t.deadline && t.deadline > TODAY));

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
        return todos.filter((t) => t.status === "completed");
      default:
        return [];
    }
  };

  const counts = {
    inbox: todos.filter((t) => open(t) && !t.projectId && !t.areaId && t.when == null).length,
    today: todos.filter(inToday).length,
  };
  const projStats = (pid) => {
    const items = todos.filter((t) => t.projectId === pid);
    const done = items.filter((t) => t.status === "completed").length;
    return { done, total: items.length };
  };

  /* mutations */
  const patch = (id, p) => setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)));
  const toggle = (id) =>
    setTodos((ts) =>
      ts.map((t) =>
        t.id === id
          ? t.status === "open"
            ? { ...t, status: "completed", completedAt: new Date().toISOString() }
            : { ...t, status: "open", completedAt: null }
          : t
      )
    );
  const remove = (id) => {
    setTodos((ts) => ts.filter((t) => t.id !== id));
    if (editing === id) setEditing(null);
  };
  const addTodo = () => {
    const base = mk("");
    if (view.type === "project") { base.projectId = view.id; base.areaId = PROJECTS.find(p => p.id === view.id)?.areaId || null; }
    else if (view.type === "area") base.areaId = view.id;
    else if (view.id === "today") base.when = "today";
    else if (view.id === "someday") base.when = "someday";
    else if (view.id === "upcoming") base.when = addDays(TODAY, 1);
    setTodos((ts) => [...ts, base]);
    setEditing(base.id);
  };

  const activeTodo = todos.find((t) => t.id === editing) || null;
  const headerInfo = viewHeader(view);
  const shown = listFor(view);

  return (
    <div className="flex h-[760px] w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 font-sans text-stone-800 antialiased shadow-sm">
      {/* ------------------------------ SIDEBAR ------------------------------ */}
      <aside className="flex w-60 shrink-0 flex-col overflow-y-auto border-r border-stone-200/70 bg-stone-100/80 px-2.5 py-3">
        <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
          Things
        </div>
        {LISTS.map((l) => (
          <Row
            key={l.id}
            active={view.type === "list" && view.id === l.id}
            onClick={() => setView({ type: "list", id: l.id })}
          >
            <l.Icon size={17} className={l.color} strokeWidth={2} />
            <span className="flex-1">{l.name}</span>
            {l.id === "inbox" && counts.inbox > 0 && <Badge>{counts.inbox}</Badge>}
            {l.id === "today" && counts.today > 0 && <Badge>{counts.today}</Badge>}
          </Row>
        ))}

        <div className="mx-2 my-3 border-t border-stone-200" />

        {AREAS.map((a) => (
          <div key={a.id} className="mb-1">
            <Row
              active={view.type === "area" && view.id === a.id}
              onClick={() => setView({ type: "area", id: a.id })}
            >
              <span className="flex h-[17px] w-[17px] items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-sm bg-stone-400" />
              </span>
              <span className="flex-1 font-medium">{a.title}</span>
            </Row>
            {PROJECTS.filter((p) => p.areaId === a.id).map((p) => {
              const s = projStats(p.id);
              return (
                <Row
                  key={p.id}
                  indent
                  active={view.type === "project" && view.id === p.id}
                  onClick={() => setView({ type: "project", id: p.id })}
                >
                  <Ring done={s.done} total={s.total} />
                  <span className="flex-1 truncate">{p.title}</span>
                </Row>
              );
            })}
          </div>
        ))}
      </aside>

      {/* ------------------------------- CONTENT ------------------------------ */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-8 pb-24 pt-8">
          <header className="mb-5 flex items-center gap-3">
            {headerInfo.Icon && <headerInfo.Icon size={26} className={headerInfo.color} strokeWidth={2} />}
            {headerInfo.ring != null && <Ring done={headerInfo.ring.done} total={headerInfo.ring.total} big />}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">{headerInfo.title}</h1>
              {headerInfo.subtitle && (
                <div className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  {headerInfo.subtitle}
                </div>
              )}
            </div>
          </header>

          <ListBody
            view={view}
            shown={shown}
            todos={todos}
            toggle={toggle}
            openEditor={setEditing}
          />
        </div>

        {/* Magic Plus */}
        <button
          onClick={addTodo}
          aria-label="New to-do"
          className="absolute bottom-6 left-8 flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-600 active:scale-95"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </main>

      {activeTodo && (
        <Editor
          todo={activeTodo}
          patch={patch}
          remove={remove}
          close={() => {
            if (!activeTodo.title.trim()) remove(activeTodo.id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* --------------------------- the list rendering --------------------------- */
function ListBody({ view, shown, todos, toggle, openEditor }) {
  const projectOf = (id) => PROJECTS.find((p) => p.id === id);

  if (shown.length === 0)
    return <p className="mt-10 text-sm text-stone-400">Nothing here yet. Tap + to add a to-do.</p>;

  const Item = ({ t, muted }) => (
    <TodoRow t={t} muted={muted} projectOf={projectOf} toggle={toggle} onOpen={() => openEditor(t.id)} />
  );

  /* Today: split Today / This Evening */
  if (view.type === "list" && view.id === "today") {
    const evening = shown.filter((t) => t.when === "evening");
    const day = shown.filter((t) => t.when !== "evening");
    return (
      <div className="space-y-1">
        {day.map((t) => <Item key={t.id} t={t} />)}
        {evening.length > 0 && (
          <>
            <div className="flex items-center gap-2 px-1 pb-1 pt-5 text-sm font-semibold text-stone-500">
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
            <div className="px-1 pb-1 text-sm font-semibold text-stone-500">{prettyDate(k)}</div>
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

/* ------------------------------- a todo row ------------------------------- */
function TodoRow({ t, muted, projectOf, toggle, onOpen }) {
  const proj = t.projectId ? projectOf(t.projectId) : null;
  const done = t.status === "completed";
  return (
    <div
      onClick={onOpen}
      className={`group flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 transition hover:bg-stone-100 ${
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
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border-2 border-stone-300 text-transparent transition group-hover:border-stone-400">
            <Check size={13} strokeWidth={3.5} />
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className={`text-[15px] leading-tight ${done ? "text-stone-400 line-through" : "text-stone-800"}`}>
          {t.title || <span className="text-stone-300">New To-Do</span>}
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
          {t.tags.map((tag) => (
            <span key={tag} className="rounded bg-stone-200 px-1.5 py-px text-[10px] font-medium text-stone-500">
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
function Editor({ todo, patch, remove, close }) {
  const [chk, setChk] = useState("");
  const titleRef = useRef(null);
  useEffect(() => { titleRef.current?.focus(); }, []);

  const setWhen = (w) => patch(todo.id, { when: w });
  const whenBtns = [
    { k: "today", label: "Today", Icon: Star, cls: "text-amber-400" },
    { k: "evening", label: "This Evening", Icon: Moon, cls: "text-indigo-400" },
    { k: "someday", label: "Someday", Icon: Archive, cls: "text-amber-600" },
  ];

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-stone-900/30 p-6" onClick={close}>
      <div
        className="max-h-[85%] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-3">
          <button onClick={() => patch(todo.id, {})} className="mt-1 shrink-0">
            <Circle size={20} className="text-stone-300" />
          </button>
          <input
            ref={titleRef}
            value={todo.title}
            onChange={(e) => patch(todo.id, { title: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && close()}
            placeholder="New To-Do"
            className="w-full border-none text-lg font-semibold text-stone-900 outline-none placeholder:text-stone-300"
          />
          <button onClick={close} className="rounded p-1 text-stone-400 hover:bg-stone-100" aria-label="Done">
            <X size={18} />
          </button>
        </div>

        <textarea
          value={todo.notes}
          onChange={(e) => patch(todo.id, { notes: e.target.value })}
          placeholder="Notes"
          rows={2}
          className="mb-5 w-full resize-none rounded-lg bg-stone-50 p-3 text-sm text-stone-700 outline-none placeholder:text-stone-400"
        />

        {/* checklist */}
        <div className="mb-5">
          {todo.checklist.map((c) => (
            <div key={c.id} className="flex items-center gap-2 py-1">
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
                  <span className="h-[15px] w-[15px] rounded-[4px] border-2 border-stone-300" />
                )}
              </button>
              <span className={`text-sm ${c.done ? "text-stone-400 line-through" : "text-stone-700"}`}>
                {c.title}
              </span>
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
            <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1 text-sm text-stone-600 hover:bg-stone-50">
              <CalendarDays size={14} className="text-rose-400" />
              <input
                type="date"
                value={isDate(todo.when) ? todo.when : ""}
                onChange={(e) => setWhen(e.target.value || null)}
                className="bg-transparent text-sm outline-none"
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
            <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1 text-sm text-stone-600 hover:bg-stone-50">
              <Flag size={14} className="text-rose-500" />
              <input
                type="date"
                value={todo.deadline || ""}
                onChange={(e) => patch(todo.id, { deadline: e.target.value || null })}
                className="bg-transparent text-sm outline-none"
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

        {/* MOVE */}
        <Field label="List">
          <select
            value={todo.projectId || todo.areaId || ""}
            onChange={(e) => {
              const v = e.target.value;
              const proj = PROJECTS.find((p) => p.id === v);
              if (proj) patch(todo.id, { projectId: proj.id, areaId: proj.areaId });
              else if (AREAS.find((a) => a.id === v)) patch(todo.id, { projectId: null, areaId: v });
              else patch(todo.id, { projectId: null, areaId: null });
            }}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 outline-none"
          >
            <option value="">Inbox / none</option>
            {AREAS.map((a) => (
              <optgroup key={a.id} label={a.title}>
                <option value={a.id}>{a.title} (area)</option>
                {PROJECTS.filter((p) => p.areaId === a.id).map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>

        {/* TAGS */}
        <Field label="Tags">
          <input
            value={todo.tags.join(", ")}
            onChange={(e) =>
              patch(todo.id, { tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
            }
            placeholder="Important, Errand…"
            className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-sm outline-none placeholder:text-stone-400"
          />
        </Field>

        <div className="mt-6 flex justify-between border-t border-stone-100 pt-4">
          <button
            onClick={() => remove(todo.id)}
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
function Row({ children, active, onClick, indent }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[15px] transition ${
        indent ? "pl-7" : ""
      } ${active ? "bg-sky-500/15 font-medium text-sky-700" : "text-stone-700 hover:bg-stone-200/60"}`}
    >
      {children}
    </button>
  );
}
const Badge = ({ children }) => (
  <span className="rounded-full bg-stone-300/70 px-1.5 py-px text-xs font-semibold text-stone-600">
    {children}
  </span>
);
function Ring({ done, total, big }) {
  const s = big ? 22 : 15;
  const r = big ? 8 : 5.5;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="shrink-0 -rotate-90">
      <circle cx={s / 2} cy={s / 2} r={r} fill="none" stroke="#d6d3d1" strokeWidth={big ? 2.5 : 2} />
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
      active ? "border-sky-500 bg-sky-50 text-sky-700" : "border-stone-200 text-stone-600 hover:bg-stone-50"
    }`}
  >
    {children}
  </button>
);

/* header info for a view */
function viewHeader(view) {
  if (view.type === "project") {
    const p = PROJECTS.find((x) => x.id === view.id);
    const a = AREAS.find((x) => x.id === p?.areaId);
    return { title: p?.title, subtitle: a?.title, ring: null };
  }
  if (view.type === "area") {
    const a = AREAS.find((x) => x.id === view.id);
    return { title: a?.title, subtitle: "Area" };
  }
  const l = LISTS.find((x) => x.id === view.id);
  return { title: l?.name, Icon: l?.Icon, color: l?.color };
}
