/**
 * src/lib/assessment/education.ts
 *
 * Patient-facing education content: root-cause reasoning, biomechanics
 * explanations, lifestyle and ergonomic advice, stress-management
 * guidance, and heat/cold recommendations. Ported from the Vyayama v9
 * clinical reference (data_holistic.js + data_education.js + data_india.js).
 */

import type { AssessmentState } from "./types";
import { STR_MUSCLES, TIGHT_MUSCLES, MPATS } from "./regions";
import { startBack, keeleMsk } from "./redFlags";
import { pickedDx } from "./dx";

function on(o: Record<string, boolean> | undefined | null): string[] {
  return Object.keys(o || {}).filter((k) => (o as Record<string, boolean>)[k]);
}

export const BIOMECH: Record<string, { how: string; links: string[] }> = {
  cervical: { how: "Your head weighs about 5 kg. When it sits forward of the shoulders, the neck muscles have to hold several times that weight. The neck depends on the upper back to bend and turn, and on the shoulder blades for a stable base, so stiffness or weakness there pushes extra work onto the neck.", links: ["Upper back", "Shoulder blades", "Breathing muscles", "Jaw"] },
  thoracic: { how: "Your upper back is built to rotate and extend. Long sitting keeps it rounded, so the neck, shoulders and lower back take over the movement it should be sharing.", links: ["Neck", "Shoulders", "Lower back", "Ribs and breathing"] },
  lumbar: { how: "Your lower back is designed for stability more than big movement. The hips should do most of the bending and turning. When hips are stiff or buttock muscles are weak, the lower back bends and twists more than it likes.", links: ["Hips", "Buttock muscles", "Core and breathing", "Upper back"] },
  shoulder: { how: "The shoulder ball sits on a shallow saucer that rides on the shoulder blade. The shoulder blade needs a mobile upper back and strong surrounding muscles. If it tips forward, the space for the tendons narrows and they get squeezed.", links: ["Shoulder blade", "Upper back", "Neck", "Core and hips (for lifting and throwing)"] },
  elbow: { how: "The elbow tendons take the strain of gripping. If the shoulder and shoulder blade are weak, or the wrist is bent when you grip, the elbow tendons do far more work than they should.", links: ["Wrist and grip", "Shoulder and shoulder blade", "Neck (nerve roots)"] },
  wrist: { how: "The wrist and hand do fine, repeated work. Bent wrists, weak forearms and a stiff neck or shoulder all change how much strain the small tendons and nerves at the wrist take.", links: ["Forearm and elbow", "Shoulder", "Neck (nerve pathway)"] },
  hip: { how: "The hip carries your body weight with every step. The side buttock muscles keep your pelvis level; when they are weak, the pelvis drops and the knee falls inward, loading the hip, knee and lower back.", links: ["Lower back and pelvis", "Knee", "Ankle and foot", "Core"] },
  knee: { how: "The knee is a hinge caught between the hip and the ankle. Weak hips let the knee cave inward, and stiff ankles push it forward, both increasing strain on the kneecap, tendons and cartilage.", links: ["Hip and buttock muscles", "Ankle and calf", "Foot arch", "Core"] },
  ankle: { how: "The ankle and foot absorb your body weight 1–1.5 times with every walking step and 2–3 times when running. The calf is the main shock absorber. Weak calves, stiff ankles or a collapsing arch overload the tendons, ligaments and the knee above.", links: ["Calf", "Foot arch", "Knee", "Hip"] },
};

