/**
 * src/lib/assessment/measuredTests.ts
 *
 * No-instrument measured outcome tests (stopwatch, tape, chair, wall, step,
 * goniometer): protocols, equipment, safety notes and sourced
 * interpretation. Results keep their raw trials, conditions and validity —
 * none of this feeds the Mobility Score. Ported from the Vyayama v9
 * clinical reference (data_fxlib.js + fx_logic.js).
 */

import type { AssessmentState, MeasuredTestDef, PathwayId, Region } from "./types";

export const BASIC_KIT = ["Stopwatch", "Measuring tape", "Chair (43–46 cm seat)", "Wall", "Step", "Goniometer", "Cones or tape marks"];
export const EXTRA_KIT = [
  { id: "dyna", l: "Hand-held or grip dynamometer" }, { id: "scolio", l: "Scoliometer" }, { id: "inclin", l: "Inclinometer" },
  { id: "corridor", l: "30 m corridor" }, { id: "ybal", l: "Y-balance kit" },
];
export const FX_CATS = ["Balance & falls", "Strength & endurance", "Walking", "Function", "Mobility", "Hypermobility", "Pelvic", "Sport", "Fitness"];
export const PHASE_OK: Record<string, string[]> = {
  low: ["calm", "heal", "mobilise", "strengthen", "flourish"],
  mod: ["heal", "mobilise", "strengthen", "flourish"],
  high: ["strengthen", "flourish"],
};

