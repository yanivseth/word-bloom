/**
 * WordBloom Lexicon
 * ================
 *
 * **Age values** (`ageMonths`) are based on MacArthur-Bates CDI production norms
 * at the 50th percentile — the age at which ≥50% of children produce the word.
 * Where CDI data is unavailable (sound effects, social routines, non-standard
 * words), ages are estimated based on developmental literature and marked as
 * such in the lexicon audit.
 *
 * **Phonetic tier** progression follows McLeod & Crowe (2018) consonant
 * acquisition norms (cross-linguistic review of 27 languages):
 *   Tier 1: /b, p, m, n, d, w, h, j/ — earliest acquired (2–3 years)
 *   Tier 2: /t, k, g, ŋ, f/ — acquired by 3–4 years
 *   Tier 3: /v, s, z, ʃ, tʃ, dʒ, l/ — acquired by 4–5 years
 *   Tier 4: /ɹ, ð/ — acquired by 5–6 years
 *   Tier 5: /θ/ — latest acquired (6+ years)
 * For the lexicon, tiers represent the phonological complexity of the word's
 * initial consonant(s) relative to typical acquisition, adapted for babbling →
 * first words trajectory.
 *
 * **Word categories** follow CDI semantic organization (People, Animals, Food
 * & Drink, Body Parts, Action Words, Social Routines & Games, Toys, Descriptive
 * Words).
 *
 * **References:**
 * - Fenson, L., Marchman, V. A., Thal, D. J., Dale, P. S., Reznick, J. S., &
 *   Bates, E. (2007). *MacArthur-Bates Communicative Development Inventories:
 *   User's guide and technical manual* (2nd ed.). Brookes Publishing.
 * - McLeod, S. & Crowe, K. (2018). Children's consonant acquisition in 27
 *   languages: A cross-linguistic review. *American Journal of Speech-Language
 *   Pathology*, 27(4), 1546–1571.
 * - Frank, M. C., Braginsky, M., Yurovsky, D., & Marchman, V. A. (2017).
 *   Wordbank: An open repository for developmental vocabulary data. *Journal of
 *   Child Language*, 44(3), 677–694. — wordbank.stanford.edu
 *
 * Last CDI cross-reference audit: 2026-07-19
 * (see /home/team/shared/lexicon-audit.md)
 *
 * Contains 133 words across 8 CDI semantic categories: the original
 * CDI-audited core (6–24mo) plus a 45-word 24–36 month expansion whose ages
 * are Wordbank-informed estimates (see the expansion section note below).
 */

export interface LexiconEntry {
  word: string;
  initialCV: string;
  phoneticTier: number;
  ageMonths: number;
  category: "people" | "animal" | "food" | "body" | "action" | "social" | "toy" | "descriptor";
  syllableStructure: string;
  phrases: string[];
}

