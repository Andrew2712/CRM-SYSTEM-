/**
 * src/lib/assessment/exercises.ts
 *
 * The evidence-based exercise library: 9 body regions × 5 recovery phases
 * (Calm → Heal → Mobilise → Strengthen → Flourish) × in-clinic / at-home,
 * plus condition-specific additions/removals and cross-joint ("linked")
 * exercises. Ported from the Vyayama v9 clinical reference
 * (ex_core/ex_upper/ex_lower/ex_cond/ex_extra.js).
 */

import type { AssessmentState, Exercise, PhaseContent, PhaseId, Region, RegionProgramme } from "./types";
import { pickedDx } from "./dx";
import { X, EX_TYPES } from "./exercisesHelpers";

export { EX_TYPES };

const F = { floor: true };
const B = { band: true };

export const PHASE_IDS: PhaseId[] = ["calm", "heal", "mobilise", "strengthen", "flourish"];

export const PHASE_META: Record<PhaseId, { goal: string; move: string; pain: string; load: string }> = {
  calm: {
    goal: "Settle pain, calm the irritated tissues and build confidence to move.",
    move: "Pain at rest is 3/10 or less, sleep is improving, and gentle movement no longer flares symptoms.",
    pain: "Keep exercise pain at 2/10 or less. It should settle within an hour.",
    load: "Isometric holds 4–5 × 30–45 s at a comfortable effort (about 30–50%). Gentle range-of-motion 10–15 reps, 2–3 times a day. Daily short walks. No heavy lifting yet.",
  },
  heal: {
    goal: "Restore easy movement and gently load the healing tissues.",
    move: "Daily activities are comfortable most of the time and range of movement is close to the other side.",
    pain: "Mild discomfort up to 3/10 is fine if it settles by the next morning.",
    load: "Low load 2–3 × 12–15 reps, slow tempo (2 s up, 1 s hold, 2 s down). Isometrics progress to 60–70% effort. Daily or every other day.",
  },
  mobilise: {
    goal: "Regain full, easy movement and better posture habits.",
    move: "Full or near-full movement without pain, and good control in the movement screen.",
    pain: "Up to 3–4/10 during exercise is acceptable if it settles within 24 hours.",
    load: "Stretches 3 × 30 s (static) or 10 slow reps (dynamic). Mobility 10–15 reps. Motor control: quality over quantity, stop when form fades.",
  },
  strengthen: {
    goal: "Build strength and endurance so the area can handle everyday and work loads.",
    move: "Strength is within about 10% of the other side and functional tests are near target.",
    pain: "Up to 3–4/10 is acceptable if it settles within 24 hours and doesn't build week to week.",
    load: "Strength 3–4 × 6–12 reps at a weight that leaves 2–3 reps in reserve (RPE 7–8). Tendons: heavy slow resistance, 3 s up and 3 s down. Endurance 2–3 × 15–20. 2–3 days a week with a rest day between. Add load about 5–10% a week when the last set feels easy.",
  },
  flourish: {
    goal: "Return to full work, sport and hobbies, and keep it that way.",
    move: "Goals met; patient confident with a maintenance plan.",
    pain: "Little or no pain. Any flare settles within a day with the home plan.",
    load: "Power and jumping 3 × 5–8 only when strength is within 10% of the other side. Conditioning: 150 minutes of moderate activity a week. Keep strength training twice a week for maintenance.",
  },
};

type PhaseExercises = { clinic: Exercise[]; home: Exercise[] };
type RegionEx = Record<PhaseId, PhaseExercises>;

