"use client";

import {
  addToast,
  Avatar,
  Button,
  CardHeader,
  Chip,
  Link,
  Switch,
} from "@heroui/react";
import "boxicons";
import { Tabs, Tab, Card, CardBody } from "@heroui/react";
import useEditorStore from "./states";
import React, { useEffect, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/solid";
import {
  BossSpell,
  PlayerClassSpecIconMap,
  PlayerSpell,
  PlayerSpellsByClass,
  PlayerSpellsBySpec,
} from "./types";
import { Timeline } from "animation-timeline-js";
import { checkBossRowName, TimelineModelExtra } from "./createRow";
import { useShallow } from "zustand/shallow";
import {
  addPlayerSpellCast,
  castToItem,
  FRAME_RATE,
} from "./visTimeline/model";

function getClassSpecIcon(
  className: string,
  specName: string,
  classSpecIconMap_: PlayerClassSpecIconMap,
) {
  if (specName === "*") {
    return classSpecIconMap_.get(className)!;
  } else {
    return classSpecIconMap_.get(className + "__" + specName)!;
  }
}
const GENERIC_CLASS = "Generic";

// A Generic row (any class) can take any spell; a class row takes its own
// class's spells plus the Generic ones.
export const isSpellAllowedForClass = (
  spellClass: string,
  rowClass: string | undefined,
) =>
  rowClass === undefined ||
  rowClass === GENERIC_CLASS ||
  spellClass === GENERIC_CLASS ||
  spellClass === rowClass;

interface PlayerSpellCardProps {
  spell_name: string;
  spell_class_name: string;
  spell_type: string;
  spell_cool_down: number;
  spell_duration: number;
  spell_id: number;
  spell_icon: string;
  spec_icon: string | undefined;
}

export default function PlayerSpellCard({
  spell_name,
  spell_class_name,
  spell_type,
  spell_cool_down,
  spell_duration,
  spell_id,
  spell_icon,
  spec_icon,
}: PlayerSpellCardProps) {
  const addVisItem = useEditorStore((state) => state.addVisItem);

  const playerSpellAddButtonOnPress = async () => {
    const { bossName, difficulty, selectedGroupId, visGroups, playheadMs } =
      useEditorStore.getState();
    if (bossName === "" || difficulty === "") {
      addToast({
        title: "Error",
        description: "Select an encounter before adding a spell.",
        color: "danger",
      });
      return;
    }
    const group = visGroups.find((g) => g.id === selectedGroupId);
    if (!group || group.kind !== "player" || group.playerId === undefined) {
      addToast({
        title: "Error",
        description: "Click a player row in the timeline first.",
        color: "danger",
      });
      return;
    }
    if (!isSpellAllowedForClass(spell_class_name, group.playerClass)) {
      addToast({
        title: "Error",
        description: `${spell_name} is a ${spell_class_name} spell; the selected row is a ${group.playerClass}.`,
        color: "danger",
      });
      return;
    }
    try {
      const keyframeGroupId = await addPlayerSpellCast(
        group.playerId,
        spell_id,
        playheadMs,
      );
      if (keyframeGroupId < 0) {
        addToast({
          title: "Error",
          description: "Unable to add spell cast",
          color: "danger",
        });
        return;
      }
      addVisItem(
        castToItem(group, {
          keyframe_group_id: keyframeGroupId,
          spell_id,
          spell_name,
          spell_icon,
          start_cast: playheadMs / FRAME_RATE,
          spell_duration,
        }),
      );
    } catch (error) {
      console.error("Error adding spell cast:", error);
    }
  };

  var spell_cool_down_;
  if (spell_cool_down < 60) {
    spell_cool_down_ = spell_cool_down.toString() + "sec";
  } else {
    spell_cool_down_ =
      (spell_cool_down / 60.0)
        .toFixed(1)
        .toString()
        .replace(/[.,]0$/, "") + "min";
  }

  return (
    <Card className="w-full min-w-0" shadow="sm" radius="sm">
      <CardHeader className="flex flex-row gap-2 px-3 pt-2 pb-1 items-center">
        <Link
          isExternal
          href={`https://www.wowhead.com/spell=${spell_id}`}
          className="flex shrink-0"
        >
          <Avatar
            className="text-default-400 w-7 h-7"
            radius="sm"
            src={spell_icon}
          />
        </Link>

        <Link
          isExternal
          href={`https://www.wowhead.com/spell=${spell_id}`}
          className="flex-1 min-w-0 text-xs/4 font-semibold break-words text-default-600"
        >
          {spell_name}
        </Link>

        <Button
          className="shrink-0 h-6 w-6 min-w-6"
          isIconOnly
          color="primary"
          radius="full"
          size="sm"
          variant="solid"
          aria-label={`Add ${spell_name} to the selected row`}
          onPress={playerSpellAddButtonOnPress}
        >
          <PlusIcon className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardBody className="px-3 pt-0 pb-2 flex flex-row flex-wrap gap-x-3 gap-y-1 items-center text-xs text-default-400">
        {spec_icon ? (
          <Avatar
            className="text-default-400 w-4 h-4 shrink-0"
            radius="full"
            src={spec_icon}
          />
        ) : null}
        <Chip
          radius="full"
          size="sm"
          color="secondary"
          variant="flat"
          className="h-5 text-[10px]"
        >
          {spell_type}
        </Chip>
        <div className="flex gap-1">
          <p className="font-semibold">CD</p>
          <p>{spell_cool_down_}</p>
        </div>
        <div className="flex gap-1">
          <p className="font-semibold">Dur</p>
          <p>{spell_duration}s</p>
        </div>
        <div className="flex gap-1">
          <p className="font-semibold">ID</p>
          <p>{spell_id}</p>
        </div>
      </CardBody>
    </Card>
  );
}

interface SpellFilterGroup<T> {
  key: string;
  label: string;
  // Optional icon shown inside the chip (e.g. the spec icon).
  icon?: string;
  items: T[];
}

interface SpellFilterGridProps<T> {
  groups: SpellFilterGroup<T>[];
  itemKey: (item: T) => string | number;
  renderItem: (item: T) => React.ReactNode;
}

function SpellFilterGrid<T>({
  groups,
  itemKey,
  renderItem,
}: SpellFilterGridProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visible =
    selected.size === 0 ? groups : groups.filter((g) => selected.has(g.key));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row flex-wrap gap-1">
        {groups.map((group) => {
          const isSelected = selected.has(group.key);
          return (
            <button
              key={group.key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggle(group.key)}
              className="rounded-full"
            >
              <Chip
                radius="full"
                size="sm"
                color="secondary"
                variant={isSelected ? "solid" : "bordered"}
                className="text-xs/4 tracking-tight cursor-pointer"
                avatar={
                  group.icon ? (
                    <Avatar src={group.icon} radius="full" />
                  ) : undefined
                }
              >
                {group.label}
              </Chip>
            </button>
          );
        })}
      </div>

      <div className="grid gap-1 grid-cols-[repeat(auto-fill,minmax(max(150px,30%),1fr))]">
        {visible.flatMap((group) =>
          group.items.map((item) => (
            <React.Fragment key={`${group.key}-${itemKey(item)}`}>
              {renderItem(item)}
            </React.Fragment>
          )),
        )}
      </div>
    </div>
  );
}