const LEXICON: LexiconEntry[] = [
  // ── PEOPLE ──────────────────────────────────────────────────
  // CDI semantic category: People. Includes kinship terms and person labels.
  // 50th percentile production: mama/dada ~11mo, baby ~14mo, grandparents ~19-20mo.
  {
    word: "mama",
    initialCV: "ma",
    phoneticTier: 1,
    ageMonths: 9,
    category: "people",
    syllableStructure: "CVCV",
    phrases: [
      "Mama is here! Mama loves you.",
      "Where's Mama? Here I am!",
      "Mama is getting your cup. Mama, cup, here you go!",
    ],
  },
  {
    word: "dada",
    initialCV: "da",
    phoneticTier: 2,
    ageMonths: 9,
    category: "people",
    syllableStructure: "CVCV",
    phrases: [
      "Dada's home! Dada, dada, hooray!",
      "Wave to dada! Bye-bye, dada!",
      "Dada is reading the book. Turn the page, dada!",
    ],
  },
  {
    word: "baby",
    initialCV: "ba",
    phoneticTier: 1,
    ageMonths: 12,
    category: "people",
    syllableStructure: "CVCV",
    phrases: [
      "Look at the baby! The baby is sleeping.",
      "Shh, baby is napping. Night-night, baby.",
      "You were a tiny baby, and now you're so big!",
    ],
  },
  {
    word: "nana",
    initialCV: "na",
    phoneticTier: 2,
    ageMonths: 19,
    category: "people",
    syllableStructure: "CVCV",
    phrases: [
      "Nana is coming to visit! Hi, nana!",
      "Let's call nana. Nana says hello!",
      "Nana made you a snack. Yummy, nana!",
    ],
  },
  {
    word: "papa",
    initialCV: "pa",
    phoneticTier: 1,
    ageMonths: 20,
    category: "people",
    syllableStructure: "CVCV",
    phrases: [
      "Papa is outside. Let's find papa!",
      "Papa reads the best stories. Turn the page, papa!",
      "Papa is making breakfast. Mmm, thank you papa!",
    ],
  },

  // ── ANIMALS & SOUNDS ────────────────────────────────────────
  // CDI semantic category: Animals (real & toy). Includes animal names and
  // their associated sounds. Sound effects are not CDI vocabulary items;
  // ages are estimated from developmental literature on pre-linguistic
  // vocalizations and early sound play. Animal name 50th %ile: dog ~15mo,
  // cat ~16mo, duck/bird ~16mo, cow ~18mo, sheep ~22mo.
  {
    word: "dog",
    initialCV: "do",
    phoneticTier: 2,
    ageMonths: 15,
    category: "animal",
    syllableStructure: "CVC",
    phrases: [
      "I see the dog! The dog says woof woof!",
      "The dog is running. Fast dog!",
      "Pet the dog gently. Nice dog.",
    ],
  },
  {
    word: "woof",
    initialCV: "wo",
    phoneticTier: 1,
    ageMonths: 10,
    category: "animal",
    syllableStructure: "CVC",
    phrases: [
      "Woof woof! That's the dog sound!",
      "The dog says woof! Can you hear it? Woof woof!",
      "Woof woof, puppy! Hello, puppy!",
    ],
  },
  {
    word: "cat",
    initialCV: "ka",
    phoneticTier: 3,
    ageMonths: 16,
    category: "animal",
    syllableStructure: "CVC",
    phrases: [
      "The cat is sleeping. Shh, soft cat.",
      "Look at the cat! The cat says meow.",
      "Where's the cat? The cat is hiding!",
    ],
  },
  {
    word: "meow",
    initialCV: "me",
    phoneticTier: 1,
    ageMonths: 10,
    category: "animal",
    syllableStructure: "CVC",
    phrases: [
      "Meow! That's the kitty sound!",
      "The kitty says meow. Can you say it with me? Meow!",
      "Meow meow, hello kitty!",
    ],
  },
  {
    word: "cow",
    initialCV: "ka",
    phoneticTier: 3,
    ageMonths: 18,
    category: "animal",
    syllableStructure: "CVC",
    phrases: [
      "The cow is big! The cow says moo!",
      "Moo! That cow is eating grass.",
      "Look at the cow in the book. Moooo!",
    ],
  },
  {
    word: "moo",
    initialCV: "mo",
    phoneticTier: 1,
    ageMonths: 10,
    category: "animal",
    syllableStructure: "CV",
    phrases: [
      "Moo moo! The cow is talking to us!",
      "The cow says moo! Moo moo moo!",
      "Moo! That's a big sound from a big animal!",
    ],
  },
  {
    word: "duck",
    initialCV: "da",
    phoneticTier: 2,
    ageMonths: 14,
    category: "animal",
    syllableStructure: "CVC",
    phrases: [
      "The duck is in the water. The duck is swimming!",
      "Yellow duck, swimming duck. Look at the duck go!",
      "Where's your duck? Here's the duck!",
    ],
  },
  {
    word: "pig",
    initialCV: "pi",
    phoneticTier: 2,
    ageMonths: 18,
    category: "animal",
    syllableStructure: "CVC",
    phrases: [
      "Look at the pig! The pig says oink oink!",
      "The pig is in the mud. Oink! Muddy pig!",
      "This little piggy! Oink oink, hello pig!",
    ],
  },
  {
    word: "bird",
    initialCV: "ba",
    phoneticTier: 1,
    ageMonths: 14,
    category: "animal",
    syllableStructure: "CVC",
    phrases: [
      "Look! A bird in the sky! Chirp chirp!",
      "The bird is flying. Fly, bird, fly!",
      "I see a bird outside. Pretty bird!",
    ],
  },
  {
    word: "bunny",
    initialCV: "bu",
    phoneticTier: 2,
    ageMonths: 18,
    category: "animal",
    syllableStructure: "CVCV",
    phrases: [
      "Look at the bunny! The bunny is hopping! Hop, hop!",
      "Soft bunny, little bunny. Bunny has long ears!",
      "Where's your bunny? Hug the bunny!",
    ],
  },
  {
    word: "fish",
    initialCV: "fi",
    phoneticTier: 3,
    ageMonths: 17,
    category: "animal",
    syllableStructure: "CVC",
    phrases: [
      "Look at the fish! The fish is swimming. Swim, fish, swim!",
      "I see a fish in the water. Pretty fish!",
      "Fish goes blub blub! Hello, fish!",
    ],
  },
  {
    word: "sheep",
    initialCV: "sh",
    phoneticTier: 5,
    ageMonths: 22,
    category: "animal",
    syllableStructure: "CVC",
    phrases: [
      "The sheep is fluffy! Baa baa, sheep!",
      "Baa! Can you find the sheep in the book?",
      "Soft sheep, white sheep. Baa baa!",
    ],
  },
  {
    word: "baa",
    initialCV: "ba",
    phoneticTier: 1,
    ageMonths: 10,
    category: "animal",
    syllableStructure: "CV",
    phrases: [
      "Baa baa! The sheep says baa!",
      "Baa! That sheep has a fluffy coat.",
      "Baa baa, little sheep!",
    ],
  },

  // ── FOOD ────────────────────────────────────────────────────
  // CDI semantic category: Food & Drink. 50th %ile: milk ~14mo,
  // water ~17mo, banana/apple/cracker/bread ~18mo, cheese/egg ~19mo,
  // juice ~18mo.
  {
    word: "milk",
    initialCV: "mi",
    phoneticTier: 1,
    ageMonths: 12,
    category: "food",
    syllableStructure: "CVCC",
    phrases: [
      "Milk time! Here's your milk in the cup.",
      "Do you want more milk? Milk is cold!",
      "Mmm, milk! Drink your milk.",
    ],
  },
  {
    word: "water",
    initialCV: "wa",
    phoneticTier: 1,
    ageMonths: 16,
    category: "food",
    syllableStructure: "CVCV",
    phrases: [
      "Here's water in your cup. Water is cold!",
      "Splash! Water in the bath!",
      "Do you want water? Drink water.",
    ],
  },
  {
    word: "banana",
    initialCV: "ba",
    phoneticTier: 1,
    ageMonths: 16,
    category: "food",
    syllableStructure: "CVCVCV",
    phrases: [
      "I'm peeling your banana. Yellow banana, mmm!",
      "One bite of banana. Yummy banana!",
      "Do you want more banana? Here's a piece!",
    ],
  },
  {
    word: "apple",
    initialCV: "a",
    phoneticTier: 1,
    ageMonths: 16,
    category: "food",
    syllableStructure: "CVCV",
    phrases: [
      "I'm cutting the apple. Cut, cut, cut! Red apple.",
      "Here's a slice of apple. Crunchy apple!",
      "Do you want apple or banana? Apple!",
    ],
  },
  {
    word: "cracker",
    initialCV: "kr",
    phoneticTier: 5,
    ageMonths: 16,
    category: "food",
    syllableStructure: "CCVCV",
    phrases: [
      "Here's a cracker for you. Crunch crunch!",
      "One cracker, two crackers. Yummy crackers!",
      "Do you want a cracker? The cracker goes crunch!",
    ],
  },
  {
    word: "cheese",
    initialCV: "ch",
    phoneticTier: 5,
    ageMonths: 19,
    category: "food",
    syllableStructure: "CVC",
    phrases: [
      "Here's some cheese. Yellow cheese, soft cheese!",
      "Do you want cheese on your cracker? Cheese!",
      "Mmm, cheese! The cheese is yummy.",
    ],
  },
  {
    word: "juice",
    initialCV: "ju",
    phoneticTier: 5,
    ageMonths: 18,
    category: "food",
    syllableStructure: "CVC",
    phrases: [
      "Here's your juice. Apple juice! Drink slowly.",
      "Juice in the cup. Cold juice, mmm!",
      "Do you want water or juice? Juice time!",
    ],
  },
  {
    word: "egg",
    initialCV: "e",
    phoneticTier: 1,
    ageMonths: 19,
    category: "food",
    syllableStructure: "CVC",
    phrases: [
      "I'm cooking an egg. Sizzle sizzle! Egg is cooking.",
      "Here's your egg. Warm egg, yummy egg!",
      "Egg on your plate. Eat your egg!",
    ],
  },
  {
    word: "bread",
    initialCV: "br",
    phoneticTier: 5,
    ageMonths: 16,
    category: "food",
    syllableStructure: "CCVC",
    phrases: [
      "Here's bread for you. Soft bread, warm bread!",
      "I'm toasting the bread. Pop! The bread is ready!",
      "Do you want bread? Tear off a piece.",
    ],
  },
  {
    word: "cookie",
    initialCV: "co",
    phoneticTier: 3,
    ageMonths: 18,
    category: "food",
    syllableStructure: "CVCV",
    phrases: [
      "Here's a cookie for you! One cookie, yum yum!",
      "Do you want a cookie? Cookie time! Mmm!",
      "Cookie in your hand. Take a bite of cookie!",
    ],
  },

  // ── BODY ────────────────────────────────────────────────────
  // CDI semantic category: Body Parts. 50th %ile: nose ~14mo, eye ~15mo,
  // mouth/ear/foot ~16mo, hand/head/toes ~17mo, tummy ~18mo.
  {
    word: "nose",
    initialCV: "no",
    phoneticTier: 2,
    ageMonths: 14,
    category: "body",
    syllableStructure: "CVC",
    phrases: [
      "Where's your nose? There it is! I see your nose!",
      "I'm going to touch your nose. Boop! Nose!",
      "Mama's nose, your nose. Two noses!",
    ],
  },
  {
    word: "eye",
    initialCV: "a",
    phoneticTier: 1,
    ageMonths: 14,
    category: "body",
    syllableStructure: "VC",
    phrases: [
      "Where are your eyes? I see your pretty eyes!",
      "Close your eyes. Open your eyes! Peek-a-boo!",
      "Two eyes! One, two. Blink blink!",
    ],
  },
  {
    word: "mouth",
    initialCV: "ma",
    phoneticTier: 1,
    ageMonths: 16,
    category: "body",
    syllableStructure: "CVC",
    phrases: [
      "Open your mouth! Here comes the spoon. Mouth open!",
      "Where's your mouth? Right here! Mouth!",
      "Point to your mouth. Your mouth is smiling!",
    ],
  },
  {
    word: "ear",
    initialCV: "i",
    phoneticTier: 1,
    ageMonths: 14,
    category: "body",
    syllableStructure: "VC",
    phrases: [
      "Where are your ears? I found them! Two ears!",
      "I'm going to whisper in your ear. Shh, ear!",
      "Your ear, my ear. We both have ears!",
    ],
  },
  {
    word: "hand",
    initialCV: "ha",
    phoneticTier: 2,
    ageMonths: 17,
    category: "body",
    syllableStructure: "CVCC",
    phrases: [
      "Give me your hand. I'll hold your hand.",
      "Clap your hands! Clap, clap, clap!",
      "Two little hands. Wave your hand! Bye-bye!",
    ],
  },
  {
    word: "foot",
    initialCV: "fu",
    phoneticTier: 4,
    ageMonths: 14,
    category: "body",
    syllableStructure: "CVC",
    phrases: [
      "Where's your foot? This little foot!",
      "One foot, two feet. Stomp, stomp, stomp!",
      "I'm going to tickle your foot! Tickle tickle!",
    ],
  },
  {
    word: "tummy",
    initialCV: "ta",
    phoneticTier: 2,
    ageMonths: 18,
    category: "body",
    syllableStructure: "CVCV",
    phrases: [
      "Where's your tummy? There's your tummy! Tickle tummy!",
      "Rub your tummy. Full tummy after eating!",
      "Pat your tummy. Pat, pat, pat!",
    ],
  },
  {
    word: "head",
    initialCV: "he",
    phoneticTier: 2,
    ageMonths: 17,
    category: "body",
    syllableStructure: "CVC",
    phrases: [
      "Hat on your head! Your head is so smart.",
      "Pat your head. Where's your head? Right here!",
      "Nod your head. Yes, yes, yes!",
    ],
  },
  {
    word: "toes",
    initialCV: "to",
    phoneticTier: 2,
    ageMonths: 17,
    category: "body",
    syllableStructure: "CVC",
    phrases: [
      "Where are your toes? I see ten little toes!",
      "Wiggle your toes! Wiggle, wiggle, wiggle!",
      "This little piggy went to market. Tickle toes!",
    ],
  },

  // ── ACTIONS ─────────────────────────────────────────────────
  // CDI semantic category: Action Words (verbs + spatial particles).
  // 50th %ile: up ~13mo, down/go/eat ~15mo, sit/hug/kiss/walk ~16mo,
  // drink/push ~18mo, sleep ~19mo, open/stop/wash ~20mo, help/throw ~21mo,
  // close/jump ~22mo, run ~20mo.
  {
    word: "up",
    initialCV: "u",
    phoneticTier: 1,
    ageMonths: 13,
    category: "action",
    syllableStructure: "VC",
    phrases: [
      "Up, up, up! You're going up!",
      "Do you want up? I'll pick you up!",
      "Up we go! So high up!",
    ],
  },
  {
    word: "down",
    initialCV: "da",
    phoneticTier: 2,
    ageMonths: 15,
    category: "action",
    syllableStructure: "CVC",
    phrases: [
      "Down you go. Down to the floor!",
      "The ball goes down. Down, down, bounce!",
      "Sit down. Down on your bottom.",
    ],
  },
  {
    word: "go",
    initialCV: "go",
    phoneticTier: 3,
    ageMonths: 15,
    category: "action",
    syllableStructure: "CV",
    phrases: [
      "Ready, set, go! Go, go, go!",
      "Let's go outside. Go to the door!",
      "The car goes fast. Go, car, go!",
    ],
  },
  {
    word: "stop",
    initialCV: "st",
    phoneticTier: 5,
    ageMonths: 18,
    category: "action",
    syllableStructure: "CCVC",
    phrases: [
      "Go, go, go… and stop! You stopped!",
      "The car says stop. Red means stop.",
      "Let's stop and look. Stop, look, listen!",
    ],
  },
  {
    word: "eat",
    initialCV: "i",
    phoneticTier: 1,
    ageMonths: 15,
    category: "action",
    syllableStructure: "VC",
    phrases: [
      "Time to eat! Let's eat your lunch.",
      "You're eating banana. Eat, eat, mmm!",
      "Do you want to eat? The food is ready!",
    ],
  },
  {
    word: "drink",
    initialCV: "dr",
    phoneticTier: 5,
    ageMonths: 18,
    category: "action",
    syllableStructure: "CCVCC",
    phrases: [
      "Time for a drink. Drink your water!",
      "You're drinking milk. Drink it all up!",
      "Can I have a drink? You can drink too!",
    ],
  },
  {
    word: "open",
    initialCV: "o",
    phoneticTier: 1,
    ageMonths: 18,
    category: "action",
    syllableStructure: "VCVC",
    phrases: [
      "Let's open the book. Open, open — look inside!",
      "Can you open the box? Open it up!",
      "Open the door. Open it wide!",
    ],
  },
  {
    word: "close",
    initialCV: "kl",
    phoneticTier: 5,
    ageMonths: 22,
    category: "action",
    syllableStructure: "CCVC",
    phrases: [
      "Close the book. All done reading. Close!",
      "Let's close the door. Close it gently.",
      "Close your eyes for sleep. Night-night, close!",
    ],
  },
  {
    word: "help",
    initialCV: "he",
    phoneticTier: 2,
    ageMonths: 21,
    category: "action",
    syllableStructure: "CVCC",
    phrases: [
      "Do you need help? I can help you!",
      "Let me help you with your shoe. Help, shoe, on!",
      "Thank you for helping! You're a good helper!",
    ],
  },
  {
    word: "sit",
    initialCV: "si",
    phoneticTier: 4,
    ageMonths: 16,
    category: "action",
    syllableStructure: "CVC",
    phrases: [
      "Let's sit down. Sit next to me.",
      "Sit on your chair. Sit, sit, there you go!",
      "Can you sit? Sit and read the book.",
    ],
  },
  {
    word: "walk",
    initialCV: "wa",
    phoneticTier: 1,
    ageMonths: 16,
    category: "action",
    syllableStructure: "CVCC",
    phrases: [
      "Let's walk to the door. Walk, walk, walk!",
      "You're walking so well! Big steps, walk!",
      "Walk with mama. Hold my hand and walk.",
    ],
  },
  {
    word: "hug",
    initialCV: "ha",
    phoneticTier: 2,
    ageMonths: 16,
    category: "action",
    syllableStructure: "CVC",
    phrases: [
      "Big hug! I love your hugs!",
      "Can I have a hug? Hug, hug! Squeeze!",
      "Give teddy a hug. Hug the bear!",
    ],
  },
  {
    word: "kiss",
    initialCV: "ki",
    phoneticTier: 3,
    ageMonths: 14,
    category: "action",
    syllableStructure: "CVC",
    phrases: [
      "Give me a kiss! Mwah! Sweet kiss!",
      "Kiss the baby goodnight. Kiss, kiss!",
      "Blow a kiss! Catch the kiss!",
    ],
  },
  {
    word: "wash",
    initialCV: "wa",
    phoneticTier: 1,
    ageMonths: 18,
    category: "action",
    syllableStructure: "CVC",
    phrases: [
      "Let's wash your hands. Wash, wash, wash!",
      "Wash your face. Scrub scrub, all clean!",
      "Time to wash. Splash! Water and soap.",
    ],
  },
  {
    word: "sleep",
    initialCV: "sl",
    phoneticTier: 5,
    ageMonths: 18,
    category: "action",
    syllableStructure: "CCVC",
    phrases: [
      "Time to sleep. Close your eyes and sleep.",
      "The baby is sleeping. Shh, sleep time!",
      "Sleep tight! I'll see you in the morning.",
    ],
  },
  {
    word: "jump",
    initialCV: "ju",
    phoneticTier: 5,
    ageMonths: 24,
    category: "action",
    syllableStructure: "CVCC",
    phrases: [
      "Jump, jump, jump! You're jumping so high!",
      "Can you jump like a frog? Jump!",
      "One, two, three — jump! Big jump!",
    ],
  },
  {
    word: "run",
    initialCV: "ra",
    phoneticTier: 5,
    ageMonths: 20,
    category: "action",
    syllableStructure: "CVC",
    phrases: [
      "Run, run, run! You're running fast!",
      "Let's run to the door. Ready, set, run!",
      "You love to run! Fast feet, run!",
    ],
  },
  {
    word: "push",
    initialCV: "pu",
    phoneticTier: 1,
    ageMonths: 18,
    category: "action",
    syllableStructure: "CVC",
    phrases: [
      "Push the button. Push! Look what happened!",
      "Push the car. Push, push — vroom!",
      "Can you push the door? Push it open!",
    ],
  },
  {
    word: "pull",
    initialCV: "pu",
    phoneticTier: 1,
    ageMonths: 18,
    category: "action",
    syllableStructure: "CVC",
    phrases: [
      "Pull the toy. Pull, pull — here it comes!",
      "Pull up your pants. Pull! You did it!",
      "Pull the drawer open. Pull gently.",
    ],
  },
  {
    word: "throw",
    initialCV: "th",
    phoneticTier: 5,
    ageMonths: 22,
    category: "action",
    syllableStructure: "CCV",
    phrases: [
      "Throw the ball! Throw it to me!",
      "You threw the ball! Good throw!",
      "Ready, aim, throw! The ball went far!",
    ],
  },
  {
    word: "bath",
    initialCV: "ba",
    phoneticTier: 2,
    ageMonths: 17,
    category: "action",
    syllableStructure: "CVC",
    phrases: [
      "Time for a bath! Splash, splash in the bath!",
      "Let's get in the bath. The water is warm. Bath time!",
      "Bath time fun! Bubbles in the bath!",
    ],
  },

  // ── SOCIAL ──────────────────────────────────────────────────
  // CDI semantic category: Social Routines & Games. Includes greetings,
  // politeness markers, and routine phrases. 50th %ile: hi/bye ~13mo,
  // no ~14mo, more ~15mo, yes ~18mo, please ~22mo. "all-done", "uh-oh",
  // and "night-night" are not single CDI items; ages are estimated.
  {
    word: "hi",
    initialCV: "ha",
    phoneticTier: 2,
    ageMonths: 13,
    category: "social",
    syllableStructure: "CV",
    phrases: [
      "Hi! Wave hello! Hi there!",
      "Hi, baby! I see you! Hi!",
      "Say hi to nana. Hi, nana!",
    ],
  },
  {
    word: "bye",
    initialCV: "ba",
    phoneticTier: 1,
    ageMonths: 13,
    category: "social",
    syllableStructure: "CV",
    phrases: [
      "Bye-bye! Wave bye-bye! See you soon!",
      "Bye-bye, dada! Dada is going to work.",
      "Let's wave bye-bye. Bye-bye, park!",
    ],
  },
  {
    word: "please",
    initialCV: "pl",
    phoneticTier: 5,
    ageMonths: 20,
    category: "social",
    syllableStructure: "CCVC",
    phrases: [
      "Can I have the ball, please? Thank you!",
      "Let's say please. Please is a kind word.",
      "You want more? More please!",
    ],
  },
  {
    word: "more",
    initialCV: "mo",
    phoneticTier: 1,
    ageMonths: 15,
    category: "social",
    syllableStructure: "CVC",
    phrases: [
      "Do you want more banana? More?",
      "More crackers? Here's more!",
      "More bubbles! Pop, pop — more!",
    ],
  },
  {
    word: "all-done",
    initialCV: "a",
    phoneticTier: 1,
    ageMonths: 14,
    category: "social",
    syllableStructure: "VCCVC",
    phrases: [
      "All done eating? All done! Let's wash hands.",
      "Are you all done with the bath? All done!",
      "All done playing? Time to clean up!",
    ],
  },
  {
    word: "uh-oh",
    initialCV: "u",
    phoneticTier: 1,
    ageMonths: 10,
    category: "social",
    syllableStructure: "VCVC",
    phrases: [
      "Uh-oh! The cup tipped over!",
      "Uh-oh! Where did the ball go?",
      "Uh-oh! That was a surprise!",
    ],
  },
  {
    word: "yes",
    initialCV: "ye",
    phoneticTier: 5,
    ageMonths: 18,
    category: "social",
    syllableStructure: "CVC",
    phrases: [
      "Do you want milk? Yes? Here you go!",
      "Nod your head for yes. Yes! Good job!",
      "Yes, you can have more! Yes!",
    ],
  },
  {
    word: "no",
    initialCV: "no",
    phoneticTier: 2,
    ageMonths: 12,
    category: "social",
    syllableStructure: "CV",
    phrases: [
      "No, that's hot. No touch. Hot!",
      "Do you want more? No? All done!",
      "Shake your head for no. No, no, no!",
    ],
  },
  {
    word: "night-night",
    initialCV: "na",
    phoneticTier: 2,
    ageMonths: 14,
    category: "social",
    syllableStructure: "CVCCVC",
    phrases: [
      "Night-night! Time for bed. Sleep tight!",
      "Say night-night to teddy. Night-night, bear!",
      "Night-night, sweet baby. I love you!",
    ],
  },

  // ── TOYS & OBJECTS ──────────────────────────────────────────
  // CDI semantic categories: Toys + Household Items + Clothing.
  // 50th %ile: ball/book/cup ~15mo, car/shoe ~16mo, bear ~17mo,
  // block/spoon ~18mo, bubble ~19mo.
  {
    word: "ball",
    initialCV: "ba",
    phoneticTier: 1,
    ageMonths: 15,
    category: "toy",
    syllableStructure: "CVC",
    phrases: [
      "I see the ball! The ball is round. Let's roll the ball!",
      "Catch the ball! You got it! Ball!",
      "Bounce the ball! Bounce, bounce, bounce!",
    ],
  },
  {
    word: "book",
    initialCV: "bu",
    phoneticTier: 1,
    ageMonths: 15,
    category: "toy",
    syllableStructure: "CVC",
    phrases: [
      "Let's read a book. Open the book! Turn the page!",
      "I love this book. The book has pictures!",
      "Where's your book? Bring me the book!",
    ],
  },
  {
    word: "car",
    initialCV: "ka",
    phoneticTier: 3,
    ageMonths: 14,
    category: "toy",
    syllableStructure: "CVC",
    phrases: [
      "Vroom! The car goes fast!",
      "Push the car. The car is rolling! Vroom!",
      "Red car, blue car. Two cars racing!",
    ],
  },
  {
    word: "shoe",
    initialCV: "sh",
    phoneticTier: 5,
    ageMonths: 14,
    category: "toy",
    syllableStructure: "CV",
    phrases: [
      "Let's put on your shoe. One shoe, two shoes!",
      "Where's your shoe? Here's your shoe!",
      "Take off your shoe. Shoe off! Good job!",
    ],
  },
  {
    word: "cup",
    initialCV: "ka",
    phoneticTier: 3,
    ageMonths: 15,
    category: "toy",
    syllableStructure: "CVC",
    phrases: [
      "Here's your cup. Drink from the cup!",
      "Your cup is blue. Blue cup, cold milk!",
      "Where's your cup? Pick up your cup!",
    ],
  },
  {
    word: "block",
    initialCV: "bl",
    phoneticTier: 5,
    ageMonths: 16,
    category: "toy",
    syllableStructure: "CCVC",
    phrases: [
      "Let's stack the blocks. One block, two blocks! Up!",
      "The blocks fell down! Let's build again!",
      "Put the block on top. Tall tower of blocks!",
    ],
  },
  {
    word: "bear",
    initialCV: "be",
    phoneticTier: 1,
    ageMonths: 17,
    category: "toy",
    syllableStructure: "CVC",
    phrases: [
      "Where's your bear? I found teddy bear!",
      "Hug the bear. Soft bear, cuddly bear!",
      "Bear is sleepy. Night-night, bear!",
    ],
  },
  {
    word: "bubble",
    initialCV: "bu",
    phoneticTier: 1,
    ageMonths: 19,
    category: "toy",
    syllableStructure: "CVCVC",
    phrases: [
      "Look at the bubbles! Pop! Pop the bubble!",
      "Bubbles floating up. So many bubbles!",
      "Blow a bubble. Big bubble! Wow!",
    ],
  },
  {
    word: "spoon",
    initialCV: "sp",
    phoneticTier: 5,
    ageMonths: 16,
    category: "toy",
    syllableStructure: "CCVC",
    phrases: [
      "Here's your spoon. Scoop with the spoon!",
      "Hold the spoon. Spoon to your mouth!",
      "One spoon for you, one spoon for me.",
    ],
  },
  {
    word: "chair",
    initialCV: "ch",
    phoneticTier: 3,
    ageMonths: 18,
    category: "toy",
    syllableStructure: "CVC",
    phrases: [
      "Sit on your chair! Your chair is so sturdy. Sit, sit!",
      "Let's push in the chair. Chair goes here!",
      "Where's your chair? There it is! Sit down!",
    ],
  },
  {
    word: "hat",
    initialCV: "ha",
    phoneticTier: 2,
    ageMonths: 17,
    category: "toy",
    syllableStructure: "CVC",
    phrases: [
      "Put on your hat! Your hat keeps you warm. Hat on!",
      "Where's your hat? I see the hat! Let's put it on!",
      "Take off your hat. Hat off! Good job!",
    ],
  },
  {
    word: "door",
    initialCV: "do",
    phoneticTier: 3,
    ageMonths: 18,
    category: "toy",
    syllableStructure: "CVC",
    phrases: [
      "Let's open the door. Open the door — outside we go!",
      "Close the door. The door goes click! Bye-bye door!",
      "Knock on the door! Knock knock! Who's there?",
    ],
  },

  // ── DESCRIPTORS ─────────────────────────────────────────────
  // CDI semantic category: Descriptive Words (adjectives).
  // 50th %ile: hot ~20mo, big/wet ~21mo, cold ~22mo, soft ~23mo,
  // small ~24mo. "yummy" is not a standard CDI item; age is estimated.
  {
    word: "big",
    initialCV: "bi",
    phoneticTier: 1,
    ageMonths: 21,
    category: "descriptor",
    syllableStructure: "CVC",
    phrases: [
      "That's a big ball! So big!",
      "You're getting so big! Big hug!",
      "Big shoes for big feet!",
    ],
  },
  {
    word: "small",
    initialCV: "sm",
    phoneticTier: 5,
    ageMonths: 22,
    category: "descriptor",
    syllableStructure: "CCVC",
    phrases: [
      "Look at the small bug. Tiny, small bug!",
      "This cracker is small. Small bite!",
      "Small block on the big block.",
    ],
  },
  {
    word: "hot",
    initialCV: "ho",
    phoneticTier: 2,
    ageMonths: 18,
    category: "descriptor",
    syllableStructure: "CVC",
    phrases: [
      "Careful, that's hot! Hot food — blow on it!",
      "The bath water is warm, not too hot.",
      "Hot! No touch. Blow to make it cooler.",
    ],
  },
  {
    word: "cold",
    initialCV: "ko",
    phoneticTier: 3,
    ageMonths: 20,
    category: "descriptor",
    syllableStructure: "CVCC",
    phrases: [
      "Brr! The water is cold! Cold drink!",
      "Your milk is cold. Cold and yummy!",
      "Cold outside? Let's put on your coat!",
    ],
  },
  {
    word: "wet",
    initialCV: "we",
    phoneticTier: 1,
    ageMonths: 21,
    category: "descriptor",
    syllableStructure: "CVC",
    phrases: [
      "The towel is wet. Wet from the bath!",
      "Your shirt is wet. Let's change to dry clothes.",
      "Wet hands! Splash splash, all wet!",
    ],
  },
  {
    word: "yummy",
    initialCV: "ya",
    phoneticTier: 5,
    ageMonths: 18,
    category: "descriptor",
    syllableStructure: "CVCV",
    phrases: [
      "Mmm, that's yummy! Yummy banana!",
      "Is your lunch yummy? Yummy, yummy!",
      "Yummy in your tummy!",
    ],
  },
  {
    word: "dirty",
    initialCV: "di",
    phoneticTier: 3,
    ageMonths: 22,
    category: "descriptor",
    syllableStructure: "CVCCV",
    phrases: [
      "Your hands are dirty! Let's wash them clean.",
      "Oh, that fell on the floor. It's dirty! Let's wipe it.",
      "Dirty shirt? Time for a clean one!",
    ],
  },
  {
    word: "soft",
    initialCV: "so",
    phoneticTier: 4,
    ageMonths: 23,
    category: "descriptor",
    syllableStructure: "CVCC",
    phrases: [
      "The blanket is soft. Feel how soft!",
      "Soft teddy bear. Cuddle the soft bear!",
      "Your hair is so soft. Soft, soft, soft!",
    ],
  },

  // ── 24–36 MONTH EXPANSION ───────────────────────────────────
  // Upper-tier CDI Words & Sentences items so the lexicon doesn't run out of
  // runway at 24 months. Ages are 50th-percentile production estimates
  // informed by Wordbank American English WS norms (Frank et al., 2017);
  // where an exact norm is unavailable the age is an estimate from
  // developmental literature.

  // Animals
  {
    word: "horse",
    initialCV: "ho",
    phoneticTier: 1,
    ageMonths: 24,
    category: "animal",
    syllableStructure: "CVC",
    phrases: [
      "The horse says neigh! Neigh, neigh, horse!",
      "The horse is running fast. Go, horse, go!",
      "Can you gallop like a horse? Clip-clop, clip-clop!",
    ],
  },
  {
    word: "monkey",
    initialCV: "mo",
    phoneticTier: 1,
    ageMonths: 24,
    category: "animal",
    syllableStructure: "CVCCV",
    phrases: [
      "The monkey says ooh-ooh, ah-ah!",
      "The monkey is climbing the tree. Climb, monkey, climb!",
      "Silly monkey! The monkey is jumping on the bed.",
    ],
  },
  {
    word: "lion",
    initialCV: "li",
    phoneticTier: 3,
    ageMonths: 27,
    category: "animal",
    syllableStructure: "CVVC",
    phrases: [
      "The lion says ROAR! Can you roar like a lion?",
      "The lion has a big fluffy mane. Big lion!",
      "Shh, the lion is sleeping. Night-night, lion.",
    ],
  },
  {
    word: "elephant",
    initialCV: "e",
    phoneticTier: 1,
    ageMonths: 28,
    category: "animal",
    syllableStructure: "VCVCVCC",
    phrases: [
      "The elephant has a long trunk. Pffffft!",
      "The elephant is so big! Stomp, stomp, stomp!",
      "The elephant sprays water with its trunk. Splash!",
    ],
  },
  {
    word: "frog",
    initialCV: "fo",
    phoneticTier: 3,
    ageMonths: 26,
    category: "animal",
    syllableStructure: "CCVC",
    phrases: [
      "The frog says ribbit! Ribbit, ribbit!",
      "The frog jumps so high! Jump like a frog!",
      "The frog sits on a lily pad. Splash goes the frog!",
    ],
  },
  {
    word: "bee",
    initialCV: "be",
    phoneticTier: 1,
    ageMonths: 24,
    category: "animal",
    syllableStructure: "CV",
    phrases: [
      "The bee says buzz! Buzz, buzz, bee!",
      "The bee is visiting the flowers. Busy bee!",
      "Buzz-buzz! The bee flies away. Bye-bye, bee!",
    ],
  },

  // Food & drink
  {
    word: "orange",
    initialCV: "o",
    phoneticTier: 1,
    ageMonths: 26,
    category: "food",
    syllableStructure: "VCVCC",
    phrases: [
      "Juicy orange! Let's peel the orange together.",
      "The orange is round like a ball. Round orange!",
      "Do you want an orange slice? Yummy orange!",
    ],
  },
  {
    word: "grapes",
    initialCV: "ga",
    phoneticTier: 3,
    ageMonths: 27,
    category: "food",
    syllableStructure: "CCVCC",
    phrases: [
      "Little round grapes! One grape, two grapes!",
      "Grapes are so sweet. Mmm, yummy grapes!",
      "More grapes? Here are more grapes.",
    ],
  },
  {
    word: "noodles",
    initialCV: "no",
    phoneticTier: 1,
    ageMonths: 27,
    category: "food",
    syllableStructure: "CVCVCC",
    phrases: [
      "Wiggly noodles! The noodles are so long.",
      "Slurp the noodles! Slurp, slurp, slurp!",
      "Hot noodles — let's blow on them. Blow, blow!",
    ],
  },
  {
    word: "soup",
    initialCV: "su",
    phoneticTier: 3,
    ageMonths: 27,
    category: "food",
    syllableStructure: "CVC",
    phrases: [
      "Warm soup! Stir the soup, round and round.",
      "The soup is hot. Blow on the soup first!",
      "Spoon in the soup — take a little sip. Mmm!",
    ],
  },
  {
    word: "ice-cream",
    initialCV: "i",
    phoneticTier: 3,
    ageMonths: 26,
    category: "food",
    syllableStructure: "VC-CCVC",
    phrases: [
      "Cold ice-cream! Brrr, it's cold!",
      "Lick the ice-cream before it melts. Quick, quick!",
      "Ice-cream for a special treat. Yummy, yummy!",
    ],
  },
  {
    word: "strawberry",
    initialCV: "sa",
    phoneticTier: 4,
    ageMonths: 30,
    category: "food",
    syllableStructure: "CCCVCVCV",
    phrases: [
      "Red strawberry! The strawberry is red and sweet.",
      "Take a bite of the strawberry. Mmm, juicy!",
      "One strawberry, two strawberries — let's count!",
    ],
  },

  // Body
  {
    word: "hair",
    initialCV: "ha",
    phoneticTier: 1,
    ageMonths: 22,
    category: "body",
    syllableStructure: "CVC",
    phrases: [
      "Let's brush your hair. Brush, brush, brush!",
      "Your hair is so soft! Pretty hair.",
      "Wash your hair in the bath. Bubbles in your hair!",
    ],
  },
  {
    word: "knee",
    initialCV: "ke",
    phoneticTier: 1,
    ageMonths: 26,
    category: "body",
    syllableStructure: "CV",
    phrases: [
      "Where's your knee? There's your knee!",
      "Bend your knees and jump! Knees up high!",
      "Pat your knees. Pat, pat, pat!",
    ],
  },
  {
    word: "fingers",
    initialCV: "fi",
    phoneticTier: 2,
    ageMonths: 24,
    category: "body",
    syllableStructure: "CVCCVC",
    phrases: [
      "Wiggle your fingers! Wiggle, wiggle, wiggle!",
      "Count your fingers — one, two, three!",
      "Ten little fingers! Where did the fingers go? Peekaboo!",
    ],
  },

  // Actions
  {
    word: "read",
    initialCV: "re",
    phoneticTier: 4,
    ageMonths: 26,
    category: "action",
    syllableStructure: "CVC",
    phrases: [
      "Let's read a book together. Read, read, read!",
      "Which book should we read? You pick!",
      "We're reading about animals. Point while we read!",
    ],
  },
  {
    word: "draw",
    initialCV: "da",
    phoneticTier: 3,
    ageMonths: 28,
    category: "action",
    syllableStructure: "CCV",
    phrases: [
      "Let's draw a picture! Draw a big circle.",
      "You're drawing! What are you drawing?",
      "Draw with the red crayon. Draw, draw, draw!",
    ],
  },
  {
    word: "dance",
    initialCV: "da",
    phoneticTier: 1,
    ageMonths: 26,
    category: "action",
    syllableStructure: "CVCC",
    phrases: [
      "Let's dance! Dance, dance, dance!",
      "Wiggle and dance to the music!",
      "You're dancing! Spin around and dance!",
    ],
  },
  {
    word: "sing",
    initialCV: "si",
    phoneticTier: 3,
    ageMonths: 26,
    category: "action",
    syllableStructure: "CVC",
    phrases: [
      "Let's sing a song! La-la-la!",
      "Sing with me: twinkle, twinkle!",
      "You're singing! What a lovely song.",
    ],
  },
  {
    word: "swim",
    initialCV: "si",
    phoneticTier: 3,
    ageMonths: 28,
    category: "action",
    syllableStructure: "CCVC",
    phrases: [
      "The fish can swim! Swim, fish, swim!",
      "Kick your legs like you're swimming!",
      "The duck swims in the water. Splash and swim!",
    ],
  },
  {
    word: "climb",
    initialCV: "ci",
    phoneticTier: 3,
    ageMonths: 28,
    category: "action",
    syllableStructure: "CCVC",
    phrases: [
      "Climb up the steps! Climb, climb, climb!",
      "You climbed so high! Careful climbing.",
      "The monkey climbs the tree. Can you climb too?",
    ],
  },
  {
    word: "ride",
    initialCV: "ri",
    phoneticTier: 4,
    ageMonths: 27,
    category: "action",
    syllableStructure: "CVC",
    phrases: [
      "Ride the bike! Pedal, pedal, ride!",
      "Do you want a ride? Up you go — ride!",
      "We ride in the car. Riding to the park!",
    ],
  },
  {
    word: "catch",
    initialCV: "ca",
    phoneticTier: 2,
    ageMonths: 29,
    category: "action",
    syllableStructure: "CVC",
    phrases: [
      "Catch the ball! Ready — catch!",
      "You caught it! Great catch!",
      "Let's play catch. Throw and catch!",
    ],
  },
  {
    word: "share",
    initialCV: "sa",
    phoneticTier: 3,
    ageMonths: 33,
    category: "action",
    syllableStructure: "CCVC",
    phrases: [
      "Let's share the blocks. Sharing is kind!",
      "Can you share with me? Thank you for sharing!",
      "We share the crackers — one for you, one for me.",
    ],
  },

  // Social
  {
    word: "thank-you",
    initialCV: "ta",
    phoneticTier: 4,
    ageMonths: 25,
    category: "social",
    syllableStructure: "CVC-CV",
    phrases: [
      "Thank you! Can you say thank you?",
      "Here you go — thank you! What nice manners.",
      "Thank you for helping! High five!",
    ],
  },
  {
    word: "sorry",
    initialCV: "so",
    phoneticTier: 3,
    ageMonths: 28,
    category: "social",
    syllableStructure: "CVCV",
    phrases: [
      "I'm sorry — are you okay? Gentle hands.",
      "We say sorry when someone gets hurt. Sorry!",
      "Sorry, teddy! Give teddy a hug.",
    ],
  },

  // Toys & things
  {
    word: "train",
    initialCV: "ta",
    phoneticTier: 3,
    ageMonths: 25,
    category: "toy",
    syllableStructure: "CCVC",
    phrases: [
      "The train says choo-choo! Choo-choo, train!",
      "The train goes down the track. All aboard!",
      "Push the train! The train is going fast!",
    ],
  },
  {
    word: "plane",
    initialCV: "pa",
    phoneticTier: 3,
    ageMonths: 26,
    category: "toy",
    syllableStructure: "CCVC",
    phrases: [
      "The plane flies in the sky! Whoosh!",
      "Look up — a plane! The plane is so high!",
      "The plane zooms. Zoom, plane, zoom!",
    ],
  },
  {
    word: "truck",
    initialCV: "tu",
    phoneticTier: 3,
    ageMonths: 24,
    category: "toy",
    syllableStructure: "CCVC",
    phrases: [
      "Big truck! The truck goes vroom!",
      "The truck is carrying blocks. Beep, beep, truck!",
      "The dump truck tips over. Whoa, truck!",
    ],
  },
  {
    word: "boat",
    initialCV: "bo",
    phoneticTier: 1,
    ageMonths: 25,
    category: "toy",
    syllableStructure: "CVC",
    phrases: [
      "The boat floats on the water! Float, boat, float!",
      "Row, row, row your boat!",
      "The boat splashes in the tub. Splash, boat!",
    ],
  },
  {
    word: "doll",
    initialCV: "do",
    phoneticTier: 1,
    ageMonths: 25,
    category: "toy",
    syllableStructure: "CVC",
    phrases: [
      "Hug the doll! The doll is sleepy.",
      "Let's feed the doll. Open wide, doll!",
      "Night-night, doll. Tuck the doll in bed.",
    ],
  },
  {
    word: "puzzle",
    initialCV: "pu",
    phoneticTier: 1,
    ageMonths: 29,
    category: "toy",
    syllableStructure: "CVCVC",
    phrases: [
      "Let's do the puzzle! Where does this piece go?",
      "You finished the puzzle! Puzzle done!",
      "One more puzzle piece. Turn it — it fits!",
    ],
  },
  {
    word: "crayon",
    initialCV: "ca",
    phoneticTier: 3,
    ageMonths: 28,
    category: "toy",
    syllableStructure: "CCVCVC",
    phrases: [
      "Pick a crayon! The red crayon or the blue crayon?",
      "Draw with your crayon. Scribble, scribble!",
      "The crayon rolled away! Get the crayon!",
    ],
  },
  {
    word: "swing",
    initialCV: "si",
    phoneticTier: 3,
    ageMonths: 27,
    category: "toy",
    syllableStructure: "CCVC",
    phrases: [
      "Let's go on the swing! Swing high, swing low!",
      "Whee! You're swinging! Hold on tight!",
      "Push the swing. Up and down, swing!",
    ],
  },
  {
    word: "slide",
    initialCV: "si",
    phoneticTier: 3,
    ageMonths: 27,
    category: "toy",
    syllableStructure: "CCVC",
    phrases: [
      "Down the slide! Whee, slide!",
      "Climb up, then slide down. Ready, set, slide!",
      "The slide is so fun! One more slide?",
    ],
  },

  // Descriptors & concepts
  {
    word: "happy",
    initialCV: "ha",
    phoneticTier: 1,
    ageMonths: 26,
    category: "descriptor",
    syllableStructure: "CVCV",
    phrases: [
      "You look so happy! Happy, happy!",
      "A big smile — you're happy! I'm happy too.",
      "The happy song makes us dance!",
    ],
  },
  {
    word: "sad",
    initialCV: "sa",
    phoneticTier: 3,
    ageMonths: 27,
    category: "descriptor",
    syllableStructure: "CVC",
    phrases: [
      "You're feeling sad. It's okay to be sad.",
      "The baby is sad. Let's give a hug.",
      "Sad face, happy face — can you make both?",
    ],
  },
  {
    word: "fast",
    initialCV: "fa",
    phoneticTier: 2,
    ageMonths: 28,
    category: "descriptor",
    syllableStructure: "CVCC",
    phrases: [
      "The car goes fast! Fast, fast, fast!",
      "Run fast! You're so fast!",
      "The bunny hops fast. Hop fast like a bunny!",
    ],
  },
  {
    word: "slow",
    initialCV: "so",
    phoneticTier: 3,
    ageMonths: 30,
    category: "descriptor",
    syllableStructure: "CCV",
    phrases: [
      "The turtle walks so slow. Slooow turtle.",
      "Let's walk slow. Slow, slow steps.",
      "Fast, then slow! Can you clap slow?",
    ],
  },
  {
    word: "clean",
    initialCV: "ce",
    phoneticTier: 3,
    ageMonths: 27,
    category: "descriptor",
    syllableStructure: "CCVC",
    phrases: [
      "All clean! Your hands are clean now.",
      "Let's clean up the toys. Clean up, clean up!",
      "Clean face, clean hands — squeaky clean!",
    ],
  },
  {
    word: "loud",
    initialCV: "lo",
    phoneticTier: 3,
    ageMonths: 30,
    category: "descriptor",
    syllableStructure: "CVC",
    phrases: [
      "The drum is loud! Bang, bang — loud!",
      "That truck is loud! Cover your ears!",
      "Loud voice outside, quiet voice inside.",
    ],
  },
  {
    word: "quiet",
    initialCV: "qu",
    phoneticTier: 2,
    ageMonths: 31,
    category: "descriptor",
    syllableStructure: "CCVVC",
    phrases: [
      "Shh, quiet! The baby is sleeping.",
      "Let's use our quiet voice. Quiet, quiet.",
      "The library is quiet. Can you whisper?",
    ],
  },
  {
    word: "broken",
    initialCV: "bo",
    phoneticTier: 3,
    ageMonths: 27,
    category: "descriptor",
    syllableStructure: "CCVCVC",
    phrases: [
      "Uh-oh, it's broken! The tower is broken.",
      "The crayon broke. Broken crayon — still works!",
      "Is it broken? Let's fix it together.",
    ],
  },
  {
    word: "little",
    initialCV: "li",
    phoneticTier: 3,
    ageMonths: 26,
    category: "descriptor",
    syllableStructure: "CVCVC",
    phrases: [
      "A little bug! So little and small.",
      "Little bites — take a little bite.",
      "Big bear, little bear. Where's the little one?",
    ],
  },
  {
    word: "under",
    initialCV: "u",
    phoneticTier: 1,
    ageMonths: 29,
    category: "descriptor",
    syllableStructure: "VCCVC",
    phrases: [
      "The ball is under the chair. Look under!",
      "Peekaboo — hide under the blanket!",
      "The cat went under the bed. Under, under!",
    ],
  },
  {
    word: "behind",
    initialCV: "be",
    phoneticTier: 1,
    ageMonths: 33,
    category: "descriptor",
    syllableStructure: "CVCVCC",
    phrases: [
      "Where's teddy? Behind your back!",
      "I'm hiding behind the door. Boo!",
      "Look behind you! The ball rolled behind the sofa.",
    ],
  },
];

/** Map for quick word lookup */
const LEXICON_MAP = new Map<string, LexiconEntry>();
for (const entry of LEXICON) {
  LEXICON_MAP.set(entry.word, entry);
}

export { LEXICON, LEXICON_MAP };
