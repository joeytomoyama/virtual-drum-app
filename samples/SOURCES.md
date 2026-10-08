# Sample sources

Classic: original OQD files already present in this app; original download source unrecorded.

Electronic 808: Michael Fischer / Technopolis TR-808 Sound Sample Set, via https://github.com/tidalcycles/sounds-tr808-fischer at 85fbecf1bec32553395625ea659e2a56dfd7c0e1. Repository license: CC0-1.0 (see 808-LICENSE.txt).

Lo-fi: locally processed derivatives of the Electronic kit sounds (CC0 / Unlicense): 5.5 kHz low-pass, 35% 10-bit crushing, 85% gain, mono 22.05 kHz PCM WAV.

App filename → upstream file

- kick.wav → bd8/BD0050.WAV
- snare.wav → sd8/SD5050.WAV
- hihat-closed.wav → ch8/CH.WAV
- hihat-open.wav → oh8/OH50.WAV
- crash-left.wav → cy8/CY5050.WAV
- crash-top.wav: Sonic Pi / menegass drum_splash_hard.flac (CC0), via samblenny/web-midi-drumkit at 9a23295cb7f3f4611a69acd8e963ea6364658b5f. Original https://freesound.org/people/menegass/sounds/100060/. Processing: 700 Hz high-pass, 15% 12-bit crushing, gain 0.85.
- ride.wav: tidalcycles/uzu-drumkit rd/10_rd_switchangel.wav at 2f3e05c70ab4d73ad053a1467adec89bd27377a0 (Unlicense). Processing: 500 Hz high-pass, gain 0.85.
- tom-high.wav → ht8/HT50.WAV
- tom-mid.wav → mt8/MT50.WAV
- tom-floor.wav → lt8/LT50.WAV

The cymbal slots use three distinct sources: 808 crash, acoustic splash, and sampled ride. Lo-fi processing preserves that distinction. Additional license notices: Sonic-Pi-SAMPLES-LICENSE.md and uzu-LICENSE.txt.

Classic delivery files use MP3 (LAME VBR quality 0, highest VBR quality), with metadata stripped. Original WAVs are backed up outside the app in ../virtual-drum-classic-wav-backup. The unused OQD-Darkest-Crash.wav is also in that backup and is no longer deployed.
