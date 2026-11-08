/**
 * src/lib/assessment/regions.ts
 *
 * Body regions, special orthopaedic tests, manual-muscle-test and
 * muscle-length tables, and the functional movement screen.
 * Ported from the Vyayama v9 clinical reference (data_old.js, data_tests2.js).
 */

import type { Region } from "./types";

export interface RegionDef {
  id: Region;
  lb: string;
}

export const REGIONS: RegionDef[] = [
  { id: "cervical", lb: "Cervical" },
  { id: "thoracic", lb: "Thoracic" },
  { id: "lumbar", lb: "Lumbar/SIJ" },
  { id: "shoulder", lb: "Shoulder" },
  { id: "elbow", lb: "Elbow" },
  { id: "wrist", lb: "Wrist/Hand" },
  { id: "hip", lb: "Hip" },
  { id: "knee", lb: "Knee" },
  { id: "ankle", lb: "Ankle/Foot" },
];

export const REGION_NAME: Record<string, string> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r.lb])
);

export function regionName(id: string): string {
  return REGION_NAME[id] || id;
}

export interface SpecialTest {
  id: string;
  n: string;
  p: string; // pathology it screens for
  bi: boolean; // bilateral
  se?: number; // sensitivity %
  sp?: number; // specificity %
  desc: string;
  interp: string;
}

