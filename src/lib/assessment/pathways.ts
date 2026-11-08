/**
 * src/lib/assessment/pathways.ts
 *
 * The 12 clinical pathways: each adds its own history questions, exam
 * items, "conditions to consider", treatment rules and home/clinic
 * exercises on top of the universal assessment core. Ported from the
 * Vyayama v9 clinical reference (data_paths.js).
 */

import type { AssessmentState, Exercise, PathwayId, PhaseId, RegionProgramme, PathwayTreatment } from "./types";
import { X, EX_TYPES } from "./exercisesHelpers";
import { PHASE_IDS, PHASE_META, GENERAL_CAUTIONS } from "./exercises";

function on(o: Record<string, boolean> | undefined | null): string[] {
  return Object.keys(o || {}).filter((k) => (o as Record<string, boolean>)[k]);
}

export interface PathwayDef {
  id: PathwayId;
  n: string;
  short: string;
  who: string;
  review: number; // suggested reassessment, weeks
  spec?: string;
  hide?: string[];
}

export const PATHWAYS: PathwayDef[] = [
  { id: "gen", n: "General MSK", short: "General", who: "Adults with joint, muscle or spine problems. Full assessment.", review: 4 },
  { id: "quick", n: "Quick consult", short: "Quick", who: "Short visits for one clear problem. Shows only the essential steps.", review: 2, hide: ["observe", "palp", "rom", "strength", "neuro", "pillars", "forms"] },
  { id: "desk", n: "Workstation & ergonomics", short: "Workstation", who: "Desk, laptop and work-from-home pain.", review: 4, spec: "ergo" },
  { id: "corp", n: "Corporate screening", short: "Corporate", who: "On-site employee screens and workplace sessions.", review: 12, spec: "ergo", hide: ["palp", "rom", "strength", "neuro", "tests", "pillars", "forms", "dx"] },
  { id: "sport", n: "Sports & active", short: "Sports", who: "Badminton, gym, running and other sport.", review: 3, spec: "sports" },
  { id: "kids", n: "Children & adolescents", short: "Paediatric", who: "Under 18. Parent present, growth and development, school and play.", review: 4 },
  { id: "women", n: "Women's health", short: "Women's health", who: "Pregnancy, postnatal, pelvic floor and menopause.", review: 4, spec: "womens" },
  { id: "senior", n: "Senior citizen & falls", short: "Senior", who: "Older adults: falls risk, strength, balance and independence at home.", review: 6 },
  { id: "preop", n: "Pre-operative (prehab)", short: "Pre-op", who: "Before a planned joint or spine operation.", review: 2 },
  { id: "postop", n: "Post-operative rehab", short: "Post-op", who: "After surgery, following the surgeon's protocol.", review: 2 },
  { id: "neuro", n: "Neuro rehab", short: "Neuro", who: "Stroke, Parkinson's, MS, spinal cord injury, neuropathy, balance and dizziness.", review: 4 },
  { id: "chronic", n: "Persistent (chronic) pain", short: "Persistent pain", who: "Pain for over 3 months. Pain science, pacing and graded activity.", review: 4, spec: "chronic" },
];

export function pathOf(A: AssessmentState): PathwayDef {
  return PATHWAYS.find((p) => p.id === A.path) || PATHWAYS[0];
}

export type QType = "one" | "multi" | "num" | "date" | "text" | "matrix";
export interface FlagRule { v: string[]; lv: "Caution" | "High" | "Emergency"; msg: string }
export interface PathQuestion {
  id: string;
  q: string;
  t: QType;
  o?: string[];
  u?: string;
  when?: (A: AssessmentState) => boolean;
  fl?: FlagRule[];
  rows?: string[]; // matrix only: one Likert row per statement
  cols?: string[]; // matrix only: Likert column labels, stored answer is the column index
}
export interface PathSection {
  h: string;
  note?: string;
  qs?: PathQuestion[];
}

const YN2 = ["Yes", "No"];
const ERGO_FREQ = ["Never", "Rarely", "Sometimes", "Often", "Always"];
const ERGO_MATRIX_SECTION: PathSection = {
  h: "Ergonomic risk checklist",
  note: "How often does each of these happen during a typical work day?",
  qs: [{ id: "e_risk", q: "Risk factors", t: "matrix", cols: ERGO_FREQ, rows: [
    "Notices glare or reflection on the screen",
    "Reaches forward or sideways for the mouse or keyboard",
    "Cradles the phone between ear and shoulder",
    "Sits without low-back support",
    "Uses a laptop on the lap, bed or sofa without a stand",
    "Twists at the waist to look at a second screen or talk to someone",
    "Works with wrists bent up or sideways",
    "Feet don't reach the floor or a footrest",
    "Skips breaks through the work day",
  ] }],
};
const isPreg = (A: AssessmentState) => (A.ph as Record<string, unknown>)?.w_stage === "Pregnant";
const isPostnatal = (A: AssessmentState) => /Postnatal/.test(((A.ph as Record<string, unknown>)?.w_stage as string) || "");
const isMeno = (A: AssessmentState) => /menopause/i.test(((A.ph as Record<string, unknown>)?.w_stage as string) || "");