export const EX: Record<string, RegionEx> = {
  cervical: {
    calm: {
      clinic: [
        X("MAN", "TENS or IFT to the neck", "10–15 min", "Electrodes over the sore muscles", "Short-term pain relief so you can start moving."),
        X("MAN", "Gentle mobilisation and soft-tissue release", "5–10 min", "Slow, graded glides", "Eases muscle guarding and restores easy movement."),
        X("ACT", "Cranio-cervical flexion with pressure feedback", "10 × 10 s at 20–22 mmHg", "Small nod, no chin jutting, keep jaw relaxed", "Switches on the deep neck flexors, which are slow to fire in most neck pain and hold the head without strain."),
      ],
      home: [
        X("ACT", "Chin nods lying down", "10 × 10 s, 3 times a day", "Thin pillow, nod as if saying 'yes', head stays on the pillow", "Wakes up the small deep muscles at the front of the neck so the bigger muscles can relax.", F),
        X("BRE", "Belly breathing", "5 min, twice a day", "One hand on chest, one on belly; belly rises, chest stays still", "Shallow chest breathing overworks the neck muscles; belly breathing lets them rest."),
        X("MOB", "Shoulder rolls", "10 slow rolls, every hour at the screen", "Up, back and down; breathe out as they drop", "Keeps blood flowing to tight shoulder muscles."),
        X("AER", "Easy walking", "10–15 min, once or twice a day", "Arms swinging naturally", "Gentle movement turns down pain sensitivity across the whole body."),
      ],
    },
    heal: {
      clinic: [
        X("MAN", "Cervical mobilisation / SNAGs", "As needed", "Pain-free range only", "Restores glide between neck joints."),
        X("ACT", "Cranio-cervical flexion progression", "10 × 10 s, 22 → 26 mmHg", "Hold each level steady before moving up", "Builds deep neck flexor endurance step by step."),
        X("ISO", "Neck isometrics in 4 directions", "5 × 10 s each way, 30–50% effort", "Hand against the head, no movement", "Strengthens neck muscles without moving sore joints."),
      ],
      home: [
        X("POS", "Chin tuck against a wall", "10 × 5 s", "Back of head slides up the wall, chin level", "Retrains the head to sit over the shoulders instead of in front."),
        X("ISO", "Self-resisted neck holds", "5 × 10 s each way", "Press head gently into your hand, don't let it move", "Builds strength safely while the neck is still sensitive."),
        X("ACT", "Shoulder blade squeeze and set", "2 × 10 × 5 s", "Shoulder blades back and down, not up to the ears", "Lower trapezius and rhomboids hold the shoulder blade, taking load off the neck."),
        X("MOB", "Neck turns within comfort", "10 each way, 3 times a day", "Slow, stop before pain", "Restores rotation needed for driving and two-wheeler riding."),
        X("MOB", "Upper-back extension over a rolled towel", "10 slow breaths", "Towel across the shoulder blades, arms by your sides", "A stiff upper back forces the neck to do extra work.", F),
      ],
    },
    mobilise: {
      clinic: [
        X("MAN", "Thoracic mobilisation or manipulation", "If the neck vascular screen is clear", "Clinician decision", "Freeing the upper back often reduces neck pain quickly."),
        X("MAN", "Dry needling to trigger points", "If consented", "Upper trapezius, levator scapulae", "Releases tight knots that refer pain to the head and shoulder."),
        X("NEU", "Neck-stable arm raises", "3 × 10", "Chin tucked, neck still while arms lift", "Trains the neck to stay steady while the arms work."),
      ],
      home: [
        X("STR", "Upper trapezius stretch", "3 × 30 s each side", "Hold the chair, tilt ear away, shoulder down", "Lengthens the muscle that pulls the shoulders up when stressed."),
        X("STR", "Levator scapulae stretch", "3 × 30 s each side", "Nose toward armpit, gentle hand pressure", "Eases the tight band from neck to shoulder blade."),
        X("STR", "Doorway chest stretch", "3 × 30 s", "Forearms on the frame, step through", "A tight chest rounds the shoulders and pushes the head forward."),
        X("MOB", "Open-book rotation", "10 each side", "Side-lying, knees bent, open the top arm like a book", "Restores upper-back rotation.", F),
        X("MOB", "Seated thoracic rotation", "10 each side", "Arms crossed, turn from the chest, not the neck", "Mobility you can do at your desk."),
      ],
    },
    strengthen: {
      clinic: [
        X("CE", "Band rows", "3 × 12, tempo 2-1-2", "Elbows back, shoulder blades down", "Strengthens the upper back that holds good posture."),
        X("CE", "Face pull with external rotation", "3 × 12", "Pull to the face, thumbs back", "Balances rounded shoulders and supports the neck."),
        X("CON", "Prone Y-T-W raises", "2 × 10 each, light weight", "Thumbs up, squeeze shoulder blades", "Builds lower and middle trapezius, the key posture muscles."),
        X("END", "Deep neck flexor endurance hold", "Build to 3 × 30 s", "Chin tucked, lift head 2 cm", "Neck pain is linked to low endurance, not low strength."),
        X("ECC", "Slow-lowering neck flexion and extension (band or manual)", "2 × 8, 4 s lowering", "Small range, chin tucked", "Eccentric control builds neck resilience for driving and sport."),
      ],
      home: [
        X("CE", "Band or dupatta rows", "3 × 12, every other day", "Tie to a door handle, elbows back", "Builds the upper-back strength that keeps the head balanced.", B),
        X("POS", "Wall angels", "2 × 10", "Back, head and arms touch the wall; slide arms up", "Retrains posture and opens the chest."),
        X("END", "Chin-tuck head lifts", "5 × 10 s", "Lying, tuck chin, lift head a few centimetres", "Builds the endurance that stops the head drifting forward over the day.", F),
        X("CE", "Quadruped neck extension", "2 × 10, slow", "On hands and knees, look down then gently lift to neutral", "Strengthens the muscles at the back of the neck through their range.", F),
        X("CE", "Wall push-up plus", "3 × 10", "At the end push further to round the upper back", "Serratus anterior keeps the shoulder blade flat and stable."),
        X("CORE", "Dead bug with chin tuck", "2 × 8 each side", "Lower back flat, chin gently tucked", "Links deep neck and trunk stability so posture holds without effort.", F),
      ],
    },
    flourish: {
      clinic: [
        X("FUNC", "Work-specific endurance circuit", "15–20 min", "Desk, driving or overhead tasks with good form", "Prepares the neck for full work days."),
        X("SC", "Loaded carries", "3 × 30 m", "Tall posture, shoulders down", "Trains posture while carrying real loads."),
      ],
      home: [
        X("POS", "Movement snack", "2 min every 30–45 min", "Stand, roll shoulders, chin tucks, look far away", "Breaks long static postures, the main driver of desk neck pain."),
        X("SC", "Strength routine", "2–3 times a week", "Rows, wall angels, head lifts", "Keeps the neck strong so pain doesn't come back."),
        X("FUNC", "Shopping-bag carry", "3 × 20 steps each hand", "Stand tall, don't let the shoulder hitch", "Builds real-life carrying strength."),
        X("AER", "Brisk walking or swimming", "150 min a week", "Talk-but-not-sing pace", "General fitness lowers the chance of neck pain returning."),
      ],
    },
  },

  thoracic: {
    calm: { clinic: [X("MAN", "Heat and soft-tissue release", "10 min", "Over the upper back", "Eases muscle spasm."), X("MAN", "Thoracic mobilisation", "As needed", "Graded glides", "Restores movement between the vertebrae.")],
      home: [X("BRE", "Belly and rib breathing", "5 min, twice a day", "Breathe into the sides of the ribs", "Gently moves the rib joints and relaxes the upper back."), X("MOB", "Seated side bends", "10 each side", "Slide hand down the side of the chair", "Gentle movement keeps joints nourished."), X("AER", "Easy walking", "10–15 min", "Swing the arms", "Movement reduces pain sensitivity."), X("MAN", "Hot water bag", "10–15 min", "Wrapped in a towel", "Relaxes tight muscles.")] },
    heal: { clinic: [X("MAN", "Rib and thoracic mobilisation", "As needed", "Clinician", "Frees stiff joints."), X("BRE", "Lateral rib expansion with feedback", "3 × 8 breaths", "Hands on the ribs", "Restores rib movement.")],
      home: [X("MOB", "Cat-camel", "10 slow reps", "Round and arch gently", "Moves every level of the spine.", F), X("MOB", "Seated thoracic rotation", "10 each side", "Turn from the chest", "Restores rotation."), X("MOB", "Chair backbend", "10 reps", "Hands behind head, lean over the chair back", "Counters the forward-rounded sitting posture."), X("ACT", "Shoulder blade squeezes", "2 × 10 × 5 s", "Back and down", "Wakes up the upper-back muscles.")] },
    mobilise: { clinic: [X("MAN", "Thoracic manipulation", "If suitable", "Clinician decision", "Quick improvement in stiffness."), X("MOB", "Foam roller extension", "5 min", "Supported head", "Opens up the stiff upper back.")],
      home: [X("MOB", "Open-book rotation", "10 each side", "Side-lying", "Restores rotation.", F), X("MOB", "Thread the needle", "8 each side", "On hands and knees", "Rotation with stability.", F), X("STR", "Doorway chest stretch", "3 × 30 s", "Step through", "Opens the front of the chest."), X("POS", "Wall slides", "2 × 10", "Forearms on the wall, slide up", "Trains upright posture.")] },
    strengthen: { clinic: [X("CE", "Band rows and lat pulldowns", "3 × 12, tempo 2-1-2", "Shoulders down", "Strengthens posture muscles."), X("CE", "Prone extension on a ball", "3 × 10", "Chest lifts, neck long", "Strengthens the back extensors."), X("ECC", "Lat pulldown with 3 s return", "3 × 10", "Shoulders down", "Eccentric control of the upper back.")],
      home: [X("CE", "Band pull-aparts", "3 × 12", "Arms straight at chest height", "Builds rear shoulder and mid-back strength.", B), X("CE", "Superman lifts", "2 × 10", "Opposite arm and leg", "Back extensor strength.", F), X("CE", "Wall push-ups", "3 × 10", "Body straight", "Balanced upper-body strength."), X("END", "Prone T hold", "3 × 20 s", "Arms out, thumbs up, lift slightly", "Endurance for long sitting days.", F), X("CORE", "Standing band anti-rotation hold", "3 × 20 s each side", "Arms straight, resist turning", "Trunk stability keeps the upper back upright under load."), X("ECC", "Slow towel row-downs", "3 × 10, 3 s lowering", "Towel over a door top, pull down, return slowly", "Eccentric upper-back strength without equipment."), X("POS", "Seated tall-sitting holds", "5 × 1 min", "Sit on sitting bones, crown lifted", "Builds the endurance to sit upright.")] },
    flourish: { clinic: [X("FUNC", "Rotation and carrying drills", "As needed", "Work or sport specific", "Prepares for real tasks.")],
      home: [X("POS", "Posture breaks", "Every 30–45 min", "Stand, reach up, breathe deeply", "Breaks static posture."), X("SC", "Strength routine", "2–3 times a week", "Rows and superman lifts", "Maintains gains."), X("AER", "Brisk walking", "150 min a week", "Arms swinging", "General fitness.")] },
  },

  shoulder: {
    calm: { clinic: [X("MAN", "TENS or ultrasound as appropriate", "10 min", "", "Short-term pain relief."), X("MAN", "Gentle glenohumeral mobilisation", "Grade I–II", "", "Reduces pain and guarding."), X("ISO", "Isometric external rotation", "5 × 30–45 s, 30–50% effort", "Elbow at side, towel under the arm", "Isometrics reduce tendon pain and start loading the rotator cuff safely.")],
      home: [X("MOB", "Pendulum swings", "1 min, 3 times a day", "Lean on a table, let the arm hang and swing", "Gentle movement without muscle effort."), X("ACT", "Shoulder blade setting", "10 × 5 s", "Gently back and down", "Gives the shoulder a stable base."), X("ISO", "Wall isometrics: outward, inward and forward press", "5 × 30 s each, comfortable effort", "Press, don't move", "Calms tendon pain and keeps the cuff working."), X("LOAD", "Sleep and reach modifications", "Daily", "Hug a pillow; keep reaching below shoulder height", "Removes the positions that keep irritating the tendon.")] },
    heal: { clinic: [X("MOB", "Active-assisted range with a stick", "3 × 10", "Therapist guides flexion and rotation", "Restores movement without overloading."), X("ACT", "Scapular control drills", "3 × 10", "Clock reaches, shoulder blade steady", "Trains the shoulder blade to move in rhythm with the arm.")],
      home: [X("MOB", "Table slides", "10 reps, twice a day", "Slide hand forward on a towel", "Easy way to regain lifting range."), X("MOB", "Stick-assisted external rotation", "10 reps", "Good arm pushes sore arm out", "Restores rotation lost in most shoulder problems."), X("CON", "Side-lying external rotation, no weight", "2 × 15, tempo 2-1-2", "Elbow on side, towel under the arm", "The single best exercise for the rotator cuff (highest muscle activity).", F), X("ACT", "Prone row with shoulder blade squeeze", "2 × 12", "Lying face down, arm hangs, pull elbow up", "Activates middle and lower trapezius.", F)] },
    mobilise: { clinic: [X("MAN", "End-range mobilisation", "As needed", "", "Restores the last part of movement."), X("STR", "Sleeper stretch", "3 × 30 s", "Gentle, no pinching", "Stretches the tight back of the shoulder capsule."), X("MAN", "Dry needling", "If consented", "Cuff and upper trapezius trigger points", "Releases muscle tension.")],
      home: [X("STR", "Cross-body stretch", "3 × 30 s", "Pull arm across the chest gently", "Loosens the back of the shoulder."), X("STR", "Doorway chest stretch", "3 × 30 s", "Forearm on the frame", "Lets the shoulder blade sit back so the arm lifts freely."), X("MOB", "Thoracic extension on a chair", "10 reps", "Hands behind head", "An upright upper back gives the shoulder more room."), X("NRV", "Upper limb nerve slider (if arm tingling)", "10 reps", "Gentle, no pulling pain", "Keeps nerves gliding freely.")] },
    strengthen: { clinic: [X("CE", "Band external and internal rotation", "3 × 12–15, tempo 2-0-3", "Elbow by side", "Builds rotator cuff strength."), X("CE", "Scaption to shoulder height", "3 × 10", "Thumbs up, 30° forward", "Strengthens supraspinatus in a safe plane."), X("ECC", "Eccentric external rotation at 90/90", "3 × 10, 3 s lowering", "Arm at shoulder height, slow on the way down", "Prepares the cuff for overhead and throwing loads."), X("SC", "Landmine or dumbbell overhead press", "3 × 8", "Ribs down, no arching", "Builds overhead strength for daily life and sport.")],
      home: [X("CE", "Band external rotation", "3 × 15", "Rotate out slowly, 3 s back in", "Strengthens the cuff that centres the ball in the socket.", B), X("CE", "Side-lying external rotation with a water bottle", "3 × 12, 3 s lowering", "Elbow on side", "Progresses cuff strength.", F), X("CE", "Wall push-up plus", "3 × 10", "Push further at the end", "Serratus anterior controls the shoulder blade."), X("CON", "Water-bottle scaption", "3 × 10", "Thumbs up to shoulder height", "Builds lifting strength without pinching."), X("CE", "Band rows", "3 × 12", "Shoulder blades back", "Balances the front and back of the shoulder.", B), X("CORE", "Plank with shoulder taps (wall or floor)", "3 × 10 taps", "Hips still", "Trunk and shoulder blade stability together; power for the arm comes from the core."), X("END", "Wall-ball circles", "2 × 30 s each way", "Small circles at shoulder height", "Rotator cuff endurance for long overhead tasks.")] },
    flourish: { clinic: [X("PLY", "Plyometric ball drops and throws", "3 × 10", "Rhythmic, controlled", "Prepares for throwing, smashes and sport speed."), X("FUNC", "Overhead work simulation", "As needed", "Lifting to shelves, hanging clothes", "Builds confidence for real tasks."), X("SC", "Kettlebell bottom-up carry", "3 × 20 m", "Arm at 90°, wrist straight", "Reflexive cuff stability under load.")],
      home: [X("SC", "Strength routine", "2–3 times a week", "Rotations, scaption, push-ups", "Keeps the shoulder strong."), X("FUNC", "Overhead reach practice", "Daily", "High shelf, clothes line, good form", "Uses the shoulder normally again."), X("END", "Band rotations high reps", "2 × 20", "Light band", "Cuff endurance for long tasks.", B)] },
  },

  elbow: {
    calm: { clinic: [X("MAN", "Ultrasound or TENS", "10 min", "", "Pain relief."), X("LOAD", "Counterforce brace fitting", "During gripping tasks", "Two finger-widths below the bony point", "Spreads load away from the sore tendon.")],
      home: [X("ISO", "Isometric wrist extension", "5 × 45 s, medium effort", "Press back of hand into other hand; pain should ease", "Isometrics give quick tendon pain relief and start loading."), X("MOB", "Gentle wrist and finger movements", "10 each, 3 times a day", "Slow", "Keeps the area moving."), X("LOAD", "Lift with palm up", "All day", "Turn the palm up when carrying", "Takes load off the outer elbow tendon.")] },
    heal: { clinic: [X("MAN", "Mobilisation with movement", "3 × 10", "Pain-free gripping with elbow glide", "Often gives immediate pain-free grip."), X("ISO", "Isometric grip at 60–70%", "5 × 30 s", "Dynamometer or ball", "Builds tendon tolerance.")],
      home: [X("STR", "Wrist extensor stretch", "3 × 30 s", "Arm straight, bend wrist down gently", "Eases tension on the tendon."), X("CON", "Light grip squeezes", "2 × 15", "Soft ball or rolled towel", "Restores grip."), X("CE", "Forearm rotation with a light bottle", "2 × 15", "Palm up and down slowly", "Strengthens rotation muscles."), X("ACT", "Shoulder blade squeezes", "2 × 10", "Good shoulder control lowers elbow load", "Proximal strength reduces elbow strain.")] },
    mobilise: { clinic: [X("MAN", "Dry needling", "If consented", "Forearm extensors", "Releases tight bands."), X("NRV", "Radial nerve glide", "2 × 10", "If nerve-related", "Keeps the nerve gliding.")],
      home: [X("STR", "Wrist flexor and extensor stretches", "3 × 30 s each", "Gentle", "Balances forearm tension."), X("MOB", "Elbow bend and straighten", "15 reps", "Full range", "Keeps full elbow range."), X("POS", "Desk set-up check", "Daily", "Wrists straight, elbows at 90°", "Removes daily strain.")] },
    strengthen: { clinic: [X("ECC", "Eccentric wrist extension (Tyler twist / flexbar)", "3 × 15, slow lowering", "Lift with help, lower slowly with sore side", "Eccentric loading remodels the tendon."), X("CE", "Heavy slow wrist extension", "3 × 8–12, 3 s up 3 s down", "Dumbbell", "Heavy slow resistance builds tendon strength."), X("CON", "Grip and pinch strengthening", "3 × 10", "", "Restores full grip.")],
      home: [X("ECC", "Slow-lowering wrist extension with a water bottle", "3 × 15, daily", "Lift with the other hand, lower slowly", "Strengthens the overloaded tendon."), X("CE", "Band wrist extension", "3 × 15", "Band under foot", "Builds wrist extensor strength through full range.", B), X("CE", "Hammer or bottle rotations", "3 × 12", "Slow rotation", "Pronator and supinator strength."), X("END", "Rice-bucket finger work", "2 min", "Open and close in rice", "Forearm endurance for typing and tools."), X("END", "Light-weight wrist extension endurance", "2 × 25", "Very light bottle", "Tendon endurance for typing and tool use.")] },
    flourish: { clinic: [X("FUNC", "Work or sport simulation", "As needed", "Tool use, racket grip", "Prepares for real demands.")],
      home: [X("SC", "Maintenance strength", "2–3 times a week", "Slow-lowering wrist work", "Prevents recurrence."), X("FUNC", "Grip habit check", "Daily", "Palm-up lifting, two hands", "Long-term load management.")] },
  },

  wrist: {
    calm: { clinic: [X("LOAD", "Splint fitting (night wrist splint or thumb spica)", "As advised", "Wrist straight", "Rests the irritated tendon or nerve."), X("MAN", "Ultrasound or contrast bath", "10 min", "", "Pain and swelling relief.")],
      home: [X("NRV", "Tendon and nerve glides", "5 reps each, 3 times a day", "Fist, straight hand, hook, flat fist", "Keeps tendons and the median nerve sliding freely."), X("MOB", "Gentle wrist circles", "10 each way", "Slow", "Keeps joints moving."), X("LOAD", "Night splint", "Every night", "Wrist straight", "Stops the wrist bending at night, which squeezes the nerve.")] },
    heal: { clinic: [X("MAN", "Carpal mobilisation", "As needed", "", ""), X("MAN", "Soft-tissue release", "As needed", "", "")],
      home: [X("STR", "Prayer stretch", "3 × 20 s", "Palms together, lower gently", "Restores wrist extension."), X("ACT", "Thumb opposition", "10 reps", "Touch each fingertip", "Wakes up thumb muscles."), X("ISO", "Isometric wrist holds", "5 × 20 s each direction", "Press into the other hand", "Strength without irritating movement."), X("CON", "Putty or soft ball squeeze", "2 × 10", "Gentle", "Restores grip.")] },
    mobilise: { clinic: [X("NRV", "Median nerve slider", "2 × 10", "Slider, not tensioner", "Improves nerve movement."), X("MAN", "Mobilisation with movement", "As needed", "", "")],
      home: [X("STR", "Wrist flexion and extension stretch", "3 × 30 s", "Gentle", "Full wrist range."), X("NRV", "Median nerve slider", "10 reps", "Head tilts toward the hand as the wrist extends", "Reduces tingling."), X("POS", "Keyboard and phone posture", "Daily", "Wrists straight, phone at eye level", "Removes the bent-wrist positions.")] },
    strengthen: { clinic: [X("CE", "Wrist and grip strengthening", "3 × 12", "Dumbbell or band", "Builds wrist strength through full range."), X("CON", "Thumb strengthening", "3 × 10", "Band or putty", "Strengthens the thumb base.")],
      home: [X("CE", "Water-bottle wrist curls, up and down", "3 × 12 each, 3 s lowering", "Forearm on a table", "Builds wrist strength."), X("CON", "Band thumb abduction", "3 × 12", "Open thumb against band", "Strengthens thumb base.", B), X("CE", "Wall push-up weight bearing", "3 × 10", "Hands flat, progress lower", "Rebuilds tolerance to weight through the hands."), X("ECC", "Slow-lowering wrist flexion and extension", "3 × 12, 3 s lowering", "Help up with the other hand", "Eccentric loading strengthens wrist tendons."), X("END", "Rice-bucket hand work", "2 min", "Open, close and twist in rice", "Hand endurance for cooking, typing and carrying.")] },
    flourish: { clinic: [X("FUNC", "Work and hobby simulation", "As needed", "Typing, cooking, carrying", "Prepares for real daily tasks.")],
      home: [X("SC", "Strength routine", "2–3 times a week", "", "Keeps the hand and wrist strong."), X("POS", "Hand breaks", "Every 30 min of typing", "Shake out, stretch fingers", "Prevents overload."), X("FUNC", "Carrying practice", "Daily", "Bags in both hands", "Uses the hand in real-life load.")] },
  },

  lumbar: {
    calm: { clinic: [X("MAN", "TENS or IFT", "10–15 min", "", "Short-term pain relief."), X("MAN", "Positions of ease and gentle mobilisation", "10 min", "Find positions that settle pain", "Calms the sensitive back."), X("LOAD", "Education: backs are strong, stay active", "5 min", "No bed rest", "Staying active speeds recovery more than rest.")],
      home: [X("AER", "Walking", "5–10 min, 3–4 times a day", "Level ground, short and often", "The best early exercise for back pain; movement nourishes discs and calms pain."), X("MOB", "Pelvic tilts lying", "10 reps, 3 times a day", "Gently flatten and arch the lower back", "Gentle movement of every lower back joint.", F), X("MOB", "Knee rocks side to side", "10 each way", "Within comfort", "Relaxes the back muscles.", F), X("BRE", "Belly breathing lying with knees bent", "5 min", "Slow out-breath", "Relaxes guarding back muscles.", F), X("MOB", "Seated pelvic tilts", "10 reps, every hour", "Roll forward and back on the sitting bones", "Movement breaks for desk days without getting on the floor."), X("FUNC", "Log-roll to get out of bed", "Every time", "Bend knees, roll to the side, push up with arms", "Protects the back during its most painful moment of the day.")] },
    heal: { clinic: [X("MAN", "Lumbar mobilisation", "As needed", "", "Restores joint movement."), X("ACT", "Core activation with feedback", "3 × 10 × 5 s", "Gentle belly draw-in, keep breathing", "Re-establishes timing of the deep core.")],
      home: [X("ACT", "Bridges", "2 × 10, 3 s hold", "Squeeze buttocks, ribs down", "Gluteus maximus supports the pelvis and spares the back.", F), X("MOB", "Cat-camel", "10 slow reps", "Move one segment at a time", "McGill's spine 'floss': reduces stiffness with very low load.", F), X("CORE", "Abdominal brace with breathing", "10 × 10 s", "Stiffen the belly as if about to be poked, keep breathing", "Teaches the trunk to stiffen and protect the back during tasks."), X("FUNC", "Sit-to-stand with hip hinge", "2 × 10", "Chest forward, push through heels", "Restores a key daily movement with good mechanics.")] },
    mobilise: { clinic: [X("MAN", "Mobilisation or manipulation if suitable", "As indicated", "", "Short-term relief to make exercise easier."), X("FUNC", "Hip-hinge retraining with a dowel", "3 × 10", "Dowel touches head, upper back and tailbone", "Teaches bending from the hips, not the back."), X("MAN", "Dry needling to gluteal or lumbar trigger points", "If consented", "", "Releases tight bands that refer pain.")],
      home: [X("STR", "Hamstring stretch with a dupatta", "3 × 30 s each leg", "Lying, leg straight up", "Tight hamstrings pull the pelvis and round the back.", F), X("STR", "Half-kneeling hip flexor stretch", "3 × 30 s each side", "Tuck tailbone, shift forward", "Long sitting tightens hip flexors, which pull on the lower back.", F), X("STR", "Piriformis stretch on a chair", "3 × 30 s each side", "Ankle on knee, lean forward with a straight back", "Eases deep buttock tension."), X("NRV", "Sciatic nerve slider (if leg symptoms)", "10 reps", "Sitting: straighten knee while looking up", "Helps an irritated nerve glide freely."), X("POS", "Lumbar roll in sitting", "All day", "Small towel roll at the belt line", "Keeps a gentle curve and reduces disc pressure."), X("MOB", "90/90 hip switches", "10 each side", "Sit tall, rotate knees side to side", "More hip rotation means less twisting in the back.", F), X("MOB", "Open-book rotation", "10 each side", "Side-lying", "Upper-back rotation reduces lumbar twisting.", F)] },
    strengthen: { clinic: [X("SC", "Kettlebell deadlift", "3 × 8–10", "Flat back, hips back", "Progressive loading builds a back that tolerates lifting."), X("SC", "Goblet squat or leg press", "3 × 10", "Knees over toes", "Leg strength spares the back in daily lifting."), X("CORE", "Pallof press", "3 × 10 each side", "Resist the band twisting you", "Anti-rotation core strength protects the spine."), X("ECC", "Back extension (45° bench) with 3 s lowering", "3 × 8–10", "Hinge at hips, neutral spine", "Back extensor strength and endurance predict fewer recurrences."), X("CE", "Hip thrust", "3 × 10, 2 s squeeze", "Ribs down", "Strong glutes take load off the lower back."), X("SC", "Hip hinge with a broomstick", "3 × 10", "Stick touches head, upper back and tailbone", "Bending from the hips protects the back.")],
      home: [X("CORE", "McGill curl-up", "3 × 8 × 10 s", "One knee bent, hands under lower back, lift head and shoulders slightly", "Front core endurance without bending the spine."), X("CORE", "Side plank (knees, then feet)", "3 × 15–30 s each side", "Straight line from head to knees", "Strengthens quadratus lumborum and obliques, key back stabilisers.", F), X("CORE", "Bird-dog", "3 × 8 each side, 10 s holds", "Back flat, reach long", "Trains the back extensors and glutes with the spine still.", F), X("SC", "Squat to a chair", "3 × 12", "Tap and stand, 3 s down", "Builds leg strength for lifting and getting up."), X("FUNC", "Bucket or water-bottle suitcase carry", "3 × 20 steps each side", "Stay tall, don't lean", "Trains the core to resist side-bending under load."), X("CE", "Bridge march", "3 × 10 each side", "Hips stay level", "Glute and core control together.", F), X("END", "Standing back endurance: hip hinge hold", "3 × 30 s", "Flat back, slight bend", "Builds endurance for bending tasks like cooking and washing.")] },
    flourish: { clinic: [X("FUNC", "Lifting and work simulation", "15–20 min", "Floor lifts, carrying, turning with the feet", "Return to work tasks."), X("PLY", "Return-to-sport drills", "As needed", "Running, jumping, change of direction", "Prepares the back for sport loads."), X("FUNC", "Split-stance lift and turn", "3 × 8 each side", "Turn with the feet, not the back", "Practises lifting and turning safely.")],
      home: [X("AER", "Daily walk", "30–45 min, brisk", "", "Regular walking is linked to fewer back pain recurrences."), X("SC", "Strength routine", "2–3 times a week", "Big three plus squats and carries", "Maintains back resilience."), X("FUNC", "Floor-to-stand practice", "5 reps daily", "Kneel, half-kneel, stand", "Keeps floor sitting and getting up easy.", F)] },
  },

  hip: {
    calm: { clinic: [X("MAN", "TENS or heat", "10–15 min", "", "Pain relief."), X("MAN", "Hip distraction mobilisation", "As needed", "", "Eases joint pain.")],
      home: [X("AER", "Walking", "10 min, 2–3 times a day", "Level ground", "Keeps the joint nourished."), X("ISO", "Glute squeezes", "10 × 5 s", "Lying or sitting", "Keeps buttock muscles active."), X("MOB", "Heel slides", "10 each leg", "Lying, slide heel toward bottom", "Gentle hip bending.", F), X("ISO", "Isometric hip abduction against a belt", "5 × 30 s", "Belt around knees, push out gently", "Loads the gluteal tendons without compressing them.", F), X("POS", "Even standing", "All day", "Weight on both feet, don't hang on one hip", "Hanging on one hip compresses the outer hip tendons.")] },
    heal: { clinic: [X("MAN", "Hip mobilisation", "As needed", "", ""), X("AER", "Stationary cycling", "10 min, low resistance", "", "Joint movement with low load.")],
      home: [X("ACT", "Bridges", "2 × 10, 3 s hold", "Squeeze buttocks", "Gluteus maximus strength.", F), X("CON", "Side-lying hip abduction", "2 × 10", "Top leg slightly back, toes forward", "Gluteus medius strength to keep the pelvis level.", F), X("FUNC", "Sit-to-stand", "2 × 10", "From a higher chair if needed", "Daily function."), X("CON", "Standing hip abduction holding a chair", "2 × 10 each", "Upright body", "Pelvic control in standing.")] },
    mobilise: { clinic: [X("MAN", "End-range mobilisation", "As needed", "", ""), X("MAN", "Dry needling to gluteal trigger points", "If consented", "", "")],
      home: [X("STR", "Half-kneeling hip flexor stretch", "3 × 30 s", "Tuck tailbone", "Restores hip extension for walking.", F), X("STR", "Figure-4 stretch on a chair", "3 × 30 s each", "Avoid if it pinches the groin", "Eases buttock tightness."), X("MOB", "Hip rotations lying", "10 each side", "Let knee fall out gently", "Restores rotation.", F), X("MOB", "Quadruped rock back", "10 reps", "Hands and knees, sit back toward heels", "Hip bending without groin pinch.", F), X("STR", "Standing hip flexor stretch (lunge against a wall)", "3 × 30 s each", "Tuck tailbone", "No need to kneel."), X("MOB", "Standing leg swings", "10 each direction", "Hold a chair", "Dynamic hip mobility before walks.")] },
    strengthen: { clinic: [X("SC", "Goblet squat or leg press", "3 × 10", "", "Overall leg and hip strength."), X("CE", "Lateral band walks", "3 × 10 steps each way", "Knees out, hips level", "Gluteus medius strength for walking."), X("SC", "Single-leg Romanian deadlift", "3 × 8 each", "Hips level", "Hip strength and balance together."), X("ECC", "Copenhagen adduction (short lever)", "3 × 6–8", "Knee on bench", "Proven to reduce groin injuries in athletes.")],
      home: [X("CE", "Single-leg bridge", "3 × 8 each, 3 s down", "Hips level", "Builds glute strength per side.", F), X("CE", "Band side steps", "3 × 10 each way", "Band above knees", "Gluteus medius strength for walking and stairs.", B), X("FUNC", "Step-ups on a stair", "3 × 10 each leg", "Knee over second toe", "Functional hip strength for stairs."), X("SC", "Split squat holding a chair", "3 × 8 each", "Front knee over toes", "Single-leg strength."), X("SC", "Squats to a chair", "3 × 12", "3 s down", "Overall leg strength."), X("CORE", "Side plank (knees)", "3 × 20 s each side", "Hips lifted", "Lateral trunk and hip stability work together.", F)] },
    flourish: { clinic: [X("PLY", "Agility and sport drills", "As needed", "", ""), X("FUNC", "Floor-transfer practice", "As needed", "Floor sitting and getting up", "Indian daily-life demands."), X("FUNC", "Lateral lunge", "3 × 8 each", "Hips back, chest up", "Multi-joint control for sport and floor transfers.")],
      home: [X("AER", "Brisk walking or cycling", "30 min, 5 days a week", "", "General fitness."), X("SC", "Strength routine", "2–3 times a week", "", "Keeps the hip strong."), X("FUNC", "Floor sitting practice with a cushion", "5 min daily", "Build up gradually", "Regains floor sitting comfort.", F)] },
  },

  knee: {
    calm: { clinic: [X("MAN", "TENS or IFT, ice or compression", "10–15 min", "", "Reduces pain and swelling."), X("LOAD", "Patellar taping", "2–3 days", "If it eases pain on stairs", "Reduces kneecap pain during activity."), X("ACT", "Quadriceps activation with feedback", "3 × 10", "EMS if needed", "Swelling switches the quads off; this switches them back on.")],
      home: [X("ACT", "Quad sets", "10 × 5 s, 3 times a day", "Push knee into a rolled towel", "Keeps the thigh muscle active."), X("MOB", "Heel slides", "10 reps", "Bend and straighten gently", "Restores bending."), X("CON", "Straight-leg raise", "2 × 10", "Tighten thigh first, lift to the other knee's height", "Strengthens quads without bending the knee.", F), X("ISO", "Wall sit, shallow", "5 × 30 s", "Knees bent about 30°", "Isometric holds reduce kneecap and tendon pain.")] },
    heal: { clinic: [X("AER", "Stationary cycling", "10 min, low resistance", "Seat high", "Moves the knee with little load."), X("CE", "Terminal knee extension with band", "3 × 15", "Band behind knee, straighten fully", "Restores full straightening and quad control.")],
      home: [X("CE", "Mini squats holding a chair", "2 × 10", "30–45°, knees over toes", "Early functional strength."), X("ACT", "Bridges", "2 × 10", "", "Glutes control the knee from above.", F), X("FUNC", "Sit-to-stand from a high chair", "2 × 10", "Push through both heels", "Daily function."), X("CON", "Calf raises", "2 × 15", "Hold a wall", "Calf strength supports the knee.")] },
    mobilise: { clinic: [X("MAN", "Soft-tissue release to quads, ITB and calf", "As needed", "", ""), X("MAN", "Patellar mobilisation", "As needed", "", "")],
      home: [X("STR", "Quadriceps stretch", "3 × 30 s", "Standing, hold a chair", "Tight quads raise pressure behind the kneecap."), X("STR", "Hamstring stretch with a dupatta", "3 × 30 s", "", "Restores full knee straightening.", F), X("STR", "Calf stretch against a wall", "3 × 30 s", "Back heel down", "Tight calves change knee mechanics."), X("NEU", "Single-leg balance", "3 × 30 s each", "Near a wall", "Rebuilds knee position sense."), X("POS", "Knee-over-toe alignment practice", "10 slow squats in front of a mirror", "Knee tracks over the second toe", "Corrects the knee caving inward.")] },
    strengthen: { clinic: [X("SC", "Leg press", "3 × 10–12, 3 s down", "Range as advised", "Quadriceps strength is the strongest predictor of knee function."), X("ECC", "Slow step-downs with mirror", "3 × 10", "Knee stays over the second toe", "Eccentric control and alignment."), X("CE", "Hamstring curl / Nordic progression", "3 × 6–8", "Slow lowering", "Hamstring strength protects the ACL."), X("CE", "Hip abduction machine or band", "3 × 12", "", "Hip strength stops the knee caving in.")],
      home: [X("ISO", "Wall sit", "3 × 30–45 s", "Comfortable angle", "Isometric quad strength; also eases pain."), X("FUNC", "Step-ups", "3 × 10 each leg", "Knee over second toe", "Stair strength."), X("ECC", "Slow step-down from a stair", "3 × 8, 3 s lowering", "Hips level", "Builds control on the way down, where knees hurt most."), X("SC", "Split squat holding a chair", "3 × 8 each", "", "Single-leg strength."), X("CE", "Band side steps", "3 × 10 each way", "", "Hip strength for knee alignment.", B), X("CORE", "Dead bug", "2 × 8 each side", "Lower back flat", "Trunk control reduces knee collapse on landing.", F)] },
    flourish: { clinic: [X("PLY", "Hop, land and change-of-direction drills", "As needed", "Knee over toes on landing", "Return to sport safely; land softly."), X("FUNC", "Floor sitting and squat progression", "As needed", "Indian-style toilet, cross-legged", "Indian daily-life demands.")],
      home: [X("AER", "Walking or cycling", "30 min, 5 days a week", "", "Builds endurance and keeps weight healthy."), X("SC", "Strength routine", "2–3 times a week", "", "Keeps the knee strong."), X("FUNC", "Gradual floor sitting and squatting", "Start 2–3 min, build up", "Cushion under the hips", "Regains comfortable floor use.", F), X("NEU", "Single-leg balance on a pillow", "3 × 30 s", "", "Advanced balance and knee control."), X("NEU", "Single-leg reach (star excursion)", "3 × 5 each direction", "Knee over toes", "Hip, knee and ankle control together.")] },
  },

  ankle: {
    calm: { clinic: [X("LOAD", "Ice, compression, elevation and protected loading", "As needed", "Early after a sprain", "Controls swelling while allowing early weight-bearing."), X("MAN", "TENS or ultrasound", "10 min", "", "Pain relief."), X("LOAD", "Taping or brace", "As advised", "", "Protects the healing ligament.")],
      home: [X("MOB", "Ankle pumps", "20 reps every hour", "Point and pull", "Pumps out swelling."), X("MOB", "Alphabet with the foot", "Once, 3 times a day", "Big toe traces letters", "Restores movement in all directions."), X("ISO", "Isometric eversion and inversion", "5 × 20 s each", "Press foot against the other foot or wall", "Starts strengthening the ankle stabilisers."), X("LOAD", "Elevation", "15 min, 3 times a day", "Foot above heart", "Reduces swelling.")] },
    heal: { clinic: [X("MAN", "Ankle joint mobilisation", "As needed", "", "Restores dorsiflexion."), X("NEU", "Supported balance", "3 × 30 s", "", "Retrains ankle sensors.")],
      home: [X("ACT", "Short-foot / arch lift", "10 × 5 s", "Shorten the foot without curling toes", "Activates the small arch muscles."), X("CON", "Seated heel raises", "2 × 15", "", "Early calf strength."), X("CE", "Band ankle movements", "2 × 15 each direction", "", "Strengthens all ankle muscles.", B), X("FUNC", "Weight shifting", "10 reps", "Hold a chair", "Rebuilds confidence in weight-bearing.")] },
    mobilise: { clinic: [X("MAN", "Mobilisation with movement for dorsiflexion", "3 × 10", "", "Quick gains in ankle bend."), X("MAN", "Soft-tissue release to calf and plantar fascia", "As needed", "", "")],
      home: [X("MOB", "Knee-to-wall", "3 × 10 rocks", "Heel down, knee toward wall", "Dorsiflexion is key for squats, stairs and running."), X("STR", "Calf stretch, straight and bent knee", "3 × 30 s each", "", "Stretches gastrocnemius and soleus."), X("MOB", "Plantar fascia roll with a cold bottle", "2 min", "", "Eases arch tension."), X("ACT", "Toe yoga", "10 reps", "Lift big toe alone, then the others", "Improves foot muscle control.")] },
    strengthen: { clinic: [X("ECC", "Single-leg heel raise off a step", "3 × 12–15, 3 s lowering", "Full range", "Calf strength protects the Achilles and ankle."), X("NEU", "Wobble board / Y-balance reaches", "3 × 30 s", "", "Proprioception reduces repeat sprains by about a third."), X("CE", "Band eversion and inversion", "3 × 15", "", "Peroneal strength stops the ankle rolling."), X("CORE", "Single-leg balance with trunk rotation", "3 × 10", "Medicine ball", "Trunk control improves ankle stability.")],
      home: [X("CE", "Standing heel raises, progress to one leg", "3 × 15, 3 s down", "Slow lowering", "Builds calf strength for walking and running."), X("CON", "Bent-knee heel raises (soleus)", "3 × 15", "Knees bent", "The soleus takes up to several times body weight when running."), X("NEU", "Single-leg balance", "3 × 30 s", "Progress: eyes closed, pillow", "Retrains ankle reflexes."), X("FUNC", "Step-ups", "3 × 10", "", "Functional strength."), X("CE", "Band eversion", "3 × 15", "", "Stops the ankle rolling in.", B), X("END", "Heel-raise endurance", "1 × max reps, aim 25", "Full height each rep", "Calf endurance is typically low after ankle and Achilles injury.")] },
    flourish: { clinic: [X("PLY", "Hopping, jumping and agility", "As needed", "Soft landings", "Return to sport."), X("END", "Running progression", "As advised", "Walk-run intervals", "Gradual return to running.")],
      home: [X("FUNC", "Walking on uneven ground", "10 min daily", "Grass or sand", "Real-world balance."), X("SC", "Strength and balance routine", "2–3 times a week", "", "Prevents recurrence."), X("PLY", "Skipping when cleared", "3 × 1 min", "", "Builds spring and endurance.")] },
  },
};