// Player spells: card + the spec icon to show on it.
type PlayerSpellEntry = { spell: PlayerSpell; specIcon: string | undefined };

const renderPlayerSpell = ({ spell, specIcon }: PlayerSpellEntry) => (
  <PlayerSpellCard
    spell_name={spell.name}
    spell_class_name={spell.class_name}
    spell_type={spell.spell_type}
    spell_cool_down={spell.cool_down}
    spell_duration={spell.duration}
    spell_id={spell.id}
    spell_icon={spell.icon}
    spec_icon={specIcon}
  />
);
const playerSpellKey = ({ spell }: PlayerSpellEntry) => spell.id;

interface PlayerSpellTabPanelProps {
  className: string;
  classIcon: string | undefined;
  spells: PlayerSpellsBySpec[];
  classSpecIconMap_: PlayerClassSpecIconMap;
}

// One chip per specialisation of the class, each carrying its spec icon.
export const PlayerSpellTabPanel = ({
  className,
  spells,
  classSpecIconMap_,
}: PlayerSpellTabPanelProps) => {
  const groups: SpellFilterGroup<PlayerSpellEntry>[] = spells.map((item) => {
    const specIcon = getClassSpecIcon(
      className,
      item.spec_name,
      classSpecIconMap_,
    );
    return {
      key: item.spec_name,
      label: item.spec_name === "*" ? "General" : item.spec_name,
      icon: specIcon,
      items: item.spells.map((spell) => ({ spell, specIcon })),
    };
  });
  return (
    <SpellFilterGrid
      groups={groups}
      itemKey={playerSpellKey}
      renderItem={renderPlayerSpell}
    />
  );
};