export const TESTS: Record<string, { lb: string; ts: SpecialTest[] }> = {
  cervical: {
    lb: "Cervical",
    ts: [
      { id: "spurling", n: "Spurling's", p: "Cervical radiculopathy", bi: true, se: 30, sp: 93, desc: "Laterally flex+rotate to symptomatic side, gentle downward compression.", interp: "Radiating arm pain (not just neck) = POSITIVE. Foraminal narrowing." },
      { id: "distraction", n: "Cervical Distraction", p: "Nerve root compression", bi: true, se: 40, sp: 90, desc: "Supine, gentle axial traction ~14kg × 30s.", interp: "Arm symptoms relieved = POSITIVE." },
      { id: "ultt1", n: "ULTT-1 Median", p: "Median nerve neurodynamics", bi: true, se: 72, sp: 33, desc: "Shoulder depression → 90° ABD → ER → elbow extension → wrist DF.", interp: ">10° elbow extension deficit vs opposite or thumb/index tingling." },
      { id: "flexRot", n: "Flexion-Rotation", p: "Cervicogenic HA / C1-C2", bi: true, se: 91, sp: 90, desc: "Supine, fully flex cervical → rotate L and R. Normal ≥44°.", interp: "<32° or headache reproduced = POSITIVE." },
      { id: "sharpPurser", n: "Sharp-Purser", p: "Atlanto-axial instability", bi: false, se: 69, sp: 96, desc: "Hand on forehead, other hand on C2. Gentle posterior translation.", interp: "Clunk or symptom relief = POSITIVE. SAFETY test — contraindicate HVLA if +ve." },
      { id: "roos", n: "Roos (EAST) test", p: "Thoracic outlet syndrome", bi: false, desc: "Arms in 90° abduction and external rotation, open and close hands slowly for 3 min.", interp: "Reproduction of arm heaviness, tingling or inability to continue = POSITIVE." },
      { id: "bakody", n: "Shoulder abduction relief (Bakody)", p: "Cervical radiculopathy", bi: true, desc: "Patient places hand of the affected side on top of the head.", interp: "Arm symptoms ease = POSITIVE." },
      { id: "lhermitte", n: "Lhermitte's sign", p: "Cord involvement / myelopathy", bi: false, desc: "Seated, passive neck flexion.", interp: "Electric shock down the spine or limbs = POSITIVE. Refer." },
      { id: "cfet", n: "Deep neck flexor endurance test", p: "Motor control / endurance", bi: false, desc: "Supine, chin tuck, lift head 2.5 cm; time until chin pokes or head drops.", interp: "Under about 20–30 s suggests poor endurance, common in neck pain." },
    ],
  },
  thoracic: {
    lb: "Thoracic",
    ts: [
      { id: "tPA", n: "Thoracic PA Glide", p: "Segmental stiffness", bi: false, desc: "Prone, PA pressure each thoracic spinous process.", interp: "Pain/stiffness/asymmetry at specific levels." },
      { id: "thorRot", n: "Thoracic Rotation ROM", p: "Mobility screen", bi: true, desc: "Seated, arms crossed, active rotation pelvis stabilised. Normal 50° each.", interp: "<35° or >10° asymmetry = hypomobility." },
      { id: "ribSpring", n: "Rib spring test", p: "Costovertebral / rib dysfunction", bi: true, desc: "Prone, posterior-to-anterior pressure over each rib angle.", interp: "Local familiar pain = POSITIVE." },
      { id: "chestExp", n: "Chest expansion", p: "Thoracic mobility / axial spondyloarthritis", bi: false, desc: "Tape at the 4th intercostal space; measure full inhale minus full exhale.", interp: "Under about 2.5 cm suggests reduced expansion; consider inflammatory causes." },
    ],
  },
  lumbar: {
    lb: "Lumbar/SIJ",
    ts: [
      { id: "slr", n: "SLR", p: "L4-S1 radiculopathy", bi: true, se: 92, sp: 28, desc: "Passive SLR + ankle DF sensitisation, record onset angle.", interp: "Leg pain (not back) at 30-70° with DF = POSITIVE." },
      { id: "slump", n: "Slump Test", p: "Neural tension", bi: true, se: 84, sp: 83, desc: "Seated: thoracic+lumbar slump → neck flex → knee extension → ankle DF.", interp: "Symptoms relieved with neck extension = POSITIVE." },
      { id: "kemp", n: "Kemp's Test", p: "Facet joint", bi: true, se: 55, sp: 80, desc: "Standing: ipsilateral LF + rotation + extension + overpressure.", interp: "Local back pain (not leg) = POSITIVE." },
      { id: "faber", n: "FABER", p: "Hip/SIJ", bi: true, se: 57, sp: 71, desc: "Figure-4. Gravity + overpressure to knee and contralateral ASIS.", interp: "Groin=hip. Posterior=SIJ. Compare height bilaterally." },
      { id: "sijDist", n: "SIJ distraction", p: "SIJ provocation (Laslett cluster)", bi: false, se: 60, sp: 81, desc: "Supine, posteriorly directed pressure on both ASIS for 30 s.", interp: "Familiar buttock / SIJ pain = POSITIVE." },
      { id: "thighThrust", n: "Thigh thrust", p: "SIJ provocation (Laslett cluster)", bi: false, se: 88, sp: 69, desc: "Supine, hip flexed 90°, axial force through the femur toward the table.", interp: "Familiar posterior pain = POSITIVE." },
      { id: "sijComp", n: "SIJ compression", p: "SIJ provocation (Laslett cluster)", bi: false, se: 69, sp: 69, desc: "Side-lying, downward pressure on the uppermost iliac crest for 30 s.", interp: "Familiar SIJ pain = POSITIVE." },
      { id: "sacThrust", n: "Sacral thrust", p: "SIJ provocation (Laslett cluster)", bi: false, se: 63, sp: 75, desc: "Prone, posterior-to-anterior pressure over the centre of the sacrum.", interp: "Familiar SIJ pain = POSITIVE." },
      { id: "gaenslen", n: "Gaenslen's", p: "SIJ provocation (Laslett cluster)", bi: true, se: 50, sp: 77, desc: "Supine at table edge, one hip hyperextended off the edge, other hip flexed to chest; overpressure.", interp: "Familiar SIJ pain on the tested side = POSITIVE." },
      { id: "mdt", n: "Centralisation Test", p: "McKenzie directional preference", bi: false, desc: "10 repeated end-range movements. Monitor symptom response.", interp: "Symptoms migrate proximally = centralisation. Discogenic LBP." },
      { id: "pli", n: "Prone instability test", p: "Lumbar segmental instability", bi: false, se: 72, sp: 58, desc: "Prone over the table edge, feet on floor; PA pressure; repeat with legs lifted.", interp: "Pain with feet down that eases with legs lifted = POSITIVE." },
      { id: "pleT", n: "Passive lumbar extension test", p: "Lumbar structural instability", bi: false, se: 84, sp: 90, desc: "Prone, lift both legs about 30 cm keeping knees straight, gently pull.", interp: "Strong low back pain or heaviness that eases when legs are lowered = POSITIVE." },
      { id: "xslr", n: "Crossed SLR", p: "Large disc herniation", bi: true, desc: "Raise the non-painful leg.", interp: "Pain in the painful leg = POSITIVE; high specificity for disc herniation." },
      { id: "pkb", n: "Prone knee bend (femoral nerve)", p: "L2–L4 radiculopathy", bi: true, desc: "Prone, passively bend the knee toward the buttock.", interp: "Front-of-thigh nerve pain (not just quad stretch) = POSITIVE." },
      { id: "stork", n: "One-leg standing extension (Stork)", p: "Pars defect / spondylolysis", bi: true, desc: "Stand on one leg and extend the back.", interp: "Low back pain on the stance side = POSITIVE. Low accuracy; use with history (young athlete)." },
      { id: "schober", n: "Modified Schober's", p: "Lumbar flexion / axial spondyloarthritis", bi: false, desc: "Mark 5 cm below and 10 cm above PSIS level; measure in full flexion.", interp: "Increase under 5 cm = reduced lumbar flexion." },
    ],
  },
  shoulder: {
    lb: "Shoulder",
    ts: [
      { id: "hawkins", n: "Hawkins-Kennedy", p: "Subacromial impingement", bi: true, se: 79, sp: 59, desc: "Shoulder+elbow 90°, passively IR shoulder.", interp: "Anterior/superior shoulder pain = POSITIVE." },
      { id: "emptyCan", n: "Empty Can (Jobe's)", p: "Supraspinatus integrity", bi: true, se: 69, sp: 66, desc: "Arm 90° scapular plane, thumb down, downward resistance.", interp: "Pain and/or weakness = POSITIVE. Weakness = likely full-thickness tear." },
      { id: "dropArm", n: "Drop Arm", p: "Large RC tear", bi: true, se: 35, sp: 88, desc: "Passively abduct to 90°, patient slowly lowers arm.", interp: "Cannot control lowering = POSITIVE." },
      { id: "obrien", n: "O'Brien's", p: "SLAP/AC joint", bi: true, se: 63, sp: 73, desc: "Arm 90° flex, 15° medial adduction, maximal IR vs ER. Downward force.", interp: "Deep pain worse IR relieved ER = SLAP. Pain on top = AC joint." },
      { id: "painfulArc", n: "Painful Arc", p: "Impingement/RC", bi: true, desc: "Active abduction, note arc of pain.", interp: "60-120° = subacromial. >120° = AC joint." },
      { id: "neer", n: "Neer's impingement sign", p: "Subacromial pain", bi: true, se: 72, sp: 60, desc: "Stabilise the scapula, passively raise the internally rotated arm.", interp: "Anterior/lateral shoulder pain = POSITIVE." },
      { id: "crossAdd", n: "Cross-body adduction", p: "AC joint", bi: true, se: 77, sp: 79, desc: "Arm at 90°, passively adduct across the chest.", interp: "Pain on top of the shoulder (AC joint) = POSITIVE." },
      { id: "apprehension", n: "Apprehension and relocation", p: "Anterior instability", bi: true, desc: "Supine, 90° abduction, take into external rotation; then push the head of humerus backward.", interp: "Apprehension relieved by the relocation push = POSITIVE." },
      { id: "sulcus", n: "Sulcus sign", p: "Inferior / multidirectional instability", bi: true, desc: "Arm relaxed by side, pull downward.", interp: "A gap under the acromion over about 1–2 cm = POSITIVE." },
      { id: "speed", n: "Speed's test", p: "Long head of biceps", bi: true, desc: "Arm forward to 90°, elbow straight, palm up; resist further flexion.", interp: "Pain in the bicipital groove = POSITIVE." },
      { id: "yergason", n: "Yergason's test", p: "Biceps tendon / transverse ligament", bi: true, desc: "Elbow at 90°, resist supination.", interp: "Pain or popping in the bicipital groove = POSITIVE." },
      { id: "bellyPress", n: "Belly press / lift-off", p: "Subscapularis", bi: true, desc: "Press hand into belly keeping elbow forward, or lift hand off the lower back.", interp: "Elbow drops back or cannot lift off = POSITIVE (weak/torn subscapularis)." },
      { id: "erLag", n: "External rotation lag sign", p: "Infraspinatus / large cuff tear", bi: true, desc: "Passively place arm in near-full external rotation, ask patient to hold.", interp: "Arm drifts back into internal rotation = POSITIVE." },
    ],
  },
  elbow: {
    lb: "Elbow",
    ts: [
      { id: "cozen", n: "Cozen's Test", p: "Lateral epicondylopathy", bi: true, se: 85, sp: 72, desc: "Forearm pronated, patient resists wrist extension + radial deviation.", interp: "Lateral epicondyle pain = POSITIVE." },
      { id: "medEpi", n: "Medial Epicondyle Test", p: "Medial epicondylopathy", bi: true, se: 75, sp: 70, desc: "Forearm supinated, patient resists wrist flex + pronation.", interp: "Medial epicondyle pain = POSITIVE." },
      { id: "elbowFlex", n: "Elbow Flexion Test", p: "Cubital tunnel", bi: true, se: 75, sp: 99, desc: "Maximally flex elbow, hold 3 minutes.", interp: "Ring+little finger tingling within 3 min = POSITIVE." },
      { id: "mills", n: "Mill's test", p: "Lateral elbow tendinopathy", bi: true, desc: "Elbow straight, forearm pronated, passively flex the wrist.", interp: "Lateral elbow pain = POSITIVE." },
      { id: "maudsley", n: "Maudsley's (middle finger) test", p: "Lateral elbow / ECRB", bi: true, desc: "Resist extension of the middle finger.", interp: "Lateral elbow pain = POSITIVE." },
      { id: "tinelCub", n: "Tinel's at the cubital tunnel", p: "Ulnar neuropathy", bi: true, desc: "Tap the ulnar nerve behind the medial epicondyle.", interp: "Tingling into the little finger = POSITIVE." },
      { id: "hook", n: "Hook test", p: "Distal biceps rupture", bi: true, desc: "Elbow at 90°, forearm supinated, hook a finger under the biceps tendon from the lateral side.", interp: "No cord-like tendon to hook = POSITIVE. Refer urgently." },
      { id: "movValgus", n: "Moving valgus stress", p: "Medial (UCL) elbow injury", bi: true, desc: "Apply valgus stress while quickly extending the elbow from full flexion.", interp: "Medial pain between 120° and 70° = POSITIVE." },
    ],
  },
  wrist: {
    lb: "Wrist/Hand",
    ts: [
      { id: "phalens", n: "Phalen's", p: "CTS", bi: true, se: 68, sp: 73, desc: "Maximally flex both wrists, hold 60 sec.", interp: "Tingling thumb/index/middle within 60s = POSITIVE." },
      { id: "finkelstein", n: "Finkelstein's", p: "De Quervain's", bi: true, se: 81, sp: 50, desc: "Tuck thumb into fist, passive ulnar deviation.", interp: "Sharp radial styloid pain = pathognomonic for De Quervain's." },
      { id: "froment", n: "Froment's Sign", p: "Ulnar nerve palsy", bi: true, se: 93, sp: 95, desc: "Patient holds paper between thumb and index, examiner pulls away.", interp: "Thumb IP flexes = FPL compensating = ulnar nerve palsy." },
      { id: "tinelCarp", n: "Tinel's at the carpal tunnel", p: "Carpal tunnel syndrome", bi: true, desc: "Tap over the median nerve at the wrist crease.", interp: "Tingling into thumb, index and middle fingers = POSITIVE." },
      { id: "durkan", n: "Carpal compression (Durkan's)", p: "Carpal tunnel syndrome", bi: true, desc: "Firm thumb pressure over the carpal tunnel for 30 s.", interp: "Median nerve tingling within 30 s = POSITIVE." },
      { id: "watson", n: "Watson scaphoid shift", p: "Scapholunate instability", bi: true, desc: "Thumb on the scaphoid tubercle, move the wrist from ulnar to radial deviation.", interp: "Painful clunk or pain on release = POSITIVE." },
    ],
  },
  hip: {
    lb: "Hip",
    ts: [
      { id: "fadir", n: "FADIR", p: "FAI/labral pathology", bi: true, se: 78, sp: 10, desc: "Hip 90°, passively adduct + IR to end-range.", interp: "Deep groin pain or click = POSITIVE. FAI/labral tear." },
      { id: "hipFaber", n: "FABER (hip)", p: "Hip/SIJ/TFL", bi: true, se: 57, sp: 71, desc: "Figure-4. Gravity + overpressure to knee.", interp: "Groin=hip. Posterior=SIJ. Lateral=TFL/bursitis." },
      { id: "trend", n: "Trendelenburg", p: "Gluteus medius weakness", bi: true, se: 73, sp: 77, desc: "Stand one leg 30s, observe contralateral pelvis.", interp: "Contralateral pelvis drops = glut med weakness." },
      { id: "thomas", n: "Thomas Test", p: "Hip flexor length", bi: true, se: 68, sp: 58, desc: "Supine at table edge, both knees to chest, lower test leg.", interp: "Test leg in hip flexion = hip flexor tight. Knee fails = rectus femoris tight." },
      { id: "ober", n: "Ober's test", p: "ITB / TFL length", bi: true, desc: "Side-lying, extend and abduct the top hip, then lower.", interp: "Leg stays up (does not drop below horizontal) = tight ITB/TFL." },
      { id: "logRoll", n: "Log roll", p: "Intra-articular hip pathology", bi: true, desc: "Supine, roll the straight leg inward and outward.", interp: "Groin pain or clicking = POSITIVE." },
      { id: "scour", n: "Hip scour", p: "Hip OA / labral", bi: true, desc: "Hip flexed and adducted, apply axial load and sweep in an arc.", interp: "Groin pain or catching = POSITIVE." },
      { id: "derot", n: "Resisted external derotation", p: "Gluteal tendinopathy", bi: true, desc: "Supine, hip and knee at 90° in external rotation; resist return to neutral.", interp: "Reproduction of lateral hip pain = POSITIVE." },
      { id: "sls30", n: "Single-leg stance 30 s", p: "Gluteal tendinopathy", bi: true, desc: "Stand on the affected leg for 30 s, light finger support allowed.", interp: "Lateral hip pain within 30 s = POSITIVE." },
      { id: "stinch", n: "Stinchfield (resisted SLR)", p: "Intra-articular hip", bi: true, desc: "Supine, resist a straight-leg raise at about 30°.", interp: "Groin pain = POSITIVE." },
    ],
  },
  knee: {
    lb: "Knee",
    ts: [
      { id: "lachman", n: "Lachman", p: "ACL integrity", bi: true, se: 87, sp: 93, desc: "Supine, knee 20-30°. Stabilise femur, pull tibia anteriorly.", interp: ">3mm anterior translation or soft end-feel = POSITIVE." },
      { id: "mcmurray", n: "McMurray's", p: "Meniscal pathology", bi: true, se: 70, sp: 71, desc: "Full knee flex. Medial: ER+valgus+ext. Lateral: IR+varus+ext.", interp: "Palpable clunk along joint line = POSITIVE." },
      { id: "thessaly", n: "Thessaly's", p: "Meniscal load", bi: true, se: 89, sp: 97, desc: "Single leg 20°, rotate body 3x each direction.", interp: "Joint line discomfort or catching = POSITIVE." },
      { id: "valgus", n: "Valgus Stress", p: "MCL integrity", bi: true, se: 86, sp: 94, desc: "Test at 0° and 30°, apply valgus force.", interp: "Medial pain or laxity >5mm = POSITIVE." },
      { id: "antDrawK", n: "Anterior drawer", p: "ACL", bi: true, desc: "Knee 90°, sit on the foot, pull the tibia forward.", interp: "Increased translation or soft end-feel = POSITIVE." },
      { id: "pivot", n: "Pivot shift", p: "ACL rotatory instability", bi: true, desc: "Valgus and internal rotation while flexing from full extension.", interp: "Clunk as the tibia reduces = POSITIVE; very specific for ACL." },
      { id: "postDraw", n: "Posterior drawer", p: "PCL", bi: true, desc: "Knee 90°, push the tibia backward.", interp: "Increased backward translation = POSITIVE." },
      { id: "sag", n: "Posterior sag sign", p: "PCL", bi: true, desc: "Supine, hips and knees at 90°, view from the side.", interp: "Tibia sags backward = POSITIVE." },
      { id: "varusK", n: "Varus stress", p: "LCL", bi: true, desc: "Test at 0° and 30°, apply varus force.", interp: "Lateral pain or gapping = POSITIVE." },
      { id: "patApp", n: "Patellar apprehension", p: "Patellar instability", bi: true, desc: "Knee 30°, push the kneecap laterally.", interp: "Apprehension or quad contraction = POSITIVE." },
      { id: "jlt", n: "Joint line tenderness", p: "Meniscus", bi: true, desc: "Palpate medial and lateral joint lines with the knee bent.", interp: "Focal joint line pain = POSITIVE; combine with Thessaly and McMurray." },
      { id: "noble", n: "Noble compression", p: "ITB syndrome", bi: true, desc: "Press over the lateral femoral epicondyle while extending the knee from 90°.", interp: "Pain at about 30° = POSITIVE." },
      { id: "clarke", n: "Patellar grind (Clarke's)", p: "Patellofemoral", bi: true, desc: "Press the kneecap down, ask patient to tighten the quads.", interp: "Pain = POSITIVE, but many pain-free people test positive; low value on its own." },
    ],
  },
  ankle: {
    lb: "Ankle/Foot",
    ts: [
      { id: "antDraw", n: "Anterior Drawer (Ankle)", p: "ATFL integrity", bi: true, se: 80, sp: 74, desc: "Ankle 20° PF, anterior force to calcaneus.", interp: ">3mm anterior talar translation or soft end-feel = POSITIVE." },
      { id: "thompson", n: "Thompson Test", p: "Achilles rupture", bi: true, se: 96, sp: 93, desc: "Prone, squeeze calf. Normal = plantarflexion.", interp: "No plantarflexion = POSITIVE. Complete Achilles rupture." },
      { id: "windlass", n: "Windlass", p: "Plantar fasciopathy", bi: true, se: 32, sp: 100, desc: "Weight-bearing, dorsiflex great toe to end-range.", interp: "Medial heel pain reproduced = POSITIVE." },
      { id: "talarTilt", n: "Talar tilt", p: "CFL / lateral ligament", bi: true, desc: "Ankle neutral, invert the calcaneus and talus.", interp: "Increased tilt or pain versus the other side = POSITIVE." },
      { id: "squeeze", n: "Squeeze test", p: "High ankle (syndesmosis) sprain", bi: true, desc: "Squeeze tibia and fibula together at mid-calf.", interp: "Pain at the lower leg near the ankle = POSITIVE. Slower return to sport." },
      { id: "kleiger", n: "External rotation (Kleiger) test", p: "Syndesmosis", bi: true, desc: "Knee 90°, rotate the foot outward.", interp: "Pain over the front of the lower tibia-fibula joint = POSITIVE." },
      { id: "rlh", n: "Royal London Hospital test", p: "Achilles tendinopathy", bi: true, desc: "Find the tender spot with the ankle relaxed, then re-press with ankle dorsiflexed.", interp: "Tenderness that eases in dorsiflexion = POSITIVE." },
      { id: "silf", n: "Silfverskiöld test", p: "Gastrocnemius vs soleus tightness", bi: true, desc: "Measure dorsiflexion with knee straight and bent.", interp: "More dorsiflexion with knee bent = gastrocnemius tightness." },
    ],
  },
};