const WHY_DEFAULT: Record<string, string> = {
  MAN: "Eases pain and stiffness so exercise is easier.", ACT: "Wakes up muscles that switch off with pain.",
  ISO: "Builds strength without moving a sore joint and can ease pain.", CON: "Builds strength as the muscle shortens.",
  ECC: "Slow lowering builds tendon and muscle resilience.", CE: "Strength through the full range, up and down.",
  MOB: "Restores easy movement.", STR: "Lengthens tight muscles that pull joints out of position.",
  POS: "Retrains better posture habits.", CORE: "Trunk stability protects the spine and transfers force.",
  SC: "Builds strength for work, home and sport.", END: "Lets muscles work longer without tiring.",
  FUNC: "Practises the real tasks you need to do.", NEU: "Improves balance and joint position sense.",
  PLY: "Builds speed and spring for sport.", NRV: "Helps an irritated nerve glide freely.",
  BRE: "Relaxes overworked muscles and calms the nervous system.", AER: "Improves fitness and turns down pain sensitivity.",
  LOAD: "Reduces the load that's irritating the tissue.",
};
// Fill any blank "why" with a sensible default by exercise type.
Object.values(EX).forEach((region) =>
  PHASE_IDS.forEach((p) =>
    (["clinic", "home"] as const).forEach((w) =>
      region[p][w].forEach((e) => { if (!e.why || !e.why.trim()) e.why = WHY_DEFAULT[e.t] || "Supports recovery."; })
    )
  )
);

