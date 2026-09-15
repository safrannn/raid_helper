import { useEffect, useRef, useState } from "react";
import {
  DataSet,
  DataView,
  Timeline,
  type TimelineOptions,
} from "vis-timeline/standalone";
import type { DeepPartial } from "vis-data/declarations/data-interface";
import { useShallow } from "zustand/shallow";
import useEditorStore from "@/app/states";
import {
  ADD_PLAYER_GROUP_ID,
  FIGHT_LENGTH_MS,
  INITIAL_VISIBLE_MS,
  PLAYHEAD_ID,
  SNAP_STEP_MS,
  RowGroup,
  SpellItem,
  formatAxisLabel,
} from "./model";

// senderId stamped on DataSet writes that originate from the store, so the
// write-back listener can ignore its own echoes.
const STORE_SENDER = "store";
const FALLBACK_ICON =
  "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";

// ---- DOM templates ---------------------------------------------------------

// Replaces the `_renderKeyframe` canvas override: plain DOM, styled with CSS.
const itemTemplate = (item?: SpellItem) => {
  const el = document.createElement("div");
  if (!item) return el;
  el.className = "spell-item";

  const img = document.createElement("img");
  img.src = item.spellIcon;
  img.alt = item.spellName;
  img.draggable = false;
  el.appendChild(img);

  if (item.type === "range") {
    const label = document.createElement("span");
    label.textContent = item.spellName;
    el.appendChild(label);
  }
  return el;
};

// Replaces timelineOutline's OutlineNode: vis owns the label column, so the
// scroll sync goes away. Icons are resolved from the store at render time
// because the icon maps load independently of the fight data.
const ADD_PLAYER_GROUP: RowGroup = {
  id: ADD_PLAYER_GROUP_ID,
  content: "Add New Player",
  className: "row-add",
  kind: "add",
  name: "Add New Player",
  subtitle: "",
  color: "#a1a1aa",
  iconKey: "",
};

const PLACEHOLDER_GROUP: RowGroup = {
  ...ADD_PLAYER_GROUP,
  content: "Select an encounter",
  className: "row-placeholder",
  kind: "placeholder",
  name: "Select an encounter",
};

const placeholderTemplate = () => {
  const el = document.createElement("div");
  el.className = "row-label row-label-placeholder";
  const name = document.createElement("div");
  name.className = "row-label-name";
  name.textContent = "Select an encounter";
  el.append(name);
  return el;
};

const addPlayerTemplate = () => {
  const el = document.createElement("div");
  el.className = "row-label row-label-add";
  const plus = document.createElement("span");
  plus.className = "row-label-plus";
  plus.textContent = "+";
  const name = document.createElement("div");
  name.className = "row-label-name";
  name.textContent = "Add New Player";
  el.append(plus, name);
  return el;
};

const groupTemplate = (group?: RowGroup) => {
  const el = document.createElement("div");
  if (!group) return el;
  if (group.kind === "add") return addPlayerTemplate();
  if (group.kind === "placeholder") return placeholderTemplate();
  const { bossMap, classSpecIconMap } = useEditorStore.getState();
  const icon =
    (group.kind === "boss"
      ? bossMap.get(group.iconKey)?.bossIcon
      : classSpecIconMap.get(group.iconKey)) ?? FALLBACK_ICON;

  el.className = "row-label";
  el.style.setProperty("--row-color", group.color);

  const img = document.createElement("img");
  img.src = icon;
  img.alt = "";
  img.draggable = false;
  const text = document.createElement("div");
  text.className = "row-label-text";
  const name = document.createElement("div");
  name.className = "row-label-name";
  name.textContent = group.name;
  const sub = document.createElement("div");
  sub.className = "row-label-sub";
  sub.textContent = group.subtitle;
  text.append(name, sub);
  el.append(img, text);
  return el;
};

// ---- Store ⇄ DataSet sync --------------------------------------------------

// Upsert everything in `next` and drop what is no longer there, without the
// clear()+add() flash (and loss of scroll position) a full reset causes.
function syncDataSet<T extends { id: string }>(ds: DataSet<T>, next: T[]) {
  const nextIds = new Set(next.map((x) => x.id));
  const stale = ds.getIds().filter((id) => !nextIds.has(String(id)));
  if (stale.length) ds.remove(stale, STORE_SENDER);
  // A full T is trivially a DeepPartial<T>; TS just can't prove it for a
  // generic T.
  if (next.length) ds.update(next as DeepPartial<T>[], STORE_SENDER);
}

// ---- Hook ------------------------------------------------------------------

interface UseVisTimelineArgs {
  containerRef: React.RefObject<HTMLDivElement>;
}