export const FX: MeasuredTestDef[] = [
  { id: "sts5", n: "Five Times Sit-to-Stand", cat: "Strength & endurance", cls: "Quantified", kind: "num", u: "s", bi: false, trials: 2, agg: "best", dir: -1, load: "low", paths: ["senior", "neuro", "preop", "postop", "chronic", "gen", "women"] as PathwayId[], regions: ["lumbar", "hip", "knee", "ankle"] as Region[],
    purpose: "Lower-limb strength and power for transfers; falls risk in older adults.",
    protocol: "Chair against a wall, 43–46 cm seat, no armrests used. Arms crossed on the chest. 'Stand up fully and sit down five times as fast as you safely can.' Start the watch on 'Go'; stop when the buttocks touch the seat after the fifth stand.",
    equip: ["Stopwatch", "Chair (43–46 cm seat)", "Wall"], pos: "Seated, back against the backrest, feet flat about hip-width.",
    safety: "Stand beside the patient. Stop for dizziness, pain over 5/10 or loss of balance.",
    limits: "Affected by chair height, arm use and motivation. Different reference populations give different cut-offs." },
  { id: "cst30", n: "30-Second Chair Stand", cat: "Strength & endurance", cls: "Quantified", kind: "num", u: "reps", bi: false, trials: 1, agg: "first", dir: 1, load: "low", paths: ["senior", "preop", "postop", "chronic", "gen", "women"] as PathwayId[], regions: ["hip", "knee"] as Region[],
    purpose: "Leg strength and endurance; part of CDC STEADI and the OARSI hip and knee OA set.",
    protocol: "Chair against a wall, 43 cm seat. Arms crossed. Count full stands in 30 seconds. If more than halfway up at 30 s, count it as a stand. One trial after a practice rep.",
    equip: ["Stopwatch", "Chair (43–46 cm seat)", "Wall"], pos: "Seated in the middle of the chair, feet flat.",
    safety: "Stop if unsafe. If the patient must use the arms, score 0 for the standard test and note it (or record as modified).",
    limits: "Age- and sex-specific reference values only cover 60–94 years." },
  { id: "tug", n: "Timed Up and Go", cat: "Balance & falls", cls: "Quantified", kind: "num", u: "s", bi: false, trials: 2, agg: "best", dir: -1, load: "low", paths: ["senior", "neuro", "preop", "postop", "gen"] as PathwayId[], regions: null,
    purpose: "Functional mobility: stand, walk 3 m, turn, return, sit.",
    protocol: "Standard armchair. Line 3 m from the chair. 'On Go, stand up, walk at your normal pace to the line, turn, walk back and sit down.' Usual footwear and walking aid. Start on 'Go'; stop when seated. One practice, then time it.",
    equip: ["Stopwatch", "Chair (43–46 cm seat)", "Measuring tape", "Cones or tape marks"], pos: "Seated, back against the chair.",
    safety: "Walk beside the patient.", limits: "Cut-off values vary across populations; a single value has limited accuracy for predicting falls." },
  { id: "fourStage", n: "Four-Stage Balance Test", cat: "Balance & falls", cls: "Grade", kind: "scale", bi: false, dir: 1, load: "low", paths: ["senior", "neuro", "gen"] as PathwayId[], regions: null,
    opts: ["Can't hold feet together 10 s", "Feet together 10 s", "Semi-tandem 10 s", "Tandem 10 s", "Single leg 10 s"],
    purpose: "Static balance (CDC STEADI).", protocol: "Without support, hold each position for 10 s: feet side by side, instep of one foot touching the big toe of the other, tandem (heel to toe), then single leg. Stop at the first stage not held for 10 s. Record the highest stage held.",
    equip: ["Stopwatch"], pos: "Standing, near a wall or counter.", safety: "Stand close enough to steady the patient.", limits: "Ceiling effect in active adults." },
  { id: "gait", n: "Gait speed (10-metre walk)", cat: "Walking", cls: "Quantified", kind: "gait", u: "m/s", dists: [4, 6, 10], bi: false, trials: 2, agg: "mean", dir: 1, load: "low", paths: ["senior", "neuro", "postop", "preop", "chronic", "gen"] as PathwayId[], regions: ["hip", "knee", "ankle", "lumbar"] as Region[],
    purpose: "Comfortable walking speed, a strong marker of health and function in older adults.",
    protocol: "Mark a 10 m walkway with 2 m extra at each end for speeding up and slowing down. Time the middle 6 m at the patient's comfortable pace (4 m is acceptable where space is short). Choose the timed distance, enter the seconds; speed is calculated.",
    equip: ["Stopwatch", "Measuring tape", "Cones or tape marks"], pos: "Standing, usual footwear and aid.", safety: "Walk beside the patient if unsteady.",
    limits: "Timed distance, acceleration zones and pace instructions must be the same each time to compare." },
  { id: "frt", n: "Functional Reach Test", cat: "Balance & falls", cls: "Quantified", kind: "num", u: "cm", bi: false, trials: 3, agg: "mean", dir: 1, load: "low", paths: ["senior", "neuro"] as PathwayId[], regions: null,
    purpose: "Forward reach while standing, a measure of balance limits.",
    protocol: "Tape on the wall at shoulder height. Patient stands side-on, arm raised to 90° with a fist. Note the start point at the knuckle, then 'reach forward as far as you can without taking a step'. Measure the distance moved. One practice, then the mean of 3 trials.",
    equip: ["Measuring tape", "Wall"], pos: "Standing, feet shoulder-width, next to the wall.", safety: "Stand on the reaching side.", limits: "Trunk rotation and scapular protraction can inflate the reach." },
  { id: "sls", n: "Single-leg stance, eyes open", cat: "Balance & falls", cls: "Quantified", kind: "num", u: "s", bi: true, trials: 3, agg: "best", dir: 1, load: "low", paths: ["senior", "sport", "gen", "kids", "women", "neuro"] as PathwayId[], regions: ["hip", "knee", "ankle", "lumbar"] as Region[],
    purpose: "Static single-leg balance.",
    protocol: "Arms crossed, stand on one leg with the other foot raised near the ankle (not touching). Time until the raised foot touches down, the stance foot moves, or the arms uncross. Maximum 45 s. Best of 3.",
    equip: ["Stopwatch"], pos: "Standing, barefoot or usual shoes (record which).", safety: "Near a wall or counter.", limits: "Footwear and arm position change results." },
  { id: "slsEC", n: "Single-leg stance, eyes closed", cat: "Balance & falls", cls: "Quantified", kind: "num", u: "s", bi: true, trials: 3, agg: "best", dir: 1, load: "low", paths: ["sport", "gen", "neuro"] as PathwayId[], regions: ["ankle", "knee", "hip"] as Region[],
    purpose: "Single-leg balance without vision (proprioception).", protocol: "As for eyes open, with eyes closed. Maximum 45 s. Best of 3.",
    equip: ["Stopwatch"], pos: "Standing.", safety: "Stand close; high fall risk patients should not do this.", limits: "Floor effect in older adults." },
  { id: "heel", n: "Single-leg heel-raise test", cat: "Strength & endurance", cls: "Quantified", kind: "num", u: "reps", bi: true, trials: 1, agg: "first", dir: 1, load: "mod", paths: ["sport", "gen", "senior", "postop"] as PathwayId[], regions: ["ankle", "knee"] as Region[],
    purpose: "Calf muscle endurance; side-to-side comparison.",
    protocol: "Stand on one leg, fingertips on the wall for balance only. Raise the heel as high as possible and lower fully, one rep every 2 s (metronome or count). Stop when height drops by about half, rhythm is lost, or the knee bends.",
    equip: ["Wall"], pos: "Standing on the test leg, knee straight.", safety: "Stop for sharp Achilles pain.", limits: "Height, pace and stopping rules vary between protocols." },
  { id: "ktw", n: "Knee-to-wall (weight-bearing lunge)", cat: "Mobility", cls: "Quantified", kind: "num", u: "cm", bi: true, trials: 3, agg: "best", dir: 1, load: "low", paths: ["sport", "gen", "postop", "kids"] as PathwayId[], regions: ["ankle", "knee"] as Region[],
    purpose: "Ankle dorsiflexion in weight-bearing.",
    protocol: "Foot perpendicular to the wall. Lunge the knee to touch the wall with the heel down. Move the foot back until the knee just touches with the heel flat. Measure big toe to wall. Best of 3.",
    equip: ["Measuring tape", "Wall"], pos: "Half-kneel or standing lunge.", safety: "Stop for anterior ankle pinching pain; record as symptom.", limits: "Measure in the same way each time (toe-to-wall distance)." },
  { id: "slsq", n: "Single-leg squat quality", cat: "Function", cls: "Observation", kind: "scale", bi: true, dir: 1, load: "mod", paths: ["sport", "gen", "kids", "women"] as PathwayId[], regions: ["hip", "knee", "ankle", "lumbar"] as Region[],
    opts: ["Poor", "Fair", "Good"], purpose: "Movement quality: knee valgus, pelvic drop, trunk lean.", protocol: "Arms crossed, squat on one leg to about 45–60° knee bend, 5 reps. Rate the overall control.",
    equip: [], pos: "Standing.", safety: "Not with high irritability.", limits: "Observer rating; moderate reliability." },
  { id: "step", n: "Step-down quality", cat: "Function", cls: "Observation", kind: "scale", bi: true, dir: 1, load: "mod", paths: ["sport", "gen"] as PathwayId[], regions: ["knee", "hip"] as Region[],
    opts: ["Poor", "Fair", "Good"], purpose: "Control of the knee and pelvis lowering off a step.", protocol: "Stand on a 15–20 cm step, slowly lower the other heel to the floor, 5 reps.",
    equip: ["Step"], pos: "Standing on a step.", safety: "Rail nearby.", limits: "Observer rating." },
  { id: "hop", n: "Single-leg hop for distance", cat: "Sport", cls: "Quantified", kind: "num", u: "cm", bi: true, trials: 3, agg: "best", dir: 1, load: "high", paths: ["sport", "kids"] as PathwayId[], regions: ["knee", "ankle"] as Region[],
    purpose: "Return-to-sport capacity and limb symmetry.", protocol: "Hop forward as far as possible and land on the same leg, holding the landing for 2 s. Measure toe to heel. Practice, then 3 trials each leg; test the uninvolved leg first.",
    equip: ["Measuring tape", "Cones or tape marks"], pos: "Standing on the test leg at the line.", safety: "Only when strength, swelling and pain allow, and the surgeon's protocol permits.",
    limits: "Symmetry can hide bilateral deficits; does not measure strength." },
  { id: "triHop", n: "Triple hop for distance", cat: "Sport", cls: "Quantified", kind: "num", u: "cm", bi: true, trials: 2, agg: "best", dir: 1, load: "high", paths: ["sport"] as PathwayId[], regions: ["knee", "ankle"] as Region[],
    purpose: "Return-to-sport capacity with repeated landings.", protocol: "Three consecutive maximal hops on the same leg, holding the last landing. Measure start line to heel.",
    equip: ["Measuring tape"], pos: "Standing on the test leg.", safety: "As for the single hop.", limits: "As for the single hop." },
  { id: "yb", n: "Anterior reach (star excursion, tape version)", cat: "Sport", cls: "Quantified", kind: "num", u: "cm", bi: true, trials: 3, agg: "best", dir: 1, load: "mod", paths: ["sport"] as PathwayId[], regions: ["ankle", "knee", "hip"] as Region[],
    purpose: "Dynamic single-leg balance.", protocol: "Stand on one leg at the centre of a tape line; reach forward along the line with the other foot as far as possible and lightly touch, then return without losing balance. Hands on hips. 3 trials each leg after practice.",
    equip: ["Measuring tape", "Cones or tape marks"], pos: "Single-leg stance, shoes off.", safety: "Stop if pain.", limits: "Tape version differs from the commercial Y-balance kit; don't compare across methods." },
  { id: "ckc", n: "Closed Kinetic Chain Upper Extremity Stability Test", cat: "Sport", cls: "Quantified", kind: "num", u: "touches", bi: false, trials: 3, agg: "mean", dir: 1, load: "high", paths: ["sport"] as PathwayId[], regions: ["shoulder", "elbow", "wrist"] as Region[],
    purpose: "Upper-limb stability and speed in push-up position.", protocol: "Two tape lines 91 cm apart. Push-up position (or kneeling), alternate one hand to touch the other hand and back for 15 s. Count touches. Mean of 3 trials with 45 s rest.",
    equip: ["Measuring tape", "Stopwatch"], pos: "Push-up position.", safety: "Not with acute shoulder pain or instability.", limits: "Body size affects the result." },
  { id: "splank", n: "Side plank hold", cat: "Strength & endurance", cls: "Quantified", kind: "num", u: "s", bi: true, trials: 1, agg: "first", dir: 1, load: "mod", paths: ["sport", "gen", "desk"] as PathwayId[], regions: ["lumbar", "hip"] as Region[],
    purpose: "Lateral trunk endurance; side-to-side ratio.", protocol: "On the elbow, legs straight, top foot in front of the bottom foot. Lift the hips into a straight line and hold. Stop when the hips drop.",
    equip: ["Stopwatch"], pos: "Side-lying.", safety: "Not with shoulder pain on the weight-bearing side.", limits: "Ratios matter more than absolute time." },
  { id: "plank", n: "Front plank hold", cat: "Strength & endurance", cls: "Quantified", kind: "num", u: "s", bi: false, trials: 1, agg: "first", dir: 1, load: "mod", paths: ["sport", "gen", "desk"] as PathwayId[], regions: ["lumbar", "hip", "thoracic"] as Region[],
    purpose: "Anterior trunk endurance.", protocol: "Forearms and toes, body in a straight line. Stop when the hips sag or pike.",
    equip: ["Stopwatch"], pos: "Prone.", safety: "Not in pregnancy beyond early weeks without advice.", limits: "No agreed reference values." },
  { id: "sorensen", n: "Biering-Sørensen trunk extensor test", cat: "Strength & endurance", cls: "Quantified", kind: "num", u: "s", bi: false, trials: 1, agg: "first", dir: 1, load: "mod", paths: ["sport", "gen"] as PathwayId[], regions: ["lumbar"] as Region[],
    purpose: "Back extensor endurance.", protocol: "Prone with the trunk off the end of the plinth from the iliac crests, pelvis and legs strapped or held. Hold the trunk horizontal, arms crossed. Stop when the trunk drops.",
    equip: ["Stopwatch"], pos: "Prone on a plinth.", safety: "Not with high irritability or in older adults with osteoporosis.", limits: "Needs a helper to stabilise the legs." },
  { id: "dnf", n: "Deep neck flexor endurance", cat: "Strength & endurance", cls: "Quantified", kind: "num", u: "s", bi: false, trials: 1, agg: "first", dir: 1, load: "low", paths: ["desk", "gen", "corp"] as PathwayId[], regions: ["cervical"] as Region[],
    purpose: "Endurance of the deep neck flexors.", protocol: "Crook lying. Tuck the chin and lift the head about 2.5 cm off the plinth. Hold. Stop when the chin tuck is lost or the head touches the hand under it.",
    equip: ["Stopwatch"], pos: "Crook lying.", safety: "Stop for dizziness.", limits: "Several versions exist; use the same one each time." },
  { id: "ftf", n: "Fingertip-to-floor", cat: "Mobility", cls: "Quantified", kind: "num", u: "cm", bi: false, trials: 1, agg: "first", dir: -1, load: "low", paths: ["desk", "gen", "corp"] as PathwayId[], regions: ["lumbar", "hip"] as Region[],
    purpose: "Combined spinal and hip flexion.", protocol: "Standing, knees straight, bend forward as far as comfortable. Measure middle fingertip to floor (0 if touching; record negative if past the floor on a step).",
    equip: ["Measuring tape"], pos: "Standing.", safety: "Not with acute disc symptoms or osteoporosis.", limits: "Hamstring length and motivation change it." },
  { id: "mwt6", n: "Six-Minute Walk Test", cat: "Walking", cls: "Quantified", kind: "num", u: "m", bi: false, trials: 1, agg: "first", dir: 1, load: "mod", equipReq: "corridor", paths: ["senior", "neuro", "preop", "chronic"] as PathwayId[], regions: null,
    purpose: "Walking endurance and exercise tolerance.", protocol: "30 m flat corridor with turnaround cones. 'Walk as far as possible in six minutes. You may slow down and rest.' Standard encouragement each minute. Record distance, rests, and pre/post heart rate and breathlessness.",
    equip: ["Stopwatch", "Measuring tape", "Cones or tape marks"], pos: "Standing at the start line.",
    safety: "Not with unstable angina or a recent heart attack. Stop for chest pain, severe breathlessness or dizziness.", limits: "Corridor length and encouragement change results; keep them the same." },
  { id: "mst2", n: "Two-Minute Step Test", cat: "Fitness", cls: "Quantified", kind: "num", u: "steps", bi: false, trials: 1, agg: "first", dir: 1, load: "mod", paths: ["senior", "chronic", "neuro"] as PathwayId[], regions: null,
    purpose: "Aerobic endurance when a corridor isn't available.", protocol: "Mark a height halfway between the kneecap and the hip bone on the wall. March on the spot for 2 minutes, counting each right knee that reaches the mark.",
    equip: ["Stopwatch", "Wall", "Measuring tape"], pos: "Standing next to the wall.", safety: "Hand on the wall for balance if needed.", limits: "Knee or hip pain limits the result." },
  { id: "stairs", n: "Stair climb test", cat: "Function", cls: "Quantified", kind: "num", u: "s", bi: false, trials: 1, agg: "first", dir: -1, load: "mod", paths: ["preop", "postop", "senior", "gen"] as PathwayId[], regions: ["hip", "knee"] as Region[],
    purpose: "Stair ability; part of the OARSI set for hip and knee OA.", protocol: "Time to go up and down a flight of stairs (record the number of steps and step height). Rail use allowed and recorded.",
    equip: ["Stopwatch", "Step"], pos: "At the bottom of the stairs.", safety: "Stand behind and below the patient on the way up, in front on the way down.", limits: "Only comparable on the same stairs." },
  { id: "fpw40", n: "40 m fast-paced walk (4 × 10 m)", cat: "Walking", cls: "Quantified", kind: "num", u: "s", bi: false, trials: 1, agg: "first", dir: -1, load: "mod", paths: ["preop", "postop", "gen"] as PathwayId[], regions: ["hip", "knee"] as Region[],
    purpose: "Short-distance fast walking (OARSI set).", protocol: "Walk as quickly but safely as possible 10 m, turn, and repeat to 40 m total. Time the whole test.",
    equip: ["Stopwatch", "Measuring tape", "Cones or tape marks"], pos: "Standing.", safety: "Walk beside the patient.", limits: "Turn technique affects time." },
  { id: "bbs", n: "Berg Balance Scale", cat: "Balance & falls", cls: "Grade", kind: "items", bi: false, dir: 1, load: "low", paths: ["neuro", "senior"] as PathwayId[], regions: null, max: 56,
    items: ["Sitting to standing", "Standing unsupported", "Sitting unsupported", "Standing to sitting", "Transfers", "Standing with eyes closed", "Standing with feet together", "Reaching forward with outstretched arm", "Picking up an object from the floor", "Turning to look behind", "Turning 360°", "Placing alternate foot on a stool", "Standing with one foot in front", "Standing on one leg"],
    itemOpts: ["0", "1", "2", "3", "4"], purpose: "Balance in older adults and neurological conditions.", protocol: "Score each of 14 tasks 0–4 using the published Berg instructions. Total 0–56.",
    equip: ["Stopwatch", "Chair (43–46 cm seat)", "Step", "Measuring tape"], pos: "Various.", safety: "Guard throughout.", limits: "Ceiling effect in active people; takes 15–20 minutes." },
  { id: "beighton", n: "Beighton score", cat: "Hypermobility", cls: "Grade", kind: "items", bi: false, dir: 0, load: "low", paths: ["kids", "women", "sport", "gen"] as PathwayId[], regions: null, max: 9,
    items: ["Little finger bends back past 90°, right", "Little finger bends back past 90°, left", "Thumb touches forearm, right", "Thumb touches forearm, left", "Elbow over-straightens past 10°, right", "Elbow over-straightens past 10°, left", "Knee over-straightens past 10°, right", "Knee over-straightens past 10°, left", "Palms flat on the floor, knees straight"],
    itemOpts: ["0", "1"], purpose: "Screen for generalised joint hypermobility.", protocol: "Score 1 point for each manoeuvre achieved (0–9). Use a goniometer for the 10° and 90° criteria.",
    equip: ["Goniometer"], pos: "Standing and sitting.", safety: "Don't force any joint.", limits: "Screens joint mobility only; not a diagnosis of a connective-tissue disorder." },
  { id: "aslr", n: "Active Straight Leg Raise (pelvic girdle)", cat: "Pelvic", cls: "Grade", kind: "scale", bi: true, dir: -1, load: "low", paths: ["women", "gen"] as PathwayId[], regions: ["lumbar", "hip"] as Region[],
    opts: ["0 · not difficult", "1 · minimally difficult", "2 · somewhat difficult", "3 · fairly difficult", "4 · very difficult", "5 · unable"],
    purpose: "Load transfer through the pelvis in pelvic girdle pain.", protocol: "Supine, legs straight, feet 20 cm apart. 'Lift your leg 20 cm off the couch without bending the knee.' Patient rates difficulty 0–5 for each side; total 0–10.",
    equip: [], pos: "Supine.", safety: "In later pregnancy, keep supine time short.", limits: "Self-rated difficulty." },
  { id: "rtrScreen", n: "Postnatal return-to-running screen", cat: "Pelvic", cls: "Observation", kind: "items", bi: false, dir: 1, load: "high", paths: ["women"] as PathwayId[], regions: null, max: 7,
    items: ["Walk 30 minutes", "Single-leg balance 10 s each side", "Single-leg squat 10 reps each side", "Jog on the spot 1 minute", "Forward bounds × 10", "Hop on the spot × 10 each leg", "Single-leg 'running man' × 10 each side"],
    itemOpts: ["Fail", "Pass"], purpose: "Load and impact readiness before postnatal running.", protocol: "Each task is passed if done without pain, heaviness, dragging or leaking. Not before about 12 weeks after birth.",
    equip: ["Stopwatch"], pos: "Standing.", safety: "Stop if symptoms appear.", limits: "Guideline-based screen; not validated as a predictive test." },
  { id: "rtrStrength", n: "Postnatal return-to-running strength tests", cat: "Pelvic", cls: "Observation", kind: "items", bi: false, dir: 1, load: "mod", paths: ["women"] as PathwayId[], regions: null, max: 4,
    items: ["Single-leg calf raises × 20 each side", "Single-leg bridge × 20 each side", "Single-leg sit-to-stand × 20 each side", "Side-lying leg lift × 20 each side"],
    itemOpts: ["Under 20", "20 reps"], purpose: "Strength targets before postnatal running.", protocol: "Each to fatigue, aiming for 20 reps each side with good form.",
    equip: ["Chair (43–46 cm seat)"], pos: "Various.", safety: "Stop for pain or pelvic symptoms.", limits: "Guideline-based targets." },
  { id: "wallAngel", n: "Wall angel control", cat: "Mobility", cls: "Observation", kind: "scale", bi: false, dir: 1, load: "low", paths: ["desk", "corp", "gen"] as PathwayId[], regions: ["thoracic", "shoulder", "cervical"] as Region[],
    opts: ["Poor", "Fair", "Good"], purpose: "Scapular control and upper-back extension (ergonomic form).", protocol: "Back, head and arms against the wall, slide the arms up and down 5 times. Rate whether the head, wrists and lower back stay on the wall.",
    equip: ["Wall"], pos: "Standing against the wall.", safety: "Stop for shoulder pinching.", limits: "Observer rating." },
  { id: "grip", n: "Grip strength (dynamometer)", cat: "Strength & endurance", cls: "Quantified", kind: "num", u: "kg", bi: true, trials: 3, agg: "best", dir: 1, load: "low", equipReq: "dyna", paths: ["senior", "gen"] as PathwayId[], regions: ["elbow", "wrist", "shoulder"] as Region[],
    purpose: "Hand-grip force. Needs a dynamometer.", protocol: "Seated, elbow at 90°, forearm neutral. Squeeze as hard as possible for 3 s. Best of 3 each side.",
    equip: ["Hand-held or grip dynamometer"], pos: "Seated.", safety: "Not with acute hand or wrist pain.", limits: "Only with a calibrated dynamometer." },
];