// ── Condition-specific protocol additions / avoid lists / skip lists ──────
export interface CondProtocol {
  calm?: Partial<PhaseExercises>;
  heal?: Partial<PhaseExercises>;
  mobilise?: Partial<PhaseExercises>;
  strengthen?: Partial<PhaseExercises>;
  flourish?: Partial<PhaseExercises>;
  avoid?: string[];
  skip?: string[];
}

export const EX_COND: Record<string, CondProtocol> = {
  derang: { calm: { home: [X("MOB", "Prone lying, then press-ups (repeated extension)", "10 reps every 2–3 hours", "Hips stay down; stop if pain spreads into the leg", "Repeated movement in the preferred direction often moves pain back toward the spine (centralisation), a good sign.", F)] }, avoid: ["Long slumped sitting", "Bending forward repeatedly early on"] },
  sten: { calm: { home: [X("MOB", "Knees-to-chest", "10 × 10 s", "Hug both knees gently", "Bending forward opens the space for the nerves.", F), X("MOB", "Sitting forward lean", "5 × 20 s", "Elbows on knees", "Quick relief when legs feel heavy.")] }, strengthen: { home: [X("AER", "Interval walking or cycling", "Walk until symptoms start, sit, repeat; build up", "Cycling leans you forward and is easier", "Builds walking distance; cycling is well tolerated in stenosis.")] }, avoid: ["Long standing or walking without breaks", "Backward bending exercises"], skip: ["Chair backbend"] },
  lrad: { heal: { home: [X("NRV", "Sciatic nerve slider", "10 reps, 2–3 times a day", "Sitting: straighten knee while looking up, bend while looking down; no pulling pain", "Restores nerve movement and can reduce leg pain.")] }, avoid: ["Prolonged sitting without breaks", "Lifting with a twist", "Forward bending with straight legs early on"] },
  crad: { heal: { home: [X("NRV", "Median nerve slider", "10 reps", "Head tilts toward the arm as the wrist bends back, then reverse", "Helps the irritated nerve root glide.")] }, avoid: ["Looking up for long periods", "Sleeping on your tummy", "Carrying heavy bags on one shoulder"] },
  cgh: { heal: { clinic: [X("MAN", "C1–C2 SNAG for rotation", "As indicated", "Clinician", "Targets the upper neck joint that causes cervicogenic headache.")], home: [X("MOB", "Self-SNAG with a towel for rotation", "6 reps each side", "Towel at the base of the skull, turn while pulling forward", "Keeps the top neck joint moving.")] }, avoid: ["Long periods with the chin poked forward", "Clenching the jaw"] },
  mnp: { avoid: ["Long phone use with the head bent down", "Sleeping on your tummy or with a very high pillow"] },
  rcrsp: { strengthen: { clinic: [X("CE", "Progressive cuff loading (heavy, low reps)", "3 × 6–8, 3 s lowering", "Progress weight weekly", "Progressive loading is as effective as surgery for most cuff-related shoulder pain.")] }, avoid: ["Repeated overhead lifting early on", "Sleeping on the painful side", "Lifting with the thumb pointing down", "Carrying loads with the arm held away from the body"] },
  froz: { mobilise: { home: [X("STR", "Sustained external rotation stretch", "5 min, twice a day", "Lie on back, stick helps the forearm fall out", "Long, gentle stretches help a tight capsule more than short forceful ones.", F)] }, avoid: ["Forcing stretches into sharp pain in the early phase"] },
  lat: { calm: { home: [X("ISO", "Isometric wrist extension (tendon analgesia)", "5 × 45 s, 70% effort if comfortable", "Elbow straight on a table", "Isometrics can reduce tendon pain for up to an hour.")] }, strengthen: { home: [X("ECC", "Flexbar / towel 'Tyler twist'", "3 × 15 daily", "Twist with the good hand, slowly untwist with the sore side", "Eccentric twist protocol improves tennis elbow in most patients.")] }, avoid: ["Gripping heavy objects with the palm down", "Wringing wet clothes by hand", "Long mouse use without breaks"] },
  med: { avoid: ["Repeated gripping with the palm up under load", "Throwing without warm-up"] },
  cts: { avoid: ["Sleeping with wrists bent", "Long typing or phone use with wrists bent", "Forceful repetitive gripping"] },
  dq: { avoid: ["Lifting a baby with the thumb spread wide (scoop with palms instead)", "Wringing clothes", "Long phone texting with the thumb"] },
  cub: { avoid: ["Leaning on the elbow", "Sleeping with the elbow fully bent"] },
  gtps: { calm: { home: [X("ISO", "Isometric abduction in standing", "5 × 30 s", "Press the outer foot into a wall, hips level", "Loads the gluteal tendons without squashing them.")] }, strengthen: { clinic: [X("SC", "Progressive hip abductor loading", "3 × 8, heavy", "Standing or side-lying with weight", "Load and education beat injections for gluteal tendinopathy at one year.")] }, avoid: ["Crossing legs", "Standing with weight hanging on one hip", "Lying on the sore side without a pillow between the knees", "Stretching the outer thigh hard"], skip: ["Figure-4 stretch on a chair", "Piriformis stretch on a chair"] },
  fai: { avoid: ["Deep hip bending with turning in (low chairs, deep squats)", "Sitting cross-legged for long periods early on"], skip: ["Figure-4 stretch on a chair"] },
  hoa: { strengthen: { clinic: [X("NEU", "Neuromuscular hip-knee alignment training (GLA:D-style)", "2 × 10 each drill", "Mirror feedback, knee over foot", "Structured exercise and education reduce OA pain and improve function.")] }, avoid: ["Low seats and deep squatting early on", "Stopping activity completely"] },
  koa: { strengthen: { clinic: [X("NEU", "Neuromuscular knee alignment training (GLA:D-style)", "2 × 10 each drill", "Mirror feedback, knee over foot", "Supervised exercise is first-line treatment for knee OA.")], home: [X("AER", "Low-impact aerobic exercise", "30 min, most days", "Walking, cycling, swimming", "Aerobic exercise reduces OA pain as well as strength work.")] }, avoid: ["Long kneeling or squatting early on", "Stopping activity completely (gentle movement helps)"] },
  pfp: { strengthen: { home: [X("CE", "Side-lying hip abduction + clamshells", "3 × 15", "Slow, hips stacked", "Combined hip and knee exercise works better than knee alone for kneecap pain.", F)] }, avoid: ["Deep squats with weight early on", "Long sitting with knees bent (straighten them every 30 min)", "Kneeling for long periods", "Running downhill"] },
  ptend: { calm: { clinic: [X("ISO", "Spanish squat / wall-sit isometric", "5 × 45 s", "Band behind knees, sit back, shins vertical", "Isometrics can reduce patellar tendon pain straight away.")] }, strengthen: { clinic: [X("CE", "Heavy slow resistance (leg press, hack squat)", "4 × 6–8, 3 s up 3 s down", "Every 3rd day", "Heavy slow resistance gives lasting improvement in patellar tendinopathy.")] }, flourish: { clinic: [X("PLY", "Jump-landing progression", "3 × 6", "Soft, quiet landings", "Reloads the tendon for sport.")] }, avoid: ["Sudden increases in jumping", "Deep squats with weight early on"] },
  acl: { strengthen: { clinic: [X("NEU", "Neuromuscular training: landing, cutting, perturbation", "3 × 8", "Knee over toe", "Neuromuscular training reduces ACL re-injury risk.")] }, avoid: ["Pivoting or cutting sports until cleared by tests", "Jumping and landing on a bent-in knee"] },
  men: { avoid: ["Deep squatting and Indian-style toilets early on", "Twisting on a bent knee", "Sitting cross-legged until cleared"], skip: ["Gradual floor sitting and squatting"] },
  las: { strengthen: { home: [X("NEU", "Balance programme", "10 min, 3 times a week for 12 weeks", "Single-leg, eyes closed, unstable surfaces", "Balance training halves the risk of re-spraining.")] }, avoid: ["Uneven ground and high heels early on", "Returning to sport without balance training"] },
  cai: { avoid: ["Sport without a brace or tape until balance is restored"] },
  achT: { calm: { home: [X("ISO", "Isometric calf hold", "5 × 45 s", "Up on toes, hold", "Settles tendon pain.")] }, strengthen: { home: [X("ECC", "Eccentric heel drops (Alfredson), straight and bent knee", "3 × 15 each, twice a day", "Rise on both, lower slowly on the sore leg off a step", "Eccentric calf loading improves most mid-portion Achilles tendinopathy.")] }, avoid: ["Sudden increases in running, hills or jumping", "Dropping below step level if the pain is at the heel bone", "Aggressive calf stretching for insertional pain"] },
  php: { strengthen: { home: [X("CE", "High-load heel raise with towel under toes (Rathleff)", "3 × 12, every other day, 3 s up 2 s hold 3 s down", "Towel rolled under the toes, add a backpack for load", "Loads the plantar fascia and gives faster relief than stretching alone.")] }, avoid: ["Walking barefoot on hard floors (wear soft-soled chappals indoors)", "Flat, unsupportive footwear", "Long standing on hard floors without breaks"] },
  ptt: { strengthen: { home: [X("CE", "Resisted inversion with band", "3 × 15", "Slow, controlled", "Strengthens the tendon that supports the arch.", B)] }, avoid: ["Flat footwear and barefoot walking", "Long walks on uneven ground early on"] },
  sij: { strengthen: { home: [X("CORE", "Side plank with top-leg lift", "3 × 10 s each", "Hips stacked", "Builds the lateral pelvic stability that unloads the SIJ.", F)] }, avoid: ["Standing on one leg to dress (sit down instead)", "Long asymmetric sitting, like sitting on one foot"] },
  piri: { avoid: ["Sitting on a wallet or hard seats for long periods", "Crossing legs"] },
  noci: { calm: { home: [X("AER", "Graded activity: baseline then +10% a week", "Daily", "Set a time, not pain, as the stop signal", "Pacing breaks the boom-and-bust cycle of persistent pain.")] }, avoid: ["Complete rest or avoiding all movement", "Pushing through big flares (pace activity instead)"] },
  itbs: { avoid: ["Sudden increases in running distance", "Running on a sloped road surface every day"] },
  tos: { mobilise: { home: [X("STR", "Scalene and pec minor stretch", "3 × 30 s", "Gentle", "Opens the space for the nerves and vessels.")] }, avoid: ["Carrying heavy bags on the shoulder", "Sleeping with arms overhead"] },
  whip: { avoid: ["Wearing a soft collar for long", "Avoiding all neck movement"] },
  nslbp: { avoid: ["Bed rest for more than a day or two", "Heavy lifting with a twist early on"] },
  facet: { avoid: ["Long standing with a sway back", "Repeated backward bending early on"] },
  inst: { avoid: ["Arm up and turned out behind you (like throwing) until cleared"], skip: ["Sleeper stretch"] },
  acj: { avoid: ["Push-ups, dips and bench press early on", "Sleeping on that side"], skip: ["Wall push-up plus"] },
  slap: { avoid: ["Heavy overhead lifting and throwing until cleared"] },
  mcl: { avoid: ["Side-to-side cutting and breaststroke kick early on"] },
  axspa: { avoid: ["Long periods without moving (stiffness builds)"] },
  rctear: { avoid: ["Heavy lifting away from the body until strength returns"] },
};