interface PlayerSpellBySpellTypePanelProps {
  spellsByType: [string, PlayerSpell[]][];
  classSpecIconMap_: PlayerClassSpecIconMap;
  // Class of the selected timeline row; restricts the list when set.
  rowClass?: string;
}

// One chip per spell type across all classes (or just the selected row's
// class plus Generic when a class row is selected).
export const PlayerSpellBySpellTypePanel = ({
  spellsByType,
  classSpecIconMap_,
  rowClass,
}: PlayerSpellBySpellTypePanelProps) => {
  const groups: SpellFilterGroup<PlayerSpellEntry>[] = spellsByType
    .map(([spellType, spells]) => ({
      key: spellType,
      label: spellType,
      items: spells
        .filter((spell) => isSpellAllowedForClass(spell.class_name, rowClass))
        .map((spell) => ({
          spell,
          specIcon: getClassSpecIcon(
            spell.class_name,
            spell.spec_name,
            classSpecIconMap_,
          ),
        })),
    }))
    .filter((group) => group.items.length > 0);
  return (
    <SpellFilterGrid
      groups={groups}
      itemKey={playerSpellKey}
      renderItem={renderPlayerSpell}
    />
  );
};

export const PlayerSpellSelection = () => {
  const { classSpecIconMap, setClassSpecIconMap } = useEditorStore(
    useShallow((state) => ({
      classSpecIconMap: state.classSpecIconMap,
      setClassSpecIconMap: state.setClassSpecIconMap,
    })),
  );
  // Class of the selected timeline row; undefined for no row or a Generic
  // row, both of which leave every class available.
  const rowClass = useEditorStore((state) => {
    const cls = state.visGroups.find(
      (g) => g.id === state.selectedGroupId,
    )?.playerClass;
    return cls === GENERIC_CLASS ? undefined : cls;
  });
  const [selectedTab, setSelectedTab] = useState<string>("spellByType");

  var [playerSpellsBySpellType, setPlayerSpellsBySpellType] = useState<
    [string, PlayerSpell[]][]
  >([]);
  var [playerSpellsByClassSpec, setPlayerSpellsByClassSpec] = useState<
    PlayerSpellsByClass[]
  >([]);

  const loadPlayerClassSpecIcon = async () => {
    try {
      const response = await fetch(
        "http://localhost:3001/get_player_class_spec_icon",
      );
      const data: [string, string, string][] = await response.json();
      var newMap: PlayerClassSpecIconMap = new Map();
      for (var [className, specName, icon] of data) {
        if (specName === "*") {
          newMap.set(className, icon);
        } else {
          newMap.set(className + "__" + specName, icon);
        }
      }
      setClassSpecIconMap(newMap);
    } catch (error) {
      console.error("Error fetching player class and spec icons: ", error);
    }
  };

  const loadPlayerSpellBySpellType = async () => {
    try {
      const response = await fetch(
        "http://localhost:3001/get_player_spells_by_spell_type",
      );
      const data: [string, PlayerSpell[]][] = await response.json();
      // playerSpellsBySpellType = data;
      setPlayerSpellsBySpellType(data);
    } catch (error) {
      console.error("Error fetching player spells", error);
    }
  };

  const loadPlayerSpellByClassSpec = async () => {
    try {
      const response = await fetch(
        "http://localhost:3001/get_player_spells_by_class_spec",
      );
      const data: PlayerSpellsByClass[] = await response.json();
      setPlayerSpellsByClassSpec(data);
    } catch (error) {
      console.error("Error fetching player spells", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await loadPlayerClassSpecIcon();
      await loadPlayerSpellBySpellType();
      await loadPlayerSpellByClassSpec();
    };
    loadData();
  }, []);

  const orderedClassSpecs = [
    ...playerSpellsByClassSpec.filter((c) => c.class_name === GENERIC_CLASS),
    ...playerSpellsByClassSpec.filter((c) => c.class_name !== GENERIC_CLASS),
  ];

  // With a class row selected only that class (and Generic) stays enabled.
  const disabledKeys = rowClass
    ? orderedClassSpecs
        .map((c) => c.class_name)
        .filter((c) => !isSpellAllowedForClass(c, rowClass))
    : [];
  // If the open tab just became unavailable, jump to the row's class.
  useEffect(() => {
    if (rowClass && disabledKeys.includes(selectedTab))
      setSelectedTab(rowClass);
  }, [rowClass, selectedTab, disabledKeys]);

  return (
    <div className="h-full w-full p-0 overflow-auto">
      <Tabs
        aria-label="Options2"
        color="success"
        variant="solid"
        radius="full"
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(String(key))}
        disabledKeys={disabledKeys}
        classNames={{
          base: "w-full",
          tab: "h-10 w-10",
          panel: "h-full w-full",
          tabList: "w-full bg-content1 rounded-lg",
        }}
      >
        <Tab
          key="spellByType"
          title={
            <div className="flex items-center space-x-2">
              <Avatar
                isBordered
                color="default"
                radius="full"
                className="w-7 h-7"
                src="https://wow.zamimg.com/images/wow/icons/large/achievement_guildperk_hastyhearth.jpg"
                classNames={{
                  img: "h-7 w-7",
                }}
              />
            </div>
          }
        >
          <PlayerSpellBySpellTypePanel
            spellsByType={playerSpellsBySpellType}
            classSpecIconMap_={classSpecIconMap}
            rowClass={rowClass}
          />
        </Tab>
        {orderedClassSpecs.map((item) => {
          const classIcon = classSpecIconMap.get(item.class_name)!;
          return item.class_name === "General" ? (
            <></>
          ) : (
            <Tab
              key={item.class_name}
              title={
                <div className="flex items-center space-x-2">
                  <Avatar
                    isBordered
                    color="default"
                    radius="full"
                    className="w-7 h-7"
                    src={classIcon}
                    classNames={{
                      img: "h-7 w-7",
                    }}
                  />
                </div>
              }
            >
              <PlayerSpellTabPanel
                className={item.class_name}
                classIcon={classIcon}
                spells={item.spells_by_spec}
                classSpecIconMap_={classSpecIconMap}
              />
            </Tab>
          );
        })}
      </Tabs>
    </div>
  );
};

