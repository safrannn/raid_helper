"use client";

import {
  Avatar,
  SharedSelection,
  NavbarItem,
  Tabs,
  Tab,
  Select,
  SelectItem,
  SelectSection,
} from "@heroui/react";
import { useEffect, useState, Key } from "react";
import {
  Boss,
  TimelineBossSpellsReturn,
  BossMap,
  BossSpellMap,
  BossSpell,
} from "@/app/types";
import { Timeline } from "animation-timeline-js";
import createRow, {
  createIntervalKeyframes,
  createSingleKeyframe,
  TimelineKeyframeExtra,
  TimelineModelExtra,
} from "@/app/timeline/createRow";
import useEditorStore from "@/app/timeline/states";

export const FRAME_RATE = 1000;

interface UseBossListListenerArgs {
  timeline: Timeline | undefined;
  timelineElRef: React.RefObject<HTMLDivElement>;
  timelineModel: TimelineModelExtra;
  bossName: string;
  difficulty: string;
  setBossSpellMap: (bossSpellMap: BossSpellMap) => void;
}

export const createKeyframeFromSpell = (
  spellCastData: TimelineBossSpellsReturn
) => {
  var bossKeyFrames = [];
  var keyframeGroupId =
    spellCastData.keyframe_group_id.toString() +
    "__" +
    spellCastData.spell_id +
    "__" +
    spellCastData.icon_url;
  if (spellCastData.spell_duration === 0) {
    var newKeyframe: TimelineKeyframeExtra = createSingleKeyframe({
      start: Math.round(spellCastData.start_cast * FRAME_RATE),
      keyframe_group_id: keyframeGroupId,
    });
    bossKeyFrames.push(newKeyframe);
  } else {
    var newKeyframes: TimelineKeyframeExtra[] = createIntervalKeyframes({
      start: Math.round(spellCastData.start_cast * FRAME_RATE),
      duration: Math.round(spellCastData.spell_duration * FRAME_RATE),
      keyframe_group_id: keyframeGroupId,
    });
    bossKeyFrames.push(newKeyframes[0], newKeyframes[1]);
  }
  return bossKeyFrames;
};