// ── Linked (kinetic-chain, multi-joint) exercises per region ─────────────
export interface LinkedExercise extends Exercise {
  link: string;
  ph: PhaseId;
  w: "clinic" | "home";
}
function L(link: string, ph: PhaseId, w: "clinic" | "home", ex: Exercise): LinkedExercise {
  return { ...ex, link, ph, w, multi: true };
}

export const LINKED: Record<string, LinkedExercise[]> = {
  cervical: [
    L("Upper back", "mobilise", "home", X("MOB", "Thoracic extension over a chair back", "10 reps", "Hands behind head, lean back over the chair top", "A mobile upper back takes load off the neck.")),
    L("Shoulder blades", "strengthen", "home", X("CE", "Prone or standing Y-raise", "3 × 10", "Thumbs up, shoulder blades down", "Lower trapezius gives the neck a stable base.")),
    L("Breathing", "heal", "home", X("BRE", "90/90 breathing", "5 breaths × 3", "Feet on a wall, exhale fully, ribs down", "Switches neck muscles off from breathing duty.", F)),
    L("Whole chain", "flourish", "home", X("FUNC", "Overhead reach with chin tuck", "3 × 10", "Reach up while keeping the head back", "Links neck posture to everyday arm use.")),
  ],
  thoracic: [
    L("Hips", "mobilise", "home", X("MOB", "Half-kneeling rotation", "10 each side", "Hips square, rotate the chest", "Separates upper-back rotation from the hips.", F)),
    L("Shoulders", "strengthen", "home", X("CE", "Band pull-apart to overhead", "3 × 10", "Arms straight", "Links upper back and shoulder blade strength.", B)),
    L("Core", "strengthen", "home", X("CORE", "Dead bug", "2 × 8 each side", "Lower back flat", "Trunk control keeps the upper back upright.", F)),
  ],
  lumbar: [
    L("Hips", "mobilise", "home", X("MOB", "90/90 hip switches", "10 each side", "Sit tall, rotate knees side to side", "More hip rotation means less twisting in the back.", F)),
    L("Hips", "strengthen", "home", X("CE", "Hip hinge with a broomstick", "3 × 10", "Stick touches head, upper back and tailbone", "Bending from the hips protects the back.")),
    L("Upper back", "mobilise", "home", X("MOB", "Open-book rotation", "10 each side", "Side-lying", "Upper-back rotation reduces lumbar twisting.", F)),
    L("Whole chain", "flourish", "home", X("FUNC", "Split-stance lift and turn", "3 × 8 each side", "Turn with the feet, not the back", "Practises lifting and turning safely.")),
  ],
  shoulder: [
    L("Upper back", "mobilise", "home", X("MOB", "Thoracic extension on a foam roller or towel", "10 breaths", "Arms overhead if comfortable", "An upright upper back gives the shoulder more room.", F)),
    L("Core and hips", "strengthen", "clinic", X("SC", "Half-kneeling cable or band press", "3 × 10 each", "Glute squeezed, ribs down", "Power for the arm comes from the legs and trunk.")),
    L("Whole chain", "flourish", "home", X("FUNC", "Step and reach / throw pattern", "3 × 8", "Step, rotate, reach", "Trains the leg-trunk-arm chain for sport and daily tasks.")),
    L("Neck", "heal", "home", X("POS", "Chin tuck with shoulder blade set", "10 × 5 s", "Both together", "Neck and shoulder posture work as a unit.")),
  ],
  elbow: [
    L("Shoulder blade", "strengthen", "home", X("CE", "Band rows", "3 × 12", "Shoulder blades back and down", "A strong shoulder means less elbow strain.", B)),
    L("Rotator cuff", "strengthen", "home", X("CE", "Band external rotation", "3 × 12", "Elbow by side", "Shoulder strength reduces elbow overload.", B)),
    L("Whole chain", "flourish", "home", X("FUNC", "Carry with neutral wrist", "3 × 20 steps", "Palm facing in, wrist straight", "Uses the whole arm for carrying, not just the forearm.")),
  ],
  wrist: [
    L("Elbow and forearm", "strengthen", "home", X("CE", "Forearm rotations with a hammer or bottle", "3 × 12", "Slow", "Forearm strength protects the wrist.")),
    L("Shoulder", "strengthen", "home", X("CE", "Wall push-up plus", "3 × 10", "Hands flat", "Shoulder stability reduces wrist strain in weight-bearing.")),
    L("Neck", "mobilise", "home", X("NRV", "Neck and arm nerve slider", "10 reps", "Head tilts toward the arm as the wrist extends", "Keeps the whole nerve pathway gliding.")),
  ],
  hip: [
    L("Lower back", "strengthen", "home", X("CORE", "Side plank", "3 × 20 s each", "Hips lifted", "Trunk and hip stability work together.", F)),
    L("Knee and ankle", "strengthen", "home", X("FUNC", "Step-down with knee alignment", "3 × 8 each", "Knee over second toe, hips level", "Hip strength controlling the whole leg.")),
    L("Ankle", "mobilise", "home", X("MOB", "Knee-to-wall ankle mobility", "3 × 10", "Heel down", "Ankle movement changes hip loading in squats and stairs.")),
    L("Whole chain", "flourish", "home", X("FUNC", "Lateral lunge", "3 × 8 each", "Hips back, chest up", "Multi-joint control for sport and floor transfers.")),
  ],
  knee: [
    L("Hip", "strengthen", "home", X("CE", "Side-lying hip abduction", "3 × 15", "Toes forward, slow", "Stops the knee caving inward.", F)),
    L("Hip", "strengthen", "home", X("CE", "Single-leg bridge", "3 × 8 each", "Hips level", "Glute strength supports the knee from above.", F)),
    L("Ankle", "mobilise", "home", X("MOB", "Knee-to-wall ankle mobility", "3 × 10", "Heel down", "Stiff ankles push extra load onto the knee.")),
    L("Foot", "heal", "home", X("ACT", "Short-foot arch lift", "10 × 5 s", "Shorten the foot, toes relaxed", "A stable arch helps knee alignment.")),
    L("Whole chain", "flourish", "home", X("NEU", "Single-leg reach (star excursion)", "3 × 5 each direction", "Knee over toes", "Hip, knee and ankle control together.")),
  ],
  ankle: [
    L("Hip", "strengthen", "home", X("CE", "Band side steps", "3 × 10 each way", "Band above knees", "Hip control improves ankle stability.", B)),
    L("Knee", "strengthen", "home", X("FUNC", "Step-ups", "3 × 10", "Knee over second toe", "Links ankle, knee and hip strength.")),
    L("Whole chain", "flourish", "home", X("NEU", "Single-leg balance with reach", "3 × 30 s", "Reach forward and to the side", "Trains the whole leg to protect the ankle.")),
  ],
};

