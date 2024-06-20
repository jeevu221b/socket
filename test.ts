// let a: string = "a";
// a = 10;
// console.log(a);

// const { sleep } = require("./utils");

// c

// let array = [1, 2, 3, 4, 5];
// array = array.map((item) => item + 1);
// console.log(array);

// const answerOrder = {
//   sessionId: {
//     userId: {
//       answer: true,
//       time: 1234567890,
//       score: 10,
//     },
//     userId2: {
//       answer: false,
//       time: 1234567890,
//       score: 0,
//     },
//   },
// };

// Object.keys(answerOrder["sessionId"]).map((userId) => {
//   const user = sessions["sessionId"].users.find(
//     (user) => user.userId === userId
//   );
//   if (user) {
//     const timeDifference =
//       answerOrder["sessionId"][userId].time - sessions["sessionId"].startedTime;
//     const multiplier = 1 - timeDifference / 15000;
//     const score = answerOrder["sessionId"][userId].answer ? 10 * multiplier : 0;
//     user.score += score;
//     user.lastQuestionScore = score;
//     user.answerState = answerOrder["sessionId"][userId].answer
//       ? "correctlyAnswered"
//       : "incorrectlyAnswered";
//   }
// });
// const dummy = async () => {
//   const dummy = { 1: { users: [], category: "category", level: 1 } };
//   if (dummy[1].category) {
//     console.log("Category exists");
//     await sleep(1000);
//   }
//   if (dummy[1].level) {
//     console.log("Level exists");
//   }
// };

// dummy();