export const TEST_NAME: Record<string, string> = Object.fromEntries(
  Object.values(TESTS).flatMap((g) => g.ts.map((t) => [t.id, t.n]))
);

// ── Range of motion reference values ───────────────────────────────────────
export interface RomMeasure {
  id: string;
  m: string;
  n: number; // typical degrees
  bi: boolean;
  deficit?: boolean;
}

export const ROM: Record<string, RomMeasure[]> = {
  cervical: [
    { id: "c_fl", m: "Flexion", n: 50, bi: false },
    { id: "c_ex", m: "Extension", n: 60, bi: false },
    { id: "c_lf", m: "Side flexion", n: 45, bi: true },
    { id: "c_rot", m: "Rotation", n: 80, bi: true },
  ],
  thoracic: [
    { id: "t_rot", m: "Rotation (seated)", n: 45, bi: true },
    { id: "t_ex", m: "Extension", n: 25, bi: false },
  ],
  lumbar: [
    { id: "l_fl", m: "Flexion", n: 60, bi: false },
    { id: "l_ex", m: "Extension", n: 25, bi: false },
    { id: "l_lf", m: "Side flexion", n: 25, bi: true },
  ],
  shoulder: [
    { id: "s_fl", m: "Flexion", n: 180, bi: true },
    { id: "s_ext", m: "Extension", n: 60, bi: true },
    { id: "s_ab", m: "Abduction", n: 180, bi: true },
    { id: "s_er", m: "External rotation (90° abd)", n: 90, bi: true },
    { id: "s_ir", m: "Internal rotation (90° abd)", n: 70, bi: true },
  ],
  elbow: [
    { id: "e_fl", m: "Flexion", n: 150, bi: true },
    { id: "e_ex", m: "Extension (deficit)", n: 0, bi: true, deficit: true },
    { id: "e_sup", m: "Supination", n: 80, bi: true },
    { id: "e_pro", m: "Pronation", n: 80, bi: true },
  ],
  wrist: [
    { id: "w_fl", m: "Flexion", n: 80, bi: true },
    { id: "w_ex", m: "Extension", n: 70, bi: true },
    { id: "w_rd", m: "Radial deviation", n: 20, bi: true },
    { id: "w_ud", m: "Ulnar deviation", n: 30, bi: true },
  ],
  hip: [
    { id: "h_fl", m: "Flexion", n: 120, bi: true },
    { id: "h_ex", m: "Extension", n: 30, bi: true },
    { id: "h_ab", m: "Abduction", n: 45, bi: true },
    { id: "h_ad", m: "Adduction", n: 30, bi: true },
    { id: "h_ir", m: "Internal rotation", n: 45, bi: true },
    { id: "h_er", m: "External rotation", n: 45, bi: true },
  ],
  knee: [
    { id: "k_fl", m: "Flexion", n: 135, bi: true },
    { id: "k_ex", m: "Extension (deficit)", n: 0, bi: true, deficit: true },
  ],
  ankle: [
    { id: "a_df", m: "Dorsiflexion", n: 20, bi: true },
    { id: "a_pf", m: "Plantarflexion", n: 50, bi: true },
    { id: "a_inv", m: "Inversion", n: 35, bi: true },
    { id: "a_ev", m: "Eversion", n: 15, bi: true },
  ],
};

