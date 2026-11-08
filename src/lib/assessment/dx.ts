/**
 * src/lib/assessment/dx.ts
 *
 * Rule-based provisional diagnosis engine. Each condition carries a set of
 * weighted criteria; `runDx()` scores every condition applicable to the
 * examined regions against the assessment state and returns a 0–95% "fit"
 * with supporting / contradicting findings — entirely deterministic, no
 * LLM call. Ported from the Vyayama v9 clinical reference (dx.js +
 * data_tests2.js's additional tests/conditions).
 */

import type { AssessmentState, ConditionDef, DxCriterion, DxResult, Region } from "./types";
import { DX } from "./dxHelpers";
import { TEST_NAME } from "./regions";
import { laslett, wainner } from "./redFlags";

function C(t: string, w: number, f: DxCriterion["f"], consider?: string): DxCriterion {
  return { t, w, f, consider };
}

export const ICD11: Record<string, string> = {
  mnp: "ME84.0", crad: "8B93", cgh: "8A84", whip: "NA23.4", tos: "8B91", cmy: "",
  thor: "ME84.1", rib: "ME84.1", nslbp: "ME84.2", lrad: "8B93 / ME84.3", derang: "ME84.2",
  sten: "FA82", facet: "ME84.2", sij: "", piri: "", axspa: "FA92.0",
  rcrsp: "FB53.1 / FB53.2", rctear: "FB53.1", froz: "FB53.0", slap: "", inst: "FA34.2",
  acj: "FB53.Y", bic: "", dysk: "", lat: "FB55.1", med: "FB55.0", cub: "8C10.1",
  cts: "8C10.0", dq: "FB40.5", scaph: "NC53.0", tfcc: "", hoa: "FA00", fai: "FA34.5",
  gtps: "", pfp: "FA32.1", acl: "NC93.6", men: "NC93.3", koa: "FA01", ptend: "",
  itbs: "FB54.1", mcl: "NC93.5", pes: "", las: "ND14.7", cai: "FA34.2", ottawa: "",
  achT: "", achR: "NC96.0", php: "FB40.1", ptt: "FB40.2", noci: "MG30.0",
  pcl: "NC93.6", synd: "ND14.7", cmcOA: "", tarsal: "", lumbInst: "", spondy: "",
  bicRup: "", ucl: "", slInst: "", patinst: "NC93.1",
};

export const ICF_CAT: Record<string, string> = {
  mnp: "Neck pain with mobility deficits", cgh: "Neck pain with headache",
  crad: "Neck pain with radiating pain", tos: "Neck pain with radiating pain",
  whip: "Neck pain with movement coordination impairments",
  nslbp: "Low back pain with mobility deficits", facet: "Low back pain with mobility deficits",
  derang: "Low back pain with related lower-limb pain", lrad: "Low back pain with radiating pain",
  sten: "Low back pain with radiating pain", sij: "Low back pain with movement coordination impairments",
  noci: "Pain with related cognitive or affective tendencies",
  froz: "Shoulder pain and mobility deficits", rcrsp: "Shoulder pain and muscle power deficits",
  pfp: "Knee pain: patellofemoral", acl: "Knee stability and movement coordination impairments",
  mcl: "Knee stability and movement coordination impairments",
  men: "Knee pain and mobility impairments: meniscal", koa: "Knee pain and mobility deficits: OA",
  hoa: "Hip pain and mobility deficits: OA", las: "Ankle stability and movement coordination impairments",
  cai: "Ankle stability and movement coordination impairments",
  php: "Heel pain: plantar fasciitis", achT: "Achilles pain, stiffness and muscle power deficits",
};

