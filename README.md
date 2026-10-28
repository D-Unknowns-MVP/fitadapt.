
# FitAdapt: An Adaptive Workout Recommendation Application

FitAdapt is an adaptive workout recommendation application that combines the Technique for Order Preference by Similarity to Ideal Solution (TOPSIS) and computer vision to support personalized workout planning, exercise alternatives, performance tracking, and adaptive workout difficulty.

The application considers a user's fitness goals, target muscles, available equipment, workout environment, and performance to recommend suitable exercises and support progression over time.

> **Current implementation status:** FitAdapt currently uses a built-in exercise catalog and TOPSIS criteria, with user-specific data stored in browser `localStorage`. The project includes a MySQL schema and seed file, but a live MySQL database connection has not yet been implemented in the current application.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Project Objectives](#project-objectives)
- [Core Features](#core-features)
- [How FitAdapt Works](#how-fitadapt-works)
- [TOPSIS Recommendation System](#topsis-recommendation-system)
- [Computer Vision and Performance Tracking](#computer-vision-and-performance-tracking)
- [Adaptive Difficulty](#adaptive-difficulty)
- [Exercise Dataset](#exercise-dataset)
- [Technology Stack](#technology-stack)
- [Application Routes](#application-routes)
- [Project Structure](#project-structure)
- [Data Storage and Database Status](#data-storage-and-database-status)
- [Installation and Setup](#installation-and-setup)
- [Running the Application](#running-the-application)
- [Testing and Production Build](#testing-and-production-build)
- [Privacy and Limitations](#privacy-and-limitations)
- [Future Improvements](#future-improvements)

---

## Project Overview

FitAdapt is designed to make workout planning more personalized and adaptable. Instead of relying on a single fixed workout routine, the application considers the user's fitness goals, available resources, exercise preferences, and recorded performance.

TOPSIS is used to evaluate and rank exercise candidates against multiple criteria. Computer vision supports exercise monitoring through a smartphone camera. Recorded performance and user feedback can then inform adjustments to subsequent workouts.

The project focuses on a predefined exercise dataset and selected exercises supported by its current tracking implementation.

## Project Objectives

The objectives of FitAdapt are to:

1. Generate personalized workout plans based on fitness goals and available resources.
2. Recommend alternative exercises when a user cannot perform a selected exercise or lacks the necessary equipment.
3. Track selected workout performance using computer vision.
4. Adapt future workout difficulty according to recorded performance and user feedback.
5. Provide an accessible interface for viewing workout plans, executing sessions, and reviewing progress.

---

## Core Features

### 1. Personalized Workout Creation

FitAdapt creates workout plans using information such as:

- Fitness goals, including weight loss and muscle development.
- Target muscle groups or specific body areas.
- Available exercise equipment.
- Workout environment.
- Exercise difficulty and suitability.

The recommendation process uses the available exercise catalog and TOPSIS criteria to support exercise selection.

### 2. Alternative Exercise Recommendations

When a user cannot perform a recommended exercise or does not have the required equipment, FitAdapt can recommend alternative exercises.

The application evaluates candidate exercises against relevant criteria and ranks them using TOPSIS. The objective is to find alternatives that remain suitable for the user's goals and available resources.

### 3. Performance Tracking

FitAdapt uses MediaPipe Pose and a smartphone camera to monitor supported exercises.

Depending on the exercise and its tracking implementation, the application can record or estimate:

- Repetitions.
- Sets and workout completion.
- Range of motion (ROM).
- Performance information used by the application.

The camera-based tracker supports only the exercises and movement patterns implemented in the current application. It does not imply universal exercise recognition.

### 4. Adaptive Difficulty

FitAdapt uses workout performance and user feedback to support adjustments to future workout difficulty.

Relevant information may include completed repetitions, completed sets, and the user's reported experience of exercise difficulty.

The goal is to help the application recommend workouts that remain appropriate as the user's performance changes.

---

## How FitAdapt Works

The application follows this general workflow:

1. **Set fitness preferences:** The user provides the information needed to personalize workout recommendations.
2. **Generate a workout:** FitAdapt evaluates available exercises and creates a suitable workout plan.
3. **Recommend alternatives:** If an exercise cannot be performed, the recommendation process can identify suitable alternatives.
4. **Perform the workout:** The user follows the assigned exercises, using the camera tracker for supported movements.
5. **Record performance:** The application stores workout information in its current browser-based storage.
6. **Adapt future workouts:** Recorded performance and difficulty feedback inform subsequent workout recommendations.

The precise behavior of each step depends on the features implemented in the current application.

---

## TOPSIS Recommendation System

TOPSIS stands for **Technique for Order Preference by Similarity to Ideal Solution**.

It is a multi-criteria decision-making method that ranks alternatives according to their relative closeness to an ideal solution. In FitAdapt, it supports the evaluation of exercise candidates.

### Current TOPSIS Criteria

The built-in criteria are defined in:

`src/lib/fitadapt/catalog.ts`

| Code | Criterion | Weight | Type |
|---|---|---:|---|
| C1 | Fitness Goal Match | 0.250 | Benefit |
| C2 | Target Muscle Match | 0.200 | Benefit |
| C3 | Difficulty Suitability | 0.200 | Benefit |
| C4 | Equipment Availability | 0.100 | Benefit |
| C5 | Environment Compatibility | 0.100 | Benefit |
| C6 | Performance Suitability | 0.150 | Benefit |
| | **Total** | **1.000** | |

These are the weights defined in the current bundled catalog. They should be kept consistent with the criteria used by the actual recommendation implementation.

### Criteria Descriptions

- **Fitness Goal Match:** Evaluates how well an exercise supports the user's fitness objective.
- **Target Muscle Match:** Evaluates the relevance of the exercise to the selected muscle group.
- **Difficulty Suitability:** Evaluates whether the exercise difficulty is appropriate.
- **Equipment Availability:** Considers whether the required equipment is available.
- **Environment Compatibility:** Considers whether the exercise is suitable for the available workout environment.
- **Performance Suitability:** Considers the user's performance information when evaluating exercise candidates.

### General TOPSIS Process

The general TOPSIS method involves:

1. Constructing a decision matrix containing alternatives and criteria scores.
2. Normalizing the decision matrix.
3. Applying the criteria weights.
4. Identifying the ideal best and ideal worst solutions.
5. Calculating the distance of each alternative from the ideal solutions.
6. Calculating relative closeness scores and ranking the alternatives.

The resulting ranking helps determine which exercise candidates are most suitable according to the selected criteria.

**Implementation note:** The criteria and weights above describe the current catalog configuration. Consult the recommendation implementation before assuming that every stage of the general TOPSIS procedure is implemented in exactly this form.

---

## Computer Vision and Performance Tracking

FitAdapt uses MediaPipe Tasks Vision and the Pose Landmarker to obtain body landmarks from camera frames.

The project uses pose landmarks to support movement tracking and the calculation of basic movement measurements for supported exercises.

### General Tracking Workflow

1. The user opens a workout session.
2. The browser requests access to the smartphone camera.
3. Camera frames are processed by the pose-tracking implementation.
4. Detected landmarks and movement measurements support the exercise's tracking logic.
5. Supported repetition and movement metrics are recorded for the session.

### Technologies Used

- MediaPipe Tasks Vision.
- Pose Landmarker.
- Smartphone camera access through HTML5 MediaStreams.
- Canvas-based visualization and movement calculations.
- Browser-based inference using WebAssembly and the configured GPU delegate where supported.

The project includes the `pose_landmarker_full.task` model asset for pose tracking.

### Tracking Limitations

- Tracking is limited to exercises supported by the current implementation.
- Repetition counting and movement measurements depend on the exercise-specific tracking logic.
- Camera positioning, lighting, visibility, and movement can affect tracking results.
- The tracker should not be interpreted as a comprehensive medical assessment or a universal exercise-recognition system.

---

## Adaptive Difficulty

Adaptive difficulty uses recorded performance and user feedback to help guide future workout recommendations.

Relevant information includes:

- Completed sets and repetitions.
- Recorded workout performance.
- User-reported exercise difficulty.
- The application's available progression rules.

The purpose of adaptation is to make subsequent workout recommendations more responsive to the user's experience.

The exact adjustment rules should be understood from the application's current implementation rather than assumed to follow a particular training formula.

---

## Exercise Dataset

FitAdapt includes a predefined exercise catalog. The catalog supplies exercise information and associated attributes used by the recommendation system.

The current source files include:

- `src/lib/fitadapt/catalog.ts` — bundled exercise data and TOPSIS criteria.
- `src/lib/fitadapt/catalog.functions.ts` — catalog-loading function.
- `src/lib/fitadapt/useCatalog.ts` — catalog access and fallback behavior.
- `database/fitadapt_mysql.sql` — MySQL schema and seed data.
- `public/fitadapt_mysql.sql` — a copy of the MySQL SQL file.

The project also contains pose-related reference assets, including:

- `exercise_angles.csv.asset.json`
- `pose-reference.json`

These assets support the dataset and pose-reference functionality available in the application.

The application includes a dataset page for inspecting available exercise and pose-reference information.

**Important:** The existence of a dataset file does not mean the application is retrieving the dataset from MySQL. The current catalog-loading implementation returns the bundled seed data.

---

## Technology Stack

The project uses the following technologies and tools.

| Technology | Purpose |
|---|---|
| React 19 | User interface |
| TypeScript 5.8 | Application logic and type checking |
| TanStack Start | Application framework and server-side capabilities |
| TanStack Router | Route management |
| Vite 8 | Development and build tooling |
| Bun | JavaScript runtime and package management |
| MediaPipe Tasks Vision | Pose landmark detection |
| HTML5 MediaStreams | Smartphone camera access |
| Canvas | Pose visualization and movement calculations |
| Tailwind CSS 4 | Styling |
| Recharts | Charts and data visualization |
| Vitest | Testing |
| MySQL | Intended persistent database integration |
| XAMPP and phpMyAdmin | Intended local MySQL environment |

The presence of MySQL in the intended technology stack does not mean that the current application is already connected to a running MySQL server.

---

## Application Routes

The current application includes the following routes.

| Route | Purpose |
|---|---|
| `/` | Onboarding and initial workout preferences |
| `/plan` | Workout planning and recommendations |
| `/session` | Workout session and exercise tracking |
| `/progress` | Workout progress information |
| `/dataset` | Exercise and pose-reference dataset information |

The exact content and interactions available on each page are determined by the current source code.

---

## Project Structure

The following is a high-level description of the important project paths.

```text
fitadapt/
├── database/
│   └── fitadapt_mysql.sql
├── public/
│   ├── fitadapt_mysql.sql
│   └── [public assets and pose model]
├── scripts/
│   ├── build_mysql_seed.ts
│   └── build_pose_reference.py
├── src/
│   ├── components/
│   │   └── fitadapt/
│   │       └── PoseTracker.tsx
│   ├── lib/
│   │   └── fitadapt/
│   │       ├── catalog.ts
│   │       ├── catalog.functions.ts
│   │       └── useCatalog.ts
│   └── routes/
│       ├── index.tsx
│       ├── plan.tsx
│       ├── session.tsx
│       ├── progress.tsx
│       └── dataset.tsx
├── package.json
├── bun.lock
└── README.md
```

This is a simplified overview, not an exhaustive listing of every file in the repository.

---

## Data Storage and Database Status

### Current Storage Implementation

The current application uses browser `localStorage` for user-specific information.

The storage key used by the application is:

`fitadapt:v1`

The stored information includes application state such as the user's profile, workout plan, session logs, and exercises marked as unavailable.

The exercise catalog and TOPSIS criteria are currently provided by the bundled application source code.

### Current MySQL Status

The project includes a MySQL schema and seed file at:

`database/fitadapt_mysql.sql`

The SQL file defines tables for information such as:

- TOPSIS criteria.
- Exercises.
- Equipment.
- Exercise equipment relationships.
- Secondary muscles.
- Exercise environments.
- Exercise goal scores.

However, the current catalog-loading function returns bundled seed data instead of retrieving records from a live MySQL database.

Therefore, **the SQL file is not currently the application's active data source**.

### Intended MySQL Migration

The planned database setup uses an existing MySQL database hosted locally through XAMPP and managed through phpMyAdmin.

The intended migration includes:

1. Exercise catalog and exercise attributes.
2. TOPSIS criteria and weights.
3. User profiles.
4. Workout plans.
5. Workout session logs.

The migration should preserve the application's four core features and existing user data.

### Migration Requirements

Before connecting the application to MySQL:

- Inspect the existing database and its tables.
- Reconcile the SQL schema with the existing database rather than blindly creating a separate database.
- Migrate existing catalog data and user-specific records without unintended duplication or data loss.
- Implement backend database access for reading and writing the required records.
- Replace or adapt the current storage and catalog-loading logic carefully.
- Preserve anonymous per-browser/device identity without requiring a login.
- Verify that workout planning, TOPSIS recommendations, camera tracking, progress, and difficulty adaptation still work.
- Keep existing Lovable Cloud dependencies until their purpose and replacement requirements have been verified.

**Do not assume that importing the SQL file alone completes the migration.** The application must also have a working backend connection and corresponding data-access logic.

---

## Installation and Setup

### Prerequisites

Install the tools required for the development environment:

- Bun or a compatible Node.js and npm environment.
- Git, if cloning the repository.
- A modern browser that supports the application's required web APIs.
- Camera access for supported computer-vision features.

MySQL and XAMPP are required for the intended database migration, but they are not currently required for the bundled catalog and browser-storage implementation to run.

### 1. Obtain the Project

Open a terminal in the project directory.

If the project has already been downloaded, navigate to its extracted folder:

```bash
cd fitadapt
```

Replace `fitadapt` with the actual directory name if necessary.

### 2. Install Dependencies

Using Bun:

```bash
bun install
```

Alternatively, if using npm:

```bash
npm install
```

Use the package manager and lockfile appropriate for the project to avoid unnecessary dependency changes.

### 3. Start the Development Server

Using Bun:

```bash
bun run dev
```

Or, if using npm:

```bash
npm run dev
```

Open the local URL printed in the terminal.

**Note:** The exact commands depend on the scripts defined in `package.json`. If a command is unavailable, inspect that file for the configured script names.

---

## Running the Application

Once the development server is running:

1. Open the application in your browser.
2. Complete the onboarding steps.
3. Configure your fitness preferences.
4. Generate or review a workout plan.
5. Use alternative exercise recommendations when needed.
6. Start a workout session.
7. Grant camera permission when prompted to use supported tracking features.
8. Review the available progress information.

Camera tracking requires a supported browser and permission to access the camera.

Because user-specific data is currently stored in browser `localStorage`, use the same browser and site origin when you want to access the same saved application state.

---

## Testing and Production Build

The project includes Vitest and uses Vite-based tooling.

Check `package.json` for the exact available scripts before running them.

Typical commands, when configured, include:

```bash
# Run tests
bun run test

# Run lint checks
bun run lint

# Build for production
bun run build

# Preview the production build
bun run preview
```

Equivalent npm commands can be used if the corresponding scripts are available.

A successful build does not by itself confirm that MySQL integration works. Database connectivity, data migration, and application behavior must be tested separately once the integration is implemented.

---

## Privacy and Limitations

### Browser Storage

The current browser-based storage approach means that user-specific data is associated with the browser and site origin.

- Data may not automatically synchronize across devices or browsers.
- Clearing site data can remove saved application information.
- Browser storage is not a substitute for a centralized database or a backup system.

### Camera Access

The application requests camera access for supported pose-tracking features. Camera availability and tracking quality depend on the browser, device, permissions, and recording conditions.

### Exercise Coverage

The application uses a predefined exercise catalog. Not every possible exercise is necessarily available or supported by the current tracking implementation.

### Recommendation Scope

TOPSIS recommendations depend on the exercise candidates, criteria, weights, and scoring data supplied to the recommendation process.

### Database Integration

The MySQL schema exists, but the current application is not yet connected to a live MySQL database. Persistent database storage and cross-device synchronization should not be considered implemented until the migration is completed and tested.

---

## Future Improvements

Potential improvements include:

1. **MySQL integration:** Connect the existing application to the intended MySQL database through a backend.
2. **Data migration:** Migrate exercise data, TOPSIS criteria, profiles, workout plans, and session logs while preserving existing data.
3. **Anonymous identity persistence:** Maintain a stable anonymous identity per browser or device without requiring a login.
4. **Data validation:** Validate user input, workout records, and database operations.
5. **Error handling:** Improve feedback for database failures, camera access problems, and unavailable exercise data.
6. **Testing:** Add and maintain tests for recommendations, session tracking, persistence, and adaptive difficulty.
7. **Backup and recovery:** Provide a safe way to back up and restore persistent workout information.

These are proposed improvements and should not be interpreted as features that are already implemented.

---

## License and Attribution

Add the project's actual license, academic references, and third-party attributions here as applicable.

If this project is being developed for academic evaluation, include the required project team details, adviser information, and citations in accordance with your institution's requirements.

---

**Project:** FitAdapt: An Adaptive Workout Recommendation Application  
**Recommendation Method:** TOPSIS  
**Computer Vision:** MediaPipe Pose  
**Current User Data Storage:** Browser `localStorage`  
**Planned Database:** Existing MySQL database managed through XAMPP/phpMyAdmin
