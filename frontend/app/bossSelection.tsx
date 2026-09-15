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
import { Boss, BossMap } from "@/app/types";

import useEditorStore from "@/app/states";
import { useShallow } from "zustand/shallow";

export const BossSelection = () => {
  const {
    bossName,
    setBossName,
    difficulty,
    setDifficulty,
    allowLoadFight,
    setAllowLoadFight,
    setBossMap,
  } = useEditorStore(
    useShallow((state) => ({
      bossName: state.bossName,
      setBossName: state.setBossName,
      difficulty: state.difficulty,
      setDifficulty: state.setDifficulty,
      allowLoadFight: state.allowLoadFight,
      setAllowLoadFight: state.setAllowLoadFight,
      setBossMap: state.setBossMap,
    }))
  );
  const [sortedRaidList, setSortedRaidList] = useState<Array<[string, Boss[]]>>(
    new Array()
  );

  // Load list of boss for select on page load
  useEffect(() => {
    const loadBossSelection = async () => {
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
        setBossMap(newBossMap);
      } catch (error) {
        console.error("Error fetching boss list:", error);
      }
    };
    loadBossSelection();
  }, []);

  const handleBossOnSelectionChange = async (keys: SharedSelection) => {
    if (keys.currentKey) {
      setBossName(keys.currentKey!);
    }
  };

  const handleDifficultyOnSelectionChange = async (key: Key) => {
    setDifficulty(key.toString());
  };

  useEffect(() => {
    if (bossName !== "" && difficulty !== "") {
      setBossName(bossName);
      setDifficulty(difficulty);
      setAllowLoadFight(true);
      console.log("BossSelection", { bossName, difficulty, allowLoadFight });
    } else {
      setAllowLoadFight(false);
      console.log("BossSelection", { bossName, difficulty, allowLoadFight });
    }
  }, [bossName, difficulty]);

  return (
    <>
      <NavbarItem className="flex w-1/3 ">
        <Select
          className="flex flex-wrap items-end md:flex-nowrap mb-6 md:mb-0 "
          key="bossSelection"
          placeholder="Select an encounter"
          aria-label="Encounter"
          variant="bordered"
          radius="sm"
          fullWidth={true}
          selectedKeys={[bossName]}
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
          color="secondary"
          radius="sm"
          size="sm"
          variant={"solid"}
          selectedKey={difficulty}
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