interface BossSpellCardProps {
  spellId: number;
  bossSpell: BossSpell;
  timeline?: Timeline;
}

export const BossSpellCard = ({
  spellId,
  bossSpell,
  timeline,
}: BossSpellCardProps) => {
  const {
    bossName,
    difficulty,
    timelineModel,
    setTimelineModel,
    bossSpellMap,
    isHidden,
    setBossSpellHidden,
  } = useEditorStore(
    useShallow((state) => ({
      bossName: state.bossName,
      difficulty: state.difficulty,
      timelineModel: state.timelineModel,
      setTimelineModel: state.setTimelineModel,
      bossSpellMap: state.bossSpellMap,
      isHidden: state.hiddenBossSpellIds.includes(spellId),
      setBossSpellHidden: state.setBossSpellHidden,
    })),
  );

  const setBossSpellVisibility = (isSelected: boolean) => {
    // vis-timeline component reads visibility from the store.
    setBossSpellHidden(spellId, !isSelected);
    // Legacy animation-timeline-js path: mutate keyframes and re-set model.
    if (timeline && bossSpellMap.get(spellId)) {
      for (var row of timelineModel.rows) {
        if (checkBossRowName(bossName, difficulty, row) && row.keyframes) {
          for (var keyframe of row.keyframes) {
            if (
              keyframe.group
                ?.toString()
                .includes("__" + spellId.toString() + "__")
            ) {
              keyframe.hidden = !isSelected;
            }
          }
          const newBossRow = {
            keyframes: row.keyframes,
            id: row.id,
          };
        }
      }
      timeline?.setModel(timelineModel);
    }
  };

  return (
    <Card className="w-full min-w-0" shadow="sm" radius="sm">
      {/* Icon + name take the width; the visibility switch hugs the right. */}
      <CardHeader className="flex flex-row gap-2 px-3 pt-2 pb-1 items-center">
        <Link
          isExternal
          href={`https://www.wowhead.com/spell=${bossSpell.id}`}
          className="flex shrink-0"
        >
          <Avatar
            className="text-default-400 w-7 h-7"
            radius="sm"
            src={bossSpell.icon}
          />
        </Link>

        <Link
          isExternal
          href={`https://www.wowhead.com/spell=${bossSpell.id}`}
          className="flex-1 min-w-0 text-xs/4 font-semibold break-words text-default-600"
        >
          {bossSpell.name}
        </Link>

        <Switch
          isSelected={!isHidden}
          size="sm"
          color="success"
          aria-label={`Show ${bossSpell.name} on the timeline`}
          classNames={{ base: "shrink-0" }}
          onValueChange={setBossSpellVisibility}
        />
      </CardHeader>
      <CardBody className="px-3 pt-0 pb-2 flex flex-row flex-wrap gap-x-3 gap-y-1 items-center text-xs text-default-400">
        {bossSpell.spell_type !== "Default" ? (
          <Chip
            radius="full"
            size="sm"
            color="secondary"
            variant="flat"
            className="h-5 text-[10px]"
          >
            {bossSpell.spell_type}
          </Chip>
        ) : null}
        <div className="flex gap-1">
          <p className="font-semibold">ID</p>
          <p>{bossSpell.id}</p>
        </div>
      </CardBody>
    </Card>
  );
};

