import {
  ILimit,
  IShortsLimit,
  IStopsLimit,
  IUrlLimit
} from "~/types/limits.types"
import { ILink } from "~/types/links.types"
import { IQuote } from "~/types/quotes.types"
import { generateUUID } from "~/utils/index.utils"
import { getDefaultCountdown } from "~/utils/limits.utils"
import {
  minutesToMilliseconds,
  secondsToMilliseconds
} from "~/utils/time.utils"

// Limits
export const defaultUrlLimits: ILimit<IUrlLimit>[] = [
  {
    uuid: generateUUID(),
    countdown: getDefaultCountdown("url", {
      startingCountValue: minutesToMilliseconds(360)
    }),
    limit: {
      url: "x.com",
      time: minutesToMilliseconds(360),
      period: "week"
    },
    type: "url",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    uuid: generateUUID(),
    countdown: getDefaultCountdown("url", {
      startingCountValue: minutesToMilliseconds(40)
    }),
    limit: {
      url: "x.com/",
      time: minutesToMilliseconds(40),
      period: "day"
    },
    type: "url",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    uuid: generateUUID(),
    countdown: getDefaultCountdown("url", {
      startingCountValue: minutesToMilliseconds(180)
    }),
    limit: {
      url: "youtube.com",
      time: minutesToMilliseconds(180),
      period: "day"
    },
    type: "url",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    uuid: generateUUID(),
    countdown: getDefaultCountdown("url", {
      startingCountValue: minutesToMilliseconds(30)
    }),
    limit: {
      url: "youtube.com/",
      time: minutesToMilliseconds(30),
      period: "day"
    },
    type: "url",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    uuid: generateUUID(),
    countdown: getDefaultCountdown("url", {
      startingCountValue: minutesToMilliseconds(30)
    }),
    limit: {
      url: "youtube.com/feed/subscriptions",
      time: minutesToMilliseconds(30),
      period: "day"
    },
    type: "url",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

export const defaultShortsLimits: ILimit<IShortsLimit>[] = [
  {
    uuid: generateUUID(),
    countdown: getDefaultCountdown("shorts", { startingCountValue: 40 }),
    limit: {
      watchedShorts: [],
      watchedShortsLimit: 40,
      period: "day"
    },
    type: "shorts",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    uuid: generateUUID(),
    countdown: getDefaultCountdown("shorts", { startingCountValue: 250 }),
    limit: {
      watchedShorts: [],
      watchedShortsLimit: 250,
      period: "week"
    },
    type: "shorts",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

export const defaultStops: ILimit<IStopsLimit>[] = [
  {
    uuid: generateUUID(),
    countdown: getDefaultCountdown("stops", {
      startingCountValue: secondsToMilliseconds(15)
    }),
    limit: {
      url: "x.com/home",
      time: secondsToMilliseconds(15),
      selectedTimeUnit: "seconds"
    },
    type: "stops",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    uuid: generateUUID(),
    countdown: getDefaultCountdown("stops", {
      startingCountValue: secondsToMilliseconds(15)
    }),
    limit: {
      url: "youtube.com/",
      time: secondsToMilliseconds(15),
      selectedTimeUnit: "seconds"
    },
    type: "stops",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

export const defaultLinks = [
  {
    uuid: generateUUID(),
    name: "Manta Ray",
    url: "https://twitter.com/BrianRoemmele/status/1445438890223935488"
  },
  {
    uuid: generateUUID(),
    name: "MapMap",
    url: "https://mapmap.app"
  }
] as ILink[]

export const defaultQuotes = [
  {
    uuid: generateUUID(),
    quote:
      '"Make a mistake? Release the guilt, remember the lesson."\n' +
      "James Clear"
  },
  {
    uuid: generateUUID(),
    quote:
      "\"One of life's counterintuitive lessons is that you will often gain energy by spending a little bit of energy.\n" +
      "When you feel lethargic and like you want to lay around all day, it is usually the case that getting up and moving will make you feel better than simply sitting around. Getting outside for 10 minutes or doing the first set of a workout or simply stretching on the floor for a moment — anything to get your body moving — will often leave you feeling more energized.\n" +
      "If you want to get your day going, then get your body going. It's harder for the mind to be sluggish when the body is moving.\"\n" +
      "James Clear"
  },
  {
    uuid: generateUUID(),
    quote:
      "Who has the right answers, but is too inarticulate for them to catch on?\n" +
      "And what incorrect beliefs have I acquired because of marketing, ego, etc.?\n" +
      "There questions are hard but very important to answer.\n" +
      "Morgan Housel"
  },
  {
    uuid: generateUUID(),
    quote:
      "„One can't understand everything at once, we can't begin with perfection all at once! In order to reach perfection one must begin by being ignorant of a great deal. And if we understand things too quickly, perhaps we shan't understand them thoroughly.“\n" +
      "Fyodor Dostreyevski"
  },
  {
    uuid: generateUUID(),
    quote:
      "„Don't make assumptions - find the courage to ask questions and to express what you really want. Communicate with others as clearly as you can to avoid misunderstandings, sadness and drama. With just this one agreement, you can completely transform your life.“\n" +
      "Don Miguel Ruiz"
  },
  {
    uuid: generateUUID(),
    quote:
      "Are you trying to get to the future? - You from the future, reminding you to be present"
  },
  {
    uuid: generateUUID(),
    quote:
      "„it is fitting to accept the hand that you’ve been and play it like it is your own“\n" +
      "Markus Aurelius"
  },
  {
    uuid: generateUUID(),
    quote:
      '"You never know what worse luck your bad luck has saved you from."\n' +
      "Cormac McCarthy (No Country for old men)"
  },
  {
    uuid: generateUUID(),
    quote:
      '"What problem have you solved, ever, that was worth solving where you knew all the given information in advance? No problem worth solving is like that. In the real world, you have a surplus of information and you have to filter it, or you don\'t have sufficient information and you have to go find some."\n' +
      "Dan Meyer"
  },
  {
    uuid: generateUUID(),
    quote:
      "\"Would I be happy with this result if no one other than me and my family could see it, and I didn't compare the result to the appearance of other people's success?\"\n" +
      "Morgan Housel"
  },
  {
    uuid: generateUUID(),
    quote:
      '"The test of a student is not how much he knows, but how much he wants to know."\n' +
      "Alice Wellington Rollins"
  },
  {
    uuid: generateUUID(),
    quote:
      '"Those who lack the courage will always find a philosophy to justify it."\n' +
      "Albert Camus"
  },
  {
    uuid: generateUUID(),
    quote:
      '"Mastery requires lots of practice. But the more you practice something, the more boring and routine it becomes.\n' +
      'Thus, an essential component of mastery is the ability to maintain your enthusiasm. The master continues to find the fundamentals interesting."\n' +
      "James Clear"
  },
  {
    uuid: generateUUID(),
    quote:
      '"Guilt lives in the past.\n' +
      "Worry lives in the future.\n" +
      'Peace lives in the present."\n' +
      "James Clear"
  },
  {
    uuid: generateUUID(),
    quote:
      "„How do you want to feel at the end of today? What do you need to do now, so you can feel this way?“\n" +
      "James Clear"
  },
  {
    uuid: generateUUID(),
    quote:
      '"Surround yourself with people who have the same goals as you. Rise together."\n' +
      "James Clear"
  },
  {
    uuid: generateUUID(),
    quote:
      "„Direct your energy toward figuring out how to start what you want to do rather than thinking about how to shorten what you don't want to do“\n" +
      "James Clear"
  },
  {
    uuid: generateUUID(),
    quote:
      "\"One of life's counterintuitive lessons is that you will often gain energy by spending a little bit of energy.\n" +
      "When you feel lethargic and like you want to lay around all day, it is usually the case that getting up and moving will make you feel better than simply sitting around. Getting outside for 10 minutes or doing the first set of a workout or simply stretching on the floor for a moment — anything to get your body moving — will often leave you feeling more energized.\n" +
      "If you want to get your day going, then get your body going. It's harder for the mind to be sluggish when the body is moving.\"\n" +
      "James Clear"
  },
  {
    uuid: generateUUID(),
    quote:
      "What single habit, if implemented consistently for the rest of this year, would transform your life the most?"
  },
  {
    uuid: generateUUID(),
    quote:
      '"To create, one must first question everything. Never adopt someone else\'s conclusion without putting it to the test of your own reasoning and imagination."\n' +
      "Eileen Gray"
  },
  {
    uuid: generateUUID(),
    quote:
      '"The quality of your thoughts is determined by the quality of your reading. Spend more time thinking about the inputs."\n' +
      "James Clear"
  },
  {
    uuid: generateUUID(),
    quote:
      '"To understand others, watch what they reward.\n' +
      'To understand yourself, watch what you envy."\n' +
      "James Clear"
  },
  {
    uuid: generateUUID(),
    quote:
      "“What you push down doesn’t vanish. It festers and wields quiet power over your thoughts and actions.\n" +
      "What needs to be addressed that isn’t currently being addressed?”\n" +
      "James Clear"
  },
  {
    uuid: generateUUID(),
    quote:
      '"Things that keep people from fulfilling their potential:\n' +
      "\t•\tLacking the courage to try\n" +
      "\t•\tTrying to please everyone\n" +
      "\t•\tImitating the desires of others\n" +
      "\t•\tChasing status without questioning why\n" +
      "\t•\tPlaying superhero and trying to do it all alone\n" +
      '\t•\tDividing attention between too many projects"\n' +
      "James Clear"
  },
  {
    uuid: generateUUID(),
    quote:
      '"Think about self-control less as the quality of a person and more as the quality of a place. There are some places and situations that lean toward lower self-control and others that lean toward higher self-control. Self-control is about your context as much as your character. Put yourself in good positions."\n' +
      "James Clear"
  },
  {
    uuid: generateUUID(),
    quote:
      "You get to pick a new career based on one factor: Your job is to do the activity that most frequently puts you into a flow state.\n" +
      'Flow state = you feel fully immersed in your work, you\'re in "the zone," time flies by without you realizing it, etc.\n' +
      "What do you choose?"
  },
  {
    uuid: generateUUID(),
    quote:
      '"Spend today interpreting whatever people do in the most generous way. See if you feel better as a result."\n' +
      "James Clear"
  },
  {
    uuid: generateUUID(),
    quote: "When does it benefit me to be patient and when does it not?"
  },
  {
    uuid: generateUUID(),
    quote:
      '"Every act of conscious learning requires the willingness to suffer an injury to one\'s self-esteem. That is why young children, before they are aware of their own self-importance, learn so easily; and why older persons, especially if vain or important, cannot learn at all."\n' +
      "Thomas Szasz (Words to the Wise)"
  }
  /*{
        uuid: generateUUID(),
        quote:  '',
    },
    {
        uuid: generateUUID(),
        quote:  '',
    },*/
] as IQuote[]
