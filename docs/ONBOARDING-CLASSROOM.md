# Aircraft onboarding pilot

This separate test repository contains twelve Chapter 6 control-authority missions and a changed-crosswind homework capstone. See [the chapter mapping](CHAPTER06-GAME-MAP.md). Release 2.0 replaces the earlier general-aerodynamics exercises and invalidates their old results while retaining the answer files. It does not publish the private Week 5 trim-response solution or the private Week 6 reference implementation.

## Student workflow

1. Fork this repository into your own account, then create a Codespace on your fork.
2. Open the forwarded **5173** port. If the app does not start, run `npm run student` in the Codespace terminal. No local installation is needed.
3. Open **Onboarding game**. Each training mission has eleven supplied sections and one section to complete. Use **Show all supplied sections** to read the worked packet.
4. Supply the missing section and select **Try my answer — run experiment**. Incomplete or malformed inputs need correction before running; incorrect but runnable answers produce comparisons and hints.
5. Inspect the comparison, revise if needed, and explain what the evidence supports and what it does not establish. Passing checks plus a reflection unlock the next mission. This is structural completion, not automatic grading of prose.
6. **Submit attempt to GitHub** commits and pushes the current answer, retained attempts, reflection, and Markdown specification to your fork. A changed submission creates another commit. An unchanged submission reuses the existing commit. Failed attempts can be submitted too.

Drafts save automatically in the Codespace. A temporary device copy protects typing during a failed save; a GitHub checkpoint is the durable shared record. An earlier result becomes stale when its answer changes. Older attempts remain in the JSON record, up to 100 per mission.

Mission 11 and the capstone run student code in a short-lived browser worker inside an opaque-origin sandbox with network access blocked. The instructor service never executes that code. Submitting these missions also exports three review artifacts under `student-work/onboarding/implementation/<mission>/`: `physics.js`, `feature.json`, and `verification.json`. They are separate from the legacy aircraft feature registry. The optional implementation prompt works with an already available coding tool; the pilot has no AI API dependency.

## Instructor local review

Run `npm ci`, then `npm run instructor:demo` and open `http://127.0.0.1:5180`. This is explicitly labeled sample mode, listens only on localhost, and makes no GitHub calls.

Run `npm run instructor` to monitor **real public forks** using the GitHub login already available through `gh`. No GitHub App or student authorization is needed. The dashboard discovers the test repository's public forks, watches the first 40, and reads their submitted files at immutable commits. A manual refresh discovers new forks; automatic discovery runs every five minutes and commit checks every minute. `gh auth status` helps diagnose account access failures.

Locally, the dashboard listens on localhost only. In an instructor Codespace, keep port 5180 private and open the secret dashboard link printed in the terminal. That temporary link establishes an instructor session and changes when the process restarts. It is not a student link. Student answers and code are read as data; student code is never executed by this service.

In this no-App mode, the reply boxes save **private instructor notes**, not messages delivered to students. The GitHub App option below is retained for authenticated in-app feedback, but it is not necessary to find forks or diagnose their submissions. The dashboard clearly distinguishes these modes. This pilot has verified discovery of the actual test-account fork; end-to-end in-app feedback still needs configuration and account testing.

## Optional authenticated feedback setup (not needed for monitoring)

In a Codespace on your instructor-owned copy of this test repository, run `npm run instructor:setup`. Open private port **5181** and select **Review read-only connection on GitHub**. GitHub asks you to approve the connection. The setup page supplies the settings and stores credentials privately; you do not need to copy secrets. Then run `npm run instructor` and follow the page's port 5180 instructions. This guided registration has not yet been exercised against a real GitHub account in this pilot.

The following manual setup remains available for administrators who already have an App.

## GitHub App and instructor Codespace setup

Create a GitHub App owned by the instructor, available for installation on student accounts. Request repository **Contents: read-only** and the mandatory **Metadata: read-only** permission. Subscribe to `push`. Request user authorization during installation. No repository write permissions are needed by the instructor service.

Use your instructor Codespace's forwarded 5180 HTTPS address for the App homepage, `<address>/callback` for the callback, and `<address>/webhook` for push delivery. Keep this Codespace and URL stable for the session. Store these environment variables as instructor Codespaces secrets, never in student repositories:

- `INSTRUCTOR_URL`: the HTTPS forwarded 5180 origin, without a trailing slash.
- `INSTRUCTOR_GITHUB_LOGIN`: your exact GitHub login.
- `INSTRUCTOR_SECRET`: a long random encryption secret retained across restarts.
- `GITHUB_APP_CLIENT_ID` and `GITHUB_APP_CLIENT_SECRET`: the App's OAuth credentials.
- `GITHUB_WEBHOOK_SECRET`: the secret configured on the App's webhook.

Run `npm run instructor`. Forward **5180**, then make only that authenticated service's port public so student Codespaces and GitHub webhooks can reach it. Keep the student workspace port 5173 private. The service itself requires GitHub sign-in; student sessions cannot access the instructor dashboard or another student's feedback. GitHub explains the [forwarded-port visibility rules](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace).

Students install the App for **their course fork only**, visit the instructor address, sign in, and enroll `their-account/intro-aero-student-workflow-test`. They then paste that address and the page's connection code into **Instructor feedback & classroom connection** in their student app. The code is feedback-only, expires after 24 hours, and is saved inside the Codespace's Git metadata, outside committed files. GitHub access tokens can expire earlier; the dashboard reports failures and students reconnect. GitHub App access is constrained by [both the App's and user's permissions](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app).

The service accepts up to 40 enrolled forks. Signed push notifications trigger reconciliation; a 60-second poll recovers missed notifications. It reviews immutable commit snapshots, checks protected core blobs against the instructor release, and recalculates structured answers using instructor-held packets. The dashboard refreshes every 30 seconds and shows failed checks, source revision, attempts, written reasoning, and connection errors. This is near-real-time review while the service runs, not an always-on service or a latency guarantee. Initial synchronization can take longer.

Use targeted hints, class announcements, or an explicit progression override. Overrides bind to the exact reviewed answer and need a written explanation. They expire in effect when that answer changes. Student-browser code results remain **code review required** in the dashboard; no hidden remote code grading is claimed. Existing student edits to core files are flagged rather than trusted.

The SQLite database and encrypted tokens live under `.instructor/private/onboarding/`, which is ignored by Git. **Export review backup** exports teaching records without credentials. Keep the Codespace and encryption secret to resume its session. No automatic cloud backup or restore UI is supplied in this pilot.

## Validation and release boundaries

Run:

```bash
npm run verify:core-boundary -- --base main
npm test
npm run build
node scripts/onboarding-protection.mjs
```

An instructor release regenerates the protected-file inventory with `node scripts/onboarding-protection.mjs --generate` after its final edits. Students must restore protected files rather than regenerate that inventory. The local check is a mistake detector, not tamper-proof grading; the instructor uses its own release hashes when reviewing forks.

Reusable public material: `src/core/onboarding/**`, `lessons/onboarding/**`, the student workspace integration, instructor service source, tests, and this setup guide. The completed supplied sections are intentionally new onboarding teaching examples. Student responses: only each student's fork under `student-work/onboarding/**`. Private runtime material: `.instructor/private/**`, environment secrets, and Git metadata. No original private instructor answer files, stability exceptions, ownership manifest changes, or classroom mirror changes are included.

No paid AI service or hosted backend is required. Codespaces usage remains subject to each GitHub account's allowance; stop Codespaces after class.
