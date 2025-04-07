"use client";

import {
  Accordion,
  AccordionItem,
  Avatar,
  Button,
  CardHeader,
  Chip,
  Link,
  ScrollShadow,
  Switch,
} from "@heroui/react";
import "boxicons";
import { Tabs, Tab, Card, CardBody } from "@heroui/react";
import useEditorStore from "./states";
import { useEffect, useState } from "react";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/solid";
import {
  BossSpell,
  PlayerClassSpecIconMap,
  PlayerSpell,
  PlayerSpellsByClass,
  PlayerSpellsBySpec,
  TimelineBossSpellsReturn,
} from "../types";
import { Timeline } from "animation-timeline-js";
import { checkBossRowName, createIntervalKeyframes } from "./createRow";
import { createKeyframeFromSpell, FRAME_RATE } from "../bossList";

function getClassSpecIcon(
  className: string,
  specName: string,
  classSpecIconMap_: PlayerClassSpecIconMap
) {
  if (specName === "/") {
    return classSpecIconMap_.get(className)!;
  } else {
    return classSpecIconMap_.get(className + "_" + specName)!;
  }
}
interface PlayerSpellCardProps {
  spell_name: string;
  spell_type: string;
  spell_cool_down: number;
  spell_cast_duration: number;
  spell_id: number;
  spell_icon: string;
  spec_icon: string | undefined;
}