export function isMulti(e: Exercise): boolean {
  return !!e.multi || ["FUNC", "SC", "PLY", "AER", "NEU", "CORE"].includes(e.t) ||
    /squat|lunge|step|deadlift|bridge|carry|push-up|row|plank|sit-to-stand|hinge|press|walk|cycling|swim/i.test(e.n);
}

// ── Breathing corrections (used inside programmes when a breath issue is noted) ──
export const BREATH_EX: Exercise[] = [
  X("BRE", "Diaphragmatic breathing", "5 min, twice a day", "One hand on chest, one on belly; belly rises, chest stays still", "Uses the main breathing muscle so neck and shoulder muscles can rest."),
  X("BRE", "360° rib breathing", "8 breaths × 3", "Hands on the sides of the ribs; breathe into the hands", "Restores rib movement, important for the upper back and shoulders."),
  X("BRE", "90/90 breathing", "5 breaths × 3", "Lie with feet on a wall, knees and hips at 90°; long slow exhale", "Resets ribcage and pelvis position and calms back muscles.", F),
  X("BRE", "Nasal breathing practice", "During walks and at rest", "Mouth closed, slow and quiet", "Nose breathing is calmer and supports good posture."),
  X("BRE", "Exhale-focused breathing (4 in, 6 out)", "5 min", "Longer out-breath than in-breath", "A long exhale calms the nervous system and lowers pain sensitivity."),
  X("BRE", "Breathing with movement", "During exercise", "Breathe out on effort, never hold your breath", "Prevents bracing and blood-pressure spikes during exercise."),
];

