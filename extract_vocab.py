#!/usr/bin/env python3
import json
import re
import pymupdf

# 1. Extract Groups 1 to 32 from PDF
doc = pymupdf.open("GregMat_Vocab_3.pdf")
groups = []

for page_idx, page in enumerate(doc):
    blocks = page.get_text("blocks")
    group_num = page_idx + 1
    cards = []
    for b in blocks:
        text = b[4].strip()
        if not text:
            continue
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        # Check header
        if len(lines) == 1 and re.match(r"^Group\s+\d+$", lines[0], re.IGNORECASE):
            continue
        word = lines[0]
        if word.lower().startswith("group "):
            if len(lines) > 1:
                word = lines[1]
                definition = " ".join(lines[2:])
                cards.append({"id": f"g{group_num}_w{len(cards)+1}", "word": word, "definition": definition, "group": group_num})
            continue
        definition = " ".join(lines[1:]) if len(lines) > 1 else ""
        # Overrides for typo duplications in GregMat_Vocab_3.pdf:
        if word == "utterly" and group_num == 5:
            definition = "completely and totally; absolutely"
        elif word == "palpable" and group_num == 8:
            definition = "able to be touched or felt; easily perceived or tangible"
        elif word == "regress" and group_num == 23:
            definition = "return to a former or less developed state; revert"
        cards.append({"id": f"g{group_num}_w{len(cards)+1}", "word": word, "definition": definition, "group": group_num})
    
    assert len(cards) == 30, f"Group {group_num} has {len(cards)} words, expected 30!"
    groups.append({
        "group": group_num,
        "title": f"Group {group_num}",
        "cards": cards
    })

print(f"Extracted {len(groups)} groups from PDF.")

# 2. Add Groups 33 and 34 (30 words each)
group_33_words = [
    ("affluent", "having a great deal of money; wealthy and prosperous"),
    ("allegorical", "containing or expressing symbolic representation; metaphorical or figurative"),
    ("allude", "suggest or call attention to indirectly; hint at without direct mention"),
    ("amplify", "increase the volume, intensity, scope, or detail of an idea or sound"),
    ("catastrophic", "involving or causing sudden, extensive damage, ruin, or suffering; disastrous"),
    ("contemporary", "living or occurring at the same time; modern; belonging to the present"),
    ("conundrum", "a confusing, intricate, and difficult problem or question; riddle"),
    ("detract", "diminish the worth, value, or importance of a quality or achievement"),
    ("detrimental", "tending to cause damage, harm, or disadvantage; injurious"),
    ("devious", "showing a skillful use of underhanded, deceitful tactics to achieve goals"),
    ("dormant", "having normal physical functions suspended or slowed down; inactive; asleep"),
    ("draconian", "excessively harsh, severe, and cruel (especially of laws or rules)"),
    ("egalitarian", "believing in or based on the principle of equal rights and opportunities for all"),
    ("elusive", "difficult to find, catch, comprehend, or achieve; hard to pin down"),
    ("erstwhile", "former; of a previous time; in the past"),
    ("gloat", "dwell on one's own success or another's misfortune with smugness or malicious pleasure"),
    ("harrowing", "acutely distressing, terrifying, or agonizing to the mind or feelings"),
    ("indefinite", "lasting for an unknown or unstated length of time; vague and not clearly defined"),
    ("ingenious", "clever, highly original, and inventive in mental conception or design"),
    ("keen", "1. sharp and penetrating 2. highly developed (of senses) 3. eager and enthusiastic"),
    ("multifaceted", "having many facets, distinct aspects, or sides to consider"),
    ("omniscient", "knowing everything; possessing universal, infinite knowledge"),
    ("remarkable", "worthy of attention; extraordinary, striking, or exceptional"),
    ("sober", "1. serious, sensible, and solemn in demeanor 2. not affected by alcohol"),
    ("stem from", "originate from, arise as a consequence of, or be caused by"),
    ("subdued", "quiet, rather reflective or depressed; soft, muted, and restrained"),
    ("token", "serving as a visual symbol, gesture, or badge; done merely for appearances"),
    ("unravel", "undo twisted threads; solve a mystery or puzzle; fall apart or disintegrate"),
    ("unscathed", "without suffering any injury, harm, or damage; unharmed"),
    ("virtuoso", "a person highly skilled in music, art, or another specialized technical pursuit")
]