export const FXI: Record<string, MeasuredTestDef> = Object.fromEntries(FX.map((t) => [t.id, t]));

export const FX_SRC: Record<string, string> = {
  tug: "CDC STEADI: Timed Up & Go (2017)", sts5: "Tiedemann A et al. Age Ageing 2008;37(4):430–5",
  cst30: "CDC STEADI: 30-Second Chair Stand, after Rikli & Jones", gait: "Studenski S et al. JAMA 2011;305(1):50–8 · Perera S et al. 2006",
  frt: "Duncan PW et al. J Gerontol (1990/1992)", sls: "Springer BA et al. J Geriatr Phys Ther 2007;30(1):8–15",
  fourStage: "CDC STEADI: 4-Stage Balance Test", heel: "Hébert-Losier K et al. Physiotherapy 2017;103(4):446–52",
  hop: "Grindem H et al. Br J Sports Med 2016;50:804–8", triHop: "Grindem H et al. Br J Sports Med 2016;50:804–8",
  yb: "Plisky PJ et al. J Orthop Sports Phys Ther 2006;36:911–9", splank: "McGill SM et al. Arch Phys Med Rehabil 1999;80:941–4",
  mwt6: "ATS statement 2002 (protocol) · Bohannon RW & Crouch R 2017 (MCID review)",
  bbs: "Berg KO et al. Can J Public Health 1992;83 Suppl 2:S7–11", beighton: "Malfait F et al. Am J Med Genet C 2017;175:8–26",
  aslr: "Mens JM et al. Spine 2001;26:1167–71",
  rtrScreen: "Goom T, Donnelly G, Brockwell E. Returning to running postnatal guideline, 2019",
  rtrStrength: "Goom T, Donnelly G, Brockwell E. Returning to running postnatal guideline, 2019",
  stairs: "Dobson F et al. Osteoarthritis Cartilage 2013;21:1042–52 (OARSI recommended set)",
  fpw40: "Dobson F et al. Osteoarthritis Cartilage 2013;21:1042–52 (OARSI recommended set)",
  ckc: "Tucci HT et al. BMC Musculoskelet Disord 2014;15:1 (protocol)",
};

