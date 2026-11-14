# Challenge JSON format

How to write a challenge as a JSON file and import it into Foundry. This page is written so that a person or an AI agent can build a working challenge from scratch. The [GM guide](gm-guide.md) explains what each part does at the table.

Checked against module version 0.1.0, Foundry 14.370 and PF2e 8.7.0.

## How to import

1. In the **Subsystems** tab, create a challenge with any preset. Its contents will be replaced.
2. Right-click it and choose **Import Data**. Pick the JSON file.
3. Open the challenge and check it.

The import replaces everything in the challenge, its name included. It keeps the challenge's folder and permissions.

**Before you import, read the [traps](#traps).** Two of them make an import fail silently.

## The file

A challenge is a journal entry holding one page of type `pf2e-subsystems-framework.challenge`. Everything the module uses is in the page's `system`.

```json
{
  "name": "The Governor's Banquet",
  "flags": { "core": { "sheetClass": "pf2e-subsystems-framework.ChallengeSheet" } },
  "pages": [
    {
      "name": "The Governor's Banquet",
      "type": "pf2e-subsystems-framework.challenge",
      "system": { }
    }
  ]
}
```

| Key | Required | Notes |
|---|---|---|
| `name` | Yes | The challenge's name. Use the same name for the page. |
| `flags.core.sheetClass` | **Yes** | Exactly `"pf2e-subsystems-framework.ChallengeSheet"`. Without it the challenge opens in Foundry's plain journal sheet until the world reloads. |
| `pages` | Yes | Exactly one page, with the `type` above. |
| `_id`, `folder`, `ownership`, `sort`, `_stats` | No | Leave them out. Foundry keeps the target's own. |

## A complete example

An Influence challenge with one NPC. Copy it as a starting point. Every key not shown takes its default (see the field tables).

```json
{
  "name": "The Governor's Banquet",
  "flags": { "core": { "sheetClass": "pf2e-subsystems-framework.ChallengeSheet" } },
  "pages": [
    {
      "name": "The Governor's Banquet",
      "type": "pf2e-subsystems-framework.challenge",
      "system": {
        "preset": "influence",
        "pointsName": "Influence Points",
        "subjectLabel": "NPC",
        "subjectsLabel": "NPCs",
        "noSubjects": "No NPCs yet.",
        "gmNotes": "<p>The banquet lasts six rounds of about ten minutes.</p>",
        "rounds": { "current": 0, "max": 6 },
        "multipleSubjects": true,
        "counters": [
          {
            "id": "cSuspicion000001",
            "name": "Suspicion",
            "min": 0,
            "max": 5,
            "display": "steps",
            "revealed": false,
            "thresholds": [
              { "id": "tSuspicion5Leave", "points": 5, "name": "The guards escort you out", "reveal": "hidden" }
            ]
          }
        ],
        "modifiers": [],
        "subjects": [
          {
            "id": "sLadyVance000001",
            "name": "Lady Vance",
            "description": "<p>The governor's sister, bored by everyone here.</p><section class=\"secret\" id=\"secret-ladyVanceSecret1\"><p>She is the one selling the guest list.</p></section>",
            "revealed": true,
            "counters": [
              {
                "id": "cVanceInfluence1",
                "name": "Influence Points",
                "revealed": true,
                "thresholds": [
                  { "id": "tVance4Introduce", "points": 4, "name": "She offers an introduction", "reveal": "points" },
                  { "id": "tVance8Confides1", "points": 8, "name": "She names the buyer", "reveal": "hidden",
                    "description": "<p>She tells the party who bought the guest list.</p>" }
                ]
              }
            ],
            "actions": [
              {
                "id": "aVanceDiscover01",
                "name": "Discover",
                "secret": true,
                "checks": [
                  { "id": "kVancePerceptio", "skill": "perception", "dc": 18, "revealed": true },
                  { "id": "kVanceSociety01", "skill": "society", "dc": 20, "revealed": false }
                ]
              },
              {
                "id": "aVanceInfluence",
                "name": "Influence",
                "description": "<p>Each success earns 1 Influence Point; a critical success earns 2.</p>",
                "checks": [
                  { "id": "kVanceDiplomacy", "skill": "diplomacy", "dc": 20, "revealed": true },
                  { "id": "kVanceDeception", "skill": "deception", "dc": 22, "revealed": true },
                  { "id": "kVanceIntimidat", "skill": "intimidation", "dc": 24, "revealed": true },
                  { "id": "kVanceArtLore01", "skill": "lore", "lore": "Art Lore", "dc": 16, "revealed": false }
                ]
              }
            ],
            "modifiers": [
              {
                "id": "mVanceFlattery01",
                "name": "Flattery",
                "category": "Weakness",
                "description": "<p>She softens when someone admires her collection.</p>",
                "duration": "oneTime",
                "dc": { "amount": -2, "allSkills": false, "skills": ["kVanceDiplomacy"] },
                "roll": { "amount": 1, "type": "circumstance" }
              },
              {
                "id": "mVanceThreats01",
                "name": "Threats",
                "category": "Resistance",
                "duration": "ongoing",
                "active": true,
                "dc": { "amount": 2, "allSkills": false, "skills": ["kVanceIntimidat"] },
                "note": "A failed Intimidation ends the conversation."
              }
            ]
          }
        ]
      }
    }
  ]
}
```

## Field tables

**Text types.** *Plain* fields are shown as typed: don't put HTML or entities in them. *HTML* fields are rich text: wrap text in `<p>` and use secret blocks (below) for GM-only parts.

**Defaults.** A key left out takes the default shown. Most `revealed` defaults are `false`: a check, counter or modifier with no `revealed` key starts hidden from players. (The challenge window's + buttons start new checks and counters revealed; the file does not.)

### Challenge (`system`)

| Key | Type | Default | Notes |
|---|---|---|---|
| `preset` | One of `victory`, `influence`, `infiltration`, `preparation`, `chase`, `reputation`, `research` | `victory` | Only sets what a new subject added in Foundry contains, and the suggested category names. |
| `pointsName` | Plain | `""` | The name a new subject counter gets, such as `Influence Points`. |
| `subjectLabel` | Plain | `""` | One subject, such as `NPC`. Names the Add button. |
| `subjectsLabel` | Plain | `""` | Several subjects, such as `NPCs`. |
| `noSubjects` | Plain | `""` | Shown when there are none, such as `No NPCs yet.` |
| `gmNotes` | HTML | `""` | GM only. |
| `rounds.current` | Integer, 0 or more | `0` | Leave at 0. Start sets round 1. |
| `rounds.max` | Integer, 0 or more, or `null` | `null` | `null`: no limit. `0`: no rounds at all. |
| `multipleSubjects` | Boolean | `true` | `false`: revealing a subject hides all others. |
| `participants` | List of actor ids | `[]` | Actors beside the party's PCs, such as an NPC ally. Ids are the world's own, so leave it out of a file meant for another world. |
| `counters` | List of [counters](#counter) | `[]` | The challenge's own counters. |
| `modifiers` | List of [modifiers](#modifier) | `[]` | Challenge-level: DC changes apply to every subject. |
| `subjects` | List of [subjects](#subject) | `[]` | In order. Uncategorised subjects first, then each category's. |
| `run` | — | — | **Leave it out.** It holds the run state. |

### Subject

| Key | Type | Default | Notes |
|---|---|---|---|
| `id` | Id | random | See [ids](#ids). |
| `name` | Plain | `""` | |
| `description` | HTML | `""` | Players see it on the panel, apart from secret blocks. |
| `category` | Plain | `""` | Free text, such as `Obstacle`. Groups subjects on the sheet. |
| `revealed` | Boolean | `false` | Whether players see the subject at all. |
| `complete` | Boolean | `false` | |
| `counters` | List of [counters](#counter) | `[]` | |
| `modifiers` | List of [modifiers](#modifier) | `[]` | |
| `actions` | List of [actions](#action) | `[]` | |

### Action

| Key | Type | Default | Notes |
|---|---|---|---|
| `id` | Id | random | |
| `name` | Plain | `""` | Such as `Influence`, `Discover`, `Overcome`. |
| `description` | HTML | `""` | What the action is and its degrees of success. Players see it, apart from secret blocks. |
| `secret` | Boolean | `false` | Rolls as a secret check, like Recall Knowledge. Use it for Discover. |
| `checks` | List of [checks](#check) | `[]` | |

### Check

| Key | Type | Default | Notes |
|---|---|---|---|
| `id` | Id | random | Needed if a subject modifier targets this check. |
| `skill` | Key | `""` | **Lowercase.** One of: `acrobatics`, `arcana`, `athletics`, `crafting`, `deception`, `diplomacy`, `intimidation`, `medicine`, `nature`, `occultism`, `performance`, `religion`, `society`, `stealth`, `survival`, `thievery`, `perception`, `fortitude`, `reflex`, `will`, `lore`. |
| `lore` | Plain | `""` | The Lore's name, such as `Art Lore`, when `skill` is `lore`. Otherwise empty. |
| `dc` | Integer, 0 or more | `15` | The base DC. |
| `revealed` | Boolean | `false` | |
| `decoy` | Boolean | `false` | False information: players can't tell it apart. |

### Counter

The same shape on the challenge and on a subject.

| Key | Type | Default | Notes |
|---|---|---|---|
| `id` | Id | random | |
| `name` | Plain | `""` | |
| `value` | Integer | `0` | The starting value. |
| `direction` | `up`, `down` or `both` | `up` | `down` reaches thresholds by falling. `both` is a track around 0: thresholds above 0 by rising, below 0 by falling. |
| `min`, `max` | Integer or `null` | `null` | Limits. Needed for `steps` and `track` displays. |
| `perRound` | Integer | `0` | Added on each Next round. Not used on a per-PC counter. |
| `perPc` | Boolean | `false` | One value per party PC, such as Edge Points. No thresholds. |
| `valueBy`, `noteBy` | Object | `{}` | Per-PC values and GM notes, by actor id. Leave them out. |
| `thresholds` | List of [thresholds](#threshold) | `[]` | |
| `display` | `auto`, `number`, `bar`, `steps` or `track` | `auto` | Auto: a bar with thresholds or on a both-ways counter, else a number. |
| `showThresholdList` | Boolean | `true` | The list of revealed thresholds under the counter on the panel. |
| `showThresholdMarks` | Boolean | `true` | Marks for revealed thresholds on the bar, steps or track. |
| `revealed` | Boolean | `false` | A subject's counter shows only while its subject is revealed too. |

### Threshold

| Key | Type | Default | Notes |
|---|---|---|---|
| `id` | Id | random | |
| `points` | Integer | `1` | Negative on a both-ways counter for a threshold below 0. |
| `name` | Plain | `""` | What players see at full reveal, such as `She offers an introduction`. |
| `description` | HTML | `""` | More detail. Players see it at full reveal, apart from secret blocks. |
| `reveal` | `hidden`, `points` or `full` | `hidden` | `points` shows "4 ???". `full` shows the name and description too. |
| `reached` | Boolean | `false` | Leave it out. |
| `dc` | Integer | `0` | A DC change while reached: to the subject's checks, or to every check for a challenge counter. |

### Modifier

The same shape on the challenge and on a subject.

| Key | Type | Default | Notes |
|---|---|---|---|
| `id` | Id | random | |
| `name` | Plain | `""` | |
| `description` | HTML | `""` | Players see it, apart from secret blocks. |
| `category` | Plain | `""` | Free text, such as `Weakness`, `Resistance`, `Opportunity`. Groups and colours the cards. |
| `duration` | `oneTime`, `multiUse` or `ongoing` | `ongoing` | One-time is spent by the next matching roll; multi-use turns Off; ongoing stays On. |
| `active` | Boolean | `false` | On. A weakness the PCs must find and exploit usually starts Off. |
| `spent` | Boolean | `false` | Leave it out. |
| `revealed` | Boolean | `false` | |
| `decoy` | Boolean | `false` | |
| `dc.amount` | Integer | `0` | The DC change, such as `-2`. `0` means none. |
| `dc.allSkills` | Boolean | `true` | `true`: every check. `false`: only those in `dc.skills`. Applies to the roll bonus too. |
| `dc.skills` | List | `[]` | **Differs by level** (below). Applies to the roll bonus too. |
| `roll.amount` | Integer | `0` | A bonus on the roll itself, such as `1`; below 0 for a penalty. `0` means none. |
| `roll.type` | `circumstance`, `status`, `item` or `untyped` | `circumstance` | The PF2e modifier type. PF2e's stacking rules apply. |
| `note` | Plain | `""` | GM only: a consequence with no number, such as "she ends the conversation". |

`dc.allSkills` and `dc.skills` name the checks for both the DC change and the roll bonus. A modifier with only a roll bonus still uses them; leave `dc.amount` at `0`.

**`dc.skills` on a subject's modifier** lists that subject's **check ids**, such as `["kVanceDiplomacy"]`.

**`dc.skills` on a challenge modifier** lists **skill keys**, matching that skill on every subject: `diplomacy`, `perception`, `will`, and so on. A Lore is `lore:` plus its name in lowercase, such as `lore:art lore`.

## Ids

- Every `id` must be **unique within the challenge**. Two entries with the same id can reveal or change each other.
- Any non-empty string works. Foundry's own are 16 letters and digits; readable ones, such as `kVanceDiplomacy`, make the file easier to check.
- Ids can be left out; Foundry makes random ones. Give ids to anything another field points at: checks named in a subject modifier's `dc.skills`.

## Secret blocks

In an HTML field, GM-only text goes in a secret block. Players never see it; the GM sees it on the sheet.

```html
<p>What players see.</p><section class="secret" id="secret-aUniqueId001"><p>What only the GM sees.</p></section>
```

Give each block a unique `id` starting with `secret-`. Escape `"` as `\"` inside JSON strings.

## Traps

| Trap | What happens | How to avoid it |
|---|---|---|
| **One invalid value** | Foundry drops the whole challenge page, **with no error**. The entry you imported over becomes an empty journal entry and moves to the Journal tab. | Use only the listed values for `preset`, `duration`, `direction`, `display` and `reveal`. Integers must be whole numbers. Check the result straight after importing. |
| **Missing `sheetClass` flag** | The challenge opens in Foundry's plain journal sheet until the world reloads. | Include `flags.core.sheetClass` as shown. |
| **Capitalised or misspelt skill** | Imports cleanly. The roll fails at the table: "doesn't have Diplomacy". | Lowercase keys from the check table only. |
| **HTML in a plain field** | Shows as literal tags or entities on the sheet and panel. | HTML only in `description` and `gmNotes`. |
| **A `run` block** | The challenge arrives half-run, with stale acted marks or a Reset baseline. | Leave `run` out. |
| **Missing `revealed`** | The entry starts hidden. | Set `revealed: true` on everything players should see from the start. |

## A good build order

1. Pick the preset that fits and copy its names (`pointsName`, `subjectLabel`, `subjectsLabel`, `noSubjects`). Creating a challenge from the preset in Foundry and exporting it (right-click, **Export Data**) shows its counters, actions and GM notes.
2. Add the challenge's counters, such as Awareness or Suspicion.
3. Add each subject with its counters, thresholds, actions and checks.
4. Add modifiers, pointing them at check ids or skill keys.
5. Import over a blank challenge. Open it and check the counters, checks and modifiers before you start it.
