"use client";

import {
  Avatar,
  SharedSelection,
  NavbarItem,
  Tabs,
  Tab,
  Select,
  SelectItem,
} from "@heroui/react";
import { useEffect, useState, Key } from "react";
import { Boss, BossMap, Raid } from "@/app/types";

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
    })),
  );
  const [sortedRaidList, setSortedRaidList] = useState<Array<[string, Boss[]]>>(
    new Array(),
  );
  // Raids sorted by patch <major>.<minor> from large to small.
  const [raidList, setRaidList] = useState<Raid[]>(new Array());
  const [raidName, setRaidName] = useState<string>("");

  // Parse "<major>.<minor>" patch string into numbers for sorting.
  const parsePatch = (patch: string): [number, number] => {
    const [major, minor] = patch.split(".");
    return [Number(major) || 0, Number(minor) || 0];
  };

  // Load list of raid and boss for select on page load
  useEffect(() => {
    const loadRaidSelection = async () => {
      try {
        const response = await fetch("/list_raid");
        const data: Raid[] = await response.json();
        data.sort((a, b) => {
          const [aMajor, aMinor] = parsePatch(a.patch);
          const [bMajor, bMinor] = parsePatch(b.patch);
          return bMajor - aMajor || bMinor - aMinor;
        });
        setRaidList(data);
      } catch (error) {
        console.error("Error fetching raid list:", error);
      }
    };
    loadRaidSelection();
  }, []);

  useEffect(() => {
    const loadBossSelection = async () => {
      try {
        const response = await fetch("/list_boss");
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

  const bossListOfRaid: Boss[] =
    sortedRaidList.find((raid) => raid[0] === raidName)?.[1] ?? [];

  useEffect(() => {
    if (raidName === "" && raidList.length > 0) {
      setRaidName(raidList[0].name);
    }
  }, [raidList]);

  useEffect(() => {
    if (raidName === "" || bossListOfRaid.length === 0) {
      return;
    }
    if (!bossListOfRaid.some((boss) => boss.name === bossName)) {
      setBossName(bossListOfRaid[0].name);
    }
  }, [raidName, sortedRaidList]);

  const handleRaidOnSelectionChange = async (keys: SharedSelection) => {
    if (keys.currentKey) {
      setRaidName(keys.currentKey!);
    }
  };

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
      <NavbarItem id="raid-selection" className="flex w-[250px]">
        <Select
          className="flex flex-wrap items-end md:flex-nowrap mb-6 md:mb-0 "
          key="select_expansion"
          placeholder="Select an expansion"
          aria-label="Expansion"
          variant="bordered"
          radius="sm"
          fullWidth={true}
          selectedKeys={[raidName]}
          selectionMode="single"
          onSelectionChange={handleRaidOnSelectionChange}
          items={raidList}
          isRequired={true}
        >
          {(raid: Raid) => (
            <SelectItem key={raid.name} description={`Patch ${raid.patch}`}>
              {raid.name}
            </SelectItem>
          )}
        </Select>
      </NavbarItem>

      <NavbarItem id="boss-selection" className="flex w-[350px]">
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
          items={bossListOfRaid}
          isRequired={true}
        >
          {(boss: Boss) => (
            <SelectItem
              key={boss.name}
              startContent={
                <Avatar className="flex-shrink-0" size="sm" src={boss.icon} />
              }
            >
              {boss.name}
            </SelectItem>
          )}
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