const EDU: Record<string, { what: string; why: string; fix: string; expect: string }> = {
  mnp: { what: "Your neck joints and muscles have become sensitive and stiff. Nothing is broken or damaged.", why: "When the head sits forward of the shoulders for hours, as with laptops and phones, the small neck muscles work much harder to hold it up. Over time they tire, tighten and send pain signals.", fix: "We'll calm the sore muscles, loosen the stiff joints, and strengthen the deep muscles that hold your head up without effort. Small changes to your desk and phone habits stop it coming back.", expect: "Most people feel clearly better in 2–6 weeks." },
  crad: { what: "A nerve in your neck is irritated where it leaves the spine, so you feel pain, tingling or weakness along the arm.", why: "The space where the nerve exits narrows when the neck bends back or sideways, and swelling or a disc bulge can press on it.", fix: "We'll take pressure off the nerve with positions and gentle movement, help the nerve glide freely, then strengthen your neck and upper back.", expect: "Most people improve a lot over 6–12 weeks without surgery." },
  cgh: { what: "Your headaches are coming from stiff joints and tight muscles at the top of your neck.", why: "The top neck joints share nerve pathways with the head, so when they are stiff or overloaded, you feel it as a headache.", fix: "We'll free up the top neck joints, relax the muscles at the base of the skull and train the deep neck muscles to support your head.", expect: "Headaches usually reduce in frequency within 4–6 weeks." },
  nslbp: { what: "Your back is sore and sensitive, but scans rarely show anything serious and the spine is strong.", why: "Back pain usually comes from muscles, joints and discs being asked to do more than they are ready for.", fix: "We'll calm the pain, get you moving confidently, and build strength in your hips and trunk so your back can handle daily loads again.", expect: "Most people improve significantly in 2–6 weeks. Staying active speeds recovery." },
  lrad: { what: "A nerve in your lower back is irritated, which is why you feel pain, tingling or heaviness down the leg.", why: "A disc bulge or swelling near the nerve root can press on it, especially when sitting or bending forward for long periods.", fix: "We'll find positions and movements that take pressure off the nerve, help it glide freely, and then rebuild your back and hip strength.", expect: "Most people improve over 6–12 weeks without surgery." },
  sten: { what: "The space for the nerves in your lower back has narrowed with age, so standing and walking long distances make your legs heavy or painful.", why: "Bending backward narrows this space further; bending forward opens it.", fix: "We'll use forward-bending exercises, build hip and leg strength, and build your walking distance with planned rests.", expect: "Many people walk further and with less pain within 6–12 weeks." },
  rcrsp: { what: "The rotator cuff tendons around your shoulder are irritated and not coping with the load you're asking of them.", why: "When the shoulder blade doesn't move well or the cuff muscles are weak, lifting the arm squeezes and overloads these tendons.", fix: "We'll settle the pain, improve shoulder blade movement, and gradually strengthen the cuff so the tendons can handle load again.", expect: "Tendons respond to steady loading. Expect clear improvement in 6–12 weeks." },
  froz: { what: "The capsule around your shoulder joint has become inflamed and tight, so the shoulder stiffens and hurts.", why: "The exact cause isn't fully known, but it's more common in people with diabetes or thyroid conditions and between 40 and 65.", fix: "We'll manage pain early, then steadily stretch and mobilise the shoulder.", expect: "Recovery often takes several months, and treatment helps you keep moving through it." },
  lat: { what: "The tendon on the outside of your elbow (tennis elbow) is overloaded.", why: "Repeated gripping with the palm down, typing, using tools or wringing clothes, strains this tendon faster than it can recover.", fix: "We'll reduce the strain, then strengthen the forearm with slow loading so the tendon gets stronger.", expect: "Tendons are slow but steady: expect improvement over 6–12 weeks." },
  cts: { what: "The nerve that passes through your wrist is being squeezed, causing tingling in the thumb and first fingers.", why: "Bending the wrist for long periods, repetitive hand use, fluid retention and diabetes reduce space in the tunnel.", fix: "A night splint, nerve gliding, wrist position changes and hand strengthening.", expect: "Mild cases often improve in 4–8 weeks." },
  hoa: { what: "The cartilage in your hip joint has thinned with age. This is common and doesn't mean the hip will keep getting worse.", why: "Joints stay healthy with movement and strong muscles; weak hips and extra body weight increase load on the joint.", fix: "Exercise is the best treatment for hip arthritis. We'll strengthen your hips and improve movement.", expect: "Most people notice less pain and better walking within 6–12 weeks of regular exercise." },
  gtps: { what: "The tendons on the outside of your hip are compressed and overloaded.", why: "Crossing legs, hanging on one hip when standing and weak buttock muscles squash these tendons against the bone.", fix: "Change positions that compress them and strengthen the buttock muscles.", expect: "Improvement is gradual, usually over 8–12 weeks." },
  pfp: { what: "The area behind your kneecap is sensitive because it's being loaded more than it can currently handle.", why: "When hip and thigh muscles are weak, the knee drifts inward during stairs and squats, increasing pressure behind the kneecap.", fix: "We'll reduce irritating loads for now, then strengthen the hips and thighs so the kneecap tracks smoothly.", expect: "Most people improve in 6–12 weeks." },
  acl: { what: "A key ligament inside your knee that controls twisting may be injured.", why: "It's usually hurt in a sudden twist or landing with the knee caving in.", fix: "Strength and control training is central, whether or not surgery is needed.", expect: "Return to sport takes 6–12 months with proper rehab." },
  koa: { what: "The cartilage in your knee has thinned with age. This is common and very treatable.", why: "Weak thigh muscles and extra body weight increase load on the joint. Movement keeps the joint nourished.", fix: "Strengthening and staying active are the best treatments.", expect: "Most people walk further with less pain within 6–12 weeks." },
  las: { what: "You've sprained the ligaments on the outside of your ankle.", why: "The ankle rolled inward and stretched them. If balance isn't retrained, sprains can recur.", fix: "Calm swelling, restore movement, then train strength and balance properly.", expect: "Most return to normal in 2–6 weeks; balance training prevents repeat sprains." },
  achT: { what: "Your Achilles tendon is overloaded and sensitive.", why: "Sudden increases in walking, running or hill work, tight calves and footwear changes overload it.", fix: "We'll adjust load and use progressive calf strengthening, the most effective treatment.", expect: "Tendons need 12 weeks or more to strengthen." },
  php: { what: "The thick band under your foot is irritated where it attaches to the heel.", why: "Long standing on hard floors, walking barefoot, tight calves and weight gain overload it.", fix: "Supportive footwear indoors, calf stretching and strengthening, and gradual loading.", expect: "Most people improve over 6–12 weeks." },
  noci: { what: "Your nervous system has become extra sensitive, so it sends pain signals more easily than before. The pain is real, but it doesn't mean ongoing damage.", why: "Long-lasting pain, poor sleep, stress and worry turn up the body's 'alarm volume'.", fix: "We'll calm the system with graded activity, sleep and stress strategies, and build confidence in movement.", expect: "Progress is gradual, but most people regain a lot of function over a few months." },
};