export const END_FEEL = ["Normal", "Firm / capsular", "Hard / bony", "Springy block", "Empty (pain stops it)", "Muscle spasm"];

export const PALP: Record<string, string[]> = {
  cervical: ["Cervical spinous processes", "Facet joints C2–C7", "Upper trapezius", "Levator scapulae", "Suboccipitals", "Scalenes", "SCM"],
  thoracic: ["Thoracic spinous processes", "Costovertebral joints", "Rhomboids", "Thoracic paraspinals"],
  lumbar: ["Lumbar spinous processes", "Lumbar paraspinals", "Quadratus lumborum", "SIJ / PSIS", "Piriformis", "Gluteus medius"],
  shoulder: ["AC joint", "Bicipital groove", "Greater tuberosity (supraspinatus)", "Infraspinatus", "Coracoid", "Deltoid"],
  elbow: ["Lateral epicondyle / common extensor origin", "Medial epicondyle", "Radial head", "Olecranon", "Cubital tunnel"],
  wrist: ["Radial styloid / 1st dorsal compartment", "Anatomical snuffbox", "Carpal tunnel", "TFCC", "Thenar eminence"],
  hip: ["Greater trochanter", "Groin / adductor origin", "Iliopsoas", "TFL", "ASIS"],
  knee: ["Medial joint line", "Lateral joint line", "Patellar facets", "Patellar tendon", "Tibial tuberosity", "Pes anserine", "Distal ITB"],
  ankle: ["ATFL", "CFL", "Achilles mid-portion", "Achilles insertion", "Medial calcaneal tubercle", "Tibialis posterior", "Navicular", "Base of 5th metatarsal", "Posterior lateral malleolus"],
};

