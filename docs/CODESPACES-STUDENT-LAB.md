# Browser-only student lab test

1. Sign into your student test GitHub account and fork this repository.
2. In **your fork**, choose **Code → Codespaces → Create codespace on main**.
3. Wait for setup. The lab starts on port 5173. If it does not open automatically, open **Ports → Aircraft digital twin → Open in Browser**.
4. Keep the port private. Read Stage 1, enter your answers, and wait for “Draft saved in your Codespace.”
5. Click **Save checkpoint to GitHub**. Follow **View checkpoint** to confirm the commit belongs to your fork. Then select Stage 2.
6. Stop and restart the Codespace, and confirm the answers return.

No local downloads or terminal commands are needed for this normal workflow. If automatic startup fails, the recovery command in the Codespace terminal is `npm run student`.

## What this test covers

Stage answer forms, automatic workspace draft saving, explicit GitHub checkpoint creation, reload persistence, an editor for the three Week 6 implementation files, and running tests/build from the app. Generated files stay in the existing Markdown-based mission structure. A conflicting file change is rejected instead of overwritten. Failed pushes remain visibly unsynced, with a local commit retained for retry.

The test repository contains no completed student implementations, private reference checks, or completed answers. Independent reference verification is therefore unavailable: Stage 8 and the calculated experiment remain gated. This is a student workflow prototype, not the complete graded Week 6 release. AI generation is not integrated; approved code can be pasted into the Stage 11 editor.

Draft saving is different from a GitHub checkpoint. Work saved only inside a Codespace can be lost if that Codespace is deleted. GitHub is confirmed only after a successful push. Only the selected stage/file is committed. Existing staged changes require review before the app will commit. No force pushes or automatic merge resolution occur.

The initial test-repository commit protects the starting files. This is configuration protection, not evidence that absent Week 5 physics has been verified. Classroom baseline tags and instructor verification remain a separate release step.