export const FX_MCID: Record<string, { v: number; txt: string; src: string }> = {
  gait: { v: 0.1, txt: "0.10 m/s substantial meaningful change (0.05 small) in older adults", src: "Perera 2006" },
  mwt6: { v: 14, txt: "14–30.5 m across populations; 14 m used here as the smallest", src: "Bohannon & Crouch 2017" },
};

const STEADI_CST: Record<string, [number, number, number][]> = {
  M: [[60, 64, 14], [65, 69, 12], [70, 74, 12], [75, 79, 11], [80, 84, 10], [85, 89, 8], [90, 94, 7]],
  F: [[60, 64, 12], [65, 69, 11], [70, 74, 10], [75, 79, 10], [80, 84, 9], [85, 89, 8], [90, 94, 4]],
};
const SPRINGER_EO: [number, number, number][] = [[18, 39, 44.7], [40, 49, 41.9], [50, 59, 41.2], [60, 69, 32.1], [70, 79, 21.5], [80, 99, 9.4]];

function ageSex(A: AssessmentState): { a: number | null; s: "M" | "F" | null } {
  const a = parseInt(A.P.age || "", 10);
  const s = A.P.gender === "Male" ? "M" : A.P.gender === "Female" ? "F" : null;
  return { a: isNaN(a) ? null : a, s };
}