group_34_words = [
    ("abrasive", "1. harsh, irritating, or overly aggressive in manner 2. rough enough to wear away surfaces by friction"),
    ("artful", "clever or skillful, typically in a crafty, cunning, or deceitful way"),
    ("avert", "1. turn away one's eyes or thoughts 2. prevent or ward off an undesirable occurrence"),
    ("avid", "having or showing a keen interest in, enthusiasm for, or greed for something"),
    ("brevity", "concise and exact use of words in writing or speech; shortness of duration"),
    ("bromide", "a trite, unoriginal, and clichéd remark, typically intended to soothe or placate"),
    ("circumstantial", "1. pointing indirectly toward someone's guilt but not conclusively proving it 2. full of detail"),
    ("cloying", "disgust or sicken someone with an excess of sweetness, richness, or sentimentality"),
    ("counterfeit", "made in exact imitation of something valuable with the intention to deceive or defraud; fake"),
    ("denigrate", "criticize unfairly; disparage, belittle, or attack the reputation of"),
    ("disciple", "a dedicated follower or pupil of a teacher, leader, or philosophy"),
    ("extol", "praise enthusiastically, highly, and lavishly"),
    ("forebode", "act as an advance warning or omen of something bad; presage or portend"),
    ("ideologue", "an uncompromising and dogmatic adherent to a particular ideology, doctrine, or system of beliefs"),
    ("impediment", "a hindrance, obstruction, or obstacle in doing something"),
    ("imperative", "of vital importance; crucial, essential, or urgent; giving an authoritative command"),
    ("impulsive", "acting or done suddenly without forethought, reflection, or planning"),
    ("interminable", "endless or seemingly endless, often tediously or monotonously so"),
    ("intuitive", "using or based on what one feels to be true without conscious reasoning; instinctive"),
    ("lassitude", "a state of physical or mental weariness, lethargy, or lack of energy"),
    ("omit", "leave out or exclude someone or something, either intentionally or forgetfully"),
    ("ornate", "made in an intricate shape or decorated with complex patterns; elaborately adorned"),
    ("paltry", "small, meager, or insufficient in amount; petty, trivial, or worthless"),
    ("pejorative", "expressing contempt, derision, disapproval, or belittlement; derogatory"),
    ("prefigure", "be an early indication, symbol, or preliminary version of something; foreshadow"),
    ("presage", "be a sign or warning that something (typically bad) will happen; foreshadow; portend"),
    ("prescribe", "1. lay down authoritatively as a guide, direction, or rule 2. authorize the use of a medicine"),
    ("prevail", "1. prove more powerful than opposing forces; be victorious; triumph 2. be widespread or current"),
    ("propitiate", "win or regain the favor of someone by doing something pleasing; appease or conciliate"),
    ("recapitulate", "summarize and state again the main points of; recap")
]

groups.append({
    "group": 33,
    "title": "Group 33",
    "cards": [{"id": f"g33_w{i+1}", "word": w, "definition": d, "group": 33} for i, (w, d) in enumerate(group_33_words)]
})

groups.append({
    "group": 34,
    "title": "Group 34",
    "cards": [{"id": f"g34_w{i+1}", "word": w, "definition": d, "group": 34} for i, (w, d) in enumerate(group_34_words)]
})

# Create word lookup table
word_lookup = {}
for g in groups:
    for c in g["cards"]:
        word_lookup[c["word"].lower()] = {
            "id": c["id"],
            "word": c["word"],
            "group": c["group"],
            "definition": c["definition"]
        }

