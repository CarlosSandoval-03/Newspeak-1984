/**
 * The source language: `Strings` is derived from it, so every other language must match its shape.
 * Placeholders are filled at runtime: {id} pilot number, {word} a Newspeak word, {enemy} the
 * current enemy, {from}/{to} numbers, {ordinal} an edition ordinal, {language} a language name.
 */

export const en = {
  meta: {
    languageName: "ENGLISH",
  },

  menu: {
    title: "NEWSPEAK 1984",
    start: "BEGIN SERVICE",
    honorRoll: "HONOR ROLL",
    language: "LANGUAGE: {language}",
    pressEnter: "PRESS ENTER",
    controls: "ARROWS MOVE · Z FIRE · X DASH · C BOMB · V TRUTH · P PAUSE",
  },

  hud: {
    score: "SCORE",
    lives: "LIVES",
    suspicion: "SUSPICION",
    states: {
      normal: "NORMAL",
      alert: "ALERT",
      pursuit: "PURSUIT",
      thoughtPolice: "THOUGHT POLICE",
    },
  },

  // Display names of the four words. Code keys stay FREE / ESCAPE / TRUTH / REMEMBER.
  words: {
    FREE: "FREE",
    ESCAPE: "ESCAPE",
    TRUTH: "TRUTH",
    REMEMBER: "REMEMBER",
  },

  levels: [
    { sector: "SECTOR 1", name: "MINISTRY OF TRUTH" },
    { sector: "SECTOR 2", name: "MINISTRY OF PLENTY" },
    { sector: "SECTOR 3", name: "MINISTRY OF PEACE" },
    { sector: "SECTOR 4", name: "THE PROLE DISTRICT" },
    { sector: "SECTOR 5", name: "MINISTRY OF LOVE" },
  ],

  dictionary: {
    heading: "DICTIONARY OF NEWSPEAK",
    edition: "{ordinal} EDITION",
    ordinals: ["ELEVENTH", "TWELFTH", "THIRTEENTH", "FOURTEENTH", "FIFTEENTH"],
    removed: "THE WORD {word} IS NO LONGER REQUIRED.",
    noneRemoved: "THIS EDITION IS COMPLETE.",
    takeOff: "PRESS ENTER TO TAKE OFF",
  },

  // One list per level, three tones chosen by the Ministry's verdict on the last level: [calm, wary, cold].
  briefings: [
    [
      "Pilot {id}. Eurasian bombers approach the capital. Defend the Ministry of Truth.",
      "Pilot {id}. Your record is satisfactory. Keep it that way.",
      "Pilot {id}. We have read your file. Fly well today.",
    ],
    [
      "Pilot {id}. Production has risen again. The word {word} has been retired; you will not miss it.",
      "Pilot {id}. Some pilots asked where {word} went. You did not. Good.",
      "Pilot {id}. Fly straight. You no longer need to fly {word}.",
    ],
    [
      "Pilot {id}. The war is going well. The word {word} has been retired.",
      "Pilot {id}. There is nowhere to go, so {word} was unnecessary.",
      "Pilot {id}. The word {word} has been retired. So has the idea.",
    ],
    [
      "Pilot {id}. Enemy rockets struck this district. The word {word} has been retired.",
      "Pilot {id}. There is nothing below you worth keeping.",
      "Pilot {id}. You were not there when this district fell. Neither was anyone.",
    ],
    [
      "Pilot {id}. Today you protect the Ministry of Love. The word {word} has been retired. The Party will tell you what is true.",
      "Pilot {id}. The Ministry of Love has prepared a room. We hope it stays empty.",
      "Pilot {id}. They are expecting you at the Ministry of Love.",
    ],
  ],

  ticker: {
    enemies: {
      eurasia: "EURASIA",
      eastasia: "EASTASIA",
    },
    // Shown once when the alliance flips. Earlier lines with {enemy} re-render with the new enemy.
    flip: "OCEANIA FIGHTS {enemy}. THE RECORD CONFIRMS IT ALWAYS HAS.",
    common: [
      "{enemy} FLEET DESTROYED OFF THE COAST",
      "PRODUCTION UP 12% THIS QUARTER",
      "REPORT UNUSUAL WORDS TO YOUR WARDEN",
      "THE SKY IS SAFE. KEEP WATCHING IT.",
    ],
    byLevel: [
      [
        "{enemy} RAIDERS SIGHTED OVER THE CAPITAL",
        "THE MINISTRY OF TRUTH STANDS FIRM",
      ],
      ["RATIONS RAISED TO 20G", "RECORD HARVEST AT THE MINISTRY OF PLENTY"],
      [
        "THE FRONT ADVANCES ON ALL SIDES",
        "THE MINISTRY OF PEACE THANKS ITS PILOTS",
      ],
      [
        "{enemy} ROCKETS STRIKE THE PROLE DISTRICT",
        "REBUILDING WILL BEGIN SOON",
      ],
      [
        "VOLUNTEERS WELCOME AT THE MINISTRY OF LOVE",
        "LOYALTY IS ITS OWN REWARD",
      ],
    ],
  },

  slogans: {
    // The band under each rooftop portrait fits 2 lines of 22 characters.
    murals: [
      "HE SEES YOU CLEARLY",
      "VIGILANCE IS AFFECTION",
      "THE SKY REMEMBERS\nNOTHING",
      "OBEDIENCE IS ALTITUDE",
      "FEWER WORDS\nCLEARER MINDS",
      "YOUR DOUBTS\nARE NOTED",
    ],
    // Painted on plazas at 40-60 px, so 12 characters at most.
    ground: ["HE SEES", "LOOK UP", "REPORT", "OBEY"],
    // Blimp banners that flip mid-level: [before, after].
    banners: [
      ["ALWAYS OUR ALLY", "NEVER OUR ALLY"],
      ["THE WAR IS ENDING", "THE WAR IS ETERNAL"],
      ["NO ONE IS WATCHING", "EVERYONE IS WATCHING"],
      ["TRUST YOUR EYES", "TRUST THE PARTY"],
    ],
    telescreens: ["STAND BY", "THE LEADER IS WATCHING", "REMAIN IN YOUR SEAT"],
  },

  pause: {
    title: "PAUSED",
    note: "THE TELESCREEN REMAINS ON",
    resume: "PRESS P TO RESUME",
  },

  gameOver: {
    stamp: "VAPORIZED",
    line: "PILOT {id} NEVER EXISTED.",
    pressEnter: "PRESS ENTER",
  },

  ministry: {
    header: "MINISTRY OF TRUTH",
    department: "RECORDS DEPARTMENT",
    reportedScore: "SCORE AS REPORTED",
    officialScore: "OFFICIAL SCORE",
    correctionsTitle: "CORRECTIONS",
    corrections: {
      // One per Ministry verdict: a hero, a pilot under review, a suspect.
      kills: [
        "Enemy aircraft destroyed: {from}, corrected to {to}. Rounded in the Party's favor.",
        "Enemy aircraft destroyed: {from}, corrected to {to}. The rest are credited to loyal pilots.",
        "Enemy aircraft destroyed: {from}, corrected to 0. This pilot flew no sorties.",
      ],
      eyesDestroyed:
        "Surveillance towers lost: {from}, corrected to 0. No towers were lost.",
      secondsSeen:
        "Time under observation: {from} s, corrected to 0. The pilot was never observed.",
      diaries:
        "Diaries recovered: {from}, corrected to 0. No such document exists.",
    },
    stamps: {
      corrected: "CORRECTED",
      approved: "APPROVED",
    },
    pressEnter: "PRESS ENTER",
  },

  honorRoll: {
    title: "HONOR ROLL",
    pilot: "PILOT {id}",
    unperson: "[UNPERSON]",
  },

  // The erased pilot's diary: one page per level, in order.
  // `line` is typed in game on pickup; `page` is shown in full in the rebel ending.
  diary: {
    title: "The diary",
    pages: [
      {
        line: "The newspaper said Eurasia. Today it says Eastasia. I kept the old one.",
        page: "The newspaper said we were at war with Eurasia. This morning it says Eastasia, and the date is the same. I kept yesterday's copy under the floorboard. If someone finds this, look at the dates.",
      },
      {
        line: "There used to be a word for flying however you liked.",
        page: "They took a word out of the dictionary today. Nobody asked where it went. I wrote it inside my glove so I would not forget its shape. The ration was lowered and announced as a rise. We clapped.",
      },
      {
        line: "The battleship's guns were pointed at our own streets.",
        page: "Along the railway I watched the land battleship fire into the north district. Our district. The broadcast called it an enemy rocket. I flew over the smoke and counted the roofs. I will not write the number.",
      },
      {
        line: "These ruins were not made by the enemy.",
        page: "Nothing in the prole district may be remembered, so I am remembering it here. The craters are the shape of our own bombs. The Party writes the past. I am writing it back.",
      },
      {
        line: "They know about the diary. If you are reading this, you have my seat.",
        page: "The officer smiled at me today. That is how it begins. If you found the other pages, you know what I know. They will erase my face from the squadron photo. Take the plane. Fly where there are no telescreens.",
      },
    ],
  },

  endings: {
    obedient: {
      title: "A GRATEFUL CITIZEN",
      lines: [
        "The war has ended in victory, as it was always going to.",
        "Pilot {id} has been reassigned to a quiet desk.",
        "Every evening he sits under the telescreen. He has come to like the Leader's face.",
      ],
    },
    // The rebel ending does not shout, so its text is in sentence case.
    rebel: {
      title: "The record, uncorrected",
      lines: [
        "Pilot {id} did not land.",
        "Past the last telescreen, the sky is pale and empty.",
        "This is what really happened.",
      ],
      columns: {
        item: "",
        real: "Real",
        official: "Official",
      },
      rows: {
        score: "Score",
        kills: "Aircraft destroyed",
        eyesDestroyed: "Towers destroyed",
        secondsSeen: "Seconds observed",
        diaries: "Diary pages read",
      },
    },
  },
};

export type Strings = typeof en;