export interface FxInterp { txt: string; src: string; applies: boolean; flag?: boolean }

export function fxInterp(t: MeasuredTestDef, val: number, A: AssessmentState, assist?: string): FxInterp | null {
  const { a, s } = ageSex(A);
  const src = FX_SRC[t.id] || "";
  const old = a != null && a >= 65;
  const na = (pop: string): FxInterp => ({ txt: `No interpretation for this patient: the stored reference is for ${pop}.`, src, applies: false });
  if (val == null) return null;
  switch (t.id) {
    case "tug": if (!old) return na("adults 65 and over"); return { txt: val >= 12 ? "12 s or more: STEADI flags increased fall risk." : "Under 12 s: below the STEADI fall-risk cut-off.", src, applies: true, flag: val >= 12 };
    case "sts5": if (!old) return na("community-dwelling older adults"); return { txt: val >= 12 ? "12 s or more: associated with increased fall risk." : "Under 12 s.", src, applies: true, flag: val >= 12 };
    case "cst30": {
      if (assist && /arms/.test(assist)) return { txt: "Arms were used. STEADI scores the standard test as 0 when the arms are needed; the count is kept as a modified result and not compared with the table.", src, applies: true, flag: true };
      if (a == null || a < 60 || a > 94 || !s) return na("adults 60–94 with sex recorded");
      const row = STEADI_CST[s].find((r) => a! >= r[0] && a! <= r[1])!;
      return { txt: val < row[2] ? `Below average for ${s === "M" ? "men" : "women"} ${row[0]}–${row[1]} (under ${row[2]}): indicates a risk for falls.` : `At or above the STEADI below-average threshold (${row[2]}) for this age and sex.`, src, applies: true, flag: val < row[2] };
    }
    case "gait": if (!old) return { txt: `${val.toFixed(2)} m/s. The stored sources are for older adults; compare with this patient's own baseline.`, src, applies: false };
      return { txt: `${val.toFixed(2)} m/s. In older adults, each 0.1 m/s faster was linked with better survival (no single cut-off). A change of 0.05 m/s is small and 0.10 m/s substantial.`, src, applies: true };
    case "frt": if (!old) return na("older adults"); return { txt: val <= 15.2 ? "15 cm (6 in) or less: about 4 times the fall risk in the source study." : val < 25.4 ? "15–25 cm (6–10 in): about 2 times the fall risk in the source study." : "25 cm (10 in) or more: low fall risk in the source study.", src, applies: true, flag: val < 25.4 };
    case "sls": { if (a == null || a < 18) return na("adults 18 and over"); const row = SPRINGER_EO.find((r) => a! >= r[0] && a! <= r[1])!;
      return { txt: `Source mean for age ${row[0]}–${row[1]}: ${row[2]} s (eyes open, best of 3, max 45 s).${old && val < 5 ? " Under 5 s: linked with injurious falls in older adults (Vellas 1997)." : ""}`, src, applies: true, flag: old && val < 5 }; }
    case "fourStage": return { txt: val < 3 ? "Could not hold tandem stance for 10 s: STEADI flags increased fall risk." : "Held tandem stance for 10 s.", src, applies: true, flag: val < 3 };
    case "heel": return { txt: "No single cut-off. Healthy adults' medians were about 24 reps (men) and 21 (women), varying with age and activity; 25 was an older proposed criterion. Compare sides.", src, applies: true };
    case "bbs": return { txt: val < 45 ? "Under 45: associated with higher fall risk (45 is the commonly used cut-off). Berg alone is a weak predictor of falls." : "45 or more.", src, applies: true, flag: val < 45 };
    case "beighton": { if (a == null) return { txt: "Record age to apply the age-specific cut-off.", src, applies: false }; const cut = a < 18 ? 6 : a <= 50 ? 5 : 4;
      return { txt: val >= cut ? `${val}/9 meets the cut-off for generalised joint hypermobility at this age (${cut} or more). Screening only, not a diagnosis.` : `${val}/9: below the age cut-off of ${cut}.`, src, applies: true, flag: val >= cut }; }
    case "aslr": return { txt: "Higher scores mean more difficulty. No cut-off stored; compare sides and over time.", src, applies: true };
    case "rtrScreen": return { txt: `${val}/${t.max} passed. Graded running from about 12 weeks after birth, once all are done without pain, heaviness, dragging or leaking.`, src, applies: true, flag: val < (t.max || 0) };
    case "rtrStrength": return { txt: `${val}/${t.max} reached 20 reps. Aim for 20 each side. Fewer shows where strength work should focus; it isn't a barrier to running on its own.`, src, applies: true };
    case "hop": case "triHop": return { txt: "Read this test by limb symmetry: 90% or more of the other side is used in return-to-sport criteria after ACL reconstruction.", src, applies: true };
    case "yb": return { txt: "Compare legs: an anterior reach difference of 4 cm or more was linked with lower-limb injury in high-school basketball players.", src, applies: true };
    case "splank": return { txt: "Compare sides: a right-to-left ratio more than 0.05 away from 1.0 suggested imbalance in healthy young adults.", src, applies: true };
    case "mwt6": return { txt: "No cut-off stored. A change of 14–30.5 m has been reported as meaningful across different patient groups.", src, applies: false };
    default: return { txt: "No interpretation stored for this test. Compare with the patient's own baseline and the other side.", src: "", applies: false };
  }
}

