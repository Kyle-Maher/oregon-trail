// ============= EVENTS & ENCOUNTERS =============
// All trail events, flavor text, and interactive encounters.
// To add new content, simply append to the appropriate array.

// ─── Utility ─────────────────────────────────────
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ─── PASSIVE EVENTS ──────────────────────────────
// These fire during auto-travel and just log text + apply effects.
// No player choice required.

const PASSIVE_EVENTS = [
    // === WEATHER (common, mostly flavor) ===
    {
        id: "clear_skies",
        category: "weather",
        weight: 5,
        texts: [
            "Clear skies and a gentle breeze. Good traveling weather.",
            "The sun shines warmly. A fine day on the trail.",
            "Not a cloud in sight. The oxen seem content.",
            "A beautiful morning. Wildflowers line the trail.",
            "Perfect weather for making miles."
        ],
        effect: null
    },
    {
        id: "overcast",
        category: "weather",
        weight: 3,
        texts: [
            "Overcast skies, but the trail is dry.",
            "Gray clouds hang low but no rain falls.",
            "A cool, cloudy day. Easy on the eyes."
        ],
        effect: null
    },
    {
        id: "light_rain",
        category: "weather",
        weight: 2,
        texts: [
            "A light rain falls. The trail turns slightly muddy.",
            "Drizzle all morning. Everyone is damp but spirits hold.",
            "Gentle rain. The grass looks greener on the other side."
        ],
        effect: (state) => applyHealthChange(-2)
    },
    {
        id: "storm",
        category: "weather",
        weight: 1,
        texts_clothing: [
            "A storm hit, but your extra clothing kept everyone warm!",
            "Thunder and rain! Thankfully, your clothing keeps the worst off.",
            "Heavy storm rolls through. Your warm clothing makes all the difference."
        ],
        texts_no_clothing: [
            "A storm slowed your progress and chilled your party.",
            "Thunder, wind, and driving rain. Everyone is miserable.",
            "A fierce storm drenches everything. The cold bites deep."
        ],
        effect: (state) => {
            if (state.clothing > 0) return "";
            return applyHealthChange(-8);
        },
        getText: function(state) {
            if (state.clothing > 0) return pickRandom(this.texts_clothing);
            return pickRandom(this.texts_no_clothing);
        }
    },
    {
        id: "hot_day",
        category: "weather",
        weight: 2,
        texts: [
            "Blazing hot. The oxen slow their pace.",
            "Heat shimmers off the trail. Water goes quickly today.",
            "A scorching day. Everyone seeks shade at midday."
        ],
        effect: (state) => {
            state.food -= 2;
            return applyHealthChange(-3);
        },
        condition: (state) => state.distance > 200
    },
    {
        id: "cool_morning",
        category: "weather",
        weight: 2,
        texts: [
            "A crisp, cool morning. Everyone steps lively.",
            "Frost on the ground at dawn, but the sun warms things up.",
            "The cool air energizes the party."
        ],
        effect: (state) => applyHealthChange(2)
    },

    // === FORAGING / FINDING THINGS ===
    {
        id: "found_berries",
        category: "foraging",
        weight: 2,
        effect: (state) => {
            const amt = randInt(3, 8);
            state.food += amt;
            state._eventAmount = amt;
            return "";
        },
        getText: function(state) {
            const amt = state._eventAmount || 5;
            return pickRandom([
                `You found some berries along the trail! +${amt} lbs food.`,
                `Wild berries! The children gather them eagerly. +${amt} lbs food.`,
                `Ripe berries grow thick beside the path. +${amt} lbs food.`
            ]);
        }
    },
    {
        id: "found_supplies",
        category: "foraging",
        weight: 1,
        texts: [
            "Found abandoned supplies by the trail! +15 lbs food, +$5.",
            "An abandoned campsite yields useful supplies. +15 lbs food, +$5.",
            "Someone left supplies behind. Their loss, your gain. +15 lbs food, +$5."
        ],
        effect: (state) => { state.food += 15; state.money += 5; return ""; }
    },
    {
        id: "found_nothing",
        category: "foraging",
        weight: 1,
        texts: [
            "You spot something off the trail but it turns out to be nothing useful.",
            "A glint in the dirt — just a worthless tin can.",
            "You thought you saw supplies, but it was just old rags."
        ],
        effect: null
    },
    {
        id: "good_campsite",
        category: "foraging",
        weight: 2,
        texts: [
            "You found a good camping spot near a stream.",
            "A sheltered campsite with fresh water nearby. A welcome rest.",
            "Tonight's camp is beside a creek. The sound of water soothes everyone."
        ],
        effect: (state) => applyHealthChange(5)
    },

    // === TRAIL CONDITIONS ===
    {
        id: "muddy_trail",
        category: "trail",
        weight: 2,
        texts: [
            "The trail is muddy and difficult. Progress is slow.",
            "Wagon wheels sink in the mud. Hard going today.",
            "Rain has turned the trail to muck. Every mile is a struggle."
        ],
        effect: (state) => applyHealthChange(-3)
    },
    {
        id: "rocky_trail",
        category: "trail",
        weight: 1,
        texts: [
            "Rocky terrain shakes the wagon hard.",
            "The trail crosses a rocky stretch. The wagon groans and rattles.",
            "Stones and ruts make for a bone-jarring ride."
        ],
        effect: (state) => applyHealthChange(-4)
    },
    {
        id: "smooth_trail",
        category: "trail",
        weight: 3,
        texts: [
            "The trail is smooth and well-worn. Good progress today.",
            "A well-maintained stretch of trail. The wagon rolls easily.",
            "Flat, firm ground. The oxen make excellent time."
        ],
        effect: null
    },
    {
        id: "dust_storm",
        category: "trail",
        weight: 1,
        texts: [
            "A dust storm blows in. Visibility drops to nothing.",
            "Choking dust fills the air. You must stop until it passes.",
            "Wind kicks up thick dust. Everyone covers their faces."
        ],
        effect: (state) => applyHealthChange(-6),
        condition: (state) => state.distance > 300
    },

    // === WAGON PROBLEMS ===
    {
        id: "wheel_broke",
        category: "wagon",
        weight: 1,
        texts_parts: [
            "Wagon wheel broke! You used a spare part to fix it.",
            "A wheel splintered on a rock. Good thing you had spare parts.",
            "Cracked wheel! Your foresight in buying spare parts pays off."
        ],
        texts_no_parts: [
            "Wagon wheel broke! Repairs cost $10.",
            "A wheel shattered. Without spare parts, you must pay $10 for repairs.",
            "Broken wheel. The repair costs you $10 out of pocket."
        ],
        texts_no_money: [
            "Wagon wheel broke! You have no parts or money. You jury-rig a fix, but it takes a toll.",
        ],
        effect: (state) => {
            if (state.spareParts > 0) {
                state.spareParts--;
                return "";
            } else if (state.money >= 10) {
                state.money -= 10;
                return "";
            } else {
                return applyHealthChange(-10);
            }
        },
        getText: function(state) {
            if (state.spareParts > 0) return pickRandom(this.texts_parts);
            if (state.money >= 10) return pickRandom(this.texts_no_parts);
            return pickRandom(this.texts_no_money);
        }
    },
    {
        id: "axle_creak",
        category: "wagon",
        weight: 2,
        texts: [
            "The wagon axle creaks ominously but holds together.",
            "A worrying groan from the wagon. You check it — seems fine for now.",
            "The wagon lurches. Just a rut, nothing broken."
        ],
        effect: null
    },

    // === OXEN ===
    {
        id: "ox_limping",
        category: "oxen",
        weight: 1,
        texts: [
            "One of your oxen is limping but pushes on.",
            "An ox favors its left leg. It slows the pace slightly.",
            "One ox seems injured but refuses to stop."
        ],
        effect: (state) => applyHealthChange(-5)
    },
    {
        id: "oxen_graze",
        category: "oxen",
        weight: 2,
        texts: [
            "The oxen found good grazing. They look refreshed.",
            "Rich grassland here. The oxen eat well tonight.",
            "Lush grass beside the trail. The oxen are pleased."
        ],
        effect: (state) => applyHealthChange(3)
    },

    // === PEOPLE / TRAVELERS ===
    {
        id: "friendly_travelers",
        category: "people",
        weight: 2,
        effect: (state) => {
            const amt = randInt(5, 15);
            state.food += amt;
            state._eventAmount = amt;
            return "";
        },
        getText: function(state) {
            const amt = state._eventAmount || 10;
            return pickRandom([
                `You met friendly travelers who shared supplies! +${amt} lbs food.`,
                `A kind family heading east gave you some provisions. +${amt} lbs food.`,
                `Fellow pioneers share a meal with you. +${amt} lbs food.`
            ]);
        }
    },
    {
        id: "wagon_train",
        category: "people",
        weight: 1,
        texts: [
            "You joined a larger wagon train for the day. Safety in numbers.",
            "A group of wagons catches up. You travel together for a stretch.",
            "Other pioneers share stories around the fire tonight."
        ],
        effect: (state) => applyHealthChange(3)
    },
    {
        id: "grave_marker",
        category: "people",
        weight: 2,
        texts: [
            "You pass a grave marker by the trail. A somber reminder.",
            "A wooden cross marks a grave. Someone didn't make it.",
            "Several graves line the trail here. The journey claims many.",
            "A small grave marker reads a name you can barely make out. Rest in peace."
        ],
        effect: null
    },

    // === WILDLIFE ===
    {
        id: "wildlife_sighting",
        category: "wildlife",
        weight: 3,
        texts: [
            "A herd of antelope crosses the trail ahead.",
            "Prairie dogs watch curiously from their burrows.",
            "An eagle soars overhead, riding the thermals.",
            "You spot a family of deer at the treeline.",
            "Coyotes howl in the distance as night falls.",
            "A jackrabbit darts across the trail.",
            "Buffalo graze on the distant plains. A majestic sight."
        ],
        effect: null
    },
    {
        id: "snake_scare",
        category: "wildlife",
        weight: 1,
        texts: [
            "A rattlesnake on the trail! Everyone freezes until it slithers away.",
            "You nearly step on a snake. Heart pounding, you back away slowly.",
            "A snake spooks one of the oxen. It takes a moment to calm them."
        ],
        effect: (state) => applyHealthChange(-3)
    },

    // === SCENIC / FLAVOR ===
    {
        id: "scenic_vista",
        category: "scenic",
        weight: 2,
        texts: [
            "The view from this ridge is breathtaking.",
            "You crest a hill and the plains stretch endlessly before you.",
            "A stunning sunset paints the sky in oranges and purples.",
            "The stars tonight are incredible. More than you've ever seen.",
            "Morning fog lifts to reveal a beautiful valley."
        ],
        effect: null
    },
    {
        id: "river_ford_easy",
        category: "scenic",
        weight: 1,
        texts: [
            "You ford a small creek without trouble.",
            "A shallow stream crossing. The oxen barely get their feet wet.",
            "An easy creek crossing breaks up the monotony."
        ],
        effect: null,
        condition: (state) => !state.atRiver
    }
];