export const useVisTimeline = ({ containerRef }: UseVisTimelineArgs) => {
  const [timeline, setTimeline] = useState<Timeline>();
  const itemsRef = useRef(new DataSet<SpellItem>());
  const groupsRef = useRef(new DataSet<RowGroup>());
  const hiddenRef = useRef<Set<number>>(new Set());
  // Filtered view feeding the timeline; hidden boss spells drop out here
  // instead of being deleted from the DataSet.
  const viewRef = useRef(
    new DataView<SpellItem>(itemsRef.current, {
      filter: (item) => !hiddenRef.current.has(item.spellId),
    }),
  );

  const {
    visGroups,
    visItems,
    moveVisItem,
    hiddenBossSpellIds,
    bossMap,
    classSpecIconMap,
    hasFight,
  } = useEditorStore(
    useShallow((state) => ({
      visGroups: state.visGroups,
      visItems: state.visItems,
      moveVisItem: state.moveVisItem,
      hiddenBossSpellIds: state.hiddenBossSpellIds,
      bossMap: state.bossMap,
      classSpecIconMap: state.classSpecIconMap,
      hasFight: state.bossName !== "" && state.difficulty !== "",
    })),
  );

  // Create the timeline once per container.
  useEffect(() => {
    if (!containerRef.current) return;

    const options: TimelineOptions = {
      // Window / bounds
      min: 0,
      max: FIGHT_LENGTH_MS,
      start: 0,
      end: INITIAL_VISIBLE_MS,
      zoomMin: 10_000,
      zoomMax: FIGHT_LENGTH_MS,
      zoomKey: "ctrlKey",
      horizontalScroll: true,
      verticalScroll: true,
      height: "100%",

      // Axis
      orientation: { axis: "top", item: "top" },
      showMajorLabels: false,
      showCurrentTime: false,
      format: { minorLabels: formatAxisLabel },

      // Rows
      stack: false,
      margin: { axis: 0, item: { vertical: 0, horizontal: 0 } },
      groupTemplate,
      groupOrder: "order",

      // Items
      template: itemTemplate,
      editable: {
        updateTime: true,
        updateGroup: false,
        add: false,
        remove: false,
      },
      itemsAlwaysDraggable: { item: true, range: true },
      multiselect: true,
      snap: (date) => Math.round(date.valueOf() / SNAP_STEP_MS) * SNAP_STEP_MS,
      onMove: (item, callback) => {
        // Clamp to the fight, then accept the move (callback(null) rejects).
        const start = Math.max(0, Number(item.start));
        const dur = item.end ? Number(item.end) - Number(item.start) : 0;
        callback({ ...item, start, end: item.end ? start + dur : undefined });
      },
      tooltip: { followMouse: true, delay: 200 },
    };

    const tl = new Timeline(
      containerRef.current,
      viewRef.current,
      groupsRef.current,
      options,
    );
    tl.addCustomTime(0, PLAYHEAD_ID);
    setTimeline(tl);

    return () => {
      tl.destroy();
      setTimeline(undefined);
    };
  }, [containerRef]);

  // Store → DataSets. Store order is row order; the sentinel row is always
  // present and always last, so the label column never disappears. It only
  // becomes the "Add New Player" row once an encounter is selected.
  useEffect(() => {
    syncDataSet(groupsRef.current, [
      ...visGroups.map((g, order) => ({ ...g, order })),
      {
        ...(hasFight ? ADD_PLAYER_GROUP : PLACEHOLDER_GROUP),
        order: Number.MAX_SAFE_INTEGER,
      },
    ]);
  }, [visGroups, hasFight]);
  useEffect(() => {
    syncDataSet(itemsRef.current, visItems);
  }, [visItems]);

  // DataSet → store (user drags).
  useEffect(() => {
    const items = itemsRef.current;
    const onUpdate = (
      _: "update",
      payload: { items: (string | number)[] } | null,
      senderId?: string | number | null,
    ) => {
      if (senderId === STORE_SENDER || !payload) return;
      for (const id of payload.items) {
        const it = items.get(id);
        if (it) {
          moveVisItem(
            String(id),
            Number(it.start),
            it.end === undefined ? undefined : Number(it.end),
          );
        }
      }
    };
    items.on("update", onUpdate);
    return () => items.off("update", onUpdate);
  }, [moveVisItem]);

  // Boss spell visibility → re-filter the view.
  useEffect(() => {
    hiddenRef.current = new Set(hiddenBossSpellIds);
    viewRef.current.refresh();
  }, [hiddenBossSpellIds]);

  // Icon maps arrive asynchronously; poke the groups so labels re-render.
  useEffect(() => {
    const groups = groupsRef.current;
    const ids = groups.getIds();
    if (ids.length)
      groups.update(
        ids.map((id) => ({ id: String(id) })),
        STORE_SENDER,
      );
  }, [bossMap, classSpecIconMap]);

  return { timeline, items: itemsRef.current, groups: groupsRef.current };
};