// ── History sections per pathway ───────────────────────────────────────────
export const PATH_HX: Partial<Record<PathwayId, PathSection[]>> = {
  desk: [
    { h: "Work set-up", note: "From the clinic's ergonomic assessment form.", qs: [
      { id: "d_type", q: "Workstation type", t: "multi", o: ["Corporate office", "Hybrid (office + home)", "Work from home", "Co-working space", "Field / site-based", "Laptop only, no external monitor", "Laptop with external monitor", "Desktop", "Sit-stand desk", "Dining table / bed / sofa"] },
      { id: "d_hours", q: "Hours at the desk a day", t: "one", o: ["Under 4", "4–6", "6–8", "8–10", "Over 10"] },
      { id: "d_break", q: "Gets up from the desk", t: "one", o: ["Every 30 minutes", "Every hour", "Every 2 hours", "Rarely"] },
      { id: "d_screens", q: "Screens", t: "one", o: ["One", "Two", "Three or more"] },
    ] },
    ERGO_MATRIX_SECTION,
  ],
  corp: [
    { h: "Session", qs: [
      { id: "c_company", q: "Company / site", t: "text" },
      { id: "c_role", q: "Role", t: "one", o: ["Desk / IT", "Manager", "Field / sales", "Operations / manual", "Driver", "Other"] },
      { id: "c_hours", q: "Hours at a screen a day", t: "one", o: ["Under 4", "4–6", "6–8", "8–10", "Over 10"] },
    ] },
    { h: "Symptoms", qs: [
      { id: "c_areas", q: "Where they get discomfort", t: "multi", o: ["Neck", "Upper back / shoulders", "Mid-back", "Lower back", "Shoulder", "Elbow / forearm", "Wrist / hand", "Hip", "Knee", "Eyes / headache", "None"] },
      { id: "c_freq", q: "How often", t: "one", o: ["Daily", "Weekly", "Occasionally", "Never"] },
      { id: "c_radiate", q: "Pain, tingling or numbness spreading into an arm or leg", t: "one", o: YN2 },
    ] },
    ERGO_MATRIX_SECTION,
  ],
  sport: [
    { h: "Sport and load", qs: [
      { id: "s_sport", q: "Main sport", t: "one", o: ["Badminton", "Gym / strength", "Running", "Cricket", "Football", "Tennis / squash", "Swimming", "Cycling", "Yoga / pilates", "CrossFit / HIIT", "Other"] },
      { id: "s_level", q: "Level", t: "one", o: ["Recreational", "Club / amateur", "District / state", "National", "Professional"] },
      { id: "s_hours", q: "Training hours a week", t: "one", o: ["Under 3", "3–6", "6–10", "Over 10"] },
      { id: "s_change", q: "Recent change in training", t: "one", o: ["No change", "Increased a lot in the last 4 weeks", "Returned after a break", "New sport, coach or programme", "Reduced because of injury"] },
    ] },
    { h: "Injury history and goal", qs: [
      { id: "s_prev", q: "Previous injuries", t: "multi", o: ["None", "Ankle sprain", "Knee ligament", "Meniscus", "Hamstring strain", "Groin", "Achilles / calf", "Shoulder", "Elbow / wrist", "Back", "Concussion"] },
      { id: "s_goal", q: "Return goal", t: "one", o: ["Train this month", "Match within 2 months", "Tournament or season later", "No date yet"] },
      { id: "s_conc", q: "Head knock in the last 2 weeks with headache, dizziness or confusion", t: "one", o: YN2, fl: [{ v: ["Yes"], lv: "High", msg: "Possible concussion: no return to play today. Medical review, then graded return per the 2022 Amsterdam consensus." }] },
    ] },
  ],
  kids: [
    { h: "Development", qs: [
      { id: "k_birth", q: "Birth", t: "one", o: ["Full term", "Preterm", "Not sure"] },
      { id: "k_mile", q: "Milestones", t: "one", o: ["On time", "Some delayed", "Not sure"] },
      { id: "k_sport", q: "Sport and activities", t: "multi", o: ["Badminton", "Cricket", "Football", "Skating", "Swimming", "Dance", "Martial arts", "Gymnastics", "Athletics", "Cycling", "None"] },
      { id: "k_bag", q: "School bag", t: "one", o: ["Light", "Moderate", "Heavy, child struggles with it"] },
    ] },
    { h: "Safety questions", qs: [
      { id: "k_night", q: "Pain that wakes the child at night", t: "one", o: YN2, fl: [{ v: ["Yes"], lv: "Caution", msg: "Night pain in a child: consider bone or joint pathology. Examine carefully and discuss with a paediatrician if it persists or is one-sided." }] },
      { id: "k_fever", q: "Fever with a painful or swollen joint, or refusing to bear weight", t: "one", o: YN2, fl: [{ v: ["Yes"], lv: "Emergency", msg: "Fever with an acute painful joint or not bearing weight: same-day medical assessment to rule out septic arthritis or osteomyelitis." }] },
      { id: "k_limp", q: "New limp with hip, thigh or knee pain (age 10–16)", t: "one", o: YN2, fl: [{ v: ["Yes"], lv: "High", msg: "Limp with hip, thigh or knee pain in an adolescent: rule out slipped capital femoral epiphysis (SCFE). Urgent orthopaedic referral; no loading until cleared." }] },
      { id: "k_swell", q: "Joint swelling or morning stiffness for more than 6 weeks", t: "one", o: YN2, fl: [{ v: ["Yes"], lv: "High", msg: "Persistent joint swelling or stiffness: refer to a paediatrician to screen for juvenile idiopathic arthritis." }] },
    ] },
  ],
  women: [
    { h: "Stage", qs: [
      { id: "w_stage", q: "Stage", t: "one", o: ["Pregnant", "Postnatal (within 12 months)", "Postnatal (over 12 months)", "Perimenopause", "Postmenopause", "None of these"] },
      { id: "w_weeks", q: "Weeks of pregnancy", t: "num", u: "weeks", when: isPreg },
      { id: "w_since", q: "Weeks since delivery", t: "num", u: "weeks", when: isPostnatal },
      { id: "w_deliv", q: "Delivery", t: "one", o: ["Vaginal", "Assisted (forceps / vacuum)", "Caesarean, planned", "Caesarean, emergency"], when: isPostnatal },
      { id: "w_clear", q: "Obstetrician has cleared exercise", t: "one", o: ["Yes", "Not yet", "Not needed"], when: (A) => isPreg(A) || isPostnatal(A) },
    ] },
    { h: "Pelvic floor and pelvic girdle", note: "Ask privately. A chaperone can be offered.", qs: [
      { id: "w_pf", q: "Pelvic floor symptoms", t: "multi", o: ["None", "Leaks with cough, sneeze or jump", "Urgency, leaks on the way", "Passes urine often", "Heaviness or dragging", "Pain with intercourse", "Constipation or straining"] },
      { id: "w_pain", q: "Pain areas", t: "multi", o: ["Pelvic girdle, back", "Pubic bone (front)", "Low back", "Tailbone", "Wrist / thumb (lifting baby)", "Neck and upper back (feeding)", "None"] },
    ] },
    { h: "Warning signs", qs: [
      { id: "w_preg_rf", q: "In pregnancy, any of these now", t: "multi", o: ["None", "Vaginal bleeding", "Fluid leaking", "Regular painful contractions", "Severe headache or vision change", "Chest pain or breathless at rest", "Calf pain or swelling", "Baby moving less", "Dizziness or fainting"], when: isPreg, fl: [{ v: ["Vaginal bleeding", "Fluid leaking", "Regular painful contractions", "Severe headache or vision change", "Chest pain or breathless at rest", "Calf pain or swelling", "Baby moving less", "Dizziness or fainting"], lv: "Emergency", msg: "Warning sign in pregnancy (ACOG 2020): stop exercise and contact the obstetrician now." }] },
      { id: "w_post_rf", q: "After birth, any of these now", t: "multi", o: ["None", "Fever with wound redness or discharge", "Heavy bleeding", "Calf pain or swelling", "Low mood or not coping"], when: isPostnatal, fl: [
        { v: ["Fever with wound redness or discharge", "Heavy bleeding", "Calf pain or swelling"], lv: "Emergency", msg: "Postnatal warning sign: same-day review by the obstetrician or emergency department." },
        { v: ["Low mood or not coping"], lv: "High", msg: "Low mood after birth: talk with her kindly and arrange review with her doctor (postnatal depression is common and treatable). Tele-MANAS 14416." },
      ] },
    ] },
  ],
  senior: [
    { h: "Falls (CDC STEADI key questions)", qs: [
      { id: "o_falls", q: "Falls in the last year", t: "one", o: ["None", "One", "Two or more"] },
      { id: "o_unsteady", q: "Feels unsteady standing or walking", t: "one", o: YN2 },
      { id: "o_worry", q: "Worries about falling", t: "one", o: YN2 },
      { id: "o_aid", q: "Walking aid", t: "one", o: ["None", "Stick", "Walker", "Wheelchair"] },
      { id: "o_syncope", q: "Blackouts or unexplained falls", t: "one", o: YN2, fl: [{ v: ["Yes"], lv: "High", msg: "Blackouts or unexplained falls: medical review for cardiac or neurological causes before balance training." }] },
    ] },
    { h: "Home and daily life", qs: [
      { id: "o_haz", q: "Home hazards", t: "multi", o: ["Loose rugs or mats", "Poor lighting at night", "No grab rails in the bathroom", "Slippery bathroom floor", "Stairs without a rail", "Indian-style toilet", "High bed", "Clutter or wires", "Pets underfoot", "None"] },
      { id: "o_shoe", q: "Footwear at home", t: "one", o: ["Firm, closed-back", "Loose slippers or chappals", "Barefoot"] },
    ] },
    { h: "Stay Independent brochure (CDC STEADI self-report)", note: "Tick every statement that is true for this patient.", qs: [
      { id: "o_stay", q: "Statements", t: "multi", o: [
        "I have fallen in the past year",
        "I use or have been advised to use a cane or walker to get around safely",
        "Sometimes I feel unsteady when I am walking",
        "I steady myself by holding onto furniture when walking at home",
        "I am worried about falling",
        "I need to push with my hands to stand up from a chair",
        "I have some trouble stepping up onto a curb",
        "I often have to rush to the toilet",
        "I have lost some feeling in my feet",
        "I take medicine that sometimes makes me feel light-headed or more tired than usual",
        "I take medicine to help me sleep or improve my mood",
        "I often feel sad or depressed",
      ] },
    ] },
  ],
  preop: [
    { h: "Planned surgery", qs: [
      { id: "p_surg", q: "Operation", t: "one", o: ["Total knee replacement", "Total hip replacement", "ACL reconstruction", "Meniscus surgery", "Rotator cuff repair", "Shoulder replacement", "Spinal surgery", "Fracture fixation", "Other"] },
      { id: "p_side", q: "Side", t: "one", o: ["Right", "Left", "Both", "Not applicable"] },
      { id: "p_date", q: "Date of surgery", t: "date" },
      { id: "p_sugar", q: "Blood sugar control (if diabetic)", t: "one", o: ["Not diabetic", "Well controlled", "Not well controlled", "Not known"] },
    ] },
  ],
  postop: [
    { h: "Surgery", qs: [
      { id: "q_surg", q: "Operation", t: "one", o: ["Total knee replacement", "Total hip replacement", "ACL reconstruction", "Meniscus surgery", "Rotator cuff repair", "Shoulder replacement", "Spinal surgery", "Fracture fixation", "Other"] },
      { id: "q_side", q: "Side", t: "one", o: ["Right", "Left", "Both", "Not applicable"] },
      { id: "q_date", q: "Date of surgery", t: "date" },
      { id: "q_wb", q: "Weight-bearing allowed", t: "one", o: ["Non-weight-bearing", "Touch-toe", "Partial", "As tolerated", "Full", "Not applicable (upper limb)"] },
      { id: "q_prec", q: "Precautions from the surgeon", t: "multi", o: ["Hip: posterior precautions", "Hip: anterior precautions", "Brace locked straight", "Sling", "No active lifting of the arm yet", "No resisted elbow bending", "Spine: no bending, lifting or twisting", "None given"] },
      { id: "q_wound", q: "Wound", t: "one", o: ["Healed", "Healing, dry", "Stitches or staples in", "Red, oozing or hot"], fl: [{ v: ["Red, oozing or hot"], lv: "High", msg: "Possible wound infection: contact the surgeon today." }] },
    ] },
    { h: "Warning signs", qs: [
      { id: "q_rf", q: "Any of these now", t: "multi", o: ["None", "Calf pain, swelling or redness", "Breathless or chest pain", "Fever over 38°C", "New numbness or weakness"], fl: [
        { v: ["Breathless or chest pain"], lv: "Emergency", msg: "Possible pulmonary embolism: call emergency services now." },
        { v: ["Calf pain, swelling or redness"], lv: "Emergency", msg: "Possible deep vein thrombosis: same-day medical assessment; no exercise of that leg until cleared." },
        { v: ["Fever over 38°C", "New numbness or weakness"], lv: "High", msg: "Contact the surgeon today before continuing rehab." },
      ] },
    ] },
  ],
  neuro: [
    { h: "Condition", qs: [
      { id: "n_cond", q: "Condition", t: "one", o: ["Stroke", "Parkinson's", "Multiple sclerosis", "Spinal cord injury", "Peripheral neuropathy", "Vestibular / dizziness", "Head injury", "Cerebral palsy", "Other"] },
      { id: "n_time", q: "Time since onset or diagnosis", t: "one", o: ["Under 3 months", "3–6 months", "6–12 months", "Over a year"] },
      { id: "n_side", q: "Side affected", t: "one", o: ["Right", "Left", "Both", "Not applicable"] },
      { id: "n_sci", q: "Level of injury", t: "one", o: ["Cervical", "T1–T6", "Below T6", "Lumbar / sacral"], when: (A) => (A.ph as Record<string, unknown>)?.n_cond === "Spinal cord injury" },
    ] },
    { h: "Function", qs: [
      { id: "n_mob", q: "Walking", t: "one", o: ["Independent", "With an aid", "With help from a person", "Wheelchair", "Bed-bound"] },
      { id: "n_shoulder", q: "Pain in the weaker shoulder", t: "one", o: YN2 },
    ] },
    { h: "Warning signs", qs: [
      { id: "n_rf", q: "Any of these new", t: "multi", o: ["None", "Face drooping, arm weakness or speech difficulty", "Sudden severe headache", "Pounding headache with sweating or flushing (spinal cord injury)", "Weakness getting worse over days"], fl: [
        { v: ["Face drooping, arm weakness or speech difficulty", "Sudden severe headache"], lv: "Emergency", msg: "Possible stroke (BE-FAST): call emergency services now and note the time." },
        { v: ["Pounding headache with sweating or flushing (spinal cord injury)"], lv: "Emergency", msg: "Possible autonomic dysreflexia: sit upright, loosen clothing, check bladder and bowel, check BP, and get emergency help." },
        { v: ["Weakness getting worse over days"], lv: "High", msg: "Progressive weakness: urgent neurology review." },
      ] },
    ] },
  ],
  chronic: [
    { h: "Pain story", qs: [
      { id: "x_sites", q: "Where", t: "one", o: ["One area", "Several areas", "Widespread"] },
      { id: "x_pattern", q: "Activity pattern", t: "one", o: ["Pushes through, then crashes (boom-bust)", "Avoids activity", "Steady pacing", "Mixed"] },
      { id: "x_sens", q: "Signs of a sensitised system", t: "multi", o: ["Pain spreads beyond the first area", "Light touch or clothes hurt", "Sensitive to light, noise or smells", "Pain out of proportion to activity", "Tiredness and poor concentration", "None"] },
    ] },
    { h: "Mood screen (PHQ-2 / GAD-2)", note: "Over the last 2 weeks, how often have you been bothered by the following?", qs: [
      { id: "x_mood", q: "Statements", t: "matrix", cols: ["Not at all", "Several days", "More than half the days", "Nearly every day"], rows: [
        "Little interest or pleasure in doing things",
        "Feeling down, depressed or hopeless",
        "Feeling nervous, anxious or on edge",
        "Not being able to stop or control worrying",
      ] },
    ] },
    { h: "Safety", qs: [
      { id: "x_harm", q: "Thoughts that life isn't worth living, or of self-harm", t: "one", o: ["No", "Yes", "Prefers not to say"], fl: [{ v: ["Yes"], lv: "High", msg: "Ask directly and kindly. If there is immediate risk, do not leave them alone and call emergency services (112). Otherwise arrange urgent review with their doctor today. Tele-MANAS 14416 (24/7)." }] },
    ] },
  ],
};