# 3. Comprehensive Cross-Group Synonyms (linking all 34 groups!)
cross_group_synonyms = [
    {
        "id": "syn_boring_dull",
        "theme": "Boring, Dull, Commonplace & Clichéd",
        "summary": "High-frequency GRE terms describing unoriginal, unexciting, or flavorless things.",
        "words": ["humdrum", "insipid", "banal", "prosaic", "pedestrian", "vapid", "monotonous", "tedious", "ponderous", "bromide"]
    },
    {
        "id": "syn_calm_pacify",
        "theme": "Calm, Soothe, Pacify & Mollify",
        "summary": "Words focused on decreasing anger, soothing pain, or restoring calm.",
        "words": ["placate", "assuage", "mitigate", "placid", "appease", "mollify", "conciliatory", "propitiate"]
    },
    {
        "id": "syn_talkative",
        "theme": "Talkative, Wordy & Fluent",
        "summary": "Words describing individuals who talk excessively or expressively.",
        "words": ["loquacious", "verbose", "garrulous", "voluble", "expatiate"]
    },
    {
        "id": "syn_silent_reserved",
        "theme": "Quiet, Reserved, Silent & Laconic",
        "summary": "Words for people of few words, quiet demeanor, or restrained expression.",
        "words": ["taciturn", "subdued", "sober"]
    },
    {
        "id": "syn_criticize_scold",
        "theme": "Scold, Criticize, Condemn & Censure",
        "summary": "Direct, severe scolding, expressing strong disapproval or verbal assault.",
        "words": ["castigate", "censure", "admonish", "assail", "opprobrium", "denigrate", "pejorative"]
    },
    {
        "id": "syn_praise_worship",
        "theme": "Praise, Commend, Revere & Venerate",
        "summary": "Deep respect, worshipful praise, or enthusiastic public commendation.",
        "words": ["deify", "canonize", "approbation", "laudable", "venerate", "acclaim", "cherish", "extol"]
    },
    {
        "id": "syn_harmful_damaging",
        "theme": "Harmful, Destructive, Lethal & Injurious",
        "summary": "Causing serious harm, corruption, or ruinous damage.",
        "words": ["inimical", "deleterious", "pernicious", "vitiate", "detrimental", "catastrophic"]
    },
    {
        "id": "syn_harmless_pure",
        "theme": "Harmless, Pure, Innocent & Unscathed",
        "summary": "Lacking hurtful intent, gentle, or completely undamaged.",
        "words": ["benign", "artless", "ingenuous", "unscathed"]
    },
    {
        "id": "syn_stubborn_obstinate",
        "theme": "Stubborn, Intractable, Obstinate & Obdurate",
        "summary": "Refusing to change one's mind, unyielding to persuasion or authority.",
        "words": ["dogmatic", "headstrong", "obstinate", "obdurate", "pertinacious", "intransigent", "ideologue"]
    },
    {
        "id": "syn_submissive_obedient",
        "theme": "Submissive, Obedient, Yielding & Compliant",
        "summary": "Ready to submit to authority, easily managed, or yielding.",
        "words": ["obsequious", "amenable", "acquiesce", "yield", "disciple"]
    },
    {
        "id": "syn_deceitful_cunning",
        "theme": "Deceitful, Cunning, Crafty & Underhanded",
        "summary": "Using trickery, hidden motives, or artful tactics to achieve goals.",
        "words": ["belie", "chicanery", "wily", "devious", "artful", "counterfeit"]
    },
    {
        "id": "syn_honest_candid",
        "theme": "Honest, Candid, Genuine & Veritable",
        "summary": "Straightforward, free from deception or pretense.",
        "words": ["candid", "veritable"]
    },
    {
        "id": "syn_sharp_astute",
        "theme": "Sharp Intellect, Keen, Astute & Perspicacious",
        "summary": "Quickness in understanding, penetrating mental judgment, or great wisdom.",
        "words": ["cerebral", "profundity", "acumen", "adept", "ingenious", "keen", "virtuoso"]
    },
    {
        "id": "syn_obscure_arcane",
        "theme": "Difficult to Understand, Obscure & Arcane",
        "summary": "Comprehended by very few people, cryptic, or highly intricate.",
        "words": ["convoluted", "arcane", "opaque", "enigmatic", "esoteric", "abstruse"]
    },
    {
        "id": "syn_fleeting_brief",
        "theme": "Fleeting, Brief, Short-Lived & Ephemeral",
        "summary": "Lasting for an extremely brief duration; transitory.",
        "words": ["brevity", "cursory"]
    },
    {
        "id": "syn_fickle_unpredictable",
        "theme": "Fickle, Unpredictable, Wavering & Capricious",
        "summary": "Constantly shifting moods, erratic, or wavering indecisively.",
        "words": ["capricious", "vacillate", "irresolute", "volatile"]
    },
    {
        "id": "syn_bold_daring",
        "theme": "Bold, Fearless, Daring & Brazen",
        "summary": "Unafraid of danger, taking bold risks, or shamelessly forward.",
        "words": ["audacious", "brazen", "valor", "bravado", "temerity"]
    },
    {
        "id": "syn_wealth_abundance",
        "theme": "Wealthy, Abundant, Plentiful & Increasing",
        "summary": "Possessing great abundance, overflowing quantities, or expanding.",
        "words": ["abound", "aggrandize", "burgeon", "affluent", "amplify"]
    },
    {
        "id": "syn_greed_stingy",
        "theme": "Greed, Extravagance & Reckless Spending",
        "summary": "Excessive desire for wealth or extreme reckless expenditure.",
        "words": ["spendthrift", "avaricious", "extravagant"]
    },
    {
        "id": "syn_hostile_aggressive",
        "theme": "Hostile, Aggressive, Bitter & Pugnacious",
        "summary": "Deep resentment, stinging language, or eagerness to fight.",
        "words": ["caustic", "antipathy", "polemical", "acrimonious", "assail", "antagonize", "abrasive"]
    },
    {
        "id": "syn_deviating_unusual",
        "theme": "Deviating from Normal, Eccentric & Unusual",
        "summary": "Departing markedly from accepted norms or expectations.",
        "words": ["anomalous", "anachronistic", "aberrant", "peculiar"]
    },
    {
        "id": "syn_peak_pinnacle",
        "theme": "Highest Point, Peak, Summit & Zenith",
        "summary": "The ultimate pinnacle or culmination of a state or career.",
        "words": ["zenith", "apex", "acme", "culmination"]
    },
    {
        "id": "syn_flee_escape",
        "theme": "Flee, Escape & Hurry Away",
        "summary": "Departing hurriedly or secretly to evade detection.",
        "words": ["abscond", "avert"]
    },
    {
        "id": "syn_cancel_abolish",
        "theme": "Cancel, Abolish, Repeal & Abrogate",
        "summary": "Formally putting an end to a law, rule, or custom.",
        "words": ["abrogate", "abjure"]
    },
    {
        "id": "syn_energy_vitality",
        "theme": "High Energy, Vitality, Ardor & Passion",
        "summary": "Full of vigorous life, enthusiasm, or fiery passion.",
        "words": ["alacrity", "invigorate", "fervid", "arresting", "vivacious", "verve", "avid"]
    },
    {
        "id": "syn_exhausted_weak",
        "theme": "Exhausted, Drained & Lacking Energy",
        "summary": "Sapping strength, fatigue, or making someone infirm.",
        "words": ["enervate", "lassitude", "dormant"]
    },
    {
        "id": "syn_divide_split",
        "theme": "Separate, Split, Isolate & Estrange",
        "summary": "Dividing into opposing camps or alienating individuals.",
        "words": ["polarize", "estranged", "alienate", "schism"]
    },
    {
        "id": "syn_unite_combine",
        "theme": "Unite, Merge, Coalesce & Agreement",
        "summary": "Bringing distinct elements into harmony or one unified whole.",
        "words": ["homogeneous", "coalesce", "consensus"]
    },
    {
        "id": "syn_foreshadow_omen",
        "theme": "Foreshadow, Presage, Omen & Portend",
        "summary": "Signs, warnings, or representations of future events before they occur.",
        "words": ["presage", "forebode", "prefigure"]
    }
]

