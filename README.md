# Hearsay

**Is this voice real, or AI-generated?** Upload a recording and Hearsay gives it a score from 0 (real) to 1 (synthetic), in a fast mode or a more careful one.

🏆 **1st place, National Security Agency (NSA) HEARSAY challenge, HackGT 13** (September 2026), entered as **team Keeper**. Keeper had the lowest error of every entry on the hidden test set: minDCF **0.0147**, about 41% below 2nd place.

**[Live site](https://hearsay-ai.tech)**: the listening game is open to everyone. Analyzing your own audio needs an access code.

Built solo by [Alex Picon](https://github.com/alexpicon) — Keeper was a one-person team.

### Official leaderboard

Posted by the NSA challenge organizers in the HackGT Discord on September 27, 2026 ([screenshot](docs/nsa-leaderboard-2026-09-27.png)):

| Team | minDCF |
|---|---|
| **Keeper** | **0.0147** |
| Hearsay-hgt13 | 0.0248 |
| SideQuests | 0.0273 |
| GeorgiaMellon | 0.03129 |
| Cross Exam | 0.073 |
| Gemini | 0.1027 |
| Proof Voice | 0.1752 |
| Verity | 0.1773 |

The remaining entries were near 1.0. The organizers' note alongside the table: *"since there is so much bunching at top the remaining documentation and explainability are crucial for the challenge winners."* minDCF was 60% of the grade; creativity and documentation were the other 40%, and the published points formula compressed the top of the table hard enough that those 40 points decided the placings.

## What it does

- **Two modes.** *Speed* runs the original detector on up to 12 seconds of audio. *Accuracy* samples three spaced windows and adds a trained decision head on top. You can also run both on the same clip and compare them.
- **A listening game.** 44 real/fake pairs across 14 speakers. Play both clips, guess which one is synthetic, and see how hard it is by ear.
- **Honest output.** A score is a decision signal, not a calibrated probability and not proof. The site says so next to every result.

## How it works

1. **Pretrained speech features.** A frozen [XLS-R](https://huggingface.co/facebook/wav2vec2-xls-r-300m) backbone turns audio into speech representations. Hearsay never retrains it.
2. **Small trained heads.** Classifiers trained on public spoofing data (ASVspoof, VCTK) sit on top, matched to the challenge audio's length, noise and frequency profile.
3. **Fusion.** Accuracy mode combines that path with the original detector and a validation-selected operating point.
4. **Sandboxed inference.** Workers run offline in Docker with a read-only filesystem and no secrets mounted. Uploaded recordings are deleted after processing.

The challenge submission is in [`hearsay/submissions/`](hearsay/submissions/README.md): scores for all 1,671 challenge recordings, with validation records.

## Limits

- Scores are not calibrated confidence. A high score doesn't prove a recording is fake, and a low one doesn't prove it's real.
- The final model was trained on all available labeled data, including ASVspoof's evaluation partition, so it has no untouched holdout of its own. See [`hearsay/docs/detector.md`](hearsay/docs/detector.md) for the full caveats.

## Repository layout

```
hearsay/
├── apps/hearsay-compare/   website: upload, compare modes, listening game
├── server/                 FastAPI app serving the site and API
├── hearsay/                original detector, Accuracy model, submission files
├── deploy/                 server, Nginx and service setup
├── tests/                  website and API tests
└── tools/                  helper scripts
```

## Run it locally

```sh
uv sync
uv run uvicorn server.main:app --host 127.0.0.1 --port 8888
```

Inference needs the pinned Docker images and pretrained weights described in [`deploy/README.md`](deploy/README.md). The original model CLI lives in `hearsay/` (`cd hearsay && uv sync`).

## Tests

```sh
uv run python -m unittest discover -s tests -p test_hearsay_compare.py -v
```

## Credits and license

Hearsay is proprietary software of Alexander Picon and Chaski AI; all rights reserved (see [`LICENSE`](LICENSE)). The source is public to read, but not licensed for reuse. The pretrained models keep their own licenses. Notably, DF-Arena is for research and non-commercial use only. Details are in [`MODEL_CREDITS.md`](apps/hearsay-compare/MODEL_CREDITS.md). Sample-audio credits are in [`samples/README.md`](apps/hearsay-compare/samples/README.md), and portrait sources and licenses are in [`portraits/catalog.json`](apps/hearsay-compare/portraits/catalog.json).