interface BossSpellsProps {
  timeline?: Timeline;
}

// One chip per boss spell type; cards toggle timeline visibility.
export const BossSpells = ({ timeline }: BossSpellsProps) => {
  const bossSpellMap = useEditorStore((state) => state.bossSpellMap);

  if (bossSpellMap.size === 0) {
    return <p className="text-center text-default-400">No data available</p>;
  }

  const byType = new Map<string, BossSpell[]>();
  for (const spell of bossSpellMap.values()) {
    const list = byType.get(spell.spell_type) ?? [];
    list.push(spell);
    byType.set(spell.spell_type, list);
  }
  const groups: SpellFilterGroup<BossSpell>[] = Array.from(
    byType.entries(),
    ([spellType, items]) => ({ key: spellType, label: spellType, items }),
  );

  return (
    <SpellFilterGrid
      groups={groups}
      itemKey={(spell) => spell.id}
      renderItem={(spell) => (
        <BossSpellCard
          spellId={spell.id}
          bossSpell={spell}
          timeline={timeline}
        />
      )}
    />
  );
};

interface SpellDetailsProps {
  timeline?: Timeline;
}
export const SpellDetails = ({ timeline }: SpellDetailsProps) => {
  return (
    <Tabs
      aria-label="Options1"
      placement="start"
      color="secondary"
      variant="light"
      radius="sm"
      classNames={{
        tabWrapper: "flex-1 min-h-0 w-full",
        base: "shrink-0 h-full",
        tabList:
          "h-full rounded-none rounded-l-md px-2 py-2 gap-1 border-r border-gray-500/50",
        tab: "h-10 justify-start",
        panel: "flex-1 min-w-0 min-h-0 h-full p-2 overflow-auto",
      }}
    >
      <Tab key="Player" title="Player">
        <div className="h-full w-full">
          <PlayerSpellSelection />
        </div>
      </Tab>
      <Tab key="Boss" title="Boss">
        <BossSpells timeline={timeline} />
      </Tab>
    </Tabs>
  );
};