export function breathIssue(A: AssessmentState): boolean {
  const b = A.breath || {};
  const p = Object.keys(b.pattern || {}).filter((x) => b.pattern![x] && x !== "Normal diaphragmatic");
  const rr = parseInt(b.rr || "", 10);
  const cp = parseInt(b.cp || "", 10);
  return p.length > 0 || (!isNaN(rr) && rr > 16) || (!isNaN(cp) && cp < 20) || A.vy.breath === "upper" || A.vy.breath === "hold";
}

const REGION_AVOID: Record<string, string[]> = {
  cervical: ["Long phone use with the head bent down", "Sleeping on your tummy", "Carrying heavy bags on one shoulder", "Sudden neck cracking or forceful self-manipulation"],
  thoracic: ["Long slouched sitting", "Heavy lifting with twisting"],
  lumbar: ["Long sitting without breaks", "Lifting heavy loads with a twist", "Bed rest for more than a day or two"],
  shoulder: ["Sleeping on the painful side", "Repeated reaching overhead with load", "Lifting with the arm far from the body"],
  elbow: ["Heavy gripping with the palm down", "Wringing clothes by hand"],
  wrist: ["Long periods with wrists bent", "Forceful repeated gripping"],
  hip: ["Crossing legs", "Low seats early on", "Standing with weight on one hip"],
  knee: ["Deep squatting and kneeling early on", "Long sitting with knees bent", "Sudden twisting on a bent knee"],
  ankle: ["Uneven ground early on", "Unsupportive footwear", "Barefoot on hard floors if the heel hurts"],
};

