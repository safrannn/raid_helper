"use client";

import "vis-timeline/styles/vis-timeline-graph2d.min.css";
import "./visTimeline.css";

import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { Button } from "@heroui/button";
import { addToast, useDisclosure } from "@heroui/react";
import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarItem,
} from "@heroui/navbar";
import { PauseIcon, PlayIcon, StopIcon } from "@heroicons/react/24/solid";
import type { Timeline } from "vis-timeline/standalone";
import useEditorStore from "@/app/states";
import { BossSelection } from "@/app/bossSelection";
import { SpellDetails } from "@/app/spellDetails";
import { EncounterNotes } from "@/app/encounterNotes";
import { AddNewPlayerModal } from "@/app/timelineOutline";
import {
  ADD_PLAYER_GROUP_ID,
  FIGHT_LENGTH_MS,
  INITIAL_VISIBLE_MS,
  PLAYHEAD_ID,
  RowGroup,
  formatFightTime,
  keyframeGroupIdOf,
  loadBossRow,
  loadPlayerRows,
  removePlayerSpellCast,
  updatePlayer,
  updatedPlayerRowGroup,
} from "./model";
import { useVisTimeline } from "./useVisTimeline";

const TICK_MS = 50;
const PLAYBACK_SPEED = 1;
const SAMPLE_TIME_IN_MS = 50;

// ---- Playback --------------------------------------------------------------

// The playhead position is kept in the store (`playheadMs`) so the spell panel
// can place new casts at it without holding a reference to the timeline.
const usePlayback = (timeline: Timeline | undefined) => {
  const { timelinePlayingState, setTimelineCoarseTime, time, setTime } =
    useEditorStore(
      useShallow((state) => ({
        timelinePlayingState: state.timelinePlayingState,
        setTimelineCoarseTime: state.setTimelineCoarseTime,
        time: state.playheadMs,
        setTime: state.setPlayheadMs,
      })),
    );
  const playing = timelinePlayingState === "playing";

  const setPlayhead = useCallback(
    (ms: number) => {
      if (!timeline) return;
      timeline.setCustomTime(ms, PLAYHEAD_ID);
      setTime(ms);
      // Keep the playhead in view (replaces the scrollLeft/valToPx math).
      const { start, end } = timeline.getWindow();
      const s = start.valueOf();
      const e = end.valueOf();
      if (ms < s || ms > e) {
        timeline.setWindow(ms, ms + (e - s), { animation: false });
      }
    },
    [timeline, setTime],
  );

  useEffect(() => {
    if (!playing || !timeline) return;
    const id = setInterval(() => {
      const cur = timeline.getCustomTime(PLAYHEAD_ID).valueOf();
      let next = cur + TICK_MS * PLAYBACK_SPEED;
      if (next > FIGHT_LENGTH_MS) next = 0;
      setPlayhead(next);
      if (next % SAMPLE_TIME_IN_MS === 0) setTimelineCoarseTime(next);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [playing, timeline, setPlayhead, setTimelineCoarseTime]);

  // User dragged the playhead bar.
  useEffect(() => {
    if (!timeline) return;
    timeline.on("timechanged", (props: { id: string; time: Date }) => {
      if (props.id === PLAYHEAD_ID) setTime(props.time.valueOf());
    });
    return () => timeline.off("timechanged");
  }, [timeline, setTime]);

  return { time, playing, setPlayhead };
};

// ---- Toolbar ---------------------------------------------------------------

interface VisTimelineToolbarProps {
  timeline: Timeline | undefined;
  time: number;
  playing: boolean;
  setPlayhead: (ms: number) => void;
}

const VisTimelineToolbar = ({
  timeline,
  time,
  playing,
  setPlayhead,
}: VisTimelineToolbarProps) => {
  const setTimelinePlayingState = useEditorStore(
    (state) => state.setTimelinePlayingState,
  );

  const onReset = () => {
    setTimelinePlayingState("idle");
    setPlayhead(0);
    timeline?.setWindow(0, INITIAL_VISIBLE_MS, { animation: false });
  };

  return (
    <HeroUINavbar
      className="bg-transparent h-12 rounded-t-md bg-content2"
      isBordered
      maxWidth="full"
      position="sticky"
    >
      <NavbarContent className="h-12 w-full" justify="center">
        <BossSelection />
      </NavbarContent>

      <NavbarContent className="h-12 gap-1" justify="end">
        <NavbarItem>
          <span className="font-mono text-sm tabular-nums text-default-500 pr-2">
            {formatFightTime(time)}
          </span>
        </NavbarItem>
        <NavbarItem>
          {!playing ? (
            <Button
              isIconOnly
              onPress={() => setTimelinePlayingState("playing")}
              className="bg-transparent"
              aria-label="Play"
            >
              <PlayIcon className="size-6 text-500" />
            </Button>
          ) : (
            <Button
              isIconOnly
              onPress={() => setTimelinePlayingState("idle")}
              className="bg-transparent"
              aria-label="Pause"
            >
              <PauseIcon className="size-6 text-500" />
            </Button>
          )}
        </NavbarItem>
        <NavbarItem>
          <Button
            isIconOnly
            onPress={onReset}
            className="bg-transparent"
            aria-label="Reset"
          >
            <StopIcon className="size-6 text-500" />
          </Button>
        </NavbarItem>
      </NavbarContent>
    </HeroUINavbar>
  );
};

const inlineRename = (nameEl: HTMLElement, current: string) =>
  new Promise<string | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = current;
    nameEl.replaceChildren(input);

    let done = false;
    const finish = (value: string | null) => {
      if (done) return;
      done = true;
      nameEl.textContent = current;
      resolve(value);
    };
    input.addEventListener("keydown", (e) => {
      // Keep the keys away from vis and the document-level Delete handler.
      e.stopPropagation();
      if (e.key === "Enter") finish(input.value.trim());
      else if (e.key === "Escape") finish(null);
    });
    input.addEventListener("blur", () => finish(input.value.trim()));
    for (const type of ["pointerdown", "mousedown", "touchstart", "click"]) {
      input.addEventListener(type, (e) => e.stopPropagation());
    }
    input.focus();
    input.select();
  });

const toastPlayerUpdateError = (code: number) =>
  addToast({
    title: "Error",
    description:
      code === -2 ? "Player already exist" : "Unable to update player",
    color: "danger",
  });

const SPLIT_DEFAULT = 0.6;
const SPLIT_MIN = 0.2;
const SPLIT_MAX = 0.85;

// Fraction of the container height given to the top (timeline) panel, plus
// pointer handlers for the divider between the panels.
const useVerticalSplit = (containerRef: React.RefObject<HTMLDivElement>) => {
  const [fraction, setFraction] = useState(SPLIT_DEFAULT);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const next = (e.clientY - rect.top) / rect.height;
      setFraction(Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, next)));
    },
    [dragging, containerRef],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = "row-resize";
    document.body.classList.add("select-none");
    return () => {
      document.body.style.cursor = prev;
      document.body.classList.remove("select-none");
    };
  }, [dragging]);

  return {
    fraction,
    dragging,
    dividerProps: { onPointerDown, onPointerMove, onPointerUp },
  };
};

