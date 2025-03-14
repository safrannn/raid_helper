"use client";

import {Avatar, Button, Chip, Select, Selection, SelectSection, SelectItem, SelectedItems, Dropdown, DropdownTrigger,DropdownMenu, DropdownItem, SharedSelection } from "@heroui/react";
import {useEffect, useState, useMemo} from "react";
import {Boss, Raid, BossByRaid, TimelineBossSpellsReturn} from "@/app/types";
import { Timeline, TimelineModel } from "animation-timeline-js";
import createRow, { createIntervalKeyframes, createSingleKeyframe, TimelineKeyframeExtra, TimelineModelExtra, TimelineRowExtra } from "@/app/timeline/createRow";
import useEditorStore from "@/app/timeline/states";

const FRAME_RATE=1000;

interface RenderSpellIconsArgs{
    timeline: Timeline | undefined;
    keyframeIdToImage: Map<string, string>;
    timelineRow: TimelineRowExtra;
}

interface UseBossListListenerArgs{
    timeline: Timeline | undefined;
    timelineElRef: React.RefObject<HTMLDivElement>;
    timelineModel: TimelineModelExtra;
    bossName: string;
    raidDifficulty: string;
}

const useBossListListener = ({ 
    timeline,
    timelineElRef,
    timelineModel,
    bossName,
    raidDifficulty,
  }: UseBossListListenerArgs) => {
    if (timeline){
        console.log("useBossListListener", {bossName}, {raidDifficulty}, {timelineModel});

        var encodedUrl = encodeURI(`http://localhost:3001/get_timeline_boss_spells/${bossName}/${raidDifficulty}`)
        console.log({encodedUrl});
        fetch(encodedUrl)
            .then((response) => response.json())
            .then((data: [TimelineBossSpellsReturn]) => {
                console.log("response", data.length);

                const keyframeIdToImage = new Map<string, string>();
                var bossKeyFrames:TimelineKeyframeExtra[] = [];

                for (var bossSpellCast of data){
                    keyframeIdToImage.set(bossSpellCast.keyframe_group_id.toString(), bossSpellCast.icon_url);
                    if (bossSpellCast.spell_duration === 0){
                        var newKeyframe: TimelineKeyframeExtra = createSingleKeyframe({start: bossSpellCast.start_cast * FRAME_RATE, keyframe_group_id: bossSpellCast.icon_url});
                        bossKeyFrames.push(newKeyframe);
                    }else{
                        var newKeyframes: TimelineKeyframeExtra[] = createIntervalKeyframes({start: bossSpellCast.start_cast * FRAME_RATE, duration: bossSpellCast.spell_duration * FRAME_RATE, keyframe_group_id: bossSpellCast.icon_url});
                        bossKeyFrames.push(newKeyframes[0], newKeyframes[1]);
                    }
                }

                var newBossTimelineRowName = "boss_" + bossName + "_" + raidDifficulty;
                const newBossTimelineRow = createRow({row_id: newBossTimelineRowName, keyframes: bossKeyFrames});

                console.log("bossTimelineRow", {newBossTimelineRow});

                // const timelineModel = timeline.getModel();
                if (timelineModel && bossKeyFrames.length > 1){
                    // remove previous boss timeline row on change
                    let index = timelineModel.rows.findIndex(item => item.id?.startsWith("boss_"));
                    console.log({index});
                    // add new boss timeline row on change
                    if (index === -1) {
                        timelineModel!.rows.unshift(newBossTimelineRow);
                    }else{
                        timelineModel!.rows[index] = newBossTimelineRow;
                    }
                    timeline?.setModel(timelineModel!);
                }

                timeline._renderKeyframes();
                // timeline.redraw(); // dbg! ???
            })
            .catch((error) => console.error("Error fetching boss list:", error));

    }
};

interface UseBossListArgs{
    timeline: Timeline | undefined;
    timelineElRef: React.RefObject<HTMLDivElement>;
}