// ─── INTERACTIVE ENCOUNTERS ─────────────────────
// These PAUSE auto-travel and require a player choice.

const INTERACTIVE_ENCOUNTERS = [
    {
        id: "stranger_trade_food",
        category: "trade",
        weight: 2,
        prompt: (state) => pickRandom([
            "A lone traveler approaches your wagon. He offers to trade 30 lbs of food for $15.",
            "A grizzled trapper flags you down. \"I've got meat to sell — 30 lbs for $15.\"",
            "A woman with a handcart offers you dried provisions. 30 lbs for $15."
        ]),
        choices: [
            {
                text: "Accept the trade ($15 for 30 lbs food)",
                effect: (state) => {
                    state.money -= 15;
                    state.food += 30;
                    return "You complete the trade. +30 lbs food, -$15.";
                },
                condition: (state) => state.money >= 15
            },
            {
                text: "Decline politely",
                effect: (state) => {
                    return pickRandom([
                        "You politely decline. The traveler nods and moves on.",
                        "\"No thank you.\" The stranger tips their hat and continues on.",
                        "You pass on the offer. Can't spend what you might need later."
                    ]);
                }
            },
            {
                text: "Try to haggle ($10 instead)",
                effect: (state) => {
                    if (Math.random() > 0.5) {
                        state.money -= 10;
                        state.food += 30;
                        return "They accept your counter-offer! +30 lbs food, -$10.";
                    } else {
                        return pickRandom([
                            "They scoff and walk away. \"That's my price, take it or leave it.\"",
                            "\"I don't haggle.\" They leave without another word."
                        ]);
                    }
                },
                condition: (state) => state.money >= 10
            }
        ],
        condition: (state) => state.distance > 100
    },
    {
        id: "stranger_trade_parts",
        category: "trade",
        weight: 1,
        prompt: (state) => "A wagon ahead of you has broken down for good. The family offers spare parts for $5 — they won't be needing them anymore.",
        choices: [
            {
                text: "Buy the spare parts ($5)",
                effect: (state) => {
                    state.money -= 5;
                    state.spareParts += 1;
                    return "A sad transaction, but practical. +1 spare part set, -$5.";
                },
                condition: (state) => state.money >= 5
            },
            {
                text: "Offer them a ride instead",
                effect: (state) => {
                    state.food -= 10;
                    const msg = applyHealthChange(5);
                    return `You take them to the next fort. It costs food but feels right. -10 lbs food.${msg}`;
                },
                condition: (state) => state.food > 30
            },
            {
                text: "Wish them well and move on",
                effect: (state) => {
                    return "You tip your hat and continue. You hope they'll be alright.";
                }
            }
        ],
        condition: (state) => state.distance > 150
    },
    {
        id: "sick_child",
        category: "health",
        weight: 1,
        prompt: (state) => "One of the children has come down with a fever. They're shivering and can barely walk.",
        choices: [
            {
                text: "Use medicine to treat them",
                effect: (state) => {
                    state.medicine--;
                    const msg = applyHealthChange(15);
                    return `The medicine works. The fever breaks by morning.${msg}`;
                },
                condition: (state) => state.medicine > 0
            },
            {
                text: "Rest for a day and hope they recover",
                effect: (state) => {
                    state.food -= 8;
                    state.day++;
                    if (Math.random() > 0.4) {
                        const msg = applyHealthChange(5);
                        return `A day of rest helps. The child is feeling better. -8 lbs food, +1 day.${msg}`;
                    } else {
                        const msg = applyHealthChange(-15);
                        return `The fever worsens before improving. A scary night. -8 lbs food, +1 day.${msg}`;
                    }
                }
            },
            {
                text: "Push on — we can't afford to stop",
                effect: (state) => {
                    const msg = applyHealthChange(-20);
                    return `You press forward. The child suffers through the journey.${msg}`;
                }
            }
        ],
        condition: (state) => state.distance > 50 && state.health > 30
    },
    {
        id: "river_shortcut",
        category: "route",
        weight: 1,
        prompt: (state) => "You come to a fork in the trail. A hand-painted sign points to a shortcut that saves 2 days — but the path looks rough.",
        choices: [
            {
                text: "Take the shortcut",
                effect: (state) => {
                    if (Math.random() > 0.4) {
                        state.distance += 35;
                        const msg = applyHealthChange(-8);
                        return `The shortcut pays off! Rough but passable. +35 miles.${msg}`;
                    } else {
                        state.food -= 10;
                        const msg = applyHealthChange(-18);
                        return `Terrible idea. The path was nearly impassable. -10 lbs food.${msg}`;
                    }
                }
            },
            {
                text: "Stick to the main trail",
                effect: (state) => {
                    return "You stick to the proven path. Slow and steady.";
                }
            }
        ],
        condition: (state) => state.distance > 200 && state.distance < 1500
    },
    {
        id: "thief_in_night",
        category: "danger",
        weight: 1,
        prompt: (state) => "You wake to find someone rummaging through your supplies! They freeze when they see you.",
        choices: [
            {
                text: "Confront them",
                effect: (state) => {
                    if (Math.random() > 0.3) {
                        return "They drop everything and run. Nothing was taken.";
                    } else {
                        const lost = randInt(5, 15);
                        state.food -= lost;
                        const msg = applyHealthChange(-5);
                        return `A scuffle! They got away with ${lost} lbs of food.${msg}`;
                    }
                }
            },
            {
                text: "Shout for help",
                effect: (state) => {
                    const lost = randInt(5, 10);
                    state.food -= lost;
                    return `They flee into the darkness, taking ${lost} lbs of food with them.`;
                }
            },
            {
                text: "Offer them some food",
                effect: (state) => {
                    state.food -= 10;
                    const msg = applyHealthChange(3);
                    return `You give them 10 lbs of food. They thank you with tears in their eyes and disappear. -10 lbs food.${msg}`;
                },
                condition: (state) => state.food > 30
            }
        ],
        condition: (state) => state.distance > 100
    },
    {
        id: "wild_fruit_trees",
        category: "foraging",
        weight: 2,
        prompt: (state) => "You spot a grove of wild fruit trees just off the trail. It would take some time to gather them.",
        choices: [
            {
                text: "Spend time gathering fruit",
                effect: (state) => {
                    const amt = randInt(15, 30);
                    state.food += amt;
                    state.day++;
                    return `A productive stop! You gathered ${amt} lbs of fruit. +1 day.`;
                }
            },
            {
                text: "Grab a few handfuls and keep moving",
                effect: (state) => {
                    const amt = randInt(3, 8);
                    state.food += amt;
                    return `You quickly grab some fruit. +${amt} lbs food.`;
                }
            },
            {
                text: "Keep moving — no time to stop",
                effect: (state) => {
                    return "You press on. Every mile counts.";
                }
            }
        ]
    },
    {
        id: "abandoned_wagon",
        category: "discovery",
        weight: 1,
        prompt: (state) => "An abandoned wagon sits off the trail. It looks like it's been here a while. Worth searching?",
        choices: [
            {
                text: "Search thoroughly",
                effect: (state) => {
                    const roll = Math.random();
                    if (roll > 0.6) {
                        const food = randInt(10, 25);
                        const money = randInt(5, 15);
                        state.food += food;
                        state.money += money;
                        return `Jackpot! You found ${food} lbs of preserved food and $${money} hidden in the floorboards.`;
                    } else if (roll > 0.3) {
                        state.spareParts++;
                        return "You salvaged a usable set of spare parts. +1 spare parts.";
                    } else {
                        const msg = applyHealthChange(-5);
                        return `The wagon was a wreck. You cut your hand on a rusty nail searching through it.${msg}`;
                    }
                }
            },
            {
                text: "Quick glance and move on",
                effect: (state) => {
                    if (Math.random() > 0.5) {
                        const food = randInt(3, 8);
                        state.food += food;
                        return `A quick look turns up ${food} lbs of food. Not bad.`;
                    }
                    return "Nothing obvious. You move on.";
                }
            },
            {
                text: "Leave it alone — could be trouble",
                effect: (state) => {
                    return "You steer well clear. Better safe than sorry.";
                }
            }
        ],
        condition: (state) => state.distance > 80
    },
    {
        id: "native_encounter",
        category: "people",
        weight: 1,
        prompt: (state) => "You encounter a group of Native Americans near the trail. They signal they wish to trade.",
        choices: [
            {
                text: "Trade clothing for food (1 set for 25 lbs)",
                effect: (state) => {
                    state.clothing--;
                    state.food += 25;
                    return "A fair trade. You exchange clothing for dried buffalo meat. +25 lbs food, -1 clothing.";
                },
                condition: (state) => state.clothing > 0
            },
            {
                text: "Trade money for guidance ($10)",
                effect: (state) => {
                    state.money -= 10;
                    state.distance += 20;
                    const msg = applyHealthChange(5);
                    return `They show you a better path through the area. +20 miles, -$10.${msg}`;
                },
                condition: (state) => state.money >= 10
            },
            {
                text: "Wave and continue on",
                effect: (state) => {
                    return "You exchange friendly waves and continue on the trail.";
                }
            }
        ],
        condition: (state) => state.distance > 150 && state.distance < 1600
    }
];