export function eduFor(dxId: string) {
  return EDU[dxId] || null;
}

const EDU_REGION: Record<string, string> = {
  cervical: "Your neck is sore and sensitive, usually from muscles and joints being overloaded by posture and daily habits.",
  thoracic: "Your upper back is stiff and sore, usually from long sitting.",
  lumbar: "Your lower back is sore and sensitive. Backs are strong and most pain settles with the right movement.",
  shoulder: "Your shoulder isn't coping with the load you're asking of it.",
  elbow: "The tendons around your elbow are overloaded.",
  wrist: "Your wrist and hand are overloaded or a nerve is irritated.",
  hip: "Your hip and the muscles around it are not coping with daily loads.",
  knee: "Your knee is being loaded more than it can currently handle.",
  ankle: "Your ankle and foot need help with strength, movement and balance.",
};

export function eduForRegion(region: string): string {
  return EDU_REGION[region] || "";
}

export interface RootCause { t: string; why: string; fix: string }

export function rootCauses(A: AssessmentState): RootCause[] {
  const R: RootCause[] = [];
  const add = (t: string, why: string, fix: string) => R.push({ t, why, fix });
  const po = A.obs.posture || {};
  if (po.fhp) add("Head sits forward of the shoulders", "Every few centimetres forward makes the neck muscles carry much more weight.", "Chin tucks, deep neck strengthening and raising your screen to eye level.");
  if (po.rsh) add("Rounded shoulders", "Tightens the chest and weakens the upper back, crowding the shoulder and neck.", "Chest stretches, rows and shoulder blade squeezes.");
  if (po.kyph) add("Rounded upper back", "A stiff, rounded upper back shifts strain to the neck, shoulders and lower back.", "Upper back extension and rotation exercises.");
  if (po.apt || po.lordUp) add("Pelvis tipped forward / increased lower back curve", "Tight hip flexors and weak buttocks and tummy muscles increase pressure on the lower back joints.", "Hip flexor stretches, bridges and core training.");
  if (po.valg) add("Knees drift inward", "Weak hip muscles let the knees cave in, loading the kneecap and ankle.", "Hip strengthening and squat technique.");
  if (po.flat) add("Flat feet / rolling in", "The arch collapses and the shin and knee twist inward.", "Foot strengthening, calf work and supportive footwear.");

  const weak = A.regions.flatMap((r) => STR_MUSCLES[r] || []).filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
    .filter((m) => { const d = A.str[m.id] || {}; const v = [d.l, d.r, d.s].filter((x) => x != null) as number[]; return v.length && Math.min(...v) <= 4; })
    .map((m) => m.n);
  if (weak.length) add(`Weaker muscles: ${weak.slice(0, 5).join(", ")}`, "Weak support muscles leave joints and tendons to take extra load.", "Progressive strengthening through the Strengthen phase.");

  const tight = A.regions.flatMap((r) => TIGHT_MUSCLES[r] || []).filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i && A.tight[m.id]).map((m) => m.n);
  if (tight.length) add(`Tight muscles: ${tight.join(", ")}`, "Tight muscles pull joints out of their easy position and limit movement.", "Stretching and soft-tissue work in the Mobilise phase.");

  const poor = MPATS.filter((m) => A.mov[m.id] && A.mov[m.id].q === "P").map((m) => m.n.toLowerCase());
  if (poor.length) add(`Movement habits: ${poor.join(", ")}`, "The body has found a way to move that puts more strain on the sore area.", "Movement retraining with feedback.");

  if (A.vy.breath === "upper" || A.vy.breath === "hold") add("Shallow chest breathing", "Overworks the neck and shoulder muscles and keeps the body tense.", "Belly breathing practice twice a day.");

  const ag = A.C.agg || {};
  if (ag["Screen work"] || ag["Sitting"] || /laptop|desk|IT/i.test((A.P.occupation || "") + (A.P.occNote || "")))
    add("Long sitting at a screen", "Holding one position for hours reduces blood flow and tires postural muscles.", "Workstation set-up and a movement break every 30–45 minutes.");
  if (ag["Phone use"]) add("Phone use with the head bent", "Looking down at a phone greatly increases load on the neck.", "Raise the phone to eye level, use voice notes.");
  if (ag["Sweeping / mopping"] || ag["Carrying a child"]) add("Household or childcare loads", "Repeated bending, twisting and carrying add up over the day.", "Long-handled tools, lifting technique and spreading tasks through the day.");
  if (A.C.sleep != null && A.C.sleep <= 2) add("Poor sleep", "Tissues repair and pain sensitivity resets during sleep. Short sleep makes pain louder.", "Sleep routine and pain-friendly sleeping positions.");
  if (A.C.stress != null && A.C.stress >= 4) add("High stress", "Stress keeps muscles tense and makes the nervous system more sensitive to pain.", "Breathing practice, pacing and regular activity.");
  if (A.C.act != null && A.C.act <= 2) add("Low daily activity", "The body loses strength and tolerance when it isn't loaded regularly.", "Daily walking and a gradual exercise plan.");

  const h = parseFloat(A.vitals.ht || ""), w = parseFloat(A.vitals.wt || "");
  if (h && w) { const b = w / (h / 100) ** 2; if (b >= 23) add("Body weight above the healthy range for Indians", "Extra weight increases load on the back, hips, knees and feet.", "Regular activity and balanced meals. Even a small loss eases joint load."); }

  const pm = A.hist.pmh || {};
  if (pm["Vitamin D deficiency"] || pm["Vitamin B12 deficiency"]) add("Low vitamin D or B12", "These can cause widespread aches, weakness and nerve symptoms.", "Follow your doctor's supplements and get morning sunlight.");
  if (pm["Diabetes"]) add("Diabetes", "High blood sugar slows tendon healing and is linked to frozen shoulder.", "Good sugar control helps your recovery.");
  if (pm["Recent chikungunya or dengue"]) add("Recent viral fever", "Chikungunya and dengue can leave joints sore for weeks to months.", "Gentle, graded activity; check with your doctor if joints swell.");
  if (A.selfEff != null && A.selfEff <= 2) add("Low confidence to manage pain", "Worry about pain often leads to avoiding movement, which slows recovery.", "Clear explanations, small wins and a plan you can follow.");
  return R;
}