export const TISSUE = ["Swelling", "Warmth", "Muscle spasm", "Trigger points", "Crepitus", "Thickening"];
export const OBS_ITEMS = ["Swelling", "Muscle wasting", "Bruising", "Redness", "Deformity", "Scar", "Guarded posture", "Antalgic shift"];

export const POSTURE = [
  { id: "fhp", l: "Forward head" }, { id: "rsh", l: "Rounded shoulders" }, { id: "elsh", l: "Elevated shoulder" }, { id: "wing", l: "Scapular winging" },
  { id: "kyph", l: "Increased thoracic kyphosis" }, { id: "flatT", l: "Flat thoracic spine" }, { id: "lordUp", l: "Increased lumbar lordosis" }, { id: "lordDn", l: "Flat lumbar spine" },
  { id: "scol", l: "Scoliosis / lateral shift" }, { id: "apt", l: "Anterior pelvic tilt" }, { id: "ppt", l: "Posterior pelvic tilt" }, { id: "pelob", l: "Pelvic obliquity" },
  { id: "valg", l: "Knee valgus" }, { id: "varus", l: "Knee varus" }, { id: "hyper", l: "Knee hyperextension" }, { id: "flat", l: "Flat foot / pronation" }, { id: "cavus", l: "High arch" },
];