export const GENERAL_CAUTIONS = [
  "Stop and call the clinic if pain spreads further down the arm or leg, or you get new numbness or weakness.",
  "Mild soreness after exercise is normal. Pain that stays worse the next morning means do a little less, not stop.",
  "Breathe normally during exercise. Do not hold your breath.",
  "If you have high blood pressure, diabetes or a heart condition, keep exercise moderate and follow your doctor's advice.",
];

function clonePhase(p: PhaseExercises): PhaseExercises {
  return { clinic: p.clinic.map((e) => ({ ...e })), home: p.home.map((e) => ({ ...e })) };
}

/**
 * Build the full Calm→Flourish programme for one region, applying
 * condition-specific additions/removals, linked cross-joint exercises and
 * breathing corrections, and respecting equipment constraints.
 */
export function fullProgramme(
  A: AssessmentState,
  region: string,
  opts?: { noFloor?: boolean; noBand?: boolean }
): RegionProgramme | null {
  const base = EX[region];
  if (!base) return null;
  const noFloor = !!opts?.noFloor;
  const noBand = !!opts?.noBand;
  const picked = pickedDx(A).map((d) => d.id);
  const skip = new Set(picked.flatMap((id) => EX_COND[id]?.skip || []));
  const filt = (list: Exercise[]) => list.filter((e) => (!noFloor || !e.floor) && (!noBand || !e.band) && !skip.has(e.n));

  const phases = {} as Record<PhaseId, PhaseContent>;
  for (const ph of PHASE_IDS) {
    const { clinic, home } = clonePhase(base[ph]);
    picked.forEach((id) => {
      const c = EX_COND[id]?.[ph];
      if (c?.clinic) clinic.push(...c.clinic);
      if (c?.home) home.unshift(...c.home);
    });
    const linked = (LINKED[region] || []).filter(
      (e) => e.ph === ph && (!noFloor || !e.floor) && (!noBand || !e.band) && !clinic.concat(home).some((x) => x.n === e.n)
    );
    linked.forEach((e) => (e.w === "clinic" ? clinic.push(e) : home.push(e)));
    const bSel: Record<string, number[]> = { calm: [0, 4], heal: [1, 2] };
    if (breathIssue(A) && bSel[ph]) {
      bSel[ph].forEach((i) => {
        const e = BREATH_EX[i];
        if (e && (!noFloor || !e.floor) && !home.some((x) => x.n === e.n)) home.push({ ...e, breath: true } as Exercise);
      });
    }
    phases[ph] = { ...PHASE_META[ph], clinic: filt(clinic), home: filt(home) };
  }
  const avoid = [...new Set([...picked.flatMap((id) => EX_COND[id]?.avoid || []), ...(REGION_AVOID[region] || [])])];
  return { region, phases, avoid, cautions: GENERAL_CAUTIONS };
}

export function pgmRegions(A: AssessmentState): string[] {
  const fromDx = pickedDx(A).map((d) => d.region).filter((r): r is Region => r !== "any");
  return [...new Set([...fromDx, ...A.regions])].filter((r) => EX[r]);
}