export function bmi(A: AssessmentState): number | null {
  const h = parseFloat(A.vitals.ht || ""), w = parseFloat(A.vitals.wt || "");
  if (!h || !w) return null;
  return +(w / (h / 100) ** 2).toFixed(1);
}
export function bmiBand(b: number | null): string {
  if (b == null) return "";
  return b < 18.5 ? "Underweight" : b < 23 ? "Normal (Asian cut-off)" : b < 25 ? "Overweight (Asian cut-off ≥23)" : "Obese (Asian cut-off ≥25)";
}
export const FLOOR_NOTE = "Many patients need to sit on the floor, squat or use an Indian-style toilet. These need more hip and knee bend than the typical values shown. Set goals around their real daily postures.";
export const BLOOD_TESTS = ["Vitamin D", "Vitamin B12", "HbA1c / blood sugar", "Thyroid (TSH)", "ESR / CRP", "RA factor / anti-CCP", "HLA-B27", "Uric acid", "Haemoglobin", "Calcium"];

export function lifestyle(A: AssessmentState): Array<{ h: string; items: string[] }> {
  const L: Array<{ h: string; items: string[] }> = [];
  const b = bmi(A);
  const pm = A.hist.pmh || {};
  L.push({ h: "Sleep", items: [
    "Aim for 7–8 hours, with fixed sleep and wake times.",
    "Screens off 30–60 minutes before bed.",
    A.regions.includes("cervical") ? "Use one pillow that keeps your neck level with your body. Avoid sleeping on your tummy." : "",
    A.regions.includes("lumbar") || A.regions.includes("hip") ? "Sleep on your side with a pillow between your knees, or on your back with a pillow under your knees." : "",
    A.regions.includes("shoulder") ? "Don't lie on the sore shoulder. Hug a pillow to support the arm." : "",
  ].filter(Boolean) });
  L.push({ h: "Water", items: ["Drink about 2.5–3 litres a day, more in summer or after exercise, unless your doctor has told you to limit fluids.", "Keep a bottle at your desk. Pale yellow urine means you're drinking enough.", "Tea and coffee count a little, but keep them to 2–3 cups and not late in the evening."] });
  L.push({ h: "Food that helps healing", items: [
    "Have protein at every meal: dal, rajma, chana, paneer, curd, sprouts, soya, eggs, fish or chicken.",
    "Calcium for bones: milk, curd, ragi, sesame (til) and green leafy vegetables.",
    "Colourful vegetables and fruits daily. A pinch of turmeric (haldi) and a handful of nuts are good additions.",
    "Cut down sugar, sweets, packaged snacks and fried food, which can increase inflammation and weight.",
    pm["Diabetes"] ? "Keep your blood sugar in your doctor's target range. It speeds up healing." : "",
    "For specific diet needs, speak to your doctor or a dietitian.",
  ].filter(Boolean) });
  L.push({ h: "Sunlight and vitamins", items: [
    "Get 15–20 minutes of morning sunlight on your arms and face most days.",
    pm["Vitamin D deficiency"] || pm["Vitamin B12 deficiency"] ? "Take the supplements your doctor prescribed and recheck levels as advised." : "If you have long-lasting aches or tiredness, ask your doctor about checking vitamin D and B12.",
  ] });
  L.push({ h: "Move every day", items: ["Walk 20–30 minutes a day; build up to 150 minutes a week.", "Break up sitting every 30–45 minutes, even for 2 minutes.", "Keep doing your home exercises on most days, even when you feel better."] });
  if (b != null && b >= 23) L.push({ h: "Weight", items: ["Your BMI is above the healthy Indian range (18.5–22.9).", "Losing even 5% of body weight noticeably reduces load on the back, knees and feet.", "Combine daily walking with smaller portions of rice and rotis and more vegetables and protein."] });
  return L;
}

