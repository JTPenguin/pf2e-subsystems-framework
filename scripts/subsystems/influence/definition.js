import { registerSubsystem } from "../../registry.js";
import { newChallengeSystem, searchText } from "./data.js";
import { InfluenceModel } from "./model.js";
import { InfluenceSheet } from "./sheet.js";

export function registerInfluence() {
  return registerSubsystem({
    id: "influence",
    label: "SSM.Influence.Label",
    icon: "fa-solid fa-comments",
    model: InfluenceModel,
    sheet: InfluenceSheet,
    createSystem: newChallengeSystem,
    searchText,
  });
}
