"use client";

import { useEffect, useRef, useState } from "react";
import { TimelineToolbar } from "@/app/timelineToolBar";
import TimelineOutline from "@/app/timelineOutline";
import useEditorStore, { initialModel } from "@/app/states";
import {
  useInitTimeline,
  useInitTimelineListeners,
} from "@/app/useInitTimeline";
import {
  createBossRow,
  createIntervalKeyframes,
  createPlayerRow,
  createSingleKeyframe,
  TimelineKeyframeExtra,
  TimelineModelExtra,
  TimelineRowExtra,
} from "./createRow";
import {
  BossSpell,
  BossSpellMap,
  TimelineBossSpellsReturn,
  TimelinePlayerListWSpellCasts,
} from "./types";
import { Timeline } from "animation-timeline-js";
import { useShallow } from "zustand/shallow";
import { SpellDetails } from "./spellDetails";
import { EncounterNotes } from "./encounterNotes";

export const FRAME_RATE = 1000;

export const createKeyframeFromSpell = (
  keyframe_group_id: number,
  spell_id: number,
  start_cast: number,
  spell_duration: number,
  spell_icon: string,
  visibility: boolean,
) => {
  var keyFrames = [];
  var keyframeGroupId =
    keyframe_group_id.toString() + "__" + spell_id + "__" + spell_icon;
  if (spell_duration === 0) {
    var newKeyframe: TimelineKeyframeExtra = createSingleKeyframe({
      start: Math.round(start_cast * FRAME_RATE),
      keyframe_group_id: keyframeGroupId,
      visibility: visibility,
    });
    keyFrames.push(newKeyframe);
  } else {
    var newKeyframes: TimelineKeyframeExtra[] = createIntervalKeyframes({
      start: Math.round(start_cast * FRAME_RATE),
      duration: Math.round(spell_duration * FRAME_RATE),
      keyframe_group_id: keyframeGroupId,
      visibility: visibility,
    });
    keyFrames.push(newKeyframes[0], newKeyframes[1]);
  }
  return keyFrames;
};

interface BossOnLoadListenerProps {
  newTimelineRows: TimelineRowExtra[];
  bossName: string;
  difficulty: string;
  setBossSpellMap: (bossSpellMap: BossSpellMap) => void;
}