export function ergonomics(A: AssessmentState): Array<{ h: string; items: string[] }> {
  const E: Array<{ h: string; items: string[] }> = [];
  const ag = A.C.agg || {};
  const occ = (A.P.occupation || "") + " " + (A.P.occNote || "");
  const add = (h: string, items: string[]) => E.push({ h, items });
  if (/IT|desk|laptop|Student|Teacher/i.test(occ) || ag["Screen work"]) add("Desk and laptop", [
    "Top of the screen at eye level, about an arm's length away. Use a laptop stand or books, plus a separate keyboard and mouse.",
    "Elbows bent about 90°, close to your body; wrists straight.",
    "Sit back in the chair with a small cushion or rolled towel in the lower back. Feet flat on the floor or on a footrest.",
    "Every 30 minutes stand up for 1–2 minutes. Every 20 minutes look 20 feet away for 20 seconds.",
    "Avoid working from the bed or sofa for long periods.",
  ]);
  if (ag["Phone use"] || A.regions.includes("cervical")) add("Phone", ["Hold the phone up at eye level, not in your lap.", "Use voice notes and calls on speaker or earphones instead of holding the phone with your shoulder.", "Take a break from scrolling every 15–20 minutes."]);
  if (ag["Two-wheeler riding"] || /two-wheeler|scooter|bike|delivery/i.test(occ)) add("Two-wheeler", ["Sit upright with arms relaxed and elbows slightly bent; adjust mirrors so you don't crane your neck.", "Use a well-fitting, light helmet.", "On long rides, stop every 45–60 minutes to stretch.", "Slow down over potholes and speed-breakers."]);
  if (ag["Driving in traffic"] || /Driver|cab|auto|truck/i.test(occ)) add("Car or auto driving", ["Seat close enough that your knees are slightly bent and your back touches the seat.", "Use a small rolled towel for lower back support.", "In traffic, do shoulder rolls and chin tucks at signals.", "Get out and walk for a few minutes every 1–2 hours on long drives."]);
  if (/Homemaker/i.test(occ) || ag["Sweeping / mopping"]) add("Household work", ["Use a long-handled broom and mop so you don't bend for long.", "Keep the kitchen counter at about waist height; sit on a stool for chopping and cleaning vegetables.", "Switch tasks every 20–30 minutes and spread heavy chores across the week.", "Wring clothes by twisting with palms up, or use a washing machine spin."]);
  if (ag["Carrying a child"] || ag["Lifting"]) add("Lifting and carrying", ["Bend at the hips and knees, keep your back long, and hold the load or child close to your body.", "Avoid twisting while lifting; turn with your feet.", "Carry bags in both hands or use a backpack with both straps."]);
  if (ag["Sitting cross-legged on the floor"] || ag["Squatting / Indian-style toilet"] || ag["Getting up from the floor"] || A.regions.includes("knee") || A.regions.includes("hip"))
    add("Floor sitting and toilet", ["When sitting on the floor, sit on a firm cushion and lean against a wall; change leg position often.", "Use a low stool or dining chair for meals during the painful phase.", "A commode chair or a grab rail helps with Indian-style toilets until the knees or hips settle.", "Get up from the floor by rolling to kneeling, then half-kneeling, using a chair or wall for support."]);
  if (A.regions.includes("ankle") || A.regions.includes("knee")) add("Footwear", ["Wear supportive, cushioned footwear with a firm heel counter, including soft-soled chappals at home if heel or arch pain.", "Avoid high heels and worn-out shoes during recovery."]);
  return E;
}