export interface FxTrialSide { r?: (string | null)[]; l?: (string | null)[]; s?: (string | null)[] }
export interface FxData extends FxTrialSide {
  it?: (number | null)[]; dist?: number; inv?: Record<string, string>; assist?: string; mod?: string; stop?: string; sym?: Record<string, boolean>; nt?: string; sel?: boolean;
}

function fxNum(v: string | number | null | undefined): number | null {
  if (v === "" || v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return isNaN(n) ? null : n;
}

export function fxSides(t: MeasuredTestDef): Array<"r" | "l" | "s"> {
  return t.bi ? ["r", "l"] : ["s"];
}

export interface FxTrial { i: number; raw: number; v: number; valid: boolean }
export function fxTrials(t: MeasuredTestDef, d: FxData, side: "r" | "l" | "s"): FxTrial[] {
  const arr = d[side] || [];
  const out: FxTrial[] = [];
  for (let i = 0; i < Math.max(t.trials || 1, arr.length); i++) {
    const raw = fxNum(arr[i]);
    if (raw == null) continue;
    const inv = (d.inv || {})[side + i];
    const v = t.kind === "gait" ? (raw > 0 ? (d.dist || 6) / raw : NaN) : raw;
    out.push({ i, raw, v, valid: !inv && !isNaN(v) });
  }
  return out;
}

export interface FxResult { status: "ok" | "none" | "invalid" | "incomplete"; v?: number; label?: string; n?: number; of?: number }
export function fxResult(t: MeasuredTestDef, d: FxData, side: "r" | "l" | "s"): FxResult {
  d = d || {};
  if (t.kind === "scale") {
    const arr = d[side];
    const raw = Array.isArray(arr) ? arr[0] : arr;
    if (raw == null || raw === "") return { status: "none" };
    const idx = +raw;
    return { status: "ok", v: idx, label: t.opts?.[idx] };
  }
  if (t.kind === "items") {
    const it = d.it || [];
    const n = (t.items || []).filter((_, i) => it[i] != null).length;
    if (!n) return { status: "none" };
    const scoreByValue = (t.itemOpts?.[0] === "Fail" || t.itemOpts?.[0] === "Under 20");
    const score = (t.items || []).reduce((acc, _, i) => acc + (it[i] != null ? (scoreByValue ? (it[i] === 1 ? 1 : 0) : (Number(t.itemOpts?.[it[i]!]) || it[i]! || 0)) : 0), 0);
    return n < (t.items?.length || 0) ? { status: "incomplete", v: score, n, of: t.items?.length } : { status: "ok", v: score, n, of: t.items?.length };
  }
  const tr = fxTrials(t, d, side);
  if (!tr.length) return { status: "none" };
  const ok = tr.filter((x) => x.valid);
  if (!ok.length) return { status: "invalid", n: 0, of: tr.length };
  const vals = ok.map((x) => x.v);
  let v: number;
  if (t.agg === "mean") v = vals.reduce((a, b) => a + b, 0) / vals.length;
  else if (t.agg === "first") v = vals[0];
  else v = t.dir < 0 ? Math.min(...vals) : Math.max(...vals);
  return { status: "ok", v: +v.toFixed(t.kind === "gait" ? 2 : 1), n: ok.length, of: tr.length };
}

export function fxFmt(t: MeasuredTestDef, r: FxResult): string {
  if (!r || r.status === "none") return "–";
  if (r.status === "invalid") return "Invalid";
  if (t.kind === "scale") return r.label || "–";
  if (t.kind === "items") return `${r.v}${t.max ? `/${t.max}` : ""}${r.status === "incomplete" ? ` (${r.n}/${r.of} items)` : ""}`;
  return `${r.v} ${t.u}`;
}

export function fxLSI(t: MeasuredTestDef, d: FxData, A: AssessmentState): { txt: string; pct?: number | null; below90?: boolean; diff?: boolean } | null {
  if (!t.bi) return null;
  const r = fxResult(t, d, "r"), l = fxResult(t, d, "l");
  if (t.id === "splank") {
    if (r.status === "ok" && l.status === "ok" && (l.v || 0) > 0) {
      const ratio = +((r.v! / l.v!)).toFixed(2);
      return { txt: `Right-to-left ratio ${ratio}`, pct: null, below90: Math.abs(1 - ratio) > 0.05 };
    }
    return null;
  }
  if (r.status !== "ok" || l.status !== "ok") return null;
  if (t.kind === "scale") return { txt: `R ${r.label} · L ${l.label}`, diff: r.v !== l.v };
  if ((r.v || 0) === 0 && (l.v || 0) === 0) return null;
  const pct = Math.round((Math.min(r.v!, l.v!) / Math.max(r.v!, l.v!)) * 100);
  return { pct, txt: `Side-to-side ratio ${pct}% (record the involved side for limb symmetry)`, below90: pct < 90 };
}