// ─── EVENT ROLLING ──────────────────────────────

// Roll a passive event. Returns null if no event fires.
function rollPassiveEvent(state) {
    // ~60% chance of an event each tick
    if (Math.random() > 0.60) return null;

    const eligible = PASSIVE_EVENTS.filter(e =>
        !e.condition || e.condition(state)
    );

    const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const event of eligible) {
        roll -= event.weight;
        if (roll <= 0) return event;
    }

    return null;
}

// Roll an interactive encounter. Returns null if none fires.
function rollInteractiveEncounter(state) {
    // ~8% chance per tick, increasing slightly as journey progresses
    const baseChance = 0.08;
    const progressBonus = (state.distance / GOAL_DISTANCE) * 0.04;
    if (Math.random() > baseChance + progressBonus) return null;

    const eligible = INTERACTIVE_ENCOUNTERS.filter(e =>
        !e.condition || e.condition(state)
    );

    if (eligible.length === 0) return null;

    const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const encounter of eligible) {
        roll -= encounter.weight;
        if (roll <= 0) return encounter;
    }

    return null;
}

// Get the display text for a passive event
function getPassiveEventText(event, state) {
    if (event.getText) return event.getText(state);
    if (event.texts) return pickRandom(event.texts);
    return "";
}

// Get the prompt text for an interactive encounter
function getEncounterPrompt(encounter, state) {
    if (typeof encounter.prompt === 'function') return encounter.prompt(state);
    return encounter.prompt;
}

// Get available choices for an encounter (filtered by conditions)
function getEncounterChoices(encounter, state) {
    return encounter.choices.filter(c =>
        !c.condition || c.condition(state)
    );
}