export function stressPlan(A: AssessmentState): { high: boolean; sections: Array<{ h: string; items: string[] }> } {
  const sb = startBack(A), km = keeleMsk(A);
  const high = (A.C.stress != null && A.C.stress >= 4) || (A.C.sleep != null && A.C.sleep <= 2) || pickedDx(A).some((d) => d.id === "noci") || sb?.risk === "High" || km?.risk === "High";
  const base: Array<{ h: string; items: string[] }> = [
    { h: "Calm the system daily", items: ["Slow breathing: in for 4, out for 6, for 5 minutes, morning and night.", "Body scan or yoga nidra for 10 minutes before sleep.", "Progressive muscle relaxation: tense each muscle group for 5 seconds, then let go."] },
    { h: "Pace your day", items: ["Break big tasks into smaller ones with short movement breaks.", "Plan one enjoyable activity every day, even if it's small.", "Keep a regular sleep and wake time, including weekends."] },
    { h: "Look after your mind", items: ["Write down worries for 10 minutes in the evening, then close the notebook.", "Spend time outdoors or with friends and family; social connection lowers pain.", "Limit news and social media in the hour before bed."] },
  ];
  if (high) base.push({ h: "Extra support", items: ["Your answers suggest stress or sleep are affecting your pain. This is common and treatable.", "We can arrange a session with a psychologist or counsellor alongside your physiotherapy.", "If you ever feel low or hopeless, please tell us or your doctor."] });
  return { high, sections: base };
}

