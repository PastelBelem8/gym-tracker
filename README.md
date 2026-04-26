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

- One main user (User A), may want to add information about multiple users such as itself and partner. It should be easy to switch between "self view" and "other user view", or even compare both in the same screen.
- No authentication system required for MVP (single shared access assumed)

User configs: Hard coded: "Kat", "Suse"

### 2.2. Exercise Creation

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
  "body_parts": "chest",
  "canonic_measure": "lbs"
  "uuid": "uuid1",
}
```


### 2.2 Workout Logging


Each workout is associated to an user and a set of exercises. 
Whenever a workout is first created in the UI, this will trigger two workout objects in the background one associated with each user.
Each workout has a user selection (A or B) and a date/time (defaults to current date)
The user can select in the browser which workout to log the data for (either user A or B).


Each workout entry is an ordered set of several logs, where each log is associated with:
- workout uuid
- exercise uuid
- weight per set
- weight measure (lbs, kg, s, min)
- and optional note


Example structure of exercise log:
```
{
  "user": "A",
  "date": "2026-04-25",
  "workout_uuid": "workout-uuid",
  "exercise_uuid": "exercise-uuid1",
  "sets": [
    {"reps": 8, "weight": 80, "measure": "lbs"},
    {"reps": 6, "weight": 85, "measure": "lbs"},
    {"reps": 6, "weight": 20, "measure": "lbs"},
  ],
  "notes": "felt strong"
}
```

**Interaction**: 
The UI should be dynamic, where the user can add the sets by clicking a "+" and specifying the weight and reps. The user has to confirm the set by clicking on a checkbox. When adding a new set, the UI should automatically add a 1 min timer, which will begin after the user checks the box.

Moreover, when the user first selects the exercise, it should assume that the user will do 3 sets and have the option to add as many sets as desired. The default values for sets and reps should match the ones from the last time that exercise was done. So, if the user A performed 3 sets of 12lbs of "Chest Press" two days ago, and is planning to do it again, the API should preemptively show that information. The user then has the ability of editing the numbers or clicking the checkbox.


**Storing data**: 
Each log allows the user to specify the different measures. However, when storing in the database, the backend should convert the user-specified measure to the canonic measure that is associated with the exercise. This will guarantee seemless progress tracking irrespective of gym modifications.


### 2.3 Progress Tracking Views

Provide simple dashboards:

- Per-user workout history (chronological list)
- Per-exercise progression chart:
    - max weight over time
    - or estimated 1RM trend (optional stretch goal)

Basic filtering:
- by user
- by exercise


### 2.4. Zero state behavior

In the beginning there is no state. So the plots are empty, there's no history, so the behavior should be 0. 

## 3. Technical Stack

### 3.1 Frontend
- Static web app (preferred: simple SPA or vanilla JS / React)
- Must be deployable on:
    - GitHub Pages (preferred for simplicity)
    - OR Firebase Hosting

Constraints:
- No backend server required for rendering UI
- All logic in frontend + database layer


### 3.2 Backend / Database

Preferred options:

- Option A (Recommended): Firebase
    - Firestore for data storage
    - Firebase SDK in frontend
Pros: real-time sync, minimal backend work

- Option B: Supabase
    - Postgres-based schema
    - Slightly more structured analytics

### 3.3 Hosting
GitHub Pages for frontend static site
Firebase/Supabase for backend data

**Important Clarification**:
Jekyll can be used for GitHub Pages, but not necessary
Recommendation: use Vite or simple static HTML + JS
Avoid Jekyll unless blog-like structure is needed


## 4. Data Model

**Collections / Tables** 

```json
{
  "user": "A",
  "date": "2026-04-25",
  "exercise": "Bench Press",
  "sets": [
    {"reps": 8, "weight": 80},
    {"reps": 6, "weight": 85},
    {"reps": 6, "weight": 20},
  ],
  "type": "barbell",
  "notes": "felt strong"
}
```

Optional derived fields: `total_volume = sum(reps * weight)`

## 5. Frontend Pages

### 5.1 Log Workout Page
User selector (A/B toggle)
Exercise input
Set builder UI (add/remove sets)
Measure specification (default to lbs)
Save button

### 5.2 Dashboard Page
Recent workouts feed
- Filter by user
- Filter by exercise

### 5.3 Progress Page
- Select exercise
- Plot:
    - max weight over time
    - or volume over time
    - volume over time for body part


## 6. Non-Functional Requirements
- Fast input (< 30 seconds per workout entry)
- Mobile-first design
- Works offline gracefully (optional stretch: local cache + sync)
- Minimal UI friction
- Ability to populate database with exercises asynchronously

## 7. Suggested Architecture
Frontend (GitHub Pages)
    |
    | Firebase SDK
    v
Firestore Database

No backend server required.

## 8. Stretch Goals (Optional)
- PR tracking (personal records detection)
- Add Workout templates
- Weekly summary email
- Offline-first mode (IndexedDB sync)

## 9. Roadmap

- Phase 1: Data model + Firebase setup + log form                                                                                                       
- Phase 2: Dashboard (history + filters)                                                                                                                
- Phase 3: Progress charts                                                                                                                              
- Phase 4: Stretch goals (prioritized)

## 10. Key Design Principle

This system prioritizes:

“Fastest possible logging at gym, minimal UI friction, zero backend complexity.”