export const CONDITIONS: ConditionDef[] = [
  // ── Cervical ────────────────────────────────────────────────────────────
  { id: "mnp", r: "cervical", n: "Mechanical neck pain", icd: "M54.2", c: [
    C("Worse with screen work or sustained posture", 2, (A) => Number(DX.agg(A, "Screen work") || DX.agg(A, "Sitting"))),
    C("No arm symptoms", 2, (A) => DX.no(A, "cq_arm")),
    C("Cervical ROM reduced or painful", 2, (A) => Math.max(DX.rom(A, "c_rot"), DX.rom(A, "c_ex"))),
    C("Facets or upper trapezius tender", 2, (A) => Math.max(DX.palp(A, "Facet joints C2–C7"), DX.palp(A, "Upper trapezius"))),
    C("Neuro screen normal", 2, (A) => -DX.neuroDef(A, "U")),
    C("Spurling's negative", 1, (A) => DX.testNeg(A, "spurling"), "spurling"),
    C("Forward head posture", 1, (A) => DX.posture(A, "fhp")),
    C("Deep neck flexor endurance low", 1, (A) => DX.test(A, "cfet"), "cfet"),
  ] },
  { id: "crad", r: "cervical", n: "Cervical radiculopathy", icd: "M54.1", c: [
    C("Arm pain, tingling or numbness", 3, (A) => DX.yes(A, "cq_arm")),
    C("Spurling's positive", 3, (A) => DX.test(A, "spurling"), "spurling"),
    C("Distraction eases arm symptoms", 2, (A) => DX.test(A, "distraction"), "distraction"),
    C("ULTT-1 positive", 2, (A) => DX.test(A, "ultt1"), "ultt1"),
    C("Dermatome, myotome or reflex change", 3, (A) => DX.neuroDef(A, "U")),
    C("Rotation reduced (under 60°)", 1, (A) => DX.rom(A, "c_rot", 0.75)),
    C("Wainner cluster: 3 or more of 4 positive", 3, (A) => { const w = wainner(A); return !w || w.tested < 3 ? 0 : w.pos >= 3 ? 1 : -1; }),
    C("Tingling or numbness described", 1, (A) => Math.max(DX.ptype(A, "Tingling"), DX.ptype(A, "Numbness"))),
    C("Shoulder abduction relief", 1, (A) => DX.test(A, "bakody"), "bakody"),
  ] },
  { id: "cgh", r: "cervical", n: "Cervicogenic headache", icd: "G44.8", c: [
    C("Headache starting from the neck", 3, (A) => DX.yes(A, "cq_ha")),
    C("Flexion-rotation test positive", 3, (A) => DX.test(A, "flexRot"), "flexRot"),
    C("Suboccipitals tender", 2, (A) => DX.palp(A, "Suboccipitals")),
    C("Deep neck flexors weak or low endurance", 2, (A) => Math.max(DX.str(A, "dnf"), DX.func(A, "dnf"))),
    C("Head pain marked on body map", 1, (A) => Math.max(DX.zone(A, "head"), DX.zone(A, "b_head"))),
    C("Deep neck flexor endurance low", 1, (A) => DX.test(A, "cfet"), "cfet"),
  ] },
  { id: "whip", r: "cervical", n: "Whiplash-associated disorder", icd: "S13.4", c: [
    C("Started after a car jolt", 4, (A) => DX.yes(A, "cq_whip")),
    C("Sudden onset with injury", 2, (A) => DX.trauma(A)),
    C("Cervical ROM reduced", 2, (A) => DX.rom(A, "c_rot")),
    C("Neck muscles tender", 1, (A) => DX.palp(A, "Upper trapezius")),
  ] },
  { id: "tos", r: "cervical", n: "Thoracic outlet syndrome", icd: "G54.0", c: [
    C("Arm symptoms worse overhead", 3, (A) => DX.yes(A, "cq_overhead")),
    C("Arm tingling or numbness", 2, (A) => DX.yes(A, "cq_arm")),
    C("Scalenes tender", 2, (A) => DX.palp(A, "Scalenes")),
    C("Pec minor tight / rounded shoulders", 1, (A) => Math.max(DX.tight(A, "pm_t"), DX.posture(A, "rsh"))),
    C("Spurling's negative", 1, (A) => DX.testNeg(A, "spurling"), "spurling"),
    C("Roos test positive", 3, (A) => DX.test(A, "roos"), "roos"),
  ] },
  { id: "cmy", r: "cervical", n: "Cervical myelopathy", icd: "M47.1 / M50.0", refer: "Urgent spinal / neurology opinion", c: [
    C("Clumsy hands or unsteady walking", 4, (A) => DX.yes(A, "cq_clumsy")),
    C("Upper motor neuron signs (Hoffmann, Babinski, clonus, brisk reflexes)", 4, (A) => DX.umn(A)),
    C("Age 50 or over", 1, (A) => DX.ageOver(A, 50)),
    C("Arm or hand numbness", 1, (A) => DX.ptype(A, "Numbness")),
    C("Lhermitte's sign", 3, (A) => DX.test(A, "lhermitte"), "lhermitte"),
  ] },

  // ── Thoracic ────────────────────────────────────────────────────────────
  { id: "thor", r: "thoracic", n: "Thoracic segmental dysfunction", icd: "M54.6", c: [
    C("Segmental stiffness or pain on PA glides", 3, (A) => DX.test(A, "tPA"), "tPA"),
    C("Thoracic rotation reduced", 2, (A) => Math.max(DX.rom(A, "t_rot"), DX.test(A, "thorRot")), "thorRot"),
    C("Worse after long sitting", 2, (A) => DX.yes(A, "tq_sit")),
    C("Increased kyphosis", 1, (A) => DX.posture(A, "kyph")),
    C("Pain not constant or night-dominant", 2, (A) => DX.no(A, "tq_night")),
  ] },
  { id: "rib", r: "thoracic", n: "Costovertebral / rib joint irritation", icd: "M54.6", c: [
    C("Pain with deep breath", 3, (A) => DX.yes(A, "tq_breath")),
    C("Sharp on twisting", 2, (A) => DX.yes(A, "tq_twist")),
    C("Costovertebral joints tender", 3, (A) => DX.palp(A, "Costovertebral joints")),
    C("Rib spring test positive", 3, (A) => DX.test(A, "ribSpring"), "ribSpring"),
  ] },

  // ── Lumbar ──────────────────────────────────────────────────────────────
  { id: "nslbp", r: "lumbar", n: "Non-specific mechanical low back pain", icd: "M54.5", c: [
    C("No leg pain below the knee", 2, (A) => DX.no(A, "lq_belowknee")),
    C("Neuro screen normal", 2, (A) => -DX.neuroDef(A, "L")),
    C("SLR negative", 1, (A) => DX.testNeg(A, "slr"), "slr"),
    C("Pain changes with movement and position", 2, (A) => Math.max(DX.ease(A, "Changing position"), DX.ease(A, "Movement"))),
    C("Lumbar paraspinals tender", 1, (A) => DX.palp(A, "Lumbar paraspinals")),
    C("Lower back marked on body map", 1, (A) => DX.zone(A, "l_bk")),
  ] },
  { id: "lrad", r: "lumbar", n: "Lumbar radiculopathy", icd: "M54.1 / M51.1", c: [
    C("Leg pain below the knee", 3, (A) => DX.yes(A, "lq_belowknee")),
    C("Tingling or numbness in leg or foot", 2, (A) => DX.yes(A, "lq_tingle")),
    C("Cough or sneeze sends pain down the leg", 1, (A) => DX.yes(A, "lq_cough")),
    C("SLR positive", 3, (A) => DX.test(A, "slr"), "slr"),
    C("Slump positive", 2, (A) => DX.test(A, "slump"), "slump"),
    C("Dermatome, myotome or reflex change", 3, (A) => DX.neuroDef(A, "L")),
    C("Leg feels weak / foot catches", 1, (A) => DX.yes(A, "lq_weak")),
    C("Crossed SLR positive", 3, (A) => DX.test(A, "xslr"), "xslr"),
    C("Prone knee bend positive (upper lumbar)", 2, (A) => DX.test(A, "pkb"), "pkb"),
  ] },
  { id: "derang", r: "lumbar", n: "Derangement-type LBP with directional preference", icd: "M54.5", c: [
    C("Symptoms centralise with repeated movement", 4, (A) => Math.max(DX.mdt(A, "cent"), DX.test(A, "mdt")), "mdt"),
    C("Worse sitting", 2, (A) => DX.yes(A, "lq_sit")),
    C("Flexion reduced", 1, (A) => DX.rom(A, "l_fl")),
    C("Lateral shift seen", 1, (A) => DX.posture(A, "scol")),
  ] },
  { id: "sten", r: "lumbar", n: "Lumbar spinal stenosis", icd: "M48.0", c: [
    C("Legs heavy or painful with walking, eased by sitting or bending", 4, (A) => DX.yes(A, "lq_walk")),
    C("Age 60 or over", 2, (A) => DX.ageOver(A, 60)),
    C("Symptoms in both legs", 2, (A) => DX.yes(A, "lq_both")),
    C("Worse leaning back", 1, (A) => DX.yes(A, "lq_ext")),
    C("Extension reduced or painful", 1, (A) => Math.max(DX.rom(A, "l_ex"), DX.romPainful(A, "l_ex"))),
  ] },
  { id: "facet", r: "lumbar", n: "Facet-related low back pain", icd: "M47.8", c: [
    C("Kemp's positive (local back pain)", 3, (A) => DX.test(A, "kemp"), "kemp"),
    C("Worse leaning back or twisting", 2, (A) => DX.yes(A, "lq_ext")),
    C("No leg pain below the knee", 2, (A) => DX.no(A, "lq_belowknee")),
    C("Extension painful", 1, (A) => DX.romPainful(A, "l_ex")),
    C("Age 40 or over", 1, (A) => DX.ageOver(A, 40)),
  ] },
  { id: "sij", r: "lumbar", n: "Sacroiliac joint pain", icd: "M53.3", c: [
    C("Pain over SIJ / buttock", 2, (A) => Math.max(DX.zone(A, "sij"), DX.zone(A, "l_gl"), DX.zone(A, "r_gl"), DX.palp(A, "SIJ / PSIS"))),
    C("Laslett provocation cluster positive", 4, (A) => { const l = laslett(A); return !l ? 0 : l.positive ? 1 : -1; }, "thighThrust"),
    C("FABER reproduces posterior pain", 1, (A) => DX.test(A, "faber"), "faber"),
    C("SIJ / PSIS tender", 2, (A) => DX.palp(A, "SIJ / PSIS")),
    C("No centralisation", 1, (A) => -DX.mdt(A, "cent")),
    C("Neuro screen normal", 1, (A) => -DX.neuroDef(A, "L")),
  ] },
  { id: "piri", r: "lumbar", n: "Deep gluteal / piriformis syndrome", icd: "G57.0", c: [
    C("Deep buttock pain sitting on hard seats", 3, (A) => DX.yes(A, "lq_buttsit")),
    C("Piriformis tender", 3, (A) => DX.palp(A, "Piriformis")),
    C("Piriformis tight", 1, (A) => Math.max(DX.tight(A, "piri"), DX.tight(A, "piri_h"))),
    C("Lumbar neuro screen normal", 1, (A) => -DX.neuroDef(A, "L")),
  ] },
  { id: "axspa", r: "lumbar", n: "Inflammatory back pain features", icd: "M45 / M46.1", refer: "Rheumatology opinion and blood tests", c: [
    C("Morning stiffness over 30 minutes", 3, (A) => Math.max(DX.yes(A, "lq_am"), DX.pattern(A, "Morning stiffness over 30 min"))),
    C("Better with movement, worse with rest", 3, (A) => DX.yes(A, "lq_movebetter")),
    C("Age under 45", 1, (A) => DX.ageUnder(A, 45)),
    C("Wakes at night", 1, (A) => DX.pattern(A, "Wakes at night when turning")),
    C("Long-standing", 1, (A) => DX.chronic(A)),
    C("Reduced chest expansion", 2, (A) => DX.test(A, "chestExp"), "chestExp"),
    C("Reduced Schober's", 2, (A) => DX.test(A, "schober"), "schober"),
  ] },
  { id: "lumbInst", r: "lumbar", n: "Lumbar instability (movement control impairment)", icd: "M53.2", c: [
    C("Prone instability test positive", 3, (A) => DX.test(A, "pli"), "pli"),
    C("Passive lumbar extension test positive", 4, (A) => DX.test(A, "pleT"), "pleT"),
    C("Age under 40", 1, (A) => DX.ageUnder(A, 40)),
    C("Recurrent episodes", 1, (A) => (A.C.onset === "Keeps coming back" ? 1 : 0)),
  ] },
  { id: "spondy", r: "lumbar", n: "Possible pars stress injury (spondylolysis)", icd: "M43.0", refer: "Discuss imaging with a sports or orthopaedic doctor", c: [
    C("Stork test positive", 2, (A) => DX.test(A, "stork"), "stork"),
    C("Age under 25", 2, (A) => DX.ageUnder(A, 25)),
    C("Worse leaning back", 1, (A) => DX.yes(A, "lq_ext")),
  ] },

  // ── Shoulder ────────────────────────────────────────────────────────────
  { id: "rcrsp", r: "shoulder", n: "Rotator cuff related shoulder pain", icd: "M75.1 / M75.4", c: [
    C("Painful arc", 2, (A) => DX.test(A, "painfulArc"), "painfulArc"),
    C("Hawkins-Kennedy positive", 2, (A) => DX.test(A, "hawkins"), "hawkins"),
    C("Empty can painful", 2, (A) => DX.test(A, "emptyCan"), "emptyCan"),
    C("Night pain lying on it", 1, (A) => DX.yes(A, "sq_night")),
    C("Difficulty overhead", 1, (A) => DX.yes(A, "sq_over")),
    C("Passive ER preserved", 2, (A) => { const d = A.rom.s_er || {}; const v = [d.pr, d.pl].filter((x) => x !== "" && x != null).map(Number); if (!v.length) return 0; return v.every((x) => x >= 60) ? 1 : -1; }),
    C("Neer's sign positive", 1, (A) => DX.test(A, "neer"), "neer"),
  ] },
  { id: "rctear", r: "shoulder", n: "Rotator cuff tear", icd: "M75.1", c: [
    C("Drop arm positive", 3, (A) => DX.test(A, "dropArm"), "dropArm"),
    C("Supraspinatus / infraspinatus weak (3/5 or less)", 3, (A) => Math.max(DX.str(A, "ss"), DX.str(A, "is"))),
    C("Sudden weakness after fall or lift", 2, (A) => DX.yes(A, "sq_weak")),
    C("Age 60 or over", 1, (A) => DX.ageOver(A, 60)),
    C("External rotation lag sign", 3, (A) => DX.test(A, "erLag"), "erLag"),
    C("Belly press / lift-off positive", 2, (A) => DX.test(A, "bellyPress"), "bellyPress"),
  ] },
  { id: "froz", r: "shoulder", n: "Frozen shoulder (adhesive capsulitis)", icd: "M75.0", c: [
    C("Stiffness steadily worsening", 3, (A) => DX.yes(A, "sq_stiff")),
    C("External rotation reduced (active and passive)", 3, (A) => DX.rom(A, "s_er", 0.6)),
    C("Difficulty behind the back", 1, (A) => DX.yes(A, "sq_behind")),
    C("Firm / capsular end-feel", 1, (A) => ((A.rom.s_er || {}).ef === "Firm / capsular" ? 1 : 0)),
    C("Age 40 to 65", 1, (A) => { const a = parseInt(A.P.age || "", 10); if (isNaN(a)) return 0; return a >= 40 && a <= 65 ? 1 : -1; }),
    C("Diabetes or thyroid history", 1, (A) => Math.max(DX.pmh(A, "Diabetes"), DX.pmh(A, "Thyroid"))),
  ] },
  { id: "slap", r: "shoulder", n: "Labral (SLAP) lesion", icd: "S43.4", c: [
    C("O'Brien's positive", 3, (A) => DX.test(A, "obrien"), "obrien"),
    C("Clicking or catching inside", 2, (A) => DX.yes(A, "sq_click")),
    C("Age under 40", 1, (A) => DX.ageUnder(A, 40)),
  ] },
  { id: "inst", r: "shoulder", n: "Glenohumeral instability", icd: "M24.4", c: [
    C("Feels loose or has slipped out", 4, (A) => DX.yes(A, "sq_unstable")),
    C("Age under 30", 1, (A) => DX.ageUnder(A, 30)),
    C("Clicking or catching", 1, (A) => DX.yes(A, "sq_click")),
    C("Apprehension relieved by relocation", 4, (A) => DX.test(A, "apprehension"), "apprehension"),
    C("Sulcus sign", 2, (A) => DX.test(A, "sulcus"), "sulcus"),
  ] },
  { id: "acj", r: "shoulder", n: "AC joint pain", icd: "M75.8", c: [
    C("Pain on top of the shoulder", 2, (A) => DX.yes(A, "sq_top")),
    C("AC joint tender", 3, (A) => DX.palp(A, "AC joint")),
    C("O'Brien's positive", 1, (A) => DX.test(A, "obrien"), "obrien"),
    C("Cross-body adduction positive", 3, (A) => DX.test(A, "crossAdd"), "crossAdd"),
  ] },
  { id: "bic", r: "shoulder", n: "Long head of biceps tendinopathy", icd: "M75.2", c: [
    C("Front pain lifting palm up", 2, (A) => DX.yes(A, "sq_front")),
    C("Bicipital groove tender", 3, (A) => DX.palp(A, "Bicipital groove")),
    C("Speed's positive", 2, (A) => DX.test(A, "speed"), "speed"),
    C("Yergason's positive", 2, (A) => DX.test(A, "yergason"), "yergason"),
  ] },
  { id: "dysk", r: "shoulder", n: "Scapular dyskinesis (contributing factor)", icd: "—", c: [
    C("Serratus or lower trapezius weak", 2, (A) => Math.max(DX.str(A, "sas"), DX.str(A, "lts"), DX.str(A, "sa"), DX.str(A, "lt"))),
    C("Push or overhead pattern poor", 2, (A) => Math.max(DX.mov(A, "push"), DX.mov(A, "overhead"))),
    C("Scapular winging", 2, (A) => DX.posture(A, "wing")),
  ] },

  // ── Elbow ───────────────────────────────────────────────────────────────
  { id: "lat", r: "elbow", n: "Lateral elbow tendinopathy", icd: "M77.1", c: [
    C("Cozen's positive", 3, (A) => DX.test(A, "cozen"), "cozen"),
    C("Lateral epicondyle tender", 3, (A) => DX.palp(A, "Lateral epicondyle / common extensor origin")),
    C("Pain gripping palm down", 2, (A) => DX.yes(A, "eq_grip")),
    C("Grip weaker on painful side", 1, (A) => Math.max(DX.str(A, "grip"), DX.str(A, "we"))),
    C("Mill's test positive", 2, (A) => DX.test(A, "mills"), "mills"),
    C("Maudsley's test positive", 1, (A) => DX.test(A, "maudsley"), "maudsley"),
  ] },
  { id: "med", r: "elbow", n: "Medial elbow tendinopathy", icd: "M77.0", c: [
    C("Medial epicondyle test positive", 3, (A) => DX.test(A, "medEpi"), "medEpi"),
    C("Medial epicondyle tender", 3, (A) => DX.palp(A, "Medial epicondyle")),
    C("Inner elbow pain with gripping", 2, (A) => DX.yes(A, "eq_med")),
  ] },
  { id: "cub", r: "elbow", n: "Cubital tunnel syndrome", icd: "G56.2", c: [
    C("Ring and little finger tingling", 3, (A) => DX.yes(A, "eq_ulnar")),
    C("Elbow flexion test positive", 3, (A) => DX.test(A, "elbowFlex"), "elbowFlex"),
    C("Cubital tunnel tender", 1, (A) => DX.palp(A, "Cubital tunnel")),
    C("Froment's sign", 2, (A) => DX.test(A, "froment"), "froment"),
    C("Tinel's at cubital tunnel", 2, (A) => DX.test(A, "tinelCub"), "tinelCub"),
  ] },
  { id: "bicRup", r: "elbow", n: "Possible distal biceps rupture", icd: "—", refer: "Urgent orthopaedic opinion (within 2 weeks)", c: [
    C("Hook test positive", 5, (A) => DX.test(A, "hook"), "hook"),
    C("Injury onset", 1, (A) => DX.trauma(A)),
  ] },
  { id: "ucl", r: "elbow", n: "Medial (UCL) elbow injury", icd: "S53.4", c: [
    C("Moving valgus stress positive", 4, (A) => DX.test(A, "movValgus"), "movValgus"),
    C("Inner elbow pain with gripping or throwing", 1, (A) => DX.yes(A, "eq_med")),
  ] },

  // ── Wrist ───────────────────────────────────────────────────────────────
  { id: "cts", r: "wrist", n: "Carpal tunnel syndrome", icd: "G56.0", c: [
    C("Night tingling in thumb, index, middle", 3, (A) => DX.yes(A, "wq_night")),
    C("Shaking the hand relieves it", 2, (A) => DX.yes(A, "wq_shake")),
    C("Phalen's positive", 2, (A) => DX.test(A, "phalens"), "phalens"),
    C("Thumb abduction weak", 2, (A) => DX.str(A, "apb")),
    C("C6/C7 dermatome change", 1, (A) => { const v = A.neuro.vals; const x = [(v.C6 || {}).r, (v.C6 || {}).l, (v.C7 || {}).r, (v.C7 || {}).l].filter(Boolean); return !x.length ? 0 : x.some((s) => s === "R" || s === "A") ? 1 : -1; }),
    C("Tinel's at carpal tunnel", 2, (A) => DX.test(A, "tinelCarp"), "tinelCarp"),
    C("Carpal compression positive", 2, (A) => DX.test(A, "durkan"), "durkan"),
  ] },
  { id: "dq", r: "wrist", n: "De Quervain's tenosynovitis", icd: "M65.4", c: [
    C("Finkelstein's positive", 3, (A) => DX.test(A, "finkelstein"), "finkelstein"),
    C("Radial styloid tender", 3, (A) => DX.palp(A, "Radial styloid / 1st dorsal compartment")),
    C("Pain lifting a baby or bag", 2, (A) => DX.yes(A, "wq_thumb")),
  ] },
  { id: "scaph", r: "wrist", n: "Possible scaphoid fracture", icd: "S62.0", refer: "X-ray before loading", c: [
    C("Fell on outstretched hand", 3, (A) => DX.yes(A, "wq_foosh")),
    C("Anatomical snuffbox tender", 4, (A) => DX.palp(A, "Anatomical snuffbox")),
    C("Recent injury", 1, (A) => DX.trauma(A)),
  ] },
  { id: "tfcc", r: "wrist", n: "TFCC / ulnar-sided wrist pain", icd: "S63.5", c: [
    C("Little-finger side pain on twisting", 3, (A) => DX.yes(A, "wq_ulnarside")),
    C("TFCC tender", 3, (A) => DX.palp(A, "TFCC")),
    C("Ulnar fovea sign", 3, (A) => DX.test(A, "fovea"), "fovea"),
  ] },
  { id: "slInst", r: "wrist", n: "Scapholunate instability", icd: "S63.3", refer: "Hand surgeon opinion if clunk with pain", c: [
    C("Watson scaphoid shift positive", 4, (A) => DX.test(A, "watson"), "watson"),
    C("Fell on outstretched hand", 1, (A) => DX.yes(A, "wq_foosh")),
  ] },
  { id: "cmcOA", r: "wrist", n: "Thumb base osteoarthritis", icd: "M18", c: [
    C("Age 50 or over", 1, (A) => DX.ageOver(A, 50)),
  ] },

  // ── Hip ─────────────────────────────────────────────────────────────────
  { id: "hoa", r: "hip", n: "Hip osteoarthritis", icd: "M16", c: [
    C("Age 50 or over", 2, (A) => DX.ageOver(A, 50)),
    C("Internal rotation reduced", 3, (A) => DX.rom(A, "h_ir", 0.6)),
    C("Flexion reduced", 1, (A) => DX.rom(A, "h_fl")),
    C("Morning stiffness under an hour", 1, (A) => DX.yes(A, "hq_am")),
    C("Groin pain", 2, (A) => DX.yes(A, "hq_groin")),
    C("Difficulty with socks and shoes", 1, (A) => DX.yes(A, "hq_shoes")),
    C("Hip scour positive", 2, (A) => DX.test(A, "scour"), "scour"),
  ] },
  { id: "fai", r: "hip", n: "Femoroacetabular impingement / labral", icd: "M25.8", c: [
    C("FADIR positive", 2, (A) => DX.test(A, "fadir"), "fadir"),
    C("Groin pain", 2, (A) => DX.yes(A, "hq_groin")),
    C("Clicking or catching", 2, (A) => DX.yes(A, "hq_click")),
    C("Pain in low chairs or cross-legged", 1, (A) => DX.yes(A, "hq_low")),
    C("Age under 45", 1, (A) => DX.ageUnder(A, 45)),
    C("Log roll or Stinchfield positive", 1, (A) => Math.max(DX.test(A, "logRoll"), DX.test(A, "stinch")), "logRoll"),
  ] },
  { id: "gtps", r: "hip", n: "Gluteal tendinopathy (lateral hip pain)", icd: "M76.0 / M70.6", c: [
    C("Pain lying on that side", 2, (A) => DX.yes(A, "hq_side")),
    C("Greater trochanter tender", 3, (A) => DX.palp(A, "Greater trochanter")),
    C("Trendelenburg positive", 1, (A) => DX.test(A, "trend"), "trend"),
    C("Gluteus medius weak", 2, (A) => Math.max(DX.str(A, "hgmed"), DX.str(A, "gmed"))),
    C("Single-leg stance reduced", 1, (A) => DX.func(A, "sls")),
    C("Resisted external derotation positive", 3, (A) => DX.test(A, "derot"), "derot"),
    C("Single-leg stance 30 s provokes pain", 3, (A) => DX.test(A, "sls30"), "sls30"),
  ] },

  // ── Knee ────────────────────────────────────────────────────────────────
  { id: "pfp", r: "knee", n: "Patellofemoral pain", icd: "M22.2", c: [
    C("Pain on stairs, squatting or long sitting", 3, (A) => DX.yes(A, "kq_stairs")),
    C("Patellar facets tender", 2, (A) => DX.palp(A, "Patellar facets")),
    C("Step-down or single-leg squat poor", 2, (A) => Math.max(DX.func(A, "step"), DX.func(A, "slsq"))),
    C("Hip abductors / quads weak", 1, (A) => Math.max(DX.str(A, "hip_abductor"), DX.str(A, "vmo"))),
    C("Age under 40", 1, (A) => DX.ageUnder(A, 40)),
    C("No locking or giving way", 1, (A) => DX.no(A, "kq_lock")),
  ] },
  { id: "acl", r: "knee", n: "ACL injury", icd: "S83.5", refer: "Orthopaedic opinion if instability persists", c: [
    C("Lachman positive", 4, (A) => DX.test(A, "lachman"), "lachman"),
    C("Pop at injury", 2, (A) => DX.yes(A, "kq_pop")),
    C("Swelled within 2 hours", 2, (A) => DX.yes(A, "kq_swell")),
    C("Gives way", 2, (A) => DX.yes(A, "kq_give")),
    C("Pivot shift positive", 4, (A) => DX.test(A, "pivot"), "pivot"),
    C("Anterior drawer positive", 2, (A) => DX.test(A, "antDrawK"), "antDrawK"),
  ] },
  { id: "pcl", r: "knee", n: "PCL injury", icd: "S83.5", refer: "Orthopaedic opinion", c: [
    C("Posterior drawer positive", 4, (A) => DX.test(A, "postDraw"), "postDraw"),
    C("Posterior sag sign", 3, (A) => DX.test(A, "sag"), "sag"),
    C("Injury onset", 1, (A) => DX.trauma(A)),
  ] },
  { id: "men", r: "knee", n: "Meniscal injury", icd: "S83.2 / M23.2", c: [
    C("Locking or catching", 2, (A) => DX.yes(A, "kq_lock")),
    C("Joint line tender", 2, (A) => Math.max(DX.palp(A, "Medial joint line"), DX.palp(A, "Lateral joint line"))),
    C("Thessaly positive", 3, (A) => DX.test(A, "thessaly"), "thessaly"),
    C("McMurray's positive", 2, (A) => DX.test(A, "mcmurray"), "mcmurray"),
    C("Flexion reduced", 1, (A) => DX.rom(A, "k_fl")),
    C("Joint line tenderness", 2, (A) => DX.test(A, "jlt"), "jlt"),
  ] },
  { id: "koa", r: "knee", n: "Knee osteoarthritis", icd: "M17", c: [
    C("Age 50 or over", 3, (A) => DX.ageOver(A, 50)),
    C("Morning stiffness under 30 minutes", 2, (A) => DX.yes(A, "kq_am")),
    C("Crepitus", 1, (A) => (A.tissue?.Crepitus ? 1 : 0)),
    C("Difficulty squatting or sitting on the floor", 1, (A) => DX.yes(A, "kq_floor")),
    C("Flexion reduced", 1, (A) => DX.rom(A, "k_fl", 0.85)),
    C("Joint line tender", 1, (A) => Math.max(DX.palp(A, "Medial joint line"), DX.palp(A, "Lateral joint line"))),
  ] },
  { id: "ptend", r: "knee", n: "Patellar tendinopathy", icd: "M76.5", c: [
    C("Pain below kneecap with jumping", 3, (A) => DX.yes(A, "kq_jump")),
    C("Patellar tendon tender", 3, (A) => DX.palp(A, "Patellar tendon")),
  ] },
  { id: "itbs", r: "knee", n: "Iliotibial band syndrome", icd: "M76.3", c: [
    C("Outer knee pain running", 3, (A) => DX.yes(A, "kq_lat")),
    C("Distal ITB tender", 3, (A) => DX.palp(A, "Distal ITB")),
    C("ITB / TFL tight", 1, (A) => Math.max(DX.tight(A, "itb"), DX.tight(A, "itb_k"))),
    C("Hip abductors weak", 1, (A) => Math.max(DX.str(A, "hip_abductor"), DX.str(A, "hgmed"))),
    C("Ober's test (tight ITB)", 1, (A) => DX.test(A, "ober"), "ober"),
    C("Noble compression positive", 3, (A) => DX.test(A, "noble"), "noble"),
  ] },
  { id: "mcl", r: "knee", n: "MCL sprain", icd: "S83.4", c: [
    C("Valgus stress positive", 4, (A) => DX.test(A, "valgus"), "valgus"),
    C("Medial joint line / MCL tender", 2, (A) => DX.palp(A, "Medial joint line")),
    C("Injury onset", 1, (A) => DX.trauma(A)),
  ] },
  { id: "pes", r: "knee", n: "Pes anserine pain", icd: "M70.5", c: [
    C("Pes anserine tender", 4, (A) => DX.palp(A, "Pes anserine")),
    C("Hamstrings tight", 1, (A) => DX.tight(A, "hk_t")),
  ] },
  { id: "patinst", r: "knee", n: "Patellar instability", icd: "M22.0 / M22.1", c: [
    C("Patellar apprehension positive", 4, (A) => DX.test(A, "patApp"), "patApp"),
    C("Knee gives way", 1, (A) => DX.yes(A, "kq_give")),
    C("Age under 30", 1, (A) => DX.ageUnder(A, 30)),
  ] },

  // ── Ankle ───────────────────────────────────────────────────────────────
  { id: "las", r: "ankle", n: "Lateral ankle sprain", icd: "S93.4", c: [
    C("Rolled the ankle", 3, (A) => DX.yes(A, "aq_roll")),
    C("ATFL tender", 3, (A) => DX.palp(A, "ATFL")),
    C("Anterior drawer positive", 2, (A) => DX.test(A, "antDraw"), "antDraw"),
    C("Recent injury", 1, (A) => DX.trauma(A)),
    C("Talar tilt positive", 2, (A) => DX.test(A, "talarTilt"), "talarTilt"),
  ] },
  { id: "cai", r: "ankle", n: "Chronic ankle instability", icd: "M24.2", c: [
    C("Repeated sprains or giving way", 4, (A) => DX.yes(A, "aq_recur")),
    C("Single-leg balance reduced", 2, (A) => DX.func(A, "sls")),
    C("Peroneals weak", 1, (A) => DX.str(A, "peron")),
    C("Anterior drawer positive", 1, (A) => DX.test(A, "antDraw"), "antDraw"),
    C("Talar tilt positive", 1, (A) => DX.test(A, "talarTilt"), "talarTilt"),
  ] },
  { id: "ottawa", r: "ankle", n: "Possible ankle / foot fracture (Ottawa rules)", icd: "S82 / S92", refer: "X-ray before loading", c: [
    C("Could not take 4 steps after injury", 4, (A) => DX.yes(A, "aq_wb")),
    C("Bone tenderness: posterior malleolus, navicular or 5th metatarsal", 4, (A) => Math.max(DX.palp(A, "Posterior lateral malleolus"), DX.palp(A, "Navicular"), DX.palp(A, "Base of 5th metatarsal"))),
  ] },
  { id: "achT", r: "ankle", n: "Achilles tendinopathy", icd: "M76.6", c: [
    C("Achilles stiff in the morning or after running", 3, (A) => DX.yes(A, "aq_achAM")),
    C("Achilles tender (mid-portion or insertion)", 3, (A) => Math.max(DX.palp(A, "Achilles mid-portion"), DX.palp(A, "Achilles insertion"))),
    C("Single-leg heel raises reduced", 2, (A) => DX.func(A, "heel")),
    C("Calf tight", 1, (A) => Math.max(DX.tight(A, "gc_a"), DX.tight(A, "sol"))),
    C("Royal London Hospital test positive", 3, (A) => DX.test(A, "rlh"), "rlh"),
  ] },
  { id: "achR", r: "ankle", n: "Achilles rupture", icd: "S86.0", refer: "Same-day orthopaedic referral", c: [
    C("Felt kicked in the calf", 3, (A) => DX.yes(A, "aq_kick")),
    C("Thompson test positive", 5, (A) => DX.test(A, "thompson"), "thompson"),
  ] },
  { id: "php", r: "ankle", n: "Plantar heel pain (plantar fasciopathy)", icd: "M72.2", c: [
    C("First-step heel pain in the morning", 3, (A) => DX.yes(A, "aq_first")),
    C("Medial calcaneal tubercle tender", 3, (A) => DX.palp(A, "Medial calcaneal tubercle")),
    C("Windlass positive", 2, (A) => DX.test(A, "windlass"), "windlass"),
    C("Ankle dorsiflexion limited", 1, (A) => Math.max(DX.func(A, "ktw"), DX.rom(A, "a_df"))),
    C("Gastrocnemius tightness (Silfverskiöld)", 1, (A) => DX.test(A, "silf"), "silf"),
  ] },
  { id: "ptt", r: "ankle", n: "Tibialis posterior tendon dysfunction", icd: "M76.8", c: [
    C("Inner ankle pain with arch dropping", 3, (A) => DX.yes(A, "aq_arch")),
    C("Tibialis posterior tender", 3, (A) => DX.palp(A, "Tibialis posterior")),
    C("Flat foot / pronation", 1, (A) => DX.posture(A, "flat")),
    C("Single-leg heel raise reduced", 2, (A) => DX.func(A, "heel")),
  ] },
  { id: "synd", r: "ankle", n: "High ankle (syndesmosis) sprain", icd: "S93.4", c: [
    C("Squeeze test positive", 3, (A) => DX.test(A, "squeeze"), "squeeze"),
    C("External rotation test positive", 3, (A) => DX.test(A, "kleiger"), "kleiger"),
    C("Recent injury", 1, (A) => DX.trauma(A)),
  ] },
  { id: "tarsal", r: "ankle", n: "Tarsal tunnel syndrome", icd: "G57.5", c: [
    C("Tingling or burning", 1, (A) => Math.max(DX.ptype(A, "Tingling"), DX.ptype(A, "Burning"))),
  ] },

  // ── Any region ──────────────────────────────────────────────────────────
  { id: "noci", r: "any", n: "Persistent pain with nociplastic features", icd: "R52.2", c: [
    C("Present longer than 3 months", 2, (A) => DX.chronic(A)),
    C("Widespread areas on body map (5 or more)", 2, (A) => { const n = Object.values(A.zones).filter((z) => z?.nrs > 0).length; return n >= 5 ? 1 : n ? -1 : 0; }),
    C("Signs of sensitisation", 3, (A) => DX.sens(A)),
    C("Poor sleep and high stress", 2, (A) => { const s = A.C.sleep, t = A.C.stress; if (s == null || t == null) return 0; return s <= 2 && t >= 4 ? 1 : -1; }),
    C("Low pain-coping confidence", 1, (A) => (A.selfEff == null ? 0 : A.selfEff <= 2 ? 1 : -1)),
  ] },
];