// load selected boss data from server
const useBossListListener = async ({
  timeline,
  timelineElRef,
  timelineModel,
  bossName,
  difficulty,
  setBossSpellMap,
}: UseBossListListenerArgs) => {
  if (timeline) {
    try {
      var encodedUrl = encodeURI(
        `http://localhost:3001/get_timeline_boss_spells/${bossName}/${difficulty}`
      );
      const response = await fetch(encodedUrl);
      const data: [TimelineBossSpellsReturn] = await response.json();

      var bossKeyFrames: TimelineKeyframeExtra[] = [];
      var newBossSpellMap: BossSpellMap = new Map();
      for (var spellCastData of data) {
        for (var bossKeyFrame of createKeyframeFromSpell(spellCastData)) {
          bossKeyFrames.push(bossKeyFrame);
        }
        newBossSpellMap.set(
          spellCastData.spell_id,
          new BossSpell(
            spellCastData.spell_name,
            spellCastData.spell_id,
            spellCastData.icon_url,
            spellCastData.spell_type.replace(/"/g, ""),
            true
          )
        );
      }

      var newBossTimelineRowName = "boss__" + bossName + "__" + difficulty;
      const newBossTimelineRow = createRow({
        row_id: newBossTimelineRowName,
        keyframes: bossKeyFrames,
      });

      timelineModel!.rows = [];
      if (timelineModel && bossKeyFrames.length > 0) {
        timelineModel!.rows.push(newBossTimelineRow);
      }
      timeline?.setModel(timelineModel!);

      setBossSpellMap(newBossSpellMap);

      timeline?._renderKeyframes();
    } catch (error) {
      console.error("Error fetching boss list:", error);
    }
  }
};

interface UseBossListArgs {
  timeline: Timeline | undefined;
  timelineElRef: React.RefObject<HTMLDivElement>;
}

export const BossList = ({ timeline, timelineElRef }: UseBossListArgs) => {
  const timelineModel = useEditorStore((state) => state.timelineModel);
  const bossName_ = useEditorStore((state) => state.bossName);
  const setBossName_ = useEditorStore((state) => state.setBossName);
  const difficulty_ = useEditorStore((state) => state.difficulty);
  const setDifficulty_ = useEditorStore((state) => state.setDifficulty);
  const setAllowLoadFight_ = useEditorStore((state) => state.setAllowLoadFight);
  const setBossMap_ = useEditorStore((state) => state.setBossMap);
  const setBossSpellMap = useEditorStore((state) => state.setBossSpellMap);
  const [sortedRaidList, setSortedRaidList] = useState<Array<[string, Boss[]]>>(
    new Array()
  );

  // Load the boss list on page load
  useEffect(() => {
    const loadBossList = async () => {
      try {
        const response = await fetch("http://localhost:3001/list_boss");
        const data: Array<[string, Array<Boss>]> = await response.json();
        setSortedRaidList(data);
        var newBossMap: BossMap = new Map();
        for (var raidData of data) {
          for (var bossData of raidData[1]) {
            newBossMap.set(bossData.name, {
              bossIcon: bossData.icon,
              raidName: raidData[0],
            });
          }
        }
        setBossMap_(newBossMap);
      } catch (error) {
        console.error("Error fetching boss list:", error);
      }
    };
    loadBossList();
  }, []);

  const handleBossOnSelectionChange = async (keys: SharedSelection) => {
    if (keys.currentKey) {
      setBossName_(keys.currentKey!);
    }
  };

  const handleDifficultyOnSelectionChange = async (key: Key) => {
    setDifficulty_(key.toString());
  };

  useEffect(() => {
    const updateBossInfo = async () => {
      if (bossName_ !== "" && difficulty_ !== "") {
        setBossName_(bossName_);
        setDifficulty_(difficulty_);
        await useBossListListener({
          timeline,
          timelineElRef,
          timelineModel,
          bossName: bossName_,
          difficulty: difficulty_,
          setBossSpellMap,
        });
        setAllowLoadFight_(true);
      } else {
        setAllowLoadFight_(false);
      }
    };
    updateBossInfo();
  }, [bossName_, difficulty_]);

  return (
    <>
      <NavbarItem className="flex w-1/3 ">
        <Select
          className="flex flex-wrap items-end md:flex-nowrap mb-6 md:mb-0 "
          key="bossSelection"
          placeholder="Select an encounter"
          aria-label="Encounter"
          variant="flat"
          radius="sm"
          fullWidth={true}
          selectedKeys={[bossName_]}
          selectionMode="single"
          onSelectionChange={handleBossOnSelectionChange}
          items={sortedRaidList}
          isRequired={true}
        >
          {(raid: [string, Boss[]]) => {
            var raidName: string = raid[0];
            var bossListOfRaid: Boss[] = raid[1];
            return (
              <SelectSection key={raidName} title={raidName}>
                {bossListOfRaid.map((boss) => (
                  <SelectItem
                    key={boss.name}
                    startContent={
                      <Avatar
                        className="flex-shrink-0"
                        size="sm"
                        src={boss.icon}
                      />
                    }
                  >
                    {boss.name}
                  </SelectItem>
                ))}
              </SelectSection>
            );
          }}
        </Select>
      </NavbarItem>

      <NavbarItem>
        <Tabs
          key={"difficulty"}
          aria-label="difficulty"
          color="primary"
          radius="full"
          size="sm"
          variant={"solid"}
          selectedKey={difficulty_}
          onSelectionChange={handleDifficultyOnSelectionChange}
          classNames={{
            tabList: "gap-0",
          }}
        >
          <Tab key="Heroic" title="H" className="text-md" />
          <Tab key="Mythic" title="M" className="text-md" />
        </Tabs>
      </NavbarItem>
    </>
  );
};