// load selected boss data from server
const BossOnLoadListener = async ({
  newTimelineRows,
  bossName,
  difficulty,
  setBossSpellMap,
}: BossOnLoadListenerProps) => {
  try {
    const newParams = new URLSearchParams({
      boss_name: bossName,
      difficulty: difficulty,
    });
    const paramsString = newParams.toString();
    var encodedUrl = encodeURI(
      `http://localhost:3001/get_timeline_boss_spells?` + paramsString,
    );
    const response = await fetch(encodedUrl);
    const data: TimelineBossSpellsReturn[] = await response.json();

    var bossKeyFrames: TimelineKeyframeExtra[] = [];
    var newBossSpellMap: BossSpellMap = new Map();
    for (var spellCast of data) {
      for (var bossKeyFrame of createKeyframeFromSpell(
        spellCast.keyframe_group_id,
        spellCast.spell_id,
        spellCast.start_cast,
        spellCast.spell_duration,
        spellCast.spell_icon,
        spellCast.visibility,
      )) {
        bossKeyFrames.push(bossKeyFrame);
      }
      newBossSpellMap.set(
        spellCast.spell_id,
        new BossSpell(
          spellCast.spell_name,
          spellCast.spell_id,
          spellCast.spell_icon,
          spellCast.spell_type.replace(/"/g, ""),
          true,
        ),
      );
    }
    setBossSpellMap(newBossSpellMap);
    const newBossTimelineRow = createBossRow(
      bossName,
      difficulty,
      bossKeyFrames,
    );
    console.log("BossOnLoadListener", { bossKeyFrames });
    newTimelineRows.push(newBossTimelineRow);
  } catch (error) {
    console.error("Error fetching boss list:", error);
  }
};

interface PlayerListOnloadListenerProps {
  newTimelineRows: TimelineRowExtra[];
  bossName: string;
  difficulty: string;
}

const PlayerListOnloadListener = async ({
  newTimelineRows,
  bossName,
  difficulty,
}: PlayerListOnloadListenerProps) => {
  try {
    const newParams = new URLSearchParams({
      boss_name: bossName,
      difficulty: difficulty,
    });
    const paramsString = newParams.toString();
    var encodedUrl = encodeURI(
      `http://localhost:3001/get_timeline_player_list_w_spell_casts?` +
        paramsString,
    );
    const response = await fetch(encodedUrl);
    const data: TimelinePlayerListWSpellCasts[] = await response.json();

    for (var playerWSpellCasts of data) {
      const player = playerWSpellCasts.player;
      const spellCasts = playerWSpellCasts.spell_casts;
      const playerKeyframes: TimelineKeyframeExtra[] = [];

      for (var spellCast of spellCasts) {
        for (var playerKeyframe of createKeyframeFromSpell(
          spellCast.keyframe_group_id,
          spellCast.spell_id,
          spellCast.start_cast,
          spellCast.spell_duration,
          spellCast.spell_icon,
          spellCast.visibility,
        )) {
          playerKeyframes.push(playerKeyframe);
        }
      }

      const newPlayerTimelineRow = createPlayerRow(
        player.name,
        player.id,
        player.class_name,
        player.spec_name,
        playerKeyframes,
      );
      newTimelineRows.push(newPlayerTimelineRow);
    }
  } catch (error) {
    console.error("Error fetching boss list:", error);
  }
};

export const TimelineComponent = () => {
  const timelineElRef = useRef<HTMLDivElement>(null);
  const outlineContainerRef = useRef<HTMLDivElement>(null);
  const outlineScrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    bossName,
    difficulty,
    timelineModel,
    setTimelineModel,
    setBossSpellMap,
    allowLoadFight,
  } = useEditorStore(
    useShallow((state) => ({
      bossName: state.bossName,
      difficulty: state.difficulty,
      timelineModel: state.timelineModel,
      setTimelineModel: state.setTimelineModel,
      setBossSpellMap: state.setBossSpellMap,
      allowLoadFight: state.allowLoadFight,
    })),
  );

  const { timeline } = useInitTimeline({ timelineElRef });
  useInitTimelineListeners({
    timeline,
    outlineContainerRef,
    outlineScrollContainerRef,
  });

  useEffect(() => {
    timeline?.setModel(timelineModel);
  }, [timelineModel, timeline]);

  useEffect(() => {
    const loadDataOnBossSelectionChange = async () => {
      if (allowLoadFight) {
        var newTimelineRows: TimelineRowExtra[] = [];
        await BossOnLoadListener({
          newTimelineRows,
          bossName,
          difficulty,
          setBossSpellMap,
        });
        await PlayerListOnloadListener({
          newTimelineRows,
          bossName,
          difficulty,
        });
        var newTimelineModel: TimelineModelExtra = {
          rows: newTimelineRows,
        };
        setTimelineModel(newTimelineModel);
      }
    };
    loadDataOnBossSelectionChange();
  }, [allowLoadFight, bossName, difficulty]);

  return (
    <div className="flex flex-col w-full h-full gap-1">
      <div className="basis-3/4 min-h-0 w-full flex flex-col rounded-md border border-content3">
        <div className="timelineToolbar">
          <TimelineToolbar timeline={timeline} timelineElRef={timelineElRef} />
        </div>

        <div className="flex flex-row flex-1 min-h-0">
          <TimelineOutline
          // timeline={timeline}
          />
          <div
            className="basis-4/5 h-full"
            ref={timelineElRef}
            id="timeline"
          ></div>
        </div>
      </div>

      <div className="basis-3/5 min-h-0 flex flex-row overflow-hidden bg-content2 rounded-md border border-gray-500/50">
        <div className="basis-2/3 min-w-0 h-full flex flex-col">
          <SpellDetails timeline={timeline} />
        </div>

        <div className="basis-2/5 min-w-0 h-full flex border-l border-gray-500/50">
          <EncounterNotes />
        </div>
      </div>
    </div>
  );
};