export const BossList = ({ 
    timeline,
    timelineElRef,
  }: UseBossListArgs) => {
    const timelineModel = useEditorStore((state) => state.timelineModel);
    const [bossList, setBossList] = useState<BossByRaid[]>([]);
    const [selectedBoss, setSelectedBoss] = useState<string>("");
    const defaultRaidDifficulty: Selection = new Set(["Difficulty"]);
    const [selectedRaidDifficulty, setSelectedRaidDifficulty] = useState<Selection>(defaultRaidDifficulty);

    const selectedRaidDifficultyValue = useMemo(
        () => Array.from(selectedRaidDifficulty).join(", ").replace(/_/g, ""),
        [selectedRaidDifficulty],
    );

    // Load the boss list on page load
    useEffect(() => {
        // setraidDifficulty(["Normal", "Heroic", "Mythic"])
        fetch("http://localhost:3001/list_boss")
            .then((response) => response.json())
            .then((data: Array<[string, Array<Boss>]>) => {
                var newBossList: BossByRaid[] = [];
                for (var dataRaidBoss of data){
                    var raidName: string = dataRaidBoss[0];
                    var dataBossList: Boss[] = dataRaidBoss[1];
                    for (var dataBoss of dataBossList){
                        var dataBossByRaid = new BossByRaid(dataBoss.name, dataBoss.icon, raidName);
                        newBossList.push(dataBossByRaid);
                    }
                }
                setBossList(newBossList)
            })
            .catch((error) => console.error("Error fetching boss list:", error));
    }, []);

    const handleBossOnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        var bossName = e.target.value;
        setSelectedBoss(bossName);
        console.log("handleBossOnChange",{bossName}, {selectedBoss}, {selectedRaidDifficultyValue})
        if (selectedRaidDifficultyValue !== "Difficulty"){ 
            useBossListListener({timeline, timelineElRef, timelineModel, bossName, raidDifficulty: selectedRaidDifficultyValue});
        }
    };

    const handleRaidDifficultyOnChange = (keys: SharedSelection) => {
        var key: string = keys.currentKey!;
        setSelectedRaidDifficulty(new Set([key]));
        console.log("handleRaidDifficultyOnChange", {selectedBoss}, {selectedRaidDifficultyValue})
        if (selectedBoss !== ""){
            useBossListListener({timeline, timelineElRef, timelineModel, bossName: selectedBoss, raidDifficulty: key});
        }
    };

    return (
        <div className="flex w-full flex-wrap items-end md:flex-nowrap mb-6 md:mb-0 gap-4">
            <Select 
                classNames={{
                    base: "max-w-xs",
                    trigger: "min-h-12 py-2",
                }}
                isMultiline={true}
                items={bossList}
                placeholder="Select an encounter"
                aria-label="Encounter"
                // label="Encounter"
                // labelPlacement="outside"
                variant="bordered"
                radius="sm"
                selectedKeys={[selectedBoss]}
                selectionMode="single"
                onChange={handleBossOnChange}
                // onSelectionChange={handleBossOnChange}
                renderValue={(items: SelectedItems<BossByRaid>) => {
                    return (
                      <div className="flex flex-wrap gap-2">
                        {items.map((item) => (
                          <div key={item.key} className="flex items-center gap-2">
                            <Avatar
                                alt={item.data?.boss_name}
                                className="flex-shrink-0"
                                size="sm"
                                src={item.data?.boss_icon}
                            />
                            <div className="flex flex-col">
                                <span>{item.data?.boss_name}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                    );
                  }}
            >
                {(boss) => (
                    <SelectItem key={boss.boss_name} textValue={boss.boss_name}>
                        <div className="flex gap-2 items-center">
                            <Avatar alt={boss.boss_name} className="flex-shrink-0" size="sm" src={boss.boss_icon} />
                            <div className="flex flex-col">
                                <span className="text-small">{boss.boss_name}</span>
                                <span className="text-tiny text-default-400">{boss.raid_name}</span>
                            </div>
                        </div>
                    </SelectItem>
                )}
            </Select>
            <Dropdown>
                <DropdownTrigger>
                    <Button className="capitalize" variant="bordered">
                        {selectedRaidDifficultyValue}
                    </Button>
                </DropdownTrigger>
                <DropdownMenu 
                    aria-label="Raid Difficulty Selection" 
                    selectedKeys={selectedRaidDifficulty}
                    selectionMode="single"
                    variant="flat"
                    onSelectionChange={handleRaidDifficultyOnChange}
                >
                    <DropdownItem key="Normal">Normal</DropdownItem>
                    <DropdownItem key="Heroic">Heroic</DropdownItem>
                    <DropdownItem key="Mythic">Mythic</DropdownItem>
                </DropdownMenu>
            </Dropdown>
        </div>
    );
}

