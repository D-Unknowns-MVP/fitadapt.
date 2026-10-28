# FitAdapt — Adaptive Workout Recommendation System

> **An intelligent, privacy-preserving fitness web application combining Multi-Criteria Decision Making (TOPSIS), on-device Computer Vision pose estimation (MediaPipe), and rule-based dynamic difficulty adaptation.**

---

## 📋 Table of Contents
1. [Overview & Research Background](#overview--research-background)
2. [Core System Architecture](#core-system-architecture)
3. [Key Methodologies & Algorithms](#key-methodologies--algorithms)
   - [1. TOPSIS Recommendation Engine](#1-topsis-recommendation-engine)
   - [2. MediaPipe Computer Vision & Rep Tracking](#2-mediapipe-computer-vision--rep-tracking)
   - [3. Rule-Based Dynamic Adaptation](#3-rule-based-dynamic-adaptation)
4. [Dataset Integration (`exercise_angles.csv`)](#dataset-integration-exercise_anglescsv)
5. [Key Application Features](#key-application-features)
6. [Technology Stack](#technology-stack)
7. [User Installation Guide (PWA)](#user-installation-guide-pwa)
8. [Developer Setup & Local Installation](#developer-setup--local-installation)
9. [MySQL Database & XAMPP Configuration](#mysql-database--xampp-configuration)
10. [Automated Testing](#automated-testing)
11. [Authors & Academic Citation](#authors--academic-citation)

---

## 📖 Overview & Research Background

**FitAdapt** is an adaptive workout recommendation and tracking system developed from the Software Requirements Specification (SRS) by **D'Unknowns**. 

Traditional fitness applications either prescribe generic, static exercise routines or require expensive wearable sensors. FitAdapt addresses these limitations by:
- **Intelligently ranking exercises** based on individual user constraints (goals, fitness experience, environment, equipment access, and target muscle groups) using vector-normalized Multi-Criteria Decision Making (MCDM).
- **Tracking exercise repetitions and range of motion (ROM) in real time** through client-side computer vision without sending video feeds to external servers.
- **Dynamically adapting future workout difficulty** based on empirical performance data (completion rates, rep consistency, and perceived exertion).

---

## 🏗️ Core System Architecture

```text
+---------------------------------------------------------------------------------+
|                       CLIENT BROWSER / PWA (Mobile or Desktop)                 |
|                                                                                 |
|  +--------------------+   +-----------------------+   +----------------------+  |
|  |   User Profile &   |   |   TOPSIS Recommender  |   |   MediaPipe Pose     |  |
|  | 4-Step Onboarding  |-->|  - Vector Normalizer  |-->|  - WebAssembly / GPU |  |
|  |  (Goal, Gear, Env) |   |  - Closeness Coeff.   |   |  - Joint Angle Math  |  |
|  +--------------------+   +-----------------------+   |  - Hysteresis Counter|  |
|                                                       +----------------------+  |
|                                                                  |              |
|  +--------------------+   +-----------------------+              v              |
|  |  LocalStorage Sync |<--| Rule-Based Adaptation |<-- [ Session Reps / ROM ]   |
|  | (On-Device Privacy)|   |  - Progression/Regress|                             |
|  +--------------------+   |  - Auto-Swap Logic    |                             |
|                           +-----------------------+                             |
+---------------------------------------------------------------------------------+
                                      | (Optional Sync)
                                      v
+---------------------------------------------------------------------------------+
|                      LOCAL BACKEND (XAMPP / PHP / MySQL)                        |
|   - api/index.php (Lightweight REST controller)                                 |
|   - database/fitadapt_mysql.sql (39 exercises, criteria weights, goal mappings) |
+---------------------------------------------------------------------------------+
