# Showcase Workflow Reminder

Notes for next time I need to record a plugin demo.

## 1. Preparation & Automation

The script in `showcase/showcase.ts` drives the UI. Use the prep script to make sure the vault is clean and has the latest build.

- **Check Path**: If Obsidian moved, update `OBSIDIAN_PATH` in `showcase/showcase.ts`.
- **Run Prep**: `./showcase/prepare.sh` (builds plugin + sets up `.obsidian` in the demo vault).
- **Recording**: Open Screen Studio, then fire off the script:
    ```bash
    npx ts-node showcase/showcase.ts
    ```
- _Note_: Catch the window in Screen Studio during the 10s initial pause.

## 2. Voiceover (ElevenLabs)

Use the script in `showcase/voiceover.txt`.

- **Voice**: "Brian" or "Callum" usually sound best for this.
- **Breaks**: Keep the `<break>` tags for timing.

## 3. Post-Production (FFmpeg)

If the audio needs to be baked in manually:

```bash
ffmpeg -i screen_studio_export.mp4 -i voiceover.mp3 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 final_showcase.mp4
```

---

_Clean up temp-obsidian-data if things get weird._