export const GAIT = ["Normal", "Antalgic", "Trendelenburg", "Reduced arm swing", "Short step", "Reduced push-off", "Foot drop / high steppage", "Wide base", "Uses aid"];

// ── Manual muscle testing ───────────────────────────────────────────────────
export interface MuscleDef {
  id: string;
  n: string;
  b: boolean; // bilateral
}

export const STR_MUSCLES: Record<string, MuscleDef[]> = {
  cervical: [{ id: "dnf", n: "Deep Neck Flexors", b: false }, { id: "ut", n: "Upper Trapezius", b: true }, { id: "dcext", n: "Deep Cerv. Extensors", b: true }],
  thoracic: [{ id: "mt", n: "Middle Trapezius", b: true }, { id: "lt", n: "Lower Trapezius", b: true }, { id: "sa", n: "Serratus Anterior", b: true }],
  lumbar: [{ id: "tva", n: "TVA/Core", b: false }, { id: "gmax", n: "Gluteus Maximus", b: true }, { id: "gmed", n: "Gluteus Medius", b: true }, { id: "lmult", n: "L Multifidus", b: false }],
  shoulder: [{ id: "ss", n: "Supraspinatus", b: true }, { id: "is", n: "Infraspinatus/TMin", b: true }, { id: "lts", n: "Lower Trapezius", b: true }, { id: "sas", n: "Serratus Anterior", b: true }],
  elbow: [{ id: "bic", n: "Biceps", b: true }, { id: "tri", n: "Triceps", b: true }, { id: "we", n: "Wrist Extensors", b: true }, { id: "wf", n: "Wrist Flexors", b: true }],
  wrist: [{ id: "grip", n: "Grip Strength", b: true }, { id: "apb", n: "Thumb ABD (APB)", b: true }],
  hip: [{ id: "hgmax", n: "Gluteus Maximus", b: true }, { id: "hgmed", n: "Gluteus Medius", b: true }, { id: "hfl", n: "Hip Flexors", b: true }, { id: "hadd", n: "Hip Adductors", b: true }],
  knee: [{ id: "vmo", n: "VMO/Quads", b: true }, { id: "ham", n: "Hamstrings", b: true }, { id: "hip_abductor", n: "Hip Abductors", b: true }],
  ankle: [{ id: "ta", n: "Tibialis Anterior", b: true }, { id: "pflex", n: "Plantarflexors", b: true }, { id: "peron", n: "Peroneals", b: true }],
};

