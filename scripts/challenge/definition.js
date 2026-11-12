import { registerSubsystem } from "../registry.js";
import { renderChallengeCard, renderResultCard } from "./chat-card.js";
import { newChallengeSystem, PRESETS, searchText } from "./data.js";
import { ChallengeModel } from "./model.js";
import { challengePanel } from "./panel.js";
import { ChallengeSheet } from "./sheet.js";
import { resetRun } from "./run.js";
import { receiveChallengeRoll } from "./state.js";

/** The one challenge type (spec section 14). Influence and the blank Victory Points challenge are presets of it. */
export function registerChallenge() {
  return registerSubsystem({
    id: "challenge",
    label: "SSM.Challenge.Label",
    icon: "fa-solid fa-trophy",
    model: ChallengeModel,
    sheet: ChallengeSheet,
    presets: Object.values(PRESETS).map(({ id, label, icon }) => ({ id, label, icon })),
    createSystem: newChallengeSystem,
    searchText,
    receiveRoll: receiveChallengeRoll,
    renderRollCard: renderChallengeCard,
    renderResultCard,
    resetCopy: resetRun,
    panel: challengePanel,
  });
}