export const PATH_EXAM: Partial<Record<PathwayId, PathSection[]>> = {
  desk: [
    { h: "Workstation measurements", qs: [
      { id: "e_seat", q: "Seat height from floor", t: "num", u: "cm" },
      { id: "e_mon", q: "Top of monitor from floor", t: "num", u: "cm" },
      { id: "e_dist", q: "Eye-to-screen distance", t: "num", u: "cm" },
      { id: "e_feet", q: "Feet flat on the floor", t: "one", o: YN2 },
    ] },
    { h: "Recommendations", qs: [
      { id: "e_fix", q: "Workstation corrections", t: "multi", o: ["Raise the monitor so the top edge is at or just below eye level", "Add a laptop stand with external keyboard and mouse", "Adjust the chair: hips level with or above knees, lumbar support used", "Elbows at 90–110°, wrists neutral", "Feet flat on the floor or a footrest", "Bring the mouse closer to the body", "Reduce screen glare / adjust lighting", "Sit-stand routine (change every 30 minutes)"] },
      { id: "e_habit", q: "Habit targets", t: "multi", o: ["20-20-20 rule for the eyes", "Micro-break every 45–60 minutes", "7,500 steps a day", "7–8 hours of sleep", "2.5–3 litres of water a day", "Breathing or short meditation for stress"] },
    ] },
  ],
  kids: [
    { h: "Paediatric observation", qs: [
      { id: "ke_adam", q: "Forward bend (Adam's) test", t: "one", o: ["Symmetrical", "Rib hump visible", "Lumbar prominence"], fl: [{ v: ["Rib hump visible", "Lumbar prominence"], lv: "Caution", msg: "Asymmetry on forward bend: refer to an orthopaedic surgeon for scoliosis assessment." }] },
      { id: "ke_foot", q: "Foot posture", t: "one", o: ["Normal arch", "Flexible flat foot (arch appears on tiptoe)", "Rigid flat foot (no arch on tiptoe)", "High arch"], fl: [{ v: ["Rigid flat foot (no arch on tiptoe)"], lv: "Caution", msg: "Rigid flat foot: refer to a paediatric orthopaedic surgeon (tarsal coalition and other causes)." }] },
    ] },
  ],
  women: [
    { h: "Abdominal wall", qs: [
      { id: "we_dr_u", q: "Gap between tummy muscles at the belly button (finger widths)", t: "one", o: ["0", "1", "2", "3", "4", "5+"] },
      { id: "we_dome", q: "Doming or bulging when lifting the head", t: "one", o: YN2 },
    ] },
    { h: "Pelvic girdle", qs: [
      { id: "we_p4r", q: "P4 (thigh thrust) right", t: "one", o: ["Positive", "Negative", "Not tested"] },
      { id: "we_p4l", q: "P4 (thigh thrust) left", t: "one", o: ["Positive", "Negative", "Not tested"] },
    ] },
    { h: "Pelvic floor muscle assessment (PERFECT scheme)", note: "Per vaginal or real-time ultrasound assessment, by a trained clinician with consent.", qs: [
      { id: "we_power", q: "Power (Modified Oxford Scale)", t: "one", o: ["0 · no contraction", "1 · flicker", "2 · weak", "3 · moderate", "4 · good", "5 · strong"] },
      { id: "we_endur", q: "Endurance — hold at best effort", t: "num", u: "s (max 10)" },
      { id: "we_reps", q: "Repetitions at best effort held", t: "num", u: "reps" },
      { id: "we_fast", q: "Fast (1-second) contractions", t: "num", u: "reps" },
    ] },
  ],
  senior: [
    { h: "Orthostatic blood pressure", note: "Lying 5 minutes, then standing. A fall of 20 mmHg systolic or 10 mmHg diastolic within 3 minutes is orthostatic hypotension.", qs: [
      { id: "oe_ls", q: "Lying systolic", t: "num", u: "mmHg" }, { id: "oe_ld", q: "Lying diastolic", t: "num", u: "mmHg" },
      { id: "oe_s3s", q: "Standing 3 min systolic", t: "num", u: "mmHg" }, { id: "oe_s3d", q: "Standing 3 min diastolic", t: "num", u: "mmHg" },
      { id: "oe_sym", q: "Dizzy on standing", t: "one", o: YN2 },
    ] },
  ],
  postop: [
    { h: "Post-operative check", qs: [
      { id: "qe_eff", q: "Swelling (stroke test, knee)", t: "one", o: ["Zero", "Trace", "1+", "2+", "3+", "Not applicable"] },
      { id: "qe_lag", q: "Extension lag on straight-leg raise", t: "num", u: "°" },
      { id: "qe_calf", q: "Calf soft and non-tender", t: "one", o: ["Yes", "No"], fl: [{ v: ["No"], lv: "Emergency", msg: "Tender or tight calf after surgery: rule out DVT the same day before exercising that leg." }] },
    ] },
  ],
  neuro: [
    { h: "Co-ordination, sensation and balance", qs: [
      { id: "ne_fn", q: "Finger to nose", t: "one", o: ["Normal", "Impaired right", "Impaired left", "Impaired both"] },
      { id: "ne_romberg", q: "Romberg", t: "one", o: ["Negative", "Positive", "Unable to stand"] },
    ] },
  ],
  chronic: [
    { h: "Tolerance baseline (for pacing)", qs: [
      { id: "xe_sit", q: "Sitting", t: "num", u: "min" }, { id: "xe_stand", q: "Standing", t: "num", u: "min" }, { id: "xe_walk", q: "Walking", t: "num", u: "min" },
    ] },
  ],
};