export const TIGHT_MUSCLES: Record<string, { id: string; n: string }[]> = {
  cervical: [{ id: "ut_t", n: "Upper Trapezius" }, { id: "lev_t", n: "Levator Scapulae" }, { id: "scm_t", n: "SCM" }, { id: "pm_t", n: "Pec Minor" }],
  thoracic: [{ id: "pmaj_t", n: "Pectoralis Major" }, { id: "lat_t", n: "Latissimus Dorsi" }],
  lumbar: [{ id: "hft", n: "Hip Flexors" }, { id: "hmt", n: "Hamstrings" }, { id: "piri", n: "Piriformis" }, { id: "ql_t", n: "Quadratus Lumborum" }],
  shoulder: [{ id: "pc_t", n: "Posterior Capsule" }, { id: "pmj_t", n: "Pec Major" }, { id: "lat_sh", n: "Latissimus Dorsi" }],
  hip: [{ id: "itb", n: "IT Band/TFL" }, { id: "rf_t", n: "Rectus Femoris" }, { id: "add_t", n: "Hip Adductors" }, { id: "piri_h", n: "Piriformis" }],
  knee: [{ id: "hk_t", n: "Hamstrings" }, { id: "gc_t", n: "Gastrocnemius" }, { id: "itb_k", n: "IT Band" }],
  ankle: [{ id: "gc_a", n: "Gastrocnemius" }, { id: "sol", n: "Soleus" }, { id: "ptib", n: "Post. Tibialis" }],
};

export const MPATS = [
  { id: "floor", n: "Floor sit to stand", d: "Sit cross-legged on the floor and get up, ideally without hands" },
  { id: "squat", n: "Deep Squat", d: "Full depth, neutral spine, heels down" },
  { id: "hinge", n: "Hip Hinge", d: "Forward bend, spine neutral, hip-driven" },
  { id: "sls", n: "Single Leg Stance", d: "10 sec balance, pelvis level" },
  { id: "overhead", n: "Overhead Reach", d: "Bilateral arms, no trunk lean or rib flare" },
  { id: "cret", n: "Cervical Retraction", d: "Chin tuck quality, head-on-neck" },
  { id: "push", n: "Push Pattern", d: "Push-up / wall push, scapular control" },
  { id: "pull", n: "Pull Pattern", d: "Row movement, scapular retraction" },
  { id: "lunge", n: "Lunge", d: "Forward lunge, hip-knee-ankle alignment" },
];

export const MOV_FAULTS = [
  "Knees drift in", "Heels lift", "Trunk leans forward", "Trunk shifts to one side", "Pelvis drops",
  "Reduced depth", "Back rounds", "Back arches", "Shoulders hike", "Loses balance", "Uneven weight",
  "Pain on the movement", "Slow or guarded",
];

// ── Neuro screen ─────────────────────────────────────────────────────────
export const NEURO_U = {
  derm: [{ id: "C5", l: "C5 lateral arm" }, { id: "C6", l: "C6 thumb" }, { id: "C7", l: "C7 middle finger" }, { id: "C8", l: "C8 little finger" }, { id: "T1", l: "T1 inner forearm" }],
  myo: [{ id: "mC5", l: "C5 shoulder abduction" }, { id: "mC6", l: "C6 elbow flexion / wrist extension" }, { id: "mC7", l: "C7 elbow extension / wrist flexion" }, { id: "mC8", l: "C8 thumb extension / finger flexion" }, { id: "mT1", l: "T1 finger abduction" }],
  ref: [{ id: "rBic", l: "Biceps (C5–6)" }, { id: "rBr", l: "Brachioradialis (C6)" }, { id: "rTri", l: "Triceps (C7)" }],
  umn: [{ id: "hoff", l: "Hoffmann's sign" }],
};

export const NEURO_L = {
  derm: [{ id: "L2", l: "L2 front of thigh" }, { id: "L3", l: "L3 inner knee" }, { id: "L4", l: "L4 inner ankle" }, { id: "L5", l: "L5 top of foot / big toe" }, { id: "S1", l: "S1 outer foot" }],
  myo: [{ id: "mL2", l: "L2 hip flexion" }, { id: "mL3", l: "L3 knee extension" }, { id: "mL4", l: "L4 ankle dorsiflexion" }, { id: "mL5", l: "L5 big toe extension" }, { id: "mS1", l: "S1 ankle plantarflexion" }],
  ref: [{ id: "rKnee", l: "Knee jerk (L3–4)" }, { id: "rAnk", l: "Ankle jerk (S1)" }],
  umn: [{ id: "babin", l: "Babinski" }, { id: "clonus", l: "Ankle clonus" }],
};

export const SENS_OPTS = [{ v: "N", l: "Normal" }, { v: "R", l: "Reduced" }, { v: "A", l: "Absent" }, { v: "H", l: "Increased" }];

// ── Body pain map (front / back view) ───────────────────────────────────────
export interface BodyZone {
  id: string;
  lb: string;
  s: "e" | "r"; // ellipse or rect
  cx?: number; cy?: number; rx?: number; ry?: number;
  x?: number; y?: number; w?: number; h?: number; r?: number;
}