export const THERMO: Record<string, { n: string; how: string }> = {
  cold: { n: "Cold (ice pack)", how: "Wrap ice or a frozen peas packet in a thin damp cloth. 10–15 minutes, every 2–3 hours for the first 2–3 days, or after activity that flares it." },
  heat: { n: "Heat (hot water bag)", how: "Warm (not hot) hot water bag or heat pack wrapped in a towel. 15–20 minutes, up to 3 times a day, and before exercise for stiffness." },
  contrast: { n: "Contrast bath", how: "Warm water 3–4 minutes, then cold water 1 minute. Repeat 3–4 times. Finish with cold if there is swelling, warm if stiffness." },
};
export const THERMO_CAUTIONS = [
  "Do not use heat or ice on skin with reduced feeling (for example diabetic neuropathy).",
  "Check the skin every 5 minutes; stop if it becomes very red, white, blotchy or numb.",
  "No heat on a fresh injury, swelling or infection; no ice if you have Raynaud's or cold allergy.",
  "Never sleep on a hot water bag or ice pack, and never apply directly to the skin.",
  "Avoid heat over areas of cancer or blood clots.",
];

export function suggestThermo(A: AssessmentState): { id: string; why: string; caution: boolean } | null {
  const acute = A.C.duration === "Less than a week" || (A.C.duration === "1–4 weeks" && A.C.onset === "Sudden, with an injury");
  const swell = !!(A.obs.obs && A.obs.obs["Swelling"]) || !!(A.tissue && A.tissue["Swelling"]);
  const warm = !!(A.tissue && A.tissue["Warmth"]);
  const stiff = !!(A.ptype && A.ptype["Stiffness"]) || !!(A.tissue && A.tissue["Muscle spasm"]) || !!(A.ppattern && A.ppattern["Morning stiffness over 30 min"]);
  const neuro = !!(A.hist.pmh && A.hist.pmh["Diabetes"]) && !!(A.ptype && A.ptype["Numbness"]);
  if (acute || warm) return { id: "cold", why: acute ? "Recent injury" : "Area feels warm", caution: neuro };
  if (swell && stiff) return { id: "contrast", why: "Swelling with stiffness", caution: neuro };
  if (swell) return { id: "cold", why: "Swelling present", caution: neuro };
  if (stiff || ["3–6 months", "6–12 months", "Over a year"].includes(A.C.duration || "")) return { id: "heat", why: stiff ? "Stiffness or muscle spasm" : "Long-standing pain", caution: neuro };
  return null;
}

export { on };