export interface PathConsider { id: string; n: string; icd: string; cue: string; age?: [number, number]; refer?: string }

export const PATH_CONS: Partial<Record<PathwayId, PathConsider[]>> = {
  kids: [
    { id: "osg", n: "Osgood-Schlatter disease", icd: "M92.5", cue: "Age 10–15, pain and a bump below the kneecap, sport with running or jumping", age: [9, 16] },
    { id: "sever", n: "Sever's disease (calcaneal apophysitis)", icd: "M92.8", cue: "Age 8–14, heel pain with running, squeeze test painful", age: [7, 15] },
    { id: "scfe", n: "Slipped capital femoral epiphysis (SCFE)", icd: "M93.0", cue: "Age 10–16, limp with hip, thigh or knee pain, reduced hip inward rotation", age: [9, 17], refer: "Urgent orthopaedic referral; no weight-bearing exercise until cleared" },
    { id: "scol", n: "Idiopathic scoliosis", icd: "M41.1", cue: "Asymmetry on Adam's forward bend", refer: "Orthopaedic referral for assessment" },
    { id: "growpain", n: "Growing pains (diagnosis of exclusion)", icd: "R29.8", cue: "Both legs, evenings or night, no limp, normal examination, normal daytime activity" },
  ],
  women: [
    { id: "pgp", n: "Pregnancy-related pelvic girdle pain", icd: "O26.7", cue: "Pain between the back of the pelvis and buttock crease or at the pubic bone; P4 or ASLR positive" },
    { id: "sui", n: "Stress urinary incontinence", icd: "N39.3", cue: "Leaks with cough, sneeze or exertion" },
    { id: "drec", n: "Diastasis rectus abdominis", icd: "O71.8", cue: "Widened gap between the rectus muscles, doming on curl-up" },
    { id: "pop", n: "Pelvic organ prolapse symptoms", icd: "N81.9", cue: "Heaviness or dragging; prolapse seen on straining", refer: "Gynaecology review if bothersome or seen at rest" },
  ],
  senior: [
    { id: "fallrisk", n: "Increased risk of falls", icd: "Z91.81", cue: "Fall history, unsteadiness, worry about falling, STEADI tests below cut-offs" },
    { id: "ohyp", n: "Orthostatic hypotension", icd: "I95.1", cue: "BP drop on standing", refer: "Doctor's review of medicines and BP" },
  ],
  neuro: [
    { id: "bppv", n: "Benign paroxysmal positional vertigo", icd: "H81.1", cue: "Brief spinning with head position change; Dix-Hallpike positive" },
    { id: "hemi", n: "Hemiplegic shoulder pain", icd: "G81.9", cue: "Pain in the weaker shoulder, subluxation" },
  ],
  postop: [
    { id: "arthro", n: "Post-operative stiffness (arthrofibrosis risk)", icd: "M24.6", cue: "Range lagging behind the expected stage", refer: "Tell the surgeon if range stalls" },
  ],
  chronic: [
    { id: "nocipl", n: "Nociplastic pain features", icd: "MG30.01", cue: "Widespread pain, sensitivity, pain out of proportion to tissue findings" },
  ],
};