export const VisTimelineComponent = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const { timeline, items, groups } = useVisTimeline({ containerRef });
  const { time, playing, setPlayhead } = usePlayback(timeline);
  const addPlayer = useDisclosure();
  const editPlayer = useDisclosure();
  const [editingGroup, setEditingGroup] = useState<RowGroup | undefined>();
  const split = useVerticalSplit(layoutRef);

  const {
    bossName,
    difficulty,
    allowLoadFight,
    setVisModel,
    setBossSpellMap,
    setHiddenBossSpellIds,
    setSelectedGroupId,
    removeVisItems,
    updateVisGroup,
  } = useEditorStore(
    useShallow((state) => ({
      bossName: state.bossName,
      difficulty: state.difficulty,
      allowLoadFight: state.allowLoadFight,
      setVisModel: state.setVisModel,
      setBossSpellMap: state.setBossSpellMap,
      setHiddenBossSpellIds: state.setHiddenBossSpellIds,
      setSelectedGroupId: state.setSelectedGroupId,
      removeVisItems: state.removeVisItems,
      updateVisGroup: state.updateVisGroup,
    })),
  );

  // Load boss + player rows when a fight is selected.
  useEffect(() => {
    if (!allowLoadFight) return;
    let cancelled = false;
    (async () => {
      try {
        const [boss, players] = await Promise.all([
          loadBossRow(bossName, difficulty),
          loadPlayerRows(bossName, difficulty),
        ]);
        if (cancelled) return;
        setBossSpellMap(boss.bossSpellMap);
        setHiddenBossSpellIds(boss.hiddenSpellIds);
        setVisModel(
          [...boss.groups, ...players.groups],
          [...boss.items, ...players.items],
        );
        timeline?.setWindow(0, INITIAL_VISIBLE_MS, { animation: false });
      } catch (error) {
        console.error("Error loading fight:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowLoadFight, bossName, difficulty]);

  // Double-clicking a player label renames it in place; class/spec are kept.
  const renamePlayer = useCallback(
    async (group: RowGroup) => {
      if (group.playerId === undefined) return;
      const nameEl = containerRef.current?.querySelector<HTMLElement>(
        `[data-group-id="${CSS.escape(group.id)}"] .row-label-name`,
      );
      if (!nameEl || nameEl.querySelector("input")) return;
      const name = await inlineRename(nameEl, group.name);
      if (name === null || name === group.name) return;
      if (name === "") {
        addToast({
          title: "Error",
          description: "Please enter a name for player.",
          color: "danger",
        });
        return;
      }
      const className = group.playerClass ?? "Generic";
      const specName = group.playerSpec ?? "*";
      try {
        const code = await updatePlayer(
          group.playerId,
          name,
          className,
          specName,
        );
        if (code < 0) {
          toastPlayerUpdateError(code);
          return;
        }
        updateVisGroup(updatedPlayerRowGroup(group, name, className, specName));
      } catch (error) {
        console.error("Error renaming player:", error);
      }
    },
    [updateVisGroup],
  );

  useEffect(() => {
    if (!timeline) return;
    timeline.on(
      "doubleClick",
      (props: {
        what: string | null;
        group: string | null;
        item: string | null;
      }) => {
        if (props.what === "group-label" && props.group) {
          const group = groups.get(props.group);
          if (group?.kind === "player") renamePlayer(group);
          return;
        }
        if (!props.item) return;
        const clicked = items.get(props.item);
        if (!clicked) return;
        const ids = items
          .get({ filter: (i) => i.spellId === clicked.spellId })
          .map((i) => i.id);
        timeline.setSelection(ids);
      },
    );
    return () => timeline.off("doubleClick");
  }, [timeline, items, groups, renamePlayer]);

  const hasFight = bossName !== "" && difficulty !== "";
  useEffect(() => {
    if (!timeline) return;
    timeline.on(
      "click",
      (props: {
        what: string | null;
        group: string | null;
        item: string | null;
        event: Event;
      }) => {
        if (
          hasFight &&
          props.what === "group-label" &&
          props.group === ADD_PLAYER_GROUP_ID
        ) {
          addPlayer.onOpen();
          return;
        }
        if (!props.group) return;
        const group = groups.get(props.group);
        if (
          (props.what === "group-label" || props.item) &&
          group?.kind === "player"
        ) {
          setSelectedGroupId(props.group);
          const target = props.event.target as HTMLElement | null;
          if (
            props.what === "group-label" &&
            target?.closest(".row-label img")
          ) {
            setEditingGroup(group);
            editPlayer.onOpen();
          }
        }
      },
    );
    return () => timeline.off("click");
  }, [
    timeline,
    groups,
    addPlayer.onOpen,
    editPlayer.onOpen,
    hasFight,
    setSelectedGroupId,
  ]);

  // Delete / Backspace removes the selected player casts. Boss casts are
  // never deleted, and keys typed into the notes editor are left alone.
  useEffect(() => {
    if (!timeline) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      const ids = timeline
        .getSelection()
        .map(String)
        .filter(
          (id) => groups.get(items.get(id)?.group ?? "")?.kind === "player",
        );
      if (!ids.length) return;
      e.preventDefault();
      removeVisItems(ids);
      for (const id of ids) removePlayerSpellCast(keyframeGroupIdOf(id));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [timeline, items, groups, removeVisItems]);

  return (
    <div ref={layoutRef} className="flex flex-col w-full h-full">
      <div
        id="timeline-panel"
        style={{ flexBasis: `${split.fraction * 100}%` }}
        className="shrink min-h-0 w-full flex flex-col rounded-md border border-content3"
      >
        <div className="timelineToolbar">
          <VisTimelineToolbar
            timeline={timeline}
            time={time}
            playing={playing}
            setPlayhead={setPlayhead}
          />
        </div>

        <div
          id="outline"
          ref={containerRef}
          className={`vis-raid flex-1 min-h-0 ${playing ? "playing" : ""}`}
        />
        <AddNewPlayerModal
          isOpen={addPlayer.isOpen}
          onOpenChange={addPlayer.onOpenChange}
        />
        <AddNewPlayerModal
          isOpen={editPlayer.isOpen}
          onOpenChange={editPlayer.onOpenChange}
          editing={editingGroup}
        />
      </div>

      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize panels"
        {...split.dividerProps}
        className={`group h-2 shrink-0 cursor-row-resize touch-none flex items-center justify-center ${
          split.dragging ? "bg-primary/40" : "hover:bg-default-300/40"
        }`}
      >
        <div className="w-10 h-0.5 rounded-full bg-default-400 group-hover:bg-default-600" />
      </div>

      <div
        id="utility-panel"
        className="flex-1 min-h-0 flex flex-row overflow-hidden bg-content2 rounded-md border border-gray-500/50"
      >
        <div className="basis-2/3 min-w-0 h-full flex flex-col">
          <SpellDetails />
        </div>

        <div className="basis-1/3 min-w-0 h-full flex border-l border-gray-500/50">
          <EncounterNotes />
        </div>
      </div>
    </div>
  );
};