export default function PlayerSpellCard({
  spell_name,
  spell_type,
  spell_cool_down,
  spell_cast_duration,
  spell_id,
  spell_icon,
  spec_icon,
}: PlayerSpellCardProps) {
  const [isAdded, setIsAdded] = useState<boolean>(false);
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
    <Card className="w-full" shadow="sm" radius="sm">
      <CardHeader className="flex flex-row pt-3 pb-2 items-center justify-between">
        <div className="flex gap-2 items-center ">
          <Link isExternal href={`https://www.wowhead.com/spell=${spell_id}`}>
            <Avatar
              className="text-default-400 w-7 h-7"
              // isBordered
              radius="sm"
              src={spell_icon}
            />
          </Link>

          <Link isExternal href={`https://www.wowhead.com/spell=${spell_id}`}>
            <h3 className="text-small font-semibold leading-none text-default-600 inline-block">
              {spell_name}
            </h3>
          </Link>
          <h5 className="text-small tracking-tight text-default-400">
            <Chip radius="md" size="sm" color="secondary" variant="flat">
              {spell_type}
            </Chip>
          </h5>
        </div>

        <div className="h-6 place-center">
          <Button
            className={isAdded ? "h-6 bg-transparent" : "h-6"}
            isIconOnly
            color="primary"
            radius="sm"
            // size="sm"
            variant={isAdded ? "bordered" : "solid"}
            onPress={() => setIsAdded(!isAdded)}
          >
            {isAdded ? (
              <MinusIcon className="w-5 h-5" />
            ) : (
              <PlusIcon className="w-5 h-5" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardBody className="px-3 pt-0 pb-2 flex flex-row text-small text-default-400 justify-between">
        <div className="gap-3 flex flex-row">
          <div className="flex gap-1">
            <p className="font-semibold text-default-400 text-small">CD</p>
            <p className=" text-default-400 text-small">{spell_cool_down_}</p>
          </div>
          <div className="flex gap-1">
            <p className="font-semibold text-default-400 text-small">
              Duration
            </p>
            <p className="text-default-400 text-small">
              {spell_cast_duration}sec
            </p>
          </div>
          <div className="flex gap-1">
            <p className="font-semibold text-default-400 text-small">ID</p>
            <p className="text-default-400 text-small">{spell_id}</p>
            <p></p>
          </div>
        </div>

        <div className="gap-3 flex flex-row">
          {spec_icon ? (
            <Avatar
              className="text-default-400 w-5 h-5"
              // isBordered
              radius="full"
              src={spec_icon}
            />
          ) : (
            <></>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

interface PlayerSpellPanelSectionProps {
  specIcon: string;
  spells: PlayerSpell[];
}
// Each panel section contains a list of <PlayerSpellCard/>, ordered by either spell types(only in the first panel), or player class specialization, implemented with <Card/>
export const PlayerSpellPanelSection = ({
  specIcon,
  spells,
}: PlayerSpellPanelSectionProps) => {
  return (
    <div className="flex gap-1 flex-col">
      {spells.map((spell) => {
        return (
          <PlayerSpellCard
            key={spell.spell_id}
            spell_name={spell.name}
            spell_type={spell.spell_type}
            spell_cool_down={spell.cool_down}
            spell_cast_duration={spell.cast_duration}
            spell_id={spell.spell_id}
            spell_icon={spell.icon}
            spec_icon={specIcon}
          />
        );
      })}
    </div>
  );
};

interface PlayerSpellTabPanelProps {
  className: string;
  classIcon: string | undefined;
  spells: PlayerSpellsBySpec[];
  classSpecIconMap_: PlayerClassSpecIconMap;
}

// Each panel contains a list of <PlayerSpellPanelSection> ordered by player class, implemented with <Accordion/>
export const PlayerSpellTabPanel = ({
  className,
  classIcon,
  spells,
  classSpecIconMap_,
}: PlayerSpellTabPanelProps) => {
  return (
    <Accordion isCompact variant="light" selectionMode="multiple">
      {spells.map((item) => {
        var specIconShown = getClassSpecIcon(
          className,
          item.spec_name,
          classSpecIconMap_
        );

        const specNameShown =
          item.spec_name === "/" ? "General" : item.spec_name;

        return (
          <AccordionItem
            isCompact
            key={item.spec_name}
            aria-label={item.spec_name}
            title={specNameShown}
            startContent={
              <Avatar
                isBordered
                color="default"
                radius="sm"
                size="sm"
                src={specIconShown}
              />
            }
          >
            <PlayerSpellPanelSection
              specIcon={specIconShown}
              spells={item.spells}
            />
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

interface PlayerSpellBySpellTypePanelProps {
  spellsByType: [string, PlayerSpell[]][];
  classSpecIconMap_: PlayerClassSpecIconMap;
}
export const PlayerSpellBySpellTypePanel = ({
  spellsByType,
  classSpecIconMap_,
}: PlayerSpellBySpellTypePanelProps) => {
  return (
    <Accordion isCompact variant="light" selectionMode="multiple">
      {spellsByType.map(([spellType, spells]) => {
        return (
          <AccordionItem
            isCompact
            key={spellType}
            aria-label={spellType}
            title={
              <Chip radius="md" size="md" color="secondary" variant="flat">
                {spellType}
              </Chip>
            }
          >
            <div className="flex gap-1 flex-col">
              {spells.map((spell) => {
                var specIconShown = getClassSpecIcon(
                  spell.class_name,
                  spell.spec_name,
                  classSpecIconMap_
                );
                return (
                  <PlayerSpellCard
                    key={spell.spell_id}
                    spell_name={spell.name}
                    spell_type={spell.spell_type}
                    spell_cool_down={spell.cool_down}
                    spell_cast_duration={spell.cast_duration}
                    spell_id={spell.spell_id}
                    spell_icon={spell.icon}
                    spec_icon={specIconShown}
                  />
                );
              })}
            </div>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

export const PlayerSpellSelection = () => {
  const classSpecIconMap_ = useEditorStore((state) => state.classSpecIconMap);
  const setClassSpecIconMap_ = useEditorStore(
    (state) => state.setClassSpecIconMap
  );
  var [playerSpellsBySpellType, setPlayerSpellsBySpellType] = useState<
    [string, PlayerSpell[]][]
  >([]);
  var [playerSpellsByClassSpec, setPlayerSpellsByClassSpec] = useState<
    PlayerSpellsByClass[]
  >([]);

  const loadPlayerClassSpecIcon = async () => {
    try {
      const response = await fetch(
        "http://localhost:3001/get_player_class_spec_icon"
      );
      const data: [string, string, string][] = await response.json();
      var newMap: PlayerClassSpecIconMap = new Map();
      for (var [className, specName, icon] of data) {
        if (specName === "/") {
          newMap.set(className, icon);
        } else {
          newMap.set(className + "_" + specName, icon);
        }
      }
      setClassSpecIconMap_(newMap);
    } catch (error) {
      console.error("Error fetching player class and spec icons: ", error);
    }
  };

  const loadPlayerSpellBySpellType = async () => {
    try {
      const response = await fetch(
        "http://localhost:3001/get_player_spells_by_spell_type"
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
        "http://localhost:3001/get_player_spells_by_class_spec"
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

  return (
    <div className="h-full px-1 py-0 overflow-auto">
      <Tabs
        aria-label="Options2"
        color="success"
        variant="solid"
        radius="full"
        placement="start"
        classNames={{
          tab: "h-11 w-11",
          panel: "h-full w-full pl-3 pr-0",
          tabList: "bg-content1 p-2 rounded-lg",
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
                size="sm"
                src="https://wow.zamimg.com/images/wow/icons/large/achievement_guildperk_hastyhearth.jpg"
                classNames={{
                  img: "h-15 w-15",
                }}
              />
            </div>
          }
        >
          <PlayerSpellBySpellTypePanel
            spellsByType={playerSpellsBySpellType}
            classSpecIconMap_={classSpecIconMap_}
          />
        </Tab>
        {playerSpellsByClassSpec.map((item) => {
          const classIcon = classSpecIconMap_.get(item.class_name)!;

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
                    size="sm"
                    src={classIcon}
                    classNames={{
                      img: "h-15 w-15",
                    }}
                  />
                </div>
              }
            >
              <PlayerSpellTabPanel
                className={item.class_name}
                classIcon={classIcon}
                spells={item.spells_by_spec}
                classSpecIconMap_={classSpecIconMap_}
              />
            </Tab>
          );
        })}
      </Tabs>
    </div>
  );
};

interface BossSpellsProps {
  timeline: Timeline | undefined;
}
export const BossSpells = ({ timeline }: BossSpellsProps) => {
  const bossSpellMap_ = useEditorStore((state) => state.bossSpellMap);

  return (
    <div className="h-full px-2 overflow-auto">
      <ScrollShadow className="w-full h-full">
        <div className="flex gap-1 flex-col">
          {Array.from(bossSpellMap_.entries()).map(([spellId, bossSpell]) => {
            return (
              <BossSpellCard
                key={spellId}
                spellId={spellId}
                bossSpell={bossSpell}
                timeline={timeline}
              />
            );
          })}
        </div>
      </ScrollShadow>
    </div>
  );
};

interface BossSpellCardProps {
  spellId: number;
  bossSpell: BossSpell;
  timeline: Timeline | undefined;
}

export const BossSpellCard = ({
  spellId,
  bossSpell,
  timeline,
}: BossSpellCardProps) => {
  const bossSpellMap_ = useEditorStore((state) => state.bossSpellMap);
  const bossName_ = useEditorStore((state) => state.bossName);
  const difficulty_ = useEditorStore((state) => state.difficulty);
  var timelineModel = useEditorStore((state) => state.timelineModel);
  const setBossSpellVisibility = (isSelected: boolean) => {
    const spell = bossSpellMap_.get(spellId);
    if (spell) {
      spell!.visibility = isSelected;
      bossSpellMap_.set(spellId, spell);

      const updateTimeline = async () => {
        if (isSelected) {
          // add keyframe and render in timeline
          try {
            const encodedUrl = encodeURI(
              `http://localhost:3001/get_timeline_boss_spell_by_spell_id/${bossName_}/${difficulty_}/${spellId}`
            );
            const response = await fetch(encodedUrl);
            const data: TimelineBossSpellsReturn[] = await response.json();
            for (var row of timelineModel.rows) {
              if (
                checkBossRowName(bossName_, difficulty_, row) &&
                row.keyframes
              ) {
                for (var spellCastData of data) {
                  for (var bossKeyFrame of createKeyframeFromSpell(
                    spellCastData
                  )) {
                    row.keyframes.push(bossKeyFrame);
                  }
                }
                break;
              }
            }
          } catch (error) {
            console.error(
              "Error fetching player class and spec icons: ",
              error
            );
          }
        } else {
          // else remove keyframes from timeline
          for (var row of timelineModel.rows) {
            if (
              checkBossRowName(bossName_, difficulty_, row) &&
              row.keyframes
            ) {
              const rowKeyframes = row.keyframes.filter(
                (keyframe) =>
                  !keyframe.group
                    ?.toString()
                    .includes("__" + spellId.toString() + "__")
              );
              row.keyframes = rowKeyframes;
            }
            break;
          }
        }
        timeline?.setModel(timelineModel!);
        timeline?._renderKeyframes();
      };
      updateTimeline();
    }
  };

  return (
    <Card key={spellId} className="w-full" shadow="sm" radius="sm">
      <CardHeader className="flex flex-row pt-3 pb-2 items-center justify-between">
        <div className="flex gap-3 items-center ">
          <Link
            isExternal
            href={`https://www.wowhead.com/spell=${bossSpell.id}`}
          >
            <Avatar
              className="text-default-400 w-7 h-7"
              // isBordered
              radius="sm"
              src={bossSpell.icon}
            />
          </Link>
          <Link
            isExternal
            href={`https://www.wowhead.com/spell=${bossSpell.id}`}
          >
            <h3 className="text-small font-semibold leading-none text-default-600">
              {bossSpell.name}
            </h3>
          </Link>
          {bossSpell.spell_type === "Default" ? (
            <></>
          ) : (
            <h5 className="text-small tracking-tight text-default-400">
              <Chip radius="md" size="sm" color="secondary" variant="flat">
                {bossSpell.spell_type}
              </Chip>
            </h5>
          )}
        </div>
        <div className="h-6 place-center">
          <Switch
            defaultSelected
            size="sm"
            color="success"
            key={spellId}
            onValueChange={setBossSpellVisibility}
          />
        </div>
      </CardHeader>
      <CardBody className="px-3 pt-0 pb-2 flex flex-row text-small text-default-400 justify-between">
        <div className="flex gap-1 ">
          <p className="font-semibold text-default-400 text-small">ID</p>
          <p className="text-default-400 text-small">{bossSpell.id}</p>
        </div>
      </CardBody>
    </Card>
  );
};

interface SpellDetailsProps {
  timeline: Timeline | undefined;
}
export const SpellDetails = ({ timeline }: SpellDetailsProps) => {
  return (
    <Tabs
      aria-label="Options1"
      fullWidth
      color="primary"
      variant="solid"
      classNames={{
        tabList:
          "rounded-none h-12 px-2 rounded-t-md border-b border-gray-500/50",
        panel: "h-full w-full", //  border border-red-500
      }}
    >
      <Tab key="Player Spells" title="Player Spells">
        <div className="h-full w-full">
          <PlayerSpellSelection />
        </div>
      </Tab>
      <Tab key="Boss Spells" title="Boss Spells">
        <BossSpells timeline={timeline} />
      </Tab>
    </Tabs>
  );
};
