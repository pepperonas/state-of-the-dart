/**
 * The public changelog shown in the app (0.50.0). English only, written for
 * players: no internals, nothing about security, infrastructure, admin tools,
 * costs or prices. The developer changelog (CHANGELOG.md) stays in the repo.
 * Add an entry here with every release a player would notice.
 */
export interface PublicRelease { version: string; date: string /* YYYY-MM-DD */; title: string; items: string[] }

export const PUBLIC_CHANGELOG: PublicRelease[] = [
  {
    version: '0.50.0',
    date: '2026-11-22',
    title: 'Italian, Spanish and French',
    items: [
      'The app now speaks Italian, Spanish and French, besides German and English. Choose the language in the settings.',
      'Without an account the app starts in your browser\'s language.',
      'This changelog: tap the version number at the bottom of a page, or open it from your account under Help.',
    ],
  },
  {
    version: '0.49.3',
    date: '2026-11-22',
    title: 'Reported bugs fixed',
    items: [
      'Fixed: taking a visit back and entering it again no longer counts it twice towards achievements and streaks.',
      'The "Perfect visit" achievement is no longer awarded, because it always came together with "Three in a Bed". Players who earned it keep it.',
      'Two achievements shared a name; the 500-visit one is now called "Sixty Machine".',
      'The statistics table in a game can now show the current leg or the whole match.',
      'An alternative checkout route now appears in blue on the board, and under the suggested route on phones.',
    ],
  },
  {
    version: '0.49.0',
    date: '2026-11-20',
    title: 'A free plan',
    items: [
      'There is now a free plan: after the trial you can keep playing X01, Cricket, Around the Clock and Shanghai with two players per game, your own players, bots up to level 5, two training modes, recent statistics and all achievements.',
      'Premium adds up to eight players per game, stronger bots, online matches, tournaments, every training mode, heatmaps, the full history, reports and the TV scoreboard.',
      'Locked features carry a premium badge and explain themselves with one tap.',
      'Exporting your data from the settings stays available to everyone.',
    ],
  },
  {
    version: '0.48.1',
    date: '2026-11-20',
    title: 'Deleted games stay deleted',
    items: [
      'Fixed: a paused game you deleted could come back the next time you opened the app.',
      'If deleting a game fails, the app now tells you instead of doing nothing.',
    ],
  },
  {
    version: '0.48.0',
    date: '2026-11-20',
    title: 'New start page',
    items: [
      'Visitors who are not signed in see a new start page that plays a nine-darter on a real board while the scoreboard counts along.',
      'Signing up and signing in are right on that page, at the top and again at the end.',
      'Real screenshots show the app on a laptop, a phone and a TV.',
    ],
  },
  {
    version: '0.47.2',
    date: '2026-11-19',
    title: 'Online: typed visits always count',
    items: [
      'Fixed: in online games a score typed right at the start of a new leg could be dropped and the game would wait.',
      'If a checkout arrives after the score has already moved on, you are asked to enter it again.',
    ],
  },
  {
    version: '0.47.1',
    date: '2026-11-19',
    title: 'Online: no double checkouts',
    items: [
      'Fixed: in online games pressing Enter in a new leg could send the previous checkout a second time.',
    ],
  },
  {
    version: '0.47.0',
    date: '2026-11-19',
    title: 'Account in the navigation',
    items: [
      'The navigation has a fifth destination, Account, one tap away from every page.',
      'Settings, subscription, the guide, keyboard shortcuts, contact and bug reports are all listed there.',
      'Sub-pages now highlight the section they belong to, and Back leads there.',
      'The app title fits on one line on phones again.',
    ],
  },
  {
    version: '0.46.1',
    date: '2026-11-19',
    title: 'Bigger titles, nothing cut off',
    items: [
      'Page and section titles are noticeably larger.',
      'Fixed: the last letter of slanted titles and scores was cut off.',
      'Fixed: the footer appeared twice on the start page.',
    ],
  },
  {
    version: '0.46.0',
    date: '2026-11-19',
    title: 'A new arcade look',
    items: [
      'The app has a new look: raspberry as the main colour, warm surfaces and gold accents.',
      'Titles, scores and ranks use a bold comic-style typeface, and scores have an arcade-style shadow that jumps on every change.',
      'The start wheel and the app icon use the new colours, and the light mode follows the same palette.',
    ],
  },
  {
    version: '0.45.0',
    date: '2026-10-26',
    title: 'Quick match with up to 8 players',
    items: [
      'From five players on the scoreboard gets more compact, so eight players, the current thrower and the full input fit on one screen.',
      'The player who throws next is marked.',
      'Player selection shows the throwing order as numbers.',
      'On phones the input scrolls fully into view at every turn change, so Confirm is never below the edge.',
    ],
  },
  {
    version: '0.44.0',
    date: '2026-10-22',
    title: 'Slower, clearer game animations',
    items: [
      'After a visit the thrower stays big for a moment, the points land as a large stamp and the remaining score counts down.',
      'The next player arrives more slowly, with their name building up letter by letter and a glowing ring.',
      'A 180 stays on screen for almost three seconds, won legs a little longer. Typing still works immediately.',
    ],
  },
  {
    version: '0.43.0',
    date: '2026-10-13',
    title: 'One consistent look',
    items: [
      'The setups of X01, Cricket, Around the Clock and Shanghai now look like every other page.',
      'Main buttons share one colour everywhere; green now only means "hit" or "done".',
      'The report-a-bug button no longer floats over the content; it sits in the navigation or the title bar.',
      'Leaderboard filters scroll in a single row, and the statistics headline numbers sit side by side on phones.',
    ],
  },
  {
    version: '0.42.0',
    date: '2026-10-13',
    title: 'Heatmap follows the thrower',
    items: [
      'The live heatmap always shows the player who is throwing. You can switch to someone else, and it returns to the current player at the next turn.',
      'The visit history is now a score sheet: one row per round, one column per player, with points and remaining score.',
      'Tapping a cell opens the correction.',
    ],
  },
  {
    version: '0.41.0',
    date: '2026-10-13',
    title: 'New app icon',
    items: [
      'The app icon is now a bold dartboard with a dart in the bull, easy to recognise in a browser tab and on the home screen.',
      'Small sizes get a simplified version with thicker rings.',
    ],
  },
  {
    version: '0.40.0',
    date: '2026-10-13',
    title: 'Small fixes',
    items: [
      'Redo now survives a page reload.',
      'The correction button on desktop is called "Apply" and is no longer cut off.',
      'Fixed: the radar chart in the statistics could reach past its edge.',
    ],
  },
  {
    version: '0.39.0',
    date: '2026-10-13',
    title: 'Calmer achievements and lists',
    items: [
      'Achievement cards show their tier through the badge shape and colour, with tier and rarity written below.',
      'Achievement filters are a row of categories, a range picker and an "unlocked only" switch.',
      'The leaderboard shows medals as a coloured stripe with the place number.',
      'In the player list, statistics and rename stay one tap away; main profile and delete moved into a menu.',
    ],
  },
  {
    version: '0.38.0',
    date: '2026-10-13',
    title: 'Tidier home and statistics',
    items: [
      'Every game mode has its own symbol on the home screen.',
      'Colours follow one rule: playing, practising and reviewing each have their own.',
      'Statistics open with three big numbers (games, win rate with a ring, average) and calm tiles below.',
      'The pie chart is gone; the ring says the same.',
    ],
  },
  {
    version: '0.37.0',
    date: '2026-10-13',
    title: 'Calmer game screen',
    items: [
      'The leg rank in player rows is now a small badge on the avatar, so it no longer reads as part of the score.',
      'Below the number pad there is only one filled button: Confirm. It also accepts a typed total.',
      'Backspace on the number pad deletes the last digit first, then the last dart.',
      'A "Keyboard shortcuts" link leads to the overview.',
    ],
  },
  {
    version: '0.36.0',
    date: '2026-10-13',
    title: 'One page frame everywhere',
    items: [
      'Every page has the same header with back, title and actions in one line, and the title no longer jumps when you switch pages.',
      'Statistics, Achievements and Players no longer have a back button; the navigation leads there.',
      'Fixed: the player picker on the achievements page was empty.',
      'Fixed: wording for a single paused game, and players without games now show a dash instead of 0.00.',
    ],
  },
  {
    version: '0.35.2',
    date: '2026-10-13',
    title: 'Player rows match the tiles',
    items: [
      'The average is highlighted in player rows.',
      'A small bar shows the way to victory: one mark per leg needed, won legs filled.',
    ],
  },
  {
    version: '0.35.1',
    date: '2026-10-13',
    title: 'Bigger player avatars',
    items: [
      'Avatars fill more of their circle and the circles are a step larger, in games, lists, leaderboards, statistics and profiles.',
      'The large avatar on win screens and profiles now grows on desktop.',
      'Average, darts and legs on the player card are shown as matching tiles.',
    ],
  },
  {
    version: '0.35.0',
    date: '2026-10-12',
    title: 'Redo and every emoji',
    items: [
      'Took back too many visits? Redo brings them back one at a time, in order, even across the end of a leg. Ctrl+Shift+Z and Ctrl+Y work too.',
      'The avatar picker has an Emoji tab with every emoji in nine groups, skin tones and search in German and English.',
      'Fixed: when creating a player on a phone the name field was squeezed.',
    ],
  },
  {
    version: '0.34.0',
    date: '2026-10-12',
    title: 'Turn change as a relay',
    items: [
      'After a visit the thrower stays big for a moment, the points land as a stamp and the remaining score counts down.',
      'Then the next player\'s card opens from their row, with their name building up letter by letter.',
      'Input stays free the whole time, so fast typing still goes to the right player.',
      'Fixed: avatar and score were briefly stretched while the card grew.',
    ],
  },
  {
    version: '0.33.0',
    date: '2026-10-12',
    title: 'New player avatars',
    items: [
      '165 new avatars: animals, fantasy, sport, pub, music, nature and vehicles.',
      'They follow the light and dark theme and can be found by name in the avatar picker.',
      'Fixed: the avatar picker now closes after you choose.',
    ],
  },
  {
    version: '0.32.1',
    date: '2026-10-11',
    title: 'Smooth start wheel',
    items: [
      'Fixed: the text next to the start wheel flickered and the wheel stuttered while spinning.',
    ],
  },
  {
    version: '0.32.0',
    date: '2026-10-11',
    title: 'Correct totals, honest heatmap',
    items: [
      'Undo brings a typed visit back as its total, so you can type the right number and press Enter.',
      'Any earlier visit in the current leg can be corrected, as a total or dart by dart; later scores update automatically.',
      'Typed totals no longer count in the heatmap, which used to turn every 60 into an invented treble 20.',
      'After a typed visit the app suggests likely ways it was thrown; one tap makes the darts exact.',
      'Fixed: undo could add a visit to the saved heatmap a second time.',
    ],
  },
  {
    version: '0.31.4',
    date: '2026-10-11',
    title: 'Full-screen start wheel',
    items: [
      'The start wheel now fills the screen, with title and buttons beside it on wide screens.',
      'Names and symbols grow with the screen, and a spin lasts about 6.5 seconds.',
    ],
  },
  {
    version: '0.31.3',
    date: '2026-10-11',
    title: 'Start wheel fixed and bigger',
    items: [
      'Fixed: the pointer on the start wheel spun wildly during a spin.',
      'The wheel is much larger, and on small phones the wheel and its buttons fit without scrolling.',
    ],
  },
  {
    version: '0.31.1',
    date: '2026-10-11',
    title: 'Flames are back',
    items: [
      'Fixed: the burning frame around the current player had disappeared.',
      'Avatar, name and score fly between the row and the large card again at every turn change.',
    ],
  },
  {
    version: '0.31.0',
    date: '2026-10-11',
    title: 'TV scoreboard',
    items: [
      'A new screen button opens the scoreboard in its own window for a TV, projector or second monitor.',
      'It follows every visit instantly and shows the current player\'s remaining score, the checkout route, averages, legs and recent visits.',
      'Big moments get the stage: 180s, tons, busts, won legs and the winner.',
      'Full screen with one button; cursor and buttons hide themselves.',
    ],
  },
  {
    version: '0.30.0',
    date: '2026-10-11',
    title: 'Insights and a real wheel',
    items: [
      'Match statistics, visit history, chart and live heatmap sit below the game in two columns, always open. On phones you switch between them with tabs.',
      'The "Who throws first?" wheel spins with real physics, and its pointer clicks at every peg with sound and vibration.',
      'The turn change is smoother: the card grows as a whole.',
    ],
  },
  {
    version: '0.29.0',
    date: '2026-10-11',
    title: 'Feedback and celebrations',
    items: [
      'Every visit gets feedback that grows with the moment: sparks from 100, and a 180 takes over the screen without blocking input.',
      'A won leg shows its numbers (darts, average, checkout) with a burst of confetti.',
      'New personal records appear live, such as highest visit or best 501 leg.',
      'Each level has its own vibration pattern, and a bust never sounds like a success.',
    ],
  },
  {
    version: '0.28.0',
    date: '2026-10-11',
    title: 'New game view',
    items: [
      'The current player gets a large card with the remaining score, checkout route, leg rank, darts, average and recent visits; everyone else is a compact row below.',
      'The remaining score appears only once; the input shows what the visit leaves.',
      'The layout adapts to every screen: input at thumb height on phones, two columns on tablets, three columns with dartboard and statistics on laptops.',
    ],
  },
  {
    version: '0.27.0',
    date: '2026-10-11',
    title: 'Triple in and triple out',
    items: [
      'At the start of a game you choose check-in and check-out as single, double or triple.',
      'Every player card shows how many legs are still needed to win.',
      'On desktop with mouse and keyboard the number pad starts folded away; touch devices keep it open.',
    ],
  },
  {
    version: '0.26.0',
    date: '2026-10-11',
    title: 'Motion in the game',
    items: [
      'Darts spring into their slots and out again when removed.',
      'A bust shakes the dart row, turns it red and says "Bust".',
      'After a visit the points rise from the player, and the number pad no longer jumps at turn changes.',
      'With reduced motion turned on, nothing loops endlessly.',
    ],
  },
  {
    version: '0.25.1',
    date: '2026-10-11',
    title: 'Leg rankings',
    items: [
      'Every player card shows the current place in the leg as a large coloured number.',
      'Equal scores share a place, and while everyone is level no place is shown.',
    ],
  },
  {
    version: '0.25.0',
    date: '2026-10-11',
    title: 'Faster play',
    items: [
      'Fixed: the turn changed only a second after confirming, so a visit typed in that second went to the previous player. The turn now changes immediately.',
      'Fixed: with automatic next player turned off the game got stuck; there is now a button (and Enter) for it.',
      'A small chip briefly shows the visit just booked.',
      'On phones a whole visit fits on one screen, and the dartboard helper can be folded away.',
      'The leg overlay closes with a tap or a key.',
    ],
  },
  {
    version: '0.24.0',
    date: '2026-10-05',
    title: 'Achievements checked and fixed',
    items: [
      'Several achievements unlocked when they should not have, for example for bots or from typed totals.',
      'Some achievements could never be unlocked; they now can.',
      'Daily streaks are counted correctly, and "under X" now really means under X.',
      'Achievements you already have stay unlocked.',
    ],
  },
  {
    version: '0.23.1',
    date: '2026-10-05',
    title: 'Averages recalculated',
    items: [
      'Averages from earlier games were recalculated with the corrected rule.',
    ],
  },
  {
    version: '0.23.0',
    date: '2026-10-05',
    title: 'Correct averages, clearer resume list',
    items: [
      'Fixed: a typed 60 could count as an average of 180. Every visit now counts as three darts, a checkout only the darts actually thrown.',
      'The resume list shows each paused game as a table with legs, remaining score and average, with the leg leader marked.',
    ],
  },
  {
    version: '0.22.0',
    date: '2026-10-05',
    title: 'Leg leader and won legs',
    items: [
      'The player card shows who leads the current leg.',
      'Won legs colour the legs tile, which bounces once when a leg is won.',
    ],
  },
  {
    version: '0.21.0',
    date: '2026-10-05',
    title: 'Numpad checkouts work',
    items: [
      'Fixed: typing your exact remaining score as a checkout with double out counted as a bust.',
      'Achievements during a leg stay at the top and close with a tap beside them.',
      'At the end of a leg or match achievements appear large in the centre and stay until you press Continue.',
    ],
  },
  {
    version: '0.20.0',
    date: '2026-10-04',
    title: 'Reload without losing darts',
    items: [
      'Reloading in the middle of a visit keeps the darts already entered.',
      'Fixed: the visit history and charts were missing in the game.',
      'From three players on, desktop places player cards on both sides of the input.',
      'The current player gets a burning card frame with flames.',
    ],
  },
  {
    version: '0.19.0',
    date: '2026-10-04',
    title: 'Bed-accurate heatmap',
    items: [
      'The heatmap now colours the real beds of the board by hit rate instead of drawing a blurred cloud.',
      'Fixed: bull hits and misses were drawn on the 6.',
      'Tap a bed for details; on phones the heatmap no longer gets cut off.',
    ],
  },
  {
    version: '0.18.0',
    date: '2026-09-27',
    title: 'Landscape on phones',
    items: [
      'On a phone in landscape, scores, darts, the whole number pad and Confirm now fit on screen.',
      'The account and export menus can be used with the keyboard.',
      'Achievement badges show their tier through their shape.',
    ],
  },
  {
    version: '0.17.0',
    date: '2026-09-27',
    title: 'Online matches playable',
    items: [
      'Online matches can be played to the end, with scoreboard, input (also by keyboard), checkout route, recent visits, winner screen and rematch.',
      'If your connection drops, your seat is kept for 60 seconds.',
      'Fixed: the throw-off did not alternate between legs online.',
    ],
  },
  {
    version: '0.16.0',
    date: '2026-09-26',
    title: 'Tournaments are saved',
    items: [
      'Tournaments are no longer lost on reload. Running tournaments can be resumed, finished ones viewed or deleted.',
      'Tournament modes and player selection can now be used with the keyboard.',
    ],
  },
  {
    version: '0.15.0',
    date: '2026-09-26',
    title: 'Achievements in English',
    items: [
      'All achievements now have English names and descriptions.',
      'Exports and new bots follow the app language.',
    ],
  },
  {
    version: '0.14.0',
    date: '2026-09-26',
    title: 'Accessibility and translation',
    items: [
      'Screen readers announce every visit, busts, won legs and matches, and undos.',
      'The app is fully translated; the English version no longer shows German text.',
      'All buttons have larger touch areas, and ? opens the keyboard shortcuts.',
      'Fixed: a crash in the training statistics and player names squeezed on phones.',
    ],
  },
  {
    version: '0.13.0',
    date: '2026-09-26',
    title: 'Readable in both themes',
    items: [
      'Text contrast was checked and improved on many screens in both themes.',
      'Charts follow the light and dark theme.',
      'Browser pop-ups were replaced by in-app dialogs and messages.',
    ],
  },
  {
    version: '0.12.0',
    date: '2026-09-26',
    title: 'One-tap rematch and navigation',
    items: [
      'The home screen has a large rematch card that starts the last pairing with the last settings in one tap.',
      'A new navigation bar (phones) and rail (tablets and up) leads to Home, Statistics, Achievements and Players.',
      'In games on phones a score strip shows all players, and the whole turn fits on one screen.',
      'A new input mode lets you enter each dart with one tap.',
      'New accounts get a short introduction.',
    ],
  },
  {
    version: '0.11.0',
    date: '2026-09-26',
    title: 'At the board: offline and awake',
    items: [
      'The app works offline and tells you when an update is ready, never during a game.',
      'After your first finished match the app offers to install itself.',
      'The screen stays on in every game mode, vibration works, and there is a mute button in games.',
      'The app remembers your last settings, players and input mode; the start wheel can be skipped.',
      'The end of a match offers undo, a table of all players and a rematch with alternating throw-off.',
    ],
  },
  {
    version: '0.10.0',
    date: '2026-09-26',
    title: 'Correct saving, undo and rules',
    items: [
      'Fixed: finished matches did not record their winner, so win achievements never counted.',
      'Fixed: saved Around the Clock, Shanghai and Cricket games disappeared on reload.',
      'Undo now reaches across legs and sets, and out of a match won by a checkout.',
      'Double in is now actually applied, and Cricket no longer replaces a running X01 match.',
      'Knockout tournaments end with a winner, and Bob\'s 27 and the sequence trainings follow the real rules.',
    ],
  },
  {
    version: '0.9.0',
    date: '2026-08-28',
    title: 'Redesign and own icons',
    items: [
      'The whole app has a new design with lively animations.',
      'Hand-drawn icons replace the emoji throughout the app, including achievements and avatars.',
      'Fixed: typing some totals on the number pad deducted too little, for example 140 instead of 141.',
      'Typing a total and pressing Enter now confirms the visit in one step, and a bust announces the thrown score.',
      'Player lists show real players before bots and guests, and every signed-in user can report a bug.',
    ],
  },
  {
    version: '0.8.5',
    date: '2026-03-14',
    title: 'Achievement fixes',
    items: [
      'The "Comeback King" description now matches how it unlocks.',
      'A duplicate marathon achievement was removed.',
    ],
  },
  {
    version: '0.8.4',
    date: '2026-03-04',
    title: 'Resume every game mode',
    items: [
      'Around the Clock, Shanghai and Cricket survive a page reload and appear in the resume list.',
      'A wheel decides who starts in those modes when two or more players play.',
      'Leaving a running game asks whether to pause, end it or stay.',
      'Shanghai supports undo of confirmed visits and confirms automatically after three darts.',
      'Private online rooms show a room code you can copy and share.',
    ],
  },
  {
    version: '0.8.3',
    date: '2026-03-04',
    title: 'Achievement contexts',
    items: [
      'Every achievement shows when it is triggered: per round, leg, match, career, training, event or meta.',
      'You can filter achievements by that context.',
      'Around the Clock has more reliable undo.',
    ],
  },
  {
    version: '0.8.2',
    date: '2026-02-27',
    title: 'Bust rules fixed',
    items: [
      'Fixed: resumed matches could detect busts incorrectly.',
      'Fixed: a remaining 1 was always a bust, even without double out.',
      'Impossible finishes such as 159 or 169 are now recognised.',
    ],
  },
  {
    version: '0.8.1',
    date: '2026-02-22',
    title: 'Achievement fixes',
    items: [
      'Fixed: several exact-score achievements unlocked together.',
      'With several achievement messages on screen, a button closes them all at once.',
    ],
  },
  {
    version: '0.8.0',
    date: '2026-02-22',
    title: '100 fail achievements',
    items: [
      'A new Fails category with 100 humorous achievements for misses, busts, low scores and lost legs.',
      'Fixed: entering darts in an unusual order could end a leg too early. An early checkout now shows a Checkout button instead.',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-02-22',
    title: 'Match history',
    items: [
      'A new match history page lists every finished match, with search, game type filter and pages.',
      'Each match opens into player statistics, a round chart, a heatmap per player, a leg overview and every dart thrown.',
      'Alternative checkout routes appear in their own cards.',
      'Achievement messages now stay until you close them and stack below each other.',
    ],
  },
  {
    version: '0.5.8',
    date: '2026-02-22',
    title: 'Reset includes achievements',
    items: [
      'Resetting a player\'s statistics now also resets their achievements.',
    ],
  },
  {
    version: '0.5.7',
    date: '2026-02-21',
    title: 'Unified player selection',
    items: [
      'All game modes use the same player selection cards.',
    ],
  },
  {
    version: '0.5.3',
    date: '2026-02-21',
    title: 'Legal pages in the app',
    items: [
      'Imprint, privacy policy and terms of use are now pages inside the app.',
      'Fixed: reloading the quick match screen could resume a paused game instead of showing player selection.',
    ],
  },
  {
    version: '0.5.2',
    date: '2026-02-21',
    title: 'Reset player statistics',
    items: [
      'A player\'s profile has a button to reset all their statistics; name and avatar are kept.',
    ],
  },
  {
    version: '0.5.1',
    date: '2026-02-21',
    title: 'Bug fixes',
    items: [
      'Fixed: deleting your account did not work.',
      'Fixed: some menu entries were not translated.',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-02-21',
    title: 'Pause several games',
    items: [
      'You can keep any number of matches paused at the same time.',
      'A resume screen lists paused matches with memorable names, score and players.',
      'Starting a new game pauses the running one automatically.',
    ],
  },
  {
    version: '0.4.4',
    date: '2026-02-21',
    title: 'Turn order fixed',
    items: [
      'Fixed: after a checkout the player starting the next leg could be skipped.',
    ],
  },
  {
    version: '0.4.3',
    date: '2026-02-21',
    title: 'Who unlocked it',
    items: [
      'Achievement messages show which player unlocked the achievement.',
    ],
  },
  {
    version: '0.4.1',
    date: '2026-02-21',
    title: 'Bug fixes',
    items: [
      'Fixed: after correcting a visit the same player could throw again.',
      'Fixed: with several achievements at once the progress counter did not count up.',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-02-21',
    title: 'Achievements rebuilt',
    items: [
      'Achievement messages are now cinematic, with a flash, confetti by tier and sound.',
      'Several achievements at once are shown one after another.',
      'New achievements for dart patterns, checkouts, match situations and special dates such as Christmas or New Year.',
      'Fixed: counts like games played and 180s now add up correctly.',
    ],
  },
  {
    version: '0.3.1',
    date: '2026-02-01',
    title: 'Stability fixes',
    items: [
      'Fixed: pausing a game and returning to the menu could show a blank screen.',
      'Fixed: the app could stop responding after a burst of activity.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-02-01',
    title: 'Around the Clock, Shanghai, online',
    items: [
      'New game mode Around the Clock: hit 1 to 20 in order, optionally finishing on the bull.',
      'New game mode Shanghai: score on a target number each round; single, double and treble of the same number wins at once.',
      'Online multiplayer with public and private rooms, live chat and up to four players.',
      'Bots now have personalities: aggressive, defensive, balanced and clutch.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-01-31',
    title: 'Cricket and tournaments',
    items: [
      'New Cricket mode with a marks scoreboard and quick input buttons.',
      'Tournaments as knockout (4 to 16 players) or round robin (3 to 8 players) with a live table.',
      'The app keeps working offline and catches up when the connection returns.',
      'The bull is larger and easier to tap.',
      'Paused matches are saved and shown on the home screen.',
    ],
  },
  {
    version: '0.1.11',
    date: '2026-01-31',
    title: 'Detailed heatmap',
    items: [
      'The heatmap shows your grouping centre and spread.',
      'New statistics for treble, double and bull rates.',
    ],
  },
  {
    version: '0.1.10',
    date: '2026-01-31',
    title: 'Search and pages',
    items: [
      'The player list and match history can be searched and browsed in pages.',
      'Match details show every visit per player.',
      'The dartboard in the game is larger for easier input.',
    ],
  },
  {
    version: '0.1.9',
    date: '2026-01-31',
    title: 'Avatars and undo fixes',
    items: [
      'A full emoji picker for player avatars.',
      'Tapping anywhere on a player in the list opens their details.',
      'Fixed: achievements were not always saved.',
      'Fixed: undo now resets statistics correctly, and an accidentally finished match can be continued.',
    ],
  },
  {
    version: '0.1.8',
    date: '2026-01-22',
    title: 'In-app guide',
    items: [
      'A guide in the main menu explains game modes, players, training, statistics, achievements and settings.',
      'Before training you choose which player trains, and the darts go into that player\'s heatmap.',
      'After a checkout the caller now says "Game shot".',
      'Recent activity shows the correct winner.',
    ],
  },
  {
    version: '0.1.6',
    date: '2026-01-17',
    title: 'Match history fixed',
    items: [
      'Fixed: the match history did not show past games.',
    ],
  },
  {
    version: '0.1.5',
    date: '2026-01-17',
    title: 'Matches survive a reload',
    items: [
      'A running match is restored when you reload the page.',
      'Fixed: recent activity showed broken dates.',
    ],
  },
  {
    version: '0.1.4',
    date: '2026-01-17',
    title: 'Dates fixed',
    items: [
      'Fixed: dates were shown inconsistently across the app.',
    ],
  },
  {
    version: '0.1.3',
    date: '2026-01-17',
    title: 'Statistics tabs remembered',
    items: [
      'The selected statistics tab is kept on reload and works with the browser\'s back button.',
      'Fixed: the statistics history could show a blank screen.',
      'Profile pictures now appear as images on the leaderboard.',
    ],
  },
  {
    version: '0.1.2',
    date: '2026-01-17',
    title: 'Leg won animation',
    items: [
      'Winning a leg shows a full-screen animation with the winner\'s avatar and progress.',
      'Fixed: the animation showed the wrong leg number.',
    ],
  },
  {
    version: '0.1.1',
    date: '2026-01-16',
    title: 'Start wheel',
    items: [
      'A wheel of fortune picks who starts each match, with sound and announcements.',
      'Fixed: "Back to menu" now works reliably from every screen.',
      'Profile pictures now appear as images in the account settings.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-01-16',
    title: 'Export your statistics',
    items: [
      'Statistics can be exported as CSV, Excel or PDF.',
      'Fixed: the statistics screen could fail with incomplete match data.',
    ],
  },
  {
    version: '0.0.5',
    date: '2026-01-15',
    title: 'Heatmap',
    items: [
      'A heatmap of your throws on a dartboard, with your top hotspots.',
      'Accuracy statistics for misses, trebles and doubles.',
    ],
  },
];