// ── Treatment rules per pathway ─────────────────────────────────────────────
export function pathTx(A: AssessmentState): PathwayTreatment {
  const p = A.path || "gen";
  const ph = (A.ph || {}) as Record<string, unknown>;
  const T: PathwayTreatment = { focus: [], dose: "", edu: [], cautions: [], avoid: [], avoidRe: null, src: [] };
  const add = (k: "focus" | "edu" | "cautions" | "avoid" | "src", ...x: string[]) => T[k].push(...x);

  if (p === "desk" || p === "corp") {
    add("focus", "Workstation corrections first, then posture endurance", "Regular movement breaks", "Neck, upper-back and shoulder-blade strength");
    T.dose = "Desk exercises 2–3 times through the workday; strength work 3 times a week.";
    add("edu", "Your best posture is your next posture: change position often.", "Set the screen top at or just below eye level, an arm's length away.", "Breaks every 30–45 minutes matter more than a perfect chair.");
    add("src", "Clinic ergonomic assessment form", "Andersen LL et al. 2008/2011: workplace strength training for neck and shoulder pain in office workers");
  }
  if (p === "sport") {
    add("focus", "Load management: reduce, don't stop", "Restore strength and control before speed and power", "Return to sport by criteria, not the calendar");
    T.dose = "Strength 2–3 times a week; plyometrics only when hop tests are within 10% of the other side.";
    add("edu", "Sudden spikes in training load raise injury risk; build gradually.", "Pain up to 3/10 during rehab is acceptable if it settles by the next morning.");
    if (ph.s_change === "Increased a lot in the last 4 weeks") add("cautions", "Training load rose sharply in the last 4 weeks: cut volume before intensity.");
    add("src", "Ardern CL et al. 2016 consensus on return to sport", "Lauersen JB et al. 2014: strength training reduces sports injuries");
  }
  if (p === "kids") {
    add("focus", "Play-based exercise", "Activity modification, not complete rest", "Parent-led home plan with 2–3 exercises");
    T.dose = "Short sessions (15–20 minutes) that feel like play. Aim for 60 minutes of activity a day.";
    add("edu", "Children heal well. Growth-related pain usually settles as growth slows.", "Supervised strength training is safe for children and teens when technique comes first.", "Keep the school bag light and use both straps.");
    add("cautions", "Keep jumping and sprinting volume within comfort while growth-plate pain is irritable.", "Report night pain, limp, fever or swelling to the doctor.");
    add("src", "WHO 2020 guidelines on physical activity (ages 5–17)", "Lloyd RS et al. 2014 international consensus on youth resistance training");
  }
  if (p === "women") {
    if (isPreg(A)) {
      add("focus", "Stay active safely", "Pelvic floor training", "Pelvic girdle comfort");
      T.dose = "150 minutes of moderate activity a week (talk test) plus pelvic floor training daily, if the obstetrician has no concerns.";
      add("cautions", "Avoid lying flat on the back for long after the first trimester; use side-lying or a wedge.", "No contact sports, activities with a fall risk, hot yoga or breath-holding.", "Stop and call the obstetrician with bleeding, fluid leak, contractions, dizziness, chest pain, headache or calf swelling.");
      add("avoid", "Lying flat on the back for long periods", "Heavy lifting with breath-holding", "Activities with a fall risk");
      T.avoidRe = /prone|lying face down|crunch|sit-up/i;
      add("src", "ACOG Committee Opinion 804 (2020)", "WHO 2020 guidelines");
    } else if (isPostnatal(A)) {
      add("focus", "Reconnect breathing, deep tummy and pelvic floor", "Graded tummy loading, watching for doming", "Strength for lifting and carrying the baby");
      T.dose = "Supervised pelvic floor training for at least 3 months (NICE NG210). Build general strength 2–3 times a week.";
      add("cautions", "Return to running not before about 12 weeks after birth and only after the return-to-running screen.", "Leaking, heaviness or pain during exercise means the load is too high for now.");
      add("avoid", "High-impact exercise before the return-to-running screen", "Straining on the toilet");
      add("src", "NICE NG210 (2021) pelvic floor dysfunction", "Goom T, Donnelly G, Brockwell E 2019: Returning to running postnatal guideline");
    } else if (isMeno(A)) {
      add("focus", "Progressive strength training", "Impact and balance for bone health", "Pelvic floor training if symptoms");
      T.dose = "Strength 2–3 times a week; daily balance; impact as tolerated if no spinal fracture.";
      add("cautions", "With osteoporosis or a past spinal fracture, avoid loaded forward bending and twisting and get advice on impact.");
      add("src", "Royal Osteoporosis Society 2019: Strong, Steady and Straight consensus");
    }
  }
  if (p === "senior") {
    add("focus", "Strength and balance (falls prevention)", "Home safety", "Confidence and independence");
    T.dose = "Balance and strength at least 3 times a week, progressing, for 12 weeks or more.";
    add("edu", "Falls are not a normal part of ageing; most risks can be reduced.", "Stand up slowly: sit on the edge of the bed first.", "Practise getting up from the floor with help nearby.");
    add("cautions", "Keep a chair or counter within reach during balance exercises.", "Ask the doctor to review medicines that cause drowsiness or dizziness.");
    add("avoid", "Loose slippers", "Rushing to the toilet at night in the dark");
    add("src", "Montero-Odasso M et al. 2022 World Guidelines for Falls Prevention", "Sherrington C et al. 2019 Cochrane review", "CDC STEADI", "Otago Exercise Programme");
  }
  if (p === "preop") {
    add("focus", "Get stronger and fitter before surgery", "Learn the first post-op exercises and the walking aid now", "Set expectations for recovery");
    T.dose = "Daily home programme; 2–3 supervised sessions a week until surgery.";
    add("edu", "People who are stronger before surgery usually find the first weeks easier.");
    add("src", "Moyer R et al. 2017 meta-analysis on prehabilitation for hip and knee replacement");
  }
  if (p === "postop") {
    const prec = on(ph.q_prec as Record<string, boolean>);
    add("focus", "Follow the surgeon's protocol", "Circulation, swelling control and early activation", "Range and strength within the allowed limits");
    T.dose = "Short, frequent sessions: home exercises 2–3 times a day early on.";
    add("cautions", "The surgeon's protocol overrides anything in this plan.");
    const re: string[] = [];
    if (prec.includes("Hip: posterior precautions")) { add("avoid", "Bending the hip past 90°", "Crossing the legs", "Turning the operated leg inwards"); re.push("deep squat", "figure-4", "pigeon", "knee to chest", "cross", "child's pose", "low chair", "floor sitting"); }
    if (prec.includes("Hip: anterior precautions")) { add("avoid", "Taking the leg back behind you", "Turning the leg outwards"); re.push("hip flexor stretch", "lunge", "bridge", "clam"); }
    if (prec.includes("Spine: no bending, lifting or twisting")) { add("avoid", "Bending, lifting and twisting"); re.push("twist", "rotation", "flexion", "toe touch", "cat", "deadlift", "lift"); }
    if (prec.includes("Sling") || prec.includes("No active lifting of the arm yet")) { add("avoid", "Lifting the arm by itself", "Taking weight through the arm"); re.push("press", "raise", "push-up", "wall slide", "band", "plank", "row"); }
    if (re.length) T.avoidRe = new RegExp(re.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i");
    add("src", "Surgeon's protocol", "Bade MJ & Stevens-Lapsley JE 2011: early high-intensity rehab after TKA");
  }
  if (p === "neuro") {
    const c = (ph.n_cond as string) || "";
    add("focus", "Task-specific practice with many repetitions", "Walking and balance", "Fitness and strength");
    T.dose = "Practise tasks daily; supervised sessions 2–3 times a week. Fatigue guides the dose.";
    if (c === "Parkinson's") { add("focus", "Big movements, cueing and dual-task practice"); add("edu", "Exercise in the ON period when medicines are working."); }
    if (c === "Multiple sclerosis") add("cautions", "Heat can bring symptoms on temporarily: keep cool and pace activity.");
    if (c === "Stroke") add("cautions", "Support the weaker arm; never pull on it to move the person.");
    add("src", "Winstein CJ et al. 2016 AHA/ASA stroke rehabilitation guideline", "KNGF / European Physiotherapy Guideline for Parkinson's disease 2014");
  }
  if (p === "chronic") {
    add("focus", "Understand pain (pain neuroscience education)", "Graded activity and pacing", "Sleep, stress and valued goals");
    T.dose = "Start each activity a little below today's tolerance and add a planned amount each week, on good days and bad days.";
    add("edu", "Hurt does not always mean harm. A sensitised nervous system can turn the volume up.", "Flare-ups happen; have a plan rather than stopping everything.");
    add("avoid", "Relying only on passive treatment", "Long rest", "Repeat scans without new symptoms");
    add("src", "Louw A et al. 2016 systematic review on pain neuroscience education", "Geneen LJ et al. 2017 Cochrane overview on exercise for chronic pain", "NICE NG193 (2021) chronic primary pain");
  }
  if (p === "quick") add("focus", "One clear problem: advice, 2–3 key exercises and a review date");
  return T;
}

// ── Pathway-specific exercises ──────────────────────────────────────────────
type PathExAdd = { ph: PhaseId; w: "clinic" | "home"; x: Exercise; when?: (A: AssessmentState) => boolean };
function PX(ph: PhaseId, w: "clinic" | "home", x: Exercise, when?: (A: AssessmentState) => boolean): PathExAdd {
  return { ph, w, x: { ...x, custom: false }, when };
}
const F = { floor: true };

export const PATH_EX: Partial<Record<PathwayId, PathExAdd[]>> = {
  senior: [
    PX("calm", "home", X("FUNC", "Sit-to-stand from a chair", "2 × 5–10, hands on thighs if needed", "Nose over toes, stand tall, sit down slowly", "Builds leg strength for getting up safely; a core part of falls-prevention programmes.")),
    PX("calm", "home", X("NEU", "Heel-to-toe standing at the kitchen counter", "3 × 10–30 s, hold the counter", "Look ahead, not down", "Trains balance in a narrow stance, which is often the first to decline.")),
    PX("heal", "home", X("CON", "Heel raises holding a counter", "2 × 10", "Up for 2, down for 3", "Strengthens calves for push-off and steadier walking.")),
    PX("strengthen", "clinic", X("FUNC", "Step-ups onto a low step", "2–3 × 8 each leg, rail nearby", "Whole foot on the step", "Strength and confidence for stairs.")),
    PX("strengthen", "clinic", X("FUNC", "Getting up from the floor (backward chaining)", "Practise 2–3 times with help", "Kneel, half-kneel, then stand using a chair", "Knowing how to get up after a fall prevents a long lie on the floor.", F)),
    PX("flourish", "home", X("NEU", "One-leg stand near support", "3 × up to 30 s each", "Fingertip support, then hands-free", "Keeps balance improving.")),
    PX("flourish", "home", X("NEU", "Tai chi or a balance class", "2–3 times a week", "A group with a trained teacher", "Tai chi reduces falls in older adults.")),
  ],
  women: [
    PX("calm", "home", X("NEU", "Pelvic floor muscle training", "3 times a day: 8–12 slow squeezes (hold up to 10 s), then 10 quick ones", "Squeeze and lift as if stopping wind and urine, then let go fully; keep breathing", "Supervised training reduces leaking during and after pregnancy."), (A) => isPreg(A) || isPostnatal(A)),
    PX("heal", "home", X("CON", "Side-lying clams", "2 × 10–15 each side", "Hips stacked", "Strengthens the hip muscles that steady the pelvis; useful for pelvic girdle pain.", F), (A) => isPreg(A) || isPostnatal(A)),
    PX("strengthen", "home", X("FUNC", "Supported squat to a chair", "2–3 × 10", "Knees in line with toes, breathe out as you stand", "Leg strength for daily lifting and for labour positions."), (A) => isPreg(A) || isPostnatal(A)),
    PX("flourish", "home", X("FUNC", "Return-to-running walk-run", "1 min run / 1 min walk × 10, 3 times a week, only after the screen", "Stop if leaking, heaviness or pain", "Gradual return after birth."), isPostnatal),
    PX("strengthen", "clinic", X("LOAD", "Progressive resistance training", "2–3 times a week, 8–12 reps, build the load", "Good form first", "Builds muscle and supports bone strength."), isMeno),
  ],
  kids: [
    PX("heal", "home", X("NEU", "Animal walks (bear crawl, crab walk)", "3 × 10 m", "Make it a race or a game", "Builds shoulder, core and hip strength through play.", F)),
    PX("strengthen", "home", X("CON", "Wall sit challenge", "3 × 15–30 s", "Back flat on the wall", "Leg endurance that's easy to measure and beat.")),
    PX("flourish", "home", X("AER", "Active play", "60 min a day", "Running, jumping, climbing", "Daily activity builds bones, muscles and fitness (WHO).")),
  ],
  desk: [
    PX("calm", "home", X("POS", "Chin tucks at the desk", "10 reps every 1–2 hours", "Slide the head back, eyes level", "Counters forward head posture during screen work.")),
    PX("calm", "home", X("FUNC", "Micro-break: stand and walk", "1–2 min every 30–45 min", "Set a reminder", "Breaking up sitting eases discomfort.")),
    PX("strengthen", "home", X("LOAD", "Band rows", "3 × 12, 3 times a week", "Elbows back, shoulders down", "Workplace strength training reduces neck and shoulder pain in office workers.", { band: true })),
  ],
  sport: [
    PX("heal", "home", X("NEU", "Single-leg balance with reach", "3 × 30 s each", "Soft knee, hips level", "Foundation for landing and cutting control.")),
    PX("strengthen", "clinic", X("ECC", "Nordic hamstring curl", "2–3 × 4–6", "Lower slowly, catch with the hands", "Lowers hamstring injury rates in team sport.", F)),
    PX("flourish", "clinic", X("PLY", "Landing drills (drop and stick)", "3 × 6", "Land soft, knees over toes", "Trains safe landing mechanics.")),
    PX("flourish", "home", X("FUNC", "Graded run-walk", "3 times a week, small weekly increases", "Pain no more than 3/10 and settled by the next morning", "Gradual return to running."), (A) => (A.ph as Record<string, unknown>)?.s_sport === "Running"),
  ],
  preop: [
    PX("heal", "home", X("ISO", "Quadriceps sets", "10 × 5–10 s, 3 times a day", "Press the back of the knee down", "Wakes up the thigh muscle that switches off after surgery.", F)),
    PX("strengthen", "home", X("FUNC", "Sit-to-stand", "3 × 10", "Use the arms if needed", "Leg strength for getting up after surgery.")),
  ],
  postop: [
    PX("calm", "home", X("ACT", "Ankle pumps", "20 reps every hour while awake", "Point and pull the foot", "Keeps blood moving in the calf after surgery.")),
    PX("calm", "home", X("ISO", "Quadriceps sets", "10 × 5–10 s, 3 times a day", "Press the back of the knee down", "Restores thigh activation early.", F)),
    PX("heal", "clinic", X("FUNC", "Gait training with the aid", "Short walks, several times a day", "Follow the weight-bearing instruction", "Safe walking within the limits.")),
  ],
  neuro: [
    PX("heal", "home", X("FUNC", "Sit-to-stand practice", "5 × 5 through the day", "Weight through both legs", "Task practice with many repetitions drives recovery.")),
    PX("strengthen", "home", X("FUNC", "Walking practice", "Daily, build the time", "Use the aid as advised", "Walking practice improves walking speed and endurance.")),
    PX("heal", "home", X("FUNC", "Big amplitude movements", "10 reps each, daily", "Think big: long steps, wide arm swings", "Amplitude training counters shrinking movement in Parkinson's."), (A) => (A.ph as Record<string, unknown>)?.n_cond === "Parkinson's"),
  ],
  chronic: [
    PX("calm", "home", X("BRE", "Slow breathing with a long exhale", "5 min, twice a day", "In for 4, out for 6", "Calms an over-protective nervous system.")),
    PX("heal", "home", X("AER", "Graded walking", "Start just below today's tolerance; add a planned amount each week", "Stick to the plan on good and bad days", "Graded activity rebuilds tolerance without boom-bust.")),
    PX("strengthen", "clinic", X("LOAD", "Whole-body strength circuit", "2 × 8–10 of 4–5 moves, 2–3 times a week", "Comfortable effort", "Exercise reduces pain and improves function in persistent pain.")),
  ],
};
PATH_EX.corp = PATH_EX.desk;

export function pathExercises(A: AssessmentState, ph: PhaseId, w: "clinic" | "home"): Exercise[] {
  const list = PATH_EX[A.path] || [];
  return list.filter((e) => e.ph === ph && e.w === w && (!e.when || e.when(A))).map((e) => e.x);
}

export function pathProgramme(A: AssessmentState, opts?: { noFloor?: boolean; noBand?: boolean }): RegionProgramme | null {
  const noFloor = !!opts?.noFloor, noBand = !!opts?.noBand;
  const are = pathTx(A).avoidRe;
  const phases = {} as Record<PhaseId, { goal: string; move: string; pain: string; load: string; clinic: Exercise[]; home: Exercise[] }>;
  let n = 0;
  for (const ph of PHASE_IDS) {
    const clinic = pathExercises(A, ph, "clinic").filter((e) => (!noFloor || !e.floor) && (!noBand || !e.band) && (!are || !are.test(e.n)));
    const home = pathExercises(A, ph, "home").filter((e) => (!noFloor || !e.floor) && (!noBand || !e.band) && (!are || !are.test(e.n)));
    n += clinic.length + home.length;
    phases[ph] = { ...PHASE_META[ph], clinic, home };
  }
  return n ? { region: "path", phases: phases as RegionProgramme["phases"], avoid: [], cautions: GENERAL_CAUTIONS } : null;
}

export function pathReviewDate(A: AssessmentState, fromDate: string): string {
  const weeks = pathOf(A).review || 4;
  const d = new Date((fromDate || new Date().toISOString().slice(0, 10)) + "T00:00:00");
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

// ── Pathway flags and scores ────────────────────────────────────────────────
export interface PathFlag { lv: "Caution" | "High" | "Emergency"; msg: string; q: string; src: "hx" | "exam" }

function pathQs(A: AssessmentState, src: "hx" | "exam"): PathQuestion[] {
  const S = (src === "exam" ? PATH_EXAM : PATH_HX)[A.path] || [];
  return S.flatMap((s) => s.qs || []).filter((q) => !q.when || q.when(A));
}

export function pathFlags(A: AssessmentState): PathFlag[] {
  const out: PathFlag[] = [];
  ([["hx", A.ph], ["exam", A.pe]] as const).forEach(([src, store]) => {
    pathQs(A, src).forEach((q) => {
      (q.fl || []).forEach((f) => {
        const val = (store as Record<string, unknown>)[q.id];
        const hit = q.t === "multi" ? on(val as Record<string, boolean>).some((x) => f.v.includes(x)) : f.v.includes(val as string);
        if (hit) out.push({ lv: f.lv, msg: f.msg, q: q.q, src });
      });
    });
  });
  return out;
}

export function pathHold(A: AssessmentState): string[] {
  return pathFlags(A).filter((f) => f.lv === "Emergency" || f.lv === "High").map((f) => f.msg);
}

export interface PathScoreEntry { txt: string }
export function pathScores(A: AssessmentState): Record<string, PathScoreEntry> {
  const v = (A.ph || {}) as Record<string, unknown>;
  const p = A.path || "gen";
  const S: Record<string, PathScoreEntry> = {};
  if (p === "senior") {
    const falls = v.o_falls as string, unsteady = v.o_unsteady === "Yes", worry = v.o_worry === "Yes";
    if (falls || unsteady != null) {
      const risk = falls === "Two or more" || (unsteady && worry);
      S.falls = { txt: `Falls screen: ${falls || "not answered"}${unsteady ? ", feels unsteady" : ""}${risk ? " — may be at increased risk of falling" : ""}.` };
    }
    const stayTicked = on(v.o_stay as Record<string, boolean>);
    if (stayTicked.length) {
      const WEIGHT_2 = ["I have fallen in the past year", "I use or have been advised to use a cane or walker to get around safely"];
      const score = stayTicked.reduce((acc, x) => acc + (WEIGHT_2.includes(x) ? 2 : 1), 0);
      S.stay = { txt: `Stay Independent brochure: ${score}/14 (${stayTicked.length} statements ticked).${score >= 4 ? " 4 or more: talk to the doctor about a falls risk assessment (CDC STEADI)." : ""}` };
    }
  }
  if (p === "desk" || p === "corp") {
    const hours = v.d_hours as string, brk = v.d_break as string;
    if (hours || brk) {
      const risky = (hours === "8–10" || hours === "Over 10") && (brk === "Rarely" || brk === "Every 2 hours");
      S.ergo = { txt: `Desk exposure: ${hours || "not recorded"} a day, breaks ${(brk || "not recorded").toLowerCase()}.${risky ? " High exposure with infrequent breaks." : ""}` };
    }
    const risk = v.e_risk as Record<string, number> | undefined;
    if (risk && Object.keys(risk).length) {
      const vals = Object.values(risk);
      const total = vals.reduce((a, b) => a + b, 0);
      const max = vals.length * (ERGO_FREQ.length - 1);
      S.ergoRisk = { txt: `Ergonomic risk checklist: ${total}/${max}.${max && total / max >= 0.6 ? " High exposure to ergonomic risk factors — prioritise workstation correction." : ""}` };
    }
  }
  if (p === "chronic") {
    const mood = v.x_mood as Record<string, number> | undefined;
    if (mood && Object.keys(mood).length) {
      const phq2 = (mood[0] || 0) + (mood[1] || 0);
      const gad2 = (mood[2] || 0) + (mood[3] || 0);
      const parts: string[] = [];
      if (mood[0] != null || mood[1] != null) parts.push(`PHQ-2 ${phq2}/6${phq2 >= 3 ? " (positive screen — consider referral for further mood assessment)" : ""}`);
      if (mood[2] != null || mood[3] != null) parts.push(`GAD-2 ${gad2}/6${gad2 >= 3 ? " (positive screen — consider referral for further anxiety assessment)" : ""}`);
      if (parts.length) S.mood = { txt: parts.join("; ") + "." };
    }
  }
  if (p === "corp") {
    const radiate = v.c_radiate === "Yes", freq = v.c_freq as string;
    if (radiate || freq) {
      const band = radiate ? "Red" : freq === "Daily" ? "Amber" : "Green";
      S.triage = { txt: `Triage ${band}: ${band === "Red" ? "radiating symptoms, needs full assessment" : band === "Amber" ? "daily discomfort" : "low-level or occasional discomfort"}.` };
    }
  }
  if (p === "women") {
    const weeks = parseFloat((v.w_weeks as string) || "");
    if (!isNaN(weeks)) S.tri = { txt: `${weeks} weeks: ${weeks < 14 ? "first" : weeks < 28 ? "second" : "third"} trimester.` };
  }
  if (p === "postop" || p === "preop") {
    const dateStr = (p === "postop" ? v.q_date : v.p_date) as string;
    if (dateStr) {
      const days = Math.round((new Date(A.P.date || new Date().toISOString().slice(0, 10)).getTime() - new Date(dateStr).getTime()) / 864e5);
      S.wk = p === "postop"
        ? { txt: days >= 0 ? `${Math.floor(days / 7)} weeks ${days % 7} days since surgery.` : "Surgery date is in the future." }
        : { txt: days <= 0 ? `Surgery in ${Math.ceil(-days / 7)} weeks.` : "Surgery date has passed: switch to the post-op pathway." };
    }
  }
  return S;
}

function fmtAns(q: PathQuestion, val: unknown): string | null {
  if (val == null || val === "") return null;
  if (q.t === "multi") { const l = on(val as Record<string, boolean>); return l.length ? l.join(", ") : null; }
  if (q.t === "num") return `${val} ${q.u || ""}`.trim();
  if (q.t === "date") return String(val);
  if (q.t === "matrix") {
    const v = val as Record<string, number> | undefined;
    if (!v) return null;
    const parts = (q.rows || []).map((r, i) => (v[i] != null ? `${r}: ${q.cols?.[v[i]] ?? v[i]}` : null)).filter((x): x is string => !!x);
    return parts.length ? parts.join("; ") : null;
  }
  return String(val);
}

/** Plain-text Q&A lines for the SOAP subjective/objective narrative. */
export function pathLines(A: AssessmentState, src: "hx" | "exam"): string[] {
  const S = (src === "exam" ? PATH_EXAM : PATH_HX)[A.path] || [];
  const store = (src === "exam" ? A.pe : A.ph) as Record<string, unknown>;
  const L: string[] = [];
  S.forEach((sec) => {
    const parts = (sec.qs || []).filter((q) => !q.when || q.when(A)).map((q) => {
      const a = fmtAns(q, store[q.id]);
      return a ? `${q.q.replace(/\s*\(.*?\)\s*$/, "")}: ${a}` : null;
    }).filter((x): x is string => !!x);
    if (parts.length) L.push(`${sec.h}: ${parts.join("; ")}.`);
  });
  return L;
}

export { on, isPreg, isPostnatal, isMeno };