export function runDx(A: AssessmentState): DxResult[] {
  const regs = A.regions;
  const out: DxResult[] = [];
  CONDITIONS.forEach((cd) => {
    if (cd.r !== "any" && !regs.includes(cd.r as Region)) return;
    let pos = 0, neg = 0, tot = 0, answered = 0;
    const sup: string[] = [], against: string[] = [], consider: string[] = [];
    cd.c.forEach((cr) => {
      tot += cr.w;
      let r = 0;
      try { r = cr.f(A) || 0; } catch { r = 0; }
      if (r > 0) { pos += cr.w * r; answered++; sup.push(cr.t); }
      else if (r < 0) { neg += cr.w * -r; answered++; against.push(cr.t); }
      else if (cr.consider) consider.push(TEST_NAME[cr.consider] || cr.consider);
    });
    const fit = Math.max(0, Math.min(95, Math.round((100 * (pos - 0.6 * neg)) / tot)));
    if (answered < 2 || fit < 15) return;
    out.push({
      id: cd.id, name: cd.n, icd: cd.icd, icd11: ICD11[cd.id] || "", icf: ICF_CAT[cd.id] || "",
      refer: cd.refer || "", region: cd.r, fit, sup, against, consider, answered, total: cd.c.length,
    });
  });
  out.sort((a, b) => b.fit - a.fit);
  return out;
}

export function fitWord(f: number): string {
  return f >= 60 ? "Strong fit" : f >= 40 ? "Moderate fit" : "Weak fit";
}

export function pickedDx(A: AssessmentState): DxResult[] {
  const all = runDx(A);
  const p = A.dx.picked || {};
  return all.filter((d, i) => p[d.id] === true || (p[d.id] === undefined && i < 3 && d.fit >= 40));
}