export const FRONT_ZONES: BodyZone[] = [
  { id: "head", lb: "Head", s: "e", cx: 100, cy: 36, rx: 26, ry: 29 },
  { id: "neck", lb: "Neck", s: "r", x: 88, y: 66, w: 24, h: 17, r: 5 },
  { id: "l_sh", lb: "L Shoulder", s: "e", cx: 64, cy: 93, rx: 21, ry: 17 },
  { id: "r_sh", lb: "R Shoulder", s: "e", cx: 136, cy: 93, rx: 21, ry: 17 },
  { id: "chest", lb: "Chest", s: "r", x: 77, y: 82, w: 46, h: 46, r: 7 },
  { id: "l_ua", lb: "L Upper Arm", s: "r", x: 44, y: 92, w: 20, h: 44, r: 8 },
  { id: "r_ua", lb: "R Upper Arm", s: "r", x: 136, y: 92, w: 20, h: 44, r: 8 },
  { id: "l_fa", lb: "L Forearm", s: "r", x: 43, y: 139, w: 18, h: 42, r: 7 },
  { id: "r_fa", lb: "R Forearm", s: "r", x: 139, y: 139, w: 18, h: 42, r: 7 },
  { id: "l_wr", lb: "L Wrist/Hand", s: "r", x: 43, y: 184, w: 18, h: 22, r: 6 },
  { id: "r_wr", lb: "R Wrist/Hand", s: "r", x: 139, y: 184, w: 18, h: 22, r: 6 },
  { id: "abd", lb: "Abdomen", s: "r", x: 77, y: 128, w: 46, h: 44, r: 6 },
  { id: "l_hip", lb: "L Hip/Groin", s: "r", x: 72, y: 172, w: 24, h: 30, r: 7 },
  { id: "r_hip", lb: "R Hip/Groin", s: "r", x: 104, y: 172, w: 24, h: 30, r: 7 },
  { id: "l_th", lb: "L Thigh", s: "r", x: 72, y: 204, w: 24, h: 52, r: 8 },
  { id: "r_th", lb: "R Thigh", s: "r", x: 104, y: 204, w: 24, h: 52, r: 8 },
  { id: "l_kn", lb: "L Knee", s: "r", x: 72, y: 258, w: 24, h: 22, r: 7 },
  { id: "r_kn", lb: "R Knee", s: "r", x: 104, y: 258, w: 24, h: 22, r: 7 },
  { id: "l_sh2", lb: "L Shin", s: "r", x: 74, y: 283, w: 20, h: 42, r: 6 },
  { id: "r_sh2", lb: "R Shin", s: "r", x: 106, y: 283, w: 20, h: 42, r: 6 },
];

export const BACK_ZONES: BodyZone[] = [
  { id: "b_head", lb: "Back of Head", s: "e", cx: 100, cy: 36, rx: 26, ry: 29 },
  { id: "b_neck", lb: "Back of Neck", s: "r", x: 88, y: 66, w: 24, h: 17, r: 5 },
  { id: "l_shb", lb: "L Shoulder Blade", s: "e", cx: 64, cy: 93, rx: 21, ry: 17 },
  { id: "r_shb", lb: "R Shoulder Blade", s: "e", cx: 136, cy: 93, rx: 21, ry: 17 },
  { id: "l_tri", lb: "L Back of Arm", s: "r", x: 44, y: 92, w: 20, h: 44, r: 8 },
  { id: "r_tri", lb: "R Back of Arm", s: "r", x: 136, y: 92, w: 20, h: 44, r: 8 },
  { id: "l_fab", lb: "L Back of Forearm", s: "r", x: 43, y: 139, w: 18, h: 42, r: 7 },
  { id: "r_fab", lb: "R Back of Forearm", s: "r", x: 139, y: 139, w: 18, h: 42, r: 7 },
  { id: "u_bk", lb: "Upper Back", s: "r", x: 77, y: 82, w: 46, h: 24, r: 6 },
  { id: "m_bk", lb: "Mid Back", s: "r", x: 77, y: 107, w: 46, h: 22, r: 6 },
  { id: "l_bk", lb: "Lower Back", s: "r", x: 77, y: 130, w: 46, h: 22, r: 6 },
  { id: "sij", lb: "SIJ/Buttock", s: "r", x: 77, y: 153, w: 46, h: 22, r: 6 },
  { id: "l_gl", lb: "L Gluteal", s: "r", x: 72, y: 172, w: 24, h: 30, r: 7 },
  { id: "r_gl", lb: "R Gluteal", s: "r", x: 104, y: 172, w: 24, h: 30, r: 7 },
  { id: "l_hm", lb: "L Hamstring", s: "r", x: 72, y: 204, w: 24, h: 52, r: 8 },
  { id: "r_hm", lb: "R Hamstring", s: "r", x: 104, y: 204, w: 24, h: 52, r: 8 },
  { id: "l_cf", lb: "L Calf", s: "r", x: 74, y: 283, w: 20, h: 42, r: 6 },
  { id: "r_cf", lb: "R Calf", s: "r", x: 106, y: 283, w: 20, h: 42, r: 6 },
];

export const ALL_ZONES: BodyZone[] = [...FRONT_ZONES, ...BACK_ZONES];
export const ZONE_LABEL: Record<string, string> = Object.fromEntries(ALL_ZONES.map((z) => [z.id, z.lb]));

export function painColor(n: number | undefined): string {
  if (!n || n === 0) return "transparent";
  return n <= 3 ? "#F5D080" : n <= 6 ? "#E8884A" : "#C4622D";
}

export const PAIN_QUALITIES = ["Aching", "Burning", "Sharp", "Throbbing", "Shooting", "Tingling", "Numbness"];

// ── Outcome-measure region mapping ─────────────────────────────────────────
export const OUTCOME_FOR: Record<string, string> = {
  lumbar: "odi", cervical: "ndi", shoulder: "qdash", elbow: "qdash", wrist: "qdash",
  hip: "hoos", knee: "koos", ankle: "faam",
};
