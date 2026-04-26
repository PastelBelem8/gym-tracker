# Fitness Progress Tracking Web App (Dual-User Logger)

## 1. Goal

Build a lightweight web app to log and track gym workouts for two users (self + partner) from a single interface. The system must support:

- Manual logging of workouts for two people
- Historical progress tracking per user
- Simple, mobile-friendly UI for fast gym-side entry
- Persistent cloud storage

**Current constraint**: partner does not bring a phone; one user logs both workouts.

## 2. Key Requirements (MVP)

### 2.1 Users

- Two hardcoded users: **Kat** (self) and **Suse** (partner). No authentication required; single shared access.
- The UI must make it easy to switch between viewing/logging for Kat vs. Suse, or comparing both on the same screen.

### 2.2 Exercise Creation

Either user can create exercises. The exercises will be associated with:
    - name 
    - list of urls (default empty array), 
    - type (whether it's dumbell, barbell, cable, machine, bodyweight), and a note. 
    - body_parts: a list of body parts that are being worked by this exercise ("chest", "traps", "...")
    - canonic_measure: defaults to lbs, every time the user logs an exercise, the final workout session should transform it to the canonic measure as associated to that exercise.
    - Each exercise will be associated with a unique id.


Example structure of Exercise:
```
{
  "name": "Chest Press",
  "urls": ["https://www.youtube.com/watch?v=n8TOta_pfr4"],
  "type": "machine",
  "body_parts": ["chest"],
  "canonic_measure": "lbs",
  "uuid": "uuid1",
}
```


### 2.3 Workout Logging

Each workout session is shared between both users. When a new gym session is started in the UI, two workout records are created in the background — one for Kat and one for Suse — both stamped with the same date. The logger then toggles between the two users in the UI to enter each person's exercises independently.

Each workout record has an owning user (Kat or Suse) and a date/time (defaults to current date).


Each workout entry is an ordered set of several logs, where each log is associated with:
- workout uuid
- exercise uuid
- weight per set
- weight measure (lbs, kg, s, min)
- and optional note


Example structure of exercise log:
```json
{
  "uuid": "log-uuid",
  "workout_uuid": "workout-uuid",
  "exercise_uuid": "exercise-uuid1",
  "sets": [
    {"reps": 8, "weight": 80, "measure": "lbs"},
    {"reps": 6, "weight": 85, "measure": "lbs"},
    {"reps": 6, "weight": 20, "measure": "lbs"}
  ],
  "notes": "felt strong"
}
```

**Interaction**: 
The UI should be dynamic, where the user can add the sets by clicking a "+" and specifying the weight and reps. The user has to confirm the set by clicking on a checkbox. When adding a new set, the UI should automatically add a 1 min timer, which will begin after the user checks the box.

Moreover, when the user first selects the exercise, it should assume that the user will do 3 sets and have the option to add as many sets as desired. The default values for sets and reps should match the ones from the last time that exercise was done. So, if Kat performed 3 sets of 12 lbs of "Chest Press" two days ago and is planning to do it again, the UI should preemptively populate those values. The user then has the ability of editing the numbers or clicking the checkbox.


**Storing data**: 
Each log allows the user to specify the different measures. However, when storing in the database, the backend should convert the user-specified measure to the canonic measure that is associated with the exercise. This will guarantee seemless progress tracking irrespective of gym modifications.


### 2.4 Progress Tracking Views

Provide simple dashboards:

- Per-user workout history (chronological list)
- Per-exercise progression chart:
    - max weight over time
    - or estimated 1RM trend (optional stretch goal)

Basic filtering:
- by user
- by exercise


### 2.5 Zero State Behavior

On first use, all collections are empty. Each page should handle this gracefully:

- **Log Workout**: No previous-workout defaults are shown; the set builder starts with 3 empty rows.
- **Dashboard**: Displays a "No workouts logged yet" message instead of an empty list.
- **Progress charts**: Display an empty axis with a "No data yet for this exercise" label rather than a blank or broken chart.
- **Exercise autocomplete**: Shows an empty dropdown with a prompt to create a new exercise.

## 3. Technical Stack

### 3.1 Frontend
- Static web app (preferred: simple SPA or vanilla JS / React)
- Deployable on GitHub Pages

Constraints:
- No backend server required for rendering UI
- All logic in frontend + database layer


### 3.2 Backend / Database

**Recommended: Supabase**
- Postgres tables for structured data storage
- Supabase JS SDK in frontend
- Pros: structured schema, easy SQL queries for analytics, generous free tier

Alternative: Firebase (Firestore)
- Document-based storage, real-time sync
- More setup friction for relational queries

### 3.3 Hosting
GitHub Pages for frontend static site
Supabase for backend data

**Important Clarification**:
Jekyll can be used for GitHub Pages, but not necessary
Recommendation: use Vite + React
Avoid Jekyll unless blog-like structure is needed


## 4. Data Model

Three Supabase (Postgres) tables:

### `exercises`
One row per exercise definition, shared across both users. `body_parts` and `urls` are stored as Postgres arrays.
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
name          text NOT NULL
type          text NOT NULL   -- 'dumbbell' | 'barbell' | 'cable' | 'machine' | 'bodyweight'
body_parts    text[]          -- e.g. ['chest', 'triceps']
canonic_measure text NOT NULL DEFAULT 'lbs'  -- 'lbs' | 'kg' | 's' | 'min'
urls          text[]          -- reference video links
note          text
```

### `workouts`
One row per user per session. Starting a new session inserts two rows (one per user) with the same date.
```sql
id      uuid PRIMARY KEY DEFAULT gen_random_uuid()
user    text NOT NULL    -- 'Kat' | 'Suse'
date    date NOT NULL DEFAULT CURRENT_DATE
```

### `exercise_logs`
One row per exercise performed within a workout. `sets` is stored as a JSONB array. Weights are converted to the exercise's `canonic_measure` at write time.
```sql
id             uuid PRIMARY KEY DEFAULT gen_random_uuid()
workout_id     uuid REFERENCES workouts(id)
exercise_id    uuid REFERENCES exercises(id)
sets           jsonb NOT NULL  -- [{"reps": 8, "weight": 80}, ...]
notes          text
```

`sets` element shape: `{"reps": integer, "weight": numeric}` — always in the exercise's `canonic_measure`.

Optional derived field (computed client-side): `total_volume = sum(reps × weight)` per set, in `canonic_measure`.

## 5. Frontend Pages

### 5.1 Log Workout Page
- User toggle: Kat / Suse
- "Start session" button — creates workout records for both users under today's date
- Exercise selector (autocomplete from `exercises` table)
- Set builder UI: starts with 3 rows pre-filled from last session; add/remove rows with +/−
- Per-set fields: reps, weight, measure (default to exercise's `canonic_measure`)
- Check box per set to confirm completion; triggers 1-minute rest timer
- Optional notes field per exercise log
- Save button writes the `exercise_log` document and converts weights to `canonic_measure`

### 5.2 Exercise Management Page
- List of all exercises with name, type, body parts
- Create new exercise: name, type, body_parts (multi-select), canonic_measure, urls, note
- Edit existing exercise
- No deletion (to preserve log history)

### 5.3 Dashboard Page
- Recent workouts feed (chronological, newest first)
- Filter by user (Kat / Suse / both)
- Filter by exercise name

### 5.4 Progress Page
- Select user and exercise
- Plots (all in `canonic_measure`):
    - Max weight per session over time
    - Total volume per session over time
    - Volume over time per body part (aggregate across exercises)


## 6. Non-Functional Requirements
- Fast input (< 30 seconds per workout entry)
- Mobile-first design
- Works offline gracefully (optional stretch: local cache + sync)
- Minimal UI friction
- Ability to populate database with exercises asynchronously

## 7. Suggested Architecture

```
Frontend (GitHub Pages)
    |
    | Supabase JS SDK (browser)
    v
Supabase (Postgres + Auth + Storage)
```

No backend server required. All reads and writes happen directly from the browser via the Supabase JS SDK.

## 8. Stretch Goals (Optional)
- PR tracking (personal records detection)
- Add Workout templates
- Weekly summary email
- Offline-first mode (IndexedDB sync)

## 9. Roadmap

- Phase 1: Data model + Supabase setup + log form                                                                                                       
- Phase 2: Dashboard (history + filters)                                                                                                                
- Phase 3: Progress charts                                                                                                                              
- Phase 4: Stretch goals (prioritized)

## 10. Key Design Principle

This system prioritizes:

“Fastest possible logging at gym, minimal UI friction, zero backend complexity.”