# Enrich cross group synonyms with word metadata (group, definition, card ID)
enriched_cross_synonyms = []
for syn in cross_group_synonyms:
    word_items = []
    for w in syn["words"]:
        info = word_lookup.get(w.lower())
        if info:
            word_items.append({
                "word": info["word"],
                "group": info["group"],
                "definition": info["definition"],
                "id": info["id"]
            })
        else:
            # Fallback if case or slight variation
            word_items.append({
                "word": w,
                "group": 0,
                "definition": "",
                "id": f"syn_{w}"
            })
    enriched_cross_synonyms.append({
        "id": syn["id"],
        "theme": syn["theme"],
        "summary": syn["summary"],
        "words": word_items
    })

# In-group clusters
group_clusters = {
    1: [
        {"theme": "Talking & Speech", "words": ["loquacious", "taciturn"], "notes": "Loquacious (talkative) is an antonym of Taciturn (quiet/reserved)."},
        {"theme": "Boring, Dull & Lacking Flavor", "words": ["humdrum", "insipid"], "notes": "Both describe dull, unexciting, or flavorless things."},
        {"theme": "Careless vs Cautious", "words": ["cursory", "negligent", "flout", "wary"], "notes": "Cursory and negligent lack care; flout ignores rules; wary exercises caution."},
        {"theme": "Unpredictable & Immature", "words": ["capricious", "puerile"], "notes": "Capricious (fickle/unstable mood) and puerile (childish)."},
        {"theme": "Intellectual & Educational", "words": ["cerebral", "didactic"], "notes": "Cerebral deals with brain/intellect; didactic is meant for teaching."},
        {"theme": "Praising, Pleasing & Venerating", "words": ["deify", "placate", "congenial"], "notes": "Deify (revere as god), placate (calm/appease), congenial (pleasant/friendly)."},
        {"theme": "Form, Structure & Abundance", "words": ["abound", "disseminate", "homogeneous", "amorphous"], "notes": "Abound (plentiful), disseminate (spread), homogeneous (uniform), amorphous (shapeless)."},
        {"theme": "Deception & Contrast", "words": ["belie", "misnomer", "conspicuous"], "notes": "Belie disguises or contradicts appearance; misnomer is a misleading name; conspicuous is obvious."}
    ],
    2: [
        {"theme": "Greed, Excess & Spending", "words": ["avaricious", "aggrandize", "brazen"], "notes": "Avaricious (greedy), aggrandize (increase power/wealth), brazen (shamelessly bold)."},
        {"theme": "Harsh Criticism & Slander", "words": ["castigate", "calumny", "caustic"], "notes": "Castigate (scold harshly), calumny (slander), caustic (bitter/cutting speech)."},
        {"theme": "Honesty & Regret", "words": ["candid", "contrite", "ingenuous"], "notes": "Candid (frank/honest), contrite (remorseful), ingenuous (innocent/unworldly)."},
        {"theme": "Improving vs Corrupting", "words": ["ameliorate", "adulterate"], "notes": "Ameliorate (make better) vs Adulterate (taint/degrade quality)."},
        {"theme": "Support & Receptive", "words": ["advocate", "amenable", "alacrity"], "notes": "Advocate (support), amenable (open/responsive), alacrity (eager willingness)."},
        {"theme": "Unoriginal & Complex", "words": ["banal", "convoluted"], "notes": "Banal (dull/clichéd), convoluted (intricate/difficult to understand)."}
    ],
    3: [
        {"theme": "Decreasing & Calming", "words": ["abate", "assuage"], "notes": "Both mean reducing intensity, pain, or severity."},
        {"theme": "Praise & Worship vs Criticism", "words": ["canonize", "censure"], "notes": "Canonize (revere as saint/god) vs Censure (harshly condemn)."},
        {"theme": "Strict Lifestyle & Hardship", "words": ["ascetic", "arduous"], "notes": "Ascetic (denying luxury/severe self-discipline), arduous (strenuous/difficult)."},
        {"theme": "Hatred & Opposition", "words": ["antipathy", "polarize", "contend"], "notes": "Antipathy (deep hostility), polarize (divide into opposing camps), contend (dispute/argue)."},
        {"theme": "Persuasive & Compelling", "words": ["cogent", "compelling"], "notes": "Cogent and compelling both describe clear, forceful, convincing arguments."},
        {"theme": "Rapid Growth & Uniting", "words": ["burgeon", "coalesce"], "notes": "Burgeon (grow quickly), coalesce (merge/unite together)."}
    ],
    4: [
        {"theme": "Energy & Vitality vs Fatigue", "words": ["invigorate", "fervid", "enervate"], "notes": "Invigorate and fervid represent energy and passion; enervate means exhausting energy."},
        {"theme": "Talkative & Expressive", "words": ["garrulous", "polemical"], "notes": "Garrulous (overly talkative), polemical (argumentative/controversial)."},
        {"theme": "Harmful vs Mitigating", "words": ["inimical", "incendiary", "mitigate"], "notes": "Inimical (harmful/hostile) and incendiary (stirring conflict) vs Mitigate (lessen harm)."},
        {"theme": "Praise & Protection", "words": ["approbation", "cherish", "corroborate"], "notes": "Approbation (approval/praise), cherish (value deeply), corroborate (confirm/support)."},
        {"theme": "Calm & Stable", "words": ["placid", "vacillate"], "notes": "Placid (calm and peaceful) vs Vacillate (waver indecisively)."}
    ],
    34: [
        {"theme": "Foreshadowing, Omens & Warnings", "words": ["forebode", "presage", "prefigure"], "notes": "All three words deal with predicting, warning of, or signaling future events beforehand."},
        {"theme": "Praise vs Criticism & Contempt", "words": ["extol", "denigrate", "pejorative"], "notes": "Extol (lavish praise) contrasts with Denigrate (disparage/belittle) and Pejorative (expressing contempt)."},
        {"theme": "Deception, Craft & Pretense", "words": ["artful", "counterfeit"], "notes": "Artful (crafty/cunning) and counterfeit (fraudulent imitation intended to deceive)."},
        {"theme": "Time, Conciseness & Duration", "words": ["brevity", "interminable", "recapitulate"], "notes": "Brevity (shortness/conciseness) contrasts with Interminable (endless); recapitulate summarizes concisely."},
        {"theme": "Energy & Impulsiveness vs Fatigue", "words": ["avid", "impulsive", "lassitude"], "notes": "Avid (eager/enthusiastic) and impulsive (rash action) contrast with Lassitude (weariness/lethargy)."},
        {"theme": "Appeasing, Soothing & Conquering", "words": ["propitiate", "bromide", "prevail"], "notes": "Propitiate (appease/win favor) and bromide (soothing cliché) vs Prevail (triumph/overcome)."},
        {"theme": "Ideology, Dogma & Followership", "words": ["ideologue", "disciple"], "notes": "Ideologue (inflexible doctrine follower) and disciple (dedicated pupil/follower)."},
        {"theme": "Obstacles & Authoritative Directives", "words": ["impediment", "imperative", "prescribe"], "notes": "Impediment (hindrance/obstacle); imperative (vital necessity/command); prescribe (authoritatively direct)."},
        {"theme": "Elaboration, Sweetness & Worthlessness", "words": ["cloying", "ornate", "paltry"], "notes": "Cloying (excessive sweetness), ornate (elaborately decorated), and paltry (meager/worthless)."}
    ]
}

for g in groups:
    g_num = g["group"]
    g["clusters"] = group_clusters.get(g_num, [])

# Output JS
output_js = f"""// GRE 34 Groups Vocabulary Dataset
// Auto-generated from GregMat_Vocab_3.pdf + Groups 33 & 34 + Cross-Group Synonyms
const VOCAB_DATA = {json.dumps(groups, indent=2)};

const CROSS_GROUP_SYNONYMS = {json.dumps(enriched_cross_synonyms, indent=2)};

if (typeof module !== 'undefined' && module.exports) {{
    module.exports = {{ VOCAB_DATA, CROSS_GROUP_SYNONYMS }};
}}
"""

with open("vocab_data.js", "w") as f:
    f.write(output_js)

print("Regenerated vocab_data.js with CROSS_GROUP_SYNONYMS successfully!")
